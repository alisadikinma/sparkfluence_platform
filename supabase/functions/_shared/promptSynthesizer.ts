/**
 * Prompt Synthesizer v3.0 (2026-01-15)
 * 
 * Synthesizes multiple inputs (visual direction, script, notes, reference flags)
 * into a single comprehensive, coherent image prompt using LLM.
 * 
 * NEW in v3.0:
 * - getContextualOutfitAsync() - LLM picks CATEGORY from constrained list + DB cache
 * - buildCreatorPromptAsync() - CTA emotion override (always smile/friendly)
 * - Improved fallback using getContextualCostume() instead of generic text
 * 
 * NOT simple append - creates a well-structured prompt following best practices.
 */

import { callLLM } from './apiKeyRotation.ts'
import {
  COSTUME_CATEGORIES,
  getCostumeByCategory,
  getCostumeCategoryKeys,
  getContextualCostume,
  CTA_EMOTION_OVERRIDE,
  getHookExpression,
  getHookLighting,
} from './lookups/index.ts'

// ============================================================================
// TYPES
// ============================================================================

export interface PromptSynthesisInput {
  visualDirection: string      // Base visual direction from script
  scriptText: string           // Actual spoken script (context)
  regenerationNotes?: string   // User's additional notes
  includeCreatorFace?: boolean // B-ROLL with creator face checkbox
  hasReferenceImage?: boolean  // Has scene reference image
  segmentType?: string         // HOOK, CTA, BODY-1, etc.
  shotType?: string            // CREATOR or B-ROLL
  emotion?: string             // shock, authority, curiosity, etc.
  aspectRatio?: string         // 9:16, 16:9
}

export interface PromptSynthesisResult {
  synthesizedPrompt: string
  wasLLMUsed: boolean
  processingTimeMs: number
  source: 'llm' | 'fallback'
}

// ============================================================================
// LLM PROMPT TEMPLATE (for prompt synthesis)
// ============================================================================

const SYNTHESIS_SYSTEM_PROMPT = `You are an expert cinematographer and AI image prompt engineer for FLUX Kontext Multi model.

FLUX Kontext Multi receives 2 reference images:
- Image 1 (first reference): Person's face/avatar
- Image 2 (second reference): Scene/environment

Your job is to SYNTHESIZE multiple inputs into ONE natural, coherent prompt.

CRITICAL RULES FOR FLUX KONTEXT MULTI:
1. OUTPUT ONLY the final prompt - no explanations, no markdown, no JSON
2. Keep prompt under 300 words - concise is better for multi-ref
3. ALWAYS start with: "A cinematic shot of a [description] person [doing action]..."
4. Preserve ONLY facial features from reference 1 - NOT clothing/appearance
5. Integrate costume/clothing changes NATURALLY into the main description
6. Match environment/lighting from reference 2
7. Never use phrases like "maintain appearance" or "preserve look" - these conflict with costume changes

PROMPT STRUCTURE (natural language flow):
1. Subject description: "A [gender/age] person wearing [costume] [doing action]"
2. Scene context: "next to [object/creature], in [location]"
3. Environment: "[landscape/setting description from reference 2]"
4. Lighting & atmosphere: "[lighting style], [mood]"
5. Camera specs: "[shot type], [lens], [angle]"
6. Style: "Cinematic, photorealistic, high-quality"

FACE PRESERVATION (at the END, one line only):
"Preserve the exact facial features, skin tone, and face structure from the person in the first reference image."

COSTUME HANDLING:
- If user mentions costume/clothing in notes → integrate into subject description
- Example: "creator pakai baju adat Batak" → "a person wearing traditional Batak ceremonial clothing"
- NEVER say "maintain appearance" or "keep original clothing" - these conflict

INTEGRATION PRIORITY:
- Base visual direction = foundation (scene description)
- User notes = modifications (costume, pose, specific details)
- Merge naturally - don't just append notes at the end
- Write as one cohesive scene description`

function buildSynthesisUserPrompt(input: PromptSynthesisInput): string {
  const isMultiRef = input.includeCreatorFace && input.shotType !== 'CREATOR'
  
  let multiRefInstructions = ''
  if (isMultiRef) {
    multiRefInstructions = `
=== CRITICAL: MULTI-IMAGE REFERENCE MODE ===
FLUX Kontext Multi model - receives 2 images:
- Image 1: Person's face (preserve facial features ONLY)
- Image 2: Scene/environment reference

You MUST:
1. Start with natural description: "A [description] person wearing [costume] [action]..."
2. Integrate costume/clothing from notes into main description
3. Never say "maintain appearance" - only preserve FACIAL FEATURES
4. Write as one cohesive scene, not separate instructions`
  }
  
  return `Synthesize these inputs into ONE natural, coherent prompt for FLUX Kontext Multi:

=== BASE VISUAL DIRECTION ===
${input.visualDirection || 'No visual direction provided'}

=== SCRIPT CONTEXT ===
${input.scriptText || 'No script provided'}

=== USER'S MODIFICATIONS ===
${input.regenerationNotes || 'None'}
${multiRefInstructions}
=== FLAGS ===
- Shot Type: ${input.shotType || 'B-ROLL'}
- Segment: ${input.segmentType || 'BODY'}
- Multi-Ref Mode: ${input.includeCreatorFace ? 'YES - integrate costume naturally, preserve face only' : 'NO'}
- Has Scene Reference: ${input.hasReferenceImage ? 'YES - match environment from reference 2' : 'NO'}
- Emotion: ${input.emotion || 'neutral'}
- Aspect Ratio: ${input.aspectRatio || '9:16'}

OUTPUT: Write ONLY the synthesized prompt in natural language (no explanation, no JSON, no markdown).`
}

// ============================================================================
// FALLBACK SYNTHESIS (No LLM)
// ============================================================================

function fallbackSynthesis(input: PromptSynthesisInput): string {
  let prompt = input.visualDirection || ''
  
  if (input.includeCreatorFace && input.shotType !== 'CREATOR') {
    const originalPrompt = prompt.toLowerCase()
    
    let action = 'standing'
    if (originalPrompt.includes('exploration') || originalPrompt.includes('exploring')) {
      action = 'exploring'
    } else if (originalPrompt.includes('walking') || originalPrompt.includes('walk')) {
      action = 'walking through'
    } else if (originalPrompt.includes('looking') || originalPrompt.includes('watching')) {
      action = 'looking at'
    } else if (originalPrompt.includes('working') || originalPrompt.includes('typing')) {
      action = 'working in'
    } else if (originalPrompt.includes('presenting') || originalPrompt.includes('showing')) {
      action = 'presenting in'
    } else if (originalPrompt.includes('standing')) {
      action = 'standing in'
    } else if (originalPrompt.includes('sitting') || originalPrompt.includes('seated')) {
      action = 'sitting in'
    }
    
    const scene = prompt
      .replace(/^Cinematic\s+(shot|view|scene)?\s*(of)?\s*/i, '')
      .replace(/^(A|An|The)\s+/i, '')
      .replace(/\.$/, '')
    
    prompt = `The person from the first image is ${action} ${scene}.

Maintain the person's face and appearance from the first reference image.
Match the environment and style from the second reference image.`
  } else if (input.hasReferenceImage && !input.includeCreatorFace) {
    prompt += '\n\nStyle: Match the provided reference image aesthetic and composition.'
  }
  
  if (input.regenerationNotes?.trim()) {
    const notes = input.regenerationNotes.trim()
    const isLightingNote = /light|dark|bright|shadow|contrast/i.test(notes)
    const isColorNote = /color|tone|grade|saturation|warm|cool/i.test(notes)
    const isMoodNote = /mood|atmosphere|vibe|feel|emotion/i.test(notes)
    const isCompositionNote = /angle|shot|zoom|close|wide|frame/i.test(notes)
    
    if (isLightingNote) {
      prompt += `\n\nLighting modification: ${notes}`
    } else if (isColorNote) {
      prompt += `\n\nColor adjustment: ${notes}`
    } else if (isMoodNote) {
      prompt += `\n\nAtmosphere: ${notes}`
    } else if (isCompositionNote) {
      prompt += `\n\nComposition: ${notes}`
    } else {
      prompt += `\n\nRefinements: ${notes}`
    }
  }
  
  return prompt
}

// ============================================================================
// MAIN SYNTHESIS FUNCTION
// ============================================================================

export async function synthesizeImagePrompt(
  input: PromptSynthesisInput,
  supabase: any
): Promise<PromptSynthesisResult> {
  const startTime = Date.now()
  
  const needsSynthesis = !!(
    input.regenerationNotes?.trim() ||
    (input.includeCreatorFace && input.shotType !== 'CREATOR') ||
    input.hasReferenceImage
  )
  
  if (!needsSynthesis) {
    return {
      synthesizedPrompt: input.visualDirection || '',
      wasLLMUsed: false,
      processingTimeMs: Date.now() - startTime,
      source: 'fallback'
    }
  }
  
  try {
    const userPrompt = buildSynthesisUserPrompt(input)

    const llmResult = await callLLM(
      supabase,
      [
        { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      { geminiFirst: true, temperature: 0.4, maxTokens: 1024 }
    )

    if (!llmResult.success || !llmResult.content) {
      console.warn(`[PromptSynthesizer] LLM failed: ${llmResult.error}, using fallback`)
      return {
        synthesizedPrompt: fallbackSynthesis(input),
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime,
        source: 'fallback'
      }
    }

    const synthesizedPrompt = llmResult.content.trim()

    if (synthesizedPrompt.length < 50) {
      console.warn('[PromptSynthesizer] LLM returned short response, using fallback')
      return {
        synthesizedPrompt: fallbackSynthesis(input),
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime,
        source: 'fallback'
      }
    }

    console.log(`[PromptSynthesizer] ✅ LLM synthesis complete (${synthesizedPrompt.length} chars)`)

    return {
      synthesizedPrompt,
      wasLLMUsed: true,
      processingTimeMs: Date.now() - startTime,
      source: 'llm'
    }

  } catch (error) {
    console.warn(`[PromptSynthesizer] Error: ${error}, using fallback`)
    return {
      synthesizedPrompt: fallbackSynthesis(input),
      wasLLMUsed: false,
      processingTimeMs: Date.now() - startTime,
      source: 'fallback'
    }
  }
}

// ============================================================================
// CONTEXTUAL OUTFIT v3.0 (2026-01-15)
// LLM picks CATEGORY from constrained list + DB cache
// Ensures output is ALWAYS valid and consistent
// ============================================================================

export interface ContextualOutfitInput {
  topic: string
  scriptSnippet?: string
  segmentType?: string
  language?: string
}

export interface ContextualOutfitResult {
  outfit: string
  category: string
  reasoning: string
  wasLLMUsed: boolean
  wasCached: boolean
  processingTimeMs: number
}

// Generate category list for LLM prompt
const CATEGORY_LIST = getCostumeCategoryKeys().join(', ')

const OUTFIT_CATEGORY_SYSTEM_PROMPT = `You are a wardrobe category classifier for video content creators.

Given a video topic, pick the MOST APPROPRIATE category from this list:
${CATEGORY_LIST}

RULES:
1. OUTPUT ONLY the category name - nothing else
2. Pick the category that best matches the topic's context
3. If unsure, pick DEFAULT
4. Consider the activity/context, not just keywords

EXAMPLES:
- "Cara melamar kerja di rumah sakit" → MEDICAL
- "Review arcade games di Jepang" → GAMING
- "Tips investasi saham untuk pemula" → FINANCE
- "Street food tour Bangkok" → TRAVEL
- "Workout routine untuk pemula" → FITNESS
- "Tutorial makeup natural" → BEAUTY
- "Cara merawat kucing" → PETS
- "Review laptop gaming terbaru" → TECH
- "Resep masak nasi goreng" → COOKING_CASUAL
- "Tips presentasi bisnis" → BUSINESS

OUTPUT: Just the category name (e.g., FITNESS)`

/**
 * Simple MD5-like hash for topic (for cache key)
 */
function hashTopic(topic: string): string {
  const normalized = topic.toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Get contextual outfit using LLM category classification + DB cache
 * 
 * Flow:
 * 1. Check cache by topic_hash
 * 2. If MISS → Call LLM to classify into category
 * 3. Validate category is in COSTUME_CATEGORIES
 * 4. Cache result
 * 5. Return outfit from category
 */
export async function getContextualOutfitAsync(
  input: ContextualOutfitInput,
  supabase: any
): Promise<ContextualOutfitResult> {
  const startTime = Date.now()
  
  // Skip if no topic
  if (!input.topic?.trim()) {
    const fallbackOutfit = getContextualCostume('', input.scriptSnippet || '')
    return {
      outfit: fallbackOutfit,
      category: 'DEFAULT',
      reasoning: 'No topic provided',
      wasLLMUsed: false,
      wasCached: false,
      processingTimeMs: Date.now() - startTime
    }
  }
  
  const topicHash = hashTopic(input.topic)
  
  // ========================================================================
  // STEP 1: Check cache
  // ========================================================================
  try {
    const { data: cached, error: cacheError } = await supabase
      .from('topic_outfit_cache')
      .select('category, outfit')
      .eq('topic_hash', topicHash)
      .single()
    
    if (!cacheError && cached?.category && cached?.outfit) {
      console.log(`[getContextualOutfitAsync] ✅ Cache HIT: ${cached.category} → "${cached.outfit.substring(0, 50)}..."`)
      return {
        outfit: cached.outfit,
        category: cached.category,
        reasoning: 'Cached result',
        wasLLMUsed: false,
        wasCached: true,
        processingTimeMs: Date.now() - startTime
      }
    }
  } catch (cacheErr) {
    console.warn(`[getContextualOutfitAsync] Cache check failed: ${cacheErr}`)
  }
  
  // ========================================================================
  // STEP 2: Call LLM to classify topic into category
  // ========================================================================
  let category = 'DEFAULT'
  let wasLLMUsed = false
  
  try {
    const userPrompt = `Video Topic: "${input.topic}"
${input.scriptSnippet ? `Context: "${input.scriptSnippet.substring(0, 150)}..."` : ''}

Pick ONE category from the list. Output ONLY the category name.`

    const llmResult = await callLLM(
      supabase,
      [
        { role: 'system', content: OUTFIT_CATEGORY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      { geminiFirst: true, temperature: 0.1, maxTokens: 50 }
    )

    if (llmResult.success && llmResult.content) {
      const rawCategory = llmResult.content.trim()
      const cleanCategory = rawCategory.toUpperCase().replace(/[^A-Z_]/g, '')

      if (cleanCategory && cleanCategory in COSTUME_CATEGORIES) {
        category = cleanCategory
        wasLLMUsed = true
        console.log(`[getContextualOutfitAsync] ✅ LLM classified: "${input.topic}" → ${category}`)
      } else {
        console.warn(`[getContextualOutfitAsync] ⚠️ Invalid category from LLM: "${rawCategory}", using fallback`)
      }
    } else {
      console.warn(`[getContextualOutfitAsync] LLM failed: ${geminiResult.error}`)
    }
  } catch (llmErr) {
    console.warn(`[getContextualOutfitAsync] LLM error: ${llmErr}`)
  }
  
  // ========================================================================
  // STEP 3: If LLM failed, use keyword-based fallback
  // ========================================================================
  let outfit: string

  if (!wasLLMUsed) {
    // Use getContextualCostume() which has improved priority logic:
    // 1. Check TOPIC keywords first (topic determines costume)
    // 2. Check script keywords (excluding medical to prevent "health tech" → doctor coat)
    // 3. Fallback to generic topic lookup
    outfit = getContextualCostume(input.topic, input.scriptSnippet || '')

    // Try to reverse-map fallback outfit to a category for caching
    for (const [cat, catOutfit] of Object.entries(COSTUME_CATEGORIES)) {
      if (catOutfit === outfit) {
        category = cat
        break
      }
    }

    console.log(`[getContextualOutfitAsync] 📋 Fallback: "${input.topic}" → ${category} → "${outfit.substring(0, 50)}..."`)
  } else {
    // ========================================================================
    // STEP 4: Get outfit from LLM-classified category
    // ========================================================================
    outfit = getCostumeByCategory(category)
  }
  
  // ========================================================================
  // STEP 5: Cache the result
  // ========================================================================
  try {
    await supabase
      .from('topic_outfit_cache')
      .upsert({
        topic_hash: topicHash,
        topic_original: input.topic,
        category: category,
        outfit: outfit
      }, {
        onConflict: 'topic_hash'
      })
    
    console.log(`[getContextualOutfitAsync] 💾 Cached: ${topicHash} → ${category}`)
  } catch (cacheInsertErr) {
    console.warn(`[getContextualOutfitAsync] Cache insert failed: ${cacheInsertErr}`)
  }
  
  return {
    outfit,
    category,
    reasoning: wasLLMUsed ? 'LLM classification' : 'Keyword fallback',
    wasLLMUsed,
    wasCached: false,
    processingTimeMs: Date.now() - startTime
  }
}

// ============================================================================
// CREATOR PROMPT BUILDER v3.0 (2026-01-15)
// - CTA emotion override: ALWAYS smile/friendly
// - Uses imported CTA_EMOTION_OVERRIDE from lookups
// ============================================================================

export interface CreatorPromptInput {
  topic: string
  emotion: string
  segmentType: string
  aspectRatio: string
  hasReferenceImage: boolean
  contextualOutfit?: string
  refinementNotes?: string
  layout?: string       // 'full' | 'split-60-40' | 'split-50-50' | 'pip' | 'creator-center'
  hookCategory?: string // 'visual_shock' | 'negative_bias' | 'curiosity_gap' | 'relatability' | 'speed_value'
}

export interface CreatorPromptResult {
  prompt: string
  wasLLMUsed: boolean
  processingTimeMs: number
}

/**
 * Build CREATOR shot prompt with CTA emotion override
 */
export async function buildCreatorPromptAsync(
  input: CreatorPromptInput,
  _supabase: any
): Promise<CreatorPromptResult> {
  const startTime = Date.now()
  
  // ========================================================================
  // EMOTION SPECS - CTA OVERRIDE
  // CTA segments ALWAYS get friendly/smile expression regardless of script emotion
  // ========================================================================
  const emotionMap: Record<string, { expression: string; body: string }> = {
    shock: { expression: 'wide startled eyes, raised eyebrows, open mouth', body: 'frozen posture, slight lean back' },
    curiosity: { expression: 'bright engaged eyes, slight head tilt, raised eyebrows', body: 'leaning forward slightly' },
    authority: { expression: 'steady confident gaze, knowing subtle smile', body: 'squared shoulders, arms may be crossed' },
    excitement: { expression: 'bright eyes, genuine enthusiastic smile', body: 'animated energy, dynamic posture' },
    urgency: { expression: 'intense focused gaze, serious expression', body: 'forward lean, alert posture' },
    intrigue: { expression: 'slightly narrowed eyes, mysterious subtle smile', body: 'leaning in conspiratorially' },
    determination: { expression: 'set jaw, focused determined eyes', body: 'squared stance, forward lean' },
    hope: { expression: 'warm smile, bright optimistic eyes', body: 'open posture, slight upward gaze' },
  }
  
  // CHECK FOR SEGMENT-SPECIFIC OVERRIDES
  const segmentUpper = input.segmentType.toUpperCase()
  const isCTA = segmentUpper === 'CTA' || segmentUpper === 'ENDING_CTA'
  const isHOOK = segmentUpper === 'HOOK'

  let emotionSpecs: { expression: string; body: string }

  if (isCTA) {
    // CTA ALWAYS gets friendly/smile expression
    emotionSpecs = {
      expression: CTA_EMOTION_OVERRIDE.expression,
      body: CTA_EMOTION_OVERRIDE.body
    }
    console.log(`[buildCreatorPromptAsync] 😊 CTA emotion override applied: friendly smile`)
  } else if (isHOOK) {
    // HOOK gets hook-category-specific expression from HOOK_EXPRESSION_MAP
    // Falls back to generic intensification if no hookCategory provided
    const hookCat = input.hookCategory || 'visual_shock'
    const hookExpr = getHookExpression(hookCat)
    emotionSpecs = {
      expression: hookExpr.promptPhrase,
      body: `${hookExpr.gesture}, ${hookExpr.body}`,
    }
    console.log(`[buildCreatorPromptAsync] 🎯 HOOK expression applied: category=${hookCat}`)
  } else {
    emotionSpecs = emotionMap[input.emotion.toLowerCase()] || emotionMap.authority
  }
  
  // Hook-category-specific lighting (for HOOK segments only)
  const hookLighting = isHOOK ? getHookLighting(input.hookCategory || 'visual_shock') : null

  // Camera specs based on segment type
  const cameraMap: Record<string, string> = {
    'HOOK': 'Close-up (CU), 85mm f/1.8, eye-level to slight low angle',
    'CTA': 'Close-up (CU), 85mm f/1.8, eye-level, engaging direct angle',
    'LOOP-END': 'Close-up (CU), 85mm f/1.8, matching HOOK composition',
    'BODY': 'Medium close-up (MCU), 50mm f/2.8, eye-level',
  }
  const cameraSpecs = cameraMap[segmentUpper] || cameraMap['BODY']

  // Layout-aware framing hints
  const layout = input.layout || 'full'
  let layoutFraming = ''
  if (layout === 'split-60-40' || layout === 'split-50-50') {
    layoutFraming = 'Frame subject from waist up (medium shot), leave clean edges for split-screen compositing. Subject centered in frame.'
  } else if (layout === 'pip') {
    layoutFraming = 'Frame subject as close-up portrait from chest up, clean simple background for picture-in-picture overlay.'
  } else if (layout === 'creator-center') {
    layoutFraming = 'Subject centered in frame with generous transparent/clean background around them for overlay compositing.'
  }
  // 'full' = no extra framing instruction (default full-screen)

  // Build prompt
  let prompt: string
  
  if (input.hasReferenceImage) {
    // CRITICAL: Must explicitly instruct to CHANGE outfit from reference image
    // Image edit models preserve original clothing unless explicitly told to change
    const outfitInstruction = input.contextualOutfit
      ? `IMPORTANT: Change the person's outfit to: ${input.contextualOutfit}. Do NOT keep the original clothing from reference.`
      : ''

    prompt = `The person from the reference image with ${emotionSpecs.expression}.

Pose: ${emotionSpecs.body}
${outfitInstruction}

Camera: ${cameraSpecs}
Composition: ${isHOOK ? 'Off-center left using golden ratio, negative space right for visual breathing room, direct intense eye contact with lens' : 'Rule of thirds, subject positioned for visual balance'}

Lighting: ${isHOOK && hookLighting ? hookLighting.promptPhrase : isCTA ? 'Butterfly 2:1 ratio, clean even light' : 'Rembrandt 4:1 ratio, professional studio lighting'}
Color: Cinematic warm tones, Vision3 500T film stock look${isHOOK ? ', high saturation for maximum attention' : ''}
Background: ${isHOOK ? 'Slightly blurred contextual background with subtle visual element related to ' + (input.topic || 'content creation') + ' to create curiosity' : 'Contextual for ' + (input.topic || 'content creation') + ', moderate depth blur'}

Preserve ONLY: exact facial features, face shape, and skin tone from reference image.
Do NOT preserve: clothing, accessories, or background from reference.${layoutFraming ? `\nFraming: ${layoutFraming}` : ''}
Style: Cinematic photorealistic, natural skin texture, high quality.${isHOOK ? ' Maximum visual impact, scroll-stopping energy.' : ''}
Clean frame, no text overlays, no watermarks.`

  } else {
    const outfitLine = input.contextualOutfit || 'smart casual professional attire'

    prompt = `A professional content creator with ${emotionSpecs.expression}.

Pose: ${emotionSpecs.body}
Outfit: ${outfitLine}

Camera: ${cameraSpecs}
Composition: ${isHOOK ? 'Off-center left using golden ratio, negative space right for visual breathing room, direct intense eye contact with lens' : 'Rule of thirds, subject positioned for visual balance'}

Lighting: ${isHOOK && hookLighting ? hookLighting.promptPhrase : isCTA ? 'Butterfly 2:1 ratio, clean even light' : 'Rembrandt 4:1 ratio, professional studio lighting'}
Color: Cinematic warm tones, Vision3 500T film stock look${isHOOK ? ', high saturation for maximum attention' : ''}
Background: ${isHOOK ? 'Slightly blurred contextual background with subtle visual element related to ' + (input.topic || 'content creation') + ' to create curiosity' : 'Modern setting appropriate for ' + (input.topic || 'content creation')}

Style: Cinematic photorealistic, natural skin texture, high quality.${isHOOK ? ' Maximum visual impact, scroll-stopping energy.' : ''}${layoutFraming ? `\nFraming: ${layoutFraming}` : ''}
Clean frame, no text overlays, no watermarks.`
  }

  if (input.refinementNotes?.trim()) {
    prompt += `\n\nAdditional requirements: ${input.refinementNotes.trim()}`
  }
  
  return {
    prompt,
    wasLLMUsed: false,
    processingTimeMs: Date.now() - startTime
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  synthesizeImagePrompt,
  getContextualOutfitAsync,
  buildCreatorPromptAsync
}
