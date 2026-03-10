import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { handleCors, successResponse, errorResponse } from "../_shared/cors.ts"
import { callGroqTranscribe } from "../_shared/apiKeyRotation.ts"

/**
 * Generate Captions — Transcribe TTS/video audio to word-level timestamps,
 * then chunk into 3-6 word caption phrases for CapCut-style subtitles.
 *
 * Input:
 * - orderId: string (chat_sessions.order_id)
 * - language?: string (hint for Whisper transcription)
 *
 * Output:
 * - { success: true, data: { captions: [{ segmentId, chunks: [{ text, startMs, endMs }] }] } }
 *
 * Audio source priority per segment:
 * 1. video_data.ttsUrls[segmentId] (Record<segmentId, url>)
 * 2. video_data.segments[].ttsUrl
 * 3. video_data.segments[].videoUrl (fallback: transcribe from video itself)
 */

// ============================================================================
// Types
// ============================================================================

interface CaptionChunk {
  text: string
  startMs: number
  endMs: number
}

interface SegmentCaptions {
  segmentId: string
  chunks: CaptionChunk[]
}

interface WhisperWord {
  word: string
  start: number
  end: number
}

// Conjunctions and natural break points for chunking
const BREAK_WORDS = new Set([
  // English
  'and', 'but', 'or', 'so', 'then', 'because', 'while', 'when', 'if', 'that', 'which', 'where',
  // Indonesian
  'dan', 'tapi', 'atau', 'lalu', 'karena', 'ketika', 'kalau', 'yang', 'dengan', 'untuk', 'jadi',
  // Hindi (romanized)
  'aur', 'lekin', 'ya', 'toh', 'kyunki', 'jab', 'agar', 'jo', 'matlab', 'toh',
])

// Sentence-ending punctuation
const SENTENCE_END_RE = /[.!?।]+$/

// Map full language names to ISO 639-1 codes for Whisper
const LANGUAGE_CODE_MAP: Record<string, string> = {
  indonesian: 'id',
  english: 'en',
  hindi: 'hi',
  spanish: 'es',
  french: 'fr',
  // Short codes pass through as-is
  id: 'id',
  en: 'en',
  hi: 'hi',
  es: 'es',
  fr: 'fr',
}

function toWhisperLanguageCode(lang: string | undefined): string | undefined {
  if (!lang) return undefined
  return LANGUAGE_CODE_MAP[lang.toLowerCase()] || lang.toLowerCase()
}

// ============================================================================
// Chunking Algorithm
// ============================================================================

/**
 * Chunk transcribed words into 3-6 word caption phrases.
 *
 * Strategy:
 * 1. Split words into sentences (at . ! ? ।)
 * 2. Within each sentence, group 3-6 words
 * 3. Prefer breaking at commas and conjunctions
 * 4. Each chunk gets timing from first word's start to last word's end
 */
function chunkWords(words: WhisperWord[]): CaptionChunk[] {
  if (!words || words.length === 0) return []

  const chunks: CaptionChunk[] = []

  // Step 1: Split into sentences
  const sentences: WhisperWord[][] = []
  let currentSentence: WhisperWord[] = []

  for (const w of words) {
    currentSentence.push(w)
    if (SENTENCE_END_RE.test(w.word)) {
      sentences.push(currentSentence)
      currentSentence = []
    }
  }
  // Remaining words form the last sentence
  if (currentSentence.length > 0) {
    sentences.push(currentSentence)
  }

  // Step 2: Within each sentence, create chunks of 3-6 words
  for (const sentence of sentences) {
    let i = 0
    while (i < sentence.length) {
      const remaining = sentence.length - i

      // If remaining words fit in one chunk (<=6), take them all
      if (remaining <= 6) {
        chunks.push(buildChunk(sentence.slice(i)))
        break
      }

      // Try to find a natural break point between word 3 and 6
      let breakAt = -1

      // Scan from position 3 to 6 for a natural break
      for (let j = Math.min(i + 5, sentence.length - 1); j >= i + 2; j--) {
        const word = sentence[j].word.toLowerCase().replace(/[.,;:!?।]+$/, '')

        // Break BEFORE a conjunction (the conjunction starts the next chunk)
        if (BREAK_WORDS.has(word) && j > i + 1) {
          breakAt = j
          break
        }

        // Break AFTER a comma
        if (sentence[j].word.endsWith(',') || sentence[j].word.endsWith(';')) {
          breakAt = j + 1
          break
        }
      }

      // Default: take 4 words if no natural break found
      if (breakAt === -1 || breakAt <= i) {
        breakAt = i + 4
      }

      // Ensure at least 3 words per chunk
      if (breakAt - i < 3 && remaining > 3) {
        breakAt = i + 3
      }

      // Cap at 6 words max
      if (breakAt - i > 6) {
        breakAt = i + 6
      }

      chunks.push(buildChunk(sentence.slice(i, breakAt)))
      i = breakAt
    }
  }

  return chunks
}

/**
 * Build a CaptionChunk from a slice of WhisperWords
 */
function buildChunk(words: WhisperWord[]): CaptionChunk {
  const text = words.map(w => w.word).join(' ')
  const startMs = Math.round(words[0].start * 1000)
  const endMs = Math.round(words[words.length - 1].end * 1000)
  return { text, startMs, endMs }
}

// ============================================================================
// Audio URL Extraction
// ============================================================================

interface SegmentAudioInfo {
  segmentId: string
  audioUrl: string
}

/**
 * Extract audio URLs from chat_session video_data and script_data.
 * Priority: ttsUrls map > segment ttsUrl > segment videoUrl
 */
function extractSegmentAudioUrls(
  scriptData: Record<string, any> | null,
  videoData: Record<string, any> | null
): SegmentAudioInfo[] {
  const results: SegmentAudioInfo[] = []
  const seen = new Set<string>()

  // Get segment IDs from script_data
  const scriptSegments: any[] = scriptData?.segments || []

  // Get video_data structures
  const ttsUrlsMap: Record<string, string> = videoData?.ttsUrls || {}
  const videoSegments: any[] = videoData?.segments || []

  // Build a lookup of video segment data by ID
  const videoSegmentMap = new Map<string, any>()
  for (const vs of videoSegments) {
    if (vs.id) videoSegmentMap.set(vs.id, vs)
  }

  // For each script segment, find the best audio URL
  for (const seg of scriptSegments) {
    const segId = seg.id || seg.segmentId
    if (!segId || seen.has(segId)) continue
    seen.add(segId)

    // Priority 1: ttsUrls map
    if (ttsUrlsMap[segId]) {
      results.push({ segmentId: segId, audioUrl: ttsUrlsMap[segId] })
      continue
    }

    // Priority 2: segment-level ttsUrl (from video_data.segments or script_data.segments)
    const videoSeg = videoSegmentMap.get(segId)
    const ttsUrl = videoSeg?.ttsUrl || videoSeg?.tts_url || seg?.ttsUrl || seg?.tts_url
    if (ttsUrl) {
      results.push({ segmentId: segId, audioUrl: ttsUrl })
      continue
    }

    // Priority 3: video URL (transcribe from video itself)
    const videoUrl = videoSeg?.videoUrl || videoSeg?.video_url || seg?.videoUrl || seg?.video_url
    if (videoUrl) {
      results.push({ segmentId: segId, audioUrl: videoUrl })
      continue
    }
  }

  return results
}

// ============================================================================
// Main Handler
// ============================================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Missing authorization header", 401, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid token", 401, req)
    }

    // Parse request body
    const { orderId, language } = await req.json()
    if (!orderId) {
      return errorResponse("BAD_REQUEST", "orderId is required", 400, req)
    }

    console.log(`[generate-captions] User: ${user.id}, orderId: ${orderId}, language: ${language || 'auto'}`)

    // Fetch chat_session
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("order_id, user_id, script_data, video_data, settings")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .single()

    if (sessionError || !session) {
      console.error(`[generate-captions] Session not found:`, sessionError?.message)
      return errorResponse("NOT_FOUND", "Session not found or access denied", 404, req)
    }

    // Determine language from param > session settings > auto-detect
    // Convert to ISO 639-1 code for Whisper (e.g. 'indonesian' → 'id')
    const transcriptionLanguage = toWhisperLanguageCode(
      language || session.settings?.language
    )

    // Extract audio URLs from session data
    const segmentAudioInfos = extractSegmentAudioUrls(session.script_data, session.video_data)

    if (segmentAudioInfos.length === 0) {
      return errorResponse(
        "NO_AUDIO",
        "No audio URLs found in session. Generate TTS or videos first.",
        400,
        req
      )
    }

    console.log(`[generate-captions] Found ${segmentAudioInfos.length} segments with audio`)

    // Transcribe each segment
    const captions: SegmentCaptions[] = []
    let successCount = 0
    let errorCount = 0

    for (const info of segmentAudioInfos) {
      try {
        console.log(`[generate-captions] Transcribing segment ${info.segmentId}: ${info.audioUrl.substring(0, 80)}...`)

        // Fetch audio as blob
        const audioResponse = await fetch(info.audioUrl)
        if (!audioResponse.ok) {
          console.warn(`[generate-captions] Failed to fetch audio for ${info.segmentId}: ${audioResponse.status}`)
          errorCount++
          continue
        }

        const audioBlob = await audioResponse.blob()

        // Determine filename extension from content-type
        const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg'
        const ext = contentType.includes('wav') ? 'wav'
          : contentType.includes('ogg') ? 'ogg'
          : contentType.includes('mp4') || contentType.includes('video') ? 'mp4'
          : 'mp3'
        const filename = `segment_${info.segmentId}.${ext}`

        // Call Groq Whisper with word-level timestamps
        const transcribeResult = await callGroqTranscribe(supabase, audioBlob, {
          model: 'whisper-large-v3-turbo',
          responseFormat: 'verbose_json',
          timestampGranularities: 'word',
          filename,
          language: transcriptionLanguage,
        })

        if (!transcribeResult.success || !transcribeResult.data) {
          console.warn(`[generate-captions] Transcription failed for ${info.segmentId}: ${transcribeResult.error}`)
          errorCount++
          continue
        }

        // Extract words from Whisper response
        // Groq Whisper verbose_json with word granularity returns { words: [{ word, start, end }] }
        const whisperWords: WhisperWord[] = transcribeResult.data.words || []

        if (whisperWords.length === 0) {
          console.warn(`[generate-captions] No words returned for ${info.segmentId}`)
          // Still add empty captions so caller knows this segment was processed
          captions.push({ segmentId: info.segmentId, chunks: [] })
          successCount++
          continue
        }

        console.log(`[generate-captions] Got ${whisperWords.length} words for ${info.segmentId}`)

        // Chunk words into caption phrases
        const chunks = chunkWords(whisperWords)
        captions.push({ segmentId: info.segmentId, chunks })
        successCount++

      } catch (err) {
        console.error(`[generate-captions] Error processing segment ${info.segmentId}:`, err)
        errorCount++
      }
    }

    if (successCount === 0 && errorCount > 0) {
      return errorResponse(
        "TRANSCRIPTION_FAILED",
        `All ${errorCount} segments failed to transcribe`,
        500,
        req
      )
    }

    console.log(`[generate-captions] Done: ${successCount} succeeded, ${errorCount} failed`)

    return successResponse({ captions }, req)

  } catch (err) {
    console.error(`[generate-captions] Unexpected error:`, err)
    return errorResponse(
      "INTERNAL_ERROR",
      err instanceof Error ? err.message : "Unknown error",
      500,
      req
    )
  }
})
