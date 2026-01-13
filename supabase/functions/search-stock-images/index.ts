import { corsHeaders } from '../_shared/cors.ts';

const UNSPLASH_API = 'https://api.unsplash.com/search/photos';
const PEXELS_API = 'https://api.pexels.com/v1/search';

interface StockImage {
  id: string;
  provider: 'unsplash' | 'pexels';
  url_thumb: string;
  url_regular: string;
  url_full: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  alt_description: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, provider = 'both', page = 1, per_page = 20, orientation = 'portrait' } = await req.json();

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_QUERY', message: 'Query parameter is required and must be a non-empty string' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: StockImage[] = [];

    // Search Unsplash
    if (provider === 'unsplash' || provider === 'both') {
      const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');

      if (unsplashKey) {
        try {
          const unsplashUrl = new URL(UNSPLASH_API);
          unsplashUrl.searchParams.set('query', query.trim());
          unsplashUrl.searchParams.set('page', page.toString());
          unsplashUrl.searchParams.set('per_page', per_page.toString());
          unsplashUrl.searchParams.set('orientation', orientation);

          const unsplashRes = await fetch(unsplashUrl.toString(), {
            headers: {
              'Authorization': `Client-ID ${unsplashKey}`,
            },
          });

          if (unsplashRes.ok) {
            const unsplashData = await unsplashRes.json();

            if (unsplashData.results && Array.isArray(unsplashData.results)) {
              results.push(...unsplashData.results.map((img: any) => ({
                id: img.id,
                provider: 'unsplash' as const,
                url_thumb: img.urls.thumb,
                url_regular: img.urls.regular,
                url_full: img.urls.full,
                width: img.width,
                height: img.height,
                photographer: img.user.name,
                photographer_url: img.user.links.html,
                alt_description: img.alt_description || img.description || '',
              })));
            }
          } else {
            console.error('[UNSPLASH] API error:', unsplashRes.status, await unsplashRes.text());
          }
        } catch (err) {
          console.error('[UNSPLASH] Fetch error:', err);
        }
      } else {
        console.warn('[UNSPLASH] API key not configured');
      }
    }

    // Search Pexels
    if (provider === 'pexels' || provider === 'both') {
      const pexelsKey = Deno.env.get('PEXELS_API_KEY');

      if (pexelsKey) {
        try {
          const pexelsUrl = new URL(PEXELS_API);
          pexelsUrl.searchParams.set('query', query.trim());
          pexelsUrl.searchParams.set('page', page.toString());
          pexelsUrl.searchParams.set('per_page', per_page.toString());
          pexelsUrl.searchParams.set('orientation', orientation);

          const pexelsRes = await fetch(pexelsUrl.toString(), {
            headers: {
              'Authorization': pexelsKey,
            },
          });

          if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json();

            if (pexelsData.photos && Array.isArray(pexelsData.photos)) {
              results.push(...pexelsData.photos.map((img: any) => ({
                id: String(img.id),
                provider: 'pexels' as const,
                url_thumb: img.src.tiny,
                url_regular: img.src.large,
                url_full: img.src.original,
                width: img.width,
                height: img.height,
                photographer: img.photographer,
                photographer_url: img.photographer_url,
                alt_description: img.alt || '',
              })));
            }
          } else {
            console.error('[PEXELS] API error:', pexelsRes.status, await pexelsRes.text());
          }
        } catch (err) {
          console.error('[PEXELS] Fetch error:', err);
        }
      } else {
        console.warn('[PEXELS] API key not configured');
      }
    }

    console.log(`[SEARCH_STOCK_IMAGES] Query: "${query}", Results: ${results.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          total: results.length,
          query,
          page,
          per_page,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SEARCH_STOCK_IMAGES] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'STOCK_SEARCH_ERROR',
          message: error.message || 'Failed to search stock images'
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
