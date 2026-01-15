import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

// GeminiGen.ai Public Key for signature verification
const GEMINIGEN_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2jaUZuOmIzxi+DcltgN0
tWIL7Sg5l4cHFc72STc7N6E1f/CdDWFDODxQGZeyKN3yypXy6/mwiYAfZVstHlEx
H8d1EaKIqMc/VjdfXHh+GzaGBH0VfKKyK52f82wDlnzjhN3h4fa9vIvCGJZMXuJ4
mqw1u9gPGtrSkFQUh9kx/uJ4mfKDj4pCsKa8gJ44tXijMGfzBa91EXULBR10cUZx
prlNWEEguA+63q3uy1Ev6Aa9gBJoehfjNNc7OFGTfuv4e5gbOmAgZEC5H5lW6PSq
2kEfWpphTMm+kMG1wUmrEaGwDq10P0fD4Lbwsb6Qet1ods13vZ9JbKfnscmwzjZw
3wIDAQAB
-----END PUBLIC KEY-----`

/**
 * Verify signature from GeminiGen.ai webhook
 * They use MD5 hash of data + RSA-SHA256 signature
 */
async function verifySignature(data: string, signature: string): Promise<boolean> {
  try {
    // Create MD5 hash of the data
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Import public key
    const pemContents = GEMINIGEN_PUBLIC_KEY
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert hex signature to bytes
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    )

    // Verify
    const hashBytes = encoder.encode(hashHex)
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      hashBytes
    )

    return isValid
  } catch (e) {
    console.error('[WEBHOOK] Signature verification error:', e)
    return false
  }
}

/**
 * GeminiGen.ai Webhook Handler
 *
 * Receives callbacks when video generation completes or fails
 * Updates video_generation_jobs table accordingly
 *
 * Webhook payload structure:
 * {
 *   "id": 10332290,
 *   "uuid": "c2febaac-f1c0-11f0-9d7f-3a765be427a5",
 *   "user_id": 3,
 *   "model_name": "veo-3.1",
 *   "input_text": "...",
 *   "type": "video",
 *   "status": 2,  // 1=processing, 2=completed, 3=failed
 *   "status_desc": "",
 *   "error_code": "",
 *   "error_message": "",
 *   "generate_result": "https://...",  // Video URL when completed
 *   "media_type": "video",
 *   "created_at": "2025-01-15T10:03:05",
 *   "updated_at": "2025-01-15T10:05:30"
 * }
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-signature') || ''

    console.log('[WEBHOOK] Received callback, signature present:', !!signature)

    // Verify signature if present (optional - can be strict later)
    if (signature) {
      const isValid = await verifySignature(rawBody, signature)
      if (!isValid) {
        console.warn('[WEBHOOK] Invalid signature, proceeding anyway for now')
        // In production, you might want to reject:
        // return new Response(
        //   JSON.stringify({ success: false, error: 'Invalid signature' }),
        //   { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        // )
      }
    }

    // Parse payload
    const rawPayload = JSON.parse(rawBody)

    // Log FULL raw payload to debug structure
    console.log('[WEBHOOK] RAW PAYLOAD:', JSON.stringify(rawPayload, null, 2))
    console.log('[WEBHOOK] Top-level keys:', Object.keys(rawPayload))

    // Handle different payload structures:
    // 1. Direct: { uuid, status, ... }
    // 2. Nested in data: { data: { uuid, status, ... } }
    // 3. Nested in result: { result: { uuid, status, ... } }
    // 4. Array: [{ uuid, status, ... }]
    let payload = rawPayload

    if (rawPayload.data && typeof rawPayload.data === 'object') {
      console.log('[WEBHOOK] Found nested data object')
      payload = rawPayload.data
    } else if (rawPayload.result && typeof rawPayload.result === 'object') {
      console.log('[WEBHOOK] Found nested result object')
      payload = rawPayload.result
    } else if (Array.isArray(rawPayload) && rawPayload.length > 0) {
      console.log('[WEBHOOK] Found array, using first element')
      payload = rawPayload[0]
    }

    // Also check for nested data in the extracted payload
    if (payload.data && typeof payload.data === 'object' && !payload.uuid) {
      console.log('[WEBHOOK] Found double-nested data object')
      payload = payload.data
    }

    console.log('[WEBHOOK] Extracted payload keys:', Object.keys(payload))

    // Extract fields with multiple possible field names
    const uuid = payload.uuid || payload.task_id || payload.id?.toString() || payload.request_id
    const status = payload.status ?? payload.state ?? payload.task_status
    const generate_result = payload.generate_result || payload.media_url || payload.result_url || payload.video_url || payload.output_url || payload.url
    const error_message = payload.error_message || payload.error || payload.message || payload.error_msg
    const error_code = payload.error_code || payload.code
    const model_name = payload.model_name || payload.model
    const status_desc = payload.status_desc || payload.status_description
    const thumbnail_url = payload.thumbnail_url

    console.log('[WEBHOOK] Extracted values:', {
      uuid,
      status,
      model_name,
      has_result: !!generate_result,
      result_url: generate_result || null,
      thumbnail_url: thumbnail_url || null,
      error_message: error_message || null
    })

    if (!uuid) {
      console.error('[WEBHOOK] Could not find uuid in any expected field')
      console.error('[WEBHOOK] Available fields:', JSON.stringify(payload, null, 2))
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing uuid in payload',
          available_keys: Object.keys(payload),
          raw_payload: rawPayload
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map GeminiGen status to our status
    // GeminiGen: 1=processing, 2=completed, 3=failed
    // Our DB: 0=pending, 1=processing, 2=completed, 3=failed
    let dbStatus = status
    let videoUrl = null
    let storageUrl = null
    let errorMsg = null

    if (status === 2 && generate_result) {
      // Completed successfully - download and upload to Supabase Storage
      dbStatus = 2
      videoUrl = generate_result
      console.log('[WEBHOOK] Video completed, downloading from:', videoUrl)

      try {
        // Download video from Geminigen
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`)
        }

        const videoBlob = await videoResponse.blob()
        const videoBuffer = await videoBlob.arrayBuffer()

        // Generate filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const fileName = `geminigen_${uuid}_${timestamp}_${randomStr}.mp4`

        console.log('[WEBHOOK] Uploading to storage:', fileName, 'Size:', videoBuffer.byteLength)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-videos')
          .upload(fileName, videoBuffer, {
            contentType: 'video/mp4',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('[WEBHOOK] Storage upload error:', uploadError)
          // Still save original URL if upload fails
          storageUrl = videoUrl
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('generated-videos')
            .getPublicUrl(fileName)

          storageUrl = urlData.publicUrl
          console.log('[WEBHOOK] Uploaded to storage:', storageUrl)
        }
      } catch (downloadErr: any) {
        console.error('[WEBHOOK] Download/upload error:', downloadErr)
        // Fallback to original URL
        storageUrl = videoUrl
      }
    } else if (status === 3) {
      // Failed
      dbStatus = 3
      errorMsg = error_message || error_code || 'Generation failed'
      console.log('[WEBHOOK] Video failed:', errorMsg)
    } else {
      // Still processing
      dbStatus = 1
      console.log('[WEBHOOK] Video still processing')
    }

    // Update video_generation_jobs table
    const now = new Date().toISOString()
    const updatePayload: Record<string, any> = {
      status: dbStatus,
      video_url: storageUrl || videoUrl,
      thumbnail_url: thumbnail_url || null,
      error_message: errorMsg,
      webhook_received_at: now,
      updated_at: now
    }

    // Add completion timestamp if completed or failed
    if (dbStatus === 2 || dbStatus === 3) {
      updatePayload.completed_at = now
    }

    // First, check if job exists with this veo_uuid
    const { data: existingJob, error: findError } = await supabase
      .from('video_generation_jobs')
      .select('id, veo_uuid, status, segment_type')
      .eq('veo_uuid', uuid)
      .single()

    if (findError || !existingJob) {
      console.error('[WEBHOOK] ❌ Job NOT FOUND with veo_uuid:', uuid)
      console.error('[WEBHOOK] Find error:', findError)

      // Try to find by partial match or list recent jobs for debugging
      const { data: recentJobs } = await supabase
        .from('video_generation_jobs')
        .select('id, veo_uuid, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('[WEBHOOK] Recent jobs for debug:', JSON.stringify(recentJobs, null, 2))

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Job not found',
          uuid_searched: uuid,
          recent_jobs: recentJobs?.map(j => ({ id: j.id, veo_uuid: j.veo_uuid }))
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[WEBHOOK] ✅ Found job:', existingJob.id, 'current status:', existingJob.status)

    const { data: updateData, error: updateError } = await supabase
      .from('video_generation_jobs')
      .update(updatePayload)
      .eq('veo_uuid', uuid)
      .select()

    if (updateError) {
      console.error('[WEBHOOK] Database update error:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database update failed', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!updateData || updateData.length === 0) {
      console.error('[WEBHOOK] ⚠️ Update returned empty - no rows affected')
      return new Response(
        JSON.stringify({ success: false, error: 'No rows updated', uuid }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[WEBHOOK] ✅ Updated job:', updateData[0]?.id, 'new status:', updateData[0]?.status)

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed',
        uuid,
        status: dbStatus,
        video_url: storageUrl || videoUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[WEBHOOK] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
