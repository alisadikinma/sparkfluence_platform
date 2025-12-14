import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { callGeminiHybrid, callOpenRouterHybrid } from '../_shared/apiKeyRotation.ts'
import { 
  PROJECT_INSTRUCTION, 
  CORE_FRAMEWORKS, 
  INDONESIAN_GENZ_PLAYBOOK, 
  TOP_HOOK_TEMPLATES,
  CINEMATIC_VISUAL_GUIDE,
  getStructureByDuration 
} from '../_shared/prompts/viralScriptKnowledge.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supported languages with their script generation styles
const LANGUAGE_CONFIG: Record<string, { 
  name: string; 
  style: string; 
  example: string;
  foreshadow: { tease: string; urgency: string; example: string };
  hook: { pattern: string; example: string };
}> = {
  indonesian: {
    name: 'Indonesian',
    style: 'Indonesian Gen-Z style - casual, code-mixed with English slang (lo/gue, literally, vibes, banget, gila, anjay), rhetorical hooks, hyperbolic reactions',
    example: 'Gue dulu juga gitu, tapi setelah nemu cara ini—literally game changer banget!',
    foreshadow: {
      tease: '...dan yang terakhir ini yang paling [gila/penting/game-changer]',
      urgency: 'Tonton sampai habis / Stay sampai akhir',
      example: 'Gue bakal kasih tau 3 cara, dan yang ketiga ini literally yang paling gila. Tonton sampai habis!'
    },
    hook: {
      pattern: 'Curiosity gap + hyperbolic reaction',
      example: 'Lo tau nggak kenapa 90% orang gagal di [X]? Ternyata masalahnya cuma satu...'
    }
  },
  english: {
    name: 'English',
    style: 'Modern English - conversational, engaging, uses trending phrases and hooks common on TikTok/Instagram',
    example: 'I used to struggle with this too, but this ONE trick changed everything for me.',
    foreshadow: {
      tease: '...and the last one is the most [insane/important/game-changing]',
      urgency: 'Watch until the end / Stay till the end',
      example: "I'm gonna show you 3 methods, and the third one is absolutely insane. Watch until the end!"
    },
    hook: {
      pattern: 'Curiosity gap + bold claim',
      example: "Here's why 90% of people fail at [X]—and it's not what you think..."
    }
  },
  hindi: {
    name: 'Hindi',
    style: 'Hinglish (Hindi-English mix) - casual conversational tone, uses common Hindi slang and English buzzwords',
    example: 'Yaar, maine bhi yeh try kiya aur literally life change ho gayi!',
    foreshadow: {
      tease: '...aur last wala sabse [crazy/important/game-changer] hai',
      urgency: 'End tak dekho / Last tak ruko',
      example: 'Main tumhe 3 tarike bataunga, aur teesra wala sabse crazy hai. End tak dekho!'
    },
    hook: {
      pattern: 'Relatable problem + solution tease',
      example: 'Yaar, 90% log [X] mein fail kyun hote hain? Reason sirf ek hai...'
    }
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

    const { 
      input_type, 
      content, 
      duration, 
      aspect_ratio,
      resolution,
      platform, 
      language, 
      user_id,
      segment_type
      // NOTE: character_description is handled by VideoEditor -> generate-images
      // No need to pass avatar URL here anymore
    } = await req.json()

    if (!content || !input_type) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set defaults
    const selectedDuration = duration || '60s'
    const selectedAspectRatio = aspect_ratio || '9:16'
    const selectedResolution = resolution || '1080p'
    const selectedPlatform = platform || 'tiktok'
    const selectedLanguage = language || 'indonesian'
    
    console.log('[Script] Starting generation - NO DB QUERIES for knowledge')
    console.log(`[Script] Duration: ${selectedDuration}, Language: ${selectedLanguage}`)

    // Handle regenerate_segment differently
    if (input_type === 'regenerate_segment') {
      const result = await regenerateSegment(supabase, content, segment_type, selectedLanguage)
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================
    // BUILD PROMPTS WITH STATIC KNOWLEDGE (NO DB QUERIES!)
    // ============================================================
    
    const systemPrompt = buildSystemPrompt(selectedLanguage, selectedDuration)
    const userPrompt = buildUserPrompt(
      input_type,
      content,
      selectedDuration,
      selectedAspectRatio,
      selectedResolution,
      selectedPlatform,
      selectedLanguage
    )

    // ============================================================
    // CALL LLM (Gemini PRIMARY, OpenRouter FALLBACK)
    // ============================================================
    
    let generatedText: string = ''
    let llmSource = 'unknown'
    
    // Try Gemini first (FAST - ~3-8 seconds)
    console.log('[LLM] Trying Gemini 2.0 Flash (primary)...')
    const geminiResult = await callGeminiHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'gemini-2.0-flash',
        temperature: 0.6,
        maxTokens: 4096
      }
    )

    if (geminiResult.success && geminiResult.content) {
      console.log(`[LLM] Gemini success (source: ${geminiResult.source})`)
      generatedText = geminiResult.content
      llmSource = `gemini-${geminiResult.source}`
    } else {
      // Fallback to OpenRouter if Gemini fails
      console.log('[LLM] Gemini failed:', geminiResult.error)
      console.log('[LLM] Trying OpenRouter fallback...')
      
      const openRouterResult = await callOpenRouterHybrid(
        supabase,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          temperature: 0.6,
          maxTokens: 4096
        }
      )

      if (openRouterResult.error || !openRouterResult.data?.choices?.[0]?.message?.content) {
        throw new Error(openRouterResult.error || 'All LLM providers failed')
      }

      console.log(`[LLM] OpenRouter success (source: ${openRouterResult.source})`)
      generatedText = openRouterResult.data.choices[0].message.content
      llmSource = `openrouter-${openRouterResult.source}`
    }

    console.log(`[LLM] Final source: ${llmSource}`)

    // ============================================================
    // PARSE OUTPUT
    // ============================================================
    
    const scriptData = parseScriptOutput(generatedText, selectedDuration, content)

    // Add video settings to metadata
    if (scriptData.metadata) {
      scriptData.metadata.aspect_ratio = selectedAspectRatio
      scriptData.metadata.resolution = selectedResolution
      scriptData.metadata.llm_source = llmSource
    }

    return new Response(
      JSON.stringify({ success: true, data: scriptData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// PROMPT BUILDERS (Using Static Knowledge)
// ============================================================================

function buildSystemPrompt(language: string, duration: string): string {
  const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['indonesian']
  // CRITICAL: Segment counts updated for max 8s per segment (VEO 3.1 limit)
  const segmentCount = duration === '30s' ? 5 : duration === '60s' ? 8 : 12
  const structureGuide = getStructureByDuration(duration)
  
  return `You are an elite Viral Script Engineer specializing in short-form video content that gets millions of views.

═══════════════════════════════════════════════════════════════
🚨 CONTENT COMPLETENESS RULES (ABSOLUTELY CRITICAL)
═══════════════════════════════════════════════════════════════

**IF THE TOPIC CONTAINS A NUMBER (e.g., "5 masakan", "3 tips", "7 cara"), YOU MUST:**

1. **COVER ALL ITEMS** - If topic says "5 masakan Italy", script MUST explain ALL 5 dishes
2. **ONE BODY SEGMENT PER ITEM** - Each numbered item gets its own BODY segment
3. **NO SKIPPING** - Never skip items to rush to CTA
4. **COMPLETE STORYLINE** - Each item must have:
   - Name/title of the item
   - Why it's relevant/viral/important
   - Key details or tips

**CONTENT DISTRIBUTION FOR NUMBERED TOPICS:**

| Topic Items | Video Duration | Distribution |
|-------------|----------------|---------------|
| 3 items | 30s | BODY-1, BODY-2, BODY-3 (1 item each) |
| 5 items | 60s | BODY-1 to BODY-4 + PEAK (distribute 5 items) |
| 7 items | 90s | BODY-1 to BODY-7 (1 item each) |

**EXAMPLE - "5 Masakan Italy yang VIRAL":**
- HOOK: "Lo wajib coba 5 masakan Italy ini sebelum mati!"
- FORE: "Gue bakal kasih tau 5 masakan, dan yang kelima ini literally game changer. Stay sampai akhir!"
- BODY-1: Masakan #1 (Carbonara) - kenapa viral, tips
- BODY-2: Masakan #2 (Cacio e Pepe) - kenapa viral, tips  
- BODY-3: Masakan #3 (Amatriciana) - kenapa viral, tips
- BODY-4: Masakan #4 (Risotto) - kenapa viral, tips
- PEAK: Masakan #5 (Tiramisu) - THE BEST ONE, payoff dari foreshadow
- CTA: "Follow buat rekomendasi kuliner lainnya!"

**VALIDATION BEFORE OUTPUT:**
- [ ] Count items mentioned in topic
- [ ] Verify ALL items are covered in BODY segments
- [ ] Ensure PEAK contains the "best" item (teased in FORE)
- [ ] Storyline flows logically from #1 to #N

═══════════════════════════════════════════════════════════════
🚨 CRITICAL OUTPUT RULES (MUST FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════

1. OUTPUT FORMAT: Return ONLY a valid JSON object. NO markdown, NO explanations, NO text before/after JSON.

2. SEGMENT STRUCTURE: Generate exactly ${segmentCount} segments for ${duration} video:
${structureGuide}

3. SHOT TYPES:
   - CREATOR: HOOK, CTA, LOOP-END (creator talking to camera)
   - B-ROLL: FORE, BODY-1, BODY-2, BODY-3, PEAK (illustrative visuals)

4. EACH SEGMENT MUST HAVE:
   - segment_id: "VIDEO-001", "VIDEO-002", etc.
   - type: HOOK/FORE/BODY-1/BODY-2/BODY-3/PEAK/CTA
   - timing: "0-5s", "5-10s", etc.
   - duration_seconds: integer
   - shot_type: "CREATOR" or "B-ROLL"
   - emotion: Curiosity/Shock/Intrigue/Awe/Tension/Resolution/Urgency
   - transition: Cut/Jump-Cut/Zoom-In/Zoom-Out/Flash-Cut/Whip-Pan
   - script_text: The actual spoken script
   - visual_direction: 50-80 words describing the visual (MANDATORY LENGTH!)
   - creator_costume: (ONLY FOR CREATOR SHOTS) Outfit/clothing that matches the topic theme
   - creator_appearance: (ONLY FOR CREATOR SHOTS) Generic face description matching country + topic profession

5. SCRIPT LANGUAGE: ${langConfig.name}
   Style: ${langConfig.style}
   Example tone: "${langConfig.example}"

6. HOOK REQUIREMENTS (MOST IMPORTANT):
   - Must stop the scroll in first 3 seconds
   - Use pattern interrupt, curiosity gap, or shocking statement
   - Include contrast (before/after, problem/solution)

7. FORESHADOW (FORE) REQUIREMENTS:
   - MUST tease the ending: "${langConfig.foreshadow.tease}"
   - MUST include urgency: "${langConfig.foreshadow.urgency}"
   - Creates FOMO if viewer skips
   - Example in ${langConfig.name}: "${langConfig.foreshadow.example}"

8. VISUAL DIRECTION REQUIREMENTS (50-80 WORDS EACH):
   - For CREATOR: facial expression, gesture, energy level, eye contact, background
   - For B-ROLL: main subject, composition, lighting mood, motion, text overlays

9. CREATOR COSTUME REQUIREMENTS (MANDATORY FOR CREATOR SHOTS):
   - For HOOK/CTA segments, add "creator_costume" field with topic-appropriate outfit
   - Examples by topic:
     * Agriculture/Farming → "farmer outfit with straw hat, plaid shirt, denim overalls"
     * Technology/Coding → "casual tech hoodie, modern minimalist style"
     * Fitness/Health → "athletic wear, sports jersey, gym outfit"
     * Business/Finance → "professional blazer, smart casual business attire"
     * Cooking/Food → "chef apron, kitchen attire, food blogger casual"
     * Travel → "explorer outfit, casual travel wear with backpack"
     * Fashion/Beauty → "trendy fashionable outfit matching current season"
   - Costume should enhance credibility and match topic theme
   - Keep description concise: 10-20 words max

10. CREATOR APPEARANCE (FALLBACK FOR NO-AVATAR USERS):
   - For CREATOR shots, ALWAYS add "creator_appearance" field
   - This describes a GENERIC FACE matching the target audience country + topic profession
   - Format: "[ethnicity] [gender], [age], [profession-related appearance]"
   - Country/ethnicity based on script language:
     * Indonesian → "Southeast Asian Indonesian"
     * Hindi → "South Asian Indian"
     * English → "diverse/mixed ethnicity" (neutral)
   - Profession based on topic:
     * Agriculture → "farmer with weathered friendly face"
     * Medical/Health → "doctor/nurse with caring professional look"
     * Technology → "tech professional with modern casual look"
     * Fitness → "athletic trainer with energetic expression"
     * Business → "business professional with confident demeanor"
     * Cooking → "chef with warm approachable smile"
   - Example for Indonesian farming topic:
     "Southeast Asian Indonesian male, late 30s, experienced farmer with friendly weathered face, warm smile"
   - Keep description 15-25 words, focus on FACE characteristics only

═══════════════════════════════════════════════════════════════
📚 KNOWLEDGE BASE (Apply these principles)
═══════════════════════════════════════════════════════════════

${CORE_FRAMEWORKS}

${language === 'indonesian' ? INDONESIAN_GENZ_PLAYBOOK : ''}

${TOP_HOOK_TEMPLATES}

═══════════════════════════════════════════════════════════════
🎬 CINEMATIC VISUAL DIRECTION (CRITICAL FOR QUALITY)
═══════════════════════════════════════════════════════════════

${CINEMATIC_VISUAL_GUIDE}

DO NOT deviate from this structure. Output ONLY the JSON.`;
}

// Helper: Extract number from topic (e.g., "5 masakan" -> 5)
function extractTopicItemCount(topic: string): number | null {
  // Match patterns like "5 masakan", "3 tips", "7 cara", "10 fakta"
  const patterns = [
    /(\d+)\s*(masakan|makanan|minuman|resep|menu|hidangan)/i,
    /(\d+)\s*(tips?|trik|cara|langkah|step|hack)/i,
    /(\d+)\s*(fakta|hal|alasan|reason|thing)/i,
    /(\d+)\s*(produk|brand|merek|item|barang)/i,
    /(\d+)\s*(tempat|lokasi|destinasi|spot)/i,
    /(\d+)\s*(film|movie|series|anime|game)/i,
    /(\d+)\s*(artis|seleb|influencer|creator)/i,
    /top\s*(\d+)/i,
    /(\d+)\s*(best|terbaik|teratas)/i
  ]
  
  for (const pattern of patterns) {
    const match = topic.match(pattern)
    if (match) {
      // Extract the number (could be in group 1 or 2 depending on pattern)
      const num = parseInt(match[1]) || parseInt(match[2])
      if (num && num > 0 && num <= 10) return num
    }
  }
  return null
}

function buildUserPrompt(
  inputType: string,
  content: string,
  duration: string,
  aspectRatio: string,
  resolution: string,
  platform: string,
  language: string
): string {
  const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['indonesian']
  const compositionGuide = aspectRatio === '16:9' 
    ? 'LANDSCAPE - wide shots, horizontal framing'
    : 'VERTICAL 9:16 - tight framing, center-focused, mobile-optimized'
  
  // Detect if topic has numbered items
  const itemCount = extractTopicItemCount(content)
  const numberedTopicInstructions = itemCount ? `
═══════════════════════════════════════════════════════════════
⚠️ NUMBERED TOPIC DETECTED: ${itemCount} ITEMS
═══════════════════════════════════════════════════════════════

Your topic mentions **${itemCount} items**. You MUST:

1. **COVER ALL ${itemCount} ITEMS** in the BODY segments
2. **Distribution plan:**
   - BODY-1: Item #1 (with name + why it's special)
   - BODY-2: Item #2 (with name + why it's special)
   ${itemCount >= 3 ? '- BODY-3: Item #3 (with name + why it\'s special)' : ''}
   ${itemCount >= 4 ? '- BODY-4: Item #4 (with name + why it\'s special)' : ''}
   ${itemCount >= 5 ? '- PEAK: Item #5 - THE BEST ONE (teased in FORE as "yang terakhir paling gila")' : ''}
   ${itemCount >= 6 ? '- Additional items distributed across remaining BODY segments' : ''}
3. **FORE must tease**: "...dan yang ke-${itemCount} ini yang paling [gila/penting]"
4. **NO SKIPPING** - Do NOT jump to CTA before covering all ${itemCount} items!

❌ WRONG: Topic "5 masakan" but only covers 2, then jumps to CTA
✅ CORRECT: Topic "5 masakan" covers all 5 across BODY-1, BODY-2, BODY-3, BODY-4, PEAK
` : ''

  return `
═══════════════════════════════════════════════════════════════
🎯 GENERATE VIRAL SCRIPT NOW
═══════════════════════════════════════════════════════════════

TOPIC: ${content}

VIDEO SPECS:
- Duration: ${duration}
- Aspect Ratio: ${aspectRatio} (${compositionGuide})
- Platform: ${platform}
- Language: ${langConfig.name} (${langConfig.style})
${numberedTopicInstructions}
═══════════════════════════════════════════════════════════════
⚡ GENERATE NOW - OUTPUT JSON ONLY
═══════════════════════════════════════════════════════════════

CRITICAL REMINDERS:
1. HOOK must stop scroll with curiosity/shock pattern. Example: "${langConfig.hook.example}"
2. FORE must tease ending: "${langConfig.foreshadow.example}"
3. Each visual_direction MUST be 50-80 words
4. ALL script_text MUST be in ${langConfig.name} ONLY - NO mixing languages!
5. Return ONLY valid JSON, no other text
${itemCount ? `6. ⚠️ COVER ALL ${itemCount} ITEMS - Do NOT skip any! Each item gets its own BODY segment.
7. PEAK segment = Item #${itemCount} (the BEST one, teased in FORE)` : ''}

Generate the complete viral script JSON now:`;
}

// ============================================================================
// OUTPUT PARSER (Enhanced with validation)
// ============================================================================

function parseScriptOutput(generatedText: string, duration: string, topic?: string): any {
  try {
    // Try to extract JSON from the response
    let jsonStr = generatedText.trim()
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }
    
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      let parsed: any
      
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (jsonError) {
        // JSON might be truncated - try to fix it
        console.log('[Parser] JSON parse failed, attempting to fix truncated JSON...')
        let fixedJson = jsonMatch[0]
        
        // Count open/close braces and brackets
        const openBraces = (fixedJson.match(/\{/g) || []).length
        const closeBraces = (fixedJson.match(/\}/g) || []).length
        const openBrackets = (fixedJson.match(/\[/g) || []).length
        const closeBrackets = (fixedJson.match(/\]/g) || []).length
        
        // Add missing closing brackets/braces
        fixedJson += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
        fixedJson += '}'.repeat(Math.max(0, openBraces - closeBraces))
        
        // Try parsing again
        try {
          parsed = JSON.parse(fixedJson)
        } catch {
          // Still failing - try more aggressive fix
          // Find last complete segment and close the JSON
          const lastCompleteSegment = fixedJson.lastIndexOf('},"VIDEO-')
          if (lastCompleteSegment > 0) {
            fixedJson = fixedJson.substring(0, lastCompleteSegment + 1) + '}'
            parsed = JSON.parse(fixedJson)
          } else {
            throw jsonError
          }
        }
      }
      
      // ================================================================
      // HANDLE DIFFERENT LLM OUTPUT FORMATS
      // ================================================================
      
      let segments: any[] = []
      
      // Format 1: Already has segments array
      if (parsed.segments && Array.isArray(parsed.segments)) {
        segments = parsed.segments
      }
      // Format 2: Object with VIDEO-XXX keys (e.g., { "VIDEO-001": {...}, "VIDEO-002": {...} })
      else if (parsed['VIDEO-001'] || Object.keys(parsed).some(k => k.startsWith('VIDEO-'))) {
        console.log('[Parser] Detected VIDEO-XXX object format, converting to array...')
        const videoKeys = Object.keys(parsed)
          .filter(k => k.startsWith('VIDEO-'))
          .sort() // Ensure order
        
        segments = videoKeys.map(key => ({
          segment_id: key,
          ...parsed[key]
        }))
      }
      // Format 3: Object with segment_X keys
      else if (Object.keys(parsed).some(k => k.match(/^segment_?\d+$/i))) {
        console.log('[Parser] Detected segment_X object format, converting to array...')
        const segmentKeys = Object.keys(parsed)
          .filter(k => k.match(/^segment_?\d+$/i))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''))
            const numB = parseInt(b.replace(/\D/g, ''))
            return numA - numB
          })
        
        segments = segmentKeys.map((key, index) => ({
          segment_id: `VIDEO-${String(index + 1).padStart(3, '0')}`,
          ...parsed[key]
        }))
      }
      // Format 4: Direct array at root
      else if (Array.isArray(parsed)) {
        console.log('[Parser] Detected root array format')
        segments = parsed
      }
      
      if (segments.length === 0) {
        console.error('[Parser] Could not extract segments from:', Object.keys(parsed))
        throw new Error('Could not extract segments from LLM output')
      }
      
      console.log(`[Parser] Extracted ${segments.length} segments`)

      // Validate and enhance segments
      segments = segments.map((segment: any, index: number) => {
        // Ensure segment_id exists
        if (!segment.segment_id) {
          segment.segment_id = `VIDEO-${String(index + 1).padStart(3, '0')}`
        }
        
        // Ensure emotion exists
        if (!segment.emotion) {
          segment.emotion = index === 0 ? 'Curiosity' : 'Intrigue'
        }
        
        // Ensure transition exists
        if (!segment.transition) {
          segment.transition = 'Cut'
        }
        
        return segment
      })

      // Build result object
      const result: any = {
        segments,
        metadata: parsed.metadata || {
          total_duration: parseInt(duration),
          language: 'english',
          platform: 'tiktok'
        }
      }
      
      // ========================================================
      // CONTENT COMPLETENESS VALIDATION
      // ========================================================
      if (topic) {
        const expectedItemCount = extractTopicItemCount(topic)
        if (expectedItemCount) {
          // Count BODY segments (where content items should be)
          const bodySegments = segments.filter((s: any) => 
            s.type?.toUpperCase().startsWith('BODY') || 
            s.type?.toUpperCase() === 'PEAK'
          )
          
          result.metadata.expected_items = expectedItemCount
          result.metadata.body_segment_count = bodySegments.length
          
          if (bodySegments.length < expectedItemCount) {
            result.metadata.content_warning = `Topic mentions ${expectedItemCount} items but only ${bodySegments.length} BODY segments generated. Some items may be missing.`
            console.warn(`[Parser] ⚠️ Content mismatch: Expected ${expectedItemCount} items, got ${bodySegments.length} BODY segments`)
          } else {
            result.metadata.content_complete = true
            console.log(`[Parser] ✅ Content complete: ${expectedItemCount} items covered in ${bodySegments.length} BODY segments`)
          }
        }
      }

      console.log(`[Parser] Successfully parsed ${segments.length} segments`)
      return result
    }

    throw new Error('No JSON found in response')

  } catch (parseError) {
    console.error('[Parser] Failed to parse LLM output:', parseError)
    console.error('[Parser] Raw output:', generatedText.substring(0, 1000))
    
    return {
      segments: [],
      metadata: {
        total_duration: parseInt(duration),
        parse_error: true,
        raw_output: generatedText.substring(0, 2000)
      },
      error: 'Failed to parse script output'
    }
  }
}

// ============================================================================
// REGENERATE SINGLE SEGMENT (Simplified)
// ============================================================================

async function regenerateSegment(
  supabase: any, 
  feedback: string, 
  segmentType: string, 
  language: string
) {
  const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['indonesian']
  const isCreatorShot = ['HOOK', 'CTA', 'LOOP-END'].includes(segmentType?.toUpperCase())

  const systemPrompt = `You are a Viral Script Engineer. Regenerate a SINGLE video segment based on user feedback.

SEGMENT TYPE: ${segmentType || 'BODY'}
SHOT TYPE: ${isCreatorShot ? 'CREATOR' : 'B-ROLL'}
LANGUAGE: ${langConfig.name} - ${langConfig.style}

CRITICAL: 
- visual_direction MUST be 50-80 words
- script_text in ${langConfig.name} Gen-Z style
- Output ONLY valid JSON`

  const userPrompt = `Regenerate this segment with the following feedback:

${feedback}

Return JSON:
{
  "segment": {
    "segment_id": "REGEN-001",
    "type": "${segmentType}",
    "timing": "0-8s",
    "duration_seconds": 8,
    "shot_type": "${isCreatorShot ? 'CREATOR' : 'B-ROLL'}",
    "emotion": "...",
    "transition": "Cut",
    "script_text": "... (${langConfig.name} Gen-Z style)",
    "visual_direction": "50-80 words describing the visual scene in detail..."
  }
}`

  // Try Gemini first (FAST)
  let generatedText: string = ''
  
  console.log('[Regenerate] Trying Gemini (primary)...')
  const geminiResult = await callGeminiHybrid(
    supabase,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    {
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxTokens: 1024
    }
  )

  if (geminiResult.success && geminiResult.content) {
    console.log('[Regenerate] Gemini success')
    generatedText = geminiResult.content
  } else {
    // Fallback to OpenRouter
    console.log('[Regenerate] Gemini failed:', geminiResult.error)
    console.log('[Regenerate] Trying OpenRouter...')
    
    const openRouterResult = await callOpenRouterHybrid(
      supabase,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        temperature: 0.7,
        maxTokens: 1024
      }
    )

    if (openRouterResult.error || !openRouterResult.data?.choices?.[0]?.message?.content) {
      throw new Error(openRouterResult.error || 'All LLM providers failed')
    }
    generatedText = openRouterResult.data.choices[0].message.content
  }

  // Parse JSON
  let jsonStr = generatedText.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  }
  
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  const result = JSON.parse(jsonMatch ? jsonMatch[0] : jsonStr)
  
  return result
}
