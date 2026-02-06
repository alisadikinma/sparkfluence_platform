import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, errorResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

// ============================================================================
// Types
// ============================================================================

interface TrendingItem {
  source: 'google' | 'tiktok' | 'instagram';
  keyword: string;
  country: string;
  category: string | null;
  volume_score: number;
  raw_data: Record<string, unknown> | null;
}

interface FetchResult {
  source: string;
  country: string;
  count: number;
  error?: string;
}

// ============================================================================
// Countries Configuration
// ============================================================================

const COUNTRIES = ['ID', 'US', 'IN', 'FR'] as const;
const TIKTOK_COUNTRIES = ['ID', 'US', 'FR'] as const; // TikTok banned in India

// Language mapping for Google Trends
const GOOGLE_HL_MAP: Record<string, string> = {
  'ID': 'id', 'US': 'en-US', 'IN': 'en-IN', 'FR': 'fr',
};

// Timezone offsets for Google Trends (minutes from UTC)
const GOOGLE_TZ_MAP: Record<string, number> = {
  'ID': -420, 'US': 300, 'IN': -330, 'FR': -60,
};

// TikTok Creative Center country codes
const TIKTOK_COUNTRY_MAP: Record<string, string> = {
  'ID': 'ID', 'US': 'US', 'FR': 'FR',
};

// ============================================================================
// Google Trends Fetcher (JSON API - more reliable than RSS)
// ============================================================================

async function fetchGoogleTrends(country: string): Promise<TrendingItem[]> {
  const hl = GOOGLE_HL_MAP[country] || 'en';
  const tz = GOOGLE_TZ_MAP[country] || 0;

  // Try JSON API first, fallback to RSS
  const strategies = [
    { name: 'JSON API', fn: () => fetchGoogleTrendsJson(country, hl, tz) },
    { name: 'RSS', fn: () => fetchGoogleTrendsRss(country) },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`[Google] Trying ${strategy.name} for ${country}...`);
      const items = await strategy.fn();
      if (items.length > 0) {
        console.log(`[Google] ${strategy.name} returned ${items.length} items for ${country}`);
        return items;
      }
    } catch (err: any) {
      console.warn(`[Google] ${strategy.name} failed for ${country}:`, err.message);
    }
  }

  console.warn(`[Google] All strategies failed for ${country}`);
  return [];
}

async function fetchGoogleTrendsJson(country: string, hl: string, tz: number): Promise<TrendingItem[]> {
  const url = `https://trends.google.com/trends/api/dailytrends?hl=${hl}&tz=${tz}&geo=${country}&ns=15`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': `${hl},en;q=0.9`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  let text = await response.text();
  // Google prepends )]}' to prevent XSSI
  if (text.startsWith(')]}\',')) {
    text = text.slice(5);
  } else if (text.startsWith(')]}\'')) {
    text = text.slice(4);
  }

  const json = JSON.parse(text);
  const items: TrendingItem[] = [];

  const days = json?.default?.trendingSearchesDays || [];
  for (const day of days.slice(0, 2)) { // Last 2 days
    for (const search of (day.trendingSearches || [])) {
      const keyword = search.title?.query || '';
      if (!keyword || keyword.length < 2) continue;

      const traffic = search.formattedTraffic || '0';
      const trafficNum = parseInt(traffic.replace(/[,+K]/g, ''), 10) * (traffic.includes('K') ? 1000 : traffic.includes('M') ? 1000000 : 1);
      let volumeScore = 50;
      if (trafficNum >= 1000000) volumeScore = 95;
      else if (trafficNum >= 500000) volumeScore = 80;
      else if (trafficNum >= 100000) volumeScore = 50;
      else if (trafficNum >= 10000) volumeScore = 20;
      else volumeScore = 10;

      items.push({
        source: 'google',
        keyword: keyword.trim(),
        country,
        category: null,
        volume_score: volumeScore,
        raw_data: { traffic, articles: search.articles?.length || 0 },
      });
    }
  }

  return items.slice(0, 20);
}

async function fetchGoogleTrendsRss(country: string): Promise<TrendingItem[]> {
  const url = `https://trends.google.com/trending/rss?geo=${country}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  console.log(`[Google RSS] Response length for ${country}: ${xml.length}`);

  const items: TrendingItem[] = [];
  const titleMatches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
  const trafficMatches = xml.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/g) || [];

  for (let i = 0; i < titleMatches.length; i++) {
    const titleInner = titleMatches[i].match(/<!\[CDATA\[(.*?)\]\]>/);
    const keyword = titleInner ? titleInner[1] : '';

    if (!keyword || keyword === 'Daily Search Trends' || keyword.length < 2) continue;

    let volumeScore = 50;
    if (trafficMatches[i]) {
      const trafficStr = trafficMatches[i].replace(/<\/?ht:approx_traffic>/g, '');
      const trafficNum = parseInt(trafficStr.replace(/[,+]/g, ''), 10);
      if (!isNaN(trafficNum)) {
        if (trafficNum >= 1000000) volumeScore = 95;
        else if (trafficNum >= 500000) volumeScore = 80;
        else if (trafficNum >= 100000) volumeScore = 50;
        else if (trafficNum >= 10000) volumeScore = 20;
        else volumeScore = 10;
      }
    }

    items.push({
      source: 'google',
      keyword: keyword.trim(),
      country,
      category: null,
      volume_score: volumeScore,
      raw_data: { traffic: trafficMatches[i]?.replace(/<\/?ht:approx_traffic>/g, '') || null },
    });
  }

  return items.slice(0, 20);
}

// ============================================================================
// TikTok Creative Center Fetcher
// ============================================================================

async function fetchTikTokTrends(country: string): Promise<TrendingItem[]> {
  const countryCode = TIKTOK_COUNTRY_MAP[country];
  if (!countryCode) return [];

  // Try multiple endpoints
  const strategies = [
    { name: 'Creative Center API', fn: () => fetchTikTokCreativeCenter(country, countryCode) },
    { name: 'Keyword API', fn: () => fetchTikTokKeywords(country, countryCode) },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`[TikTok] Trying ${strategy.name} for ${country}...`);
      const items = await strategy.fn();
      if (items.length > 0) {
        console.log(`[TikTok] ${strategy.name} returned ${items.length} items for ${country}`);
        return items;
      }
    } catch (err: any) {
      console.warn(`[TikTok] ${strategy.name} failed for ${country}:`, err.message);
    }
  }

  console.warn(`[TikTok] All strategies failed for ${country}`);
  return [];
}

async function fetchTikTokCreativeCenter(country: string, countryCode: string): Promise<TrendingItem[]> {
  const url = `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&country_code=${countryCode}&page=1&limit=20&sort_by=popular`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en',
      'Origin': 'https://ads.tiktok.com',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const items: TrendingItem[] = [];
  const hashtags = data?.data?.list || [];

  for (const tag of hashtags) {
    const keyword = tag.hashtag_name || tag.name || '';
    if (!keyword || keyword.length < 2) continue;

    const views = tag.publish_cnt || tag.video_views || 0;
    let volumeScore = 50;
    if (views >= 10000000) volumeScore = 95;
    else if (views >= 1000000) volumeScore = 80;
    else if (views >= 100000) volumeScore = 50;
    else if (views >= 10000) volumeScore = 30;
    else volumeScore = 15;

    items.push({
      source: 'tiktok',
      keyword: keyword.replace(/^#/, '').trim(),
      country,
      category: null,
      volume_score: volumeScore,
      raw_data: { views, trend_type: tag.trend_type || null },
    });
  }

  return items.slice(0, 20);
}

async function fetchTikTokKeywords(country: string, countryCode: string): Promise<TrendingItem[]> {
  const url = `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/keyword/list?period=7&country_code=${countryCode}&page=1&limit=20&sort_by=popular`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/keyword/pc/en',
      'Origin': 'https://ads.tiktok.com',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const items: TrendingItem[] = [];
  const keywords = data?.data?.list || data?.data?.keyword_list || [];

  for (const kw of keywords) {
    const keyword = kw.keyword || kw.name || '';
    if (!keyword || keyword.length < 2) continue;

    const popularity = kw.popularity || kw.value || 50;
    items.push({
      source: 'tiktok',
      keyword: keyword.replace(/^#/, '').trim(),
      country,
      category: null,
      volume_score: Math.min(popularity, 100),
      raw_data: { popularity },
    });
  }

  return items.slice(0, 20);
}

// ============================================================================
// Instagram via RapidAPI Fetcher (Daily only, key rotation)
// ============================================================================

async function fetchInstagramTrends(
  supabase: ReturnType<typeof createClient>,
  country: string
): Promise<TrendingItem[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('trending_topics')
      .select('id')
      .eq('source', 'instagram')
      .eq('country', country)
      .eq('fetch_date', today)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[Instagram] Already fetched for ${country} today, skipping`);
      return [];
    }

    // Try to get API key - if no key pool exists, skip gracefully
    let apiKey: string | null = null;
    let keyId: string | null = null;
    try {
      const { data: keyData, error: keyError } = await supabase.rpc('get_available_api_key', {
        p_provider: 'rapidapi_instagram',
      });
      if (!keyError && keyData) {
        apiKey = keyData.api_key;
        keyId = keyData.id;
      }
    } catch {
      // RPC function might not exist yet
    }

    if (!apiKey) {
      console.log(`[Instagram] No API key available, skipping`);
      return [];
    }

    console.log(`[Instagram] Fetching trends for ${country}`);

    const response = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/hashtags/search?name=trending`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    // Track usage
    if (keyId) {
      try {
        await supabase.rpc('increment_api_key_usage', {
          p_key_id: keyId,
          p_increment: 1,
        });
      } catch { /* ignore if RPC doesn't exist */ }
    }

    if (response.status === 429) {
      console.warn(`[Instagram] Rate limited`);
      if (keyId) {
        try {
          await supabase.rpc('mark_api_key_exhausted', { p_key_id: keyId });
        } catch { /* ignore */ }
      }
      return [];
    }

    if (!response.ok) {
      console.warn(`[Instagram] HTTP ${response.status} for ${country}`);
      return [];
    }

    const data = await response.json();
    const items: TrendingItem[] = [];

    const hashtags = data?.data?.items || data?.hashtags || [];
    for (const tag of hashtags) {
      const keyword = tag.name || tag.hashtag || '';
      if (!keyword || keyword.length < 2) continue;

      const mediaCount = tag.media_count || tag.edge_hashtag_to_media?.count || 0;
      let volumeScore = 50;
      if (mediaCount >= 10000000) volumeScore = 95;
      else if (mediaCount >= 1000000) volumeScore = 80;
      else if (mediaCount >= 100000) volumeScore = 50;
      else volumeScore = 25;

      items.push({
        source: 'instagram',
        keyword: keyword.replace(/^#/, '').trim(),
        country,
        category: null,
        volume_score: volumeScore,
        raw_data: { media_count: mediaCount },
      });
    }

    console.log(`[Instagram] Found ${items.length} trends for ${country}`);
    return items.slice(0, 15);

  } catch (error: any) {
    console.error(`[Instagram] Error fetching ${country}:`, error.message);
    return [];
  }
}

// ============================================================================
// Database Operations
// ============================================================================

async function insertTrends(
  supabase: ReturnType<typeof createClient>,
  items: TrendingItem[]
): Promise<number> {
  if (items.length === 0) return 0;

  const rows = items.map(item => ({
    source: item.source,
    keyword: item.keyword,
    country: item.country,
    category: item.category,
    volume_score: item.volume_score,
    raw_data: item.raw_data,
    fetch_date: new Date().toISOString().split('T')[0],
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24 hours
  }));

  const { error } = await supabase
    .from('trending_topics')
    .upsert(rows, {
      onConflict: 'source,keyword,country,fetch_date',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[DB] Insert error:', error.message);
    return 0;
  }

  return rows.length;
}

async function cleanupExpired(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from('trending_topics')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('[DB] Cleanup error:', error.message);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check — only authenticated users can trigger trending data fetches
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n' + '='.repeat(60));
    console.log('FETCH TRENDING DATA - Started');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    const results: FetchResult[] = [];
    let totalInserted = 0;

    const fetchAndInsert = async (
      fetchFn: () => Promise<TrendingItem[]>,
      source: string,
      country: string,
    ): Promise<FetchResult> => {
      try {
        const items = await fetchFn();
        const inserted = await insertTrends(supabase, items);
        totalInserted += inserted;
        return { source, country, count: items.length };
      } catch (e: any) {
        return { source, country, count: 0, error: e.message || String(e) };
      }
    };

    // 1+2. Google + TikTok in parallel
    const parallelTasks = [
      ...COUNTRIES.map(c => fetchAndInsert(() => fetchGoogleTrends(c), 'google', c)),
      ...TIKTOK_COUNTRIES.map(c => fetchAndInsert(() => fetchTikTokTrends(c), 'tiktok', c)),
    ];
    results.push(...await Promise.all(parallelTasks));

    // 3. Instagram (sequential — daily check + key rotation)
    for (const country of COUNTRIES) {
      results.push(await fetchAndInsert(
        () => fetchInstagramTrends(supabase, country), 'instagram', country,
      ));
    }

    // 4. Cleanup expired
    const cleaned = await cleanupExpired(supabase);

    const summary = {
      total_inserted: totalInserted,
      expired_cleaned: cleaned,
      sources_ok: results.filter(r => r.count > 0).length,
      sources_failed: results.filter(r => r.count === 0).length,
    };

    console.log('\n' + '-'.repeat(40));
    console.log('Summary:', JSON.stringify(summary));
    console.log('Details:', JSON.stringify(results, null, 2));
    console.log('='.repeat(60));

    return new Response(
      JSON.stringify({
        success: true,
        data: { results, ...summary, fetched_at: new Date().toISOString() },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('FETCH TRENDING DATA - Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch trending data',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
