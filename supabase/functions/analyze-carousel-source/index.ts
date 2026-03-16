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
 * Input: {
 *   project_id: string,
 *   image_urls: string[],
 *   ai_text_mode: boolean,
 *   slide_types?: Record<number, string>  // pre-classified from validation step (optional)
 * }
 *
 * When slide_types provided:
 *   - DOES NOT re-classify segment types (uses provided types)
 *   - DOES NOT delete/recreate slides (updates existing via UPSERT)
 *   - Focuses on enriching: textContent, visualStyle, layout, subjectDetection
 *
 * When slide_types NOT provided:
 *   - Full classification mode (legacy behavior)
 *   - Creates new slides with segment type classification
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, image_urls, ai_text_mode = true, slide_types } = await req.json();

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

    const hasPreClassified = slide_types && typeof slide_types === 'object' && Object.keys(slide_types).length > 0;

    console.log(`[analyze-carousel-source] ${image_urls.length} images, pre-classified: ${hasPreClassified ? 'YES' : 'NO'}`);

    // Build image descriptions for LLM
    const imageDescriptions = image_urls.map((url: string, i: number) =>
      `Slide ${i + 1}: ${url}`
    ).join('\n');

    // Build system prompt — enrichment mode skips segment type classification
    const systemPrompt = hasPreClassified
      ? buildEnrichmentPrompt(ai_text_mode, slide_types, image_urls.length)
      : buildFullClassificationPrompt(ai_text_mode);

    const userPrompt = `Analyze these ${image_urls.length} carousel slides:\n\n${imageDescriptions}\n\nReturn a JSON array with ${image_urls.length} analysis objects. Strict JSON only.`;

    const result = await callLLM(supabase, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.3, maxTokens: 4096, geminiFirst: true });

    console.log(`[analyze-carousel-source] LLM provider: ${result.provider}`);

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
      if (analysis.analysis) analysis = analysis.analysis;
      if (!Array.isArray(analysis)) analysis = [analysis];
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse analysis JSON' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (hasPreClassified) {
      // ENRICH MODE: update existing slides with visual analysis data
      // Don't delete slides — they were created by SourceStep with validation data
      const { data: existingSlides } = await supabase
        .from('carousel_slides')
        .select('id, slide_index, analysis_data')
        .eq('project_id', project_id)
        .order('slide_index');

      for (let i = 0; i < analysis.length; i++) {
        const a = analysis[i];
        const existing = existingSlides?.find((s: any) => s.slide_index === i);

        if (existing) {
          // Merge: keep validation data, add visual enrichment
          const mergedAnalysis = {
            ...(existing.analysis_data || {}),
            // Enrichment fields from LLM
            topic: a.topic,
            textContent: a.textContent,
            layout: a.layout,
            visualStyle: a.visualStyle,
            subjectDetection: a.subjectDetection,
            // Hook/CTA specific (if LLM detected)
            hookCategory: a.hookCategory || null,
            foreshadowType: a.foreshadowType || null,
            ctaType: a.ctaType || null,
          };

          await supabase
            .from('carousel_slides')
            .update({ analysis_data: mergedAnalysis })
            .eq('id', existing.id);
        }
      }

      console.log(`[analyze-carousel-source] Enriched ${analysis.length} slides`);
    } else {
      // FULL MODE: create slides from scratch (legacy behavior)
      await supabase.from('carousel_slides').delete().eq('project_id', project_id);

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

      const { error: insertError } = await supabase
        .from('carousel_slides')
        .insert(slideRecords);

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: insertError.message } }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.log(`[analyze-carousel-source] Created ${slideRecords.length} slides`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { slides: analysis },
        slide_count: analysis.length,
        mode: hasPreClassified ? 'enrich' : 'full',
        provider: result.provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[analyze-carousel-source] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Enrichment-only prompt — slide types already known, focus on visual analysis
 */
function buildEnrichmentPrompt(aiTextMode: boolean, slideTypes: Record<number, string>, count: number): string {
  const typesList = Array.from({ length: count }, (_, i) => {
    const t = slideTypes[i] || 'BODY';
    return `Slide ${i + 1}: ${t}`;
  }).join(', ');

  return `You are an expert carousel image analyst for social media rebranding.

Slide types are ALREADY classified: ${typesList}
DO NOT re-classify segment types — focus ONLY on extracting visual details.

OUTPUT FORMAT: Strict JSON array, one object per slide. No markdown, no code blocks.

Per slide, extract:
{
  "slideIndex": <0-based>,
  "topic": "<main topic/message of this slide>",
  "textContent": ["<line 1>", "<line 2>", ...],
  "layout": "<full|split-left|split-right|text-overlay|minimal|graphic>",
  "visualStyle": {
    "dominantColors": ["#hex1", "#hex2", "#hex3"],
    "mood": "<professional|playful|dramatic|minimalist|luxury|warm|bold|vintage>",
    "composition": "<centered|rule-of-thirds|symmetrical|asymmetrical|framed>"
  },
  "subjectDetection": {
    "hasCreator": <true if human face is prominent>,
    "hasProduct": <true if product is shown>,
    "description": "<brief description of main subject>"
  },
  "hookCategory": "<curiosity_gap|visual_shock|problem_solver|plot_twist|speed_value|null>",
  "foreshadowType": "<steps_tease|fear_urgency|quiz_choice|visual_tease|null>",
  "ctaType": "<polarize|question|identity_tag|engagement_reward|null>"
}

ADDITIONAL FIELDS (fill based on slide type):
- For HOOK slides: detect hookCategory from the visual/text style
- For FORE slides: detect foreshadowType from the messaging pattern
- For CTA slides: detect ctaType from the call-to-action pattern
- For BODY slides: set all three to null

${aiTextMode
  ? 'AI TEXT MODE: ON — Extract ALL visible text verbatim for AI to re-render.'
  : 'AI TEXT MODE: OFF — Extract text but it will be added via editor layers.'}`;
}

/**
 * Full classification prompt — legacy mode when no pre-classified types
 */
function buildFullClassificationPrompt(aiTextMode: boolean): string {
  return `You are an expert carousel image analyst for social media rebranding.

Analyze each slide image from the source carousel and extract structured information.

OUTPUT FORMAT: Strict JSON array, one object per slide. No markdown, no code blocks.

Per slide, extract:
{
  "slideIndex": <0-based>,
  "topic": "<main topic/message of this slide>",
  "textContent": ["<line 1>", "<line 2>", ...],
  "layout": "<full|split-left|split-right|text-overlay|minimal|graphic>",
  "visualStyle": {
    "dominantColors": ["#hex1", "#hex2", "#hex3"],
    "mood": "<professional|playful|dramatic|minimalist|luxury|warm|bold|vintage>",
    "composition": "<centered|rule-of-thirds|symmetrical|asymmetrical|framed>"
  },
  "segmentType": "<HOOK|FORE|BODY|CTA>",
  "subjectDetection": {
    "hasCreator": <true if human face is prominent>,
    "hasProduct": <true if product is shown>,
    "description": "<brief description of main subject>"
  }
}

SEGMENT TYPE RULES:
- Slide 1 → HOOK (always)
- Last slide → CTA (always)
- Slide 2 (if total > 3) → FORE (foreshadow/bridge)
- Remaining slides → BODY
- If unsure → BODY

${aiTextMode
  ? 'AI TEXT MODE: ON — Extract all visible text for AI to re-render in-image.'
  : 'AI TEXT MODE: OFF — Extract text but it will be added via editor layers, not in-image.'}`;
}
