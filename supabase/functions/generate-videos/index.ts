import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ============================================================================
// CENTRALIZED AI MODEL CONFIG (2026)
// All model specs in one place - no code changes needed when adding new models
// ============================================================================
import {
  VIDEO_MODELS,
  getVideoModel,
  getAspectRatioApiValue,
  getClosestDuration,
  getMaxDialogueWords,
  buildVideoFormData,
  type VideoModelKey,
  type AspectRatio,
} from '../_shared/config/aiModels.ts'

// Legacy imports for prompt building (camera movement, emotion, etc.)
import {
  getCameraMovement,
  getEmotionMotion,
  getTransition,
  buildGrokCreatorPrompt,
  buildGrokBrollPrompt,
} from '../_shared/prompts/cinematicVideoKnowledge.ts'

// Import Voice & Face Anchor functions (2026 - Sora 2 Consistency + Enhanced Audio)
import {
  generateFaceAnchor,
  getCreatorAudioDirective,
  getBRollAudioDirective,
  getLanguageLabel,
  detectBRollCategory,
  type VoiceCharacterInfo,
} from '../_shared/prompts/audioDirective.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
}

// ============================================================================
// SPEECH RATE CONFIG PER LANGUAGE (Words Per Minute)
// Indonesian: slower due to multi-syllabic words
// Hindi: slower due to complex sentence structure
// English: baseline
// ============================================================================
const SPEECH_RATES: Record<string, number> = {
  indonesian: 130, // WPM - slower, multi-syllabic
  hindi: 125,      // WPM - complex sentences
  english: 150,    // WPM - baseline
  spanish: 145,    // WPM - moderate
}

// Safety margin (80% of theoretical max to account for pauses/emphasis)
const SPEECH_SAFETY_MARGIN = 0.80

/**
 * Calculate max words for a given duration and language
 * More accurate than fixed limits per duration
 */
function calculateMaxWords(durationSeconds: number, language: string): number {
  const wpm = SPEECH_RATES[language.toLowerCase()] || SPEECH_RATES.english
  const wordsPerSecond = wpm / 60
  const theoreticalMax = Math.floor(durationSeconds * wordsPerSecond)
  return Math.floor(theoreticalMax * SPEECH_SAFETY_MARGIN)
}

/**
 * Truncate script to fit within max words while preserving meaning
 * Prioritizes keeping complete sentences
 */
function truncateScript(scriptText: string, maxWords: number): { truncated: string; wasModified: boolean; originalWords: number } {
  const words = scriptText.trim().split(/\s+/).filter(w => w.length > 0)
  const originalWords = words.length
  
  if (words.length <= maxWords) {
    return { truncated: scriptText, wasModified: false, originalWords }
  }
  
  // Take first maxWords words
  let truncated = words.slice(0, maxWords).join(' ')
  
  // Try to end at a sentence boundary (. ! ?)
  const lastPunctuation = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )
  
  // If we found a sentence boundary in the last 30% of text, use it
  if (lastPunctuation > truncated.length * 0.7) {
    truncated = truncated.substring(0, lastPunctuation + 1)
  }
  
  return { truncated, wasModified: true, originalWords }
}

// ============================================================================
// SAFE DURATION PARSER - Handles null, undefined, NaN, invalid values
// ============================================================================
function safeParseDuration(value: any, fallback: number = 8): number {
  // Handle null, undefined
  if (value === null || value === undefined) return fallback
  
  // Handle string numbers
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed > 0) return parsed
    return fallback
  }
  
  // Handle numbers
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    return value
  }
  
  return fallback
}

// Helper: Validate dialogue length for video model
function validateDialogueLength(scriptText: string, platform: VideoModelKey, duration?: number, language?: string): { 
  valid: boolean; 
  wordCount: number; 
  maxWords: number;
  languageAdjusted: boolean;
} {
  const model = VIDEO_MODELS[platform]
  if (!model) return { valid: true, wordCount: 0, maxWords: 0, languageAdjusted: false }
  
  const wordCount = scriptText.trim().split(/\s+/).filter(w => w.length > 0).length
  const actualDuration = duration || model.defaultDuration
  
  // Use language-aware calculation if language provided
  let maxWords: number
  let languageAdjusted = false
  
  if (language && language !== 'english') {
    maxWords = calculateMaxWords(actualDuration, language)
    languageAdjusted = true
  } else {
    // Fallback to config-based limits
    maxWords = getMaxDialogueWords(model, actualDuration)
  }
  
  return {
    valid: wordCount <= maxWords,
    wordCount,
    maxWords,
    languageAdjusted
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const requestBody = await req.json()
    const mode = requestBody.mode || 'legacy'

    // ========================================================================
    // MODE: PREVIEW_PROMPTS - Generate prompts without calling API
    // ========================================================================
    if (mode === 'preview_prompts') {
      return await handlePreviewPrompts(requestBody)
    }

    // ========================================================================
    // MODE: CREATE_JOBS - Create job records and return immediately
    // ========================================================================
    if (mode === 'create_jobs') {
      return await handleCreateJobs(supabase, requestBody)
    }

    // ========================================================================
    // MODE: PROCESS_SINGLE - Process one job by ID (submit to VEO)
    // ========================================================================
    if (mode === 'process_single') {
      return await handleProcessSingle(supabase, requestBody)
    }

    // ========================================================================
    // MODE: CHECK_AND_UPDATE - Check VEO status and update DB
    // ========================================================================
    if (mode === 'check_and_update') {
      return await handleCheckAndUpdate(supabase, requestBody)
    }

    // ========================================================================
    // MODE: CHECK_STATUS - Get status of all jobs for a session
    // ========================================================================
    if (mode === 'check_status') {
      return await handleCheckStatus(supabase, requestBody)
    }

    // ========================================================================
    // MODE: LEGACY - Original synchronous processing (backward compatible)
    // ========================================================================
    return await handleLegacyMode(supabase, requestBody)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[VIDEO-GEN] Fatal error:', errorMessage)
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'API_ERROR', message: errorMessage }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// FAL.AI HELPER FUNCTIONS (Queue-based API)
// ============================================================================

/**
 * Generate TTS audio for WAN 2.5 video model using Chatterbox Turbo
 * Used for voice cloning integration with wan-25-preview
 *
 * @param scriptText - Text to synthesize
 * @param voiceReferenceUrl - User's voice reference URL for cloning (optional)
 * @param falApiKey - fal.ai API key
 * @returns Audio URL or null if TTS fails/skipped
 */
async function generateTTSForWan(
  scriptText: string,
  voiceReferenceUrl: string | null,
  falApiKey: string
): Promise<string | null> {
  // Skip if no script text
  if (!scriptText || scriptText.trim().length === 0) {
    console.log('[TTS_WAN] Skipping - no script text')
    return null
  }

  console.log(`[TTS_WAN] Generating TTS for script: "${scriptText.substring(0, 50)}..."`)
  console.log(`[TTS_WAN] Voice reference: ${voiceReferenceUrl ? 'custom' : 'preset (lucy)'}`)

  const requestBody: any = {
    text: scriptText.trim(),
    temperature: 0.8
  }

  // Use voice cloning if user has reference, otherwise use preset voice
  if (voiceReferenceUrl) {
    requestBody.audio_url = voiceReferenceUrl
    console.log('[TTS_WAN] Using voice cloning with user reference')
  } else {
    requestBody.voice = 'lucy' // Default preset voice
    console.log('[TTS_WAN] Using preset voice: lucy')
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/chatterbox/text-to-speech/turbo', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[TTS_WAN] Failed: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    const audioUrl = data.audio?.url || null

    if (audioUrl) {
      console.log(`[TTS_WAN] ✅ Generated audio: ${audioUrl.substring(0, 60)}...`)
    } else {
      console.warn('[TTS_WAN] Response missing audio URL')
    }

    return audioUrl
  } catch (err: any) {
    console.error('[TTS_WAN] Error:', err.message || err)
    return null
  }
}

/**
 * WAN 2.5 specific options passed from frontend
 */
interface Wan25Options {
  resolution?: '480p' | '720p' | '1080p';
  seed?: number | null;
  negativePrompt?: string | null;
  duration?: '5' | '10';
}

/**
 * Submit video generation job to fal.ai queue
 * Returns request_id for polling
 *
 * @param audioUrl - Optional TTS audio URL for WAN 2.5 voice integration
 * @param wan25Options - Optional WAN 2.5 specific settings
 */
async function submitToFalQueue(
  modelSpecs: any,
  videoPrompt: string,
  imageUrl: string,
  duration: number,
  falApiKey: string,
  audioUrl?: string | null,
  wan25Options?: Wan25Options
): Promise<{ request_id: string; status_url: string }> {
  const endpoint = modelSpecs.endpoint // e.g., https://queue.fal.run/fal-ai/wan-25-preview/image-to-video

  // Build request body based on model
  const requestBody: any = {
    prompt: videoPrompt,
    image_url: imageUrl,
  }

  // Duration handling (BOTH models support duration parameter)
  if (modelSpecs.key === 'wan-2.5' || modelSpecs.key === 'kling-2.5') {
    // Use WAN 2.5 duration from options if provided, otherwise use segment duration
    const effectiveDuration = (modelSpecs.key === 'wan-2.5' && wan25Options?.duration)
      ? wan25Options.duration
      : String(duration)
    requestBody.duration = effectiveDuration
    console.log(`[FAL_SUBMIT] Duration: ${effectiveDuration}s`)
  }

  // WAN 2.5 audio support: Add TTS audio URL for voice integration
  if (modelSpecs.key === 'wan-2.5' && audioUrl) {
    requestBody.audio_url = audioUrl
    console.log(`[FAL_SUBMIT] Added audio_url for voice integration`)
  }

  // WAN 2.5 specific options: resolution, seed, negative_prompt
  if (modelSpecs.key === 'wan-2.5' && wan25Options) {
    // Resolution mapping for WAN 2.5
    if (wan25Options.resolution) {
      const resolutionMap: Record<string, string> = {
        '480p': '480p',
        '720p': '720p',
        '1080p': '1080p'
      }
      requestBody.resolution = resolutionMap[wan25Options.resolution] || '720p'
      console.log(`[FAL_SUBMIT] Resolution: ${requestBody.resolution}`)
    }

    // Seed for consistency across segments
    if (wan25Options.seed !== null && wan25Options.seed !== undefined) {
      requestBody.seed = wan25Options.seed
      console.log(`[FAL_SUBMIT] Seed: ${wan25Options.seed}`)
    }

    // Negative prompt
    if (wan25Options.negativePrompt) {
      requestBody.negative_prompt = wan25Options.negativePrompt
      console.log(`[FAL_SUBMIT] Negative prompt: ${wan25Options.negativePrompt.substring(0, 30)}...`)
    }
  }

  console.log(`[FAL_SUBMIT] Endpoint: ${endpoint}, Duration: ${duration}s, Model: ${modelSpecs.key}, Audio: ${audioUrl ? 'yes' : 'no'}`)

  // Submit to queue
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`fal.ai queue submit failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // fal.ai returns: { request_id: "...", status: "...", response_url: "..." }
  if (!data.request_id) {
    throw new Error('fal.ai did not return request_id')
  }

  console.log(`[FAL_SUBMIT] ✅ Queued with request_id: ${data.request_id}`)

  return {
    request_id: data.request_id,
    status_url: data.response_url || data.status_url || `${endpoint}/requests/${data.request_id}`
  }
}

/**
 * Poll fal.ai status endpoint
 * Returns: { status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED', video_url?: string, error?: string }
 */
async function pollFalStatus(
  statusUrl: string,
  falApiKey: string
): Promise<{ status: string; video_url?: string; error?: string; logs?: any }> {
  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Key ${falApiKey}`,
    }
  })

  if (!response.ok) {
    throw new Error(`fal.ai status poll failed: ${response.status}`)
  }

  const data = await response.json()

  // fal.ai response format:
  // { status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED", response: { video: { url: "..." } } }

  if (data.status === 'COMPLETED' && data.response?.video?.url) {
    return {
      status: 'COMPLETED',
      video_url: data.response.video.url
    }
  }

  if (data.status === 'FAILED' || data.error) {
    return {
      status: 'FAILED',
      error: data.error?.message || 'Video generation failed'
    }
  }

  // Still processing
  return {
    status: data.status || 'IN_PROGRESS'
  }
}

// ============================================================================
// MODE HANDLERS
// ============================================================================

async function handlePreviewPrompts(requestBody: any) {
  const { 
    segments, 
    topic = '',
    language = 'indonesian',
    aspect_ratio = '9:16',
    environment = 'studio',
    preferred_platform = 'auto', // 'auto' | 'sora2' | 'veo31'
    // ========================================================================
    // NEW: Avatar/Face selection from UI (2026)
    // ========================================================================
    avatar_selection = 'no_avatar',
    profile_image_url = null,
    creator_gender = 'male',
    character_description = ''
  } = requestBody

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing or invalid segments array' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[PREVIEW_PROMPTS] Generating prompts for ${segments.length} segments, preferred_platform: ${preferred_platform}`)
  console.log(`[PREVIEW_PROMPTS] Avatar: ${avatar_selection}, hasProfileImage: ${avatar_selection !== 'no_avatar'}`)

  // Determine if profile image is available
  const hasProfileImage = avatar_selection !== 'no_avatar' && profile_image_url !== null

  // Map user selection to actual platform key
  const platformMap: Record<string, VideoModelKey> = {
    'veo-3.1-fast-hd':  'veo-3.1-fast-hd',  // Fast HD 720p $0.015 (DEFAULT)
    'veo-3.1-fast-fhd': 'veo-3.1-fast-fhd', // Fast FHD 1080p $0.015
    'veo-3.1-hd':       'veo-3.1-hd',       // Premium HD 720p $0.50
    'veo-3.1-fhd':      'veo-3.1-fhd',      // Premium FHD 1080p $0.50
    'grok-3':           'grok-3',            // Grok 3 Aurora 6/10/15s $0.015
    // Legacy aliases
    'veo-3.1-fast':     'veo-3.1-fast-hd',
    'veo31':            'veo-3.1-fast-hd',
    'wan-25':           'wan-2.5',
    'sora2':            'sora-2',
    'sora2-hd':         'sora-2-pro-hd',
    'sora2-pro':        'sora-2-pro',
    'auto':             'veo-3.1-fast-hd',
  }
  const selectedPlatformForAll = platformMap[preferred_platform] || 'veo-3.1-fast-hd'

  const prompts: Array<{
    segment_id: string
    segment_number: number
    segment_type: string
    shot_type: string
    platform: VideoModelKey
    platform_name: string
    duration: number
    max_duration: number
    resolution: string
    has_dialogue: boolean
    dialogue_preview: string
    dialogue_validation: { valid: boolean; wordCount: number; maxWords: number; languageAdjusted: boolean }
    prompt: string
    image_url: string | null
  }> = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentId = segment.segment_id || segment.id || String(i + 1)
    const segmentType = segment.segment_type || segment.type || segment.element || `SEGMENT_${i + 1}`
    const scriptText = segment.script_text || segment.script || ''
    // DURATION FIX: Use safe parser to handle null/undefined/NaN
    const duration = safeParseDuration(segment.duration_seconds || segment.duration, 8)
    const emotion = segment.emotion || 'authority'
    const shotType = segment.shot_type || 'B-ROLL'
    const imageUrl = segment.image_url || segment.imageUrl || null
    const hasDialogue = scriptText.length > 0

    // Determine platform - ALL segments use the same platform for consistent quality
    const selectedPlatform: VideoModelKey = selectedPlatformForAll

    // SAFETY: Ensure modelSpecs exists
    const modelSpecs = VIDEO_MODELS[selectedPlatform]
    if (!modelSpecs) {
      console.error(`[PREVIEW_PROMPTS] ❌ Unknown platform: ${selectedPlatform}, falling back to veo-3.1-fast`)
    }
    const safeModelSpecs = modelSpecs || VIDEO_MODELS['veo-3.1-fast']

    // Calculate actual duration (clamped to model max)
    const actualDuration = Math.min(duration, safeModelSpecs.maxDuration)
    
    // Build the cinematic video prompt with anchor params
    const videoPrompt = buildCinematicVideoPrompt({
      segment: {
        ...segment,
        shot_type: shotType,
        character_name: segment.character_name || 'Creator',
        transition: segment.transition || 'hold'
      },
      segmentType,
      emotion,
      scriptText,
      language,
      aspectRatio: aspect_ratio as '9:16' | '16:9',
      environment,
      platform: selectedPlatform,
      duration: actualDuration,
      topic, // Pass topic for contextual B-ROLL
      // ========================================================================
      // NEW: Face Anchor params (2026)
      // ========================================================================
      hasProfileImage,
      profileImageUrl: profile_image_url || '',
      creatorGender: creator_gender as 'male' | 'female',
      characterDescription: character_description
    })

    // Validate dialogue length with language awareness
    const dialogueValidation = scriptText 
      ? validateDialogueLength(scriptText, selectedPlatform, actualDuration, language) 
      : { valid: true, wordCount: 0, maxWords: 0, languageAdjusted: false }

    // Get resolution from model specs based on aspect ratio
    // VEO 3.1 Fast: 9:16 = 720p max, 16:9 = 1080p max
    const aspectRatioSpec = safeModelSpecs.aspectRatios?.[aspect_ratio]
    const resolution = aspectRatioSpec?.maxResolution || '720p'

    console.log(`[PREVIEW_PROMPTS] Segment ${i + 1}: ${segmentType}, duration=${actualDuration}s, platform=${selectedPlatform}`)

    prompts.push({
      segment_id: segmentId,
      segment_number: segment.segment_number || i + 1,
      segment_type: segmentType,
      shot_type: shotType,
      platform: selectedPlatform,
      platform_name: safeModelSpecs.displayName,
      duration: actualDuration,
      max_duration: safeModelSpecs.maxDuration,
      resolution,
      has_dialogue: hasDialogue,
      dialogue_preview: scriptText ? scriptText.substring(0, 100) + (scriptText.length > 100 ? '...' : '') : '',
      dialogue_validation: dialogueValidation,
      prompt: videoPrompt,
      image_url: imageUrl
    })
  }

  console.log(`[PREVIEW_PROMPTS] ✅ Generated ${prompts.length} prompts`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        prompts,
        total: prompts.length,
        metadata: {
          topic,
          language,
          aspect_ratio,
          environment
        }
      } 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCreateJobs(supabase: any, requestBody: any) {
  const {
    user_id,
    session_id,
    segments,
    topic = '',
    language = 'indonesian',
    aspect_ratio = '9:16',
    resolution = '1080p',
    environment = 'studio',
    preferred_platform = 'auto', // 'auto' | 'sora2' | 'veo31'
    creator_appearance = '', // Optional: creator appearance for voice gender detection
    // ========================================================================
    // Avatar/Face selection from UI (2026)
    // ========================================================================
    avatar_selection = 'no_avatar', // 'no_avatar' | 'use_profile' | 'saved'
    avatar_id = null,               // NEW: ID of saved avatar (from user_avatars)
    profile_image_url = null,       // URL to profile image (if use_profile or saved)
    creator_gender = 'male',        // 'male' | 'female' - from user profile
    character_description = '',     // Text description of creator (fallback if no image)
    regenerate_all = false,         // If true, reset completed/failed jobs to pending
  } = requestBody

  if (!user_id || !session_id || !segments || !Array.isArray(segments)) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing user_id, session_id, or segments' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CREATE_JOBS] Creating ${segments.length} video jobs for session: ${session_id}, preferred_platform: ${preferred_platform}`)

  // Map user selection to actual platform key
  const platformMap: Record<string, VideoModelKey> = {
    'veo-3.1-fast-hd':  'veo-3.1-fast-hd',  // Fast HD 720p $0.015 (DEFAULT)
    'veo-3.1-fast-fhd': 'veo-3.1-fast-fhd', // Fast FHD 1080p $0.015
    'veo-3.1-hd':       'veo-3.1-hd',       // Premium HD 720p $0.50
    'veo-3.1-fhd':      'veo-3.1-fhd',      // Premium FHD 1080p $0.50
    'grok-3':           'grok-3',            // Grok 3 Aurora 6/10/15s $0.015
    // Legacy aliases
    'veo-3.1-fast':     'veo-3.1-fast-hd',
    'veo31':            'veo-3.1-fast-hd',
    'wan-25':           'wan-2.5',
    'sora2':            'sora-2',
    'sora2-hd':         'sora-2-pro-hd',
    'sora2-pro':        'sora-2-pro',
    'auto':             'veo-3.1-fast-hd',
  }
  const selectedPlatformForAll = platformMap[preferred_platform] || 'veo-3.1-fast-hd'

  // ========================================================================
  // VOICE PROMPT RETRIEVAL (2026 - Avatar-linked)
  // Voice prompts are created once per avatar via analyze-avatar
  // Here we only RETRIEVE, never create
  // ========================================================================

  // Try to detect language from first segment with script text
  let detectedLanguage = language.toLowerCase()
  const firstScriptSegment = segments.find((s: any) => s.script_text || s.script)
  if (firstScriptSegment) {
    const scriptText = firstScriptSegment.script_text || firstScriptSegment.script || ''
    detectedLanguage = detectScriptLanguage(scriptText)
  }

  // Retrieve voice prompt based on avatar selection
  let voicePrompt: VoicePromptRecord | null = null
  let voiceCharacterJson = ''
  let voicePromptId: string | null = null

  if (avatar_selection === 'saved' && avatar_id) {
    // Retrieve voice prompt for saved avatar
    const { data: savedVoice } = await supabase
      .from('voice_prompts')
      .select('*')
      .eq('avatar_id', avatar_id)
      .single()

    if (savedVoice) {
      voicePrompt = savedVoice
      console.log(`[CREATE_JOBS] 🎤 Retrieved voice prompt for saved avatar: ${avatar_id}`)
    }
  } else if (avatar_selection === 'use_profile' || avatar_selection === 'profile') {
    // Retrieve voice prompt for profile avatar
    const { data: profileVoice } = await supabase
      .from('voice_prompts')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_profile_avatar', true)
      .is('avatar_id', null)
      .single()

    if (profileVoice) {
      voicePrompt = profileVoice
      console.log(`[CREATE_JOBS] 🎤 Retrieved voice prompt for profile avatar`)
    }
  }

  // If voice prompt found, use it
  if (voicePrompt) {
    voiceCharacterJson = voicePrompt.voice_prompt_block
    voicePromptId = voicePrompt.id
    console.log(`[CREATE_JOBS] 🎤 Using voice: ${voicePrompt.gender}, ${voicePrompt.voice_age}, ${voicePrompt.language} (ID: ${voicePromptId})`)
  } else {
    // Fallback: generate on-the-fly (for backward compatibility)
    console.log(`[CREATE_JOBS] ⚠️ No voice prompt found for avatar, generating fallback...`)
    const fallbackVoice = await getOrCreateVoicePrompt(supabase, {
      user_id,
      session_id,
      language: detectedLanguage,
      gender: creator_gender as 'male' | 'female',
      creator_appearance: creator_appearance || character_description
    })
    voiceCharacterJson = fallbackVoice.voice_prompt_block
    voicePromptId = fallbackVoice.id !== 'fallback' ? fallbackVoice.id : null
    console.log(`[CREATE_JOBS] 🎤 Fallback voice: ${fallbackVoice.gender}, ${fallbackVoice.voice_age}`)
  }

  console.log(`[CREATE_JOBS] 👤 Avatar selection: ${avatar_selection}, avatar_id: ${avatar_id || 'none'}`)

  // Determine if profile image is available
  const hasProfileImage = avatar_selection !== 'no_avatar' && profile_image_url !== null
  const actualCharacterDescription = character_description || creator_appearance

  // ========================================================================
  // FETCH SELECTED IMAGES FROM DATABASE (2026-01-17)
  // Get the is_selected=true image for each segment from image_generation_jobs
  // This ensures we use the user's selected image, not stale frontend state
  // ========================================================================
  const { data: selectedImages } = await supabase
    .from('image_generation_jobs')
    .select('segment_number, image_url')
    .eq('session_id', session_id)
    .eq('user_id', user_id)
    .eq('is_selected', true)
    .eq('status', 2) // Only completed images

  // Create a map of segment_number -> selected image URL
  const selectedImageMap = new Map<number, string>()
  if (selectedImages && selectedImages.length > 0) {
    selectedImages.forEach((img: any) => {
      selectedImageMap.set(img.segment_number, img.image_url)
    })
    console.log(`[CREATE_JOBS] 📸 Found ${selectedImages.length} selected images from database`)
  }

  // Create job records with SAME voice character for all
  const jobRecords = segments.map((segment: any, index: number) => {
    const segmentId = segment.segment_id || segment.id || String(index + 1)
    const segmentType = segment.segment_type || segment.type || segment.element || `SEGMENT_${index + 1}`
    const scriptText = segment.script_text || segment.script || ''
    const segmentNumber = segment.segment_number || index + 1
    // PRIORITY: 1) Selected from DB, 2) Request body, 3) null
    const imageUrl = selectedImageMap.get(segmentNumber) || segment.image_url || segment.imageUrl
    // DURATION FIX: Use safe parser
    const duration = safeParseDuration(segment.duration_seconds, 8)
    const emotion = segment.emotion || 'authority'
    const shotType = segment.shot_type || 'B-ROLL'
    // VISUAL DIRECTION: Extract from segment or generate from script
    const visualDirection = segment.visual_direction || segment.visualDirection || ''

    return {
      user_id,
      session_id,
      segment_id: segmentId,
      segment_number: segment.segment_number || index + 1,
      segment_type: segmentType,
      shot_type: shotType,
      emotion,
      script_text: scriptText,
      visual_direction: visualDirection, // Store visual direction
      image_url: imageUrl,
      duration_seconds: duration,
      language,
      aspect_ratio,
      resolution,
      environment,
      topic,
      preferred_platform: selectedPlatformForAll, // Store resolved platform (always VEO for auto)
      // voice_character column removed - now using voice_prompt_id reference
      voice_prompt_id: voicePromptId, // Reference to voice_prompts table for VEO 3.1 voice
      // ========================================================================
      // NEW: Avatar/Face anchor data (2026)
      // ========================================================================
      avatar_selection,
      has_profile_image: hasProfileImage,
      profile_image_url: profile_image_url,
      creator_gender,
      character_description: actualCharacterDescription,
      status: JOB_STATUS.PENDING,
      veo_uuid: null,
      video_url: null,
      error_message: null,
      platform: null,
      prompt: null
    }
  })

  // If regenerate_all, reset ALL existing jobs (completed/failed/processing) to pending
  if (regenerate_all) {
    const { data: resetData, error: resetError } = await supabase
      .from('video_generation_jobs')
      .update({ status: 0, error_message: null, veo_uuid: null, video_url: null, prompt: null, platform: null })
      .eq('session_id', session_id)
      .eq('user_id', user_id)
      .in('status', [1, 2, 3]) // processing, completed, failed → pending
      .select()

    if (!resetError && resetData?.length > 0) {
      console.log(`[CREATE_JOBS] 🔄 regenerate_all: Reset ${resetData.length} existing jobs to pending`)
    }
  }

  // Check if jobs already exist for this session
  const { data: existingJobs } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('session_id', session_id)
    .eq('user_id', user_id)
    .order('segment_number', { ascending: true })

  // Find which segments are missing (not in existing jobs)
  const existingSegmentIds = new Set(existingJobs?.map(j => j.segment_id) || [])
  const missingRecords = jobRecords.filter(r => !existingSegmentIds.has(r.segment_id))

  console.log(`[CREATE_JOBS] Existing jobs: ${existingJobs?.length || 0}, Missing segments: ${missingRecords.length}`)

  // Update existing jobs' preferred_platform if model changed
  // This ensures VEO 3.1 Fast/HD selection is respected even for existing jobs
  let updatedExistingJobs = existingJobs || []
  if (existingJobs && existingJobs.length > 0) {
    const jobsNeedingUpdate = existingJobs.filter(j => j.preferred_platform !== selectedPlatformForAll)
    if (jobsNeedingUpdate.length > 0) {
      console.log(`[CREATE_JOBS] 🔄 Updating ${jobsNeedingUpdate.length} existing jobs from ${jobsNeedingUpdate[0]?.preferred_platform} to ${selectedPlatformForAll}`)

      const jobIds = jobsNeedingUpdate.map(j => j.id)
      const { data: updatedJobs, error: updateError } = await supabase
        .from('video_generation_jobs')
        .update({
          preferred_platform: selectedPlatformForAll,
          updated_at: new Date().toISOString()
        })
        .in('id', jobIds)
        .select()

      if (updateError) {
        console.error('[CREATE_JOBS] Update error:', updateError)
      } else {
        console.log(`[CREATE_JOBS] ✅ Updated ${updatedJobs?.length || 0} jobs to platform: ${selectedPlatformForAll}`)
        // Replace updated jobs in the list
        const updatedMap = new Map(updatedJobs?.map(j => [j.id, j]) || [])
        updatedExistingJobs = existingJobs.map(j => updatedMap.get(j.id) || j)
      }
    }
  }

  // Insert missing job records (if any)
  let newJobs: any[] = []
  if (missingRecords.length > 0) {
    const { data: insertedJobs, error: insertError } = await supabase
      .from('video_generation_jobs')
      .insert(missingRecords)
      .select()

    if (insertError) {
      console.error('[CREATE_JOBS] Insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: insertError.message } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    newJobs = insertedJobs || []
    console.log(`[CREATE_JOBS] ✅ Created ${newJobs.length} new jobs for missing segments`)
  }

  // Combine existing (possibly updated) and new jobs
  const allJobs = [...updatedExistingJobs, ...newJobs].sort((a, b) => a.segment_number - b.segment_number)
  console.log(`[CREATE_JOBS] ✅ Total jobs: ${allJobs.length} (${existingJobs?.length || 0} existing + ${newJobs.length} new)`)

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        jobs: allJobs,
        session_id,
        total_jobs: allJobs.length,
        new_jobs: newJobs.length,
        existing_jobs: existingJobs?.length || 0,
        message: newJobs.length > 0
          ? `Created ${newJobs.length} new jobs, ${existingJobs?.length || 0} already existed.`
          : 'All jobs already exist for this session.'
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleProcessSingle(supabase: any, requestBody: any) {
  const { job_id, session_id, user_id, is_retry, force_retry, wan25Options } = requestBody

  // Get API keys (check later based on provider)
  const falApiKey = Deno.env.get('FAL_AI_API_KEY')
  const veoApiKey = Deno.env.get('VEO_API_KEY')

  // ============================================================================
  // STAGGERED PARALLEL MODE (2026): Allow parallel processing when job_id specified
  // Sequential mode (no job_id): Still blocks if another job is processing
  // Parallel mode (with job_id): Process specific job regardless of others
  // ============================================================================
  
  // Find job to process
  let job: any = null
  let jobWasReset = false  // Track if job was reset from stuck state

  if (job_id) {
    // PARALLEL MODE: Process specific job by ID (frontend handles stagger timing)
    const { data, error } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('id', job_id)
      .single()
    
    if (error || !data) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // RETRY HANDLING (2026 - VEO 3.1 Auto Retry)
    // ========================================================================
    if (is_retry && !force_retry) {
      const retryCount = data.retry_count || 0
      if (retryCount >= 3) {
        console.log(`[PROCESS_SINGLE] Job ${job_id} max retries reached (${retryCount}/3)`)
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'MAX_RETRIES', message: 'Maximum retries reached. Use manual retry.' }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Reset retry state if force_retry (manual retry)
    if (force_retry) {
      console.log(`[PROCESS_SINGLE] Force retry for job ${job_id} - resetting retry state`)
      await supabase
        .from('video_generation_jobs')
        .update({
          retry_count: 0,
          next_retry_at: null,
          error_message: null,
          status: JOB_STATUS.PROCESSING,
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id)

      data.status = JOB_STATUS.PROCESSING
      data.retry_count = 0
    }

    // Check if job is already processing or completed
    if (data.status === JOB_STATUS.PROCESSING) {
      // Check for stuck jobs: status=1 but no veo_uuid means previous attempt failed
      if (!data.veo_uuid) {
        console.log(`[PROCESS_SINGLE] Job ${job_id} stuck (status=1, no veo_uuid) - resetting to retry`)
        // Reset to pending for retry
        await supabase
          .from('video_generation_jobs')
          .update({ status: JOB_STATUS.PENDING, updated_at: new Date().toISOString() })
          .eq('id', job_id)
        // Continue processing instead of returning
        job = { ...data, status: JOB_STATUS.PENDING }
        jobWasReset = true
      } else {
        console.log(`[PROCESS_SINGLE] Job ${job_id} already processing with veo_uuid=${data.veo_uuid}`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              job: {
                id: data.id,
                segment_number: data.segment_number,
                segment_type: data.segment_type,
                segment_id: data.segment_id,
                veo_uuid: data.veo_uuid,
                status: JOB_STATUS.PROCESSING
              },
              already_processing: true
            } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    if (data.status === JOB_STATUS.COMPLETED) {
      console.log(`[PROCESS_SINGLE] Job ${job_id} already completed`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            job: {
              id: data.id,
              segment_number: data.segment_number,
              segment_type: data.segment_type,
              segment_id: data.segment_id,
              veo_uuid: data.veo_uuid,
              video_url: data.video_url,
              status: JOB_STATUS.COMPLETED
            },
            already_completed: true
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Only assign if not already set from stuck job reset
    if (!jobWasReset) {
      job = data
    }
    console.log(`[PROCESS_SINGLE] 🎯 PARALLEL MODE: Processing specific job ${job_id} (${job.segment_type})`)
    
  } else if (session_id && user_id) {
    // SEQUENTIAL MODE: Check if another job is processing first
    const { data: processingJobs } = await supabase
      .from('video_generation_jobs')
      .select('id, segment_number, created_at')
      .eq('session_id', session_id)
      .eq('user_id', user_id)
      .eq('status', JOB_STATUS.PROCESSING)
    
    if (processingJobs && processingJobs.length > 0) {
      console.log(`[PROCESS_SINGLE] ⏳ SEQUENTIAL MODE: Waiting - ${processingJobs.length} job(s) still processing`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            waiting: true,
            processing_count: processingJobs.length,
            message: 'Another job is still processing. Wait for it to complete before submitting new job.'
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Find next pending job by segment_number
    const { data, error } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('session_id', session_id)
      .eq('user_id', user_id)
      .eq('status', JOB_STATUS.PENDING)
      .order('segment_number', { ascending: true })
      .limit(1)
      .single()
    
    if (error || !data) {
      // No pending jobs - return current status
      return await getSessionStatus(supabase, session_id, user_id)
    }
    job = data
    console.log(`[PROCESS_SINGLE] 🔄 SEQUENTIAL MODE: Processing next pending job (${data.segment_type})`)
    
  } else {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Provide job_id or (session_id + user_id)' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ========================================================================
  // FETCH LATEST SELECTED IMAGE (2026-01-17)
  // Always use is_selected=true from image_generation_jobs
  // This ensures regenerated/reselected images are used, not stale job data
  // ========================================================================
  const { data: selectedImage } = await supabase
    .from('image_generation_jobs')
    .select('image_url')
    .eq('session_id', job.session_id)
    .eq('user_id', job.user_id)
    .eq('segment_number', job.segment_number)
    .eq('is_selected', true)
    .eq('status', 2) // Only completed images
    .single()

  // Use selected image from DB if available, otherwise fallback to job.image_url
  const actualImageUrl = selectedImage?.image_url || job.image_url

  // If selected image differs from job, update the job record
  if (selectedImage?.image_url && selectedImage.image_url !== job.image_url) {
    console.log(`[PROCESS_SINGLE] 📸 Updating job image_url with selected image`)
    await supabase
      .from('video_generation_jobs')
      .update({ image_url: selectedImage.image_url })
      .eq('id', job.id)

    job.image_url = selectedImage.image_url
  }

  // Check if job has image
  if (!actualImageUrl) {
    await supabase
      .from('video_generation_jobs')
      .update({ status: JOB_STATUS.FAILED, error_message: 'No image URL', updated_at: new Date().toISOString() })
      .eq('id', job.id)

    return new Response(
      JSON.stringify({ success: false, error: { code: 'NO_IMAGE', message: 'Job has no image URL' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[PROCESS_SINGLE] Processing job ${job.id} - Segment ${job.segment_number} (${job.segment_type})`)

  // Update status to processing
  await supabase
    .from('video_generation_jobs')
    .update({ status: JOB_STATUS.PROCESSING, updated_at: new Date().toISOString() })
    .eq('id', job.id)

  try {
    // Build video prompt
    const emotion = job.emotion || 'authority'
    const scriptText = job.script_text || ''
    // DURATION FIX: Use safe parser
    const duration = safeParseDuration(job.duration_seconds, 8)
    const segmentType = job.segment_type || ''
    const shotType = job.shot_type || 'B-ROLL'
    const visualDirection = job.visual_direction || ''

    // Select platform - USE PREFERRED_PLATFORM from job (already resolved, defaults to VEO 3.1)
    const selectedPlatform: VideoModelKey = (job.preferred_platform as VideoModelKey) || 'veo-3.1-fast'
    console.log(`[PROCESS_SINGLE] Using platform: ${selectedPlatform}`)

    const modelSpecs = VIDEO_MODELS[selectedPlatform]

    // ========================================================================
    // VOICE ANCHOR: Load from voice_prompts table via voice_prompt_id
    // This ensures consistent voice across ALL segments in a session
    // ========================================================================
    let voiceCharacterJson = ''
    if (job.voice_prompt_id) {
      const { data: voicePromptData } = await supabase
        .from('voice_prompts')
        .select('gender, voice_age, voice_accent, voice_tone, voice_pace, voice_description, voice_prompt_block')
        .eq('id', job.voice_prompt_id)
        .single()

      if (voicePromptData) {
        // Build VoiceCharacter JSON from structured fields
        voiceCharacterJson = JSON.stringify({
          gender: voicePromptData.gender || 'male',
          age: voicePromptData.voice_age || '25-30 years old',
          accent: voicePromptData.voice_accent || 'native speaker',
          tone: voicePromptData.voice_tone || 'warm, engaging',
          pace: voicePromptData.voice_pace || 'medium',
          description: voicePromptData.voice_description || voicePromptData.voice_prompt_block || ''
        })
        console.log(`[PROCESS_SINGLE] 🎤 Loaded voice anchor from voice_prompts (id: ${job.voice_prompt_id})`)
      }
    }

    // Build prompt with voice anchor + Face Anchor params
    const videoPrompt = buildCinematicVideoPrompt({
      segment: {
        ...job,
        visual_direction: visualDirection
      },
      segmentType,
      emotion,
      scriptText,
      language: job.language || 'indonesian',
      aspectRatio: job.aspect_ratio || '9:16',
      environment: job.environment || 'studio',
      platform: selectedPlatform,
      duration: Math.min(duration, modelSpecs.maxDuration),
      topic: job.topic || '',
      voiceCharacter: voiceCharacterJson || undefined,
      // ========================================================================
      // Face Anchor params from job record (2026)
      // ========================================================================
      hasProfileImage: job.has_profile_image || false,
      profileImageUrl: job.profile_image_url || '',
      creatorGender: job.creator_gender || 'male',
      characterDescription: job.character_description || ''
    })

    console.log(`[PROCESS_SINGLE] Platform: ${selectedPlatform}, Prompt length: ${videoPrompt.length}`)

    // ========================================================================
    // PROVIDER DETECTION: fal.ai only (VEO/Sora removed)
    // NOTE: TTS removed - VEO 3.1 has native audio generation
    // ========================================================================
    const aspectRatioInternal = (job.aspect_ratio || '9:16') as AspectRatio
    const actualDuration = getClosestDuration(modelSpecs, duration)
    const isFalProvider = modelSpecs.provider === 'fal'

    if (isFalProvider) {
      // ========================================================================
      // FAL.AI PATH: Queue-based API
      // ========================================================================
      if (!falApiKey) {
        throw new Error('FAL_AI_API_KEY not configured')
      }

      console.log(`[PROCESS_SINGLE] Using fal.ai: ${modelSpecs.key}`)

      // ========================================================================
      // WAN 2.5 TTS INTEGRATION: Generate voice audio before video submission
      // This enables voice cloning via Chatterbox Turbo for WAN 2.5 model
      // ========================================================================
      let audioUrl: string | null = null
      if (modelSpecs.key === 'wan-2.5' && scriptText) {
        console.log(`[PROCESS_SINGLE] WAN 2.5 detected - generating TTS audio...`)

        // Get user's voice reference from profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('voice_reference_url')
          .eq('user_id', job.user_id)
          .single()

        audioUrl = await generateTTSForWan(
          scriptText,
          profile?.voice_reference_url || null,
          falApiKey
        )

        if (audioUrl) {
          console.log(`[PROCESS_SINGLE] TTS generated successfully`)
        } else {
          console.log(`[PROCESS_SINGLE] TTS skipped or failed - video will be silent`)
        }
      }

      const { request_id, status_url } = await submitToFalQueue(
        modelSpecs,
        videoPrompt,
        job.image_url,
        actualDuration,
        falApiKey,
        audioUrl, // Pass TTS audio URL for WAN 2.5
        wan25Options // Pass WAN 2.5 specific settings (resolution, seed, negative_prompt, duration)
      )

      // Update job with fal request_id (store in veo_uuid field for compatibility)
      await supabase
        .from('video_generation_jobs')
        .update({
          veo_uuid: request_id, // Store fal request_id in same field
          platform: selectedPlatform,
          prompt: videoPrompt.substring(0, 1000),
          updated_at: new Date().toISOString(),
          // Store fal status URL in error_message temporarily (hacky but works)
          error_message: status_url // We'll use this for polling
        })
        .eq('id', job.id)

      console.log(`[PROCESS_SINGLE] ✅ Job ${job.id} submitted to fal.ai: request_id=${request_id}`)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            job: {
              id: job.id,
              segment_number: job.segment_number,
              segment_type: job.segment_type,
              veo_uuid: request_id,
              platform: selectedPlatform,
              status: JOB_STATUS.PROCESSING,
              provider: 'fal'
            },
            message: 'Job submitted to fal.ai. Poll check_and_update to get video URL.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // GEMINIGEN PATH: VEO 3.1 API (webhook-based)
    // ========================================================================
    if (modelSpecs.provider === 'geminigen') {
      if (!veoApiKey) {
        throw new Error('VEO_API_KEY not configured')
      }

      console.log(`[PROCESS_SINGLE] Using GeminiGen: ${modelSpecs.key}`)

      // Build form data for GeminiGen API
      const formData = buildVideoFormData(modelSpecs, {
        prompt: videoPrompt,
        aspectRatio: aspectRatioInternal,
        duration: actualDuration,
        referenceImageUrl: job.image_url
      })

      // Submit to GeminiGen API
      const apiResponse = await fetch(modelSpecs.endpoint, {
        method: 'POST',
        headers: { 'x-api-key': veoApiKey },
        body: formData
      })

      const responseText = await apiResponse.text()
      if (!apiResponse.ok) {
        throw new Error(`GeminiGen API error: ${apiResponse.status} - ${responseText}`)
      }

      const responseData = JSON.parse(responseText)
      const veoUuid = responseData.uuid

      if (!veoUuid) {
        throw new Error('GeminiGen did not return uuid')
      }

      // Update job with veo_uuid
      await supabase
        .from('video_generation_jobs')
        .update({
          veo_uuid: veoUuid,
          platform: selectedPlatform,
          prompt: videoPrompt.substring(0, 1000),
          provider: 'geminigen',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      console.log(`[PROCESS_SINGLE] ✅ Job ${job.id} submitted to GeminiGen: uuid=${veoUuid}`)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            job: {
              id: job.id,
              segment_number: job.segment_number,
              segment_type: job.segment_type,
              segment_id: job.segment_id,
              veo_uuid: veoUuid,
              platform: selectedPlatform,
              status: JOB_STATUS.PROCESSING,
              provider: 'geminigen'
            },
            message: 'Job submitted to GeminiGen. Webhook will update status when complete.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If we get here, no provider matched
    throw new Error(`Unknown provider for model: ${modelSpecs.key}`)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[PROCESS_SINGLE] ❌ Job ${job.id} failed: ${errorMessage}`)

    await supabase
      .from('video_generation_jobs')
      .update({ 
        status: JOB_STATUS.FAILED, 
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { code: 'GENERATION_FAILED', message: errorMessage },
        data: { job: { id: job.id, segment_number: job.segment_number, status: JOB_STATUS.FAILED } }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCheckAndUpdate(supabase: any, requestBody: any) {
  const { session_id, user_id } = requestBody

  if (!session_id || !user_id) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing session_id or user_id' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const falApiKey = Deno.env.get('FAL_AI_API_KEY')
  if (!falApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'FAL_AI_API_KEY not configured' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get all processing jobs with VEO UUID
  const { data: processingJobs, error } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('session_id', session_id)
    .eq('user_id', user_id)
    .eq('status', JOB_STATUS.PROCESSING)
    .not('veo_uuid', 'is', null)

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!processingJobs || processingJobs.length === 0) {
    // No processing jobs - return current status
    return await getSessionStatus(supabase, session_id, user_id)
  }

  console.log(`[CHECK_AND_UPDATE] Checking ${processingJobs.length} processing jobs (fal.ai only)`)

  const updatedJobs: any[] = []

  // ========================================================================
  // CHECK FAL.AI JOBS (All jobs are now fal.ai)
  // ========================================================================
  for (const job of processingJobs) {
      try {
        const statusUrl = job.error_message // We stored status URL here temporarily
        if (!statusUrl) {
          console.warn(`[CHECK_AND_UPDATE] fal job ${job.id} missing status URL, skipping`)
          continue
        }

        const falStatus = await pollFalStatus(statusUrl, falApiKey)

        if (falStatus.status === 'COMPLETED' && falStatus.video_url) {
          // Update to completed
          await supabase
            .from('video_generation_jobs')
            .update({
              status: JOB_STATUS.COMPLETED,
              video_url: falStatus.video_url,
              error_message: null, // Clear the status URL
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          updatedJobs.push({ ...job, status: JOB_STATUS.COMPLETED, video_url: falStatus.video_url })
          console.log(`[CHECK_AND_UPDATE] ✅ fal.ai Job ${job.id} completed: ${falStatus.video_url}`)

        } else if (falStatus.status === 'FAILED') {
          // Update to failed
          await supabase
            .from('video_generation_jobs')
            .update({
              status: JOB_STATUS.FAILED,
              error_message: falStatus.error || 'fal.ai video generation failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          updatedJobs.push({ ...job, status: JOB_STATUS.FAILED })
          console.log(`[CHECK_AND_UPDATE] ❌ fal.ai Job ${job.id} failed: ${falStatus.error}`)

        } else {
          // Still processing
          updatedJobs.push({ ...job, status_percentage: 50 }) // Fake percentage for now
          console.log(`[CHECK_AND_UPDATE] ⏳ fal.ai Job ${job.id} still processing (${falStatus.status})`)
        }
    } catch (err) {
      console.error(`[CHECK_AND_UPDATE] Error polling fal.ai job ${job.id}:`, err)
      updatedJobs.push({ ...job })
    }
  }

  // Get full session status
  return await getSessionStatus(supabase, session_id, user_id)
}

async function handleCheckStatus(supabase: any, requestBody: any) {
  const { session_id, user_id } = requestBody

  if (!session_id || !user_id) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing session_id or user_id' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return await getSessionStatus(supabase, session_id, user_id)
}

async function getSessionStatus(supabase: any, sessionId: string, userId: string) {
  const { data: jobs, error } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('segment_number', { ascending: true })

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const pending = jobs?.filter((j: any) => j.status === JOB_STATUS.PENDING).length || 0
  const processing = jobs?.filter((j: any) => j.status === JOB_STATUS.PROCESSING).length || 0
  const completed = jobs?.filter((j: any) => j.status === JOB_STATUS.COMPLETED).length || 0
  const failed = jobs?.filter((j: any) => j.status === JOB_STATUS.FAILED).length || 0
  const total = jobs?.length || 0

  const allComplete = pending === 0 && processing === 0 && total > 0

  // Create notification if all complete
  if (allComplete) {
    await createCompletionNotification(supabase, userId, sessionId, completed, failed, total)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        jobs,
        summary: { total, completed, failed, pending, processing },
        all_complete: allComplete
      } 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleLegacyMode(supabase: any, requestBody: any) {
  // Original implementation for backward compatibility
  const { 
    segments, 
    images, 
    language = 'indonesian',
    aspect_ratio = '9:16',
    resolution = '1080p',
    session_id, 
    user_id,
    topic = '',
    environment = 'studio',
    prefer_platform
  } = requestBody

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing or invalid segments array' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const useOldFormat = images && Array.isArray(images) && images.length > 0
  if (useOldFormat && segments.length !== images.length) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Segments and images count mismatch' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // GeminiGen.ai API key (used for both VEO 3.1 HD and Fast)
  const veoApiKey = Deno.env.get('VEO_API_KEY')
  if (!veoApiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'VEO_API_KEY not configured' }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const videos: VideoResult[] = []
  let totalCost = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentId = segment.segment_id || segment.id || String(i + 1)
    const segmentType = segment.segment_type || segment.type || segment.element || `SEGMENT_${i + 1}`
    const emotion = segment.emotion || 'authority'
    const scriptText = segment.script_text || segment.script || ''
    // DURATION FIX: Use safe parser
    const duration = safeParseDuration(segment.duration_seconds, 8)
    
    const imageUrl = useOldFormat 
      ? images[i].image_url 
      : (segment.image_url || segment.imageUrl)

    if (!imageUrl) {
      videos.push({
        segment_number: segment.segment_number || i + 1,
        segment_id: segmentId,
        segment_type: segmentType,
        platform: 'none',
        error: 'No image URL provided'
      })
      continue
    }

    // Use prefer_platform from frontend, default to VEO 3.1 HD for best quality
    const selectedPlatform: VideoModelKey = prefer_platform || 'veo-3.1-hd'

    const modelSpecs = VIDEO_MODELS[selectedPlatform]

    const videoPrompt = buildCinematicVideoPrompt({
      segment,
      segmentType,
      emotion,
      scriptText,
      language,
      aspectRatio: aspect_ratio as '9:16' | '16:9',
      environment,
      platform: selectedPlatform,
      duration: Math.min(duration, modelSpecs.maxDuration),
      topic
    })

    try {
      // ========================================================================
      // BUILD FORM DATA USING CENTRALIZED CONFIG (2026)
      // ========================================================================
      const aspectRatioInternal = aspect_ratio as AspectRatio
      const actualDuration = getClosestDuration(modelSpecs, duration)
      
      const formData = buildVideoFormData(modelSpecs, {
        prompt: videoPrompt,
        aspectRatio: aspectRatioInternal,
        duration: actualDuration,
        referenceImageUrl: imageUrl
      })

      const apiResponse = await fetch(modelSpecs.endpoint, {
        method: 'POST',
        headers: { 'x-api-key': veoApiKey },
        body: formData
      })

      const responseText = await apiResponse.text()
      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status} - ${responseText}`)
      }

      const responseData = JSON.parse(responseText)
      totalCost += modelSpecs.costPerVideo

      if (user_id && session_id) {
        // Extract additional segment data
        const shotType = segment.shot_type || segment.shotType || 'B-ROLL'
        const visualDirection = segment.visual_direction || segment.visualDirection || ''

        // Avatar/creator info from segment or request
        const avatarSelection = segment.avatar_selection || 'no_avatar'
        const profileImageUrl = segment.profile_image_url || segment.avatarUrl || null
        const characterDescription = segment.character_description || null
        const creatorGender = segment.creator_gender || segment.gender || null

        console.log('[LEGACY] Inserting job to DB:', {
          user_id,
          session_id,
          segment_id: segmentId,
          veo_uuid: responseData.uuid
        })

        // Check if job already exists for this session+segment
        const { data: existingJob, error: findError } = await supabase
          .from('video_generation_jobs')
          .select('id')
          .eq('session_id', session_id)
          .eq('segment_id', segmentId)
          .single()

        console.log('[LEGACY] Find existing job:', existingJob?.id || 'not found', findError ? `Error: ${findError.message}` : '(no error)')

        if (existingJob) {
          // UPDATE existing job with veo_uuid
          const { data: updatedJob, error: updateError } = await supabase
            .from('video_generation_jobs')
            .update({
              veo_uuid: responseData.uuid,
              platform: selectedPlatform,
              model_selected: modelSpecs.apiModelName,
              provider: 'geminigen',
              status: 1,
              prompt: videoPrompt.substring(0, 1000),
              final_prompt: videoPrompt,
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingJob.id)
            .select('id, veo_uuid')
            .single()

          if (updateError) {
            console.error('[LEGACY] DB update error:', updateError)
          } else {
            console.log('[LEGACY] Job updated:', updatedJob?.id, 'veo_uuid:', updatedJob?.veo_uuid)
          }
        } else {
          // INSERT new job
          const { data: insertedJob, error: insertError } = await supabase
            .from('video_generation_jobs')
            .insert({
              // Core identifiers
              user_id,
              session_id,
              segment_id: segmentId,
              segment_number: segment.segment_number || i + 1,
              segment_type: segmentType,

              // Video generation
              veo_uuid: responseData.uuid,
              platform: selectedPlatform,
              model_selected: modelSpecs.apiModelName,
              provider: 'geminigen',
              status: 1,

              // Prompt & content
              prompt: videoPrompt.substring(0, 1000),
              final_prompt: videoPrompt,
              script_text: scriptText,

              // Visual settings
              image_url: imageUrl,
              shot_type: shotType,
              visual_direction: visualDirection,
              emotion: emotion,

              // Technical specs
              duration_seconds: actualDuration,
              aspect_ratio: aspect_ratio,
              resolution: resolution,

              // Avatar/Creator info
              avatar_selection: avatarSelection,
              profile_image_url: profileImageUrl,
              character_description: characterDescription,
              creator_gender: creatorGender,
              has_profile_image: !!profileImageUrl,

              // Context
              topic: topic,
              language: language,
              environment: environment,

              // Cost tracking
              estimated_cost: modelSpecs.costPerVideo,

              // Timestamps
              started_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (insertError) {
            console.error('[LEGACY] DB insert error:', insertError)
          } else {
            console.log('[LEGACY] Job inserted:', insertedJob?.id, 'veo_uuid:', responseData.uuid)
          }
        }
      }

      videos.push({
        segment_number: segment.segment_number || i + 1,
        segment_id: segmentId,
        segment_type: segmentType,
        platform: selectedPlatform,
        model_name: modelSpecs.displayName,
        veo_response: {
          id: responseData.id,
          uuid: responseData.uuid,
          model_name: responseData.model_name,
          status: responseData.status,
          status_percentage: responseData.status_percentage,
          estimated_credit: responseData.estimated_credit,
          video_url: responseData.video_url || null
        }
      })

      if (i < segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } catch (segmentError) {
      const errorMessage = segmentError instanceof Error ? segmentError.message : 'Unknown error'
      videos.push({
        segment_number: segment.segment_number || i + 1,
        segment_id: segmentId,
        segment_type: segmentType,
        platform: selectedPlatform,
        error: errorMessage
      })
    }
  }

  const successCount = videos.filter(v => !v.error).length

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        videos,
        stats: {
          total: videos.length,
          success: successCount,
          failed: videos.length - successCount,
          estimated_cost: totalCost
        },
        polling_endpoint: '/functions/v1/check-video-status',
        polling_interval_seconds: 5,
        metadata: { language, aspect_ratio, resolution, topic, environment }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================

async function createCompletionNotification(
  supabase: any, 
  userId: string, 
  sessionId: string, 
  completed: number, 
  failed: number,
  total: number
) {
  // Check if notification already exists for this session
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'video_generation_complete')
    .contains('data', { session_id: sessionId })
    .limit(1)

  if (existing && existing.length > 0) {
    return // Already notified
  }

  const allSuccess = failed === 0

  const notification = {
    user_id: userId,
    type: allSuccess ? 'video_generation_complete' : 'video_generation_partial',
    title: allSuccess ? '🎬 Videos Ready!' : '⚠️ Video Generation Complete',
    message: allSuccess 
      ? `All ${completed} video segments have been generated. Click to continue to music selection.`
      : `${completed}/${total} videos generated. ${failed} failed. Click to review and retry.`,
    data: {
      session_id: sessionId,
      completed,
      failed,
      total,
      redirect_url: `/video-generation?session=${sessionId}`
    },
    is_read: false
  }

  const { error } = await supabase
    .from('notifications')
    .insert([notification])

  if (error) {
    console.error('[NOTIFICATION] Failed to create notification:', error)
  } else {
    console.log(`[NOTIFICATION] ✅ Created video completion notification for user ${userId}`)
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface VideoResult {
  segment_number: number
  segment_id: string
  segment_type: string
  platform: VideoModelKey | 'none'
  model_name?: string
  veo_response?: {
    id: string
    uuid: string
    model_name: string
    status: number
    status_percentage: number
    estimated_credit: number
    video_url: string | null
  }
  error?: string
}

interface VideoPromptParams {
  segment: any
  segmentType: string
  emotion: string
  scriptText: string
  language: string
  aspectRatio: '9:16' | '16:9'
  environment: string
  platform: VideoModelKey
  duration: number
  topic?: string // Topic for contextual B-ROLL
  // NEW: Voice character for consistency across all segments
  voiceCharacter?: string
  // ========================================================================
  // NEW: Face Anchor params (2026) - from UI avatar selection
  // ========================================================================
  hasProfileImage?: boolean      // true if user selected "use_profile" or "upload_new"
  profileImageUrl?: string       // URL to profile image
  creatorGender?: 'male' | 'female'
  characterDescription?: string  // fallback text description
}

// ============================================================================
// CINEMATIC VIDEO PROMPT BUILDER (Using Knowledge File Functions)
// ============================================================================

// Helper: Detect language from text content
function detectScriptLanguage(text: string): string {
  if (!text || text.trim().length === 0) return 'english'
  
  // Indonesian indicators: common words and patterns
  const indonesianPatterns = /\b(yang|dan|di|ke|dari|untuk|dengan|ini|itu|adalah|akan|bisa|sudah|belum|tidak|jangan|ayo|yuk|guys|banget|gak|nggak|nih|dong|sih|loh|kan|gimana|gimana|bagaimana|kenapa|mengapa|apa|siapa|kapan|dimana|mana)\b/i
  
  // Hindi indicators: Devanagari script or common romanized Hindi
  const hindiPatterns = /[\u0900-\u097F]|\b(hai|hain|ka|ki|ke|se|ko|ne|aur|yeh|woh|kya|kaise|kyun|kahaan|kaun|kab|bahut|accha|theek|nahi|haan|ji)\b/i
  
  // Spanish indicators
  const spanishPatterns = /\b(el|la|los|las|un|una|de|en|que|es|por|para|con|como|pero|muy|más|también|ahora|aquí|esto|eso)\b/i
  
  // Check patterns
  if (indonesianPatterns.test(text)) return 'indonesian'
  if (hindiPatterns.test(text)) return 'hindi'
  if (spanishPatterns.test(text)) return 'spanish'
  
  // Default to English
  return 'english'
}

// ============================================================================
// VOICE CHARACTER ANCHOR - Ensures consistent voice across all segments
// ============================================================================

interface VoiceCharacter {
  description: string
  gender: 'male' | 'female'
  age: string
  accent: string
  tone: string
  pace: string
}

function generateVoiceCharacter(language: string, creatorAppearance?: string): VoiceCharacter {
  // Try to extract gender from creator appearance if provided
  let gender: 'male' | 'female' = 'male' // default
  if (creatorAppearance) {
    if (/\b(female|woman|wanita|perempuan|cewek|gadis)\b/i.test(creatorAppearance)) {
      gender = 'female'
    } else if (/\b(male|man|pria|laki|cowok)\b/i.test(creatorAppearance)) {
      gender = 'male'
    }
  }
  
  const voiceProfiles: Record<string, Record<'male' | 'female', VoiceCharacter>> = {
    indonesian: {
      male: {
        description: 'Indonesian male voice, 25-30 years old, warm friendly tone with casual Gen-Z energy',
        gender: 'male',
        age: '25-30 years old',
        accent: 'Indonesian native speaker with slight Jakarta urban accent',
        tone: 'warm, friendly, enthusiastic, casual Gen-Z energy',
        pace: 'medium-fast, natural conversational rhythm'
      },
      female: {
        description: 'Indonesian female voice, 23-28 years old, bright cheerful tone with casual Gen-Z energy',
        gender: 'female',
        age: '23-28 years old',
        accent: 'Indonesian native speaker with slight Jakarta urban accent',
        tone: 'bright, cheerful, engaging, casual Gen-Z energy',
        pace: 'medium-fast, natural conversational rhythm'
      }
    },
    english: {
      male: {
        description: 'American English male voice, 28-35 years old, confident engaging tone',
        gender: 'male',
        age: '28-35 years old',
        accent: 'American English, neutral/general American accent',
        tone: 'confident, engaging, professional yet approachable',
        pace: 'medium pace, clear articulation'
      },
      female: {
        description: 'American English female voice, 25-32 years old, warm professional tone',
        gender: 'female',
        age: '25-32 years old',
        accent: 'American English, neutral/general American accent',
        tone: 'warm, professional, engaging, trustworthy',
        pace: 'medium pace, clear articulation'
      }
    },
    hindi: {
      male: {
        description: 'Hindi male voice, 25-32 years old, energetic Hinglish style',
        gender: 'male',
        age: '25-32 years old',
        accent: 'Hindi native with natural English code-switching (Hinglish)',
        tone: 'energetic, relatable, youthful urban Indian style',
        pace: 'medium-fast, dynamic rhythm'
      },
      female: {
        description: 'Hindi female voice, 23-30 years old, vibrant Hinglish style',
        gender: 'female',
        age: '23-30 years old',
        accent: 'Hindi native with natural English code-switching (Hinglish)',
        tone: 'vibrant, relatable, youthful urban Indian style',
        pace: 'medium-fast, dynamic rhythm'
      }
    },
    spanish: {
      male: {
        description: 'Latin American Spanish male voice, 27-34 years old, warm engaging tone',
        gender: 'male',
        age: '27-34 years old',
        accent: 'Latin American Spanish, neutral accent',
        tone: 'warm, engaging, personable, enthusiastic',
        pace: 'medium pace, natural rhythm'
      },
      female: {
        description: 'Latin American Spanish female voice, 25-32 years old, bright friendly tone',
        gender: 'female',
        age: '25-32 years old',
        accent: 'Latin American Spanish, neutral accent',
        tone: 'bright, friendly, engaging, personable',
        pace: 'medium pace, natural rhythm'
      }
    }
  }
  
  const langKey = language.toLowerCase()
  const profiles = voiceProfiles[langKey] || voiceProfiles.english
  return profiles[gender]
}

// SIMPLIFIED (2026): Compact voice anchor without decorative borders
function buildVoiceCharacterAnchor(voiceChar: VoiceCharacter, isSora: boolean = false): string {
  // For Sora: Skip age to avoid content moderation flags
  if (isSora) {
    return `VOICE: ${voiceChar.gender}, ${voiceChar.accent}, ${voiceChar.tone}, ${voiceChar.pace}`
  }

  return `VOICE CHARACTER:
${voiceChar.description}
Accent: ${voiceChar.accent} | Tone: ${voiceChar.tone} | Pace: ${voiceChar.pace}
Maintain consistent voice across all segments.`
}

// ============================================================================
// VEO 3.1 VOICE PROMPT - Enhanced format for better voice consistency
// ============================================================================

interface VoicePromptRecord {
  id: string
  user_id: string
  session_id: string
  language: string
  gender: string
  voice_description: string
  voice_age: string
  voice_accent: string
  voice_tone: string
  voice_pace: string
  voice_prompt_block: string
  created_at: string
  updated_at: string
}

/**
 * Build VEO 3.1 compliant voice anchor block
 * This format follows Google's best practices for voice consistency
 */
function buildVEO31VoiceAnchor(voiceChar: VoiceCharacter, language: string): string {
  return `═══════════════════════════════════════════════════════════════
VOICE ANCHOR (CRITICAL - Identical across ALL segments)
═══════════════════════════════════════════════════════════════
Voice: ${voiceChar.description}
Gender: ${voiceChar.gender}
Age: ${voiceChar.age}
Accent: ${voiceChar.accent}
Tone: ${voiceChar.tone}
Pace: ${voiceChar.pace}
Language: ${language}
Quality: Dry voice, close-mic, professional broadcast quality

CRITICAL INSTRUCTION:
This EXACT voice character must be maintained identically across
all video segments (HOOK, BODY, CTA). Do NOT change voice
characteristics between segments. Consistency is paramount.
═══════════════════════════════════════════════════════════════`
}

/**
 * Get or create voice prompt for a session
 * Ensures voice consistency by storing in database
 */
async function getOrCreateVoicePrompt(
  supabase: any,
  params: {
    user_id: string
    session_id: string
    language: string
    gender: 'male' | 'female'
    creator_appearance?: string
  }
): Promise<VoicePromptRecord> {
  const { user_id, session_id, language, gender, creator_appearance } = params

  // Check if voice prompt exists for this session
  const { data: existing, error: selectError } = await supabase
    .from('voice_prompts')
    .select('*')
    .eq('session_id', session_id)
    .single()

  if (existing && !selectError) {
    console.log(`[VOICE] Using existing voice prompt for session: ${session_id}`)
    return existing
  }

  // Generate new voice character using existing function
  const voiceChar = generateVoiceCharacter(language, creator_appearance)

  // Build VEO 3.1 compliant voice prompt block
  const voicePromptBlock = buildVEO31VoiceAnchor(voiceChar, language)

  // Insert to database
  const { data: created, error: insertError } = await supabase
    .from('voice_prompts')
    .insert({
      user_id,
      session_id,
      language,
      gender: voiceChar.gender,
      voice_description: voiceChar.description,
      voice_age: voiceChar.age,
      voice_accent: voiceChar.accent,
      voice_tone: voiceChar.tone,
      voice_pace: voiceChar.pace,
      voice_prompt_block: voicePromptBlock
    })
    .select()
    .single()

  if (insertError) {
    console.error(`[VOICE] Failed to create voice prompt: ${insertError.message}`)
    // Return a fallback object if insert fails (e.g., table doesn't exist yet)
    return {
      id: 'fallback',
      user_id,
      session_id,
      language,
      gender: voiceChar.gender,
      voice_description: voiceChar.description,
      voice_age: voiceChar.age,
      voice_accent: voiceChar.accent,
      voice_tone: voiceChar.tone,
      voice_pace: voiceChar.pace,
      voice_prompt_block: voicePromptBlock,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  console.log(`[VOICE] Created new voice prompt for session: ${session_id}`)
  return created
}

// ============================================================================
// SORA CONTENT MODERATION BYPASS (2026)
// Sanitize prompts to avoid false positive content flags
// ============================================================================
function sanitizeForSora(text: string): string {
  if (!text) return ''
  
  // Remove or replace words that may trigger Sora content moderation
  let sanitized = text
  
  // Remove detailed physical descriptions that may trigger flags
  const physicalPatterns = [
    /\b(skin\s*(tone|color|undertone)|complexion|pores|texture)\b/gi,
    /\b(\d+[\s-]*(year|tahun)[\s-]*(old|lama))\b/gi, // age references
    /\b(sexy|seductive|sensual|intimate|romantic)\b/gi,
    /\b(body|physique|figure|curves)\b/gi,
    /\b(revealing|exposed|bare|naked)\b/gi,
  ]
  
  for (const pattern of physicalPatterns) {
    sanitized = sanitized.replace(pattern, '')
  }
  
  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  
  return sanitized
}

// Simplify character description for Sora to avoid content flags
function simplifyCharacterForSora(description: string, gender: 'male' | 'female'): string {
  if (!description) {
    return gender === 'male' 
      ? 'Professional male presenter with glasses, clean appearance'
      : 'Professional female presenter, clean appearance'
  }
  
  // Extract only safe descriptors
  const safeDescriptors: string[] = []
  
  // Keep glasses reference if present
  if (/glasses|kacamata|spectacles/i.test(description)) {
    safeDescriptors.push('wearing glasses')
  }
  
  // Keep hair style if mentioned (but not color/texture details)
  if (/bald|botak|shaved head/i.test(description)) {
    safeDescriptors.push('bald head')
  } else if (/short hair/i.test(description)) {
    safeDescriptors.push('short hair')
  } else if (/long hair/i.test(description)) {
    safeDescriptors.push('long hair')
  }
  
  // Keep clothing if professional
  if (/blazer|suit|jacket|professional/i.test(description)) {
    safeDescriptors.push('professional attire')
  }
  
  const genderWord = gender === 'male' ? 'male' : 'female'
  const base = `Professional ${genderWord} content creator`
  
  if (safeDescriptors.length > 0) {
    return `${base}, ${safeDescriptors.join(', ')}`
  }
  
  return base
}

// ============================================================================
// VISUAL BRIEF EXTRACTION FOR B-ROLL (2026)
// Converts script text → contextual visual descriptions
// Reference: 12-broll-visual-extraction.md
// ============================================================================

interface VisualBrief {
  topicKeywords: string[]
  abstractConcepts: string[]
  emotionalTone: string
  primarySubject: {
    element: string
    attributes: string[]
    action: string
  }
  secondaryElements: string[]
  environmentType: string
}

// Abstract → Concrete Visual Metaphor Mapping
const ABSTRACT_METAPHORS: Record<string, string[]> = {
  // Technology & Digital
  'security': ['glowing padlock', 'shield with digital pattern', 'vault door with light'],
  'password': ['floating key with lock', 'digital keypad', 'encrypted text on screen'],
  'encryption': ['data scrambling visualization', 'secure tunnel of light', 'lock with binary code'],
  'data': ['flowing streams of cyan light', 'server racks with pulsing LEDs', 'holographic data nodes'],
  'ai': ['neural network nodes', 'brain with circuit patterns', 'AI core with flowing data'],
  'algorithm': ['flowing code streams', 'decision tree visualization', 'processing nodes'],
  'cloud': ['floating data cubes', 'server farm with lights', 'interconnected cloud nodes'],
  'hacking': ['red warning matrix', 'breaking digital chains', 'dark terminal with code'],
  'privacy': ['eye with protective shield', 'data behind curtain', 'hidden document'],
  
  // Finance & Business
  'cryptocurrency': ['glowing Bitcoin coin', 'blockchain visualization', 'digital wallet'],
  'investment': ['growing plant with coins', 'upward golden graph', 'golden seedling'],
  'profit': ['rising bar chart with glow', 'stacking gold coins', 'expanding circles'],
  'growth': ['bar chart ascending', 'sprouting golden seed', 'sunrise over graph'],
  'trading': ['candlestick chart animation', 'dual trading screens', 'fast ticker display'],
  'wealth': ['gold bars stacked', 'treasure chest glowing', 'luxury items'],
  'debt': ['chain and weight', 'sinking anchor', 'red descending numbers'],
  
  // Concepts & Ideas
  'innovation': ['light bulb igniting', 'gears turning with sparks', 'rocket launching'],
  'success': ['mountain peak with flag', 'trophy with glow', 'finish line ribbon'],
  'failure': ['cracked ground', 'fallen chess piece', 'wilting plant'],
  'time': ['hourglass flowing', 'clock gears turning', 'calendar pages flying'],
  'speed': ['motion blur streaks', 'lightning bolt', 'wind trail particles'],
  'connection': ['bridge spanning gap', 'linked glowing chains', 'network nodes connecting'],
  'problem': ['tangled knots', 'maze from above', 'puzzle with missing piece'],
  'solution': ['key entering lock', 'light through doorway', 'puzzle completing'],
  
  // Trends & Social
  'trend': ['rising graph with sparkles', 'viral wave spreading', 'upward arrow with momentum'],
  'viral': ['spreading network effect', 'multiplying nodes', 'wave of engagement'],
  'followers': ['growing community visualization', 'rising counter', 'network expansion'],
  'engagement': ['heart icons floating up', 'comment bubbles appearing', 'interaction pulses'],
}

// Extract visual brief from script and topic
function extractVisualBrief(scriptText: string, topic: string, emotion: string): VisualBrief {
  const combinedText = `${topic} ${scriptText}`.toLowerCase()
  
  // Extract topic keywords (concrete nouns)
  const topicKeywords: string[] = []
  const abstractConcepts: string[] = []
  
  // Check for abstract concepts and collect keywords
  for (const [concept, metaphors] of Object.entries(ABSTRACT_METAPHORS)) {
    if (combinedText.includes(concept)) {
      abstractConcepts.push(concept)
    }
  }
  
  // Extract concrete nouns from topic
  const concreteNounPatterns = /\b(tiktok|instagram|reels|youtube|shorts|video|content|creator|phone|smartphone|laptop|computer|camera|microphone|screen|dashboard|chart|graph|data|code|app|website|product|brand|money|coin|trend|viral|follower|engagement)\b/gi
  const matches = combinedText.match(concreteNounPatterns)
  if (matches) {
    topicKeywords.push(...[...new Set(matches.map(m => m.toLowerCase()))])
  }
  
  // Determine primary subject based on extracted concepts
  let primarySubject = {
    element: 'abstract data visualization',
    attributes: ['glowing', 'dynamic'],
    action: 'pulsing with energy'
  }
  
  // Pick the most relevant metaphor
  if (abstractConcepts.length > 0) {
    const primaryConcept = abstractConcepts[0]
    const metaphors = ABSTRACT_METAPHORS[primaryConcept]
    if (metaphors && metaphors.length > 0) {
      // Pick random metaphor for variety
      const selectedMetaphor = metaphors[Math.floor(Math.random() * metaphors.length)]
      primarySubject = {
        element: selectedMetaphor,
        attributes: ['cinematic', 'detailed'],
        action: 'animating with subtle motion'
      }
    }
  } else if (topicKeywords.length > 0) {
    // Use first concrete keyword as primary subject
    const keyword = topicKeywords[0]
    primarySubject = {
      element: keyword,
      attributes: ['modern', 'high-quality'],
      action: 'displayed prominently'
    }
  }
  
  // Determine environment type
  const envPatterns: Record<string, string[]> = {
    tech: ['code', 'software', 'ai', 'algorithm', 'data', 'programming', 'app', 'tech'],
    social: ['tiktok', 'instagram', 'youtube', 'reels', 'shorts', 'viral', 'trend', 'creator', 'content', 'follower'],
    finance: ['crypto', 'money', 'invest', 'trading', 'profit', 'wealth', 'coin', 'stock'],
    nature: ['nature', 'outdoor', 'forest', 'mountain', 'landscape'],
    urban: ['city', 'street', 'building', 'urban'],
    product: ['product', 'brand', 'device', 'gadget'],
  }
  
  let environmentType = 'tech' // default
  for (const [env, keywords] of Object.entries(envPatterns)) {
    if (keywords.some(kw => combinedText.includes(kw))) {
      environmentType = env
      break
    }
  }
  
  // Generate secondary elements based on environment
  const secondaryElementsByEnv: Record<string, string[]> = {
    tech: ['floating code particles', 'holographic interface elements', 'data stream visualizations'],
    social: ['engagement icons floating', 'notification bubbles', 'viral wave effects'],
    finance: ['golden particles', 'chart elements', 'currency symbols floating'],
    nature: ['floating leaves', 'light rays', 'atmospheric particles'],
    urban: ['city light bokeh', 'neon reflections', 'urban atmosphere'],
    product: ['studio lighting', 'subtle reflections', 'premium atmosphere'],
  }
  
  const secondaryElements = secondaryElementsByEnv[environmentType] || secondaryElementsByEnv.tech
  
  return {
    topicKeywords,
    abstractConcepts,
    emotionalTone: emotion,
    primarySubject,
    secondaryElements,
    environmentType
  }
}

// Generate specific motion descriptions from visual brief
function generateContextualMotions(brief: VisualBrief, segmentType: string): {
  subjectMotions: string[]
  ambientMotions: string[]
  cameraEnhancement: string
} {
  const { primarySubject, secondaryElements, environmentType, emotionalTone } = brief
  
  // Environment-specific motion libraries
  const envMotions: Record<string, { subject: string[], ambient: string[], camera: string }> = {
    tech: {
      subject: [
        `${primarySubject.element} pulses with processing activity`,
        'holographic interface elements shift and update',
        'code streams flow through the scene with cyan glow',
        'data visualization animates showing real-time changes',
        'digital nodes connect with flowing light beams'
      ],
      ambient: [
        'floating digital particles drift through volumetric light',
        'subtle blue ambient glow pulses rhythmically',
        'holographic elements shimmer with scan-line effects',
        'data stream particles flow in background'
      ],
      camera: 'subtle parallax drift revealing depth layers'
    },
    social: {
      subject: [
        `${primarySubject.element} animates with viral energy`,
        'engagement icons float upward with momentum',
        'notification bubbles appear and pulse',
        'counter numbers increment rapidly',
        'content thumbnails materialize with sparkle effects'
      ],
      ambient: [
        'social icons drift through atmosphere',
        'subtle glow pulses with engagement rhythm',
        'particle effects suggest viral spreading',
        'light streaks indicate momentum and growth'
      ],
      camera: 'dynamic tracking following energy flow'
    },
    finance: {
      subject: [
        `${primarySubject.element} glows with value`,
        'chart lines animate upward with trailing glow',
        'golden particles accumulate showing growth',
        'currency symbols rotate revealing detail',
        'investment visualization updates in real-time'
      ],
      ambient: [
        'golden light particles drift through scene',
        'subtle wealth atmosphere with warm glow',
        'premium lighting shifts emphasizing value',
        'prosperity particles catch light beams'
      ],
      camera: 'slow confident push-in toward focal point'
    },
    nature: {
      subject: [
        'leaves rustle and sway in gentle breeze',
        'water surface creates expanding ripples',
        'sunbeams shift through atmospheric haze',
        'organic elements grow and expand naturally'
      ],
      ambient: [
        'dust motes float through shafts of sunlight',
        'dappled light shifts as clouds pass',
        'atmospheric haze drifts slowly',
        'natural particles drift on air currents'
      ],
      camera: 'gentle breathing motion - subtle in/out rhythm'
    },
    urban: {
      subject: [
        'city lights create bokeh patterns',
        'neon signs pulse with electric energy',
        'traffic creates light trail streaks',
        'urban elements animate with city rhythm'
      ],
      ambient: [
        'city light bokeh shifts with camera movement',
        'atmospheric haze catches neon glow',
        'steam rises from street elements',
        'urban particles drift through scene'
      ],
      camera: 'subtle handheld micro-shake for documentary feel'
    },
    product: {
      subject: [
        `${primarySubject.element} rotates slowly revealing detail`,
        'product surface catches shifting specular highlights',
        'premium materials show quality through motion',
        'features highlight with subtle animation'
      ],
      ambient: [
        'studio lighting shifts to emphasize features',
        'subtle reflections move across surfaces',
        'premium dust particles catch rim lighting',
        'soft shadows rotate with product'
      ],
      camera: 'smooth cinematic orbit emphasizing premium quality'
    },
  }
  
  const motions = envMotions[environmentType] || envMotions.tech
  
  // Pick 3 subject motions and 3 ambient motions
  const shuffledSubject = [...motions.subject].sort(() => Math.random() - 0.5)
  const shuffledAmbient = [...motions.ambient].sort(() => Math.random() - 0.5)
  
  return {
    subjectMotions: shuffledSubject.slice(0, 3),
    ambientMotions: shuffledAmbient.slice(0, 3),
    cameraEnhancement: motions.camera
  }
}

function buildCinematicVideoPrompt(params: VideoPromptParams): string {
  const {
    segment,
    segmentType,
    emotion,
    scriptText: rawScriptText,
    language,
    aspectRatio,
    environment,
    platform,
    duration,
    topic = '',
    voiceCharacter: voiceCharacterParam,
    // ========================================================================
    // NEW: Face Anchor params (2026)
    // ========================================================================
    hasProfileImage = false,
    profileImageUrl = '',
    creatorGender = 'male',
    characterDescription: charDescParam = ''
  } = params
  
  // Check model family — each has different prompt requirements
  const isSoraModel = platform.startsWith('sora-')
  const isGrokModel = platform === 'grok-3'
  const platformLabel = isSoraModel ? 'SORA 2' : isGrokModel ? 'GROK 3' : 'VEO 3.1'
  
  // ========================================================================
  // DURATION FIX (2026): Get closest valid duration from model config
  // This ensures duration is always valid and within model limits
  // ========================================================================
  const modelConfig = VIDEO_MODELS[platform]
  const safeDuration = modelConfig 
    ? getClosestDuration(modelConfig, safeParseDuration(duration, 8))
    : safeParseDuration(duration, 8)
  
  console.log(`[VIDEO-PROMPT] Platform: ${platform}, Input duration: ${duration}, Safe duration: ${safeDuration}s`)
  
  // ========================================================================
  // SCRIPT TEXT - No truncation here, handled by frontend
  // ========================================================================
  const scriptText = rawScriptText || ''

  // Extract segment data
  // Truncate visual_direction to first 300 chars for STARTING FRAME (full image prompts are too long)
  const rawVisualDirection = segment.visual_direction || segment.visualDirection || ''
  const visualDirection = rawVisualDirection.length > 300 
    ? rawVisualDirection.substring(0, 300).trim() + '...'
    : rawVisualDirection
  const transitionType = segment.transition || 'hold'
  const segmentNumber = segment.segment_number || 1
  const segmentId = segment.segment_id || segment.id || 'CLIP'
  
  // ========================================================================
  // VOICE CHARACTER ANCHOR - Same voice for ALL segments
  // ========================================================================
  const creatorAppearance = segment.creator_appearance || segment.character_description || charDescParam || ''
  const detectedLanguage = scriptText ? detectScriptLanguage(scriptText) : language.toLowerCase()
  const voiceChar = voiceCharacterParam 
    ? JSON.parse(voiceCharacterParam) as VoiceCharacter
    : generateVoiceCharacter(detectedLanguage, creatorAppearance)
  const voiceAnchor = buildVoiceCharacterAnchor(voiceChar, isSoraModel)
  
  // ========================================================================
  // CRITICAL: Determine if this is a CREATOR SHOT or B-ROLL
  // Only HOOK and CTA show creator face with dialogue
  // All other segments (FORE, BODY, PEAK, etc.) are B-roll without creator face
  // ========================================================================
  const CREATOR_SEGMENTS = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA']
  const segmentTypeUpper = segmentType.toUpperCase()
  const isCreatorSegment = CREATOR_SEGMENTS.includes(segmentTypeUpper)
  
  // ========================================================================
  // FACE ANCHOR - Only for CREATOR segments (2026)
  // Uses generateFaceAnchor from audioDirective.ts
  // ========================================================================
  let faceAnchorBlock = ''
  let skipReferenceImageForSora = false
  
  // Get actual values from segment or params (job record values take precedence)
  const actualHasProfileImage = segment.has_profile_image ?? hasProfileImage
  const actualProfileImageUrl = segment.profile_image_url || profileImageUrl
  const actualCreatorGender = (segment.creator_gender || creatorGender) as 'male' | 'female'
  const actualCharacterDescription = segment.character_description || charDescParam || creatorAppearance
  
  if (isCreatorSegment && actualHasProfileImage) {
    if (isSoraModel && actualProfileImageUrl) {
      const looksLikeRealPhoto = /profile|avatar|photo|user|face/i.test(actualProfileImageUrl)
      if (looksLikeRealPhoto) {
        console.warn(`[VIDEO-PROMPT] ⚠️ SORA GUARDRAILS WARNING: CREATOR segment ${segmentType} has profile image URL that may be a real photo.`)
        skipReferenceImageForSora = true
      }
    }
    
    if (isSoraModel && skipReferenceImageForSora) {
      faceAnchorBlock = generateFaceAnchor({
        hasProfileImage: false,
        gender: actualCreatorGender,
        characterDescription: simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
      })
    } else {
      faceAnchorBlock = generateFaceAnchor({
        hasProfileImage: true,
        profileImageUrl: actualProfileImageUrl,
        gender: actualCreatorGender,
        characterDescription: isSoraModel 
          ? simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
          : actualCharacterDescription
      })
    }
  } else if (isCreatorSegment && actualCharacterDescription) {
    faceAnchorBlock = generateFaceAnchor({
      hasProfileImage: false,
      gender: actualCreatorGender,
      characterDescription: isSoraModel
        ? simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
        : actualCharacterDescription
    })
  }
  
  console.log(`[VIDEO-PROMPT] Segment: ${segmentType}, isCreatorSegment: ${isCreatorSegment}, voiceGender: ${voiceChar.gender}, hasDialogue: ${scriptText.length > 0}`)
  
  // Extract enhanced data (new fields)
  const propsDescription = segment.props_description || segment.propsDescription || undefined
  const backgroundDescription = segment.background_description || segment.backgroundDescription || undefined
  const timeOfDay = segment.time_of_day || segment.timeOfDay || 'soft natural light'
  const lightingDescription = segment.lighting_description || segment.lightingDescription || undefined
  const soundEffects = segment.sound_effects || segment.soundEffects || undefined
  const outputIntent = segment.output_intent || segment.outputIntent || undefined
  
  // ========================================================================
  // GROK 3 ROUTING — Aurora engine needs motion-only, positive-language prompts
  // ========================================================================
  if (isGrokModel) {
    const grokParams = {
      segmentType,
      emotion,
      duration: safeDuration,
      aspectRatio,
      visualDirection,
      dialogue: scriptText,
      environment,
      isCreatorShot: isCreatorSegment,
      hasTextOverlay: false,
      language: detectedLanguage,
      creatorGender: actualCreatorGender,
      voiceCharacter: voiceChar,
    }

    if (isCreatorSegment) {
      return buildGrokCreatorPrompt(grokParams)
    } else {
      return buildGrokBrollPrompt(grokParams)
    }
  }

  // ========================================================================
  // CREATOR SEGMENT (HOOK, CTA) - Shows creator face with dialogue
  // ========================================================================
  if (isCreatorSegment) {
    const characterName = segment.character_name || 'Creator'

    // SORA SANITIZATION: Use simplified character description
    const characterDescription = isSoraModel
      ? simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
      : actualCharacterDescription || undefined
    
    // Resolution based on aspect ratio (dynamic)
    const resolution = aspectRatio === '16:9' ? '1080p' : '720p'
    
    // Get camera movement
    const cameraMove = getCameraMovement(segmentType, emotion)
    
    // ========================================================================
    // FIX: Include actual dialogue + voice character in audio directive
    // ========================================================================
    const creatorAudioDirective = getCreatorAudioDirective(
      detectedLanguage,
      scriptText, // Pass the actual script text
      segmentTypeUpper,
      emotion,
      voiceChar // Pass voice character for consistency
    )
    
    // Build the custom prompt with anchors
    const { label: langLabel, name: langName } = getLanguageLabel(detectedLanguage)

    let prompt = `[${platformLabel} PROMPT — ${segmentTypeUpper}.${segmentNumber}]

═══════════════════════════════════════
LANGUAGE: ${langLabel}
ALL speech in this video MUST be in ${langName}.
Do NOT switch to other languages even if technical terms appear.
Pronounce technical terms with ${langName} phonetics.
═══════════════════════════════════════

═══════════════════════════════════════
VOICE ANCHOR (MANDATORY — identical voice for ALL segments)
${voiceAnchor}
CRITICAL: This EXACT voice must sound IDENTICAL to every other
segment in this video series. Same pitch, same accent, same age,
same speaking style. Do NOT vary the voice between segments.
═══════════════════════════════════════

DURATION: ${safeDuration} seconds
RESOLUTION: ${resolution}
ASPECT: ${aspectRatio}

`

    // Add FACE ANCHOR if available
    if (faceAnchorBlock) {
      prompt += faceAnchorBlock + '\n\n'
    }
    
    // Add rest of prompt
    prompt += `STARTING FRAME:
Continue from the provided image. ${characterDescription ? `Character: ${characterDescription}.` : ''} ${visualDirection || 'Direct eye contact with camera.'}

CAMERA:
${cameraMove.promptPhrase}. Eye-level, direct to camera. All key elements remain in frame.

SETTING & LIGHTING:
${timeOfDay}, professional ${environment} lighting. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment.

ACTION SEQUENCE:
- (0s-${Math.floor(safeDuration * 0.25)}s): ${characterName} begins speaking, establishes ${emotion} expression
- (${Math.floor(safeDuration * 0.25)}s-${Math.floor(safeDuration * 0.7)}s): Natural hand gestures while delivering key message
- (${Math.floor(safeDuration * 0.7)}s-${safeDuration}s): Concluding expression, maintains eye contact

${creatorAudioDirective}

CONTINUITY NOTES:
- Maintain exact lighting and color grade from reference image
- Character face MUST match reference image exactly (no identity drift)
- Natural micro-expressions: subtle blinks, breathing, head movements
- ${actualHasProfileImage ? 'Use reference image as face anchor' : 'Maintain consistent character appearance'}

TRANSITION:
${getTransition(transitionType)}

OUTPUT INTENT:
${segmentTypeUpper === 'HOOK' ? 'Grab attention immediately. Create curiosity and stop the scroll.' : 'Drive action. Warm, inviting call-to-action that converts viewers.'}

EXCLUSIONS:
No text overlays, no subtitles, no morphing, no identity changes, no artifacts.`
    
    // SORA FINAL SANITIZATION
    if (isSoraModel) {
      prompt = sanitizeForSora(prompt)
    }
    
    return prompt
  }
  
  // ========================================================================
  // B-ROLL SEGMENT (FORE, BODY, PEAK, etc.) - NO creator face
  // ENHANCED: Use Visual Brief extraction for contextual motion descriptions
  // ========================================================================
  
  // Extract Visual Brief from script and topic
  const visualBrief = extractVisualBrief(scriptText || topic, topic, emotion)
  
  // Generate contextual motions based on visual brief
  const contextualMotions = generateContextualMotions(visualBrief, segmentType)
  
  // Build B-roll specific prompt (SIMPLIFIED 2026)
  // Include voiceChar for consistent voiceover across all segments
  const brollPrompt = buildEnhancedBrollVideoPrompt({
    segmentId,
    segmentNumber,
    duration: safeDuration,
    aspectRatio,
    segmentType,
    emotion,
    environment,
    timeOfDay,
    lightingDescription,
    visualDirection,
    propsDescription,
    outputIntent,
    transition: transitionType,
    platform,
    language: detectedLanguage,
    scriptText,
    visualBrief,
    contextualMotions,
    topic,
    voiceCharacter: voiceChar
  })
  
  return brollPrompt
}

// ============================================================================
// ENHANCED B-ROLL VIDEO PROMPT BUILDER (2026)
// Uses Visual Brief extraction for contextual, specific motion descriptions
// ============================================================================

// FIX (2026-01-17): voiceCharacter kept for voice consistency, but audio directive now
// explicitly states OFF-SCREEN NARRATION to prevent people appearing in B-ROLL
// FIX (2026-03-09): Added language for explicit language enforcement in prompts
interface EnhancedBrollPromptParams {
  segmentId: string
  segmentNumber: number
  duration: number
  aspectRatio: '9:16' | '16:9'
  segmentType: string
  emotion: string
  environment: string
  timeOfDay?: string
  lightingDescription?: string
  visualDirection?: string
  propsDescription?: string
  outputIntent?: string
  transition: string
  platform: VideoModelKey
  language: string  // For explicit language enforcement in audio directives
  scriptText?: string  // Used for voiceover text (off-screen narration)
  visualBrief: VisualBrief
  contextualMotions: {
    subjectMotions: string[]
    ambientMotions: string[]
    cameraEnhancement: string
  }
  topic: string
  voiceCharacter?: VoiceCharacter  // For OFF-SCREEN voiceover consistency (narrator not visible)
}

function buildEnhancedBrollVideoPrompt(params: EnhancedBrollPromptParams): string {
  const {
    segmentId,
    segmentNumber,
    duration,
    aspectRatio,
    segmentType,
    emotion,
    environment,
    timeOfDay = 'soft natural light',
    lightingDescription,
    visualDirection,
    propsDescription,
    outputIntent,
    transition,
    platform,
    language: detectedLanguage,
    scriptText = '',
    visualBrief,
    contextualMotions,
    topic,
    voiceCharacter
  } = params

  const hasVoiceover = scriptText && scriptText.trim().length > 0
  const cameraMove = getCameraMovement(segmentType, emotion)
  const resolution = aspectRatio === '16:9' ? '1080p' : '720p'

  // Visual description
  const primaryVisual = visualBrief.primarySubject.element
  const visualDesc = visualDirection ||
    `${primaryVisual} ${visualBrief.primarySubject.action} in ${visualBrief.environmentType} setting`

  const lightingLine = lightingDescription || `${timeOfDay}, ${environment} lighting`
  const actualOutputIntent = outputIntent || generateBrollOutputIntent(segmentType)

  // Get audio directive with voice character for consistency
  const brollCategory = detectBRollCategory(visualDesc)
  const brollVoiceChar = voiceCharacter ? {
    gender: voiceCharacter.gender,
    age: voiceCharacter.age,
    accent: voiceCharacter.accent,
    tone: voiceCharacter.tone,
    pace: voiceCharacter.pace,
    description: voiceCharacter.description
  } : undefined
  const brollAudioDirective = getBRollAudioDirective(
    detectedLanguage,
    brollCategory,
    emotion,
    hasVoiceover,
    hasVoiceover ? scriptText : '',
    brollVoiceChar
  )
  
  const isSoraModel = platform.startsWith('sora-')
  // Format: [VEO 3.1 - BODY-2 B-ROLL] for easy traceback
  const platformBase = isSoraModel ? 'SORA 2' : 'VEO 3.1'
  const segmentLabel = segmentType.toUpperCase()

  // ============================================================================
  // SIMPLIFIED PROMPT FORMAT (2026) - ~30 lines vs ~60 lines before
  // Removed: PHYSICS section, verbose SUBJECT/AMBIENT MOTION, redundant exclusions
  // FIX (2026-01-17): Added explicit NO PEOPLE instruction in STARTING FRAME
  // FIX (2026-03-09): Added explicit LANGUAGE block for language consistency
  // ============================================================================
  const { label: langLabel, name: langName } = getLanguageLabel(detectedLanguage)

  return `[${platformBase} - ${segmentLabel} B-ROLL]

═══════════════════════════════════════
LANGUAGE: ${langLabel}
ALL narration in this video MUST be in ${langName}.
Do NOT switch to other languages.
═══════════════════════════════════════

⚠️ THIS IS B-ROLL FOOTAGE: NO lip-sync, NO talking, NO speaking to camera. Voiceover is OFF-SCREEN only.

DURATION: ${duration}s | ${resolution} | ${aspectRatio}

STARTING FRAME:
From reference image — ${visualDesc}. ${propsDescription ? `Props: ${propsDescription}.` : ''}
Focus: ${primaryVisual}, ${visualBrief.primarySubject.attributes.join(', ')}.
IMPORTANT: If people appear, they must NOT be talking or lip-syncing. Voice is off-screen narration only.

CAMERA:
${cameraMove.promptPhrase}. ${contextualMotions.cameraEnhancement}.

LIGHTING: ${lightingLine}

MOTION:
- Subject: ${contextualMotions.subjectMotions[0]}
- Ambient: ${contextualMotions.ambientMotions[0]}
- Secondary: ${contextualMotions.subjectMotions[1] || 'subtle movement'}

${brollAudioDirective}

TRANSITION: ${getTransition(transition)}

INTENT: ${actualOutputIntent}

NEGATIVE: blurry, distortion, text overlays, subtitles, watermarks, lip-sync, speaking to camera, mouths moving, on-screen speaker, talking head, static frames`
}

function generateBrollOutputIntent(segmentType: string): string {
  const intents: Record<string, string> = {
    'FORE': 'Set the visual context. Create anticipation for upcoming content without revealing too much.',
    'FORESHADOW': 'Plant visual seeds. Build curiosity through mysterious or intriguing imagery.',
    'BODY': 'Support the narrative visually. Provide B-roll that enhances the story without distraction.',
    'BODY-1': 'Illustrate the first key point visually. Make abstract concepts tangible.',
    'BODY-2': 'Continue visual storytelling. Maintain engagement through compelling imagery.',
    'BODY-3': 'Build toward climax. Visual energy should increase toward the peak.',
    'BODY-4': 'Reinforce the message. Add visual evidence and support.',
    'BODY-5': 'Final content delivery. Maximum visual impact before conclusion.',
    'PEAK': 'Maximum visual impact. This is the climactic B-roll moment.',
    'TWIST': 'Revelation moment. Visual should support the surprising information.',
    'ENDING': 'Provide visual resolution. Satisfy the viewer with a complete visual arc.'
  }
  
  return intents[segmentType.toUpperCase()] || intents['BODY']
}
