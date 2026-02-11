import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM, callTavilyHybrid, callStockImageSearch } from '../_shared/apiKeyRotation.ts';

/**
 * Generate Niche Recommendations
 *
 * Uses Tavily API for market research + OpenRouter LLM for analysis.
 * All API keys from api_keys_pool table with automatic rotation.
 *
 * Flow: Tavily Research → LLM Analysis → Personalized Niches
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NicheRequest {
  interest: string;
  profession: string;
  skipCache?: boolean;
}

// ============================================================================
// Cache Functions
// ============================================================================

async function generateCacheHash(interest: string, profession: string): Promise<string> {
  const normalized = `${interest.toLowerCase().trim()}|${profession.toLowerCase().trim()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { interest, profession, skipCache = false }: NicheRequest = await req.json();

    if (!interest || !profession) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Interest and profession are required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Niche Generation Request`);
    console.log(`Interest: ${interest} | Profession: ${profession}`);
    console.log(`${'='.repeat(60)}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate cache hash
    const cacheHash = await generateCacheHash(interest, profession);
    console.log(`Cache hash: ${cacheHash}`);

    // ========================================================================
    // 1. Check Cache
    // ========================================================================
    if (!skipCache) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('niche_recommendations_cache')
        .select('niches, hit_count')
        .eq('input_hash', cacheHash)
        .single();

      if (cachedData && !cacheError) {
        console.log(`✅ Cache HIT! hit_count: ${cachedData.hit_count + 1}`);
        
        supabase
          .from('niche_recommendations_cache')
          .update({ 
            hit_count: cachedData.hit_count + 1,
            last_hit_at: new Date().toISOString()
          })
          .eq('input_hash', cacheHash)
          .then(() => {});

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              niches: cachedData.niches,
              cached: true,
              hit_count: cachedData.hit_count + 1
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('❌ Cache MISS. Performing market research...');

    // Get current date for context
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });

    // ========================================================================
    // 2. Tavily Market Research (Multiple Queries)
    // ========================================================================
    console.log('\n🔍 Starting Tavily market research...');

    const queries = [
      `${interest} niche ideas YouTube TikTok ${currentYear} trending`,
      `${interest} ${profession} content creator successful channels`,
      `${interest} low competition high demand niches ${currentYear}`
    ];

    const researchResults: string[] = [];
    let tavilyAnswer = '';

    for (const query of queries) {
      console.log(`  → Searching: "${query.substring(0, 50)}..."`);

      const { data: tavilyData, error: tavilyError } = await callTavilyHybrid(supabase, query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeAnswer: true,
      });

      if (tavilyError || !tavilyData) {
        console.warn(`  ⚠ Search error: ${tavilyError}`);
        continue;
      }

      if (tavilyData.answer) {
        tavilyAnswer = tavilyData.answer;
      }

      // Extract key insights from results
      (tavilyData.results || []).forEach((r: any) => {
        if (r.content && r.content.length > 50) {
          researchResults.push(`[${r.title}]: ${r.content.substring(0, 300)}`);
        }
      });

      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`  ✓ Gathered ${researchResults.length} research snippets`);

    // ========================================================================
    // 3. Generate Niches via LLM
    // ========================================================================
    console.log('\n🤖 Generating niches with LLM...');

    const systemPrompt = `You are an expert content strategist specializing in short-form video (TikTok, Instagram Reels, YouTube Shorts).

CURRENT DATE: ${currentMonth} ${currentYear}

Your task: Generate 12 SPECIFIC, DATA-DRIVEN niche recommendations based on market research.

IMPORTANT: When mentioning years or trends, use ${currentYear} (current year). NEVER use outdated years like 2024.

USER PROFILE:
- Interest: ${interest}
- Profession: ${profession}

MARKET RESEARCH DATA:
${tavilyAnswer ? `AI Summary: ${tavilyAnswer}\n` : ''}
${researchResults.slice(0, 10).map((r, i) => `${i + 1}. ${r}`).join('\n\n')}

CRITICAL RULES:
1. Generate exactly 12 unique, specific niches
2. Each niche must be ACTIONABLE for short-form video
3. Include mix of:
   - High-demand niches (competition OK if good angle)
   - Low-competition opportunities
   - Trending topics in the space
   - Unique crossover with user's profession
4. Growth potential: realistic +5% to +18%
5. **image_keyword**: 2-3 words for visual search

OUTPUT (strict JSON only):
{
  "niches": [
    {
      "id": 1,
      "title": "Specific niche title (max 15 words)",
      "description": "Why this works + opportunity (2-4 words category)",
      "growth_potential": "+X% Eng",
      "image_keyword": "visual keyword",
      "market_insight": "Brief insight from research or null"
    }
  ]
}`;

    const userPrompt = `Generate 12 data-driven niche recommendations for a ${profession} interested in ${interest}.

Use the market research provided to make each recommendation specific and backed by real trends/opportunities.

Return ONLY valid JSON.`;

    const llmResult = await callLLM(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.75, maxTokens: 3000 }
    );

    const llmContent = llmResult.content;

    if (!llmResult.success || !llmContent) {
      throw new Error(llmResult.error || 'No LLM response');
    }

    // Parse JSON
    let jsonContent = llmContent.trim();
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }

    let parsedNiches;
    try {
      parsedNiches = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content (first 500):', llmContent.substring(0, 500));
      throw new Error('Failed to parse LLM response');
    }

    if (!parsedNiches.niches || !Array.isArray(parsedNiches.niches)) {
      throw new Error('Invalid response structure');
    }

    console.log(`  ✓ LLM returned ${parsedNiches.niches.length} niches`);

    // ========================================================================
    // 4. Fetch Stock Images (Pexels → Unsplash pool rotation)
    // ========================================================================
    console.log('\n🖼️ Fetching stock images...');

    const nichesWithImages = [];

    for (let i = 0; i < parsedNiches.niches.length; i++) {
      const niche = parsedNiches.niches[i];
      let imageUrl = getDefaultImage(i);

      if (niche.image_keyword) {
        try {
          const searchResult = await callStockImageSearch(supabase, niche.image_keyword, {
            orientation: 'landscape',
            perPage: 3,
          });

          if (searchResult.results.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(3, searchResult.results.length));
            imageUrl = searchResult.results[randomIndex]?.url_regular || imageUrl;
          }
        } catch (imgError) {
          console.warn(`Stock image error for "${niche.image_keyword}"`);
        }
      }

      nichesWithImages.push({
        id: i + 1,
        title: niche.title,
        description: niche.description,
        growth_potential: niche.growth_potential,
        image_url: imageUrl,
        market_insight: niche.market_insight || null
      });
    }

    // ========================================================================
    // 5. Save to Cache
    // ========================================================================
    console.log('\n💾 Saving to cache...');
    
    const { error: insertError } = await supabase
      .from('niche_recommendations_cache')
      .upsert({
        input_hash: cacheHash,
        interest: interest.toLowerCase().trim(),
        profession: profession.toLowerCase().trim(),
        niches: nichesWithImages,
        hit_count: 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'input_hash' });

    if (insertError) {
      console.warn('Cache save error:', insertError);
    } else {
      console.log('  ✓ Cache saved');
    }

    // ========================================================================
    // 6. Return Response
    // ========================================================================
    console.log(`\n✅ Success! Returning ${nichesWithImages.length} niches`);
    console.log(`${'='.repeat(60)}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          niches: nichesWithImages,
          cached: false,
          research_queries: queries.length,
          research_snippets: researchResults.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: error.message || 'Failed to generate niches'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helpers
// ============================================================================

function getDefaultImage(index: number): string {
  const defaultImages = [
    "https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/4467687/pexels-photo-4467687.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/2376997/pexels-photo-2376997.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/4162491/pexels-photo-4162491.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/4022092/pexels-photo-4022092.jpeg?auto=compress&cs=tinysrgb&w=400",
    "https://images.pexels.com/photos/2916450/pexels-photo-2916450.jpeg?auto=compress&cs=tinysrgb&w=400",
  ];
  return defaultImages[index % defaultImages.length];
}
