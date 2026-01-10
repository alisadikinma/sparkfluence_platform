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
} from '../_shared/prompts/cinematicVideoKnowledge.ts'

// Import Voice & Face Anchor functions (2026 - Sora 2 Consistency + Enhanced Audio)
import {
  generateFaceAnchor,
  getCreatorAudioDirective,
  getBRollAudioDirective,
  detectBRollCategory,
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
  // DEFAULT = VEO 3.1 for best lip-sync quality (8s, 720p/1080p)
  const platformMap: Record<string, VideoModelKey> = {
    'veo31': 'veo-3.1-fast',     // VEO 3.1 Fast (8s, best lip-sync)
    'sora2': 'sora-2',           // Standard Sora 2 (10s/15s, 720p)
    'sora2-hd': 'sora-2-pro-hd', // HD version (15s, 1080p)
    'sora2-pro': 'sora-2-pro',   // Pro version (25s, 720p)
    'auto': 'veo-3.1-fast'       // Default to VEO 3.1 for consistent quality
  }
  const selectedPlatformForAll = platformMap[preferred_platform] || 'veo-3.1-fast'

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
    prompt: string
  }> = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentId = segment.segment_id || segment.id || String(i + 1)
    const segmentType = segment.segment_type || segment.type || segment.element || `SEGMENT_${i + 1}`
    const scriptText = segment.script_text || segment.script || ''
    const duration = segment.duration_seconds || 8
    const emotion = segment.emotion || 'authority'
    const shotType = segment.shot_type || 'B-ROLL'
    const imageUrl = segment.image_url || segment.imageUrl || null
    const hasDialogue = scriptText.length > 0

    // Determine platform - ALL segments use the same platform for consistent quality
    const selectedPlatform: VideoModelKey = selectedPlatformForAll

    const modelSpecs = VIDEO_MODELS[selectedPlatform]

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
      duration: Math.min(duration, modelSpecs.maxDuration),
      // ========================================================================
      // NEW: Face Anchor params (2026)
      // ========================================================================
      hasProfileImage,
      profileImageUrl: profile_image_url || '',
      creatorGender: creator_gender as 'male' | 'female',
      characterDescription: character_description
    })

    // Validate dialogue length
    const dialogueValidation = scriptText ? validateDialogueLength(scriptText, selectedPlatform) : { valid: true, wordCount: 0, maxWords: 0 }

    prompts.push({
      segment_id: segmentId,
      segment_number: segment.segment_number || i + 1,
      segment_type: segmentType,
      shot_type: shotType,
      platform: selectedPlatform,
      platform_name: modelSpecs.displayName,
      duration: Math.min(duration, modelSpecs.maxDuration),
      max_duration: modelSpecs.maxDuration,
      resolution: Object.keys(modelSpecs.resolutions)[0] || '720p', // Get first resolution key
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
    // NEW: Avatar/Face selection from UI (2026)
    // ========================================================================
    avatar_selection = 'no_avatar', // 'no_avatar' | 'use_profile' | 'upload_new'
    profile_image_url = null,       // URL to profile image (if use_profile or upload_new)
    creator_gender = 'male',        // 'male' | 'female' - from user profile
    character_description = '',     // Text description of creator (fallback if no image)
  } = requestBody

  if (!user_id || !session_id || !segments || !Array.isArray(segments)) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing user_id, session_id, or segments' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CREATE_JOBS] Creating ${segments.length} video jobs for session: ${session_id}, preferred_platform: ${preferred_platform}`)

  // Map user selection to actual platform key
  // DEFAULT = VEO 3.1 for best lip-sync quality (8s, 720p/1080p)
  const platformMap: Record<string, VideoModelKey> = {
    'veo31': 'veo-3.1-fast',     // VEO 3.1 Fast (8s, best lip-sync)
    'sora2': 'sora-2',           // Standard Sora 2 (10s/15s, 720p)
    'sora2-hd': 'sora-2-pro-hd', // HD version (15s, 1080p)
    'sora2-pro': 'sora-2-pro',   // Pro version (25s, 720p)
    'auto': 'veo-3.1-fast'       // Default to VEO 3.1 for consistent quality
  }
  const selectedPlatformForAll = platformMap[preferred_platform] || 'veo-3.1-fast'

  // ========================================================================
  // VOICE CHARACTER CONSISTENCY FIX:
  // Generate voice character ONCE for entire session, store in all job records
  // This ensures the same voice is used across HOOK, BODY, CTA segments
  // ========================================================================
  
  // Try to detect language from first segment with script text
  let detectedLanguage = language.toLowerCase()
  const firstScriptSegment = segments.find((s: any) => s.script_text || s.script)
  if (firstScriptSegment) {
    const scriptText = firstScriptSegment.script_text || firstScriptSegment.script || ''
    detectedLanguage = detectScriptLanguage(scriptText)
  }
  
  // Try to get creator appearance from segments or request body
  const creatorAppearanceStr = creator_appearance || 
    segments.find((s: any) => s.creator_appearance || s.character_description)?.creator_appearance ||
    segments.find((s: any) => s.creator_appearance || s.character_description)?.character_description ||
    ''
  
  // Generate ONE voice character for entire session
  const sessionVoiceCharacter = generateVoiceCharacter(detectedLanguage, creatorAppearanceStr)
  const voiceCharacterJson = JSON.stringify(sessionVoiceCharacter)
  
  console.log(`[CREATE_JOBS] 🎤 Session voice character: ${sessionVoiceCharacter.gender}, ${sessionVoiceCharacter.age}, ${detectedLanguage}`)
  console.log(`[CREATE_JOBS] 👤 Avatar selection: ${avatar_selection}, hasProfileImage: ${avatar_selection !== 'no_avatar'}`)

  // Determine if profile image is available
  const hasProfileImage = avatar_selection !== 'no_avatar' && profile_image_url !== null
  const actualCharacterDescription = character_description || creatorAppearanceStr

  // Create job records with SAME voice character for all
  const jobRecords = segments.map((segment: any, index: number) => {
    const segmentId = segment.segment_id || segment.id || String(index + 1)
    const segmentType = segment.segment_type || segment.type || segment.element || `SEGMENT_${index + 1}`
    const scriptText = segment.script_text || segment.script || ''
    const imageUrl = segment.image_url || segment.imageUrl
    const duration = segment.duration_seconds || 8
    const emotion = segment.emotion || 'authority'
    const shotType = segment.shot_type || 'B-ROLL'

    return {
      user_id,
      session_id,
      segment_id: segmentId,
      segment_number: segment.segment_number || index + 1,
      segment_type: segmentType,
      shot_type: shotType,
      emotion,
      script_text: scriptText,
      image_url: imageUrl,
      duration_seconds: duration,
      language,
      aspect_ratio,
      resolution,
      environment,
      topic,
      preferred_platform: selectedPlatformForAll, // Store resolved platform (always VEO for auto)
      voice_character: voiceCharacterJson, // SAME voice for ALL segments
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

  // Upsert all jobs (update if exists)
  const { data: jobs, error: insertError } = await supabase
    .from('video_generation_jobs')
    .upsert(jobRecords, {
      onConflict: 'session_id,segment_id',
      ignoreDuplicates: false
    })
    .select()

  if (insertError) {
    console.error('[CREATE_JOBS] Insert error:', insertError)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: insertError.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CREATE_JOBS] ✅ Created/updated ${jobs?.length || segments.length} jobs`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        jobs: jobs || jobRecords,
        session_id,
        total_jobs: segments.length,
        message: 'Jobs created successfully. Start processing with process_single mode.'
      } 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleProcessSingle(supabase: any, requestBody: any) {
  const { job_id, session_id, user_id } = requestBody

  const veoApiKey = Deno.env.get('VEO_API_KEY')
  if (!veoApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'VEO_API_KEY not configured' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ============================================================================
  // STAGGERED PARALLEL MODE (2026): Allow parallel processing when job_id specified
  // Sequential mode (no job_id): Still blocks if another job is processing
  // Parallel mode (with job_id): Process specific job regardless of others
  // ============================================================================
  
  // Find job to process
  let job: any = null

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
    
    // Check if job is already processing or completed
    if (data.status === JOB_STATUS.PROCESSING) {
      console.log(`[PROCESS_SINGLE] Job ${job_id} already processing, returning current state`)
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
    
    job = data
    console.log(`[PROCESS_SINGLE] 🎯 PARALLEL MODE: Processing specific job ${job_id} (${data.segment_type})`)
    
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

  // Check if job has image
  if (!job.image_url) {
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
    const duration = job.duration_seconds || 8
    const segmentType = job.segment_type || ''
    const shotType = job.shot_type || 'B-ROLL'
    const isCreatorShot = shotType === 'CREATOR'
    const hasDialogue = scriptText.length > 0

    // Select platform - USE PREFERRED_PLATFORM from job (already resolved, defaults to VEO 3.1)
    const selectedPlatform: VideoModelKey = (job.preferred_platform as VideoModelKey) || 'veo-3.1-fast'
    console.log(`[PROCESS_SINGLE] Using platform: ${selectedPlatform}`)

    const modelSpecs = VIDEO_MODELS[selectedPlatform]

    // Build prompt - USE STORED VOICE CHARACTER for consistency across all segments
    // Also pass Face Anchor params from job record (2026)
    const videoPrompt = buildCinematicVideoPrompt({
      segment: job,
      segmentType,
      emotion,
      scriptText,
      language: job.language || 'indonesian',
      aspectRatio: job.aspect_ratio || '9:16',
      environment: job.environment || 'studio',
      platform: selectedPlatform,
      duration: Math.min(duration, modelSpecs.maxDuration),
      voiceCharacter: job.voice_character, // Use stored voice character from session
      // ========================================================================
      // NEW: Face Anchor params from job record (2026)
      // ========================================================================
      hasProfileImage: job.has_profile_image || false,
      profileImageUrl: job.profile_image_url || '',
      creatorGender: job.creator_gender || 'male',
      characterDescription: job.character_description || ''
    })

    console.log(`[PROCESS_SINGLE] Platform: ${selectedPlatform}, Prompt length: ${videoPrompt.length}`)

    // ========================================================================
    // BUILD FORM DATA USING CENTRALIZED CONFIG (2026)
    // API params differ between providers - config handles the mapping
    // ========================================================================
    const aspectRatioInternal = (job.aspect_ratio || '9:16') as AspectRatio
    const actualDuration = getClosestDuration(modelSpecs, duration)
    
    // Use helper from config to build FormData with correct API values
    const formData = buildVideoFormData(modelSpecs, {
      prompt: videoPrompt,
      aspectRatio: aspectRatioInternal,
      duration: actualDuration,
      referenceImageUrl: job.image_url
    })
    
    console.log(`[PROCESS_SINGLE] API: ${modelSpecs.endpoint}, model: ${modelSpecs.apiModelName}, duration: ${actualDuration}s`)

    const apiResponse = await fetch(modelSpecs.endpoint, {
      method: 'POST',
      headers: { 'x-api-key': veoApiKey },
      body: formData
    })

    const responseText = await apiResponse.text()

    if (!apiResponse.ok) {
      // Check for rate limit error
      if (responseText.includes('GEMINI_RATE_LIMIT') || responseText.includes('high traffic')) {
        throw new Error('RATE_LIMIT: Server sedang sibuk. Silakan coba lagi dalam 10 menit.')
      }
      throw new Error(`VEO API error: ${apiResponse.status} - ${responseText}`)
    }

    const responseData = JSON.parse(responseText)
    const veoUuid = responseData.uuid

    console.log(`[PROCESS_SINGLE] ✅ Job ${job.id} submitted to VEO: UUID=${veoUuid}`)

    // Update job with UUID (status stays PROCESSING until video is ready)
    await supabase
      .from('video_generation_jobs')
      .update({ 
        veo_uuid: veoUuid,
        platform: selectedPlatform,
        prompt: videoPrompt.substring(0, 1000),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          job: {
            id: job.id,
            segment_number: job.segment_number,
            segment_type: job.segment_type,
            veo_uuid: veoUuid,
            platform: selectedPlatform,
            status: JOB_STATUS.PROCESSING
          },
          message: 'Job submitted to VEO. Poll check_and_update to get video URL.'
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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

  const veoApiKey = Deno.env.get('VEO_API_KEY')
  if (!veoApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'VEO_API_KEY not configured' } }),
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

  console.log(`[CHECK_AND_UPDATE] Checking ${processingJobs.length} processing jobs`)

  // Check status for all UUIDs
  const uuids = processingJobs.map((j: any) => j.veo_uuid)
  
  const { data: statusData } = await supabase.functions.invoke('check-video-status', {
    body: { video_uuids: uuids, update_db: true }
  })

  const updatedJobs: any[] = []

  if (statusData?.data?.videos) {
    for (const videoInfo of statusData.data.videos) {
      const job = processingJobs.find((j: any) => j.veo_uuid === videoInfo.uuid)
      if (!job) continue

      if (videoInfo.status === 2 && videoInfo.video_url) {
        // Completed
        await supabase
          .from('video_generation_jobs')
          .update({ 
            status: JOB_STATUS.COMPLETED, 
            video_url: videoInfo.video_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
        
        updatedJobs.push({ ...job, status: JOB_STATUS.COMPLETED, video_url: videoInfo.video_url })
        console.log(`[CHECK_AND_UPDATE] ✅ Job ${job.id} completed: ${videoInfo.video_url}`)
        
      } else if (videoInfo.status === 3) {
        // Failed
        await supabase
          .from('video_generation_jobs')
          .update({ 
            status: JOB_STATUS.FAILED, 
            error_message: videoInfo.error_message || 'Video generation failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
        
        updatedJobs.push({ ...job, status: JOB_STATUS.FAILED })
        console.log(`[CHECK_AND_UPDATE] ❌ Job ${job.id} failed`)
      } else {
        // Still processing
        updatedJobs.push({ ...job, status_percentage: videoInfo.status_percentage || 0 })
      }
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
    const duration = segment.duration_seconds || 8
    
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

    const shotType = segment.shot_type || 'B-ROLL'
    const isCreatorShot = shotType === 'CREATOR' || ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType.toUpperCase())
    const hasDialogue = scriptText.length > 0

    // Always use VEO 3.1 for best lip-sync quality (unless explicitly overridden)
    const selectedPlatform: VideoModelKey = prefer_platform || 'veo-3.1-fast'

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
      duration: Math.min(duration, modelSpecs.maxDuration)
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
        await supabase
          .from('video_generation_jobs')
          .upsert({
            user_id,
            session_id,
            segment_id: segmentId,
            segment_type: segmentType,
            veo_uuid: responseData.uuid,
            platform: selectedPlatform,
            status: 1,
            prompt: videoPrompt.substring(0, 1000),
            image_url: imageUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id,segment_id',
            ignoreDuplicates: false
          })
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

function buildVoiceCharacterAnchor(voiceChar: VoiceCharacter, isSora: boolean = false): string {
  // For Sora: Skip age to avoid content moderation flags
  if (isSora) {
    return `VOICE CHARACTER:
Gender: ${voiceChar.gender}
Accent: ${voiceChar.accent}
Tone: ${voiceChar.tone}
Pace: ${voiceChar.pace}

Maintain this voice character throughout the video.`
  }
  
  return `═══════════════════════════════════════════════════════════════
VOICE CHARACTER ANCHOR (MUST MAINTAIN ACROSS ALL SEGMENTS)
═══════════════════════════════════════════════════════════════
Voice Profile: ${voiceChar.description}
Gender: ${voiceChar.gender}
Age: ${voiceChar.age}
Accent: ${voiceChar.accent}
Tone: ${voiceChar.tone}
Pace: ${voiceChar.pace}

CRITICAL: This EXACT voice character must be used for ALL audio in this video.
Do NOT change voice characteristics between segments.
═══════════════════════════════════════════════════════════════`
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
    voiceCharacter: voiceCharacterParam,
    // ========================================================================
    // NEW: Face Anchor params (2026)
    // ========================================================================
    hasProfileImage = false,
    profileImageUrl = '',
    creatorGender = 'male',
    characterDescription: charDescParam = ''
  } = params
  
  // Check if using Sora (needs sanitization)
  const isSoraModel = platform.startsWith('sora-')
  
  // ========================================================================
  // VOICEOVER DURATION FIX (2026): Truncate script to fit duration
  // This prevents voiceover from exceeding video length
  // ========================================================================
  const safeDuration = (typeof duration === 'number' && !isNaN(duration) && duration > 0) ? duration : 10
  const maxWords = calculateMaxWords(safeDuration, language)
  const truncationResult = truncateScript(rawScriptText || '', maxWords)
  const scriptText = truncationResult.truncated
  
  if (truncationResult.wasModified) {
    console.log(`[VIDEO-PROMPT] ⚠️ Script truncated: ${truncationResult.originalWords} → ${scriptText.split(/\s+/).length} words (max: ${maxWords} for ${safeDuration}s ${language})`)
  }

  // Extract segment data
  const visualDirection = segment.visual_direction || segment.visualDirection || ''
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
  // 
  // SORA GUARDRAILS FIX: Sora rejects real human face uploads as reference.
  // For CREATOR shots with Sora: use character description only, not profile image URL.
  // The reference image (from DALL-E/Nano Banana) should be AI-generated, not real photo.
  // ========================================================================
  let faceAnchorBlock = ''
  let skipReferenceImageForSora = false
  
  // Get actual values from segment or params (job record values take precedence)
  const actualHasProfileImage = segment.has_profile_image ?? hasProfileImage
  const actualProfileImageUrl = segment.profile_image_url || profileImageUrl
  const actualCreatorGender = (segment.creator_gender || creatorGender) as 'male' | 'female'
  const actualCharacterDescription = segment.character_description || charDescParam || creatorAppearance
  
  if (isCreatorSegment && actualHasProfileImage) {
    // ========================================================================
    // SORA GUARDRAILS: If using Sora + real profile image detected, warn user
    // Sora may reject reference images containing real human faces
    // ========================================================================
    if (isSoraModel && actualProfileImageUrl) {
      // Check if profile image looks like real photo (contains 'profile', 'avatar', 'photo' in URL)
      const looksLikeRealPhoto = /profile|avatar|photo|user|face/i.test(actualProfileImageUrl)
      if (looksLikeRealPhoto) {
        console.warn(`[VIDEO-PROMPT] ⚠️ SORA GUARDRAILS WARNING: CREATOR segment ${segmentType} has profile image URL that may be a real photo. Sora may reject this.`)
        console.warn(`[VIDEO-PROMPT] 💡 TIP: Use AI-generated character image (from DALL-E/Nano Banana) as reference, not real photo.`)
        // Don't include profile image URL in face anchor for Sora - rely on description only
        skipReferenceImageForSora = true
      }
    }
    
    // Generate face anchor - but for Sora, skip profile image URL if it's a real photo
    if (isSoraModel && skipReferenceImageForSora) {
      // Use character description only (no profile image URL)
      faceAnchorBlock = generateFaceAnchor({
        hasProfileImage: false, // Force to description mode
        gender: actualCreatorGender,
        characterDescription: simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
      })
      console.log(`[VIDEO-PROMPT] 🔄 Using character description instead of profile image for Sora`)
    } else {
      // Normal mode: use profile image URL (for non-Sora or AI-generated images)
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
    // Fallback to character description if no profile image
    faceAnchorBlock = generateFaceAnchor({
      hasProfileImage: false,
      gender: actualCreatorGender,
      characterDescription: isSoraModel
        ? simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
        : actualCharacterDescription
    })
  }
  
  console.log(`[VIDEO-PROMPT] Segment: ${segmentType}, isCreatorSegment: ${isCreatorSegment}, voiceGender: ${voiceChar.gender}, hasProfileImage: ${actualHasProfileImage}`)
  
  // Extract enhanced data (new fields)
  const propsDescription = segment.props_description || segment.propsDescription || undefined
  const backgroundDescription = segment.background_description || segment.backgroundDescription || undefined
  const timeOfDay = segment.time_of_day || segment.timeOfDay || 'soft natural light'
  const lightingDescription = segment.lighting_description || segment.lightingDescription || undefined
  const soundEffects = segment.sound_effects || segment.soundEffects || undefined
  const outputIntent = segment.output_intent || segment.outputIntent || undefined
  
  // ========================================================================
  // CREATOR SEGMENT (HOOK, CTA) - Shows creator face with dialogue
  // ========================================================================
  if (isCreatorSegment) {
    const characterName = segment.character_name || 'Creator'
    
    // SORA SANITIZATION: Use simplified character description to avoid content flags
    const characterDescription = isSoraModel 
      ? simplifyCharacterForSora(actualCharacterDescription, actualCreatorGender)
      : actualCharacterDescription || undefined
    
    // Use consistent voice from anchor (voiceChar already contains all voice info)
    
    // Resolution based on aspect ratio (dynamic)
    const resolution = aspectRatio === '16:9' ? '1080p' : '720p'
    
    // Build custom prompt with VOICE_ANCHOR and FACE_ANCHOR blocks
    // NOTE: isSoraModel already declared at function scope - DO NOT redeclare
    const platformLabel = isSoraModel ? 'SORA 2' : 'VEO 3.1'
    const modelConfig = VIDEO_MODELS[platform]
    const actualDuration = modelConfig ? getClosestDuration(modelConfig, duration) : (duration || 10)
    
    // Get camera movement
    const cameraMove = getCameraMovement(segmentType, emotion)
    
    // Build the custom prompt with anchors
    let prompt = `[${platformLabel} PROMPT — ${segmentTypeUpper}.${segmentNumber}]

DURATION: ${actualDuration} seconds
RESOLUTION: ${resolution}
ASPECT: ${aspectRatio}

`
    
    // Add VOICE ANCHOR
    prompt += voiceAnchor + '\n\n'
    
    // Add FACE ANCHOR if available (only for CREATOR shots with profile image)
    if (faceAnchorBlock) {
      prompt += faceAnchorBlock + '\n\n'
    }
    
    // ========================================================================
    // Enhanced Audio Directive (2026) - Emotion-based SFX + Volume Priority
    // ========================================================================
    const creatorAudioDirective = getCreatorAudioDirective(
      detectedLanguage,
      scriptText || '',
      segmentTypeUpper,
      emotion
    )
    
    // Add rest of prompt
    prompt += `STARTING FRAME:
Continue from the provided image. ${characterDescription ? `Character: ${characterDescription}.` : ''} ${visualDirection || 'Direct eye contact with camera.'}

CAMERA:
${cameraMove.promptPhrase}. Eye-level, direct to camera. All key elements remain in frame.

SETTING & LIGHTING:
${timeOfDay}, professional ${environment} lighting. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment.

ACTION SEQUENCE:
- (0s-${Math.floor(actualDuration * 0.3)}s): ${characterName} begins speaking, establishes ${emotion} expression
- (${Math.floor(actualDuration * 0.3)}s-${Math.floor(actualDuration * 0.7)}s): Natural hand gestures while delivering key message
- (${Math.floor(actualDuration * 0.7)}s-${actualDuration}s): Concluding expression, maintains eye contact

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
    
    // SORA FINAL SANITIZATION: Remove any remaining problematic patterns
    if (isSoraModel) {
      prompt = sanitizeForSora(prompt)
    }
    
    return prompt
  }
  
  // ========================================================================
  // B-ROLL SEGMENT (FORE, BODY, PEAK, etc.) - NO creator face, NO dialogue
  // Pure visual motion based on image reference
  // ========================================================================
  
  // Build B-roll specific prompt (voiceover narration + visual fokus topik)
  const brollModelConfig = VIDEO_MODELS[platform]
  const brollActualDuration = brollModelConfig ? getClosestDuration(brollModelConfig, duration) : duration
  const brollPrompt = buildBrollVideoPrompt({
    segmentId,
    segmentNumber,
    duration: brollActualDuration,
    aspectRatio,
    segmentType,
    emotion,
    environment,
    timeOfDay,
    lightingDescription,
    visualDirection,
    backgroundDescription,
    propsDescription,
    soundEffects,
    outputIntent,
    transition: transitionType,
    platform,
    // NEW: Include script for voiceover narration
    scriptText,
    language: detectedLanguage,
    // Voice character for consistency
    voiceCharacter: voiceChar
  })
  
  return brollPrompt
}

// ============================================================================
// B-ROLL VIDEO PROMPT BUILDER (No creator face, no dialogue)
// ============================================================================

interface BrollPromptParams {
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
  backgroundDescription?: string
  propsDescription?: string
  soundEffects?: string
  outputIntent?: string
  transition: string
  platform: VideoModelKey
  // Script text for voiceover narration
  scriptText?: string
  language?: string
  // Voice character for consistency across segments
  voiceCharacter?: VoiceCharacter
}

function buildBrollVideoPrompt(params: BrollPromptParams): string {
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
    backgroundDescription,
    propsDescription,
    soundEffects,
    outputIntent,
    transition,
    platform,
    scriptText = '',
    language = 'english',
    voiceCharacter
  } = params
  
  // Build voiceover section if script exists
  const hasVoiceover = scriptText && scriptText.trim().length > 0
  
  // Get emotion-based motion settings
  const emotionMotion = getEmotionMotion(emotion)
  
  // Get camera movement for segment type
  const cameraMove = getCameraMovement(segmentType, emotion)
  
  // Resolution based on aspect ratio
  const resolution = aspectRatio === '16:9' ? '1080p' : '720p'
  
  // Build visual description from reference image
  const visualDesc = visualDirection || backgroundDescription || `${environment} scene with ${emotion} atmosphere`
  
  // Build props line
  const propsLine = propsDescription ? `Props: ${propsDescription}.` : ''
  
  // Build lighting line
  const lightingLine = lightingDescription || `${timeOfDay}, professional ${environment} lighting`
  
  // Generate output intent if not provided
  const actualOutputIntent = outputIntent || generateBrollOutputIntent(segmentType)
  
  // Build B-roll specific action beats (no character, pure visual motion)
  const actionBeats = generateBrollActionBeats({
    duration,
    segmentType,
    emotion,
    visualDirection,
    emotionMotion
  })
  
  const actionBeatsFormatted = actionBeats.map(beat => `- (${beat.timeRange}): ${beat.action}`).join('\n')
  
  // ========================================================================
  // Enhanced Audio Directive (2026) - Emotion-based SFX + Volume Priority
  // Detect B-roll category from visual direction for appropriate ambient
  // ========================================================================
  const brollCategory = detectBRollCategory(visualDesc)
  const brollAudioDirective = getBRollAudioDirective(
    brollCategory,
    emotion,
    hasVoiceover,
    hasVoiceover ? scriptText : ''
  )
  
  // ========================================================================
  // NEW: Generate environment-specific motion sections for richer animation
  // ========================================================================
  const envCategory = detectEnvironmentCategoryForMotion(visualDesc)
  const envMotion = ENVIRONMENT_MOTION_LIBRARY[envCategory] || ENVIRONMENT_MOTION_LIBRARY.default
  const subjectMotions = getRandomMotionItems(envMotion.subjectMotions, 3)
  const ambientMotions = getRandomMotionItems(envMotion.ambientMotions, 3)
  
  const subjectMotionSection = `SUBJECT MOTION (what specifically animates in this scene):
- Primary: ${subjectMotions[0]}
- Secondary: ${subjectMotions[1]}
- Tertiary: ${subjectMotions[2] || 'subtle environmental movement'}`
  
  const ambientMotionSection = `AMBIENT MOTION (background atmospheric elements):
- ${ambientMotions[0]}
- ${ambientMotions[1]}
- ${ambientMotions[2] || 'light quality shifts subtly'}`
  
  // Platform-specific prompt (check if Sora model)
  const isSoraModel = platform.startsWith('sora-')
  if (isSoraModel) {
    return `[SORA 2 B-ROLL — ${segmentId}.${segmentNumber}]

DURATION: ${duration} seconds
RESOLUTION: 720p
ASPECT: ${aspectRatio}

STARTING FRAME:
Continue from the provided image — ${visualDesc}. ${propsLine} Visual focus on topic/subject matter. NO human face visible.

CAMERA:
${cameraMove.promptPhrase}. ${envMotion.cameraEnhancement}. Stable, cinematic movement.

SETTING & LIGHTING:
${lightingLine}. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment.

${subjectMotionSection}

${ambientMotionSection}

PHYSICS:
${envMotion.physicsNotes}. Single camera movement per shot.

ACTION SEQUENCE:
${actionBeatsFormatted}

${brollAudioDirective}

CONTINUITY NOTES:
- Maintain exact lighting and color grade from reference image
- NO human face should appear - this is B-roll footage
- Visual focus on topic/subject/product, NOT on people
- Every frame must have visible motion - no static shots

TRANSITION:
${getTransition(transition)}

OUTPUT INTENT:
${actualOutputIntent}

EXCLUSIONS:
No text overlays, no human faces, no people on screen, no morphing, no artifacts, no static boring frames.`
  }
  
  // VEO 3.1 B-roll prompt
  return `[VEO 3.1 B-ROLL — ${segmentId}.${segmentNumber}]

DURATION: ${duration} seconds
RESOLUTION: ${resolution}
ASPECT: ${aspectRatio}

STARTING FRAME:
Continue from the provided image — ${visualDesc}. ${propsLine} Visual focus on topic/subject matter. NO human face visible.

CAMERA:
${cameraMove.promptPhrase}. ${envMotion.cameraEnhancement}. Stable tripod, cinematic movement. All key elements remain in frame.

SETTING & LIGHTING:
${lightingLine}. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment clearly visible.

${subjectMotionSection}

${ambientMotionSection}

PHYSICS:
${envMotion.physicsNotes}

ACTION SEQUENCE:
${actionBeatsFormatted}

${brollAudioDirective}

CONTINUITY NOTES:
- Maintain exact lighting and color grade from reference image
- NO human face should appear - this is B-roll footage
- Visual focus on topic/subject/product, NOT on people
- Every frame must have visible motion - no static shots

TRANSITION:
${getTransition(transition)}

OUTPUT INTENT:
${actualOutputIntent}

NEGATIVE:
No blurry elements, no distortion, no artifacts, no text overlays, no human faces, no people on screen, no static boring frames.`
}

// ============================================================================
// ENVIRONMENT-SPECIFIC MOTION LIBRARY (2026)
// Concrete motion descriptions - fixes boring "zoom only" B-roll videos
// ============================================================================

interface EnvironmentMotion {
  subjectMotions: string[]
  ambientMotions: string[]
  physicsNotes: string
  cameraEnhancement: string
}

const ENVIRONMENT_MOTION_LIBRARY: Record<string, EnvironmentMotion> = {
  tech: {
    subjectMotions: [
      'holographic data streams flow upward with glowing cyan particles',
      'code lines scroll rapidly across floating translucent screens',
      'digital interface elements pulse and expand with incoming information',
      'circuit pathways illuminate sequentially like neural network activations',
      'data visualization bars animate upward showing real-time growth',
      '3D wireframe models rotate slowly revealing complex geometric detail',
      'binary numbers cascade downward like digital rain',
      'glowing nodes connect with animated light beams'
    ],
    ambientMotions: [
      'subtle blue and cyan light pulses ripple across reflective surfaces',
      'floating holographic particles drift through the scene',
      'soft lens flares shift as virtual light sources activate',
      'digital grid lines shimmer with processing activity',
      'ambient glow intensifies and dims with data flow rhythm'
    ],
    physicsNotes: 'Digital elements float weightlessly, data flows like liquid light',
    cameraEnhancement: 'subtle parallax drift revealing depth layers'
  },
  data: {
    subjectMotions: [
      'bar chart columns rise sequentially with bounce animation',
      'pie chart segments separate and rotate to highlight portions',
      'line graph traces animate from left to right showing trends',
      'percentage numbers count up rapidly to final values',
      'dashboard widgets flip with new information',
      'infographic icons pop in with bounce animation',
      'progress bars fill smoothly with gradient color shift'
    ],
    ambientMotions: [
      'subtle grid background pulses with data rhythm',
      'connecting lines draw between data points',
      'soft glow emanates from active chart elements',
      'floating numbers drift subtly in background'
    ],
    physicsNotes: 'Elements animate with ease-out curves, numbers increment smoothly',
    cameraEnhancement: 'gentle push toward key data point'
  },
  nature: {
    subjectMotions: [
      'tree leaves rustle and sway gently in the breeze',
      'flower petals flutter and drift through the air',
      'grass blades bend and wave in wind patterns',
      'water surface ripples expand outward from center',
      'clouds drift slowly, edges morphing softly',
      'sunbeams shift through canopy creating moving shadows',
      'birds take flight with realistic wing flaps',
      'butterflies flutter in figure-eight paths'
    ],
    ambientMotions: [
      'dust motes float through shafts of sunlight',
      'pollen drifts lazily on air currents',
      'dappled light shifts as leaves move overhead',
      'morning mist slowly dissipates revealing scene'
    ],
    physicsNotes: 'Wind affects lighter elements more, gravity pulls water naturally',
    cameraEnhancement: 'gentle breathing motion - subtle in/out rhythm'
  },
  urban: {
    subjectMotions: [
      'car headlights streak past creating light trails',
      'pedestrians walk with natural gait across crosswalks',
      'neon signs flicker and pulse with electric energy',
      'traffic lights cycle through colors in sequence',
      'building windows light up sequentially at dusk',
      'steam rises dramatically from food carts',
      'metro train rushes past with motion blur',
      'cyclists weave through traffic smoothly'
    ],
    ambientMotions: [
      'city light bokeh shifts with camera movement',
      'steam rises from subway grates into cold air',
      'rain drops streak down glass windows',
      'pedestrian shadows sweep across walls'
    ],
    physicsNotes: 'Traffic follows lane patterns, people walk 3-4 mph, lights flicker naturally',
    cameraEnhancement: 'subtle handheld micro-shake for documentary feel'
  },
  office: {
    subjectMotions: [
      'computer screens display scrolling content and notifications',
      'coffee steam rises in gentle spiraling wisps',
      'papers shuffle and organize on desk surface',
      'keyboard keys press with typing rhythm',
      'chair swivels slightly indicating recent activity',
      'desk lamp adjusts casting new shadows',
      'phone screen lights up with notification',
      'pen rolls slowly on angled desk surface'
    ],
    ambientMotions: [
      'natural light shifts through window blinds',
      'dust particles float in sunbeam from window',
      'HVAC air current moves light papers',
      'monitor glow pulses with screen changes'
    ],
    physicsNotes: 'Objects have realistic weight, steam rises then dissipates naturally',
    cameraEnhancement: 'slow drift across desk revealing workspace'
  },
  product: {
    subjectMotions: [
      'product rotates slowly on display showing all angles',
      'packaging unfolds elegantly revealing product',
      'product features highlight with glowing accents',
      'hands interact demonstrating functionality',
      'components separate showing internal design',
      'liquid pours with realistic fluid dynamics',
      'fabric drapes showing material quality',
      'device powers on with boot animation'
    ],
    ambientMotions: [
      'studio lighting shifts to highlight features',
      'subtle reflections move across glossy surfaces',
      'soft shadows rotate as light orbits product',
      'floating dust catches rim lighting'
    ],
    physicsNotes: 'Premium slow motion, materials behave realistically - metal reflects, fabric flows',
    cameraEnhancement: 'smooth cinematic orbit emphasizing premium quality'
  },
  food: {
    subjectMotions: [
      'steam rises in billowing clouds from hot dish',
      'sauce drizzles slowly with viscous flow',
      'cheese stretches in satisfying strings',
      'vegetables sizzle and pop in hot oil',
      'beverage pours with bubbles rising',
      'knife slices through ingredients with precision',
      'garnish sprinkles down onto plated dish',
      'bread tears revealing soft interior texture'
    ],
    ambientMotions: [
      'warm kitchen lighting creates appetizing glow',
      'background shows bustling kitchen activity',
      'flame flickers under cooking pan',
      'steam wisps drift toward camera'
    ],
    physicsNotes: 'Liquids have proper viscosity, steam rises and dissipates, sizzle creates splatter',
    cameraEnhancement: 'slow push-in toward hero dish with shallow depth of field'
  },
  abstract: {
    subjectMotions: [
      'geometric shapes morph and transform fluidly',
      'color gradients shift and blend into new combinations',
      'particle systems explode then reconverge',
      'liquid metal flows into new shapes',
      'fractal patterns zoom revealing infinite detail',
      'light beams refract through crystal creating rainbows',
      'organic forms pulse with life energy',
      'typography animates letter by letter'
    ],
    ambientMotions: [
      'background colors shift through spectrum',
      'floating orbs drift with physics-defying motion',
      'light leaks sweep across frame',
      'bokeh shapes morph and multiply'
    ],
    physicsNotes: 'Physics stylized - slower for drama, impossible movements acceptable',
    cameraEnhancement: 'dynamic movement matching visual energy'
  },
  default: {
    subjectMotions: [
      'main subject shifts position showing dimension',
      'foreground moves at different speed than background',
      'key element animates to draw attention',
      'secondary elements provide supporting motion',
      'subtle movement indicates life and energy'
    ],
    ambientMotions: [
      'atmospheric particles drift through light',
      'shadows shift indicating time passage',
      'background has gentle motion parallax',
      'light quality changes gradually'
    ],
    physicsNotes: 'Natural realistic physics, gravity applies, wind affects light objects',
    cameraEnhancement: 'subtle drift or gentle push for visual interest'
  }
}

function detectEnvironmentCategoryForMotion(visualDirection: string): string {
  const text = (visualDirection || '').toLowerCase()
  const patterns: Record<string, string[]> = {
    tech: ['code', 'screen', 'computer', 'laptop', 'software', 'ai', 'robot', 'digital', 'algorithm', 'server', 'programming', 'neural', 'hologram', 'interface', 'circuit', 'cyber', 'virtual', 'tech', 'smartphone', 'app'],
    data: ['chart', 'graph', 'statistics', 'analytics', 'dashboard', 'percentage', 'metric', 'visualization', 'infographic', 'numbers', 'growth', 'trend', 'report', 'kpi'],
    nature: ['nature', 'outdoor', 'forest', 'mountain', 'beach', 'sky', 'tree', 'landscape', 'garden', 'flower', 'ocean', 'river', 'sunset', 'cloud', 'rain', 'leaf', 'plant'],
    urban: ['city', 'street', 'building', 'traffic', 'downtown', 'mall', 'urban', 'night', 'neon', 'car', 'road', 'pedestrian', 'subway', 'metro', 'skyscraper'],
    office: ['office', 'desk', 'meeting', 'business', 'corporate', 'workspace', 'keyboard', 'coffee', 'chair', 'whiteboard', 'presentation'],
    product: ['product', 'unbox', 'package', 'brand', 'gadget', 'device', 'showcase', 'demo', 'premium', 'luxury', 'retail', 'hero'],
    food: ['food', 'cook', 'kitchen', 'dish', 'recipe', 'restaurant', 'chef', 'delicious', 'tasty', 'ingredient', 'meal', 'cuisine'],
    abstract: ['abstract', 'concept', 'idea', 'metaphor', 'artistic', 'creative', 'imagination', 'dream', 'surreal', 'geometric', 'pattern']
  }
  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => text.includes(kw))) return category
  }
  return 'default'
}

function getRandomMotionItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, array.length))
}

function generateBrollActionBeats(params: {
  duration: number
  segmentType: string
  emotion: string
  visualDirection?: string
  emotionMotion: ReturnType<typeof getEmotionMotion>
}): Array<{ timeRange: string; action: string }> {
  const { duration, segmentType, emotion, visualDirection, emotionMotion } = params
  
  const beat1End = Math.floor(duration * 0.33)
  const beat2End = Math.floor(duration * 0.66)
  
  // KEY FIX: Detect environment from visual direction
  const envCategory = detectEnvironmentCategoryForMotion(visualDirection || '')
  const envMotion = ENVIRONMENT_MOTION_LIBRARY[envCategory] || ENVIRONMENT_MOTION_LIBRARY.default
  
  // Get SPECIFIC motions for this environment
  const subjectMotions = getRandomMotionItems(envMotion.subjectMotions, 3)
  const ambientMotions = getRandomMotionItems(envMotion.ambientMotions, 2)
  
  const typeUpper = segmentType.toUpperCase()
  const beats: Array<{ timeRange: string; action: string }> = []
  
  switch (typeUpper) {
    case 'FORE':
    case 'FORESHADOW':
      beats.push(
        { timeRange: `0s-${beat1End}s`, action: `Scene reveals: ${subjectMotions[0]}. ${ambientMotions[0]}.` },
        { timeRange: `${beat1End}s-${beat2End}s`, action: `Motion builds: ${subjectMotions[1]}. ${envMotion.cameraEnhancement}.` },
        { timeRange: `${beat2End}s-${duration}s`, action: `${ambientMotions[1]}. Hold with anticipation.` }
      )
      break
    case 'PEAK':
      beats.push(
        { timeRange: `0s-${beat1End}s`, action: `IMPACT: ${subjectMotions[0]} with maximum intensity. ${envMotion.cameraEnhancement}.` },
        { timeRange: `${beat1End}s-${beat2End}s`, action: `Peak energy: ${subjectMotions[1]}. ${ambientMotions[0]}.` },
        { timeRange: `${beat2End}s-${duration}s`, action: `Settle: ${ambientMotions[1]}. Powerful stillness.` }
      )
      break
    case 'ENDING':
      beats.push(
        { timeRange: `0s-${beat1End}s`, action: `Resolution: ${subjectMotions[0]} with decreasing energy.` },
        { timeRange: `${beat1End}s-${beat2End}s`, action: `Gentle: ${ambientMotions[0]}. Warm atmosphere.` },
        { timeRange: `${beat2End}s-${duration}s`, action: `Final hold: ${ambientMotions[1]}. Closure.` }
      )
      break
    default:
      beats.push(
        { timeRange: `0s-${beat1End}s`, action: `${subjectMotions[0]}. ${envMotion.cameraEnhancement}.` },
        { timeRange: `${beat1End}s-${beat2End}s`, action: `${subjectMotions[1]}. ${ambientMotions[0]}.` },
        { timeRange: `${beat2End}s-${duration}s`, action: `${subjectMotions[2] || ambientMotions[1]}. Scene breathes naturally.` }
      )
  }
  
  return beats
}

function generateBrollOutputIntent(segmentType: string): string {
  const intents: Record<string, string> = {
    'FORE': 'Set the visual context. Create anticipation for upcoming content without revealing too much.',
    'FORESHADOW': 'Plant visual seeds. Build curiosity through mysterious or intriguing imagery.',
    'BODY': 'Support the narrative visually. Provide B-roll that enhances the story without distraction.',
    'BODY-1': 'Illustrate the first key point visually. Make abstract concepts tangible.',
    'BODY-2': 'Continue visual storytelling. Maintain engagement through compelling imagery.',
    'BODY-3': 'Build toward climax. Visual energy should increase toward the peak.',
    'PEAK': 'Maximum visual impact. This is the climactic B-roll moment.',
    'ENDING': 'Provide visual resolution. Satisfy the viewer with a complete visual arc.'
  }
  
  return intents[segmentType.toUpperCase()] || intents['BODY']
}
