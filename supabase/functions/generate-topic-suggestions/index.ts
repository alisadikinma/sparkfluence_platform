import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGeminiHybrid, callOpenRouterHybrid, callTavilyHybrid } from '../_shared/apiKeyRotation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopicRequest {
  interest: string;
  profession?: string;
  niches: string[];
  objectives?: string[];
  dnaStyles: string[];
  language?: 'indonesian' | 'english' | 'hindi';
  count?: number;
  country?: string; // ISO country code for Google Trends
}

// ============================================================================
// Google Trends RSS (FREE - No API Key Required)
// ============================================================================

async function fetchGoogleTrendsRSS(geo: string = 'ID'): Promise<string[]> {
  try {
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;
    console.log(`[Trends] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      }
    });
    
    if (!response.ok) {
      console.warn(`[Trends] Error: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    
    // Parse XML for titles
    const titleMatches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
    const trends = titleMatches
      .map(match => {
        const inner = match.match(/<!\[CDATA\[(.*?)\]\]>/);
        return inner ? inner[1] : '';
      })
      .filter(t => t && t !== 'Daily Search Trends' && t.length > 2)
      .slice(0, 15);

    console.log(`[Trends] Found ${trends.length} trending topics`);
    return trends;
    
  } catch (error) {
    console.error('[Trends] Fetch error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      interest, 
      profession,
      niches, 
      objectives,
      dnaStyles,
      language = 'indonesian',
      count = 5,
      country = 'ID'
    }: TopicRequest = await req.json();

    if (!interest || !niches?.length || !dnaStyles?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'MISSING_PARAMS', message: 'Interest, niches, and DNA styles are required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for key rotation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date for context
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });

    // ========================================================================
    // 1. Fetch Google Trends (Real-time Trending)
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎬 Topic Generation Request');
    console.log(`Interest: ${interest} | Niches: ${niches.join(', ')}`);
    console.log('='.repeat(60));

    const trendingTopics = await fetchGoogleTrendsRSS(country);
    
    // Filter trends relevant to user's niches
    const relevantTrends = trendingTopics.filter(trend => {
      const trendLower = trend.toLowerCase();
      return niches.some(niche => {
        const nicheLower = niche.toLowerCase();
        return nicheLower.split(' ').some(word => 
          word.length > 3 && trendLower.includes(word)
        ) || trendLower.split(' ').some(word => 
          word.length > 3 && nicheLower.includes(word)
        );
      }) || interest.toLowerCase().split(' ').some(word => 
        word.length > 3 && trendLower.includes(word)
      );
    });

    console.log(`\n📊 Trends Analysis:`);
    console.log(`  All trends: ${trendingTopics.length}`);
    console.log(`  Relevant to niche: ${relevantTrends.length}`);
    if (trendingTopics.length > 0) {
      console.log(`  Top 5: ${trendingTopics.slice(0, 5).join(', ')}`);
    }

    // Language-specific instructions
    const languageInstructions: Record<string, string> = {
      indonesian: 'Generate topics in Bahasa Indonesia. Use local context, trending topics, and relatable language for Indonesian audience.',
      english: 'Generate topics in English. Use global trends and universally relatable content.',
      hindi: 'Generate topics in Hindi (Devanagari script). Use local Indian context and Bollywood-style engaging titles.'
    };

    const topicCount = Math.min(Math.max(count, 1), 10); // Clamp between 1-10

    const systemPrompt = `You are a viral content strategist for short-form video (TikTok, Instagram Reels, YouTube Shorts).

CURRENT DATE: ${currentMonth} ${currentYear}

Generate exactly ${topicCount} specific, actionable video topic ideas based on the user's profile.

${trendingTopics.length > 0 ? `
CURRENT TRENDING TOPICS (${country} - ${new Date().toLocaleDateString()}):
${trendingTopics.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}
` : ''}

${relevantTrends.length > 0 ? `
RELEVANT TRENDS FOR THIS NICHE:
${relevantTrends.map(t => `• ${t}`).join('\n')}
` : ''}

IMPORTANT RULES:
1. Topics MUST be directly related to the user's niches: ${niches.join(', ')}
2. Each topic should combine their interest (${interest}) with their specific niches
3. Match the tone to the DNA styles: ${dnaStyles.join(', ')}
4. Topics should feel specific and actionable, not generic
5. At least 1-2 topics should incorporate current trending topics (if relevant)
6. Include a hook angle that makes viewers want to watch
7. Return ONLY valid JSON

LANGUAGE: ${languageInstructions[language] || languageInstructions.english}

OUTPUT FORMAT:
{
  "topics": [
    {
      "id": 1,
      "title": "Catchy, specific video title",
      "description": "Brief explanation of what the video will cover"
    }
  ]
}`;

    let userPrompt = `Generate ${topicCount} SPECIFIC video topic ideas for a creator with:
- Main Interest: ${interest}
- Content Niches: ${niches.join(', ')}
- Creative Style: ${dnaStyles.join(', ')}`;

    if (profession) {
      userPrompt += `\n- Profession: ${profession}`;
    }

    if (objectives && objectives.length > 0) {
      userPrompt += `\n- Content Goals: ${objectives.join(', ')}`;
    }

    userPrompt += `

CRITICAL: Every topic MUST be about their niches (${niches.join(', ')}). Do NOT generate generic topics like "morning habits" unless it relates to their niche.

${language === 'indonesian' ? 'Write all titles and descriptions in Bahasa Indonesia.' : ''}
${language === 'hindi' ? 'Write all titles and descriptions in Hindi using Devanagari script.' : ''}

Return ONLY JSON.`;

    console.log('Generating topics for:', { interest, profession, niches, objectives, dnaStyles, language, count: topicCount });

    // Try Gemini first (FAST - primary), OpenRouter as fallback
    let content: string | null = null;
    let usedProvider = 'unknown';
    
    // 1. Try Gemini (primary - fast)
    console.log('[Topics] Trying Gemini (primary)...');
    const geminiResult = await callGeminiHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'gemini-2.0-flash',
        temperature: 0.85,
        maxTokens: 2000
      }
    );

    if (geminiResult.success && geminiResult.content) {
      content = geminiResult.content;
      usedProvider = `gemini-${geminiResult.source}`;
      console.log(`[Topics] Gemini success (source: ${geminiResult.source})`);
    } else {
      // 2. Fallback to OpenRouter
      console.log('[Topics] Gemini failed:', geminiResult.error);
      console.log('[Topics] Trying OpenRouter fallback...');
      
      const openRouterResult = await callOpenRouterHybrid(
        supabase,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          temperature: 0.85,
          maxTokens: 2000
        }
      );

      if (openRouterResult.data?.choices?.[0]?.message?.content) {
        content = openRouterResult.data.choices[0].message.content;
        usedProvider = `openrouter-${openRouterResult.source}`;
        console.log(`[Topics] OpenRouter success (source: ${openRouterResult.source})`);
      }
    }

    if (!content) {
      throw new Error('All LLM providers failed or rate limited');
    }

    // Parse JSON
    let jsonContent = content;
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }
    jsonContent = jsonContent.trim();

    let parsedTopics;
    try {
      parsedTopics = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse LLM response');
    }

    if (!parsedTopics.topics || !Array.isArray(parsedTopics.topics)) {
      throw new Error('Invalid response structure');
    }

    console.log(`Generated ${parsedTopics.topics.length} topics successfully via ${usedProvider}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          topics: parsedTopics.topics,
          language,
          provider: usedProvider,
          generated_at: new Date().toISOString(),
          trends_used: trendingTopics.slice(0, 5),
          relevant_trends: relevantTrends.slice(0, 3)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: error.message || 'Failed to generate topics'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
