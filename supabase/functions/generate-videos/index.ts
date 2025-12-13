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
  selectVideoPlatform,
  getCameraMovement,
  getEmotionMotion,
  getAudioTemplate,
  getTransition,
  buildVeoPrompt,
  buildSoraPrompt,
  getContentTemplate,
  validateDialogueLength,
  type VideoModelKey
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
    const formData = new FormData()
    formData.append('prompt', videoPrompt)
    formData.append('model', modelSpecs.apiModel)
    formData.append('resolution', selectedPlatform === 'sora-2-hd' ? '720p' : (job.resolution || '1080p'))
    formData.append('aspect_ratio', job.aspect_ratio || '9:16')
    formData.append('file_urls', job.image_url)

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

      const formData = new FormData()
      formData.append('prompt', videoPrompt)
      formData.append('model', modelSpecs.apiModel)
      formData.append('resolution', selectedPlatform === 'sora-2-hd' ? '720p' : resolution)
      formData.append('aspect_ratio', aspect_ratio)
      formData.append('file_urls', imageUrl)

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
}

// ============================================================================
// CINEMATIC VIDEO PROMPT BUILDER (Using Knowledge File Functions)
// ============================================================================

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
    duration
  } = params

  const visualDirection = segment.visual_direction || segment.visualDirection || ''
  const shotType = segment.shot_type || 'B-ROLL'
  const isCreatorShot = shotType === 'CREATOR'
  const characterName = segment.character_name || 'Creator'
  const transitionType = segment.transition || 'hold'
  
  // Voice direction based on language
  const voiceDirections: Record<string, string> = {
    indonesian: 'Indonesian voice with casual Gen-Z intonation, natural conversational delivery',
    english: 'American English voice with engaging conversational tone, clear pronunciation',
    hindi: 'Hindi voice with authentic Hinglish style, natural delivery'
  }
  const voiceDirection = voiceDirections[language.toLowerCase()] || voiceDirections.english

  // Use knowledge file functions based on platform
  if (platform === 'veo-3.1-fast') {
    // Use buildVeoPrompt from knowledge file
    const basePrompt = buildVeoPrompt({
      duration: Math.min(duration, 8),
      aspectRatio: aspectRatio,
      segmentType: segmentType,
      emotion: emotion,
      dialogue: scriptText || undefined,
      characterName: characterName,
      environment: environment
    })
    
    // Enhance with additional production details
    const enhancements = `

LANGUAGE & VOICE
Voice Direction: ${voiceDirection}
${isCreatorShot ? 'Eye Contact: Direct to camera, engaging the viewer authentically' : 'Gaze: Natural, within scene context'}

VISUAL CONTINUITY (CRITICAL)
- Maintain EXACT appearance from reference image
- Preserve lighting setup and color grade
- Keep character proportions and identity consistent
- No morphing or distortion of facial features

MOTION PHYSICS
- Natural human movement timing
- Realistic fabric and hair physics
- Gravity applies normally
- Smooth acceleration/deceleration

TRANSITION OUT
${getTransition(transitionType)}

QUALITY REQUIREMENTS
- Crystal clear sharp focus on subject
- Professional color grading
- No artifacts, no blur, no glitches
- Hollywood production value`
    
    return basePrompt + enhancements
  }

  // SORA 2 HD - Use buildSoraPrompt from knowledge file
  const sceneAction = visualDirection || (isCreatorShot 
    ? 'Creator faces camera directly, speaking with confidence and natural gestures'
    : 'Professional cinematic scene with subject in frame, natural movement')
  
  const basePrompt = buildSoraPrompt({
    duration: Math.min(duration, 10),
    aspectRatio: aspectRatio,
    segmentType: segmentType,
    emotion: emotion,
    sceneAction: sceneAction,
    dialogue: scriptText || undefined,
    characterName: characterName,
    environment: environment
  })
  
  // Enhance with additional production details
  const enhancements = `

LANGUAGE & VOICE
Voice Direction: ${voiceDirection}

VISUAL CONSISTENCY (CRITICAL)
- Reference image defines starting frame exactly
- Maintain all visual elements throughout
- No identity drift or morphing
- Consistent lighting and color

TRANSITION
${getTransition(transitionType)}

EXCLUSIONS
- No text overlays or subtitles
- No morphing between appearances
- No visual artifacts or glitches
- No watermarks or logos`
  
  return basePrompt + enhancements
}
