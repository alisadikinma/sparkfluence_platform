import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  VIDEO_MODELS,
  VIDEO_PROJECT_INSTRUCTION,
  CAMERA_MOVEMENTS,
  TRANSITIONS,
  EMOTION_MOTION_MAP,
  AUDIO_TEMPLATES,
  VIDEO_CONTENT_TEMPLATES,
  SHOT_TYPES,
  VOICE_TONES,
  selectVideoPlatform,
  getCameraMovement,
  getEmotionMotion,
  getAudioTemplate,
  getTransition,
  buildVeoPrompt,
  buildSoraPrompt,
  getContentTemplate,
  validateDialogueLength,
  type VideoModelKey,
  type ExtendedPromptParams,
  type ActionBeat
} from '../_shared/prompts/cinematicVideoKnowledge.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API Endpoints
const VEO_API_ENDPOINT = 'https://api.geminigen.ai/uapi/v1/video-gen/veo'
const SORA_API_ENDPOINT = 'https://api.geminigen.ai/uapi/v1/video-gen/sora'

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
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
    preferred_platform = 'auto' // 'auto' | 'sora2' | 'veo31'
  } = requestBody

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing or invalid segments array' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[PREVIEW_PROMPTS] Generating prompts for ${segments.length} segments, preferred_platform: ${preferred_platform}`)

  // Map user selection to actual platform key
  // AUTO = VEO 3.1 (1080p) for consistent quality - never mix resolutions
  const platformMap: Record<string, VideoModelKey> = {
    'veo31': 'veo-3.1-fast',
    'sora2': 'sora-2-hd',
    'auto': 'veo-3.1-fast' // Default to VEO for consistent 1080p quality
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
    const segmentType = segment.type || segment.element || segment.segment_type || `SEGMENT_${i + 1}`
    const scriptText = segment.script_text || segment.script || ''
    const duration = segment.duration_seconds || 8
    const emotion = segment.emotion || 'authority'
    const shotType = segment.shot_type || 'B-ROLL'
    const imageUrl = segment.image_url || segment.imageUrl || null
    const hasDialogue = scriptText.length > 0

    // Determine platform - ALL segments use the same platform for consistent quality
    const selectedPlatform: VideoModelKey = selectedPlatformForAll

    const modelSpecs = VIDEO_MODELS[selectedPlatform]

    // Build the cinematic video prompt
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
      duration: Math.min(duration, modelSpecs.maxDuration)
    })

    // Validate dialogue length
    const dialogueValidation = scriptText ? validateDialogueLength(scriptText, selectedPlatform) : { valid: true, wordCount: 0, maxWords: 0 }

    prompts.push({
      segment_id: segmentId,
      segment_number: segment.segment_number || i + 1,
      segment_type: segmentType,
      shot_type: shotType,
      platform: selectedPlatform,
      platform_name: modelSpecs.name,
      duration: Math.min(duration, modelSpecs.maxDuration),
      max_duration: modelSpecs.maxDuration,
      resolution: modelSpecs.resolution,
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
    preferred_platform = 'auto' // 'auto' | 'sora2' | 'veo31'
  } = requestBody

  if (!user_id || !session_id || !segments || !Array.isArray(segments)) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing user_id, session_id, or segments' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CREATE_JOBS] Creating ${segments.length} video jobs for session: ${session_id}, preferred_platform: ${preferred_platform}`)

  // Map user selection to actual platform key
  // AUTO = VEO 3.1 (1080p) for consistent quality - never mix resolutions
  const platformMap: Record<string, VideoModelKey> = {
    'veo31': 'veo-3.1-fast',
    'sora2': 'sora-2-hd',
    'auto': 'veo-3.1-fast' // Default to VEO for consistent 1080p quality
  }
  const selectedPlatformForAll = platformMap[preferred_platform] || 'veo-3.1-fast'

  // Create job records
  const jobRecords = segments.map((segment: any, index: number) => {
    const segmentId = segment.segment_id || segment.id || String(index + 1)
    const segmentType = segment.type || segment.element || `SEGMENT_${index + 1}`
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

  // RATE LIMIT PROTECTION: Check if there's already a job being processed
  if (session_id && user_id) {
    const { data: processingJobs } = await supabase
      .from('video_generation_jobs')
      .select('id, segment_number, created_at')
      .eq('session_id', session_id)
      .eq('user_id', user_id)
      .eq('status', JOB_STATUS.PROCESSING)
    
    if (processingJobs && processingJobs.length > 0) {
      console.log(`[PROCESS_SINGLE] ⏳ Waiting - ${processingJobs.length} job(s) still processing`)
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
  }

  // Find job to process
  let job: any = null

  if (job_id) {
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
    job = data
  } else if (session_id && user_id) {
    // Find next pending job
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

    // Build prompt
    const videoPrompt = buildCinematicVideoPrompt({
      segment: job,
      segmentType,
      emotion,
      scriptText,
      language: job.language || 'indonesian',
      aspectRatio: job.aspect_ratio || '9:16',
      environment: job.environment || 'studio',
      platform: selectedPlatform,
      duration: Math.min(duration, modelSpecs.maxDuration)
    })

    console.log(`[PROCESS_SINGLE] Platform: ${selectedPlatform}, Prompt length: ${videoPrompt.length}`)

    // Call VEO API
    const apiEndpoint = selectedPlatform === 'sora-2-hd' ? SORA_API_ENDPOINT : VEO_API_ENDPOINT
    const aspectRatio = job.aspect_ratio || '9:16'
    // Resolution depends on aspect ratio: 9:16 = 720p max, 16:9 = 1080p
    const resolution = aspectRatio === '16:9' ? '1080p' : '720p'
    
    const formData = new FormData()
    formData.append('prompt', videoPrompt)
    formData.append('model', modelSpecs.apiModel)
    formData.append('resolution', resolution)
    formData.append('aspect_ratio', aspectRatio)
    // Use ref_images for reference image (per API docs)
    formData.append('ref_images', job.image_url)

    const apiResponse = await fetch(apiEndpoint, {
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
    const segmentType = segment.type || segment.element || `SEGMENT_${i + 1}`
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

    // Always use VEO 3.1 for consistent 1080p quality (unless explicitly overridden)
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
      const apiEndpoint = selectedPlatform === 'sora-2-hd' ? SORA_API_ENDPOINT : VEO_API_ENDPOINT

      // Resolution depends on aspect ratio: 9:16 = 720p max, 16:9 = 1080p
      const actualResolution = aspect_ratio === '16:9' ? '1080p' : '720p'
      
      const formData = new FormData()
      formData.append('prompt', videoPrompt)
      formData.append('model', modelSpecs.apiModel)
      formData.append('resolution', actualResolution)
      formData.append('aspect_ratio', aspect_ratio)
      // Use ref_images for reference image (per API docs)
      formData.append('ref_images', imageUrl)

      const apiResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'x-api-key': veoApiKey },
        body: formData
      })

      const responseText = await apiResponse.text()
      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status} - ${responseText}`)
      }

      const responseData = JSON.parse(responseText)
      totalCost += modelSpecs.price

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
        model_name: modelSpecs.name,
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

// Helper: Get resolution based on aspect ratio
function getResolutionForAspectRatio(aspectRatio: string): string {
  // 9:16 (vertical/portrait) = max 720p
  // 16:9 (horizontal/landscape) = can do 1080p
  if (aspectRatio === '9:16' || aspectRatio === '3:4' || aspectRatio === '4:5') {
    return '720p'
  }
  return '1080p'
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

function buildVoiceCharacterAnchor(voiceChar: VoiceCharacter): string {
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

// Helper: Get generic voice tone when voice character not available
function getGenericVoiceTone(language: string): string {
  const voiceDirections: Record<string, string> = {
    indonesian: 'Indonesian voice, casual Gen-Z tone, natural narration style',
    english: 'American English voice, engaging narrator tone, clear delivery',
    hindi: 'Hindi voice with authentic Hinglish style, warm narration',
    spanish: 'Latin American Spanish voice, warm narrator delivery'
  }
  return voiceDirections[language.toLowerCase()] || voiceDirections.english
}

function buildCinematicVideoPrompt(params: VideoPromptParams): string {
  const {
    segment,
    segmentType,
    emotion,
    scriptText,
    language,
    aspectRatio,
    environment,
    platform,
    duration,
    voiceCharacter: voiceCharacterParam
  } = params

  // Extract segment data
  const visualDirection = segment.visual_direction || segment.visualDirection || ''
  const transitionType = segment.transition || 'hold'
  const segmentNumber = segment.segment_number || 1
  const segmentId = segment.segment_id || segment.id || 'CLIP'
  
  // ========================================================================
  // VOICE CHARACTER ANCHOR - Same voice for ALL segments
  // ========================================================================
  const creatorAppearance = segment.creator_appearance || segment.character_description || ''
  const detectedLanguage = scriptText ? detectScriptLanguage(scriptText) : language.toLowerCase()
  const voiceChar = voiceCharacterParam 
    ? JSON.parse(voiceCharacterParam) as VoiceCharacter
    : generateVoiceCharacter(detectedLanguage, creatorAppearance)
  const voiceAnchor = buildVoiceCharacterAnchor(voiceChar)
  
  // ========================================================================
  // CRITICAL: Determine if this is a CREATOR SHOT or B-ROLL
  // Only HOOK and CTA show creator face with dialogue
  // All other segments (FORE, BODY, PEAK, etc.) are B-roll without creator face
  // ========================================================================
  const CREATOR_SEGMENTS = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA']
  const segmentTypeUpper = segmentType.toUpperCase()
  const isCreatorSegment = CREATOR_SEGMENTS.includes(segmentTypeUpper)
  
  console.log(`[VIDEO-PROMPT] Segment: ${segmentType}, isCreatorSegment: ${isCreatorSegment}, voiceGender: ${voiceChar.gender}`)
  
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
    const characterDescription = segment.character_description || segment.characterDescription || undefined
    
    // Use consistent voice from anchor
    const voiceDirection = `${voiceChar.description}. Accent: ${voiceChar.accent}. Tone: ${voiceChar.tone}. Pace: ${voiceChar.pace}.`
    
    const extendedParams: ExtendedPromptParams = {
      // Basic
      segmentId: segmentId,
      segmentNumber: segmentNumber,
      duration: platform === 'veo-3.1-fast' ? Math.min(duration, 8) : Math.min(duration, 10),
      aspectRatio: aspectRatio,
      segmentType: segmentType,
      emotion: emotion,
      
      // Character & Scene - CREATOR FACE VISIBLE
      characterName: characterName,
      characterDescription: characterDescription,
      propsDescription: propsDescription,
      backgroundDescription: backgroundDescription,
      
      // Camera - Direct to camera for creator shots
      shotType: 'medium_close_up',
      cameraAngle: 'eye-level, direct to camera',
      
      // Lighting & Environment
      environment: environment,
      timeOfDay: timeOfDay,
      lightingDescription: lightingDescription,
      
      // Action
      visualDirection: visualDirection,
      
      // Audio - DIALOGUE ENABLED for creator segments
      dialogue: scriptText || undefined,
      voiceTone: voiceDirection,
      soundEffects: soundEffects,
      
      // Creative
      outputIntent: outputIntent,
      transition: transitionType
    }

    if (platform === 'veo-3.1-fast') {
      return buildVeoPrompt(extendedParams)
    }
    return buildSoraPrompt(extendedParams)
  }
  
  // ========================================================================
  // B-ROLL SEGMENT (FORE, BODY, PEAK, etc.) - NO creator face, NO dialogue
  // Pure visual motion based on image reference
  // ========================================================================
  
  // Detect voice language for voiceover
  const detectedLanguage = scriptText ? detectScriptLanguage(scriptText) : language.toLowerCase()
  
  // Build B-roll specific prompt (voiceover narration + visual fokus topik)
  const brollPrompt = buildBrollVideoPrompt({
    segmentId,
    segmentNumber,
    duration: platform === 'veo-3.1-fast' ? Math.min(duration, 8) : Math.min(duration, 10),
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
  
  // Build voiceover section if script exists - USE VOICE CHARACTER ANCHOR
  const hasVoiceover = scriptText && scriptText.trim().length > 0
  
  // Use voice character if provided, otherwise fallback to generic
  const voiceTone = voiceCharacter 
    ? `${voiceCharacter.description}. Accent: ${voiceCharacter.accent}. Tone: ${voiceCharacter.tone}. Pace: ${voiceCharacter.pace}.`
    : getGenericVoiceTone(language)
  
  // Get emotion-based motion settings
  const emotionMotion = getEmotionMotion(emotion)
  
  // Get camera movement for segment type
  const cameraMove = getCameraMovement(segmentType, emotion)
  
  // Get audio template
  const audioTemplate = getAudioTemplate(environment)
  const ambientSound = audioTemplate.split('.')[0]
  
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
  
  // Build voiceover/narration section
  const voiceoverSection = hasVoiceover
    ? `VOICEOVER (off-screen narration, NO face visible):
Narrator: "${scriptText}"
Voice style: ${voiceTone}`
    : 'No voiceover in this clip'
  
  // Platform-specific prompt
  if (platform === 'sora-2-hd') {
    return `[SORA 2 B-ROLL — ${segmentId}.${segmentNumber}]

DURATION: ${duration} seconds
RESOLUTION: 720p
ASPECT: ${aspectRatio}

STARTING FRAME:
Continue from the provided image — ${visualDesc}. ${propsLine} Visual focus on topic/subject matter. NO human face visible.

CAMERA:
${cameraMove.promptPhrase}. Stable, cinematic movement.

SETTING & LIGHTING:
${lightingLine}. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment.

ACTION SEQUENCE:
${actionBeatsFormatted}

SOUND:
- Ambient: ${ambientSound}
- Effects: ${soundEffects || 'subtle environmental sounds only'}
- ${voiceoverSection}

PHYSICS:
Natural motion, realistic timing. Single camera movement per shot.

CONTINUITY NOTES:
- Maintain exact lighting and color grade from reference image
- NO human face should appear - this is B-roll footage
- Visual focus on topic/subject/product, NOT on people
- ${hasVoiceover ? 'Voiceover narration plays over visuals' : 'Pure ambient sound'}

TRANSITION:
${getTransition(transition)}

OUTPUT INTENT:
${actualOutputIntent}

EXCLUSIONS:
No text overlays, no human faces, no people on screen, no morphing, no artifacts.`
  }
  
  // VEO 3.1 B-roll prompt
  return `[VEO 3.1 B-ROLL — ${segmentId}.${segmentNumber}]

DURATION: ${duration} seconds
RESOLUTION: ${resolution}
ASPECT: ${aspectRatio}

STARTING FRAME:
Continue from the provided image — ${visualDesc}. ${propsLine} Visual focus on topic/subject matter. NO human face visible.

CAMERA:
${cameraMove.promptPhrase}. Stable tripod, cinematic movement. All key elements remain in frame.

SETTING & LIGHTING:
${lightingLine}. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment clearly visible.

ACTION SEQUENCE:
${actionBeatsFormatted}

SOUND:
- Ambient: ${ambientSound}
- Effects: ${soundEffects || 'subtle environmental sounds only'}
- ${voiceoverSection}
- Exclude: no subtitles, no text overlays, no background music unless specified

CONTINUITY NOTES:
- Maintain exact lighting and color grade from reference image
- NO human face should appear - this is B-roll footage
- Visual focus on topic/subject/product, NOT on people
- ${hasVoiceover ? 'Voiceover narration plays over visuals' : 'Pure ambient sound'}

TRANSITION:
${getTransition(transition)}

OUTPUT INTENT:
${actualOutputIntent}

NEGATIVE:
No blurry elements, no distortion, no artifacts, no text overlays, no human faces, no people on screen.`
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
  
  const typeUpper = segmentType.toUpperCase()
  
  // B-roll action beats (no character, pure visual motion)
  const brollBeats: Record<string, Array<{ timeRange: string; action: string }>> = {
    'FORE': [
      { timeRange: `0s-${beat1End}s`, action: 'Camera slowly reveals scene, ambient motion begins' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Environment elements move naturally, light shifts subtly' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Scene settles, atmospheric particles drift through frame' }
    ],
    'FORESHADOW': [
      { timeRange: `0s-${beat1End}s`, action: 'Slow reveal of key visual element' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Subtle motion builds anticipation' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Hold on mysterious detail, light flickers' }
    ],
    'BODY': [
      { timeRange: `0s-${beat1End}s`, action: visualDirection || 'Scene establishes with subtle ambient motion' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Key visual elements animate naturally' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Motion continues smoothly, environment breathes' }
    ],
    'BODY-1': [
      { timeRange: `0s-${beat1End}s`, action: 'First key concept visualized through motion' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Supporting visual elements animate' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Scene holds with subtle ambient movement' }
    ],
    'BODY-2': [
      { timeRange: `0s-${beat1End}s`, action: 'Second concept visualization begins' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Visual demonstration continues' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Smooth transition preparation' }
    ],
    'BODY-3': [
      { timeRange: `0s-${beat1End}s`, action: 'Final supporting visual' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Culminating motion' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Scene resolves with ${emotion} energy' }
    ],
    'PEAK': [
      { timeRange: `0s-${beat1End}s`, action: 'Dramatic reveal begins, high impact visual' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Peak moment, maximum visual energy' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Impact settles, powerful stillness' }
    ],
    'ENDING': [
      { timeRange: `0s-${beat1End}s`, action: 'Scene begins gentle resolve' },
      { timeRange: `${beat1End}s-${beat2End}s`, action: 'Atmosphere softens, warm conclusion' },
      { timeRange: `${beat2End}s-${duration}s`, action: 'Final hold, satisfying visual closure' }
    ]
  }
  
  return brollBeats[typeUpper] || brollBeats['BODY']
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
