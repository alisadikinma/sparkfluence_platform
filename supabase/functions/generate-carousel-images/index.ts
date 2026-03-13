import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';

// Import RAG knowledge (will be available after 1G port)
// These are imported dynamically to avoid errors if files don't exist yet
let HOOK_SCIENCE = '';
let VISUAL_ACTION_BANK = '';
let CAROUSEL_REBRANDING = '';
let PROMPT_FORMULAS = '';
let CINEMATOGRAPHY_LUT = '';

try {
  const hs = await import('../_shared/knowledge/carousel/hook-science.ts');
  HOOK_SCIENCE = hs.HOOK_SCIENCE_KNOWLEDGE || '';
} catch { /* not yet ported */ }

try {
  const vab = await import('../_shared/knowledge/carousel/visual-action-bank.ts');
  VISUAL_ACTION_BANK = vab.VISUAL_ACTION_BANK_KNOWLEDGE || '';
} catch { /* not yet ported */ }

try {
  const cr = await import('../_shared/knowledge/carousel/carousel-rebranding.ts');
  CAROUSEL_REBRANDING = cr.CAROUSEL_REBRANDING_KNOWLEDGE || '';
} catch { /* not yet ported */ }

try {
  const pf = await import('../_shared/knowledge/carousel/prompt-formulas.ts');
  PROMPT_FORMULAS = pf.PROMPT_FORMULAS_KNOWLEDGE || '';
} catch { /* not yet ported */ }

try {
  const cl = await import('../_shared/knowledge/carousel/cinematography-lut.ts');
  CINEMATOGRAPHY_LUT = cl.CINEMATOGRAPHY_LUT_KNOWLEDGE || '';
} catch { /* not yet ported */ }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Image model endpoints
const IMAGE_MODELS = {
  // A-ROLL (creator face — reference image support)
  'fal-nano-banana-edit': {
    endpoint: 'fal-ai/nano-banana-2/edit',
    cost: 0.08,
    supportsReference: true,
  },
  'fal-qwen-image-2-pro-edit': {
    endpoint: 'fal-ai/qwen-image-2/pro/edit',
    cost: 0.075,
    supportsReference: true,
  },
  'fal-seedream-v5-lite-edit': {
    endpoint: 'fal-ai/bytedance/seedream/v5/lite/edit',
    cost: 0.035,
    supportsReference: true,
  },
  // B-ROLL (no reference image)
  'fal-seedream-v4': {
    endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image',
    cost: 0.03,
    supportsReference: false,
  },
  'fal-seedream-v4-5': {
    endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    cost: 0.04,
    supportsReference: false,
  },
} as const;

type ImageModelKey = keyof typeof IMAGE_MODELS;

/**
 * generate-carousel-images
 *
 * Stage 2 of 2-stage Rebrand Engine.
 * Takes analysis JSON + branding kit + RAG knowledge → builds fal.ai prompt per slide → generates.
 *
 * Input: {
 *   project_id: string,
 *   slide_ids?: string[],      // specific slides to (re)generate, or all
 *   branding_kit: BrandingKit, // user's brand kit
 *   ai_text_mode: boolean,
 *   a_roll_model?: string,     // default: fal-nano-banana-edit
 *   b_roll_model?: string,     // default: fal-seedream-v4
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      project_id,
      slide_ids,
      branding_kit,
      ai_text_mode = true,
      a_roll_model = 'fal-nano-banana-edit',
      b_roll_model = 'fal-seedream-v4',
    } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_PROJECT_ID', message: 'project_id is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NO_FAL_KEY', message: 'FAL_AI_API_KEY not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch slides to generate
    let query = supabase.from('carousel_slides').select('*').eq('project_id', project_id);
    if (slide_ids && slide_ids.length > 0) {
      query = query.in('id', slide_ids);
    }
    const { data: slides, error: slidesError } = await query.order('slide_index');

    if (slidesError || !slides || slides.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NO_SLIDES', message: 'No slides found for this project' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get total slide count for pagination context
    const totalSlides = slides.length;

    // Build RAG context
    const ragContext = [
      PROMPT_FORMULAS && `=== PROMPT FORMULAS ===\n${PROMPT_FORMULAS.slice(0, 3000)}`,
      CAROUSEL_REBRANDING && `=== REBRANDING RULES ===\n${CAROUSEL_REBRANDING.slice(0, 2000)}`,
      HOOK_SCIENCE && `=== HOOK SCIENCE ===\n${HOOK_SCIENCE.slice(0, 2000)}`,
      CINEMATOGRAPHY_LUT && `=== CINEMATOGRAPHY ===\n${CINEMATOGRAPHY_LUT.slice(0, 1500)}`,
    ].filter(Boolean).join('\n\n');

    // Build branding context
    const brandingContext = branding_kit ? `
BRAND KIT:
- Colors: primary=${branding_kit.colors?.primary}, secondary=${branding_kit.colors?.secondary}, accent=${branding_kit.colors?.accent}, highlight=${branding_kit.colors?.highlight}
- Font: ${branding_kit.fontFamily || 'Inter'} ${branding_kit.fontWeight || '700'}
- Handle: ${branding_kit.handleText || '@brand'}
- Watermark: ${branding_kit.watermark?.opacity || 30}% opacity, ${branding_kit.watermark?.position || 'center'}
- Logo: ${branding_kit.logoUrl ? 'YES (bake brand icon in-image)' : 'NO logo'}

BRANDING RULES FOR IMAGE:
- Bake brand icon (logo) at ${branding_kit.watermark?.position || 'center'} with ${branding_kit.watermark?.opacity || 30}% opacity
- Bake @handle watermark below logo with same opacity
- Use brand colors for visual consistency
${ai_text_mode ? `- AI TEXT MODE ON: Render headline text in brand primary color, ALL CAPS, bold
- Render subtitle text in brand muted color
- Render page number "[N]/${totalSlides}" top-left
- Render "SWIPE >>>" bottom-center on all slides except CTA` : '- AI TEXT MODE OFF: Do NOT render any text in-image (text handled by editor layers)'}
` : '';

    // Generate prompt for each slide via LLM
    const results: Array<{ slideId: string; success: boolean; imageUrl?: string; prompt?: string; error?: string }> = [];

    for (const slide of slides) {
      // Skip manual slides
      if (slide.generation_method === 'manual') {
        results.push({ slideId: slide.id, success: true, prompt: 'Manual upload — skipped' });
        continue;
      }

      const analysis = slide.analysis_data;
      if (!analysis) {
        results.push({ slideId: slide.id, success: false, error: 'No analysis data — run analyze first' });
        continue;
      }

      // Determine model
      const isCreatorShot = slide.creator_face && slide.slide_type !== 'BODY';
      const modelKey = isCreatorShot ? a_roll_model : b_roll_model;
      const modelConfig = IMAGE_MODELS[modelKey as ImageModelKey] || IMAGE_MODELS['fal-seedream-v4'];

      // Build prompt via LLM
      const promptSystemMsg = `You are an expert AI image prompt builder for carousel rebranding.
Build a ${ai_text_mode ? '5-paragraph' : '4-paragraph'} fal.ai image generation prompt.

${ragContext}

${brandingContext}

PROMPT STRUCTURE${ai_text_mode ? ' (5 paragraphs)' : ' (4 paragraphs)'}:
P1: Subject + Action + Expression (who, what, emotion)
P2: Lighting + Color Grade + Film Stock (Kodak Portra 400 default)
P3: Composition + Camera + Environment
${ai_text_mode ? `P4: Text Rendering — headline in brand color ALL CAPS, subtitle below, page number top-left, SWIPE CTA bottom
P5: Brand Elements — logo icon at position with opacity, @handle watermark` : `P4: Brand Elements — logo icon at position with opacity, @handle watermark`}

RULES:
- 4:5 aspect ratio (1080x1350)
- ${isCreatorShot ? 'CREATOR SHOT: include reference to the creator face, direct eye contact, expressive' : 'B-ROLL: NO human faces, focus on environment/product/abstract visuals'}
- Always specify: cinematic, high resolution, professional photography
- DO NOT use markdown in the prompt
- Output the prompt as plain text (no JSON wrapping)`;

      const promptUserMsg = `Build a fal.ai image prompt for Slide ${slide.slide_index + 1}/${totalSlides} (${slide.slide_type}):

ANALYSIS:
- Topic: ${analysis.topic}
- Text Content: ${analysis.textContent?.join(' | ') || 'none'}
- Layout: ${analysis.layout}
- Visual Style: mood=${analysis.visualStyle?.mood}, colors=${analysis.visualStyle?.dominantColors?.join(',')}
- Subject: ${analysis.subjectDetection?.description || 'none'}

${slide.additional_note ? `USER NOTE: ${slide.additional_note}` : ''}

Write the prompt now. Plain text only.`;

      const llmResult = await callLLM(supabase, [
        { role: 'system', content: promptSystemMsg },
        { role: 'user', content: promptUserMsg },
      ], { temperature: 0.7, maxTokens: 1024 });

      if (!llmResult.success || !llmResult.content) {
        results.push({ slideId: slide.id, success: false, error: llmResult.error || 'Prompt generation failed' });
        continue;
      }

      const imagePrompt = llmResult.content.trim();

      // Save prompt to DB
      await supabase
        .from('carousel_slides')
        .update({ prompt: imagePrompt, image_model: modelKey })
        .eq('id', slide.id);

      // Call fal.ai to generate image
      const falInput: any = {
        prompt: imagePrompt,
        image_size: { width: 1080, height: 1350 },
        num_images: 1,
      };

      // Add reference image for creator shots (A-ROLL models)
      if (isCreatorShot && modelConfig.supportsReference && slide.reference_image_url) {
        falInput.image_url = slide.reference_image_url;
      }

      const falEndpoint = `https://fal.run/${modelConfig.endpoint}`;
      const falResponse = await fetch(falEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(falInput),
      });

      if (!falResponse.ok) {
        const errText = await falResponse.text();
        results.push({ slideId: slide.id, success: false, prompt: imagePrompt, error: `fal.ai error: ${falResponse.status} — ${errText.slice(0, 200)}` });

        await supabase
          .from('carousel_slides')
          .update({ prompt: imagePrompt })
          .eq('id', slide.id);
        continue;
      }

      const falData = await falResponse.json();
      const generatedImageUrl = falData.images?.[0]?.url || falData.image?.url;

      if (!generatedImageUrl) {
        results.push({ slideId: slide.id, success: false, prompt: imagePrompt, error: 'No image URL in fal.ai response' });
        continue;
      }

      // Update slide with generated image
      await supabase
        .from('carousel_slides')
        .update({
          image_url: generatedImageUrl,
          prompt: imagePrompt,
          image_model: modelKey,
        })
        .eq('id', slide.id);

      results.push({ slideId: slide.id, success: true, imageUrl: generatedImageUrl, prompt: imagePrompt });
    }

    // Update project status
    const allSuccess = results.every(r => r.success);
    if (allSuccess) {
      await supabase
        .from('carousel_projects')
        .update({ status: 'generated' })
        .eq('id', project_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
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
