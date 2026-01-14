// ============================================================================
// SEARCH STOCK IMAGES - Enhanced with LLM Keyword Extraction
// 
// Supports two modes:
// 1. Simple search (query only) - direct Unsplash/Pexels search
// 2. Smart search (visualDirection + script) - LLM extracts keywords first
//
// REFACTORED: 2026-01-14 - Now uses shared keywordExtractor module
// ============================================================================

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import shared keyword extraction (same as generate-images uses)
import {
  extractKeywordsStructuredAsync,
  enrichWithTavily,
  type KeywordExtractionResult,
  type LocationResult,
} from '../_shared/keywordExtractor.ts';

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

// ============================================================================
// STOCK IMAGE SEARCH
// ============================================================================

async function searchUnsplash(
  query: string,
  page: number,
  perPage: number,
  orientation: string
): Promise<StockImage[]> {
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!unsplashKey) {
    console.warn('[UNSPLASH] API key not configured');
    return [];
  }

  try {
    const unsplashUrl = new URL(UNSPLASH_API);
    unsplashUrl.searchParams.set('query', query);
    unsplashUrl.searchParams.set('page', page.toString());
    unsplashUrl.searchParams.set('per_page', perPage.toString());
    unsplashUrl.searchParams.set('orientation', orientation);

    const res = await fetch(unsplashUrl.toString(), {
      headers: { 'Authorization': `Client-ID ${unsplashKey}` }
    });

    if (!res.ok) {
      console.error('[UNSPLASH] API error:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((img: any) => ({
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
    }));
  } catch (err) {
    console.error('[UNSPLASH] Fetch error:', err);
    return [];
  }
}

async function searchPexels(
  query: string,
  page: number,
  perPage: number,
  orientation: string
): Promise<StockImage[]> {
  const pexelsKey = Deno.env.get('PEXELS_API_KEY');
  if (!pexelsKey) {
    console.warn('[PEXELS] API key not configured');
    return [];
  }

  try {
    const pexelsUrl = new URL(PEXELS_API);
    pexelsUrl.searchParams.set('query', query);
    pexelsUrl.searchParams.set('page', page.toString());
    pexelsUrl.searchParams.set('per_page', perPage.toString());
    pexelsUrl.searchParams.set('orientation', orientation);

    const res = await fetch(pexelsUrl.toString(), {
      headers: { 'Authorization': pexelsKey }
    });

    if (!res.ok) {
      console.error('[PEXELS] API error:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data.photos || !Array.isArray(data.photos)) return [];

    return data.photos.map((img: any) => ({
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
    }));
  } catch (err) {
    console.error('[PEXELS] Fetch error:', err);
    return [];
  }
}

// ============================================================================
// HELPER: Generate suggested queries from extraction result
// ============================================================================

function generateSuggestedQueries(result: KeywordExtractionResult): string[] {
  const queries: string[] = [];

  // Full location query
  if (result.location?.full) {
    queries.push(result.location.full);
    // Also add shorter version
    if (result.location.region) {
      queries.push(`${result.location.location} ${result.location.region}`);
    }
    // Just location name
    queries.push(result.location.location);
  }

  // Venue query
  if (result.venue) {
    queries.push(result.venue);
    if (result.location?.location) {
      queries.push(`${result.venue} ${result.location.location}`);
    }
  }

  // Atmosphere + location
  if (result.atmosphere.length > 0 && result.location?.location) {
    queries.push(`${result.atmosphere[0]} ${result.location.location}`);
  }

  // Activities
  if (result.activities.length > 0) {
    queries.push(...result.activities.slice(0, 2));
  }

  return [...new Set(queries)].slice(0, 5);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      query,                      // Direct query (simple mode)
      visualDirection,            // For smart extraction (smart mode)
      script,                     // For smart extraction (smart mode)
      enableSmartExtraction,      // Enable LLM extraction (default: true if visualDirection/script provided)
      enableTavilyEnrichment,     // Enable Tavily enrichment (default: false)
      provider = 'both', 
      page = 1, 
      per_page = 20, 
      orientation = 'portrait' 
    } = body;

    // Determine mode
    const isSmartMode = (visualDirection || script) && enableSmartExtraction !== false;
    let searchQuery = query?.trim() || '';
    let smartExtraction: {
      location: LocationResult | null;
      venue: string | null;
      suggestedQueries: string[];
      source: 'llm' | 'tavily' | 'fallback';
    } | null = null;

    // SMART MODE: Extract keywords using shared LLM module
    if (isSmartMode && (visualDirection || script)) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseKey) {
          console.warn('[SMART_SEARCH] Supabase not configured, falling back to simple mode');
        } else {
          const supabase = createClient(supabaseUrl, supabaseKey);

          console.log(`[SMART_SEARCH] Extracting keywords from visualDirection + script...`);

          // Use shared extraction function (same as generate-images)
          const keywordResult = await extractKeywordsStructuredAsync(
            visualDirection || '',
            script || '',
            supabase,
            enableTavilyEnrichment || false
          );

          console.log(`[SMART_SEARCH] Extraction complete: location="${keywordResult.location?.full || 'none'}", venue="${keywordResult.venue || 'none'}", source=${keywordResult.source}, time=${keywordResult.processingTimeMs}ms`);

          // Generate suggested queries from extraction
          const suggestedQueries = generateSuggestedQueries(keywordResult);

          // Use first suggested query or fullKeywords as search query
          if (suggestedQueries.length > 0) {
            searchQuery = suggestedQueries[0];
          } else if (keywordResult.fullKeywords) {
            searchQuery = keywordResult.fullKeywords;
          }

          // Build smart extraction response
          smartExtraction = {
            location: keywordResult.location,
            venue: keywordResult.venue,
            suggestedQueries,
            source: keywordResult.source
          };

          console.log(`[SMART_SEARCH] Mode: SMART, Query: "${searchQuery}", Suggestions: ${suggestedQueries.length}`);
        }
      } catch (smartError: any) {
        // Graceful fallback - don't fail the entire request
        console.error('[SMART_SEARCH] LLM extraction failed, returning fallback:', smartError.message || smartError);
        
        // Return success with empty suggestions - frontend will use its own fallback
        smartExtraction = {
          location: null,
          venue: null,
          suggestedQueries: [],
          source: 'fallback'
        };
        
        // Keep searchQuery as-is (might be empty, will be handled by frontend)
      }
    } else {
      console.log(`[SMART_SEARCH] Mode: SIMPLE, Query: "${searchQuery}"`);
    }

    // Validate final query
    // If no searchQuery but smart extraction was attempted, return success with empty results
    // so frontend can use its own fallback keywords
    if (!searchQuery) {
      if (smartExtraction) {
        // Smart mode was attempted but LLM couldn't extract keywords
        // Return success so frontend can use its fallback
        console.log('[SMART_SEARCH] No query extracted, returning empty results for frontend fallback');
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              results: [],
              total: 0,
              query: '',
              page,
              per_page,
              smartExtraction
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Simple mode without query - this is an error
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_QUERY', message: 'Query parameter is required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search stock images
    const results: StockImage[] = [];

    if (provider === 'unsplash' || provider === 'both') {
      const unsplashResults = await searchUnsplash(searchQuery, page, per_page, orientation);
      results.push(...unsplashResults);
    }

    if (provider === 'pexels' || provider === 'both') {
      const pexelsResults = await searchPexels(searchQuery, page, per_page, orientation);
      results.push(...pexelsResults);
    }

    console.log(`[SEARCH_STOCK_IMAGES] Query: "${searchQuery}", Results: ${results.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          total: results.length,
          query: searchQuery,
          page,
          per_page,
          // Include smart extraction data if available
          smartExtraction
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
