/**
 * Prompt Synthesizer v2.0 (2026-01-15)
 * 
 * Synthesizes multiple inputs (visual direction, script, notes, reference flags)
 * into a single comprehensive, coherent image prompt using LLM.
 * 
 * NEW in v2.0:
 * - getContextualOutfitAsync() - LLM determines outfit based on topic
 * - buildCreatorPromptAsync() - Builds CREATOR prompt without hardcoded age/appearance
 * 
 * NOT simple append - creates a well-structured prompt following best practices.
 */

import { getApiKeyFromPool } from './apiKeyRotation.ts'

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
// LLM PROMPT TEMPLATE
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

EXAMPLE (Good):
"A cinematic shot of an Asian man wearing traditional Batak ceremonial clothing, standing confidently next to a large Komodo dragon in a rugged natural habitat. The landscape features dry grasslands, scattered trees, and distant mountains under golden hour sunlight. The man poses naturally with arms crossed while the dragon rests beside him. Medium shot, 50mm lens, eye-level angle. Warm cinematic color grade with natural lighting. Photorealistic, high-quality. Preserve the exact facial features and face structure from the person in the first reference image."

EXAMPLE (Bad):
"The person from the first image is standing with Komodo. Maintain face and appearance from first image. Match scene from second image. Refinements: wear Batak clothing."

INTEGRATION PRIORITY:
- Base visual direction = foundation (scene description)
- User notes = modifications (costume, pose, specific details)
- Merge naturally - don't just append notes at the end
- Write as one cohesive scene description`

function buildSynthesisUserPrompt(input: PromptSynthesisInput): string {
  // Determine multi-ref mode (B-ROLL with creator face)
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
4. Write as one cohesive scene, not separate instructions

EXAMPLE:
"A middle-aged Asian man wearing traditional Batak ceremonial attire, standing next to a Komodo dragon in a rugged landscape. Golden hour lighting, mountains in background. Medium shot, cinematic. Preserve exact facial features from first reference image."`
  }
  
  let userPrompt = `Synthesize these inputs into ONE natural, coherent prompt for FLUX Kontext Multi:

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

  return userPrompt
}

// ============================================================================
// FALLBACK SYNTHESIS (No LLM)
// ============================================================================

function fallbackSynthesis(input: PromptSynthesisInput): string {
  let prompt = input.visualDirection || ''
  
  // ========================================================================
  // CRITICAL: FLUX Kontext Multi requires explicit reference to which image
  // First image = creator face, Second image = scene reference
  // Pattern: "The person from the first image is [action] in [scene]."
  // ========================================================================
  if (input.includeCreatorFace && input.shotType !== 'CREATOR') {
    // Extract action/scene from original prompt
    const originalPrompt = prompt.toLowerCase()
    
    // Try to extract what the person should be doing
    let action = 'standing'
    let scene = 'the scene'
    
    // Common action patterns in visual directions
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
    
    // Extract scene description (remove common prefixes)
    scene = prompt
      .replace(/^Cinematic\s+(shot|view|scene)?\s*(of)?\s*/i, '')
      .replace(/^(A|An|The)\s+/i, '')
      .replace(/\.$/, '')
    
    // Build proper multi-ref prompt
    prompt = `The person from the first image is ${action} ${scene}.

Maintain the person's face and appearance from the first reference image.
Match the environment and style from the second reference image.`
  }
  
  // Add reference image matching instruction if needed (single ref)
  else if (input.hasReferenceImage && !input.includeCreatorFace) {
    prompt += '\n\nStyle: Match the provided reference image aesthetic and composition.'
  }
  
  // Add regeneration notes with smart integration
  if (input.regenerationNotes?.trim()) {
    const notes = input.regenerationNotes.trim()
    
    // Check if notes contain specific modifications
    const isLightingNote = /light|dark|bright|shadow|contrast/i.test(notes)
    const isColorNote = /color|tone|grade|saturation|warm|cool/i.test(notes)
    const isMoodNote = /mood|atmosphere|vibe|feel|emotion/i.test(notes)
    const isCompositionNote = /angle|shot|zoom|close|wide|frame/i.test(notes)
    
    if (isLightingNote) {
      // Replace or append to lighting section
      prompt += `\n\nLighting modification: ${notes}`
    } else if (isColorNote) {
      prompt += `\n\nColor adjustment: ${notes}`
    } else if (isMoodNote) {
      prompt += `\n\nAtmosphere: ${notes}`
    } else if (isCompositionNote) {
      prompt += `\n\nComposition: ${notes}`
    } else {
      // General refinement
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
  
  // Skip LLM if no notes and no special flags - use original prompt
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
  
  // Try LLM synthesis
  try {
    // Get API key from pool with rotation
    const keyResult = await getApiKeyFromPool(supabase, 'gemini')
    
    if (!keyResult.success || !keyResult.apiKey) {
      console.warn('[PromptSynthesizer] No API key available, using fallback')
      return {
        synthesizedPrompt: fallbackSynthesis(input),
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime,
        source: 'fallback'
      }
    }
    
    const apiKey = keyResult.apiKey
    const userPrompt = buildSynthesisUserPrompt(input)
    
    // Call Gemini 2.0 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SYNTHESIS_SYSTEM_PROMPT },
              { text: userPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.4,  // Lower temperature for consistency
            maxOutputTokens: 1024,
            topP: 0.8
          }
        })
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[PromptSynthesizer] Gemini error: ${response.status} - ${errorText}`)
      
      // Mark key as potentially rate-limited if 429
      if (response.status === 429 && keyResult.keyId) {
        await supabase
          .from('api_keys_pool')
          .update({ 
            last_error: 'rate_limited',
            last_used_at: new Date().toISOString()
          })
          .eq('id', keyResult.keyId)
      }
      
      return {
        synthesizedPrompt: fallbackSynthesis(input),
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime,
        source: 'fallback'
      }
    }
    
    const data = await response.json()
    const synthesizedPrompt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    
    if (!synthesizedPrompt || synthesizedPrompt.length < 50) {
      console.warn('[PromptSynthesizer] LLM returned empty/short response, using fallback')
      return {
        synthesizedPrompt: fallbackSynthesis(input),
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime,
        source: 'fallback'
      }
    }
    
    // Update key usage
    if (keyResult.keyId) {
      await supabase
        .from('api_keys_pool')
        .update({ 
          request_count: (keyResult.requestCount || 0) + 1,
          last_used_at: new Date().toISOString(),
          last_error: null
        })
        .eq('id', keyResult.keyId)
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
// CONTEXTUAL OUTFIT via LLM (NEW v2.0 - 2026-01-15)
// Uses LLM to determine appropriate outfit based on topic + script context
// ============================================================================

export interface ContextualOutfitInput {
  topic: string
  scriptSnippet?: string
  segmentType?: string  // HOOK, CTA, BODY, etc.
  language?: string     // id, hi, en
}

export interface ContextualOutfitResult {
  outfit: string
  reasoning: string
  wasLLMUsed: boolean
  processingTimeMs: number
}

const OUTFIT_SYSTEM_PROMPT = `You are a wardrobe consultant for video content creators.

Given a video topic and context, determine what outfit the creator should wear to look CREDIBLE and RELEVANT.

RULES:
1. OUTPUT ONLY valid JSON: {"outfit": "description", "reasoning": "why"}
2. Be SPECIFIC: colors, style, accessories (e.g., "white lab coat with stethoscope around neck")
3. Match the topic's professional context
4. Keep it REALISTIC and achievable
5. Consider cultural appropriateness
6. NO generic answers like "professional attire" - be specific!

EXAMPLES:
- Topic: "Cara melamar kerja di rumah sakit" → {"outfit": "white doctor coat over light blue scrubs with stethoscope around neck", "reasoning": "Medical job topic requires healthcare professional appearance for credibility"}
- Topic: "Review arcade games di Jepang" → {"outfit": "casual gamer hoodie with graphic tee underneath, comfortable jeans", "reasoning": "Gaming/entertainment content requires relaxed casual style, not formal"}
- Topic: "Tips investasi saham untuk pemula" → {"outfit": "navy blazer over crisp white shirt, no tie for approachable look", "reasoning": "Finance topic needs professional but not intimidating appearance"}
- Topic: "Street food tour Bangkok" → {"outfit": "casual comfortable t-shirt with light jacket, practical travel wear", "reasoning": "Food/travel content needs casual tourist-friendly appearance"}
- Topic: "Workout routine untuk pemula" → {"outfit": "fitted athletic tank top or compression shirt with gym shorts", "reasoning": "Fitness content requires proper athletic wear"}
- Topic: "NASA dan misi ke Mars" → {"outfit": "NASA-style flight suit or space agency polo shirt with mission patches", "reasoning": "Space topic benefits from authentic aerospace aesthetic"}`

/**
 * Get contextual outfit using LLM (Gemini 2.0 Flash)
 * Falls back to generic smart casual if LLM fails
 */
export async function getContextualOutfitAsync(
  input: ContextualOutfitInput,
  supabase: any
): Promise<ContextualOutfitResult> {
  const startTime = Date.now()
  
  // Skip if no topic
  if (!input.topic?.trim()) {
    return {
      outfit: 'smart casual professional attire',
      reasoning: 'No topic provided',
      wasLLMUsed: false,
      processingTimeMs: Date.now() - startTime
    }
  }
  
  try {
    // Get API key from pool
    const keyResult = await getApiKeyFromPool(supabase, 'gemini')
    
    if (!keyResult.success || !keyResult.apiKey) {
      console.warn('[getContextualOutfitAsync] No API key available')
      return {
        outfit: 'smart casual professional attire',
        reasoning: 'API key unavailable',
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime
      }
    }
    
    const userPrompt = `Video Topic: "${input.topic}"
${input.scriptSnippet ? `Script Context: "${input.scriptSnippet.substring(0, 200)}..."` : ''}
Segment: ${input.segmentType || 'BODY'}

What outfit should the creator wear? Return JSON only.`
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyResult.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: OUTFIT_SYSTEM_PROMPT },
              { text: userPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,  // Low temperature for consistency
            maxOutputTokens: 256,
            topP: 0.8
          }
        })
      }
    )
    
    if (!response.ok) {
      console.warn(`[getContextualOutfitAsync] Gemini error: ${response.status}`)
      return {
        outfit: 'smart casual professional attire',
        reasoning: 'LLM request failed',
        wasLLMUsed: false,
        processingTimeMs: Date.now() - startTime
      }
    }
    
    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    
    // Parse JSON response
    try {
      // Clean up potential markdown code blocks
      const cleanJson = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      const parsed = JSON.parse(cleanJson)
      
      if (parsed.outfit && parsed.outfit.length > 10) {
        console.log(`[getContextualOutfitAsync] ✅ Outfit: "${parsed.outfit}"`)
        
        // Update key usage
        if (keyResult.keyId) {
          await supabase
            .from('api_keys_pool')
            .update({ 
              request_count: (keyResult.requestCount || 0) + 1,
              last_used_at: new Date().toISOString()
            })
            .eq('id', keyResult.keyId)
        }
        
        return {
          outfit: parsed.outfit,
          reasoning: parsed.reasoning || 'LLM determined',
          wasLLMUsed: true,
          processingTimeMs: Date.now() - startTime
        }
      }
    } catch (parseError) {
      console.warn(`[getContextualOutfitAsync] JSON parse error: ${parseError}`)
    }
    
    return {
      outfit: 'smart casual professional attire',
      reasoning: 'LLM response invalid',
      wasLLMUsed: false,
      processingTimeMs: Date.now() - startTime
    }
    
  } catch (error) {
    console.warn(`[getContextualOutfitAsync] Error: ${error}`)
    return {
      outfit: 'smart casual professional attire',
      reasoning: 'Exception occurred',
      wasLLMUsed: false,
      processingTimeMs: Date.now() - startTime
    }
  }
}

// ============================================================================
// CREATOR PROMPT BUILDER (NEW v2.0 - 2026-01-15)
// Builds CREATOR shot prompt WITHOUT hardcoded age/appearance
// When reference image exists: only describe expression, pose, camera, outfit
// ============================================================================

export interface CreatorPromptInput {
  topic: string
  emotion: string
  segmentType: string        // HOOK, CTA, BODY, etc.
  aspectRatio: string        // 9:16, 16:9
  hasReferenceImage: boolean // CRITICAL: determines if we describe appearance
  contextualOutfit?: string  // From getContextualOutfitAsync()
  refinementNotes?: string   // User's regeneration notes
}

export interface CreatorPromptResult {
  prompt: string
  wasLLMUsed: boolean
  processingTimeMs: number
}

/**
 * Build CREATOR shot prompt
 * 
 * CRITICAL LOGIC:
 * - WITH reference image: Only describe expression, pose, camera, outfit changes
 * - WITHOUT reference: Include full character description
 */
export async function buildCreatorPromptAsync(
  input: CreatorPromptInput,
  supabase: any
): Promise<CreatorPromptResult> {
  const startTime = Date.now()
  
  // Get emotion specs (from cinematographyLookup)
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
  
  const emotionSpecs = emotionMap[input.emotion.toLowerCase()] || emotionMap.authority
  
  // Camera specs based on segment type
  const cameraMap: Record<string, string> = {
    'HOOK': 'Close-up (CU), 85mm f/1.8, eye-level to slight low angle',
    'CTA': 'Close-up (CU), 85mm f/1.8, eye-level, engaging direct angle',
    'LOOP-END': 'Close-up (CU), 85mm f/1.8, matching HOOK composition',
    'BODY': 'Medium close-up (MCU), 50mm f/2.8, eye-level',
  }
  const cameraSpecs = cameraMap[input.segmentType.toUpperCase()] || cameraMap['BODY']
  
  // Build prompt based on whether reference image exists
  let prompt: string
  
  if (input.hasReferenceImage) {
    // ========================================================================
    // WITH REFERENCE IMAGE: Do NOT describe age, ethnicity, face features
    // Only describe: expression, pose, camera, lighting, outfit (if changing)
    // ========================================================================
    
    const outfitLine = input.contextualOutfit 
      ? `Outfit: ${input.contextualOutfit}` 
      : '(Outfit from reference image)'
    
    prompt = `The person from the reference image with ${emotionSpecs.expression}.

Pose: ${emotionSpecs.body}
${outfitLine}

Camera: ${cameraSpecs}
Composition: Rule of thirds, subject positioned for visual balance

Lighting: Professional studio lighting, Rembrandt pattern, 4:1 ratio
Color: Cinematic warm tones, Vision3 500T film stock look
Background: Contextual for ${input.topic || 'content creation'}, moderate depth blur

Maintain exact facial features, face shape, and skin tone from reference image.
Style: Cinematic photorealistic, natural skin texture, high quality.
Clean frame, no text overlays, no watermarks.`
    
  } else {
    // ========================================================================
    // WITHOUT REFERENCE IMAGE: Include character description
    // This is less ideal for face consistency but necessary as fallback
    // ========================================================================
    
    const outfitLine = input.contextualOutfit || 'smart casual professional attire'
    
    prompt = `A professional content creator with ${emotionSpecs.expression}.

Pose: ${emotionSpecs.body}
Outfit: ${outfitLine}

Camera: ${cameraSpecs}
Composition: Rule of thirds, subject positioned for visual balance

Lighting: Professional studio lighting, Rembrandt pattern, 4:1 ratio
Color: Cinematic warm tones, Vision3 500T film stock look
Background: Modern setting appropriate for ${input.topic || 'content creation'}

Style: Cinematic photorealistic, natural skin texture, high quality.
Clean frame, no text overlays, no watermarks.`
  }
  
  // Add refinement notes if present
  if (input.refinementNotes?.trim()) {
    prompt += `\n\nAdditional requirements: ${input.refinementNotes.trim()}`
  }
  
  return {
    prompt,
    wasLLMUsed: false, // This function doesn't use LLM, outfit comes from getContextualOutfitAsync
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
