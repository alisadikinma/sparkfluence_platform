import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLM } from '../_shared/apiKeyRotation.ts';

// Import RAG knowledge
let HOOK_SCIENCE = '';
let VISUAL_ACTION_BANK = '';
let CAROUSEL_REBRANDING = '';
let PROMPT_FORMULAS = '';
let CINEMATOGRAPHY_LUT = '';
let HOOK_FORMULA_BANK = '';

try { const m = await import('../_shared/knowledge/carousel/hook-science.ts'); HOOK_SCIENCE = m.HOOK_SCIENCE_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/visual-action-bank.ts'); VISUAL_ACTION_BANK = m.VISUAL_ACTION_BANK_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/carousel-rebranding.ts'); CAROUSEL_REBRANDING = m.CAROUSEL_REBRANDING_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/prompt-formulas.ts'); PROMPT_FORMULAS = m.PROMPT_FORMULAS_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/cinematography-lut.ts'); CINEMATOGRAPHY_LUT = m.CINEMATOGRAPHY_LUT_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/hook-formula-bank.ts'); HOOK_FORMULA_BANK = m.HOOK_FORMULA_BANK_KNOWLEDGE || ''; } catch {}

let PROP_SYSTEM = '';
let EMOTIONAL_ARC = '';
try { const m = await import('../_shared/knowledge/carousel/prop-interaction-system.ts'); PROP_SYSTEM = m.PROP_INTERACTION_SYSTEM_KNOWLEDGE || ''; } catch {}
try { const m = await import('../_shared/knowledge/carousel/emotional-arc.ts'); EMOTIONAL_ARC = m.EMOTIONAL_ARC_KNOWLEDGE || ''; } catch {}

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
    const body = await req.json();
    const {
      project_id,
      slide_ids,
      branding_kit,
      ai_text_mode = true,
      image_models,
      action,
      hook_category,
      visual_action,
      language_settings,
    } = body;

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_PROJECT_ID', message: 'project_id is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Hook Suggestion Mode ──────────────────────────────────────────────────
    if (action === 'suggest_hooks') {
      // Read first slide's analysis to determine content category
      const { data: hookSlides } = await supabase
        .from('carousel_slides')
        .select('analysis_data')
        .eq('project_id', project_id)
        .order('slide_index')
        .limit(3);

      const firstAnalysis = hookSlides?.[0]?.analysis_data;
      const contentCategory = firstAnalysis?.contentCategory || 'lifestyle';
      const emotionalTone = firstAnalysis?.emotionalTone || 'curious';

      const hookOptions = suggestHookOptions(contentCategory, emotionalTone);

      return new Response(
        JSON.stringify({ success: true, data: { hookOptions } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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
    // Priority: character_ref_png (PNG face ref) > avatar_url (profile photo) > OAuth avatar
    const { data: projectData } = await supabase
      .from('carousel_projects')
      .select('user_id')
      .eq('id', project_id)
      .single();

    let creatorAvatarUrl: string | null = null;
    let creatorBrandLogoUrl: string | null = null;
    if (projectData?.user_id) {
      // Get profile photo (primary source for creator face)
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('avatar_url, character_ref_png')
        .eq('user_id', projectData.user_id)
        .maybeSingle();

      // character_ref_png = PNG version optimized for face reference
      // avatar_url = original uploaded profile photo
      creatorAvatarUrl = profileData?.character_ref_png || profileData?.avatar_url || null;

      // Get brand logo from branding kit
      if (branding_kit?.logoUrl) {
        creatorBrandLogoUrl = branding_kit.logoUrl;
      }
    }

    const totalSlides = slides.length;
    const results: Array<{ slideId: string; success: boolean; imageUrl?: string; prompt?: string; error?: string; wowScore?: number }> = [];

    console.log(`[generate-carousel-images] Processing ${slides.length} slides, creator avatar: ${creatorAvatarUrl || 'NONE'}, brand handle: ${branding_kit?.handleText || 'NONE'}`);

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

      // Determine shot type + model (use spread to avoid mutating shared config)
      const isCreator = isCreatorSlide(slide.slide_type);
      let useModelKey = isCreator ? aRollModel : bRollModel;
      let useModelConfig = { ...(IMAGE_MODELS[useModelKey] || IMAGE_MODELS['fal-seedream-v4']) };

      // Use user-selected hook category if provided, else fall back to analysis
      const effectiveHookCategory = hook_category || analysis.hookCategory || 'curiosity_gap';
      const effectiveVisualAction = visual_action || analysis.visualAction || 'objek_absurd';

      // Build visual rules based on slide type
      const visualRules = getVisualRulesForSlideType(slide.slide_type, analysis, slide.slide_index, totalSlides, effectiveHookCategory);

      // Build RAG context (targeted by slide type)
      const ragContext = buildRagContext(slide.slide_type, effectiveHookCategory);

      // Brand context for text overlay — use color NAME not hex code (hex renders as literal text in image)
      const accentHex = branding_kit?.colors?.primary || '#F5A623';
      const accentColorName = hexToColorName(accentHex);
      const handleText = branding_kit?.handleText || '@brand';
      const logoUrl = branding_kit?.logoUrl || null;

      // Extract the EXACT headline from source image (OCR text) — this is the ground truth
      const sourceHeadline = analysis.textContent?.length > 0
        ? analysis.textContent.join(' ')
        : analysis.topic || 'Untitled';

      // Pick 2-4 power words from the headline to highlight in accent color
      const headlineWords = sourceHeadline.split(/\s+/);
      const powerWordPatterns = /^(GILA|PARAH|NGERI|BRUTAL|RAHASIA|FATAL|BAHAYA|WAJIB|GRATIS|STOP|DIVIDED|SECRET|WRONG|INSANE|SHOCKING|REVEALED|HIDDEN|BANNED|FREE|NEVER|ALWAYS|EVERYONE|NOBODY|INTERNET|CLAIMS|WEARING|WAY|TRUTH|REAL|FAKE)$/i;
      const accentWords = headlineWords.filter(w => powerWordPatterns.test(w.replace(/[^a-zA-Z]/g, ''))).slice(0, 4);
      const accentWordsList = accentWords.length >= 2
        ? accentWords.map(w => `"${w}"`).join(', ')
        : `"${headlineWords[0] || 'THE'}", "${headlineWords[Math.floor(headlineWords.length / 2)] || 'IS'}"`;


      // CRITICAL: The actual creator photo URL is passed in fal.ai's `image_urls` array.
      // The prompt text references the character generically — fal.ai connects it to the reference image automatically.
      const creatorRef = creatorAvatarUrl
        ? `The primary subject is the creator from the provided reference image — this is the most important face in the image, must match the reference image exactly. maintain exact appearance, facial features, skin tone, and distinguishing characteristics from the provided reference image. The creator's face must be the sharpest and most detailed face in the frame. Do not blend or morph the creator's face with any other face.`
        : 'The creator — a confident, expressive content creator.';

      // Language settings — bilingual headline (primary) + subtitle (secondary)
      const langMap: Record<string, string> = { id: 'Indonesian', en: 'English', hi: 'Hindi' };
      const primaryLang = langMap[language_settings?.primary] || 'Indonesian';
      const subtitleLang = language_settings?.subtitle && language_settings.subtitle !== 'none'
        ? langMap[language_settings.subtitle] || null
        : null;

      // Build LLM prompt — Nano Banana Pro 5-paragraph format
      const promptSystem = `You are an expert cinematic AI image prompt builder using Nano Banana Pro format.
Generate a single merged prompt (80-200 words, up to 250 for complex compositions with text overlay).
Treat prompts like Creative Director briefs — natural language, NOT keyword spam.

MANDATORY 5-PARAGRAPH STRUCTURE:

P1 — SUBJECT + EXPRESSION + WARDROBE + ACTION:
${isCreator ? `Start with: "${creatorRef}"
Describe expression using prompt-ready phrases (e.g. "eyes blown wide open with full iris visible, eyebrows shot up high creating deep forehead lines").
Include wardrobe and pose/action.` : 'Describe the scene subject (product, environment, concept). NO human faces unless explicitly requested.'}

P2 — SCENE / ENVIRONMENT + SPATIAL LAYERS:
Describe location, background depth, foreground elements, atmosphere/mood.
Three layers of depth: foreground action, mid-ground subject, background context.

P3 — LENS + LIGHTING + FILM STOCK + ATMOSPHERE + TEXTURE:
Start with "lens:" on own line. Format: lens: [focal]mm f/[aperture], [angle], [depth of field].
Lighting: [pattern] at [ratio], [Kelvin]K [quality]. Fill, rim, atmosphere specs.
Film stock: Kodak Portra 400 (default). Color grade specification.
Texture: Micro-imperfections from 6 categories (skin pores, stray hair, fabric creases, surface scuffs, slight asymmetry, natural light falloff).
Cinematic reference (film/DP style).

${ai_text_mode ? `P4 — TEXT OVERLAY (USE EXACTLY THIS TEXT — DO NOT CHANGE THE HEADLINE):
LANGUAGE RULE: The headline text MUST be written in ${primaryLang}. ${subtitleLang ? `Below the main headline, add a ${subtitleLang} subtitle translation in ${accentColorName} at slightly smaller size — the subtitle must not be white like the main headline.` : 'No subtitle language — monolingual mode.'}
Bottom half of the image has a smooth dark gradient zone. Extremely large, bold, impactful condensed uppercase text reading "${sourceHeadline}" with the words ${accentWordsList} in ${accentColorName}. Remaining text in white. The text uses the largest possible font size that fills the width, extra bold weight, positioned starting from the vertical center of the image extending downward, not crammed at the very bottom.${subtitleLang ? ` Below the main headline, a ${subtitleLang} translation subtitle in ${accentColorName} at slightly smaller size, creating clear visual hierarchy.` : ''}
${logoUrl ? `Render the creator's brand icon centered in the middle of the image as a small circular badge at thirty percent opacity, positioned directly above the @handle watermark.` : ''}
"${handleText}" as a watermark in white, centered in the middle of the image directly below the brand icon, thirty percent opacity, subtle background mark only.
${slide.slide_type !== 'CTA' ? '"SWIPE (GESER) >" in small white text positioned directly beneath the headline text with minimal gap.' : ''}
"${slide.slide_index + 1}/${totalSlides}" as a small white page number in the top-left corner of the image.` : `P4 — BRAND ELEMENTS:
${logoUrl ? `Brand icon centered at thirty percent opacity.` : ''}
"${handleText}" watermark in white, thirty percent opacity, centered.
"${slide.slide_index + 1}/${totalSlides}" page number top-left.`}

P5 — ASPECT RATIO + CONSTRAINTS:
4:5 aspect ratio. No competitor branding. Hyper-realistic photographic style — must look indistinguishable from a real DSLR photograph.
All people must have imperfect real-world details: asymmetric features, uneven skin tones, stray hairs, micro-wrinkles.

${ragContext}

${visualRules}

OUTPUT RULES:
- Output ONLY the merged prompt text (all paragraphs as continuous flowing text, no paragraph labels)
- NO JSON, NO markdown, NO headers, NO bullet points
- NO ALL CAPS instruction words (only headlines/text meant to appear in-image may be caps)
- NO raw percentages — write "thirty percent" not "30%"
- NO "Shot on" prefix, NO "//" separators
- 80-200 words optimal (up to 250 for complex compositions)`;

      // Map emotional arc for this slide position
      const arcBeat = mapEmotionalArc(slide.slide_index, totalSlides, slide.slide_type);

      const promptUser = `Generate Nano Banana Pro prompt for Slide ${slide.slide_index + 1}/${totalSlides} (${slide.slide_type}):

TOPIC: ${sourceHeadline}
MOOD: ${analysis.visualStyle?.mood || 'professional'}
SUBJECT: ${analysis.subjectDetection?.description || 'none'}
CONTENT CATEGORY: ${analysis.contentCategory || 'lifestyle'}
LANGUAGE: Headline in ${primaryLang}${subtitleLang ? `, subtitle in ${subtitleLang}` : ' (monolingual)'}
EMOTIONAL ARC: ${arcBeat.beat} (Intensity ${arcBeat.intensity}/6)
${slide.slide_type === 'HOOK' ? `HOOK CATEGORY: ${effectiveHookCategory}\nVISUAL ACTION: ${effectiveVisualAction}` : ''}
${analysis.foreshadowType || slide.slide_type === 'FORE' ? `FORESHADOW TYPE: ${analysis.foreshadowType || 'steps_tease'}` : ''}
${analysis.ctaType || slide.slide_type === 'CTA' ? `CTA TYPE: ${analysis.ctaType || 'question'}` : ''}
${slide.additional_note ? `USER NOTE: ${slide.additional_note}` : ''}
${slide.creator_face && isCreator ? `CREATOR FACE: YES — match reference image exactly.` : ''}

IMPORTANT: The headline text "${sourceHeadline}" is ALREADY specified in P4 above. Do NOT change it. Focus on generating the VISUAL description (P1-P3 + P5) that matches this topic.
Write continuous flowing text, no labels, no bullet points.`;

      console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1} (${slide.slide_type}) → model: ${useModelKey}`);

      const llmResult = await callLLM(supabase, [
        { role: 'system', content: promptSystem },
        { role: 'user', content: promptUser },
      ], { temperature: 0.7, maxTokens: 2048 });

      if (!llmResult.success || !llmResult.content) {
        results.push({ slideId: slide.id, success: false, error: llmResult.error || 'Prompt generation failed' });
        continue;
      }

      let imagePrompt = llmResult.content.trim();

      // Score WOW Quality Gate (8 elements) — enforce 6/8 minimum
      let wowScore = scoreWOWGate(imagePrompt);
      console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1} WOW: ${wowScore}/8`);

      if (wowScore < 6) {
        console.warn(`[generate-carousel-images] WOW ${wowScore}/8 < 6 minimum — retrying with feedback`);
        const missingElements = getMissingWOWElements(imagePrompt);
        const retryResult = await callLLM(supabase, [
          { role: 'system', content: promptSystem },
          { role: 'user', content: promptUser },
          { role: 'assistant', content: imagePrompt },
          { role: 'user', content: `This prompt scored only ${wowScore}/8 on the WOW quality gate. Missing elements: ${missingElements.join(', ')}. Rewrite to include ALL 8 cinematic elements while keeping the same subject and composition. Output ONLY the rewritten prompt.` },
        ], { temperature: 0.7, maxTokens: 2048 });

        if (retryResult.success && retryResult.content) {
          imagePrompt = retryResult.content.trim();
          wowScore = scoreWOWGate(imagePrompt);
          console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1} WOW retry: ${wowScore}/8`);
        }
      }

      // Store AI decisions in analysis_data for frontend display
      const autoDecisions = {
        hookCategory: effectiveHookCategory,
        visualAction: effectiveVisualAction,
        cameraVariant: 'A' as const, // TODO: anti-repetition rotation in future
        emotionalArc: arcBeat,
        wowScore,
        contentCategory: analysis.contentCategory || null,
        foreshadowType: analysis.foreshadowType || null,
        ctaType: analysis.ctaType || null,
      };

      // Save prompt + autoDecisions to DB
      const updatedAnalysis = { ...(analysis || {}), autoDecisions };
      await supabase.from('carousel_slides')
        .update({ prompt: imagePrompt, image_model: useModelKey, analysis_data: updatedAnalysis })
        .eq('id', slide.id);

      // Build fal.ai request
      const falInput: any = {
        prompt: imagePrompt,
        image_size: { width: 1080, height: 1350 },
        num_images: 1,
      };

      // Add reference images for A-ROLL (creator face + optional user-provided ref)
      // NEVER use source_image_url (IG original) as face reference
      if (isCreator && useModelConfig.supportsReference) {
        const refImages: string[] = [];
        if (creatorAvatarUrl && slide.creator_face) refImages.push(creatorAvatarUrl);
        if (slide.reference_image_url) refImages.push(slide.reference_image_url);

        if (refImages.length > 0) {
          // nano-banana-2/edit requires `image_urls` (array), not `image_url` (singular)
          falInput.image_urls = refImages;
        } else {
          // No creator avatar + no reference → fall back to text-to-image model
          // nano-banana-edit REQUIRES image_urls, so switch to b-roll model
          console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1}: No creator avatar → falling back to text-to-image model`);
          const fallbackConfig = IMAGE_MODELS[bRollModel] || IMAGE_MODELS['fal-seedream-v4'];
          useModelConfig.endpoint = fallbackConfig.endpoint;
        }
      } else if (!isCreator && slide.reference_image_url && useModelConfig.supportsReference) {
        // B-ROLL with user-provided reference — also use array format
        falInput.image_urls = [slide.reference_image_url];
      }

      // Call fal.ai
      const falEndpoint = `https://fal.run/${useModelConfig.endpoint}`;
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

      // Persist image to Supabase Storage (fal.ai CDN URLs expire)
      let persistentUrl = generatedImageUrl;
      try {
        persistentUrl = await persistImageToStorage(supabase, generatedImageUrl, project_id, slide.slide_index);
        console.log(`[generate-carousel-images] Slide ${slide.slide_index + 1} → stored in Supabase Storage`);
      } catch (storageErr: any) {
        console.warn(`[generate-carousel-images] Storage upload failed, using CDN URL: ${storageErr.message}`);
      }

      await supabase.from('carousel_slides')
        .update({ image_url: persistentUrl, prompt: imagePrompt, image_model: useModelKey })
        .eq('id', slide.id);

      results.push({ slideId: slide.id, success: true, imageUrl: persistentUrl, prompt: imagePrompt, wowScore });
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

// ── Image Persistence ────────────────────────────────────────────────────────

/**
 * Download generated image from fal.ai CDN and upload to Supabase Storage.
 * fal.ai CDN URLs expire — Supabase Storage URLs are permanent.
 * Falls back to CDN URL if upload fails (caller handles fallback).
 */
async function persistImageToStorage(
  supabase: any,
  falImageUrl: string,
  projectId: string,
  slideIndex: number,
): Promise<string> {
  // Download from fal.ai CDN
  const imageResponse = await fetch(falImageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  const arrayBuffer = await imageResponse.arrayBuffer();

  // Upload to Supabase Storage
  const fileName = `${projectId}/slide-${slideIndex}-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from('carousel-images')
    .upload(fileName, new Uint8Array(arrayBuffer), {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('carousel-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCreatorSlide(type: string): boolean {
  return type === 'HOOK' || type === 'CTA' || type === 'FORE';
}

/**
 * Convert hex color to descriptive name for LLM prompts.
 * Prevents hex codes from being rendered as literal text in generated images.
 */
function hexToColorName(hex: string): string {
  const map: Record<string, string> = {
    '#F5A623': 'golden yellow',
    '#10B981': 'emerald green',
    '#EF4444': 'vivid red',
    '#3B82F6': 'bright blue',
    '#F59E0B': 'amber orange',
    '#8B5CF6': 'violet purple',
    '#EC4899': 'hot pink',
    '#14B8A6': 'teal',
    '#F97316': 'orange',
    '#FFFFFF': 'white',
    '#000000': 'black',
  };
  const upper = hex.toUpperCase();
  if (map[upper]) return map[upper];

  // Fallback: parse RGB and describe
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (r > 200 && g > 150 && b < 100) return 'golden yellow';
  if (r > 200 && g < 100 && b < 100) return 'vivid red';
  if (r < 100 && g > 150 && b < 100) return 'emerald green';
  if (r < 100 && g < 100 && b > 200) return 'bright blue';
  if (r > 200 && g > 100 && b < 80) return 'warm amber';
  return 'accent color';
}


function buildRagContext(slideType: string, hookCategory?: string): string {
  const parts: string[] = [];

  // Slide-type-specific knowledge injection
  if (slideType === 'HOOK') {
    if (HOOK_SCIENCE) parts.push(`=== HOOK PSYCHOLOGY ===\n${HOOK_SCIENCE.slice(0, 3000)}`);
    if (VISUAL_ACTION_BANK) parts.push(`=== EXPRESSION + VISUAL ACTIONS ===\n${VISUAL_ACTION_BANK.slice(0, 3000)}`);
    if (HOOK_FORMULA_BANK) parts.push(`=== HOOK FORMULA TEMPLATES ===\n${HOOK_FORMULA_BANK.slice(0, 2000)}`);
    // NEW: Prop interaction system for hook slides
    if (PROP_SYSTEM) parts.push(`=== PROP INTERACTION SYSTEM ===\n${PROP_SYSTEM.slice(0, 3000)}`);
  } else if (slideType === 'FORE') {
    if (VISUAL_ACTION_BANK) parts.push(`=== EXPRESSION LIBRARY ===\n${VISUAL_ACTION_BANK.slice(0, 2000)}`);
  } else if (slideType === 'CTA') {
    if (HOOK_SCIENCE) parts.push(`=== CTA SCIENCE ===\n${HOOK_SCIENCE.slice(-2000)}`);
    if (VISUAL_ACTION_BANK) parts.push(`=== EXPRESSION LIBRARY ===\n${VISUAL_ACTION_BANK.slice(0, 1500)}`);
  }

  // NEW: Emotional arc for ALL slide types (intensity affects visual treatment)
  if (EMOTIONAL_ARC) parts.push(`=== EMOTIONAL ARC ===\n${EMOTIONAL_ARC.slice(0, 2000)}`);

  // NEW: Prompt rendering rules — prevents Nano Banana from rendering instruction text
  // This was imported but NEVER used before (dead code fix)
  if (PROMPT_FORMULAS) parts.push(`=== PROMPT RENDERING RULES ===\n${PROMPT_FORMULAS.slice(0, 2500)}`);

  // Always include cinematography specs (lighting, lens, film stock)
  if (CINEMATOGRAPHY_LUT) parts.push(`=== CINEMATOGRAPHY SPECS ===\n${CINEMATOGRAPHY_LUT.slice(0, 2000)}`);

  // Include rebranding rules for context
  if (CAROUSEL_REBRANDING) parts.push(`=== REBRANDING RULES ===\n${CAROUSEL_REBRANDING.slice(0, 1000)}`);

  return parts.length > 0 ? `\nREFERENCE KNOWLEDGE:\n${parts.join('\n\n')}` : '';
}

/**
 * Visual rules per slide type — cinematic specs from carousel prompt plugin
 */
function getVisualRulesForSlideType(
  slideType: string,
  analysis: any,
  slideIndex: number,
  totalSlides: number,
  hookCategoryOverride?: string,
): string {
  const hookCategory = hookCategoryOverride || analysis.hookCategory || 'curiosity_gap';
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

/**
 * WOW Quality Gate — Score prompt against 8 cinematic elements
 * Minimum 6/8 for production quality
 */
function scoreWOWGate(prompt: string): number {
  const lower = prompt.toLowerCase();
  let score = 0;

  // 1. Lighting Drama (pattern + ratio + Kelvin)
  if (/rembrandt|butterfly|split|loop|lighting|ratio\s*\d|kelvin|\d{4}k/i.test(prompt)) score++;

  // 2. Depth Layers (foreground + background + layers)
  if (/foreground|background|depth|layer|mid.?ground|three.*layer/i.test(prompt)) score++;

  // 3. Atmosphere (haze, volumetric, particles, rays)
  if (/haze|volumetric|particle|ray|fog|mist|atmosphere|bokeh/i.test(prompt)) score++;

  // 4. Color Contrast (warm-cool, saturation, tension)
  if (/warm.*cool|cool.*warm|saturation|tension|color.*grade|amber|golden/i.test(prompt)) score++;

  // 5. Emotional Peak (expression keywords)
  if (/eyes|brow|smile|smirk|jaw|lips|gaze|stare|expression|emotion/i.test(prompt)) score++;

  // 6. Camera Intention (lens mm + f/ + angle)
  if (/\d+mm|f\/\d|lens:|close.?up|medium|wide|eye.?level|dutch|angle/i.test(prompt)) score++;

  // 7. Texture Realism (pores, fabric, imperfections)
  if (/pore|fabric|texture|imperfection|grain|weave|crease|stray\s*hair/i.test(prompt)) score++;

  // 8. Cinematic Reference (film stock + grade)
  if (/kodak|portra|fuji|film\s*stock|cinematic|color\s*grade/i.test(prompt)) score++;

  return score;
}

/**
 * Returns list of missing WOW elements for retry feedback
 */
function getMissingWOWElements(prompt: string): string[] {
  const missing: string[] = [];
  if (!/rembrandt|butterfly|split|loop|lighting|ratio\s*\d|kelvin|\d{4}k/i.test(prompt)) missing.push('lighting drama (pattern + ratio + Kelvin)');
  if (!/foreground|background|depth|layer|mid.?ground|three.*layer/i.test(prompt)) missing.push('depth layers (foreground + background)');
  if (!/haze|volumetric|particle|ray|fog|mist|atmosphere|bokeh/i.test(prompt)) missing.push('atmosphere (haze, volumetric, particles)');
  if (!/warm.*cool|cool.*warm|saturation|tension|color.*grade|amber|golden/i.test(prompt)) missing.push('color contrast (warm-cool tension)');
  if (!/eyes|brow|smile|smirk|jaw|lips|gaze|stare|expression|emotion/i.test(prompt)) missing.push('emotional peak (expression keywords)');
  if (!/\d+mm|f\/\d|lens:|close.?up|medium|wide|eye.?level|dutch|angle/i.test(prompt)) missing.push('camera intention (lens mm + angle)');
  if (!/pore|fabric|texture|imperfection|grain|weave|crease|stray\s*hair/i.test(prompt)) missing.push('texture realism (pores, fabric, grain)');
  if (!/kodak|portra|fuji|film\s*stock|cinematic|color\s*grade/i.test(prompt)) missing.push('cinematic reference (film stock + grade)');
  return missing;
}

/**
 * Map slide position to emotional arc beat + intensity
 * Based on plugin's Roller Coaster Pattern
 */
function mapEmotionalArc(slideIndex: number, totalSlides: number, slideType: string): { intensity: number; beat: string } {
  // Fixed types override position-based mapping
  if (slideType === 'HOOK') return { intensity: 6, beat: 'HIGH' };
  if (slideType === 'CTA') return { intensity: 1, beat: 'WARM' };
  if (slideType === 'FORE') return { intensity: 3, beat: 'DIP' };

  // BODY slides: position-based intensity
  const progress = totalSlides > 2 ? slideIndex / (totalSlides - 1) : 0.5;

  // Mini-hook at ~60-70% through
  if (progress >= 0.55 && progress <= 0.75) return { intensity: 5, beat: 'MINI-HOOK' };

  // Climax at ~80%+
  if (progress >= 0.75 && slideIndex < totalSlides - 1) return { intensity: 6, beat: 'CLIMAX' };

  // Progressive build (2→4)
  const buildIntensity = Math.min(2 + Math.floor(progress * 4), 4);
  return { intensity: buildIntensity, beat: buildIntensity >= 4 ? 'BUILD+' : 'BUILD' };
}

/**
 * Suggest 3 hook options based on content category + emotional tone
 * Uses Topic→Hook Category mapping from plugin hook-science.md
 */
function suggestHookOptions(contentCategory: string, emotionalTone: string): Array<{
  rank: string;
  hookCategory: string;
  visualAction: string;
  sampleHeadline: string;
  vibe: string;
  psychology: string;
}> {
  // Topic → Hook Category mapping (from plugin hook-science.md)
  const topicMap: Record<string, { primary: string; secondary: string; action: string }> = {
    tech: { primary: 'speed_value', secondary: 'curiosity_gap', action: 'objek_absurd' },
    beauty: { primary: 'speed_value', secondary: 'visual_shock', action: 'satisfying_process' },
    finance: { primary: 'speed_value', secondary: 'negative_bias', action: 'minum_dramatic' },
    food: { primary: 'visual_shock', secondary: 'relatability', action: 'makan_nyeleneh' },
    fitness: { primary: 'visual_shock', secondary: 'relatability', action: 'frozen_mid_action' },
    lifestyle: { primary: 'relatability', secondary: 'curiosity_gap', action: 'contradiction_pose' },
    business: { primary: 'speed_value', secondary: 'negative_bias', action: 'wrong_context' },
    education: { primary: 'negative_bias', secondary: 'curiosity_gap', action: 'extreme_close_up' },
    health: { primary: 'negative_bias', secondary: 'speed_value', action: 'scale_absurd' },
    travel: { primary: 'visual_shock', secondary: 'curiosity_gap', action: 'wrong_context' },
    entertainment: { primary: 'visual_shock', secondary: 'relatability', action: 'props_overflow' },
    fashion: { primary: 'visual_shock', secondary: 'relatability', action: 'contradiction_pose' },
    productivity: { primary: 'speed_value', secondary: 'curiosity_gap', action: 'objek_absurd' },
    creative: { primary: 'curiosity_gap', secondary: 'visual_shock', action: 'satisfying_process' },
    news: { primary: 'negative_bias', secondary: 'curiosity_gap', action: 'destruction' },
  };

  const mapping = topicMap[contentCategory] || topicMap['lifestyle'];

  // Visual action pairing per hook category
  const hookActions: Record<string, string[]> = {
    visual_shock: ['objek_absurd', 'destruction', 'scale_absurd', 'frozen_mid_action'],
    negative_bias: ['destruction', 'extreme_close_up', 'contradiction_pose', 'mundane_zen'],
    curiosity_gap: ['satisfying_process', 'extreme_close_up', 'objek_absurd', 'wrong_context'],
    relatability: ['contradiction_pose', 'wrong_context', 'props_overflow', 'mundane_zen'],
    speed_value: ['objek_absurd', 'scale_absurd', 'props_overflow', 'extreme_close_up'],
  };

  // Hook psychology descriptions
  const hookPsych: Record<string, string> = {
    visual_shock: '+400% dopamine spike from surprise. Highest attention retention, 85% muted-compatible.',
    negative_bias: 'Loss aversion 2x stronger than gain. Highest save + comment rate.',
    curiosity_gap: 'Information gap drives investigation. High save + mystery revisit.',
    relatability: 'In-group bias + peer recognition. Highest tag + share rate.',
    speed_value: 'Competence trust + utility bias. Highest utility saves, muted-friendly.',
  };

  // Hook vibe descriptions
  const hookVibes: Record<string, string> = {
    visual_shock: 'Extreme pattern interrupt — the viewer does a double-take because something in the image feels impossible or absurd.',
    negative_bias: 'Warning energy — the viewer feels protective urgency, like they need to know what danger they\'re missing.',
    curiosity_gap: 'Mysterious tease — the viewer sees just enough to know there\'s something hidden, and MUST swipe to find out.',
    relatability: 'Mirror recognition — the viewer sees themselves in the image and thinks "gue banget sih ini".',
    speed_value: 'Instant utility — the viewer immediately sees a tool, hack, or shortcut they can use RIGHT NOW.',
  };

  // Sample headlines per category
  const sampleHeadlines: Record<string, string> = {
    visual_shock: 'GILA — Ini yang Terjadi Kalau Lo...',
    negative_bias: 'STOP — Jangan Pernah Lakuin Ini Lagi',
    curiosity_gap: 'Rahasia yang Gak Pernah Dikasih Tau...',
    relatability: 'Kalo Lo Juga Gini, Berarti...',
    speed_value: '5 Tools yang Bikin Kerjaan 10x Lebih Cepat',
  };

  // Wildcard: pick a category NOT in primary/secondary
  const allCategories = ['visual_shock', 'negative_bias', 'curiosity_gap', 'relatability', 'speed_value'];
  const wildcard = allCategories.find(c => c !== mapping.primary && c !== mapping.secondary) || 'visual_shock';

  return [
    {
      rank: 'PRIMARY',
      hookCategory: mapping.primary,
      visualAction: mapping.action,
      sampleHeadline: sampleHeadlines[mapping.primary] || 'GILA — ...',
      vibe: hookVibes[mapping.primary] || '',
      psychology: hookPsych[mapping.primary] || '',
    },
    {
      rank: 'SECONDARY',
      hookCategory: mapping.secondary,
      visualAction: (hookActions[mapping.secondary] || ['objek_absurd'])[0],
      sampleHeadline: sampleHeadlines[mapping.secondary] || 'STOP — ...',
      vibe: hookVibes[mapping.secondary] || '',
      psychology: hookPsych[mapping.secondary] || '',
    },
    {
      rank: 'WILDCARD',
      hookCategory: wildcard,
      visualAction: (hookActions[wildcard] || ['objek_absurd'])[0],
      sampleHeadline: sampleHeadlines[wildcard] || 'Rahasia — ...',
      vibe: hookVibes[wildcard] || '',
      psychology: hookPsych[wildcard] || '',
    },
  ];
}
