import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, successResponse } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Auth check
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  try {
    const { query, lang = 'en' } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 1) {
      return successResponse({ suggestions: [] }, req);
    }

    // Sanitize: limit length, strip control chars
    const q = query.trim().slice(0, 200).replace(/[\x00-\x1F\x7F]/g, '');
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

    return successResponse({ suggestions: unique }, req);
  } catch (error: any) {
    console.error('[Autocomplete] Error:', error);
    return successResponse({ suggestions: [] }, req);
  }
});
