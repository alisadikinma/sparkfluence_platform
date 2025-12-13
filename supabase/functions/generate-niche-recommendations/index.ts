import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Generate Niche Recommendations
 * 
 * Uses Tavily API for market research:
 * - Search volume indicators
 * - Competition analysis
 * - Related niches discovery
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
// API Key Rotation (Hybrid: Pool → Secrets)
// ============================================================================

interface ApiKeyResult {
  keyId: string | null;
  apiKey: string;
  keyName: string;
  source: 'pool' | 'secret';
}

async function getApiKeyHybrid(
  supabase: any,
  provider: string,
  secretName: string
): Promise<ApiKeyResult | null> {
  // 1. Try pool first
  try {
    const { data, error } = await supabase.rpc('get_available_api_key', {
      p_provider: provider
    });

    if (!error && data && data.length > 0) {
      const key = data[0];
      console.log(`[${provider}] Using pool key: ${key.key_name} (${key.usage_count}/${key.usage_limit})`);
      return {
        keyId: key.key_id,
        apiKey: key.api_key,
        keyName: key.key_name,
        source: 'pool'
      };
    }
  } catch (err) {
    console.log(`[${provider}] Pool check failed, trying secret`);
  }

  // 2. Fallback to secrets
  const apiKey = Deno.env.get(secretName);
  if (apiKey) {
    console.log(`[${provider}] Using secret: ${secretName}`);
    return {
      keyId: null,
      apiKey,
      keyName: `Secret (${secretName})`,
      source: 'secret'
    };
  }

  console.error(`[${provider}] No API key available`);
  return null;
}

async function incrementUsage(supabase: any, keyId: string | null): Promise<void> {
  if (!keyId) return;
  try {
    await supabase.rpc('increment_api_key_usage', { p_key_id: keyId, p_increment: 1 });
  } catch (err) {
    console.warn('Failed to increment usage:', err);
  }
}

async function markExhausted(supabase: any, keyId: string | null): Promise<void> {
  if (!keyId) return;
  try {
    await supabase.rpc('mark_api_key_exhausted', { p_key_id: keyId });
    console.log(`Key ${keyId} marked exhausted`);
  } catch (err) {
    console.warn('Failed to mark exhausted:', err);
  }
}

// ============================================================================
// Tavily Search (For Market Research)
// ============================================================================

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function searchTavily(
  supabase: any,
  query: string,
  maxResults: number = 8
): Promise<{ results: TavilyResult[]; answer: string | null; error: string | null }> {
  
  const keyResult = await getApiKeyHybrid(supabase, 'tavily', 'TAVILY_API_KEY');
  
  if (!keyResult) {
    return { results: [], answer: null, error: 'No Tavily API key available' };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: keyResult.apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
        include_images: false
      })
    });

    if (response.status === 429 || response.status === 401 || response.status === 403) {
      console.warn(`Tavily returned ${response.status}, marking key exhausted`);
      await markExhausted(supabase, keyResult.keyId);
      return { results: [], answer: null, error: `API error: ${response.status}` };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily error:', errorText);
      return { results: [], answer: null, error: `Tavily error: ${response.status}` };
    }

    const data = await response.json();
    
    // Increment usage on success
    await incrementUsage(supabase, keyResult.keyId);

    return {
      results: data.results || [],
      answer: data.answer || null,
      error: null
    };

  } catch (err: any) {
    console.error('Tavily fetch error:', err);
    return { results: [], answer: null, error: err.message };
  }
}

// ============================================================================
// OpenRouter LLM (With Rotation)
// ============================================================================

async function callLLM(
  supabase: any,
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string | null; error: string | null }> {
  
  const keyResult = await getApiKeyHybrid(supabase, 'openrouter', 'OPENROUTER_API_KEY');
  
  if (!keyResult) {
    return { content: null, error: 'No OpenRouter API key available' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyResult.apiKey}`,
        'HTTP-Referer': 'https://sparkfluence.com',
        'X-Title': 'Sparkfluence'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.75,
        max_tokens: 3000
      })
    });

    if (response.status === 429 || response.status === 401 || response.status === 403) {
      console.warn(`OpenRouter returned ${response.status}, marking key exhausted`);
      await markExhausted(supabase, keyResult.keyId);
      return { content: null, error: `API error: ${response.status}` };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      return { content: null, error: `OpenRouter error: ${response.status}` };
    }

    const data = await response.json();
    await incrementUsage(supabase, keyResult.keyId);

    return {
      content: data.choices?.[0]?.message?.content || null,
      error: null
    };

  } catch (err: any) {
    console.error('OpenRouter fetch error:', err);
    return { content: null, error: err.message };
  }
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
      
      const { results, answer, error } = await searchTavily(supabase, query, 5);
      
      if (error) {
        console.warn(`  ⚠ Search error: ${error}`);
        continue;
      }

      if (answer) {
        tavilyAnswer = answer;
      }

      // Extract key insights from results
      results.forEach(r => {
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

    const { content: llmContent, error: llmError } = await callLLM(supabase, systemPrompt, userPrompt);

    if (llmError || !llmContent) {
      throw new Error(llmError || 'No LLM response');
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
    // 4. Fetch Pexels Images
    // ========================================================================
    console.log('\n🖼️ Fetching images from Pexels...');
    
    const pexelsApiKey = Deno.env.get('PEXELS_API_KEY');
    const nichesWithImages = [];

    for (let i = 0; i < parsedNiches.niches.length; i++) {
      const niche = parsedNiches.niches[i];
      let imageUrl = getDefaultImage(i);

      if (pexelsApiKey && niche.image_keyword) {
        try {
          const pexelsResponse = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(niche.image_keyword)}&per_page=3&orientation=landscape`,
            { headers: { 'Authorization': pexelsApiKey } }
          );
          
          if (pexelsResponse.ok) {
            const pexelsData = await pexelsResponse.json();
            if (pexelsData.photos?.length > 0) {
              const randomIndex = Math.floor(Math.random() * Math.min(3, pexelsData.photos.length));
              imageUrl = pexelsData.photos[randomIndex]?.src?.medium || imageUrl;
            }
          }
        } catch (imgError) {
          console.warn(`Pexels error for "${niche.image_keyword}"`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
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
