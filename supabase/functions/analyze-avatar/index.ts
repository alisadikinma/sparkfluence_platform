import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// VOICE CHARACTER GENERATION
// Based on physical description, generate appropriate voice characteristics
// ============================================================================
interface VoiceCharacter {
  gender: 'male' | 'female'
  description: string
  age: string
  accent: string
  tone: string
  pace: string
}

function generateVoiceFromDescription(characterDescription: string, language: string): VoiceCharacter {
  // Detect gender from description
  const descLower = characterDescription.toLowerCase()
  const isFemale = descLower.includes('female') || descLower.includes('woman') || descLower.includes('girl') ||
                   descLower.includes('perempuan') || descLower.includes('wanita')
  const gender: 'male' | 'female' = isFemale ? 'female' : 'male'

  // Extract age from description (e.g., "early 30s", "mid 40s", "late 20s")
  let ageRange = '25-35 years old'
  const ageMatch = descLower.match(/(early|mid|late)\s*(20s|30s|40s|50s|60s)/)
  if (ageMatch) {
    const prefix = ageMatch[1]
    const decade = ageMatch[2]
    const decadeNum = parseInt(decade)
    if (prefix === 'early') {
      ageRange = `${decadeNum}-${decadeNum + 3} years old`
    } else if (prefix === 'mid') {
      ageRange = `${decadeNum + 3}-${decadeNum + 7} years old`
    } else {
      ageRange = `${decadeNum + 7}-${decadeNum + 10} years old`
    }
  }

  // Detect ethnicity for accent
  let accent = 'neutral accent'
  if (descLower.includes('southeast asian') || descLower.includes('indonesian') || descLower.includes('malay')) {
    accent = language === 'indonesian' ? 'Indonesian native speaker with slight Jakarta urban accent' : 'Southeast Asian accent with clear pronunciation'
  } else if (descLower.includes('south asian') || descLower.includes('indian')) {
    accent = language === 'hindi' ? 'Hindi native speaker with modern urban accent' : 'South Asian accent with clear pronunciation'
  } else if (descLower.includes('east asian') || descLower.includes('chinese') || descLower.includes('korean') || descLower.includes('japanese')) {
    accent = 'East Asian accent with clear pronunciation'
  } else if (descLower.includes('caucasian') || descLower.includes('european') || descLower.includes('western')) {
    accent = 'neutral Western accent with clear pronunciation'
  }

  // Voice tone based on gender and age
  const youngAge = parseInt(ageRange) < 30
  let tone = gender === 'female'
    ? (youngAge ? 'bright, energetic, friendly, youthful' : 'warm, confident, professional, engaging')
    : (youngAge ? 'energetic, friendly, casual Gen-Z energy' : 'warm, confident, authoritative, engaging')

  // Pace based on language
  let pace = 'medium pace, natural conversational rhythm'
  if (language === 'indonesian') {
    pace = 'medium-fast pace, natural conversational rhythm with appropriate pauses'
  } else if (language === 'hindi') {
    pace = 'medium pace, expressive rhythm with natural Hindi intonation'
  }

  // Full description
  const description = `${language === 'indonesian' ? 'Indonesian' : language === 'hindi' ? 'Hindi' : 'English'} ${gender} voice, ${ageRange}, ${tone}`

  return { gender, description, age: ageRange, accent, tone, pace }
}

function buildVoicePromptBlock(voice: VoiceCharacter, language: string): string {
  const langLabel = language === 'indonesian' ? 'Indonesian' : language === 'hindi' ? 'Hindi' : 'English'

  return `${langLabel} ${voice.gender} voice, ${voice.age}, ${voice.tone}
Accent: ${voice.accent} | Tone: ${voice.tone} | Pace: ${voice.pace}
Maintain consistent voice across all segments.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      image_url,
      image_base64,
      user_id,
      save_to_profile,
      avatar_id,           // NEW: if saving for a specific saved avatar
      language = 'indonesian'  // NEW: for voice generation
    } = await req.json()

    if (!image_url && !image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_IMAGE', message: 'Either image_url or image_base64 is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use OpenAI for Vision (more reliable than Gemini free tier)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'OPENAI_API_KEY not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'CONFIG_ERROR', message: 'Supabase not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[analyze-avatar] Starting OpenAI GPT-4o-mini Vision analysis...')

    // Build image data - ALWAYS convert to base64 (OpenAI can't fetch some URLs)
    let imageBase64: string
    let mimeType: string = 'image/png'

    if (image_base64) {
      imageBase64 = image_base64
      // Detect mime type from base64 header
      if (image_base64.startsWith('/9j/')) {
        mimeType = 'image/jpeg'
      } else if (image_base64.startsWith('iVBOR')) {
        mimeType = 'image/png'
      }
      console.log('[analyze-avatar] Using provided base64 image')
    } else {
      // Download image from URL and convert to base64
      console.log('[analyze-avatar] Downloading image from URL:', image_url)
      const imageResponse = await fetch(image_url)
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`)
      }
      const contentType = imageResponse.headers.get('content-type') || 'image/png'
      mimeType = contentType.split(';')[0]
      const arrayBuffer = await imageResponse.arrayBuffer()
      
      // Convert to base64 using chunked approach to avoid stack overflow
      const uint8Array = new Uint8Array(arrayBuffer)
      const chunkSize = 8192
      let binaryString = ''
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize)
        binaryString += String.fromCharCode.apply(null, chunk as unknown as number[])
      }
      imageBase64 = btoa(binaryString)
      console.log('[analyze-avatar] Image downloaded and converted to base64, size:', imageBase64.length)
    }

    // OpenAI Vision prompt - optimized to work with safety guardrails
    const systemPrompt = `You are a professional character artist creating reference descriptions for digital art and illustration projects.

Your task: Create a detailed physical description of the subject in this reference photo. This description will be used by artists to draw/paint this character in various poses and settings.

IMPORTANT: You are NOT identifying anyone. You are simply describing visible physical attributes like an artist would when creating a character sheet.

Describe these PHYSICAL FEATURES ONLY:
- Apparent ancestry/ethnicity and gender presentation
- Estimated age range (e.g., "early 30s", "mid 40s")
- Face shape (oval, round, square, heart, etc.)
- Skin tone (be specific: "warm olive", "deep brown", "fair with pink undertones")
- Hair: color, style, length, texture (or note if bald/shaved)
- Eyes: color, shape (almond, round, hooded)
- Eyebrows: thickness, shape, color
- Nose: shape and size
- Lips: shape and fullness
- Any facial hair (beard, mustache, stubble)
- Distinctive features (dimples, moles, scars if visible)

DO NOT include: clothing, accessories, background, or any identifying information.

OUTPUT FORMAT: Single paragraph, 50-80 words, starting with ancestry/gender. Example:
"Southeast Asian male, early 30s, oval face with defined cheekbones, warm golden-beige skin, short black hair with slight wave, dark brown almond-shaped eyes, medium-thick straight eyebrows, medium-width nose, full lips, clean-shaven, small ears close to head."`

    // Call OpenAI Vision API (gpt-4o-mini is cheaper)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Create a character reference description based on this photo for my digital art project:' },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'low' // Use low detail for cost savings
                } 
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('[analyze-avatar] OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    
    if (!openaiData.choices?.[0]?.message?.content) {
      console.error('[analyze-avatar] Unexpected OpenAI response:', openaiData)
      throw new Error('Failed to get character description from OpenAI')
    }

    const characterDescription = openaiData.choices[0].message.content.trim()
    console.log('[analyze-avatar] Generated description:', characterDescription)
    console.log('[analyze-avatar] Tokens used:', openaiData.usage?.total_tokens || 'unknown')

    // ========================================================================
    // GENERATE VOICE CHARACTER FROM PHYSICAL DESCRIPTION
    // ========================================================================
    const voiceChar = generateVoiceFromDescription(characterDescription, language)
    const voicePromptBlock = buildVoicePromptBlock(voiceChar, language)
    console.log('[analyze-avatar] Generated voice:', voiceChar.gender, voiceChar.age, voiceChar.tone)

    let voicePromptId: string | null = null

    // Optionally save to user profile
    if (save_to_profile && user_id) {
      console.log('[analyze-avatar] Saving to user profile...')
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          character_description: characterDescription,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)

      if (updateError) {
        console.error('[analyze-avatar] Failed to save to profile:', updateError)
      } else {
        console.log('[analyze-avatar] Saved to profile successfully')
      }

      // ======================================================================
      // INSERT/UPDATE VOICE PROMPT FOR PROFILE AVATAR
      // ======================================================================
      const { data: existingVoice } = await supabase
        .from('voice_prompts')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_profile_avatar', true)
        .is('avatar_id', null)
        .single()

      if (existingVoice) {
        // Update existing
        const { error: voiceUpdateError } = await supabase
          .from('voice_prompts')
          .update({
            language,
            gender: voiceChar.gender,
            voice_description: voiceChar.description,
            voice_age: voiceChar.age,
            voice_accent: voiceChar.accent,
            voice_tone: voiceChar.tone,
            voice_pace: voiceChar.pace,
            voice_prompt_block: voicePromptBlock,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVoice.id)

        if (!voiceUpdateError) {
          voicePromptId = existingVoice.id
          console.log('[analyze-avatar] Updated profile voice prompt:', voicePromptId)
        }
      } else {
        // Insert new
        const { data: newVoice, error: voiceInsertError } = await supabase
          .from('voice_prompts')
          .insert({
            user_id,
            is_profile_avatar: true,
            avatar_id: null,
            session_id: null,
            language,
            gender: voiceChar.gender,
            voice_description: voiceChar.description,
            voice_age: voiceChar.age,
            voice_accent: voiceChar.accent,
            voice_tone: voiceChar.tone,
            voice_pace: voiceChar.pace,
            voice_prompt_block: voicePromptBlock
          })
          .select('id')
          .single()

        if (!voiceInsertError && newVoice) {
          voicePromptId = newVoice.id
          console.log('[analyze-avatar] Created profile voice prompt:', voicePromptId)
        }
      }
    }

    // ========================================================================
    // INSERT/UPDATE VOICE PROMPT FOR SAVED AVATAR
    // ========================================================================
    if (avatar_id && user_id) {
      console.log('[analyze-avatar] Saving voice prompt for saved avatar:', avatar_id)

      // Also update character_description in user_avatars
      await supabase
        .from('user_avatars')
        .update({ character_description: characterDescription })
        .eq('id', avatar_id)

      const { data: existingVoice } = await supabase
        .from('voice_prompts')
        .select('id')
        .eq('avatar_id', avatar_id)
        .single()

      if (existingVoice) {
        // Update existing
        const { error: voiceUpdateError } = await supabase
          .from('voice_prompts')
          .update({
            language,
            gender: voiceChar.gender,
            voice_description: voiceChar.description,
            voice_age: voiceChar.age,
            voice_accent: voiceChar.accent,
            voice_tone: voiceChar.tone,
            voice_pace: voiceChar.pace,
            voice_prompt_block: voicePromptBlock,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVoice.id)

        if (!voiceUpdateError) {
          voicePromptId = existingVoice.id
          console.log('[analyze-avatar] Updated avatar voice prompt:', voicePromptId)
        }
      } else {
        // Insert new
        const { data: newVoice, error: voiceInsertError } = await supabase
          .from('voice_prompts')
          .insert({
            user_id,
            avatar_id,
            is_profile_avatar: false,
            session_id: null,
            language,
            gender: voiceChar.gender,
            voice_description: voiceChar.description,
            voice_age: voiceChar.age,
            voice_accent: voiceChar.accent,
            voice_tone: voiceChar.tone,
            voice_pace: voiceChar.pace,
            voice_prompt_block: voicePromptBlock
          })
          .select('id')
          .single()

        if (!voiceInsertError && newVoice) {
          voicePromptId = newVoice.id
          console.log('[analyze-avatar] Created avatar voice prompt:', voicePromptId)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          character_description: characterDescription,
          voice_prompt: {
            id: voicePromptId,
            gender: voiceChar.gender,
            age: voiceChar.age,
            accent: voiceChar.accent,
            tone: voiceChar.tone,
            pace: voiceChar.pace,
            prompt_block: voicePromptBlock
          },
          provider: 'openai-gpt4o-mini',
          tokens_used: openaiData.usage?.total_tokens || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[analyze-avatar] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
