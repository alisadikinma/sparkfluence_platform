import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  DALLE3_SPECS,
  IMAGE_PROJECT_INSTRUCTION,
  EMOTION_EXPRESSION_MAP,
  LIGHTING_PATTERNS,
  SHOT_TYPES,
  FILM_STOCKS,
  ATMOSPHERE_TYPES,
  MOOD_SETUPS,
  CONTENT_TYPE_DEFAULTS,
  TOPIC_COSTUME_MAP,
  getCostumeForTopic,
  getEmotionMapping,
  getLightingForMood,
  buildCreatorPrompt,
  buildBrollPrompt,
  buildThumbnailPrompt
} from '../_shared/prompts/cinematicImageKnowledge.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIMEOUT = 120000

// FLUX resolutions (lower than DALL-E, free tier)
const FLUX_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 576, height: 1024 },
  '16:9': { width: 1024, height: 576 },
  '1:1': { width: 1024, height: 1024 }
}

// GPT-Image-1 sizes (different from DALL-E 3)
// Supported: '1024x1024', '1024x1536', '1536x1024', 'auto'
const GPT_IMAGE_SIZES: Record<string, string> = {
  '9:16': '1024x1536',  // Portrait (closest to 9:16)
  '16:9': '1536x1024',  // Landscape (closest to 16:9)
  '1:1': '1024x1024'    // Square
}

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
    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'EMPTY_BODY', message: 'Request body is empty' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      requestBody = JSON.parse(bodyText)
    } catch (_parseError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Environment setup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const hfApiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'Supabase not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Determine mode
    const mode = requestBody.mode || 'legacy'

    // ========================================================================
    // MODE: CREATE_JOBS - Create job records and return immediately
    // ========================================================================
    if (mode === 'create_jobs') {
      return await handleCreateJobs(supabase, requestBody)
    }

    // ========================================================================
    // MODE: PROCESS_SINGLE - Process one job by ID
    // ========================================================================
    if (mode === 'process_single') {
      return await handleProcessSingle(supabase, requestBody, openaiApiKey, hfApiKey)
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
    return await handleLegacyMode(supabase, requestBody, openaiApiKey, hfApiKey)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Fatal Error]: ${errorMessage}`)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: errorMessage } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// MODE HANDLERS
// ============================================================================

async function handleCreateJobs(supabase: any, requestBody: any) {
  const { 
    user_id, 
    session_id, 
    segments, 
    topic, 
    style = 'cinematic', 
    aspect_ratio = '9:16',
    provider: defaultProvider = 'auto', // 'auto' = hybrid mode (gpt-image-1 for CREATOR, huggingface for B-ROLL)
    character_description = '',
    character_ref_png = '' // Avatar URL for face consistency
  } = requestBody

  if (!user_id || !session_id || !segments || !Array.isArray(segments)) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing user_id, session_id, or segments' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CREATE_JOBS] Creating ${segments.length} jobs for session: ${session_id}`)
  console.log(`[CREATE_JOBS] Provider mode: ${defaultProvider}`)

  // Get costume based on topic
  const costume = topic ? getCostumeForTopic(topic) : TOPIC_COSTUME_MAP.default

  // Create job records
  const jobRecords = segments.map((segment: any, index: number) => {
    const segmentType = segment.segment_type || segment.type || `segment_${index}`
    const shotType = segment.shot_type || 'B-ROLL'
    const emotion = segment.emotion || 'authority'
    const visualPrompt = segment.visual_prompt || segment.visual_direction || ''
    const charDesc = segment.character_description || character_description

    // Build the image prompt
    const imagePrompt = buildCinematicPrompt({
      segment,
      style,
      aspectRatio: aspect_ratio,
      topic,
      costume,
      characterDescription: charDesc,
      emotion
    })

    // Determine if this segment needs character reference (CREATOR shots only)
    const isCreatorShot = shotType === 'CREATOR'
    
    // HYBRID PROVIDER LOGIC:
    // - CREATOR shots → gpt-image-1 (for face consistency with reference)
    // - B-ROLL shots → huggingface (free, no face needed)
    let segmentProvider = defaultProvider
    if (defaultProvider === 'auto') {
      segmentProvider = isCreatorShot ? 'gpt-image-1' : 'huggingface'
    }
    
    console.log(`[CREATE_JOBS] Segment ${index + 1} (${segmentType}): ${shotType} → ${segmentProvider}`)
    
    return {
      user_id,
      session_id,
      segment_id: segment.segment_id || `SEG-${index + 1}`,
      segment_number: segment.segment_number || index + 1,
      segment_type: segmentType,
      shot_type: shotType,
      emotion,
      visual_prompt: imagePrompt,
      style,
      aspect_ratio,
      provider: segmentProvider,
      topic,
      character_description: charDesc,
      character_ref_png: isCreatorShot ? (segment.character_ref_png || character_ref_png) : null,
      status: JOB_STATUS.PENDING,
      image_url: null,
      error_message: null
    }
  })

  // Insert all jobs
  const { data: jobs, error: insertError } = await supabase
    .from('image_generation_jobs')
    .insert(jobRecords)
    .select()

  if (insertError) {
    console.error('[CREATE_JOBS] Insert error:', insertError)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'DB_ERROR', message: insertError.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[CREATE_JOBS] ✅ Created ${jobs.length} jobs`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        jobs,
        session_id,
        total_jobs: jobs.length,
        message: 'Jobs created successfully. You can now process them.'
      } 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleProcessSingle(supabase: any, requestBody: any, openaiApiKey: string | undefined, hfApiKey: string | undefined) {
  const { job_id, session_id, user_id } = requestBody

  // Find job to process - either by job_id or find next pending in session
  let job: any = null

  if (job_id) {
    const { data, error } = await supabase
      .from('image_generation_jobs')
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
    // Find next pending job for this session
    const { data, error } = await supabase
      .from('image_generation_jobs')
      .select('*')
      .eq('session_id', session_id)
      .eq('user_id', user_id)
      .eq('status', JOB_STATUS.PENDING)
      .order('segment_number', { ascending: true })
      .limit(1)
      .single()
    
    if (error || !data) {
      // No pending jobs - check overall status
      const { data: allJobs } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('session_id', session_id)
        .eq('user_id', user_id)

      const completed = allJobs?.filter((j: any) => j.status === JOB_STATUS.COMPLETED).length || 0
      const failed = allJobs?.filter((j: any) => j.status === JOB_STATUS.FAILED).length || 0
      const total = allJobs?.length || 0

      // If all done, create notification
      if (completed + failed === total && total > 0) {
        await createCompletionNotification(supabase, user_id, session_id, completed, failed, total)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            status: 'no_pending_jobs',
            summary: { total, completed, failed, pending: 0 },
            all_complete: completed + failed === total
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    job = data
  } else {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Provide job_id or (session_id + user_id)' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check API keys
  const provider = job.provider || 'huggingface'
  if ((provider === 'openai' || provider === 'gpt-image-1') && !openaiApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'OPENAI_API_KEY not configured' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  if (provider === 'huggingface' && !hfApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'HUGGINGFACE_API_KEY not configured' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[PROCESS_SINGLE] Processing job ${job.id} - Segment ${job.segment_number} (${job.segment_type})`)

  // Update status to processing
  await supabase
    .from('image_generation_jobs')
    .update({ status: JOB_STATUS.PROCESSING, updated_at: new Date().toISOString() })
    .eq('id', job.id)

  try {
    let imageUrl: string | null = null
    const aspectRatio = job.aspect_ratio || '9:16'

    if (provider === 'openai') {
      imageUrl = await generateWithDalle(openaiApiKey!, job.visual_prompt, aspectRatio, supabase)
    } else if (provider === 'gpt-image-1') {
      // Pass character reference for face consistency if available
      imageUrl = await generateWithGptImage1(
        openaiApiKey!, 
        job.visual_prompt, 
        aspectRatio, 
        supabase,
        job.character_ref_png || undefined
      )
    } else {
      imageUrl = await generateWithFlux(hfApiKey!, job.visual_prompt, aspectRatio, supabase)
    }

    // Update job as completed
    await supabase
      .from('image_generation_jobs')
      .update({ 
        status: JOB_STATUS.COMPLETED, 
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`[PROCESS_SINGLE] ✅ Job ${job.id} completed`)

    // Check if all jobs for session are done
    const { data: remainingJobs } = await supabase
      .from('image_generation_jobs')
      .select('id, status')
      .eq('session_id', job.session_id)
      .eq('user_id', job.user_id)

    const pending = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.PENDING).length || 0
    const processing = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.PROCESSING).length || 0
    const completed = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.COMPLETED).length || 0
    const failed = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.FAILED).length || 0
    const total = remainingJobs?.length || 0

    const allComplete = pending === 0 && processing === 0

    // Create notification if all complete
    if (allComplete && total > 0) {
      await createCompletionNotification(supabase, job.user_id, job.session_id, completed, failed, total)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          job: {
            id: job.id,
            segment_number: job.segment_number,
            segment_type: job.segment_type,
            image_url: imageUrl,
            status: JOB_STATUS.COMPLETED
          },
          summary: { total, completed, failed, pending, processing },
          all_complete: allComplete
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[PROCESS_SINGLE] ❌ Job ${job.id} failed: ${errorMessage}`)

    // Update job as failed
    await supabase
      .from('image_generation_jobs')
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
        data: {
          job: {
            id: job.id,
            segment_number: job.segment_number,
            segment_type: job.segment_type,
            status: JOB_STATUS.FAILED,
            error: errorMessage
          }
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCheckStatus(supabase: any, requestBody: any) {
  const { session_id, user_id } = requestBody

  if (!session_id || !user_id) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing session_id or user_id' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: jobs, error } = await supabase
    .from('image_generation_jobs')
    .select('*')
    .eq('session_id', session_id)
    .eq('user_id', user_id)
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

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        jobs,
        summary: { total, completed, failed, pending, processing },
        all_complete: pending === 0 && processing === 0 && total > 0
      } 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleLegacyMode(supabase: any, requestBody: any, openaiApiKey: string | undefined, hfApiKey: string | undefined) {
  // Original synchronous processing for backward compatibility
  const segments = requestBody.segments
  const style = requestBody.style || 'cinematic'
  const aspectRatio: '9:16' | '16:9' | '1:1' = requestBody.aspect_ratio || '9:16'
  const defaultProvider = requestBody.provider || 'auto' // 'auto' = hybrid mode
  const topic = requestBody.topic || ''
  const characterDescription = requestBody.character_description || ''
  const characterRefPng = requestBody.character_ref_png || '' // Avatar URL for face consistency

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing or invalid segments array' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check API keys - need at least one provider available
  if (!openaiApiKey && !hfApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'No image generation API keys configured' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const images: ImageResult[] = []
  const costume = topic ? getCostumeForTopic(topic) : TOPIC_COSTUME_MAP.default

  console.log(`[LEGACY] Starting generation for ${segments.length} segments`)
  console.log(`[LEGACY] Provider mode: ${defaultProvider}, Style: ${style}, Aspect: ${aspectRatio}`)

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentType = segment.segment_type || segment.type || `segment_${i}`
    const shotType = segment.shot_type || 'B-ROLL'
    const emotion = segment.emotion || 'authority'
    
    // Determine if this is a CREATOR shot (has face)
    const isCreatorShot = shotType === 'CREATOR'
    
    // HYBRID PROVIDER LOGIC:
    // - CREATOR shots → gpt-image-1 (for face consistency)
    // - B-ROLL shots → huggingface (free, no face needed)
    let segmentProvider = defaultProvider
    if (defaultProvider === 'auto') {
      segmentProvider = isCreatorShot ? 'gpt-image-1' : 'huggingface'
    }
    
    const imagePrompt = buildCinematicPrompt({
      segment,
      style,
      aspectRatio,
      topic,
      costume,
      characterDescription: segment.character_description || characterDescription,
      emotion
    })
    
    console.log(`[${segmentProvider.toUpperCase()}] Generating ${i + 1}/${segments.length}: ${segmentType} (${shotType})`)

    try {
      let imageUrl: string | null = null

      if (segmentProvider === 'openai') {
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured')
        imageUrl = await generateWithDalle(openaiApiKey, imagePrompt, aspectRatio, supabase)
      } else if (segmentProvider === 'gpt-image-1') {
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured')
        // Pass character reference for face consistency (only for CREATOR shots)
        const refImage = isCreatorShot ? (segment.character_ref_png || characterRefPng) : undefined
        imageUrl = await generateWithGptImage1(openaiApiKey, imagePrompt, aspectRatio, supabase, refImage || undefined)
      } else {
        if (!hfApiKey) throw new Error('HUGGINGFACE_API_KEY not configured')
        imageUrl = await generateWithFlux(hfApiKey, imagePrompt, aspectRatio, supabase)
      }

      // Determine provider string for response
      const providerString = segmentProvider === 'openai' ? 'openai-dalle3' 
        : segmentProvider === 'gpt-image-1' ? 'openai-gpt-image-1' 
        : 'huggingface-flux'

      images.push({
        segment_number: segment.segment_number,
        segment_type: segmentType,
        shot_type: shotType,
        emotion: emotion,
        prompt: imagePrompt,
        image_url: imageUrl,
        provider: providerString,
        error: null
      })

      console.log(`[${segmentProvider.toUpperCase()}] ✅ Success: ${segmentType}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[${segmentProvider.toUpperCase()}] ❌ Failed: ${errorMessage}`)
      
      // Determine provider string for error response
      const errorProviderString = segmentProvider === 'openai' ? 'openai-dalle3' 
        : segmentProvider === 'gpt-image-1' ? 'openai-gpt-image-1' 
        : 'huggingface-flux'

      images.push({
        segment_number: segment.segment_number,
        segment_type: segmentType,
        shot_type: shotType,
        emotion: emotion,
        prompt: imagePrompt,
        image_url: null,
        provider: errorProviderString,
        error: errorMessage
      })
    }

    if (i < segments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
  }

  const successCount = images.filter(img => img.image_url !== null).length

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        images,
        stats: { 
          total: images.length, 
          success: successCount, 
          failed: images.length - successCount 
        },
        provider_mode: defaultProvider, // 'auto' = hybrid mode
        metadata: { topic, costume, aspectRatio, style }
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
  const allSuccess = failed === 0

  const notification = {
    user_id: userId,
    type: allSuccess ? 'image_generation_complete' : 'image_generation_partial',
    title: allSuccess ? '🎨 Images Ready!' : '⚠️ Partial Complete',
    message: allSuccess 
      ? `${completed} images generated`
      : `${completed}/${total} done, ${failed} failed`,
    data: {
      session_id: sessionId,
      completed,
      failed,
      total,
      redirect_url: `/video-editor?session=${sessionId}`
    },
    is_read: false
  }

  const { error } = await supabase
    .from('notifications')
    .insert([notification])

  if (error) {
    console.error('[NOTIFICATION] Failed to create notification:', error)
  } else {
    console.log(`[NOTIFICATION] ✅ Created completion notification for user ${userId}`)
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface ImageResult {
  segment_number: number
  segment_type: string
  shot_type: string
  emotion: string
  prompt: string
  image_url: string | null
  provider: string
  error: string | null
}

interface PromptParams {
  segment: any
  style: string
  aspectRatio: '9:16' | '16:9' | '1:1'
  topic: string
  costume: string
  characterDescription: string
  emotion: string
}

// ============================================================================
// CINEMATIC PROMPT BUILDER (Using Knowledge File Functions)
// ============================================================================

function buildCinematicPrompt(params: PromptParams): string {
  const { segment, style, aspectRatio, topic, costume, characterDescription, emotion } = params
  
  const shotType = segment.shot_type || 'B-ROLL'
  const segmentType = segment.segment_type || segment.type || ''
  const visualDirection = segment.visual_prompt || segment.visual_direction || ''
  
  // Determine shot type mapping for knowledge file
  const shotTypeMapping: Record<string, string> = {
    'CU': 'CU',
    'MCU': 'MCU', 
    'MS': 'MS',
    'MWS': 'MWS',
    'WS': 'WS',
    'EWS': 'EWS',
    'ECU': 'ECU'
  }
  
  // Get shot type from content defaults or use MCU as fallback
  const contentDefaults = CONTENT_TYPE_DEFAULTS[segmentType.toLowerCase()] || CONTENT_TYPE_DEFAULTS.hook
  const mappedShotType = shotTypeMapping[contentDefaults.shot.split(' ')[0]] || 'MCU'
  
  // Style modifiers for additional enhancement
  const styleModifiers: Record<string, string> = {
    cinematic: 'Shot on ARRI Alexa, cinematic photorealistic, Hollywood production value',
    realistic: 'Documentary style, natural authentic, high detail photorealistic',
    animated: 'Digital illustration, vibrant stylized, modern graphic design',
    '3d': '3D render, Octane render, professional studio lighting, hyperrealistic'
  }
  const styleGuide = styleModifiers[style] || styleModifiers.cinematic

  // CREATOR SHOT - Use buildCreatorPrompt from knowledge file
  if (shotType === 'CREATOR' || ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType.toUpperCase())) {
    // Note: Face consistency is handled by GPT-Image-1 Edit API with character_ref_png
    // character_description is optional text fallback for prompt context
    const charDesc = characterDescription || segment.character_description || 'Professional content creator, confident posture, engaging presence'
    
    // Use knowledge file function for creator prompt
    const basePrompt = buildCreatorPrompt({
      characterDescription: charDesc,
      emotion: emotion,
      topic: topic,
      shotType: mappedShotType,
      aspectRatio: aspectRatio
    })
    
    // Enhance with costume and style
    const costumeEnhancement = costume ? `\n\nWARDROBE OVERRIDE:\nOutfit: ${costume}\nGrooming: Professional, camera-ready` : ''
    const styleEnhancement = `\n\nPRODUCTION STYLE:\n${styleGuide}`
    
    // ========================================================================
    // CHARACTER IDENTITY ANCHOR (Prompt guidance - actual face from reference image)
    // ========================================================================
    const segmentUpperCase = segmentType.toUpperCase()
    const isCreatorFaceSegment = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentUpperCase)
    
    let characterAnchor = ''
    if (isCreatorFaceSegment) {
      characterAnchor = `\n\n` +
        `══════════════════════════════════════════════════════════════\n` +
        `SEGMENT: ${segmentUpperCase}\n` +
        `══════════════════════════════════════════════════════════════\n` +
        `${segmentUpperCase === 'HOOK' ? 'Opening shot - establish character identity clearly' : ''}` +
        `${segmentUpperCase === 'CTA' ? 'Closing shot - maintain character consistency from HOOK' : ''}` +
        `${segmentUpperCase === 'LOOP-END' ? 'Loop transition - seamless match to HOOK frame' : ''}` +
        `${segmentUpperCase === 'ENDING_CTA' ? 'Final CTA - maintain full character consistency' : ''}\n` +
        `══════════════════════════════════════════════════════════════`
    }
    
    return basePrompt + costumeEnhancement + styleEnhancement + characterAnchor
  }
  
  // B-ROLL SHOT - Use buildBrollPrompt from knowledge file
  const visual = visualDirection || `Professional ${topic} concept visualization`
  
  const basePrompt = buildBrollPrompt({
    visualDirection: visual,
    topic: topic,
    emotion: emotion,
    shotType: mappedShotType,
    aspectRatio: aspectRatio
  })
  
  // Enhance with style
  const styleEnhancement = `\n\nPRODUCTION STYLE:\n${styleGuide}`
  
  return basePrompt + styleEnhancement
}

// ============================================================================
// DALL-E 3 Generation
// ============================================================================

async function generateWithDalle(
  apiKey: string, 
  prompt: string, 
  aspectRatio: string, 
  supabase: any
): Promise<string> {
  const size = DALLE3_SPECS.sizes[aspectRatio as keyof typeof DALLE3_SPECS.sizes] || DALLE3_SPECS.sizes['9:16']
  
  console.log(`[DALL-E] Size: ${size}, Prompt length: ${prompt.length} chars`)
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DALLE3_SPECS.model,
      prompt: prompt,
      n: 1,
      size: size,
      quality: DALLE3_SPECS.quality,
      style: DALLE3_SPECS.style,
      response_format: 'url'
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`DALL-E API error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const tempImageUrl = data.data[0].url

  const imageResponse = await fetch(tempImageUrl)
  const imageBlob = await imageResponse.blob()
  
  const filename = `generated/dalle_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
  
  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(filename, imageBlob, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(filename)
  return urlData.publicUrl
}

// ============================================================================
// FLUX Generation (HuggingFace - FREE)
// ============================================================================

async function generateWithFlux(
  apiKey: string, 
  prompt: string, 
  aspectRatio: string, 
  supabase: any
): Promise<string> {
  const resolution = FLUX_RESOLUTIONS[aspectRatio] || FLUX_RESOLUTIONS['9:16']
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    console.log(`[FLUX] Resolution: ${resolution.width}x${resolution.height}, Prompt length: ${prompt.length} chars`)
    
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { 
            width: resolution.width, 
            height: resolution.height 
          }
        }),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FLUX API error: ${response.status} - ${errorText}`)
    }

    const imageBlob = await response.blob()
    const filename = `generated/flux_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
    
    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(filename, imageBlob, { contentType: 'image/png', upsert: false })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(filename)
    return urlData.publicUrl
    
  } finally {
    clearTimeout(timeoutId)
  }
}

// ============================================================================
// GPT-Image-1 Generation (OpenAI - Premium, superior instruction following)
// Supports character reference via Image Edit API for consistent faces
// Based on OpenAI docs: https://platform.openai.com/docs/guides/image-generation
// ============================================================================

async function generateWithGptImage1(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  supabase: any,
  referenceImageUrl?: string // Avatar URL for character consistency
): Promise<string> {
  const size = GPT_IMAGE_SIZES[aspectRatio] || GPT_IMAGE_SIZES['9:16']
  
  // If reference image provided, use Image Edit API for character consistency
  if (referenceImageUrl) {
    console.log(`[GPT-IMAGE-1] Using Image Edit API with reference image for face consistency`)
    console.log(`[GPT-IMAGE-1] Reference: ${referenceImageUrl.substring(0, 80)}...`)
    console.log(`[GPT-IMAGE-1] Size: ${size}, Prompt length: ${prompt.length} chars`)
    
    try {
      // Fetch the reference image
      const refResponse = await fetch(referenceImageUrl)
      if (!refResponse.ok) {
        throw new Error(`Failed to fetch reference image: ${refResponse.status}`)
      }
      const refBlob = await refResponse.blob()
      
      // Build FormData for multipart upload (OpenAI Image Edit API format)
      // Per docs: image[] accepts multiple files, input_fidelity="high" for face preservation
      const formData = new FormData()
      formData.append('model', 'gpt-image-1')
      formData.append('prompt', prompt)
      formData.append('size', size)
      formData.append('quality', 'high')
      formData.append('input_fidelity', 'high') // Critical for face preservation
      formData.append('image[]', refBlob, 'reference.png')
      
      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
          // Note: Don't set Content-Type - fetch sets multipart/form-data with boundary
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[GPT-IMAGE-1] Edit API error: ${errorText}`)
        // Fallback to generation without reference
        console.log(`[GPT-IMAGE-1] Falling back to generation without reference...`)
        return await generateWithGptImage1WithoutRef(apiKey, prompt, size, supabase)
      }
      
      const data = await response.json()
      const imageBase64 = data.data[0].b64_json
      
      console.log(`[GPT-IMAGE-1] ✅ Generated with character reference`)
      return await uploadBase64ToStorage(imageBase64, 'gpt-image-1-ref', supabase)
      
    } catch (refError) {
      console.error(`[GPT-IMAGE-1] Reference image error: ${refError}`)
      console.log(`[GPT-IMAGE-1] Falling back to generation without reference...`)
      return await generateWithGptImage1WithoutRef(apiKey, prompt, size, supabase)
    }
  }
  
  // No reference image - use standard generation
  return await generateWithGptImage1WithoutRef(apiKey, prompt, size, supabase)
}

// Helper: GPT-Image-1 generation without reference (standard)
async function generateWithGptImage1WithoutRef(
  apiKey: string,
  prompt: string,
  size: string,
  supabase: any
): Promise<string> {
  console.log(`[GPT-IMAGE-1] Size: ${size}, Prompt length: ${prompt.length} chars`)
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'high'
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`GPT-Image-1 API error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const imageBase64 = data.data[0].b64_json
  
  return await uploadBase64ToStorage(imageBase64, 'gpt-image-1', supabase)
}

// Helper: Upload base64 image to Supabase storage
async function uploadBase64ToStorage(
  imageBase64: string,
  prefix: string,
  supabase: any
): Promise<string> {
  const binaryString = atob(imageBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const imageBlob = new Blob([bytes], { type: 'image/png' })
  
  const filename = `generated/${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
  
  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(filename, imageBlob, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(filename)
  return urlData.publicUrl
}
