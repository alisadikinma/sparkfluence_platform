import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * fetch-instagram-media
 *
 * Flow:
 *   1. Try instagram_oembed with App Access Token → get media_id
 *   2. If oEmbed fails (400/403), fallback: search user's /media feed by shortcode
 *   3. Use Graph API with user token to fetch carousel children (full-res images)
 *   4. Update carousel_source_urls row with media_urls + media_id
 *
 * Why 3-step: instagram_oembed requires "oEmbed Read" App permission (pending review)
 * or App in Development mode (only test users). App Access Token helps bypass user
 * token restrictions for public posts, but Graph API fallback works for own posts.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shortcode, source_url_id, access_token } = await req.json();

    if (!shortcode) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_SHORTCODE', message: 'Shortcode is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!source_url_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_SOURCE_URL_ID', message: 'source_url_id is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to fetching
    await supabase
      .from('carousel_source_urls')
      .update({ scrape_status: 'fetching' })
      .eq('id', source_url_id);

    // Get user token + ig_page_id from social_accounts if not provided
    let token = access_token;
    let igUserId: string | null = null;

    if (!token) {
      const { data: sourceRow } = await supabase
        .from('carousel_source_urls')
        .select('project_id')
        .eq('id', source_url_id)
        .single();

      if (sourceRow?.project_id) {
        const { data: projectRow } = await supabase
          .from('carousel_projects')
          .select('user_id')
          .eq('id', sourceRow.project_id)
          .single();

        if (projectRow?.user_id) {
          const { data: socialAccount } = await supabase
            .from('social_accounts')
            .select('access_token, ig_page_id, platform_user_id')
            .eq('user_id', projectRow.user_id)
            .eq('platform', 'instagram')
            .eq('is_active', true)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();

          token = socialAccount?.access_token;
          // platform_user_id = IG Business Account ID (correct for /media queries)
          // ig_page_id = Facebook Page ID (NOT for Instagram media queries)
          igUserId = socialAccount?.platform_user_id || null;
        }
      }
    }

    if (!token) {
      await supabase
        .from('carousel_source_urls')
        .update({
          scrape_status: 'failed',
          scrape_error: 'Instagram not connected. Connect your IG account in Settings > Social Accounts.',
        })
        .eq('id', source_url_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_IG_TOKEN',
            message: 'Instagram not connected. Connect your account in Settings to import carousel posts.',
          },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const igUrl = `https://www.instagram.com/p/${shortcode}/`;

    // ── Step 0: Try Python backend scraper (VPS/local) ───────────────────────
    // The backend uses browser headers + Instagram internal API — works for public posts
    // without needing Meta App permissions. Falls through to oEmbed on failure.
    const backendUrl = Deno.env.get('BACKEND_URL');
    const backendApiKey = Deno.env.get('BACKEND_API_KEY');

    if (backendUrl && backendApiKey) {
      try {
        const backendResp = await fetch(
          `${backendUrl}/api/instagram/media?url=${encodeURIComponent(igUrl)}`,
          {
            headers: {
              'x-api-key': backendApiKey,
              'Content-Type': 'application/json',
            },
          },
        );

        if (backendResp.ok) {
          const backendData = await backendResp.json();
          const mediaUrls = backendData?.data?.media_urls;

          if (mediaUrls && mediaUrls.length > 0) {
            console.log(`[fetch-instagram-media] Backend scraper succeeded: ${mediaUrls.length} items`);

            await supabase
              .from('carousel_source_urls')
              .update({
                media_id: backendData.data.shortcode,
                media_urls: mediaUrls,
                scrape_status: 'completed',
                scrape_error: null,
              })
              .eq('id', source_url_id);

            return new Response(
              JSON.stringify({
                success: true,
                data: { media_urls: mediaUrls, total_items: mediaUrls.length },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        } else {
          const errText = await backendResp.text();
          console.warn(`[fetch-instagram-media] Backend scraper failed: ${backendResp.status} — ${errText.slice(0, 200)}`);
        }
      } catch (e) {
        console.warn(`[fetch-instagram-media] Backend scraper error: ${e.message}`);
      }
    } else {
      console.log('[fetch-instagram-media] BACKEND_URL or BACKEND_API_KEY not set, skipping backend scraper');
    }

    const appId = Deno.env.get('META_APP_ID');
    const appSecret = Deno.env.get('META_APP_SECRET');
    const appToken = appId && appSecret ? `${appId}|${appSecret}` : null;

    // ── Step 1: Try oEmbed with App Access Token ──────────────────────────────
    let mediaId: string | null = null;
    let oembedError = '';

    if (appToken) {
      const oembedUrl = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(igUrl)}&access_token=${appToken}`;
      const oembedResp = await fetch(oembedUrl);
      if (oembedResp.ok) {
        const oembedData = await oembedResp.json();
        mediaId = oembedData.media_id || null;
      } else {
        const errBody = await oembedResp.text();
        oembedError = `App token oEmbed: ${oembedResp.status} — ${errBody.slice(0, 200)}`;
        console.warn('[fetch-instagram-media] oEmbed with app token failed:', oembedError);
      }
    }

    // ── Step 1b: Retry oEmbed with user token ────────────────────────────────
    if (!mediaId) {
      const oembedUrl = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(igUrl)}&access_token=${token}`;
      const oembedResp = await fetch(oembedUrl);
      if (oembedResp.ok) {
        const oembedData = await oembedResp.json();
        mediaId = oembedData.media_id || null;
      } else {
        const errBody = await oembedResp.text();
        oembedError += ` | User token oEmbed: ${oembedResp.status} — ${errBody.slice(0, 200)}`;
        console.warn('[fetch-instagram-media] oEmbed with user token failed:', oembedError);
      }
    }

    // ── Step 1c: Fallback — search user's media feed by shortcode ────────────
    // This works for the user's OWN posts using instagram_basic scope.
    if (!mediaId && igUserId) {
      console.log('[fetch-instagram-media] oEmbed failed, searching media feed for shortcode:', shortcode);
      mediaId = await findMediaIdByShortcode(token, igUserId, shortcode);
    }

    // Last resort: resolve IG Business Account ID from Facebook token, then search media
    if (!mediaId && !igUserId) {
      console.log('[fetch-instagram-media] ig_page_id missing, resolving IG account from FB token...');
      igUserId = await resolveIgUserIdFromToken(token);
      if (igUserId) {
        mediaId = await findMediaIdByShortcode(token, igUserId, shortcode);
      }
    }

    if (!mediaId) {
      const errMsg = `Could not resolve media_id. oEmbed errors: ${oembedError}. ` +
        `Ensure the post is public and your Instagram account is connected with instagram_basic permission.`;

      await supabase
        .from('carousel_source_urls')
        .update({ scrape_status: 'failed', scrape_error: errMsg })
        .eq('id', source_url_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MEDIA_ID_NOT_FOUND',
            message: 'Could not access this Instagram post. Make sure it\'s public and belongs to your connected account.',
          },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 2: Graph API — fetch carousel children ───────────────────────────
    const mediaUrl = `https://graph.facebook.com/v21.0/${mediaId}?fields=media_type,media_url,children{media_url,media_type,id}&access_token=${token}`;
    const mediaResp = await fetch(mediaUrl);

    if (!mediaResp.ok) {
      const errBody = await mediaResp.text();
      console.error('[fetch-instagram-media] Graph API failed:', mediaResp.status, errBody.slice(0, 300));

      await supabase
        .from('carousel_source_urls')
        .update({ scrape_status: 'failed', scrape_error: `Graph API failed: ${mediaResp.status}` })
        .eq('id', source_url_id);

      return new Response(
        JSON.stringify({ success: false, error: { code: 'GRAPH_API_FAILED', message: `Graph API error: ${mediaResp.status}` } }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mediaData = await mediaResp.json();

    // Build media_urls array
    const mediaUrls: Array<{ url: string; mediaType: string; width?: number; height?: number }> = [];

    if (mediaData.children?.data) {
      for (const child of mediaData.children.data) {
        if (child.media_url) {
          mediaUrls.push({ url: child.media_url, mediaType: child.media_type || 'IMAGE' });
        }
      }
    } else if (mediaData.media_url) {
      mediaUrls.push({ url: mediaData.media_url, mediaType: mediaData.media_type || 'IMAGE' });
    }

    if (mediaUrls.length === 0) {
      await supabase
        .from('carousel_source_urls')
        .update({ scrape_status: 'failed', scrape_error: 'No media URLs found in API response' })
        .eq('id', source_url_id);

      return new Response(
        JSON.stringify({ success: false, error: { code: 'NO_MEDIA', message: 'No media found for this post' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 3: Persist to DB ─────────────────────────────────────────────────
    await supabase
      .from('carousel_source_urls')
      .update({
        media_id: mediaId,
        media_urls: mediaUrls,
        scrape_status: 'completed',
        scrape_error: null,
      })
      .eq('id', source_url_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          media_id: mediaId,
          media_urls: mediaUrls,
          total_items: mediaUrls.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[fetch-instagram-media] Unhandled error:', err);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Search user's media feed by shortcode (for own posts via instagram_basic scope).
 * Paginates up to 3 pages (150 posts) looking for a permalink containing the shortcode.
 */
async function findMediaIdByShortcode(token: string, igUserId: string, shortcode: string): Promise<string | null> {
  let url: string | null = `https://graph.facebook.com/v21.0/${igUserId}/media?fields=id,permalink&access_token=${token}&limit=50`;

  for (let page = 0; page < 3 && url; page++) {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn('[findMediaIdByShortcode] media list failed:', resp.status, igUserId);
      return null;
    }
    const data = await resp.json();
    const match = (data.data || []).find((item: any) =>
      item.permalink?.includes(`/p/${shortcode}`) || item.permalink?.includes(`/reel/${shortcode}`)
    );
    if (match) return match.id;

    url = data.paging?.next || null;
  }
  return null;
}

/**
 * Resolve IG Business Account ID from a Facebook User Token.
 * FB User Token → /me/accounts (Facebook Pages) → instagram_business_account.id
 */
async function resolveIgUserIdFromToken(token: string): Promise<string | null> {
  const url = `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${token}&limit=10`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn('[resolveIgUserIdFromToken] /me/accounts failed:', resp.status);
    return null;
  }
  const data = await resp.json();
  const page = (data.data || []).find((p: any) => p.instagram_business_account?.id);
  return page?.instagram_business_account?.id || null;
}
