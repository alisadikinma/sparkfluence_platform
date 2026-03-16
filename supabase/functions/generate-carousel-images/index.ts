import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';

// Import RAG knowledge
let HOOK_SCIENCE = '';
let VISUAL_ACTION_BANK = '';
let CAROUSEL_REBRANDING = '';
let PROMPT_FORMULAS = '';
let CINEMATOGRAPHY_LUT = '';

try { const m = await import('../_shared/knowledge/carousel/hook-science.ts'); HOOK_SCIENCE = m.HOOK_SCIENCE_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/visual-action-bank.ts'); VISUAL_ACTION_BANK = m.VISUAL_ACTION_BANK_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/carousel-rebranding.ts'); CAROUSEL_REBRANDING = m.CAROUSEL_REBRANDING_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/prompt-formulas.ts'); PROMPT_FORMULAS = m.PROMPT_FORMULAS_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/cinematography-lut.ts'); CINEMATOGRAPHY_LUT = m.CINEMATOGRAPHY_LUT_KNOWLEDGE || ''; } catch {}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMAGE_MODELS: Record<string, { endpoint: string; cost: number; supportsReference: boolean }> = {
  'fal-nano-banana-edit': { endpoint: 'fal-ai/nano-banana-2/edit', cost: 0.08, supportsReference: true },
  'fal-qwen-image-2-pro-edit': { endpoint: 'fal-ai/qwen-image-2/pro/edit', cost: 0.075, supportsReference: true },
  'fal-seedream-v5-lite-edit': { endpoint: 'fal-ai/bytedance/seedream/v5/lite/edit', cost: 0.035, supportsReference: true },
  'fal-seedream-v4': { endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image', cost: 0.03, supportsReference: false },
  'fal-seedream-v4-5': { endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image', cost: 0.04, supportsReference: false },
  'fal-qwen-image': { endpoint: 'fal-ai/qwen-image-2/text-to-image', cost: 0.035, supportsReference: false },
};

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
      image_models,
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

    // Model selection from frontend
    const aRollModel = image_models?.aRoll || 'fal-nano-banana-edit';
    const bRollModel = image_models?.bRoll || 'fal-seedream-v4';

    // Fetch slides
    let query = supabase.from('carousel_slides').select('*').eq('project_id', project_id);
    if (slide_ids?.length > 0) query = query.in('id', slide_ids);
    const { data: slides, error: slidesError } = await query.order('slide_index');

    if (slidesError || !slides?.length) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NO_SLIDES', message: 'No slides found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch creator avatar for face reference
    const { data: projectData } = await supabase
      .from('carousel_projects')
      .select('user_id')
      .eq('id', project_id)
      .single();

    let creatorAvatarUrl: string | null = null;
    if (projectData?.user_id) {
      const { data: voiceData } = await supabase
        .from('voice_prompts')
        .select('avatar_url')
        .eq('user_id', projectData.user_id)
        .eq('is_profile_avatar', true)
        .maybeSingle();
      creatorAvatarUrl = voiceData?.avatar_url || null;
    }

    const totalSlides = slides.length;
    const brandCtx = buildBrandingContext(branding_kit, ai_text_mode, totalSlides);
    const results: Array<{ slideId: string; success: boolean; imageUrl?: string; prompt?: string; error?: string }> = [];

    console.log(`[generate-carousel-images] Processing ${slides.length} slides, creator avatar: ${creatorAvatarUrl ? 'YES' : 'NO'}`);

    for (const slide of slides) {
      if (slide.generation_method === 'manual') {
        results.push({ slideId: slide.id, success: true, prompt: 'Manual upload — skipped' });
        continue;
      }

      const analysis = slide.analysis_data;
      if (!analysis) {
        results.push({ slideId: slide.id, success: false, error: 'No analysis data — run analyze first' });
        continue;
      }

      // Determine shot type + model
      const isCreator = isCreatorSlide(slide.slide_type);
      const modelKey = isCreator ? aRollModel : bRollModel;
      const modelConfig = IMAGE_MODELS[modelKey] || IMAGE_MODELS['fal-seedream-v4'];

      // Build visual rules based on slide type
      const visualRules = getVisualRulesForSlideType(slide.slide_type, analysis, slide.slide_index, totalSlides);

      // Build RAG context (trimmed to fit token budget)
      const ragContext = buildRagContext(slide.slide_type);

      // Build LLM prompt
      const promptSystem = `You are an expert cinematic AI image prompt builder for carousel rebranding.
Build a ${ai_text_mode ? '5-paragraph' : '4-paragraph'} fal.ai image generation prompt.

${ragContext}

${brandCtx}

${visualRules}

PROMPT STRUCTURE:
P1: Subject + Action + Expression (who, what, emotion, wardrobe)
P2: Lighting + Color Grade + Film Stock (specify pattern, ratio, Kelvin)
P3: Composition + Camera + Lens + Environment (shot type, focal length, aperture, angle)
${ai_text_mode ? `P4: Text Rendering — headline in brand color ALL CAPS bold, subtitle below, page number top-left, SWIPE CTA bottom
P5: Brand Elements — logo icon at position with opacity, @handle watermark` : `P4: Brand Elements — logo icon at position with opacity, @handle watermark`}

RULES:
- 4:5 aspect ratio (1080x1350)
- ${isCreator ? 'CREATOR SHOT: Include creator face, direct eye contact, expressive emotion' : 'B-ROLL: NO human faces unless explicitly configured. Focus on environment/product/abstract'}
- Always specify: cinematic, high resolution, professional photography
- Output plain text prompt only (no JSON, no markdown)`;

      const promptUser = `Build a fal.ai image prompt for Slide ${slide.slide_index + 1}/${totalSlides} (${slide.slide_type}):

ANALYSIS:
- Topic: ${analysis.topic || 'unknown'}
- Text: ${analysis.textContent?.join(' | ') || 'none'}
- Layout: ${analysis.layout || 'full'}
- Visual: mood=${analysis.visualStyle?.mood || 'professional'}, colors=${analysis.visualStyle?.dominantColors?.join(',') || 'neutral'}
- Subject: ${analysis.subjectDetection?.description || 'none'}
${analysis.hookCategory ? `- Hook Category: ${analysis.hookCategory}` : ''}
${analysis.foreshadowType ? `- Foreshadow Type: ${analysis.foreshadowType}` : ''}
${analysis.ctaType ? `- CTA Type: ${analysis.ctaType}` : ''}
${slide.additional_note ? `\nUSER NOTE: ${slide.additional_note}` : ''}
${slide.reference_image_url ? `\nREFERENCE IMAGE: Use this as visual reference: ${slide.reference_image_url}` : ''}
${slide.creator_face && isCreator ? '\nCREATOR: Include creator face with natural expression matching the slide emotion.' : ''}

Write the prompt now. Plain text only.`;

      console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1} (${slide.slide_type}) → model: ${modelKey}`);

      const llmResult = await callLLM(supabase, [
        { role: 'system', content: promptSystem },
        { role: 'user', content: promptUser },
      ], { temperature: 0.7, maxTokens: 1024 });

      if (!llmResult.success || !llmResult.content) {
        results.push({ slideId: slide.id, success: false, error: llmResult.error || 'Prompt generation failed' });
        continue;
      }

      const imagePrompt = llmResult.content.trim();

      // Save prompt to DB
      await supabase.from('carousel_slides')
        .update({ prompt: imagePrompt, image_model: modelKey })
        .eq('id', slide.id);

      // Build fal.ai request
      const falInput: any = {
        prompt: imagePrompt,
        image_size: { width: 1080, height: 1350 },
        num_images: 1,
      };

      // Add reference images for A-ROLL (creator face + optional ref image)
      if (isCreator && modelConfig.supportsReference) {
        const refImages: string[] = [];
        if (creatorAvatarUrl && slide.creator_face) refImages.push(creatorAvatarUrl);
        if (slide.source_image_url) refImages.push(slide.source_image_url);
        if (slide.reference_image_url) refImages.push(slide.reference_image_url);
        if (refImages.length > 0) falInput.image_url = refImages[0];
        if (refImages.length > 1) falInput.image_urls = refImages;
      } else if (!isCreator && slide.reference_image_url) {
        // B-ROLL with reference — some models support it
        if (modelConfig.supportsReference) {
          falInput.image_url = slide.reference_image_url;
        }
      }

      // Call fal.ai
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
        console.error(`[generate-carousel-images] fal.ai error: ${falResponse.status} — ${errText.slice(0, 200)}`);
        results.push({ slideId: slide.id, success: false, prompt: imagePrompt, error: `fal.ai error: ${falResponse.status}` });
        continue;
      }

      const falData = await falResponse.json();
      const generatedImageUrl = falData.images?.[0]?.url || falData.image?.url;

      if (!generatedImageUrl) {
        results.push({ slideId: slide.id, success: false, prompt: imagePrompt, error: 'No image URL in response' });
        continue;
      }

      await supabase.from('carousel_slides')
        .update({ image_url: generatedImageUrl, prompt: imagePrompt, image_model: modelKey })
        .eq('id', slide.id);

      results.push({ slideId: slide.id, success: true, imageUrl: generatedImageUrl, prompt: imagePrompt });
      console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1} ✅ generated`);
    }

    // Update project status
    if (results.every(r => r.success)) {
      await supabase.from('carousel_projects').update({ status: 'generated' }).eq('id', project_id);
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
  } catch (err: any) {
    console.error('[generate-carousel-images] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCreatorSlide(type: string): boolean {
  return type === 'HOOK' || type === 'FORE' || type === 'CTA';
}

function buildBrandingContext(kit: any, aiTextMode: boolean, totalSlides: number): string {
  if (!kit) return '';
  return `BRAND KIT:
- Colors: primary=${kit.colors?.primary || '#10B981'}, secondary=${kit.colors?.secondary || '#0B0E14'}, accent=${kit.colors?.accent || '#F59E0B'}, highlight=${kit.colors?.highlight || '#EF4444'}
- Font: ${kit.fontFamily || 'Inter'} ${kit.fontWeight || '700'}
- Handle: ${kit.handleText || '@brand'}
- Watermark: ${kit.watermark?.opacity || 30}% opacity, ${kit.watermark?.position || 'center'}
- Logo: ${kit.logoUrl ? 'YES (bake brand icon in-image)' : 'NO logo'}

BRANDING RULES:
- Bake brand icon at ${kit.watermark?.position || 'center'} with ${kit.watermark?.opacity || 30}% opacity
- Bake @handle watermark below logo
- Use brand colors for visual consistency
${aiTextMode ? `- AI TEXT ON: Headline in brand primary color, ALL CAPS bold. Page "[N]/${totalSlides}" top-left. "SWIPE >>>" bottom on all except CTA.` : '- AI TEXT OFF: Do NOT render text in-image.'}`;
}

function buildRagContext(slideType: string): string {
  const parts: string[] = [];

  if (slideType === 'HOOK') {
    if (HOOK_SCIENCE) parts.push(`=== HOOK SCIENCE ===\n${HOOK_SCIENCE.slice(0, 2500)}`);
    if (VISUAL_ACTION_BANK) parts.push(`=== VISUAL ACTIONS ===\n${VISUAL_ACTION_BANK.slice(0, 2000)}`);
  }
  if (PROMPT_FORMULAS) parts.push(`=== PROMPT FORMULAS ===\n${PROMPT_FORMULAS.slice(0, 2000)}`);
  if (CAROUSEL_REBRANDING) parts.push(`=== REBRANDING ===\n${CAROUSEL_REBRANDING.slice(0, 1500)}`);
  if (CINEMATOGRAPHY_LUT) parts.push(`=== CINEMATOGRAPHY ===\n${CINEMATOGRAPHY_LUT.slice(0, 1500)}`);

  return parts.join('\n\n');
}

/**
 * Visual rules per slide type — cinematic specs from carousel prompt plugin
 */
function getVisualRulesForSlideType(
  slideType: string,
  analysis: any,
  slideIndex: number,
  totalSlides: number,
): string {
  const hookCategory = analysis.hookCategory || 'curiosity_gap';
  const foreshadowType = analysis.foreshadowType || 'steps_tease';
  const ctaType = analysis.ctaType || 'question';

  switch (slideType) {
    case 'HOOK':
      return `VISUAL RULES — HOOK (Slide 1, CREATOR, Intensity 6/6):
- PURPOSE: Pattern interrupt in <0.5 seconds. Must stop scrolling.
- Hook Category: ${hookCategory}
- LIGHTING: Rembrandt or Split, ratio 4:1-6:1, Kelvin 3200K warm dramatic
- CAMERA: Close-Up (CU), 85mm f/1.8, eye-level or slight Dutch tilt
- EXPRESSION: Exaggerated to match hook category (wide eyes for shock, knowing smirk for curiosity)
- DEPTH: 3 layers — foreground action + subject face + background pattern interrupt
- ATMOSPHERE: Haze, volumetric rays, or particles
- COLOR: Peak saturation, strong accent on power word (120% size), warm-cool tension
- TEXTURE: Micro-imperfections: visible pores, fabric weave, natural skin
- FILM: Kodak Portra 400, warm grain, Rembrandt lighting pattern
- WOW GATE: All 8 elements mandatory (lighting, depth, atmosphere, color, emotion, camera, texture, cinematic ref)
- Visual must create COGNITIVE DISSONANCE — something unexpected that forces a double-take`;

    case 'FORE':
      return `VISUAL RULES — FORESHADOW (Slide 2, CREATOR, Intensity 3/6):
- PURPOSE: Bridge between HOOK and BODY. Creates FOMO + specific expectation.
- Foreshadow Type: ${foreshadowType}
- VISUAL CONTINUITY: Must feel like SAME SCENE as Hook — same wardrobe, connected environment
- LIGHTING: Butterfly or Loop, ratio 3:1, Kelvin 3500K warm (muted vs hook)
- CAMERA: MCU/MS, 85mm f/2, eye-level (pull back from Hook's CU)
- EXPRESSION: Concerned urgency OR teasing smirk (matches foreshadow type)
- DEPTH: Show environment context (wider than Hook to establish setting)
- COLOR: Restrained palette — warm but held back, building anticipation
- FILM: Kodak Portra 400, subtle grain
- Key rule: LOWER intensity than Hook (building tension, not peaking)`;

    case 'BODY':
      return `VISUAL RULES — BODY (Slide ${slideIndex + 1}, B-ROLL, Intensity ${Math.min(2 + slideIndex, 5)}/6):
- PURPOSE: Deliver main content — data, facts, explanations, value
- LIGHTING: Progressive build — ratio ${4 - Math.min(slideIndex, 2)}:1, Kelvin 3500K neutral-warm
- CAMERA: Varies by content — MS for product, WS for environment, CU for detail
- NO HUMAN FACES (unless creator_face explicitly enabled)
- Focus on content visualization: products, environments, abstract concepts
- COLOR: Gradual saturation increase as slides progress
- FILM: Clean digital or Fujifilm Pro 400H
- If reference image provided: match its mood and composition style
- Micro-imperfections in textures for realism`;

    case 'CTA':
      return `VISUAL RULES — CTA (Last Slide, CREATOR, Intensity 1/6):
- PURPOSE: Drive engagement action — comment, follow, share, save
- CTA Type: ${ctaType}
- LIGHTING: Butterfly, ratio 2:1 (softest), Kelvin 3500K (warmest, most intimate)
- CAMERA: MCU, 85mm f/2, direct eye-level (conversation, not lecture)
- EXPRESSION: Direct eye contact, inviting energy — warm smile, open posture
- ATMOSPHERE: Soft, golden, gentle — warmest slide of entire carousel
- COLOR: Warmest tone, golden, gentle — signals "conversation ending warmly"
- TEXT: Billboard-scale font for CTA text (if AI Text ON)
- NO "SWIPE >>>" text on CTA (replaced by social icons/engagement prompt)
- FILM: Kodak Portra 160, warm grain, intimate lighting`;

    default:
      return `VISUAL RULES — BODY (default):
- Standard content visualization
- Clean, professional photography
- Match source image mood`;
  }
}
