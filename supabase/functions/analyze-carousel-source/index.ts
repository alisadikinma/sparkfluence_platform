import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * analyze-carousel-source
 *
 * Stage 1 of 2-stage Rebrand Engine.
 * Gemini multimodal analyzes all source carousel images in a single LLM call.
 *
 * Input: { project_id, image_urls: string[], ai_text_mode: boolean }
 * Output: { success, analysis: SlideAnalysis[] }
 *
 * Analysis per slide: topic, textContent, layout, visualStyle, segmentType, subjectDetection
 * Cached in carousel_slides.analysis_data (JSONB) for re-generation without re-analyzing.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, image_urls, ai_text_mode = true } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_PROJECT_ID', message: 'project_id is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_IMAGES', message: 'image_urls array is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build image content parts for multimodal analysis
    const imageDescriptions = image_urls.map((url: string, i: number) =>
      `Slide ${i + 1}: ${url}`
    ).join('\n');

    const systemPrompt = `You are an expert carousel image analyst for social media rebranding.

Analyze each slide image from the source carousel and extract structured information.

OUTPUT FORMAT: Strict JSON array, one object per slide. No markdown, no code blocks.

Per slide, extract:
{
  "slideIndex": <0-based>,
  "topic": "<main topic/message of this slide>",
  "textContent": ["<line 1>", "<line 2>", ...],  // ALL visible text
  "layout": "<full|split-left|split-right|text-overlay|minimal|graphic>",
  "visualStyle": {
    "dominantColors": ["#hex1", "#hex2", "#hex3"],  // top 3 colors
    "mood": "<professional|playful|dramatic|minimalist|luxury|warm|bold|vintage>",
    "composition": "<centered|rule-of-thirds|symmetrical|asymmetrical|framed>"
  },
  "segmentType": "<HOOK|FORE|BODY|PEAK|CTA>",
  "subjectDetection": {
    "hasCreator": <true if human face is prominent>,
    "hasProduct": <true if product is shown>,
    "description": "<brief description of main subject>"
  }
}

SEGMENT TYPE RULES:
- Slide 1 → HOOK (always)
- Last slide → CTA (always)
- Slides with product/service focus → BODY
- Slides with data/stats/comparison → PEAK
- Slides between HOOK and BODY → FORE
- If unsure → BODY

${ai_text_mode
  ? 'AI TEXT MODE: ON — Extract all visible text for AI to re-render in-image.'
  : 'AI TEXT MODE: OFF — Extract text but it will be added via editor layers, not in-image.'
}`;

    const userPrompt = `Analyze these ${image_urls.length} carousel slides:

${imageDescriptions}

Return a JSON array with ${image_urls.length} analysis objects. Strict JSON only.`;

    // Use Gemini first for multimodal (geminiFirst: true) — Gemini handles images better
    const result = await callLLM(supabase, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.3, maxTokens: 4096, geminiFirst: true });

    if (!result.success || !result.content) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'LLM_ERROR', message: result.error || 'Analysis failed' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse response
    let analysis;
    try {
      let cleaned = result.content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      analysis = JSON.parse(cleaned);

      // Handle wrapped response
      if (analysis.analysis) analysis = analysis.analysis;
      if (!Array.isArray(analysis)) analysis = [analysis];
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse analysis JSON' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create carousel_slides records with analysis data
    const slideRecords = analysis.map((a: any, i: number) => ({
      project_id,
      slide_index: i,
      slide_type: a.segmentType || (i === 0 ? 'HOOK' : i === analysis.length - 1 ? 'CTA' : 'BODY'),
      generation_method: 'ai',
      analysis_data: a,
      source_image_url: image_urls[i] || null,
      creator_face: a.subjectDetection?.hasCreator || false,
      video_toggle: a.segmentType === 'HOOK' || a.segmentType === 'CTA',
      video_duration: 8,
    }));

    // Delete existing slides for this project (re-analysis)
    await supabase.from('carousel_slides').delete().eq('project_id', project_id);

    // Insert new slides
    const { error: insertError } = await supabase
      .from('carousel_slides')
      .insert(slideRecords);

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: insertError.message } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        slide_count: analysis.length,
        provider: result.provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
