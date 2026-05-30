import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, interest, profession, language, existing_niches, mode } = await req.json();

    // Determine mode: "browse" (by interest) or "search" (by query, default)
    const isSearchMode = mode !== 'browse';

    // Validate: search mode requires query
    if (isSearchMode && (!query || query.length < 2)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_QUERY', message: 'Query too short' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate: browse mode requires interest
    if (!isSearchMode && !interest) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_INTEREST', message: 'Interest is required for browse mode' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for key rotation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const langContext = language === 'id'
      ? 'Generate niches in Indonesian language where appropriate, but keep technical/English terms.'
      : 'Generate niches in English.';

    // Build prompt based on mode
    let systemPrompt: string;
    let userPrompt: string;
    let nicheCount: number;
    let maxTokens: number;

    if (isSearchMode) {
      // === SEARCH MODE (existing behavior) ===
      nicheCount = 5;
      maxTokens = 256;
      systemPrompt = `You are a content niche expert for short-form video creators (TikTok, Instagram Reels, YouTube Shorts).

Context:
- User's interest: ${interest || 'General'}
- User's profession: ${profession || 'Content Creator'}
- Already selected niches: ${existing_niches?.join(', ') || 'None'}
- ${langContext}

Task: Generate ${nicheCount} specific content niches related to the user's query "${query}".

Rules:
1. Each niche must be DIRECTLY related to "${query}"
2. Niches should be 1-4 words, specific and actionable
3. Focus on trending, viral-worthy topics
4. DO NOT repeat already selected niches
5. Consider the user's interest (${interest}) and profession (${profession})

Response: Return ONLY a valid JSON array of ${nicheCount} strings. No explanation, no markdown.
Example format: ["Niche One", "Niche Two", "Niche Three", "Niche Four", "Niche Five"]`;
      userPrompt = `Generate ${nicheCount} niches for: ${query}`;
    } else {
      // === BROWSE MODE (new: generate by interest) ===
      nicheCount = 15;
      maxTokens = 512;
      systemPrompt = `You are a content niche expert for short-form video creators (TikTok, Instagram Reels, YouTube Shorts).

Context:
- User's interest: ${interest}
- User's profession: ${profession || 'Content Creator'}
- Already selected niches: ${existing_niches?.join(', ') || 'None'}
- ${langContext}

Task: Generate ${nicheCount} specific content niches that are DIRECTLY related to "${interest}" for a ${profession || 'Content Creator'}.

Rules:
1. EVERY niche MUST be relevant to "${interest}" — no generic or unrelated niches
2. Niches should be 1-4 words, specific and actionable
3. Include a mix of popular sub-niches AND emerging/trending topics
4. Consider the profession "${profession || 'Content Creator'}" angle for unique crossover niches
5. DO NOT repeat already selected niches
6. Make niches suitable for short-form video content

Response: Return ONLY a valid JSON array of ${nicheCount} strings. No explanation, no markdown.
Example: ["AI Tools Review", "Tech Startup Tips", "Coding Tutorial", "Gadget Unboxing", "SaaS Reviews"]`;
      userPrompt = `Generate ${nicheCount} content niches for someone interested in "${interest}" who is a ${profession || 'Content Creator'}`;
    }

    console.log(`[Niche] Mode: ${isSearchMode ? 'search' : 'browse'}, Interest: ${interest}, Profession: ${profession}${isSearchMode ? `, Query: ${query}` : ''}`);

    // Call LLM (Gemini first for speed, OR fallback)
    const llmResult = await callLLM(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { geminiFirst: true, temperature: 0.9, maxTokens }
    );

    if (!llmResult.success || !llmResult.content) {
      throw new Error(llmResult.error || 'Failed to generate niches');
    }

    const responseText = llmResult.content;
    console.log('[Niche] Raw response:', responseText);

    // Parse JSON from response
    let niches: string[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        niches = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by newlines and clean up
        niches = responseText
          .split('\n')
          .map((line: string) => line.replace(/^[\d\.\-\*\s"]+/, '').replace(/["\[\],]+$/g, '').trim())
          .filter((line: string) => line.length > 0 && line.length < 50)
          .slice(0, nicheCount);
      }
    } catch (parseError) {
      console.error('[Niche] Parse error:', parseError);
      // Fallback parsing
      niches = responseText
        .split(/[\n,]/)
        .map((line: string) => line.replace(/^[\d\.\-\*\s"]+/, '').replace(/["\[\],]+$/g, '').trim())
        .filter((line: string) => line.length > 2 && line.length < 50)
        .slice(0, nicheCount);
    }

    // Filter out any niches that are already selected
    const existingLower = (existing_niches || []).map((n: string) => n.toLowerCase());
    niches = niches
      .filter((n: string) => typeof n === 'string' && n.length > 0)
      .filter((n: string) => !existingLower.includes(n.toLowerCase()));

    console.log(`[Niche] Parsed ${niches.length} niches, Provider: ${llmResult.provider}`);

    return new Response(
      JSON.stringify({
        success: true,
        niches: niches.slice(0, nicheCount),
        mode: isSearchMode ? 'search' : 'browse',
        query: query || null,
        source: llmResult.provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Niche] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to generate niche suggestions'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
