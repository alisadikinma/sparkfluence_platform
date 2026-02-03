import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, lang = 'en' } = await req.json();

    if (!query || query.trim().length < 1) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const q = query.trim();
    const suggestions: string[] = [];

    // Try YouTube suggest API first (most relevant for video content platform)
    try {
      const ytUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}&hl=${lang}`;
      const ytRes = await fetch(ytUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(3000),
      });
      if (ytRes.ok) {
        const ytData = await ytRes.json();
        if (Array.isArray(ytData) && Array.isArray(ytData[1])) {
          suggestions.push(...ytData[1]);
        }
      }
    } catch (e: any) {
      console.log('[Autocomplete] YouTube suggest failed:', e.message);
    }

    // Fallback to Google suggest if YouTube returned nothing
    if (suggestions.length === 0) {
      try {
        const gUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&hl=${lang}`;
        const gRes = await fetch(gUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(3000),
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (Array.isArray(gData) && Array.isArray(gData[1])) {
            suggestions.push(...gData[1]);
          }
        }
      } catch (e: any) {
        console.log('[Autocomplete] Google suggest failed:', e.message);
      }
    }

    // Deduplicate and limit to 8
    const unique = [...new Set(suggestions)].slice(0, 8);

    return new Response(
      JSON.stringify({ suggestions: unique }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Autocomplete] Error:', error);
    return new Response(
      JSON.stringify({ suggestions: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
