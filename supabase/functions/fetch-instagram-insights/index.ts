import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IG_API_BASE = 'https://graph.instagram.com/v21.0';

interface PostInsightsMetric {
  name: string;
  values: Array<{ value: number }>;
}

/**
 * fetch-instagram-insights
 *
 * Fetches analytics data from the Instagram Insights API and stores it
 * in the `post_analytics` and `audience_insights` tables.
 *
 * Input: { social_account_id: string, mode: 'posts' | 'demographics' | 'both' }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Input ---
    const { social_account_id, mode } = await req.json();

    if (!social_account_id || !mode) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_PARAMS', message: 'social_account_id and mode are required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!['posts', 'demographics', 'both'].includes(mode)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_MODE', message: 'mode must be posts, demographics, or both' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Fetch social account (service role for reliable access) ---
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: account, error: accountError } = await serviceClient
      .from('social_accounts')
      .select('id, user_id, access_token, platform_user_id, platform')
      .eq('id', social_account_id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'Social account not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Double-check ownership
    if (account.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Account does not belong to you' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (account.platform !== 'instagram') {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'WRONG_PLATFORM', message: 'This endpoint only supports Instagram accounts' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const accessToken = account.access_token;
    const igPageId = account.platform_user_id;

    if (!accessToken || !igPageId) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_CREDENTIALS', message: 'Account is missing access_token or platform_user_id' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result: { posts_synced?: number; demographics_synced?: boolean } = {};

    // =====================
    // MODE: posts / both
    // =====================
    if (mode === 'posts' || mode === 'both') {
      const postsSynced = await fetchPostInsights(serviceClient, igPageId, accessToken, social_account_id);
      result.posts_synced = postsSynced;
    }

    // =====================
    // MODE: demographics / both
    // =====================
    if (mode === 'demographics' || mode === 'both') {
      await fetchDemographics(serviceClient, igPageId, accessToken, social_account_id);
      result.demographics_synced = true;
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // Check if this is an IG token error we surfaced
    if (err instanceof IgTokenError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'TOKEN_EXPIRED', message: err.message } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ─── Custom error for IG token issues ───

class IgTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IgTokenError';
  }
}

// ─── Helper: call IG API with token error detection ───

async function igApiFetch(url: string): Promise<unknown> {
  const resp = await fetch(url);

  if (!resp.ok) {
    const status = resp.status;
    let errorBody = '';
    try { errorBody = await resp.text(); } catch { /* ignore */ }

    if (status === 400 || status === 401) {
      throw new IgTokenError(
        `Instagram token expired or invalid (HTTP ${status}). Please reconnect your account. ${errorBody}`
      );
    }

    throw new Error(`Instagram API error (HTTP ${status}): ${errorBody}`);
  }

  return resp.json();
}

// ─── Fetch post insights ───

async function fetchPostInsights(
  supabase: ReturnType<typeof createClient>,
  igPageId: string,
  accessToken: string,
  socialAccountId: string,
): Promise<number> {
  // Step 1: Fetch recent media
  const mediaUrl = `${IG_API_BASE}/${igPageId}/media?fields=id,caption,timestamp,media_type,thumbnail_url,permalink&access_token=${accessToken}&limit=50`;
  const mediaData = await igApiFetch(mediaUrl) as {
    data?: Array<{
      id: string;
      caption?: string;
      timestamp: string;
      media_type: string;
      thumbnail_url?: string;
      permalink?: string;
    }>;
  };

  const posts = mediaData.data || [];
  if (posts.length === 0) return 0;

  let syncedCount = 0;

  // Step 2: For each post, fetch insights and upsert
  for (const post of posts) {
    try {
      const insightsUrl = `${IG_API_BASE}/${post.id}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${accessToken}`;
      const insightsData = await igApiFetch(insightsUrl) as {
        data?: PostInsightsMetric[];
      };

      const metrics = insightsData.data || [];
      const metricsMap: Record<string, number> = {};
      for (const m of metrics) {
        metricsMap[m.name] = m.values?.[0]?.value ?? 0;
      }

      const row = {
        social_account_id: socialAccountId,
        platform_post_id: post.id,
        caption: post.caption || null,
        posted_at: post.timestamp,
        media_type: post.media_type,
        thumbnail_url: post.thumbnail_url || null,
        permalink: post.permalink || null,
        impressions: metricsMap.impressions ?? 0,
        reach: metricsMap.reach ?? 0,
        likes: metricsMap.likes ?? 0,
        comments: metricsMap.comments ?? 0,
        shares: metricsMap.shares ?? 0,
        saved: metricsMap.saved ?? 0,
        fetched_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('post_analytics')
        .upsert(row, { onConflict: 'social_account_id,platform_post_id' });

      if (!upsertError) {
        syncedCount++;
      } else {
        console.error(`Failed to upsert post ${post.id}:`, upsertError.message);
      }
    } catch (err) {
      // If it's a token error, re-throw to stop all processing
      if (err instanceof IgTokenError) throw err;
      // Otherwise log and continue to next post
      console.error(`Failed to fetch insights for post ${post.id}:`, err.message);
    }
  }

  return syncedCount;
}

// ─── Fetch demographics ───

async function fetchDemographics(
  supabase: ReturnType<typeof createClient>,
  igPageId: string,
  accessToken: string,
  socialAccountId: string,
): Promise<void> {
  // Audience demographics (lifetime)
  const audienceUrl = `${IG_API_BASE}/${igPageId}/insights?metric=audience_city,audience_country,audience_gender_age,audience_locale&period=lifetime&access_token=${accessToken}`;
  const audienceData = await igApiFetch(audienceUrl) as {
    data?: Array<{ name: string; values: Array<{ value: unknown }> }>;
  };

  const audienceMetrics = audienceData.data || [];
  const audienceMap: Record<string, unknown> = {};
  for (const m of audienceMetrics) {
    audienceMap[m.name] = m.values?.[0]?.value ?? null;
  }

  // Online followers (active hours)
  let onlineFollowers: unknown = null;
  try {
    const onlineUrl = `${IG_API_BASE}/${igPageId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`;
    const onlineData = await igApiFetch(onlineUrl) as {
      data?: Array<{ name: string; values: Array<{ value: unknown }> }>;
    };
    const onlineMetric = onlineData.data?.find((m) => m.name === 'online_followers');
    onlineFollowers = onlineMetric?.values?.[0]?.value ?? null;
  } catch (err) {
    if (err instanceof IgTokenError) throw err;
    console.error('Failed to fetch online_followers:', err.message);
  }

  // Followers count
  let followersCount: number | null = null;
  try {
    const profileUrl = `${IG_API_BASE}/${igPageId}?fields=followers_count&access_token=${accessToken}`;
    const profileData = await igApiFetch(profileUrl) as { followers_count?: number };
    followersCount = profileData.followers_count ?? null;
  } catch (err) {
    if (err instanceof IgTokenError) throw err;
    console.error('Failed to fetch followers_count:', err.message);
  }

  // Build today's date string (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  const row = {
    social_account_id: socialAccountId,
    snapshot_date: today,
    followers_count: followersCount,
    audience_city: audienceMap.audience_city ?? null,
    audience_country: audienceMap.audience_country ?? null,
    audience_gender_age: audienceMap.audience_gender_age ?? null,
    audience_locale: audienceMap.audience_locale ?? null,
    online_followers: onlineFollowers,
    fetched_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('audience_insights')
    .upsert(row, { onConflict: 'social_account_id,snapshot_date' });

  if (upsertError) {
    console.error('Failed to upsert audience_insights:', upsertError.message);
    throw new Error(`Failed to save demographics: ${upsertError.message}`);
  }
}
