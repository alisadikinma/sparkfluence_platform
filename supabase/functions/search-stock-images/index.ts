// ============================================================================
// SEARCH STOCK IMAGES - Enhanced with LLM Keyword Extraction
//
// Supports two modes:
// 1. Simple search (query only) - direct Pexels/Unsplash search via pool rotation
// 2. Smart search (visualDirection + script) - LLM extracts keywords first
//
// REFACTORED: 2026-02-11 - Now uses shared callStockImageSearch (pool-based)
// ============================================================================

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callStockImageSearch } from '../_shared/apiKeyRotation.ts';

// Import shared keyword extraction (same as generate-images uses)
import {
  extractKeywordsStructuredAsync,
  type KeywordExtractionResult,
  type LocationResult,
} from '../_shared/keywordExtractor.ts';

// Import product detection — runs BEFORE LLM to catch brand/product names
import { getProductSearchQuery } from '../_shared/lookups/productKeywords.ts';

// ============================================================================
// HELPER: Generate suggested queries from extraction result
// ============================================================================

function generateSuggestedQueries(result: KeywordExtractionResult): string[] {
  const queries: string[] = [];

  // Full location query
  if (result.location?.full) {
    queries.push(result.location.full);
    if (result.location.region) {
      queries.push(`${result.location.location} ${result.location.region}`);
    }
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      query,
      visualDirection,
      script,
      topic,
      enableSmartExtraction,
      enableTavilyEnrichment,
      page = 1,
      per_page = 20,
      orientation = 'portrait'
    } = body;

    const isSmartMode = (visualDirection || script) && enableSmartExtraction !== false;
    let searchQuery = query?.trim() || '';
    let smartExtraction: {
      location: LocationResult | null;
      venue: string | null;
      suggestedQueries: string[];
      source: 'llm' | 'tavily' | 'fallback';
    } | null = null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'CONFIG_ERROR', message: 'Supabase not configured' }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // PRE-DETECTION: Check for product/brand names BEFORE calling LLM
    // This catches "Notion AI", "Miro", "Codium AI" before LLM generalizes them
    if (isSmartMode && script) {
      // 1. Check productKeywords lookup (highest priority — specific brands)
      const productQuery = getProductSearchQuery(script);
      if (productQuery) {
        console.log(`[SMART_SEARCH] Product detected: "${productQuery}" — skipping LLM`);
        searchQuery = productQuery;
        smartExtraction = {
          location: null,
          venue: null,
          suggestedQueries: [productQuery],
          source: 'fallback'
        };
      } else {
        // 2. Check for capitalized brand name at start of sentence: "Notion AI. Otomatis..."
        const capsStartMatch = script.match(/^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\./);
        if (capsStartMatch && capsStartMatch[1].split(' ').length <= 3) {
          const brandName = capsStartMatch[1];
          // Only use this if it's a proper brand (not generic sentence start)
          const isGenericWord = /^(The|A|An|This|That|These|Those|It|He|She|They|We|You|I)$/.test(brandName);
          if (!isGenericWord) {
            console.log(`[SMART_SEARCH] Capitalized entity detected: "${brandName}" — skipping LLM`);
            searchQuery = brandName;
            smartExtraction = {
              location: null,
              venue: null,
              suggestedQueries: [brandName],
              source: 'fallback'
            };
          }
        }
      }
    }

    // SMART MODE: Extract keywords using shared LLM module (only if product not detected)
    if (isSmartMode && (visualDirection || script) && !searchQuery) {
      try {
        console.log(`[SMART_SEARCH] Extracting keywords from visualDirection + script...`);

        const keywordResult = await extractKeywordsStructuredAsync(
          visualDirection || '',
          script || '',
          supabase,
          enableTavilyEnrichment || false,
          topic || ''
        );

        console.log(`[SMART_SEARCH] Extraction complete: location="${keywordResult.location?.full || 'none'}", venue="${keywordResult.venue || 'none'}", source=${keywordResult.source}, time=${keywordResult.processingTimeMs}ms`);

        const suggestedQueries = generateSuggestedQueries(keywordResult);

        if (suggestedQueries.length > 0) {
          searchQuery = suggestedQueries[0];
        } else if (keywordResult.fullKeywords) {
          searchQuery = keywordResult.fullKeywords;
        }

        smartExtraction = {
          location: keywordResult.location,
          venue: keywordResult.venue,
          suggestedQueries,
          source: keywordResult.source
        };

        console.log(`[SMART_SEARCH] Mode: SMART, Query: "${searchQuery}", Suggestions: ${suggestedQueries.length}`);
      } catch (smartError: any) {
        console.error('[SMART_SEARCH] LLM extraction failed, returning fallback:', smartError.message || smartError);
        smartExtraction = {
          location: null,
          venue: null,
          suggestedQueries: [],
          source: 'fallback'
        };
      }
    } else {
      console.log(`[SMART_SEARCH] Mode: SIMPLE, Query: "${searchQuery}"`);
    }

    // Validate final query
    if (!searchQuery) {
      if (smartExtraction) {
        console.log('[SMART_SEARCH] No query extracted, returning empty results for frontend fallback');
        return new Response(
          JSON.stringify({
            success: true,
            data: { results: [], total: 0, query: '', page, per_page, smartExtraction }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_QUERY', message: 'Query parameter is required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search stock images using unified pool-based function (Pexels → Unsplash)
    const searchResult = await callStockImageSearch(supabase, searchQuery, {
      orientation: orientation as 'portrait' | 'landscape' | 'square',
      perPage: per_page,
      page,
    });

    console.log(`[SEARCH_STOCK_IMAGES] Query: "${searchQuery}", Results: ${searchResult.results.length}, Provider: ${searchResult.provider}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results: searchResult.results,
          total: searchResult.total,
          query: searchQuery,
          page,
          per_page,
          provider: searchResult.provider,
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
