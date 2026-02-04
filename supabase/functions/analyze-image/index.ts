import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callWithRotationHybrid } from '../_shared/apiKeyRotation.ts';

interface ImageAnalysisResult {
  objects: string[];              // Main objects/subjects in image
  style: string;                  // Photography style (cinematic, portrait, etc)
  lighting: string;               // Lighting description (Rembrandt, butterfly, etc)
  mood: string;                   // Overall mood/emotion
  color_palette: string;          // Dominant colors
  composition: string;            // Shot type and framing
  suggested_motion: string;       // Recommended camera movement for video
  technical_details: string;      // Additional technical observations
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_url, segment_type, script_text } = await req.json();

    // Validate input
    if (!image_url || typeof image_url !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'image_url is required' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for pool-based key rotation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch image as base64
    let imageBase64: string;
    try {
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) throw new Error('Failed to fetch image');

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      imageBase64 = base64;
    } catch (err) {
      console.error('[ANALYZE_IMAGE] Image fetch error:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'IMAGE_FETCH_ERROR', message: 'Failed to fetch image from URL' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct analysis prompt
    const analysisPrompt = `Analyze this image for video generation purposes. Provide a detailed analysis in the following JSON format:

{
  "objects": ["list", "of", "main", "subjects"],
  "style": "photography style (e.g., cinematic portrait, documentary, artistic)",
  "lighting": "lighting setup (e.g., Rembrandt 4:1, soft natural light, dramatic chiaroscuro)",
  "mood": "overall mood/emotion (e.g., confident, contemplative, energetic)",
  "color_palette": "dominant colors and temperature (e.g., warm golden tones, cool blue atmosphere)",
  "composition": "shot type and framing (e.g., medium close-up, rule of thirds, centered)",
  "suggested_motion": "recommended camera movement for video (e.g., slow push-in, static locked-off, gentle orbit)",
  "technical_details": "additional observations (e.g., shallow depth of field, high contrast, bokeh background)"
}

Context:
${segment_type ? `- Segment Type: ${segment_type}` : ''}
${script_text ? `- Script: ${script_text}` : ''}

Focus on cinematic and professional video production terminology. Be specific and technical.`;

    // Call Gemini Vision API using pool-based key rotation
    const geminiResult = await callWithRotationHybrid(supabase, 'gemini', async (apiKey) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: analysisPrompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.4,
              topK: 32,
              topP: 1,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      const data = await response.json();
      return { data, status: response.status };
    });

    if (geminiResult.error) {
      console.error('[ANALYZE_IMAGE] Gemini API error:', geminiResult.error);
      throw new Error(`Gemini API error: ${geminiResult.error}`);
    }

    const geminiData = geminiResult.data;

    // Extract text response
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('No response from Gemini API');
    }

    console.log('[ANALYZE_IMAGE] Raw Gemini response:', rawText);

    // Parse JSON from response (handle markdown code blocks)
    let analysisResult: ImageAnalysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[ANALYZE_IMAGE] JSON parse error:', parseError);
      console.error('[ANALYZE_IMAGE] Raw text:', rawText);

      // Fallback: extract basic info from text
      analysisResult = {
        objects: ['subject'],
        style: 'cinematic',
        lighting: 'natural lighting',
        mood: 'neutral',
        color_palette: 'balanced',
        composition: 'medium shot',
        suggested_motion: 'static shot',
        technical_details: rawText.substring(0, 200)
      };
    }

    console.log('[ANALYZE_IMAGE] Analysis complete:', analysisResult);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          analysis: analysisResult,
          raw_response: rawText
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ANALYZE_IMAGE] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'IMAGE_ANALYSIS_ERROR',
          message: error.message || 'Failed to analyze image'
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
