import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ============================================================================
// CENTRALIZED AI MODEL CONFIG (2026)
// All model specs in one place - no code changes needed when adding new models
// ============================================================================
import {
  IMAGE_MODELS,
  getImageModel,
  getAspectRatioApiValue,
  getDimensions,
  buildImageFormData,
  selectImageModel,
  getImageModelFallbackChain,
  type ImageModelKey,
  type AspectRatio,
} from '../_shared/config/aiModels.ts'

// ============================================================================
// NEW LOOKUP MODULES (2026-01-10) - O(1) Direct Access
// Replaces RAG queries for structured data
// ============================================================================
import {
  // Cinematography
  getEmotionSpecs,
  getSegmentDefaults,
  getCostumeForTopic,
  buildCinematographyPrompt,
  buildFullCinematographyPrompt,
  SEGMENT_DEFAULTS,
  TOPIC_COSTUMES,
  // Negative prompt for B-roll
  getBRollNegativePrompt,
  // NOTE: buildVisualBrief REMOVED (2026-01-11) - B-ROLL now uses visual_direction directly
} from '../_shared/lookups/index.ts'

// ============================================================================
// STOCK IMAGE SEARCH - TEMPORARILY DISABLED (2026-01-11)
// All segments use AI generation via fal.ai
// TODO: Re-enable when stock image feature is ready
// ============================================================================
// import {
//   searchProductImage,
//   downloadAndUploadSearchImage,
//   decideImageSource,
//   type ImageSearchResult,
// } from '../_shared/services/imageSearch.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIMEOUT = 120000

// ============================================================================
// API ENDPOINTS
// ============================================================================
const GEMINIGEN_IMAGE_ENDPOINT = 'https://api.geminigen.ai/uapi/v1/generate_image'
const GEMINIGEN_HISTORY_ENDPOINT = 'https://api.geminigen.ai/uapi/v1/history'
const FAL_AI_BASE_URL = 'https://fal.run'

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
}

// ============================================================================
// IMAGE PROVIDER SELECTION (2026-01-14 Updated with Seedream v4 + QWEN)
// ============================================================================
// PRIORITY:
//   - CREATOR (HOOK/CTA) WITH ref: fal-nano-banana-edit (face consistency via image_urls)
//   - CREATOR (HOOK/CTA) NO ref: fal-nano-banana (text-to-image)
//   - B-ROLL WITH ref: fal-nano-banana-edit (scene reference via image_urls)
//   - B-ROLL NO ref: Use brollModel from header (seedream-v4 / qwen-image / default)
// ============================================================================

interface ProviderSelection {
  primary: ImageModelKey;
  fallback: ImageModelKey;
}

// Default B-ROLL model when 'auto' mode
const DEFAULT_BROLL_MODEL: ImageModelKey = 'fal-seedream-v4'

function selectImageProvider(
  isCreatorShot: boolean, 
  hasReferenceImage: boolean = false,
  brollModel?: ImageModelKey,  // User's B-ROLL model choice from header
  includeCreatorFace: boolean = false,  // NEW: B-ROLL with creator face checkbox
  hasCreatorRef: boolean = false  // NEW: Has creator avatar for B-ROLL multi-ref
): ProviderSelection {
  if (isCreatorShot) {
    // HOOK/CTA segments - need face consistency
    if (hasReferenceImage) {
      // With reference: use /edit endpoint for face consistency
      return {
        primary: 'fal-nano-banana-edit',  // fal.ai Nano Banana Pro /edit (face consistency via image_urls)
        fallback: 'gpt-image-1'            // OpenAI fallback for face consistency
      }
    } else {
      // Without reference: use text-to-image
      return {
        primary: 'fal-nano-banana',  // fal.ai Nano Banana Pro T2I
        fallback: 'gpt-image-1'      // OpenAI fallback
      }
    }
  } else {
    // B-ROLL segments
    
    // NEW: B-ROLL with "Include Creator Face" checkbox checked
    // Use FLUX Kontext Multi for multi-image reference (creator face + scene ref)
    if (includeCreatorFace && hasCreatorRef) {
      return {
        primary: 'fal-flux-kontext-multi',  // FLUX Kontext Max Multi (multi-image support)
        fallback: 'fal-nano-banana-edit'     // Fallback to nano-banana-edit
      }
    }
    
    if (hasReferenceImage) {
      // ✅ B-ROLL with reference → use /edit model (supports reference images)
      return {
        primary: 'fal-nano-banana-edit',  // fal.ai Nano Banana Pro /edit (image_urls support)
        fallback: 'fal-nano-banana'        // fal.ai Nano Banana fallback
      }
    }
    // B-ROLL without reference - use user's selected model or default
    const selectedModel = brollModel || DEFAULT_BROLL_MODEL
    const fallbackModel: ImageModelKey = selectedModel === 'fal-seedream-v4' 
      ? 'fal-qwen-image' 
      : 'fal-seedream-v4'
    return {
      primary: selectedModel,
      fallback: fallbackModel
    }
  }
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
    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    
    // Stock image search keys - TEMPORARILY DISABLED (2026-01-11)
    // TODO: Re-enable when stock image feature is ready
    // const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY')
    // const pexelsKey = Deno.env.get('PEXELS_API_KEY')
    // const pixabayKey = Deno.env.get('PIXABAY_API_KEY')
    
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
      return await handleProcessSingle(supabase, requestBody, openaiApiKey, hfApiKey, falApiKey)
    }

    // ========================================================================
    // MODE: CHECK_STATUS - Get status of all jobs for a session
    // ========================================================================
    if (mode === 'check_status') {
      return await handleCheckStatus(supabase, requestBody)
    }

    // ========================================================================
    // MODE: REGENERATE_SINGLE - Create a new job for regenerating a single segment
    // (v2.0 multi-image gallery feature)
    // ========================================================================
    if (mode === 'regenerate_single') {
      return await handleRegenerateSingle(supabase, requestBody)
    }

    // ========================================================================
    // MODE: DEBUG_PROMPTS - Generate all prompts without executing (for debugging)
    // ========================================================================
    if (mode === 'debug_prompts') {
      return await handleDebugPrompts(requestBody)
    }

    // ========================================================================
    // MODE: LEGACY - Original synchronous processing (backward compatible)
    // ========================================================================
    return await handleLegacyMode(supabase, requestBody, openaiApiKey, hfApiKey, falApiKey)

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
    provider: defaultProvider = 'auto', // 'auto' = intelligent selection
    broll_model = 'fal-seedream-v4',    // User's B-ROLL model choice from header
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
  const costume = topic ? getCostumeForTopic(topic) : 'Navy blazer over white crew-neck tee'

  // Create job records
  const jobRecords = segments.map((segment: any, index: number) => {
    const segmentType = segment.segment_type || segment.type || `segment_${index}`
    const shotType = segment.shot_type || 'B-ROLL'
    const emotion = segment.emotion || 'authority'
    const charDesc = segment.character_description || character_description

    // Build the CINEMATIC image prompt (uses full knowledge tables)
    const imagePrompt = buildCinematicPrompt({
      segment,
      style,
      aspectRatio: aspect_ratio,
      topic,
      costume,
      characterDescription: charDesc,
      emotion
    })

    // Determine if this is a CREATOR shot (has face)
    const isCreatorShot = shotType === 'CREATOR' || 
      ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType.toUpperCase())
    
    // ========================================================================
    // REFERENCE IMAGE HANDLING (2026-01-14 Updated)
    // CREATOR shots: use character_ref_png (avatar for face consistency)
    // B-ROLL shots: use reference_image_url (scene reference from stock/upload)
    // B-ROLL with include_creator_face: use BOTH creator_ref + reference_image
    // ========================================================================
    const creatorRefImage = isCreatorShot ? (segment.character_ref_png || character_ref_png) : null
    const brollRefImage = !isCreatorShot ? (segment.reference_image_url || null) : null
    const hasReferenceImage = !!(creatorRefImage || brollRefImage)
    
    // NEW: B-ROLL with "Include Creator Face" checkbox
    const includeCreatorFace = !isCreatorShot && (segment.include_creator_face || false)
    const creatorRefForBroll = includeCreatorFace ? (segment.creator_ref_for_broll || character_ref_png || null) : null
    const hasCreatorRef = !!creatorRefForBroll
    
    // ========================================================================
    // PROVIDER SELECTION (2026-01-14 - Updated with FLUX Kontext Multi)
    // CREATOR with ref: fal-nano-banana-edit → gpt-image-1
    // CREATOR no ref: fal-nano-banana → gpt-image-1
    // B-ROLL with include_creator_face: fal-flux-kontext-multi → fal-nano-banana-edit
    // B-ROLL with ref: fal-nano-banana-edit → fal-nano-banana
    // B-ROLL no ref: broll_model (seedream-v4/qwen/etc) → fallback
    // ========================================================================
    let segmentProvider: ImageModelKey = defaultProvider as ImageModelKey
    let fallbackProvider: ImageModelKey = 'flux-schnell'
    
    if (defaultProvider === 'auto') {
      const providerChoice = selectImageProvider(
        isCreatorShot, 
        hasReferenceImage, 
        broll_model as ImageModelKey,
        includeCreatorFace,
        hasCreatorRef
      )
      segmentProvider = providerChoice.primary
      fallbackProvider = providerChoice.fallback
    }
    
    console.log(`[CREATE_JOBS] Segment ${index + 1} (${segmentType}): ${shotType} → ${segmentProvider} (ref: ${hasReferenceImage}, creator_face: ${includeCreatorFace}, fallback: ${fallbackProvider})`)
    
    return {
      user_id,
      session_id,
      segment_id: segment.segment_id || `SEG-${index + 1}`,
      segment_number: segment.segment_number || index + 1,
      segment_type: segmentType,
      shot_type: shotType,
      emotion,
      visual_prompt: imagePrompt,
      script_text: segment.script_text || segment.voiceover || '',  // Actual spoken script for product detection
      style,
      aspect_ratio,
      provider: segmentProvider,
      fallback_provider: fallbackProvider, // Store fallback for retry
      topic,
      character_description: charDesc,
      character_ref_png: creatorRefImage,  // Avatar for CREATOR shots
      reference_image_url: brollRefImage,  // Scene reference for B-ROLL shots
      // NEW: B-ROLL with creator face multi-ref fields
      include_creator_face: includeCreatorFace,
      creator_ref_for_broll: creatorRefForBroll,
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

async function handleProcessSingle(
  supabase: any, 
  requestBody: any, 
  openaiApiKey: string | undefined, 
  hfApiKey: string | undefined, 
  falApiKey: string | undefined
) {
  const { job_id, session_id, user_id } = requestBody
  const geminiGenApiKey = Deno.env.get('VEO_API_KEY') // GeminiGen uses same key as VEO

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

  console.log(`[PROCESS_SINGLE] Processing job ${job.id} - Segment ${job.segment_number} (${job.segment_type})`)

  // Update status to processing
  await supabase
    .from('image_generation_jobs')
    .update({ status: JOB_STATUS.PROCESSING, updated_at: new Date().toISOString() })
    .eq('id', job.id)

  // ========================================================================
  // STOCK IMAGE SEARCH - TEMPORARILY DISABLED (2026-01-11)
  // TODO: Re-enable when stock image feature is ready
  // ========================================================================
  const shotType = job.shot_type || 'B-ROLL'
  const segmentType = (job.segment_type || '').toUpperCase()
  const isCreatorShot = shotType === 'CREATOR' || 
    ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType)
  
  // COMMENTED OUT: Stock image search for B-ROLL product shots
  // For B-ROLL segments, check if we can use stock images instead of AI
  // if (!isCreatorShot && (unsplashKey || pexelsKey)) {
  //   // CRITICAL: Use script_text (spoken words) for product detection, NOT visual_prompt!
  //   const scriptText = job.script_text || ''
  //   const topic = job.topic || ''
  //   
  //   console.log(`[PROCESS_SINGLE] 🔍 Product detection using script_text: "${scriptText.substring(0, 100)}..."`)
  //   
  //   // Check for product entities in the content
  //   const imageSourceDecision = decideImageSource(scriptText, topic)
  //   
  //   if (imageSourceDecision.useStockImage && imageSourceDecision.searchQuery) {
  //     console.log(`[PROCESS_SINGLE] 📦 Product detected: ${imageSourceDecision.category}`)
  //     console.log(`[PROCESS_SINGLE] 🔍 Searching stock images: "${imageSourceDecision.searchQuery}"`)
  //     
  //     try {
  //       // Search stock images (Pexels → Unsplash → Pixabay)
  //       const stockResult = await searchProductImage(
  //         imageSourceDecision.searchQuery,
  //         unsplashKey,
  //         pexelsKey,
  //         pixabayKey
  //       )
  //       
  //       if (stockResult) {
  //         console.log(`[PROCESS_SINGLE] ✅ Stock image found from ${stockResult.source}`)
  //         
  //         // Download and upload to Supabase storage
  //         const stockImageUrl = await downloadAndUploadSearchImage(
  //           stockResult,
  //           supabase,
  //           unsplashKey // For Unsplash download tracking
  //         )
  //         
  //         if (stockImageUrl) {
  //           // Success! Update job and return early
  //           await supabase
  //             .from('image_generation_jobs')
  //             .update({ 
  //               status: JOB_STATUS.COMPLETED, 
  //               image_url: stockImageUrl,
  //               provider: `stock-${stockResult.source}`,
  //               updated_at: new Date().toISOString()
  //             })
  //             .eq('id', job.id)
  // 
  //           console.log(`[PROCESS_SINGLE] ✅ Job ${job.id} completed with stock image (${stockResult.source})`)
  // 
  //           // Check session completion status
  //           const { data: remainingJobs } = await supabase
  //             .from('image_generation_jobs')
  //             .select('id, status')
  //             .eq('session_id', job.session_id)
  //             .eq('user_id', job.user_id)
  // 
  //           const pending = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.PENDING).length || 0
  //           const processing = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.PROCESSING).length || 0
  //           const completed = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.COMPLETED).length || 0
  //           const failed = remainingJobs?.filter((j: any) => j.status === JOB_STATUS.FAILED).length || 0
  //           const total = remainingJobs?.length || 0
  //           const allComplete = pending === 0 && processing === 0
  // 
  //           if (allComplete && total > 0) {
  //             await createCompletionNotification(supabase, job.user_id, job.session_id, completed, failed, total)
  //           }
  // 
  //           return new Response(
  //             JSON.stringify({ 
  //               success: true, 
  //               data: { 
  //                 job: {
  //                   id: job.id,
  //                   segment_number: job.segment_number,
  //                   segment_type: job.segment_type,
  //                   image_url: stockImageUrl,
  //                   provider: `stock-${stockResult.source}`,
  //                   status: JOB_STATUS.COMPLETED
  //                 },
  //                 summary: { total, completed, failed, pending, processing },
  //                 all_complete: allComplete
  //               } 
  //             }),
  //             { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  //           )
  //         }
  //       }
  //       
  //       console.log(`[PROCESS_SINGLE] ⚠️ No stock image found, falling back to AI generation`)
  //     } catch (stockError) {
  //       console.warn(`[PROCESS_SINGLE] ⚠️ Stock search error: ${stockError}, falling back to AI generation`)
  //     }
  //   }
  // }

  // ========================================================================
  // GENERATE IMAGE WITH AI
  // Try primary provider first, then fallback if fails
  // ========================================================================
  const primaryProvider = (job.provider || 'nano-banana-pro') as ImageModelKey
  const fallbackProvider = (job.fallback_provider || 'flux-schnell') as ImageModelKey
  const aspectRatio = (job.aspect_ratio || '9:16') as AspectRatio
  
  let imageUrl: string | null = null
  let usedProvider: string = primaryProvider
  let errorMessages: string[] = []

  // ========================================================================
  // REFERENCE IMAGE SELECTION (2026-01-14 Updated with Multi-Ref Support)
  // CREATOR shots: use character_ref_png (avatar)
  // B-ROLL shots: use reference_image_url (scene reference)
  // B-ROLL with include_creator_face: use BOTH (creator_ref + scene_ref)
  // ========================================================================
  const includeCreatorFace = job.include_creator_face || false
  const creatorRefForBroll = job.creator_ref_for_broll || null
  
  // Build reference image(s) for generation
  let referenceImageForGeneration: string | undefined = undefined
  let multiRefImages: string[] | undefined = undefined
  
  if (isCreatorShot) {
    // CREATOR shots: single avatar reference
    referenceImageForGeneration = job.character_ref_png || undefined
  } else if (includeCreatorFace && creatorRefForBroll) {
    // B-ROLL with "Include Creator Face": multi-image reference
    // Use FLUX Kontext Multi which supports image_urls array
    multiRefImages = [creatorRefForBroll]
    if (job.reference_image_url) {
      multiRefImages.push(job.reference_image_url)
    }
    console.log(`[PROCESS_SINGLE] Multi-ref mode: ${multiRefImages.length} images (creator + scene)`)
  } else {
    // B-ROLL with scene reference only
    referenceImageForGeneration = job.reference_image_url || undefined
  }
  
  if (referenceImageForGeneration) {
    console.log(`[PROCESS_SINGLE] Reference image: ${referenceImageForGeneration.substring(0, 60)}...`)
  }

  // Helper function to generate image with a specific provider
  const generateWithProvider = async (providerKey: ImageModelKey): Promise<string | null> => {
    const providerConfig = IMAGE_MODELS[providerKey]
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${providerKey}`)
    }
    
    console.log(`[PROCESS_SINGLE] Trying provider: ${providerKey} (${providerConfig.displayName})`)
    
    if (providerConfig.provider === 'openai') {
      if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured')
      if (providerKey === 'dall-e-3') {
        return await generateWithDalle(openaiApiKey, job.visual_prompt, aspectRatio, supabase)
      } else {
        return await generateWithGptImage1(
          openaiApiKey, 
          job.visual_prompt, 
          aspectRatio, 
          supabase,
          referenceImageForGeneration
        )
      }
    } else if (providerConfig.provider === 'geminigen') {
      if (!geminiGenApiKey) throw new Error('VEO_API_KEY (GeminiGen) not configured')
      return await generateWithGeminiGen(
        geminiGenApiKey,
        job.visual_prompt,
        aspectRatio,
        providerKey,
        supabase,
        referenceImageForGeneration
      )
    } else if (providerConfig.provider === 'huggingface') {
      if (!hfApiKey) throw new Error('HUGGINGFACE_API_KEY not configured')
      return await generateWithFlux(hfApiKey, job.visual_prompt, aspectRatio, supabase)
    } else if (providerConfig.provider === 'fal') {
      if (!falApiKey) throw new Error('FAL_AI_API_KEY not configured')
      // Pass multiRefImages for FLUX Kontext Multi model
      return await generateWithFalAi(
        falApiKey,
        job.visual_prompt,
        aspectRatio,
        providerKey,
        supabase,
        referenceImageForGeneration,
        multiRefImages  // NEW: Array of images for multi-ref models
      )
    }
    
    throw new Error(`Unsupported provider type: ${providerConfig.provider}`)
  }

  try {
    // Try PRIMARY provider first
    try {
      imageUrl = await generateWithProvider(primaryProvider)
      usedProvider = primaryProvider
      console.log(`[PROCESS_SINGLE] ✅ Primary provider (${primaryProvider}) succeeded`)
    } catch (primaryError) {
      const primaryErrorMsg = primaryError instanceof Error ? primaryError.message : 'Unknown error'
      console.warn(`[PROCESS_SINGLE] ⚠️ Primary provider (${primaryProvider}) failed: ${primaryErrorMsg}`)
      errorMessages.push(`Primary (${primaryProvider}): ${primaryErrorMsg}`)
      
      // Try FALLBACK provider
      if (fallbackProvider && fallbackProvider !== primaryProvider) {
        console.log(`[PROCESS_SINGLE] Trying fallback provider: ${fallbackProvider}`)
        try {
          imageUrl = await generateWithProvider(fallbackProvider)
          usedProvider = fallbackProvider
          console.log(`[PROCESS_SINGLE] ✅ Fallback provider (${fallbackProvider}) succeeded`)
        } catch (fallbackError) {
          const fallbackErrorMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          console.error(`[PROCESS_SINGLE] ❌ Fallback provider (${fallbackProvider}) also failed: ${fallbackErrorMsg}`)
          errorMessages.push(`Fallback (${fallbackProvider}): ${fallbackErrorMsg}`)
          throw new Error(`All providers failed: ${errorMessages.join(' | ')}`)
        }
      } else {
        throw primaryError
      }
    }

    // Update job as completed
    await supabase
      .from('image_generation_jobs')
      .update({ 
        status: JOB_STATUS.COMPLETED, 
        image_url: imageUrl,
        provider: usedProvider, // Update with actual provider used
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`[PROCESS_SINGLE] ✅ Job ${job.id} completed with provider: ${usedProvider}`)

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
            provider: usedProvider,
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

// ============================================================================
// REGENERATE_SINGLE - Create new job for regenerating a single segment
// (v2.0 multi-image gallery feature)
// Updated 2026-01-14: Added include_creator_face + creator_ref_for_broll support
// ============================================================================
async function handleRegenerateSingle(supabase: any, requestBody: any) {
  const {
    user_id,
    session_id,
    segment_number,
    generation_number,
    regeneration_notes,
    reference_image_url,
    visual_prompt,
    script_text,
    segment_type,
    shot_type,
    emotion,
    aspect_ratio,
    // NEW: B-ROLL with creator face multi-ref fields
    include_creator_face,
    creator_ref_for_broll
  } = requestBody

  if (!user_id || !session_id || !segment_number) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing required fields: user_id, session_id, segment_number' }
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Create new job record with incremented generation_number
    const segmentId = `${session_id}_${segment_number}`
    
    // Determine provider based on shot type and reference images
    const isCreatorShot = shot_type === 'CREATOR' || 
      ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes((segment_type || '').toUpperCase())
    const hasReferenceImage = !!reference_image_url
    const hasCreatorRef = !!creator_ref_for_broll
    
    // Select provider using same logic as handleCreateJobs
    const providerChoice = selectImageProvider(
      isCreatorShot,
      hasReferenceImage,
      undefined, // broll_model - use default
      include_creator_face || false,
      hasCreatorRef
    )

    const newJob = {
      user_id,
      session_id,
      segment_id: segmentId,
      segment_number,
      segment_type: segment_type || 'UNKNOWN',
      shot_type: shot_type || 'B-ROLL',
      emotion: emotion || null,
      visual_prompt: visual_prompt || '',
      script_text: script_text || '',
      aspect_ratio: aspect_ratio || '9:16',
      generation_number: generation_number || 1,
      regeneration_notes: regeneration_notes || null,
      reference_image_url: reference_image_url || null,
      // NEW: B-ROLL with creator face multi-ref fields
      include_creator_face: include_creator_face || false,
      creator_ref_for_broll: creator_ref_for_broll || null,
      // Provider selection
      provider: providerChoice.primary,
      fallback_provider: providerChoice.fallback,
      source_type: 'generated',
      is_selected: false,  // New generated image is not auto-selected
      status: JOB_STATUS.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log(`[REGENERATE_SINGLE] Creating job: provider=${providerChoice.primary}, include_creator_face=${include_creator_face || false}`)

    const { data: insertedJob, error: insertError } = await supabase
      .from('image_generation_jobs')
      .insert(newJob)
      .select()
      .single()

    if (insertError) {
      console.error('[REGENERATE_SINGLE] Insert error:', insertError)
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'DB_ERROR', message: `Failed to create job: ${insertError.message}` }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[REGENERATE_SINGLE] ✅ Created job ${insertedJob.id} for segment ${segment_number} (generation #${generation_number})`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          job: insertedJob,
          message: `Regeneration job created for segment ${segment_number}`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[REGENERATE_SINGLE] ❌ Error: ${errorMessage}`)
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: errorMessage }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// ============================================================================
// DEBUG_PROMPTS MODE - Generate all prompts without executing (for debugging)
// Returns detailed breakdown of prompt generation logic per segment
// ============================================================================

interface DebugSegmentResult {
  segment_number: number
  segment_type: string
  shot_type: string
  emotion: string
  is_creator_shot: boolean
  has_reference_image: boolean
  
  // Input data
  script_text: string
  visual_direction: string
  
  // Provider selection
  provider_selection: {
    primary: string
    fallback: string
    selection_reason: string
  }
  
  // Stock image decision
  stock_image_decision: {
    use_stock_image: boolean
    category: string | null
    search_query: string | null
    reason: string
  }
  
  // Visual Brief extraction (for B-roll)
  visual_brief: {
    topic_keywords: string[]
    abstract_concepts: string[]
    primary_visual: string | null
    secondary_elements: string[]
    environment: string | null
  } | null
  
  // Final prompts
  final_image_prompt: string
  negative_prompt: string | null
  
  // Cinematography details (for CREATOR shots)
  cinematography: {
    shot_size: string
    lighting: string
    emotion_expression: string
  } | null
}

async function handleDebugPrompts(requestBody: any): Promise<Response> {
  const { 
    segments, 
    topic, 
    style = 'cinematic', 
    aspect_ratio = '9:16',
    provider: defaultProvider = 'auto',
    broll_model = 'fal-seedream-v4',  // User's B-ROLL model choice
    character_description = '',
    character_ref_png = ''
  } = requestBody

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing or invalid segments array' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[DEBUG_PROMPTS] Processing ${segments.length} segments for debugging`)
  console.log(`[DEBUG_PROMPTS] Topic: "${topic}", Style: ${style}, Aspect: ${aspect_ratio}`)

  const costume = topic ? getCostumeForTopic(topic) : 'Navy blazer over white crew-neck tee'
  const debugResults: DebugSegmentResult[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentType = segment.segment_type || segment.type || `segment_${i}`
    const shotType = segment.shot_type || 'B-ROLL'
    const emotion = segment.emotion || 'authority'
    const charDesc = segment.character_description || character_description

    // Determine if CREATOR shot
    const isCreatorShot = shotType === 'CREATOR' || 
      ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType.toUpperCase())
    
    // Reference image (2026-01-14: B-ROLL can also have reference!)
    const creatorRef = isCreatorShot ? (segment.character_ref_png || character_ref_png) : null
    const brollRef = !isCreatorShot ? (segment.reference_image_url || null) : null
    const hasReferenceImage = !!(creatorRef || brollRef)

    // Provider selection
    let primaryProvider: ImageModelKey = defaultProvider as ImageModelKey
    let fallbackProvider: ImageModelKey = 'flux-schnell'
    let selectionReason = ''
    
    if (defaultProvider === 'auto') {
      const providerChoice = selectImageProvider(isCreatorShot, hasReferenceImage, broll_model as ImageModelKey)
      primaryProvider = providerChoice.primary
      fallbackProvider = providerChoice.fallback
      
      if (isCreatorShot) {
        if (hasReferenceImage) {
          selectionReason = 'CREATOR shot WITH reference → fal-nano-banana-edit (face consistency via image_urls)'
        } else {
          selectionReason = 'CREATOR shot WITHOUT reference → fal-nano-banana (text-to-image)'
        }
      } else {
        if (hasReferenceImage) {
          selectionReason = 'B-ROLL shot WITH reference → fal-nano-banana-edit (scene reference via image_urls)'
        } else {
          selectionReason = `B-ROLL shot → ${broll_model} (user-selected model from header)`
        }
      }
    } else {
      selectionReason = `Manual provider override: ${defaultProvider}`
    }

    // Get script text for analysis
    const scriptText = segment.script_text || segment.voiceover || segment.text || ''
    const visualDirection = segment.visual_prompt || segment.visual_direction || ''

    // Stock image decision (for B-roll only) - TEMPORARILY DISABLED (2026-01-11)
    // TODO: Re-enable when stock image feature is ready
    let stockDecision = {
      use_stock_image: false,
      category: null as string | null,
      search_query: null as string | null,
      reason: 'Stock image search temporarily disabled' as string
    }
    
    // if (!isCreatorShot) {
    //   const imageSourceDecision = decideImageSource(scriptText, topic)
    //   stockDecision = {
    //     use_stock_image: imageSourceDecision.useStockImage,
    //     category: imageSourceDecision.category || null,
    //     search_query: imageSourceDecision.searchQuery || null,
    //     reason: imageSourceDecision.useStockImage 
    //       ? `Product entity detected: ${imageSourceDecision.category}`
    //       : 'No recognizable product entity in script_text'
    //   }
    // }

    // Visual Brief extraction - REPLACED (2026-01-11)
    // B-ROLL now uses visual_direction directly from script generation
    let visualBriefResult = null
    if (!isCreatorShot && visualDirection) {
      // Instead of buildVisualBrief, show the visual_direction that will be used
      visualBriefResult = {
        source: 'visual_direction (direct from script generation)',
        prompt_length: visualDirection.length,
        preview: visualDirection.substring(0, 200) + (visualDirection.length > 200 ? '...' : ''),
        note: 'Script generation already produces cinematic prompts. buildVisualBrief() bypassed.'
      }
    }

    // Build the actual image prompt
    const imagePrompt = buildCinematicPrompt({
      segment,
      style,
      aspectRatio: aspect_ratio,
      topic,
      costume,
      characterDescription: charDesc,
      emotion
    })

    // Get negative prompt (for B-roll with fal-wan-t2i)
    let negativePrompt: string | null = null
    if (!isCreatorShot && primaryProvider === 'fal-wan-t2i') {
      negativePrompt = getBRollNegativePrompt('combined')
    }

    // Cinematography details (for CREATOR shots)
    let cinematographyDetails = null
    if (isCreatorShot) {
      const segmentDefaults = getSegmentDefaults(segmentType.toUpperCase())
      const emotionSpecs = getEmotionSpecs(emotion as any)
      
      cinematographyDetails = {
        shot_size: segmentDefaults?.shotType || 'CU',
        lighting: emotionSpecs?.lighting || 'Rembrandt 4:1',
        emotion_expression: emotionSpecs?.expression || 'engaged expression'
      }
    }

    debugResults.push({
      segment_number: segment.segment_number || i + 1,
      segment_type: segmentType,
      shot_type: shotType,
      emotion,
      is_creator_shot: isCreatorShot,
      has_reference_image: hasReferenceImage,
      
      script_text: scriptText,
      visual_direction: visualDirection,
      
      provider_selection: {
        primary: primaryProvider,
        fallback: fallbackProvider,
        selection_reason: selectionReason
      },
      
      stock_image_decision: stockDecision,
      visual_brief: visualBriefResult,
      
      final_image_prompt: imagePrompt,
      negative_prompt: negativePrompt,
      cinematography: cinematographyDetails
    })
  }

  console.log(`[DEBUG_PROMPTS] ✅ Generated debug data for ${debugResults.length} segments`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        segments: debugResults,
        metadata: {
          topic,
          style,
          aspect_ratio,
          costume,
          character_description,
          character_ref_png: character_ref_png ? `${character_ref_png.substring(0, 50)}...` : null,
          provider_mode: defaultProvider,
          total_segments: debugResults.length,
          creator_shots: debugResults.filter(s => s.is_creator_shot).length,
          broll_shots: debugResults.filter(s => !s.is_creator_shot).length
        }
      } 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleLegacyMode(
  supabase: any, 
  requestBody: any, 
  openaiApiKey: string | undefined, 
  hfApiKey: string | undefined, 
  falApiKey: string | undefined
  // TEMPORARILY DISABLED (2026-01-11): Stock image search parameters
  // TODO: Re-enable when stock image feature is ready
  // unsplashKey: string | undefined,
  // pexelsKey: string | undefined,
  // pixabayKey: string | undefined
) {
  // Original synchronous processing for backward compatibility
  const segments = requestBody.segments
  const style = requestBody.style || 'cinematic'
  const aspectRatio: '9:16' | '16:9' | '1:1' = requestBody.aspect_ratio || '9:16'
  const defaultProvider = requestBody.provider || 'auto' // 'auto' = fal.ai primary
  const brollModel = requestBody.broll_model || 'fal-seedream-v4' // User's B-ROLL model choice
  const topic = requestBody.topic || ''
  const characterDescription = requestBody.character_description || ''
  const characterRefPng = requestBody.character_ref_png || '' // Avatar URL for face consistency
  const geminiGenApiKey = Deno.env.get('VEO_API_KEY')

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing or invalid segments array' } }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const images: ImageResult[] = []
  const costume = topic ? getCostumeForTopic(topic) : 'Navy blazer over white crew-neck tee'

  console.log(`[LEGACY] Starting generation for ${segments.length} segments`)
  console.log(`[LEGACY] Provider mode: ${defaultProvider}, Style: ${style}, Aspect: ${aspectRatio}`)

  // Helper function to generate image with a specific provider (with fallback)
  const generateWithProviderAndFallback = async (
    primaryProvider: ImageModelKey,
    fallbackProvider: ImageModelKey,
    prompt: string,
    refImage?: string
  ): Promise<{ imageUrl: string | null; usedProvider: string; error: string | null }> => {
    
    const tryProvider = async (providerKey: ImageModelKey): Promise<string> => {
      const config = IMAGE_MODELS[providerKey]
      if (!config) throw new Error(`Unknown provider: ${providerKey}`)
      
      console.log(`[LEGACY] Trying provider: ${providerKey}`)
      
      if (config.provider === 'openai') {
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured')
        if (providerKey === 'dall-e-3') {
          return await generateWithDalle(openaiApiKey, prompt, aspectRatio, supabase)
        } else {
          return await generateWithGptImage1(openaiApiKey, prompt, aspectRatio, supabase, refImage)
        }
      } else if (config.provider === 'geminigen') {
        if (!geminiGenApiKey) throw new Error('VEO_API_KEY (GeminiGen) not configured')
        return await generateWithGeminiGen(geminiGenApiKey, prompt, aspectRatio, providerKey, supabase, refImage)
      } else if (config.provider === 'huggingface') {
        if (!hfApiKey) throw new Error('HUGGINGFACE_API_KEY not configured')
        return await generateWithFlux(hfApiKey, prompt, aspectRatio, supabase)
      } else if (config.provider === 'fal') {
        if (!falApiKey) throw new Error('FAL_AI_API_KEY not configured')
        return await generateWithFalAi(falApiKey, prompt, aspectRatio, providerKey, supabase, refImage)
      }
      throw new Error(`Unsupported provider: ${config.provider}`)
    }
    
    // Try PRIMARY first
    try {
      const imageUrl = await tryProvider(primaryProvider)
      return { imageUrl, usedProvider: primaryProvider, error: null }
    } catch (primaryErr) {
      const primaryError = primaryErr instanceof Error ? primaryErr.message : 'Unknown error'
      console.warn(`[LEGACY] ⚠️ Primary (${primaryProvider}) failed: ${primaryError}`)
      
      // Try FALLBACK
      if (fallbackProvider && fallbackProvider !== primaryProvider) {
        try {
          const imageUrl = await tryProvider(fallbackProvider)
          console.log(`[LEGACY] ✅ Fallback (${fallbackProvider}) succeeded`)
          return { imageUrl, usedProvider: fallbackProvider, error: null }
        } catch (fallbackErr) {
          const fallbackError = fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'
          console.error(`[LEGACY] ❌ Fallback (${fallbackProvider}) also failed: ${fallbackError}`)
          return { imageUrl: null, usedProvider: primaryProvider, error: `Primary: ${primaryError} | Fallback: ${fallbackError}` }
        }
      }
      return { imageUrl: null, usedProvider: primaryProvider, error: primaryError }
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentType = segment.segment_type || segment.type || `segment_${i}`
    const shotType = segment.shot_type || 'B-ROLL'
    const emotion = segment.emotion || 'authority'
    
    // Determine if this is a CREATOR shot (has face)
    const isCreatorShot = shotType === 'CREATOR' || 
      ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType.toUpperCase())
    
    // ========================================================================
    // REFERENCE IMAGE HANDLING (2026-01-14 Updated)
    // CREATOR shots: use character_ref_png (avatar for face consistency)
    // B-ROLL shots: use reference_image_url (scene reference from stock/upload)
    // ========================================================================
    const refImage = isCreatorShot 
      ? (segment.character_ref_png || characterRefPng || undefined)
      : (segment.reference_image_url || undefined)  // B-ROLL can also have reference!
    const hasReferenceImage = !!refImage
    
    // ========================================================================
    // PROVIDER SELECTION (2026-01-14 - Updated with Seedream v4 + QWEN)
    // CREATOR with ref: fal-nano-banana-edit → gpt-image-1
    // CREATOR no ref: fal-nano-banana → gpt-image-1
    // B-ROLL with ref: fal-nano-banana-edit → fal-nano-banana
    // B-ROLL no ref: brollModel (seedream-v4/qwen/etc) → fallback
    // ========================================================================
    let primaryProvider: ImageModelKey = defaultProvider as ImageModelKey
    let fallbackProvider: ImageModelKey = 'flux-schnell'
    
    if (defaultProvider === 'auto') {
      const providerChoice = selectImageProvider(isCreatorShot, hasReferenceImage, brollModel as ImageModelKey)
      primaryProvider = providerChoice.primary
      fallbackProvider = providerChoice.fallback
    }
    
    // Build the CINEMATIC image prompt (uses full knowledge tables)
    const imagePrompt = buildCinematicPrompt({
      segment,
      style,
      aspectRatio,
      topic,
      costume,
      characterDescription: segment.character_description || characterDescription,
      emotion
    })
    
    console.log(`[LEGACY] ${i + 1}/${segments.length}: ${segmentType} (${shotType}) → ${primaryProvider} (ref: ${hasReferenceImage}, fallback: ${fallbackProvider})`)

    // ========================================================================
    // STOCK IMAGE SEARCH FOR B-ROLL PRODUCT SHOTS - TEMPORARILY DISABLED (2026-01-11)
    // TODO: Re-enable when stock image feature is ready
    // Try stock images FIRST for B-roll with product entities → skip AI if found
    // ========================================================================
    // let stockImageUsed = false
    // let stockImageUrl: string | null = null
    // let stockProvider: string | null = null
    // 
    // if (!isCreatorShot && (unsplashKey || pexelsKey)) {
    //   // CRITICAL: Use script_text (spoken words) for product detection, NOT visual_prompt!
    //   const scriptText = segment.script_text || segment.voiceover || ''
    //   
    //   console.log(`[LEGACY] 🔍 Product detection using script_text: "${scriptText.substring(0, 100)}..."`)
    //   
    //   // Check for product entities in the content
    //   const imageSourceDecision = decideImageSource(scriptText, topic)
    //   
    //   if (imageSourceDecision.useStockImage && imageSourceDecision.searchQuery) {
    //     console.log(`[LEGACY] 📦 Product detected: ${imageSourceDecision.category}`)
    //     console.log(`[LEGACY] 🔍 Searching stock images: "${imageSourceDecision.searchQuery}"`)
    //     
    //     try {
    //       // Search stock images (Pexels → Unsplash → Pixabay)
    //       const stockResult = await searchProductImage(
    //         imageSourceDecision.searchQuery,
    //         unsplashKey,
    //         pexelsKey,
    //         pixabayKey
    //       )
    //       
    //       if (stockResult) {
    //         console.log(`[LEGACY] ✅ Stock image found from ${stockResult.source}`)
    //         
    //         // Download and upload to Supabase storage
    //         stockImageUrl = await downloadAndUploadSearchImage(
    //           stockResult,
    //           supabase,
    //           unsplashKey // For Unsplash download tracking
    //         )
    //         
    //         if (stockImageUrl) {
    //           stockImageUsed = true
    //           stockProvider = `stock-${stockResult.source}`
    //           console.log(`[LEGACY] ✅ Using stock image for ${segmentType}`)
    //         }
    //       } else {
    //         console.log(`[LEGACY] ⚠️ No stock image found, falling back to AI generation`)
    //       }
    //     } catch (stockError) {
    //       console.warn(`[LEGACY] ⚠️ Stock search error: ${stockError}, falling back to AI generation`)
    //     }
    //   }
    // }
    // 
    // // If stock image found, skip AI generation
    // if (stockImageUsed && stockImageUrl) {
    //   images.push({
    //     segment_number: segment.segment_number,
    //     segment_type: segmentType,
    //     shot_type: shotType,
    //     emotion: emotion,
    //     prompt: imagePrompt,
    //     image_url: stockImageUrl,
    //     provider: stockProvider || 'stock',
    //     error: null
    //   })
    //   
    //   console.log(`[LEGACY] ✅ Success: ${segmentType} via ${stockProvider}`)
    //   
    //   if (i < segments.length - 1) {
    //     await new Promise(resolve => setTimeout(resolve, 500)) // Shorter delay for stock
    //   }
    //   continue // Skip AI generation
    // }

    // Generate with automatic fallback (AI generation)
    const result = await generateWithProviderAndFallback(primaryProvider, fallbackProvider, imagePrompt, refImage)
    
    const providerConfig = IMAGE_MODELS[result.usedProvider as ImageModelKey]
    const providerString = providerConfig?.displayName || result.usedProvider
    
    images.push({
      segment_number: segment.segment_number,
      segment_type: segmentType,
      shot_type: shotType,
      emotion: emotion,
      prompt: imagePrompt,
      image_url: result.imageUrl,
      provider: providerString,
      error: result.error
    })

    if (result.imageUrl) {
      console.log(`[LEGACY] ✅ Success: ${segmentType} via ${result.usedProvider}`)
    } else {
      console.error(`[LEGACY] ❌ Failed: ${segmentType} - ${result.error}`)
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
        provider_mode: defaultProvider, // 'auto' = Nano Banana primary
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
// CINEMATIC PROMPT BUILDER (2026-01-10 - Using New Lookup Modules)
// ============================================================================

function buildCinematicPrompt(params: PromptParams): string {
  const { segment, style, aspectRatio, topic, costume, characterDescription, emotion } = params
  
  const shotType = segment.shot_type || 'B-ROLL'
  const segmentType = (segment.segment_type || segment.type || '').toUpperCase()
  const visualDirection = segment.visual_prompt || segment.visual_direction || ''
  
  // Get segment defaults from new lookup module
  const segmentDefaults = getSegmentDefaults(segmentType) || getSegmentDefaults('BODY')
  const defaultShot = ['HOOK', 'CTA', 'LOOP-END'].includes(segmentType) ? 'CU' : 'MS'
  const mappedShotType = segmentDefaults?.shot || defaultShot

  // CREATOR SHOT - Use ENHANCED cinematography prompt builder (400+ chars)
  if (shotType === 'CREATOR' || ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'].includes(segmentType)) {
    const charDesc = characterDescription || segment.character_description || 'Professional content creator, confident posture, engaging presence'
    
    // Use FULL prompt builder (2026-01-11 enhanced)
    const fullPrompt = buildFullCinematographyPrompt({
      characterDescription: charDesc,
      emotion: emotion,
      topic: topic,
      shotType: mappedShotType,
      segmentType: segmentType,
      aspectRatio: aspectRatio,
      costume: costume,
      visualReference: undefined // Can add film reference if needed
    })
    
    console.log(`[buildCinematicPrompt] CREATOR shot prompt length: ${fullPrompt.length} chars`)
    return fullPrompt
  }
  
  // ========================================================================
  // B-ROLL SHOT - Use visual_direction directly from script generation
  // CRITICAL FIX (2026-01-11): Script gen already produces excellent prompts!
  // visual_direction contains segment-specific cinematic prompts.
  // DO NOT use buildVisualBrief() - it causes topic keywords to override segment content.
  // ========================================================================
  
  // Debug logging
  console.log(`[buildCinematicPrompt] Segment: ${segmentType}, Shot: ${shotType}`)
  console.log(`[buildCinematicPrompt] visual_direction: "${visualDirection.substring(0, 100)}..."`)
  
  // PRIMARY: Use visual_direction from script generation (already cinematic prompt)
  if (visualDirection && visualDirection.length > 50) {
    console.log(`[buildCinematicPrompt] ✅ Using visual_direction directly (${visualDirection.length} chars)`)
    return visualDirection
  }
  
  // FALLBACK: If no visual_direction, build basic cinematic prompt from topic
  console.log(`[buildCinematicPrompt] ⚠️ No visual_direction, using topic-based fallback`)
  const visual = topic 
    ? `Professional ${topic} concept visualization - modern technology scene`
    : 'Modern technology concept - clean professional imagery'
  
  return `Cinematic ${mappedShotType} of ${visual}.
Film stock: Vision3 500T. Color: Teal-orange grade.
Professional cinematography, 8K quality.
Clean frame, no text, no watermarks.`
}

// ============================================================================
// DALL-E 3 Generation (using centralized config)
// ============================================================================

async function generateWithDalle(
  apiKey: string, 
  prompt: string, 
  aspectRatio: AspectRatio, 
  supabase: any
): Promise<string> {
  const modelConfig = IMAGE_MODELS['dall-e-3']
  const sizeConfig = modelConfig.aspectRatios[aspectRatio]
  const size = sizeConfig ? getAspectRatioApiValue(modelConfig, aspectRatio) : '1024x1792'
  
  console.log(`[DALL-E] Size: ${size}, Prompt length: ${prompt.length} chars`)
  
  const response = await fetch(modelConfig.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelConfig.apiModelName,
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'hd',
      style: 'vivid',
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
// FLUX Generation (HuggingFace - FREE, using centralized config)
// ============================================================================

async function generateWithFlux(
  apiKey: string, 
  prompt: string, 
  aspectRatio: AspectRatio, 
  supabase: any
): Promise<string> {
  const modelConfig = IMAGE_MODELS['flux-schnell']
  const dimensions = getDimensions(modelConfig, aspectRatio) || { width: 576, height: 1024 }
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    console.log(`[FLUX] Resolution: ${dimensions.width}x${dimensions.height}, Prompt length: ${prompt.length} chars`)
    
    const response = await fetch(
      modelConfig.endpoint,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { 
            width: dimensions.width, 
            height: dimensions.height 
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
// GPT-Image-1 Generation (OpenAI - Premium, using centralized config)
// Supports character reference via Image Edit API for consistent faces
// Based on OpenAI docs: https://platform.openai.com/docs/guides/image-generation
// ============================================================================

async function generateWithGptImage1(
  apiKey: string,
  prompt: string,
  aspectRatio: AspectRatio,
  supabase: any,
  referenceImageUrl?: string // Avatar URL for character consistency
): Promise<string> {
  const modelConfig = IMAGE_MODELS['gpt-image-1']
  const size = getAspectRatioApiValue(modelConfig, aspectRatio) || '1024x1536'
  
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
      formData.append('model', modelConfig.apiModelName)
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
  const modelConfig = IMAGE_MODELS['gpt-image-1']
  console.log(`[GPT-IMAGE-1] Size: ${size}, Prompt length: ${prompt.length} chars`)
  
  const response = await fetch(modelConfig.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelConfig.apiModelName,
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

// ============================================================================
// GEMINIGEN IMAGE GENERATION (Nano Banana / Imagen models - using centralized config)
// FREE tier with rate limits: 5 req/min, 100/hour, 1000/day
// Supports reference images via file_urls parameter
// ============================================================================

async function generateWithGeminiGen(
  apiKey: string,
  prompt: string,
  aspectRatio: AspectRatio,
  modelKey: ImageModelKey,
  supabase: any,
  referenceImageUrl?: string
): Promise<string> {
  const modelConfig = IMAGE_MODELS[modelKey]
  if (!modelConfig || modelConfig.provider !== 'geminigen') {
    throw new Error(`Invalid GeminiGen model: ${modelKey}`)
  }
  
  const aspectRatioApiValue = getAspectRatioApiValue(modelConfig, aspectRatio) || '9:16'
  
  console.log(`[GEMINIGEN] Model: ${modelConfig.apiModelName}, Aspect: ${aspectRatioApiValue}`)
  console.log(`[GEMINIGEN] Prompt length: ${prompt.length} chars`)
  if (referenceImageUrl) {
    console.log(`[GEMINIGEN] Reference image provided`)
  }
  
  // Build FormData for GeminiGen API
  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('model', modelConfig.apiModelName)
  formData.append('aspect_ratio', aspectRatioApiValue)
  
  // Add style if applicable (default to Photorealistic for video content)
  if (modelConfig.styleOptions && modelConfig.styleOptions.length > 0) {
    formData.append('style', 'Photorealistic')
  }
  
  // Add reference image if provided and supported
  if (referenceImageUrl && modelConfig.refImageParam) {
    formData.append(modelConfig.refImageParam, referenceImageUrl)
  }
  
  const response = await fetch(GEMINIGEN_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey
      // Note: Don't set Content-Type - fetch sets multipart/form-data with boundary
    },
    body: formData
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GeminiGen API error: ${response.status} - ${errorText}`)
  }
  
  const responseData = await response.json()
  
  // GeminiGen returns async - status 1 = processing, 2 = completed
  // For immediate response, they return generate_result URL if ready
  // Otherwise we need to poll
  
  if (responseData.status === 2 && responseData.generate_result) {
    // Image ready immediately
    console.log(`[GEMINIGEN] ✅ Image ready immediately`)
    return await downloadAndUploadImage(responseData.generate_result, 'geminigen', supabase)
  }
  
  if (responseData.uuid) {
    // Need to poll for completion
    console.log(`[GEMINIGEN] Polling for UUID: ${responseData.uuid}`)
    return await pollGeminiGenResult(apiKey, responseData.uuid, supabase)
  }
  
  throw new Error('GeminiGen API returned unexpected response format')
}

// Helper: Poll GeminiGen for image completion
async function pollGeminiGenResult(
  apiKey: string,
  uuid: string,
  supabase: any,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs))
    
    const response = await fetch(`${GEMINIGEN_HISTORY_ENDPOINT}/${uuid}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    })
    
    if (!response.ok) {
      console.warn(`[GEMINIGEN] Poll attempt ${attempt + 1} failed: ${response.status}`)
      continue
    }
    
    const data = await response.json()
    
    if (data.status === 2 && data.generate_result) {
      console.log(`[GEMINIGEN] ✅ Image ready after ${attempt + 1} polls`)
      return await downloadAndUploadImage(data.generate_result, 'geminigen', supabase)
    }
    
    if (data.status === 3) {
      throw new Error(`GeminiGen generation failed: ${data.error_message || 'Unknown error'}`)
    }
    
    console.log(`[GEMINIGEN] Poll ${attempt + 1}/${maxAttempts}: status=${data.status}, progress=${data.status_percentage || 0}%`)
  }
  
  throw new Error(`GeminiGen generation timed out after ${maxAttempts} attempts`)
}

// Helper: Download image from URL and upload to Supabase storage
async function downloadAndUploadImage(
  imageUrl: string,
  prefix: string,
  supabase: any
): Promise<string> {
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`)
  }
  
  const imageBlob = await imageResponse.blob()
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

// ============================================================================
// FAL.AI IMAGE GENERATION (2026-01-14 Updated with FLUX Kontext Multi)
// fal-nano-banana: Text-to-image (NO reference image support!)
// fal-nano-banana-edit: Image edit with image_urls array (face consistency)
// fal-flux-kontext-multi: Multi-image reference (B-ROLL with creator face)
// fal-seedream-v4: High-res B-ROLL (ByteDance)
// fal-qwen-image: B-ROLL with negative prompt support
// ============================================================================

async function generateWithFalAi(
  apiKey: string,
  prompt: string,
  aspectRatio: AspectRatio,
  modelKey: ImageModelKey,
  supabase: any,
  referenceImageUrl?: string,
  multiRefImages?: string[]  // NEW: Array of images for multi-ref models
): Promise<string> {
  const modelConfig = IMAGE_MODELS[modelKey]
  if (!modelConfig || modelConfig.provider !== 'fal') {
    throw new Error(`Invalid fal.ai model: ${modelKey}`)
  }
  
  // Get dimensions based on aspect ratio
  const dimensions = getDimensions(modelConfig, aspectRatio) || { width: 1024, height: 1792 }
  
  console.log(`[FAL.AI] Model: ${modelConfig.apiModelName}`)
  console.log(`[FAL.AI] Endpoint: ${modelConfig.endpoint}`)
  console.log(`[FAL.AI] Size: ${dimensions.width}x${dimensions.height}`)
  console.log(`[FAL.AI] Prompt length: ${prompt.length} chars`)
  
  // Build request body based on model type
  const requestBody: Record<string, any> = {
    prompt: prompt,
    image_size: {
      width: dimensions.width,
      height: dimensions.height
    },
    num_inference_steps: 25,
    guidance_scale: 5.0,
    output_format: 'png'
  }
  
  // Model-specific configurations
  if (modelKey === 'fal-flux-kontext-multi') {
    // ========================================================================
    // FLUX KONTEXT MAX MULTI - Multi-image reference for B-ROLL with creator face
    // Supports image_urls array (2+ reference images)
    // Use case: Combine creator avatar + scene reference for consistent B-ROLL
    // ========================================================================
    if (!multiRefImages || multiRefImages.length === 0) {
      console.warn(`[FAL.AI] fal-flux-kontext-multi called without multi-ref images - using single ref if available`)
      if (referenceImageUrl) {
        requestBody.image_urls = [referenceImageUrl]
      }
    } else {
      // Use the multi-ref images array
      requestBody.image_urls = multiRefImages
      console.log(`[FAL.AI] Using FLUX Kontext Multi with ${multiRefImages.length} reference images:`)
      multiRefImages.forEach((url, i) => {
        console.log(`[FAL.AI]   Image ${i + 1}: ${url.substring(0, 60)}...`)
      })
    }
    // FLUX Kontext specific settings
    requestBody.guidance_scale = 3.5  // Recommended for Kontext
    requestBody.num_images = 1
    requestBody.safety_tolerance = '2'  // 1=strictest, 6=most permissive
    // Remove image_size for Kontext - uses aspect_ratio instead
    delete requestBody.image_size
    requestBody.aspect_ratio = aspectRatio  // '9:16', '16:9', etc.
    console.log(`[FAL.AI] FLUX Kontext Multi configured for B-ROLL with creator face`)
  } else if (modelKey === 'fal-nano-banana-edit') {
    // ========================================================================
    // NANO BANANA PRO /EDIT - Supports image_urls array for face consistency
    // This is the KEY endpoint for CREATOR shots with avatar reference
    // ========================================================================
    if (!referenceImageUrl) {
      console.warn(`[FAL.AI] fal-nano-banana-edit called without reference image - falling back to T2I behavior`)
    } else {
      // image_urls is an ARRAY of reference images (up to 14)
      requestBody.image_urls = [referenceImageUrl]
      console.log(`[FAL.AI] Using /edit endpoint with image_urls for face consistency`)
      console.log(`[FAL.AI] Reference: ${referenceImageUrl.substring(0, 80)}...`)
    }
  } else if (modelKey === 'fal-nano-banana') {
    // ========================================================================
    // NANO BANANA PRO T2I - Text-to-image only (NO reference image support!)
    // IMPORTANT: This endpoint ignores image_url parameter!
    // ========================================================================
    if (referenceImageUrl) {
      console.warn(`[FAL.AI] fal-nano-banana T2I does NOT support reference images! Use fal-nano-banana-edit instead.`)
      // Don't add image_url - it will be ignored anyway
    }
    // No style presets for T2I endpoint
  } else if (modelKey === 'fal-seedream-v4') {
    // ========================================================================
    // SEEDREAM V4 (ByteDance) - High-res B-ROLL, excellent text rendering
    // Up to 4096px, cinematic quality, NO negative prompt support
    // ========================================================================
    requestBody.num_images = 1
    requestBody.max_images = 1
    requestBody.enable_safety_checker = true
    requestBody.enhance_prompt_mode = 'standard'
    // Seedream uses seed for reproducibility
    if (!requestBody.seed) {
      requestBody.seed = Math.floor(Math.random() * 2147483647)
    }
    console.log(`[FAL.AI] Using Seedream v4 for high-quality B-ROLL`)
  } else if (modelKey === 'fal-qwen-image') {
    // ========================================================================
    // QWEN IMAGE - B-ROLL with NEGATIVE PROMPT support, turbo mode
    // Max 1024px, supports LoRAs
    // ========================================================================
    requestBody.negative_prompt = getBRollNegativePrompt('combined')
    requestBody.num_inference_steps = 30
    requestBody.guidance_scale = 2.5
    requestBody.num_images = 1
    requestBody.acceleration = 'none' // or 'high' for turbo
    requestBody.use_turbo = false
    console.log(`[FAL.AI] Using QWEN Image with negative prompt for B-ROLL`)
  }
  
  // Make API request to the correct endpoint
  const response = await fetch(modelConfig.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`fal.ai API error: ${response.status} - ${errorText}`)
  }
  
  const responseData = await response.json()
  
  // fal.ai returns images array
  if (responseData.images && responseData.images.length > 0) {
    const imageUrl = responseData.images[0].url
    console.log(`[FAL.AI] ✅ Image generated successfully via ${modelKey}`)
    return await downloadAndUploadImage(imageUrl, modelKey.replace('fal-', ''), supabase)
  }
  
  throw new Error('fal.ai API returned no images')
}
