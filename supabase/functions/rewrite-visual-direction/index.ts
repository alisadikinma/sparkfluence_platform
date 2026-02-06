import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { callOpenRouterHybrid, callGeminiHybrid } from '../_shared/apiKeyRotation.ts'
import { handleCors, successResponse, errorResponse } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { sanitizePromptInput } from '../_shared/inputSanitizer.ts'

/**
 * rewrite-visual-direction
 *
 * Rewrites a segment's visual direction when the user applies options
 * (additional notes, creator face, layout, reference image).
 *
 * Input:  original VD + user options
 * Output: rewritten structured VD (6 categories)
 */

const LAYOUT_DESCRIPTIONS: Record<string, string> = {
  'full': 'Full-frame single subject, no split — subject fills the entire frame',
  'split-60-40': 'Split composition: 60% main content (left) + 40% creator (right)',
  'split-50-50': 'Equal split: 50% main content + 50% creator side by side',
  'pip': 'Picture-in-picture: main content full frame with small creator overlay in corner',
  'creator-center': 'Creator centered in frame with content/graphics around them',
}

function buildRewritePrompt(params: {
  originalVD: string;
  scriptText: string;
  shotType: string;
  topic: string;
  additionalNotes: string;
  includeCreatorFace: boolean;
  layout: string;
  referenceImageDescription: string;
  language: string;
}): string {
  const {
    originalVD,
    scriptText,
    shotType,
    topic,
    additionalNotes,
    includeCreatorFace,
    layout,
    referenceImageDescription,
    language,
  } = params;

  const layoutDesc = LAYOUT_DESCRIPTIONS[layout] || LAYOUT_DESCRIPTIONS['full'];

  // Build context about user options
  const optionLines: string[] = [];

  if (additionalNotes) {
    optionLines.push(`- ADDITIONAL NOTES from user: "${additionalNotes}"`);
  }
  if (includeCreatorFace) {
    optionLines.push(`- INCLUDE CREATOR FACE: Yes — the creator's face will be composited into this shot`);
    optionLines.push(`- LAYOUT: ${layout} — ${layoutDesc}`);
  }
  if (referenceImageDescription) {
    optionLines.push(`- REFERENCE IMAGE: ${referenceImageDescription}`);
  }

  const optionsBlock = optionLines.length > 0
    ? `\n## User Options to Incorporate\n${optionLines.join('\n')}\n`
    : '\n## User Options\nNo additional options — just improve the visual direction quality.\n';

  return `You are an expert cinematographer and visual director for short-form viral content (TikTok, Reels, Shorts).

## Task
Rewrite the visual direction for a ${shotType} segment, incorporating the user's options while maintaining cinematic quality.

## Original Visual Direction
${originalVD}

## Segment Context
- Topic: ${topic}
- Shot type: ${shotType}
- Script text: "${scriptText}"
- Language: ${language}
${optionsBlock}
## Output Format
You MUST output EXACTLY this pipe-separated format with all 6 categories:

Scene: [setting/location/props/subject action] | Camera: [shot type, lens, angle, movement] | Lighting: [key/fill/rim, color temp, contrast ratio] | Color: [grade, palette, saturation] | Mood: [atmosphere, energy, emotional tone] | FX: [text overlay, lens flare, particles, bokeh, or "none"]

## Rules
1. Keep total length 50-80 words across all 6 categories
2. Every category MUST have content (use "standard" or "none" if truly not applicable for FX)
3. ${includeCreatorFace ? `Since creator face is included with ${layout} layout: adjust Scene to describe the composition (e.g. "split frame — left: product close-up, right: creator reacting")` : 'No creator face — describe the visual scene as standalone'}
4. ${additionalNotes ? 'Incorporate the user\'s additional notes naturally into the relevant categories' : 'Maintain the original creative intent'}
5. ${referenceImageDescription ? 'Match the visual style/setting described in the reference image' : 'Use cinematic defaults appropriate for viral content'}
6. Do NOT wrap in quotes, code blocks, or add any text outside the structured format
7. Output ONLY the single line in the format above — nothing else`;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Auth check
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  try {
    // Parse request body
    const body = await req.json();

    const {
      visual_direction,
      script_text,
      shot_type,
      topic,
      additional_notes,
      include_creator_face,
      layout,
      reference_image_description,
      language,
    } = body;

    // Validate required fields
    if (!visual_direction || !script_text || !shot_type) {
      return errorResponse(
        'MISSING_FIELDS',
        'visual_direction, script_text, and shot_type are required',
        400,
        req
      );
    }

    // Sanitize inputs
    const sanitizedVD = sanitizePromptInput(visual_direction, 2000);
    const sanitizedScript = sanitizePromptInput(script_text, 1000);
    const sanitizedNotes = sanitizePromptInput(additional_notes, 500);
    const sanitizedTopic = sanitizePromptInput(topic, 200);
    const sanitizedRefDesc = sanitizePromptInput(reference_image_description, 500);

    // Build prompt
    const prompt = buildRewritePrompt({
      originalVD: sanitizedVD,
      scriptText: sanitizedScript,
      shotType: shot_type || 'B-ROLL',
      topic: sanitizedTopic || 'General',
      additionalNotes: sanitizedNotes,
      includeCreatorFace: !!include_creator_face,
      layout: layout || 'full',
      referenceImageDescription: sanitizedRefDesc,
      language: language || 'indonesian',
    });

    // Create Supabase client for key rotation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const messages = [
      { role: 'user', content: prompt }
    ];

    // Try OpenRouter first (primary), then Gemini (fallback)
    let rewrittenVD: string | null = null;

    console.log('[rewrite-vd] Calling OpenRouter...');
    const orResult = await callOpenRouterHybrid(supabase, messages, {
      model: 'google/gemini-2.5-flash-lite',
      temperature: 0.7,
      maxTokens: 512,
    });

    if (!orResult.error && orResult.data?.choices?.[0]?.message?.content) {
      rewrittenVD = orResult.data.choices[0].message.content.trim();
      console.log(`[rewrite-vd] OpenRouter success (${orResult.source})`);
    } else {
      console.warn('[rewrite-vd] OpenRouter failed, trying Gemini fallback...');
      const geminiResult = await callGeminiHybrid(supabase, messages, {
        model: 'gemini-2.0-flash-lite',
        temperature: 0.7,
        maxTokens: 512,
      });

      if (geminiResult.success && geminiResult.content) {
        rewrittenVD = geminiResult.content.trim();
        console.log(`[rewrite-vd] Gemini fallback success (${geminiResult.source})`);
      } else {
        console.error('[rewrite-vd] Both LLMs failed:', orResult.error, geminiResult.error);
        return errorResponse(
          'LLM_FAILED',
          'Failed to rewrite visual direction — both OpenRouter and Gemini unavailable',
          502,
          req
        );
      }
    }

    // Clean up LLM output (remove code blocks, quotes, extra whitespace)
    rewrittenVD = rewrittenVD
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    // Parse structured VD from the rewritten text
    const structured = parseStructuredVD(rewrittenVD);

    return successResponse({
      visual_direction: rewrittenVD,
      structured,
    }, req);

  } catch (err: any) {
    console.error('[rewrite-vd] Error:', err);
    return errorResponse(
      'INTERNAL_ERROR',
      err.message || 'Internal server error',
      500,
      req
    );
  }
});

/**
 * Parse structured VD from pipe-separated format
 * e.g. "Scene: ... | Camera: ... | Lighting: ... | Color: ... | Mood: ... | FX: ..."
 */
function parseStructuredVD(vdText: string): {
  scene: string;
  camera: string;
  lighting: string;
  color: string;
  mood: string;
  fx: string;
} {
  const result = { scene: '', camera: '', lighting: '', color: '', mood: '', fx: '' };

  // Strategy 1: labeled sections with pipe separator
  const labelPattern = /\b(scene|camera|lighting|color|mood|atmosphere|fx|effects?)\s*[:–—-]\s*/gi;
  const matches = [...vdText.matchAll(labelPattern)];

  if (matches.length >= 3) {
    for (let i = 0; i < matches.length; i++) {
      const label = matches[i][1].toLowerCase();
      const startPos = matches[i].index! + matches[i][0].length;
      const endPos = i + 1 < matches.length ? matches[i + 1].index! : vdText.length;
      const value = vdText.slice(startPos, endPos).replace(/\s*\|\s*$/, '').trim();

      if (label === 'scene') result.scene = value;
      else if (label === 'camera') result.camera = value;
      else if (label === 'lighting') result.lighting = value;
      else if (label === 'color') result.color = value;
      else if (label === 'mood' || label === 'atmosphere') result.mood = value;
      else if (label === 'fx' || label === 'effects' || label === 'effect') result.fx = value;
    }
  } else {
    // Strategy 2: put everything in scene if unstructured
    result.scene = vdText.trim();
  }

  return result;
}
