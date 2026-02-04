import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGeminiHybrid } from '../_shared/apiKeyRotation.ts';

/**
 * Generate optimized video prompts from image analysis
 *
 * Input:
 * - image_analysis: Analysis from analyze-image function
 * - segment_type: HOOK, FORE, BODY-X, PEAK, CTA, LOOP-END
 * - script_text: Segment script for context
 * - duration_seconds: Segment duration (5s or 10s)
 *
 * Output:
 * - video_prompt: Optimized prompt for Wan 2.5 / Kling 2.5
 * - suggested_motion: Camera movement recommendation
 * - technical_parameters: Shot details (focal length, angle, etc)
 */

interface ImageAnalysis {
  objects: string[];
  style: string;
  lighting: string;
  mood: string;
  color_palette: string;
  composition: string;
  suggested_motion: string;
  technical_details: string;
}

interface VideoPromptResult {
  video_prompt: string;
  negative_prompt: string;
  suggested_motion: string;
  camera_settings: {
    movement: string;
    focal_length: string;
    angle: string;
  };
  duration_note: string;
}

// Camera movement mapping based on segment type
const SEGMENT_CAMERA_MOVEMENTS: Record<string, string[]> = {
  'HOOK': ['smooth dolly push-in', 'slow zoom in', 'static locked-off shot'],
  'FORE': ['static locked-off shot', 'gentle dolly pull-back', 'slow pan right'],
  'BODY': ['tracking shot following subject', 'slow pan left/right', 'orbit shot circling subject'],
  'PEAK': ['smooth dolly push-in', 'dramatic zoom in', 'orbit shot circling subject'],
  'CTA': ['smooth dolly push-in', 'static locked-off shot with focus shift'],
  'LOOP-END': ['gentle dolly pull-back', 'slow zoom out', 'static locked-off shot']
};

// Get camera movement suggestion based on segment type and analysis
function selectCameraMovement(segmentType: string, analysis: ImageAnalysis): string {
  const normalizedType = segmentType.toUpperCase();

  // Get segment-specific movements
  let movements: string[] = ['static locked-off shot']; // Default

  if (normalizedType === 'HOOK' || normalizedType === 'CTA') {
    movements = SEGMENT_CAMERA_MOVEMENTS['HOOK'];
  } else if (normalizedType === 'FORE') {
    movements = SEGMENT_CAMERA_MOVEMENTS['FORE'];
  } else if (normalizedType.startsWith('BODY')) {
    movements = SEGMENT_CAMERA_MOVEMENTS['BODY'];
  } else if (normalizedType === 'PEAK') {
    movements = SEGMENT_CAMERA_MOVEMENTS['PEAK'];
  } else if (normalizedType === 'LOOP-END') {
    movements = SEGMENT_CAMERA_MOVEMENTS['LOOP-END'];
  }

  // If analysis suggests a specific motion, prefer that
  if (analysis.suggested_motion && analysis.suggested_motion.toLowerCase().includes('push')) {
    return 'smooth dolly push-in';
  } else if (analysis.suggested_motion && analysis.suggested_motion.toLowerCase().includes('pull')) {
    return 'gentle dolly pull-back';
  } else if (analysis.suggested_motion && analysis.suggested_motion.toLowerCase().includes('orbit')) {
    return 'orbit shot circling subject';
  } else if (analysis.suggested_motion && analysis.suggested_motion.toLowerCase().includes('pan')) {
    return 'slow pan left/right';
  }

  // Return first option for segment type
  return movements[0];
}

// Generate video prompt using Gemini
async function generatePromptWithGemini(
  supabase: any,
  analysis: ImageAnalysis,
  segmentType: string,
  scriptText: string,
  durationSeconds: number
): Promise<string> {
  const cameraMovement = selectCameraMovement(segmentType, analysis);

  const promptGeneration = `You are a professional cinematographer and prompt engineer for AI video generation.

Based on this image analysis, create an optimized video prompt for ${durationSeconds} seconds of video:

IMAGE ANALYSIS:
- Objects: ${analysis.objects.join(', ')}
- Style: ${analysis.style}
- Lighting: ${analysis.lighting}
- Mood: ${analysis.mood}
- Color: ${analysis.color_palette}
- Composition: ${analysis.composition}

SEGMENT CONTEXT:
- Type: ${segmentType}
- Script: ${scriptText}
- Duration: ${durationSeconds}s
- Suggested Motion: ${cameraMovement}

REQUIREMENTS:
1. Start with the main subject and their action
2. Describe camera movement (${cameraMovement})
3. Include lighting and mood from analysis
4. Keep prompt under 150 words
5. Be specific and technical
6. Focus on continuity from the still image

Generate a single-paragraph video prompt that brings this image to life as ${durationSeconds}-second video clip:`;

  const result = await callGeminiHybrid(supabase, [
    { role: 'user', content: promptGeneration }
  ], {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxTokens: 300
  });

  if (!result.success || !result.content) {
    throw new Error(result.error || 'No prompt generated from Gemini');
  }

  return result.content.trim();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      image_analysis,
      segment_type,
      script_text,
      duration_seconds = 5
    } = await req.json();

    // Validate input
    if (!image_analysis || !segment_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'image_analysis and segment_type are required'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for pool-based key rotation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate video prompt using Gemini (pool-based keys)
    const videoPrompt = await generatePromptWithGemini(
      supabase,
      image_analysis,
      segment_type,
      script_text || '',
      duration_seconds
    );

    // Select camera movement
    const cameraMovement = selectCameraMovement(segment_type, image_analysis);

    // Build negative prompt (common issues to avoid)
    const negativePrompt = [
      'blur', 'distortion', 'low quality', 'pixelated',
      'text overlay', 'watermark', 'logo',
      'duplicate frames', 'glitches', 'artifacts',
      'unnatural movement', 'teleportation', 'morphing faces'
    ].join(', ');

    // Extract camera settings from analysis
    const cameraSettings = {
      movement: cameraMovement,
      focal_length: image_analysis.composition.toLowerCase().includes('close') ? '85mm' : '50mm',
      angle: image_analysis.composition.toLowerCase().includes('low')
        ? 'low angle'
        : image_analysis.composition.toLowerCase().includes('high')
        ? 'high angle'
        : 'eye level'
    };

    // Duration-specific notes
    const durationNote = duration_seconds <= 5
      ? 'Short duration - focus on single smooth action'
      : 'Standard duration - can include multiple subtle movements';

    const result: VideoPromptResult = {
      video_prompt: videoPrompt,
      negative_prompt: negativePrompt,
      suggested_motion: cameraMovement,
      camera_settings: cameraSettings,
      duration_note: durationNote
    };

    console.log('[GENERATE_VIDEO_PROMPT] Success:', {
      segment_type,
      duration: duration_seconds,
      prompt_length: videoPrompt.length,
      movement: cameraMovement
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[GENERATE_VIDEO_PROMPT] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'VIDEO_PROMPT_ERROR',
          message: error.message || 'Failed to generate video prompt'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
