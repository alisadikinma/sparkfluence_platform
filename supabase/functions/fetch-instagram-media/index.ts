import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * fetch-instagram-media
 *
 * Input: { shortcode, source_url_id, access_token? }
 * Flow:
 *   1. Parse shortcode from IG post URL
 *   2. Use oEmbed API to get media_id
 *   3. Use Graph API to fetch all carousel children (full-res images)
 *   4. Update carousel_source_urls row with media_urls + media_id
 *
 * Note: access_token comes from user's connected IG account (social_accounts table).
 *       Phase 1: token passed directly from frontend.
 *       Phase 3: token fetched from social_accounts table automatically.
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

    // If no access_token provided, try to get from user's social account
    let token = access_token;
    if (!token) {
      // Extract user_id from the source URL's project
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
          // Try to get IG token from social_accounts (Phase 3)
          const { data: socialAccount } = await supabase
            .from('social_accounts')
            .select('access_token')
            .eq('user_id', projectRow.user_id)
            .eq('platform', 'instagram')
            .eq('is_active', true)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle();

          token = socialAccount?.access_token;
        }
      }
    }

    if (!token) {
      // No token available — update status and return error
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

    // Step 1: oEmbed → get media_id
    const igUrl = `https://www.instagram.com/p/${shortcode}/`;
    const oembedUrl = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(igUrl)}&access_token=${token}`;
    const oembedResp = await fetch(oembedUrl);

    if (!oembedResp.ok) {
      const errText = await oembedResp.text();
      await supabase
        .from('carousel_source_urls')
        .update({ scrape_status: 'failed', scrape_error: `oEmbed failed: ${oembedResp.status}` })
        .eq('id', source_url_id);

      return new Response(
        JSON.stringify({ success: false, error: { code: 'OEMBED_FAILED', message: `oEmbed API error: ${oembedResp.status}` } }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const oembedData = await oembedResp.json();
    const mediaId = oembedData.media_id;

    if (!mediaId) {
      // Fallback: try to get media_id from thumbnail URL parse
      await supabase
        .from('carousel_source_urls')
        .update({ scrape_status: 'failed', scrape_error: 'Could not resolve media_id from oEmbed' })
        .eq('id', source_url_id);

      return new Response(
        JSON.stringify({ success: false, error: { code: 'NO_MEDIA_ID', message: 'Could not resolve media_id' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Step 2: Graph API → fetch carousel children
    const mediaUrl = `https://graph.facebook.com/v21.0/${mediaId}?fields=media_type,media_url,children{media_url,media_type,id}&access_token=${token}`;
    const mediaResp = await fetch(mediaUrl);

    if (!mediaResp.ok) {
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
      // Carousel post — multiple children
      for (const child of mediaData.children.data) {
        if (child.media_url) {
          mediaUrls.push({
            url: child.media_url,
            mediaType: child.media_type || 'IMAGE',
          });
        }
      }
    } else if (mediaData.media_url) {
      // Single media post
      mediaUrls.push({
        url: mediaData.media_url,
        mediaType: mediaData.media_type || 'IMAGE',
      });
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

    // Step 3: Update DB record
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
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
