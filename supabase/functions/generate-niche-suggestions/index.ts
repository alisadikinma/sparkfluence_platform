import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGeminiHybrid } from '../_shared/apiKeyRotation.ts';

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
    const { query, interest, profession, language, existing_niches } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_QUERY', message: 'Query too short' } }),
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

    const systemPrompt = `You are a content niche expert for short-form video creators (TikTok, Instagram Reels, YouTube Shorts).

Context:
- User's interest: ${interest || 'General'}
- User's profession: ${profession || 'Content Creator'}
- Already selected niches: ${existing_niches?.join(', ') || 'None'}
- ${langContext}

Task: Generate 5 specific content niches related to the user's query "${query}".

Rules:
1. Each niche must be DIRECTLY related to "${query}"
2. Niches should be 1-4 words, specific and actionable
3. Focus on trending, viral-worthy topics
4. DO NOT repeat already selected niches
5. Consider the user's interest (${interest}) and profession (${profession})

Response: Return ONLY a valid JSON array of 5 strings. No explanation, no markdown.
Example format: ["Niche One", "Niche Two", "Niche Three", "Niche Four", "Niche Five"]`;

    console.log('[Niche] Query:', query, 'Interest:', interest, 'Profession:', profession);

    // Use Gemini with key rotation (FAST)
    const geminiResult = await callGeminiHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 5 niches for: ${query}` }
      ],
      {
        model: 'gemini-2.0-flash',
        temperature: 0.9,
        maxTokens: 256
      }
    );

    if (!geminiResult.success || !geminiResult.content) {
      throw new Error(geminiResult.error || 'Failed to generate niches');
    }

    const responseText = geminiResult.content;
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
          .slice(0, 5);
      }
    } catch (parseError) {
      console.error('[Niche] Parse error:', parseError);
      // Fallback parsing
      niches = responseText
        .split(/[\n,]/)
        .map((line: string) => line.replace(/^[\d\.\-\*\s"]+/, '').replace(/["\[\],]+$/g, '').trim())
        .filter((line: string) => line.length > 2 && line.length < 50)
        .slice(0, 5);
    }

    // Filter out any niches that are already selected
    const existingLower = (existing_niches || []).map((n: string) => n.toLowerCase());
    niches = niches
      .filter((n: string) => typeof n === 'string' && n.length > 0)
      .filter((n: string) => !existingLower.includes(n.toLowerCase()));

    console.log('[Niche] Parsed niches:', niches, 'Source:', geminiResult.source);

    return new Response(
      JSON.stringify({ 
        success: true, 
        niches: niches.slice(0, 5),
        query,
        source: `gemini-${geminiResult.source}`
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
