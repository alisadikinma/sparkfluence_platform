import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { handleCors, successResponse, errorResponse } from "../_shared/cors.ts"
import { callWithRotationHybrid } from "../_shared/apiKeyRotation.ts"

/**
 * Analyze Voice — LLM-powered voice characteristic extraction
 *
 * Accepts a voice recording URL, sends it to Gemini multimodal API,
 * extracts voice anchor properties (gender, age, tone, accent, pace),
 * and stores them in voice_prompts table for video generation consistency.
 *
 * Input:
 * - voice_url: Public URL to audio file in voice-references bucket
 * - language?: Optional language hint from user profile
 *
 * Output:
 * - { success: true, data: { gender, age_range, tone, accent, pace, language, distinguishing_features } }
 */

interface VoiceAnalysis {
  gender: 'male' | 'female'
  age_range: string
  tone: string
  accent: string
  pace: string
  language: string
  distinguishing_features: string
}

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

    // Parse request
    const { voice_url, language: languageHint } = await req.json()
    if (!voice_url) {
      return errorResponse("BAD_REQUEST", "voice_url is required", 400, req)
    }

    console.log(`[analyze-voice] User: ${user.id}, URL: ${voice_url}`)

    // Download audio file and convert to base64
    const audioResponse = await fetch(voice_url)
    if (!audioResponse.ok) {
      return errorResponse("FETCH_ERROR", `Failed to download audio: ${audioResponse.statusText}`, 500, req)
    }

    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg'
    const mimeType = contentType.split(';')[0]
    const arrayBuffer = await audioResponse.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Convert to base64 using chunked approach (avoid stack overflow on large files)
    const chunkSize = 8192
    let binaryString = ''
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize)
      binaryString += String.fromCharCode(...chunk)
    }
    const audioBase64 = btoa(binaryString)

    console.log(`[analyze-voice] Audio downloaded: ${(arrayBuffer.byteLength / 1024).toFixed(1)}KB, type: ${mimeType}`)

    const audioDataUrl = `data:${mimeType};base64,${audioBase64}`

    const analysisPrompt = `Analyze this voice recording and return ONLY a valid JSON object (no markdown, no code fences):
{
  "gender": "male" or "female",
  "age_range": age range like "20-25" or "25-30" or "30-35" or "35-40",
  "tone": descriptive tone (e.g. "warm and friendly", "energetic and enthusiastic", "calm and authoritative"),
  "accent": specific accent (e.g. "Indonesian Jakarta urban", "Hindi Hinglish", "American English", "British English"),
  "pace": speaking pace (e.g. "fast, 160-180 WPM", "medium, 140-160 WPM", "slow, 120-140 WPM"),
  "language": detected language of the speech ("indonesian", "english", "hindi", "spanish"),
  "distinguishing_features": notable voice qualities (e.g. "slightly raspy with bright overtones", "clear and articulate", "deep resonant bass")
}

${languageHint ? `Hint: The user's profile language is "${languageHint}".` : ''}
Return ONLY the JSON object, nothing else.`

    const orModel = 'google/gemini-2.5-flash'
    const geminiModel = 'gemini-2.0-flash'

    // --- PRIMARY: OpenRouter (PAID) with multimodal audio ---
    let rawText = ''
    let usedProvider = ''

    const orResult = await callWithRotationHybrid(supabase, 'openrouter', async (apiKey: string) => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://sparkfluence.com',
        },
        body: JSON.stringify({
          model: orModel,
          messages: [{
            role: 'user',
            content: [
              { type: 'audio_url', audio_url: { url: audioDataUrl } },
              { type: 'text', text: analysisPrompt },
            ]
          }],
          temperature: 0.3,
          max_tokens: 512,
        })
      })
      const data = await response.json()
      return { data, status: response.status }
    })

    if (!orResult.error && orResult.data?.choices?.[0]?.message?.content) {
      rawText = orResult.data.choices[0].message.content
      usedProvider = 'openrouter'
      console.log(`[analyze-voice] OpenRouter success via ${orResult.keyUsed}`)
    } else {
      console.warn(`[analyze-voice] OpenRouter failed: ${orResult.error || 'empty response'} — falling back to Gemini direct`)

      // --- FALLBACK: Gemini Direct (FREE) with inline_data ---
      const geminiResult = await callWithRotationHybrid(supabase, 'gemini', async (apiKey: string) => {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: mimeType, data: audioBase64 } },
                  { text: analysisPrompt }
                ]
              }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
            })
          }
        )
        const data = await response.json()
        return { data, status: response.status }
      })

      if (geminiResult.error) {
        console.error(`[analyze-voice] Both providers failed. Gemini:`, geminiResult.error)
        return errorResponse("LLM_ERROR", `Voice analysis failed: OpenRouter: ${orResult.error}; Gemini: ${geminiResult.error}`, 500, req)
      }

      rawText = geminiResult.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      usedProvider = 'gemini'
      console.log(`[analyze-voice] Gemini fallback success via ${geminiResult.keyUsed}`)
    }

    console.log(`[analyze-voice] Provider: ${usedProvider}, response: ${rawText.substring(0, 200)}`)

    // Parse JSON from response (strip markdown fences if present)
    let analysis: VoiceAnalysis
    try {
      const jsonStr = rawText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      analysis = JSON.parse(jsonStr)
    } catch {
      console.error(`[analyze-voice] JSON parse failed:`, rawText)
      return errorResponse("PARSE_ERROR", "Failed to parse voice analysis result", 500, req)
    }

    // Build voice prompt block for video generation
    const voiceDescription = `${analysis.gender} voice, ${analysis.age_range}, ${analysis.tone}, ${analysis.accent}. ${analysis.distinguishing_features}`
    const voicePromptBlock = `
Voice: ${voiceDescription}
Gender: ${analysis.gender}
Age: ${analysis.age_range}
Accent: ${analysis.accent}
Tone: ${analysis.tone}
Pace: ${analysis.pace}
Language: ${analysis.language}
Quality: Dry voice, close-mic, professional broadcast quality

CRITICAL INSTRUCTION:
This EXACT voice character must be maintained identically across
all video segments (HOOK, BODY, CTA). Do NOT change voice
characteristics between segments. Consistency is paramount.`

    // Upsert to voice_prompts — one profile voice per user
    // First check if exists
    const { data: existing } = await supabase
      .from('voice_prompts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_profile_avatar', true)
      .is('avatar_id', null)
      .single()

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('voice_prompts')
        .update({
          language: analysis.language,
          gender: analysis.gender,
          voice_description: voiceDescription,
          voice_age: analysis.age_range,
          voice_accent: analysis.accent,
          voice_tone: analysis.tone,
          voice_pace: analysis.pace,
          voice_prompt_block: voicePromptBlock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error(`[analyze-voice] Update error:`, updateError)
        return errorResponse("DB_ERROR", `Failed to update voice prompt: ${updateError.message}`, 500, req)
      }
      console.log(`[analyze-voice] Updated voice_prompts id=${existing.id}`)
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('voice_prompts')
        .insert({
          user_id: user.id,
          is_profile_avatar: true,
          avatar_id: null,
          session_id: null,
          language: analysis.language,
          gender: analysis.gender,
          voice_description: voiceDescription,
          voice_age: analysis.age_range,
          voice_accent: analysis.accent,
          voice_tone: analysis.tone,
          voice_pace: analysis.pace,
          voice_prompt_block: voicePromptBlock,
        })

      if (insertError) {
        console.error(`[analyze-voice] Insert error:`, insertError)
        return errorResponse("DB_ERROR", `Failed to save voice prompt: ${insertError.message}`, 500, req)
      }
      console.log(`[analyze-voice] Inserted new voice_prompts for user ${user.id}`)
    }

    return successResponse(analysis, req)

  } catch (err) {
    console.error(`[analyze-voice] Unexpected error:`, err)
    return errorResponse("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error", 500, req)
  }
})
