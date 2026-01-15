/**
 * Generate Music Edge Function
 *
 * Uses Minimax Music v2 (fal.ai) to generate background music from prompts.
 * This is used for adding BGM to combined videos.
 *
 * Uses queue-based approach to avoid Edge Function timeout.
 *
 * Endpoint: POST /functions/v1/generate-music
 *
 * Request:
 * {
 *   prompt: string,          // Music style description (10-300 chars)
 *   lyrics_prompt?: string,  // Optional lyrics with structure tags (10-3000 chars)
 *   duration_seconds?: number // Optional, for reference only
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     music_url: string,
 *     duration_seconds: number,
 *     model: string
 *   }
 * }
 */

import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// Types
// ============================================================================

interface MusicRequest {
  prompt: string;
  lyrics_prompt?: string;
  duration_seconds?: number;
}

interface MusicResponse {
  success: boolean;
  data?: {
    music_url: string;
    duration_seconds: number;
    model: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

// Use queue endpoint for long-running tasks
const FAL_QUEUE_ENDPOINT = 'https://queue.fal.run/fal-ai/minimax-music/v2';
const MODEL_NAME = 'minimax-music-v2';

// Validation limits from Minimax Music v2 API
const PROMPT_MIN_LENGTH = 10;
const PROMPT_MAX_LENGTH = 300;
const LYRICS_MIN_LENGTH = 10;
const LYRICS_MAX_LENGTH = 3000;

// Polling settings
const POLL_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 90;  // 90 * 2s = 180 seconds max wait

// ============================================================================
// Helper: Poll for completion
// ============================================================================

async function pollForResult(
  statusUrl: string,
  falApiKey: string
): Promise<any> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${falApiKey}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[GENERATE_MUSIC] Poll attempt ${attempt + 1}: status=${data.status}`);

    if (data.status === 'COMPLETED') {
      // fal.ai queue returns metadata with response_url when COMPLETED
      // We need to fetch response_url to get the actual result with audio
      if (data.response_url) {
        console.log(`[GENERATE_MUSIC] Fetching result from response_url...`);
        const resultResponse = await fetch(data.response_url, {
          headers: {
            'Authorization': `Key ${falApiKey}`,
          }
        });

        if (!resultResponse.ok) {
          throw new Error(`Failed to fetch result: ${resultResponse.status}`);
        }

        const resultData = await resultResponse.json();
        console.log(`[GENERATE_MUSIC] Result data keys: ${Object.keys(resultData).join(', ')}`);
        return resultData;
      }

      // If no response_url, data might already contain the result
      return data;
    }

    if (data.status === 'FAILED') {
      throw new Error(data.error || 'Music generation failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Music generation timed out');
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: MusicRequest = await req.json();
    const { prompt, lyrics_prompt, duration_seconds } = body;

    console.log(`[GENERATE_MUSIC] Request received - Prompt length: ${prompt?.length || 0}, Lyrics length: ${lyrics_prompt?.length || 0}`);

    // ========================================================================
    // Input Validation
    // ========================================================================

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'prompt is required and must be a string'
          }
        } as MusicResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < PROMPT_MIN_LENGTH) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROMPT_TOO_SHORT',
            message: `prompt must be at least ${PROMPT_MIN_LENGTH} characters`
          }
        } as MusicResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trimmedPrompt.length > PROMPT_MAX_LENGTH) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROMPT_TOO_LONG',
            message: `prompt must be at most ${PROMPT_MAX_LENGTH} characters`
          }
        } as MusicResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate lyrics_prompt if provided
    let trimmedLyrics: string | undefined;
    if (lyrics_prompt) {
      if (typeof lyrics_prompt !== 'string') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'lyrics_prompt must be a string'
            }
          } as MusicResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      trimmedLyrics = lyrics_prompt.trim();
      if (trimmedLyrics.length > 0 && trimmedLyrics.length < LYRICS_MIN_LENGTH) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'LYRICS_TOO_SHORT',
              message: `lyrics_prompt must be at least ${LYRICS_MIN_LENGTH} characters`
            }
          } as MusicResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (trimmedLyrics.length > LYRICS_MAX_LENGTH) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'LYRICS_TOO_LONG',
              message: `lyrics_prompt must be at most ${LYRICS_MAX_LENGTH} characters`
            }
          } as MusicResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========================================================================
    // Get API Key
    // ========================================================================

    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      console.error('[GENERATE_MUSIC] FAL_AI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'Music generation service not configured'
          }
        } as MusicResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // Build Request Body
    // ========================================================================

    const requestBody: any = {
      prompt: trimmedPrompt,
    };

    // Only add lyrics_prompt if provided
    if (trimmedLyrics && trimmedLyrics.length >= LYRICS_MIN_LENGTH) {
      requestBody.lyrics_prompt = trimmedLyrics;
    }

    console.log(`[GENERATE_MUSIC] Submitting to fal.ai queue...`);
    console.log(`[GENERATE_MUSIC] Prompt: "${trimmedPrompt.substring(0, 50)}..."`);

    // ========================================================================
    // Submit to Queue
    // ========================================================================

    const startTime = Date.now();

    const submitResponse = await fetch(FAL_QUEUE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[GENERATE_MUSIC] Queue submit error: ${submitResponse.status} - ${errorText}`);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'QUEUE_ERROR',
            message: `Failed to submit music generation: ${submitResponse.status}`
          }
        } as MusicResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.request_id;
    const statusUrl = submitData.status_url || submitData.response_url ||
                      `https://queue.fal.run/fal-ai/minimax-music/v2/requests/${requestId}/status`;

    console.log(`[GENERATE_MUSIC] Queued! request_id=${requestId}`);

    // ========================================================================
    // Poll for Result
    // ========================================================================

    const result = await pollForResult(statusUrl, falApiKey);
    const elapsed = Date.now() - startTime;

    console.log(`[GENERATE_MUSIC] Completed in ${elapsed}ms`);

    // ========================================================================
    // Extract Music URL
    // ========================================================================

    // Minimax Music v2 returns: { audio: { url: "..." } } or similar
    const musicUrl = result.response?.audio?.url ||
                     result.audio?.url ||
                     result.response?.url ||
                     result.url ||
                     result.music_url;

    if (!musicUrl) {
      console.error('[GENERATE_MUSIC] No music URL in response:', JSON.stringify(result));
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_OUTPUT',
            message: 'Music generation completed but no audio URL returned'
          }
        } as MusicResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GENERATE_MUSIC] Success! Music URL: ${musicUrl.substring(0, 60)}...`);

    // ========================================================================
    // Return Success Response
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          music_url: musicUrl,
          duration_seconds: duration_seconds || 30,
          model: MODEL_NAME
        }
      } as MusicResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[GENERATE_MUSIC] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'MUSIC_ERROR',
          message: error.message || 'Failed to generate music'
        }
      } as MusicResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
