import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { video_uuids, update_db, upload_to_storage } = await req.json()

    console.log('[VEO-STATUS] Checking UUIDs:', video_uuids)

    if (!video_uuids || !Array.isArray(video_uuids) || video_uuids.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Missing or invalid video_uuids array' }
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

    const videos: any[] = []
    let completedCount = 0
    let processingCount = 0
    let failedCount = 0

    for (const uuidItem of video_uuids) {
      // Support both string UUID and object with metadata
      const uuid = typeof uuidItem === 'string' ? uuidItem : uuidItem.uuid
      const segmentType = typeof uuidItem === 'object' ? uuidItem.segment_type : null
      const segmentNumber = typeof uuidItem === 'object' ? uuidItem.segment_number : null

      console.log(`[VEO-STATUS] Checking UUID: ${uuid}`)
      
      try {
        // Use /history/{uuid} endpoint
        const veoResponse = await fetch(
          `https://api.geminigen.ai/uapi/v1/history/${uuid}`,
          {
            method: 'GET',
            headers: { 'x-api-key': veoApiKey }
          }
        )

        const responseText = await veoResponse.text()
        console.log(`[VEO-STATUS] Response (${veoResponse.status}): ${responseText.substring(0, 300)}...`)

        if (!veoResponse.ok) {
          videos.push({
            uuid,
            segment_type: segmentType,
            segment_number: segmentNumber,
            status: 3,
            status_percentage: 0,
            video_url: null,
            storage_url: null,
            error_code: 'NOT_FOUND',
            error_message: `Video not found (HTTP ${veoResponse.status})`
          })
          failedCount++
          continue
        }

        const veoData = JSON.parse(responseText)

        const videoStatus: any = {
          uuid: veoData.uuid || uuid,
          segment_type: segmentType,
          segment_number: segmentNumber,
          status: veoData.status,
          status_percentage: veoData.status_percentage || 0,
          video_url: null,
          storage_url: null,
          thumbnail_url: veoData.thumbnail_url || null
        }

        // Status: 1 = Processing, 2 = Completed, 3 = Failed
        if (veoData.status === 2) {
          // Get URL from generated_video array
          if (veoData.generated_video && veoData.generated_video.length > 0) {
            const generatedVideo = veoData.generated_video[0]
            videoStatus.video_url = generatedVideo.file_download_url || generatedVideo.video_url
            videoStatus.duration = generatedVideo.duration
            videoStatus.resolution = generatedVideo.resolution
            videoStatus.aspect_ratio = generatedVideo.aspect_ratio
          }
          
          console.log(`[VEO-STATUS] UUID ${uuid} COMPLETED: ${videoStatus.video_url}`)

          // ALWAYS upload to Supabase Storage (VEO URLs may be CORS-blocked)
          if (videoStatus.video_url) {
            try {
              const storageUrl = await uploadVideoToStorage(
                supabase,
                videoStatus.video_url,
                uuid,
                segmentType,
                segmentNumber,
                veoApiKey // Pass API key for authenticated download
              )
              videoStatus.storage_url = storageUrl
              // Replace video_url with storage_url for reliable playback
              videoStatus.video_url = storageUrl
              console.log(`[VEO-STATUS] ✅ Uploaded to storage: ${storageUrl}`)
            } catch (uploadError: any) {
              console.error(`[VEO-STATUS] Storage upload failed: ${uploadError.message}`)
              // Retry once with delay
              try {
                await new Promise(r => setTimeout(r, 2000))
                const storageUrl = await uploadVideoToStorage(
                  supabase,
                  videoStatus.video_url,
                  uuid,
                  segmentType,
                  segmentNumber,
                  veoApiKey
                )
                videoStatus.storage_url = storageUrl
                videoStatus.video_url = storageUrl
                console.log(`[VEO-STATUS] ✅ Retry upload success: ${storageUrl}`)
              } catch (retryError: any) {
                console.error(`[VEO-STATUS] Retry also failed: ${retryError.message}`)
                // Keep original VEO URL as fallback
              }
            }
          }

          completedCount++

          // Update database if requested
          if (update_db !== false) {
            const { error: dbError } = await supabase
              .from('video_generation_jobs')
              .update({
                status: 2,
                video_url: videoStatus.storage_url || videoStatus.video_url,
                thumbnail_url: videoStatus.thumbnail_url,
                updated_at: new Date().toISOString()
              })
              .eq('veo_uuid', uuid)

            if (dbError) {
              console.error('[VEO-STATUS] DB update error:', dbError)
            } else {
              console.log(`[VEO-STATUS] DB updated for UUID ${uuid}`)
            }
          }
        } else if (veoData.status === 3) {
          videoStatus.error_code = veoData.error_code || 'PROCESSING_ERROR'
          videoStatus.error_message = veoData.error_message || veoData.status_desc || 'Video generation failed'
          console.log(`[VEO-STATUS] UUID ${uuid} FAILED: ${videoStatus.error_message}`)
          failedCount++

          // Update database with failure
          if (update_db !== false) {
            await supabase
              .from('video_generation_jobs')
              .update({
                status: 3,
                error_message: videoStatus.error_message,
                updated_at: new Date().toISOString()
              })
              .eq('veo_uuid', uuid)
          }
        } else {
          console.log(`[VEO-STATUS] UUID ${uuid} PROCESSING: ${veoData.status_percentage || 0}%`)
          processingCount++
        }

        videos.push(videoStatus)
      } catch (uuidError: any) {
        console.error(`[VEO-STATUS] Error checking UUID ${uuid}:`, uuidError.message)
        videos.push({
          uuid,
          segment_type: segmentType,
          segment_number: segmentNumber,
          status: 3,
          status_percentage: 0,
          video_url: null,
          storage_url: null,
          error_code: 'CHECK_ERROR',
          error_message: uuidError.message
        })
        failedCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          videos,
          summary: {
            total: video_uuids.length,
            completed: completedCount,
            processing: processingCount,
            failed: failedCount
          },
          all_completed: processingCount === 0 && failedCount === 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[VEO-STATUS] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Download video from VEO URL and upload to Supabase Storage
 */
async function uploadVideoToStorage(
  supabase: any,
  videoUrl: string,
  uuid: string,
  segmentType: string | null,
  segmentNumber: number | null,
  apiKey: string
): Promise<string> {
  console.log(`[VEO-STATUS] Downloading video from: ${videoUrl}`)

  // Download video from VEO/GeminiGen (requires API key for authenticated URLs)
  const response = await fetch(videoUrl, {
    headers: {
      'x-api-key': apiKey
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  const videoBuffer = await response.arrayBuffer()
  const videoBytes = new Uint8Array(videoBuffer)
  
  console.log(`[VEO-STATUS] Downloaded ${videoBytes.length} bytes`)

  // Generate storage path
  const timestamp = Date.now()
  const segmentLabel = segmentType || `segment_${segmentNumber || 0}`
  const fileName = `${timestamp}_${segmentLabel}_${uuid.substring(0, 8)}.mp4`
  const storagePath = fileName

  console.log(`[VEO-STATUS] Uploading to video-segments/${storagePath}`)

  // Upload to Supabase Storage bucket "video-segments"
  const { data, error } = await supabase.storage
    .from('video-segments')
    .upload(storagePath, videoBytes, {
      contentType: 'video/mp4',
      upsert: true
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('video-segments')
    .getPublicUrl(storagePath)

  return urlData.publicUrl
}
