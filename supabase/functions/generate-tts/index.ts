import { corsHeaders } from '../_shared/cors.ts';
import { TTS_MODELS, getTTSModel, type TTSModelConfig } from '../_shared/config/aiModels.ts';

/**
 * Generate TTS audio using Chatterbox Turbo
 *
 * Input:
 * - text: Script text to synthesize
 * - voice: Preset voice ID (optional, default: 'lucy')
 * - audio_url: Custom voice cloning URL (optional, overrides voice)
 * - temperature: Generation temperature (optional, default: 0.8)
 * - seed: Random seed for reproducibility (optional)
 * - model: TTS model key (optional, default: 'chatterbox-turbo')
 *
 * Output:
 * - audio_url: URL to generated audio file
 * - duration: Estimated audio duration in seconds
 */

interface TTSRequest {
  text: string;
  voice?: string;
  audio_url?: string;
  temperature?: number;
  seed?: number;
  model?: string;
}

interface TTSResponse {
  success: boolean;
  data?: {
    audio_url: string;
    duration?: number;
    model: string;
    voice?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: TTSRequest = await req.json();
    const { text, voice = 'lucy', audio_url, temperature = 0.8, seed, model = 'chatterbox-turbo' } = body;

    // Validate input
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'text is required and cannot be empty'
          }
        } as TTSResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get model config
    const modelConfig = getTTSModel(model);
    if (!modelConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_MODEL',
            message: `TTS model '${model}' not found`
          }
        } as TTSResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!modelConfig.enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MODEL_DISABLED',
            message: `TTS model '${model}' is disabled`
          }
        } as TTSResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check text length
    if (text.length > modelConfig.maxTextLength) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'TEXT_TOO_LONG',
            message: `Text exceeds max length of ${modelConfig.maxTextLength} characters (got ${text.length})`
          }
        } as TTSResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY not configured');
    }

    // Build request body
    const requestBody: any = {
      text: text.trim(),
    };

    // Add voice (custom audio_url takes precedence)
    if (audio_url) {
      requestBody.audio_url = audio_url;
    } else {
      // Validate preset voice
      if (!modelConfig.presetVoices[voice]) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_VOICE',
              message: `Voice '${voice}' not found. Available: ${Object.keys(modelConfig.presetVoices).join(', ')}`
            }
          } as TTSResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      requestBody.voice = voice;
    }

    // Add optional parameters
    if (temperature !== undefined) {
      // Clamp temperature to valid range
      const clampedTemp = Math.max(
        modelConfig.temperatureRange.min,
        Math.min(modelConfig.temperatureRange.max, temperature)
      );
      requestBody.temperature = clampedTemp;
    }

    if (seed !== undefined && modelConfig.supportsSeed) {
      requestBody.seed = seed;
    }

    console.log(`[GENERATE_TTS] Model: ${model}, Voice: ${audio_url ? 'custom' : voice}, Text length: ${text.length}`);

    // Call fal.ai API (sync endpoint)
    const response = await fetch(modelConfig.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE_TTS] API error: ${response.status} - ${errorText}`);
      throw new Error(`fal.ai TTS error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract audio URL
    const audioUrl = data.audio?.url || data.audio;
    if (!audioUrl) {
      throw new Error('No audio URL in response');
    }

    // Estimate duration (rough estimate: ~150 words per minute)
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60);

    console.log(`[GENERATE_TTS] ✅ Success: ${audioUrl}, estimated ${estimatedDuration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          audio_url: audioUrl,
          duration: estimatedDuration,
          model,
          voice: audio_url ? 'custom' : voice
        }
      } as TTSResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[GENERATE_TTS] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'TTS_ERROR',
          message: error.message || 'Failed to generate TTS audio'
        }
      } as TTSResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
