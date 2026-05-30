// ============================================================================
// SMART KEYWORD EXTRACTION SYSTEM v2.0 - LLM-First Design
// 
// Architecture:
//   Layer 1: LLM (Gemini via api_keys_pool) - Primary extraction
//   Layer 2: Tavily Search (optional) - Real-time enrichment
//
// Why LLM-First:
//   ✅ Zero maintenance - LLM knows all locations
//   ✅ Always current - No hardcoded data to update
//   ✅ Any language - Indonesian, Hindi, English, etc.
//   ✅ Context-aware - Understands "Danau Toba di Sumatra Utara"
//   ✅ Cost efficient - 4 Gemini keys + 4 Tavily keys in pool
//
// Updated: 2026-01-14
// ============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callLLM, callTavilyHybrid } from './apiKeyRotation.ts'

// ============================================================================
// Types
// ============================================================================

export interface LocationResult {
  location: string           // Primary location name (e.g., "Danau Toba")
  region: string | null      // Region/province (e.g., "Sumatra Utara")
  country: string            // Country (e.g., "Indonesia")
  full: string               // Full string for image search
  type: 'natural' | 'city' | 'landmark' | 'attraction' | 'area' | 'unknown'
  confidence: 'high' | 'medium' | 'low'
}

export interface KeywordExtractionResult {
  // Location data
  location: LocationResult | null
  
  // Additional context
  venue: string | null              // Quoted venue name like 'Game Center'
  activities: string[]              // Detected activities (hiking, diving, etc.)
  atmosphere: string[]              // Mood words (peaceful, vibrant, etc.)
  
  // Final output
  fullKeywords: string              // Combined string for image prompt
  
  // Debug info
  source: 'llm' | 'tavily' | 'fallback'
  processingTimeMs: number
}

export interface EnrichmentResult {
  description: string | null
  relatedPlaces: string[]
  visualElements: string[]          // Things to show in image
  culturalContext: string | null
}

// ============================================================================
// LLM EXTRACTION PROMPT
// ============================================================================

const KEYWORD_EXTRACTION_PROMPT = `You are a visual keyword extraction AI for stock image search. Extract the BEST search keywords from the given text.

RULES:
1. HIGHEST PRIORITY: If the text mentions a SPECIFIC product name, app, tool, brand, or person's name — extract the EXACT name as-is. Do NOT generalize to category.
   - "Notion AI. Otomatis bikin notulen" → searchKeywords: ["Notion AI", "Notion workspace"]
   - "Miro. Tool kolaborasi" → searchKeywords: ["Miro", "Miro whiteboard"]
   - "Codium AI bisa generate code" → searchKeywords: ["Codium AI", "AI code editor"]
   - "Elon Musk says..." → searchKeywords: ["Elon Musk", "Tesla CEO"]
   - "NEVER generalize: 'AI tool' is WRONG if script says 'Notion AI'"
2. Extract the MOST SPECIFIC location mentioned (if any)
3. Extract scene objects, props, activities that would make good stock image searches
4. Use the TOPIC for context — keywords should be relevant to the video's subject
5. Return valid JSON only, no markdown
6. If no location found, set "found": false but still return searchKeywords

OUTPUT FORMAT:
{
  "found": true,
  "location": "Danau Toba",
  "region": "Sumatra Utara",
  "country": "Indonesia",
  "type": "natural",
  "confidence": "high",
  "activities": ["boating", "sightseeing"],
  "atmosphere": ["peaceful", "scenic"],
  "searchKeywords": ["Danau Toba scenic view", "lake toba boat ride"]
}

TYPE OPTIONS: natural, city, landmark, attraction, area, unknown
CONFIDENCE: high (explicitly named), medium (implied), low (uncertain)
searchKeywords: 2-4 short English phrases ideal for stock image search (always English, even if text is Indonesian/Hindi)
CRITICAL: If a named product/app/brand is mentioned at the start of the text, it MUST be in searchKeywords[0].

`

// ============================================================================
// LAYER 1: LLM EXTRACTION (Primary)
// ============================================================================

/**
 * Extract location and context using Gemini LLM
 * Uses api_keys_pool for automatic rotation
 */
export async function extractWithLLM(
  text: string,
  supabase: SupabaseClient,
  topic?: string
): Promise<{
  location: LocationResult | null
  activities: string[]
  atmosphere: string[]
  searchKeywords: string[]
} | null> {
  if (!text || text.length < 10) {
    return null
  }

  const topicLine = topic ? `TOPIC/CONTEXT: "${topic}"\n\n` : ''
  const prompt = KEYWORD_EXTRACTION_PROMPT + topicLine + `TEXT TO ANALYZE:\n"${text.substring(0, 800)}"\n\nJSON only:`

  try {
    const result = await callLLM(
      supabase,
      [{ role: 'user', content: prompt }],
      { geminiFirst: true, temperature: 0.1, maxTokens: 512 }
    )

    if (!result.success || !result.content) {
      console.warn(`[LLM Extract] Error: ${result.error}`)
      return null
    }

    // Parse JSON response
    const cleanContent = result.content
      .replace(/```json|```/g, '')
      .trim()
    
    const parsed = JSON.parse(cleanContent)

    if (!parsed.found || !parsed.location) {
      console.log(`[LLM Extract] No location found in text`)
      // Still return searchKeywords if available (even without location)
      if (parsed.searchKeywords?.length > 0) {
        return {
          location: null,
          activities: parsed.activities || [],
          atmosphere: parsed.atmosphere || [],
          searchKeywords: parsed.searchKeywords
        }
      }
      return null
    }

    // Build full location string
    const fullParts = [parsed.location]
    if (parsed.region) fullParts.push(parsed.region)
    if (parsed.country) fullParts.push(parsed.country)

    console.log(`[LLM Extract] Found: ${fullParts.join(', ')} (${parsed.confidence}, via ${result.source})`)

    return {
      location: {
        location: parsed.location,
        region: parsed.region || null,
        country: parsed.country || 'Unknown',
        full: fullParts.join(' '),
        type: parsed.type || 'unknown',
        confidence: parsed.confidence || 'medium'
      },
      activities: parsed.activities || [],
      atmosphere: parsed.atmosphere || [],
      searchKeywords: parsed.searchKeywords || []
    }
  } catch (error) {
    console.warn(`[LLM Extract] Parse error: ${error}`)
    return null
  }
}

// ============================================================================
// LAYER 2: TAVILY ENRICHMENT (Optional)
// ============================================================================

/**
 * Enrich location data with real-time search
 * Useful for getting visual elements and cultural context
 */
export async function enrichWithTavily(
  location: LocationResult,
  supabase: SupabaseClient
): Promise<EnrichmentResult | null> {
  const query = `${location.full} tourism attractions visual description`

  try {
    const result = await callTavilyHybrid(supabase, query, {
      searchDepth: 'basic',
      maxResults: 3,
      includeAnswer: true
    })

    if (result.error || !result.success) {
      console.warn(`[Tavily Enrich] Error: ${result.error}`)
      return null
    }

    // Extract useful info from Tavily response
    const answer = result.answer || ''
    const results = result.results || []

    // Parse visual elements from search results
    const visualElements: string[] = []
    const relatedPlaces: string[] = []

    // Extract from answer
    if (answer) {
      // Look for visual keywords
      const visualPatterns = [
        /crystal[\s-]*clear/gi,
        /turquoise/gi,
        /emerald/gi,
        /volcanic/gi,
        /pristine/gi,
        /lush/gi,
        /ancient/gi,
        /traditional/gi,
        /panoramic/gi,
        /sunrise|sunset/gi,
        /mountain|hill/gi,
        /lake|river|waterfall|ocean|sea|beach/gi,
        /forest|jungle|rainforest/gi,
        /temple|palace|mosque|church/gi,
        /rice[\s-]*terrace|paddy/gi,
      ]

      for (const pattern of visualPatterns) {
        const matches = answer.match(pattern)
        if (matches) {
          visualElements.push(...matches.map(m => m.toLowerCase()))
        }
      }
    }

    // Extract related places from results
    for (const item of results.slice(0, 3)) {
      const title = item.title || ''
      // Extract place names (simplified)
      if (title && !relatedPlaces.includes(title)) {
        relatedPlaces.push(title.substring(0, 50))
      }
    }

    console.log(`[Tavily Enrich] Found ${visualElements.length} visual elements, ${relatedPlaces.length} related places`)

    return {
      description: answer ? answer.substring(0, 300) : null,
      relatedPlaces: relatedPlaces.slice(0, 5),
      visualElements: [...new Set(visualElements)].slice(0, 8),
      culturalContext: null // Can be enhanced later
    }
  } catch (error) {
    console.warn(`[Tavily Enrich] Exception: ${error}`)
    return null
  }
}

// ============================================================================
// MAIN EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract quoted entities (venue names in quotes)
 * Pattern: 'Venue Name' or "Venue Name"
 */
function extractQuotedEntities(text: string): string[] {
  const singleQuotes = text.match(/'([^']+)'/g) || []
  const doubleQuotes = text.match(/"([^"]+)"/g) || []

  return [...singleQuotes, ...doubleQuotes]
    .map(q => q.replace(/['"]/g, '').trim())
    .filter(q => q.length > 1 && q.length < 50)
}

/**
 * Main extraction function - ASYNC with LLM
 *
 * @param visualDirection - The visual_direction from script generation
 * @param script - The script/voiceover text
 * @param supabase - Supabase client for API key rotation
 * @param enableTavilyEnrichment - Whether to enrich with Tavily (slower but richer)
 * @param topic - Video topic for contextual keyword extraction
 */
export async function extractKeywordsStructuredAsync(
  visualDirection: string,
  script: string,
  supabase: SupabaseClient,
  enableTavilyEnrichment: boolean = false,
  topic?: string
): Promise<KeywordExtractionResult> {
  const startTime = Date.now()
  const combinedText = `${visualDirection} ${script}`.trim()

  // Default result
  const defaultResult: KeywordExtractionResult = {
    location: null,
    venue: null,
    activities: [],
    atmosphere: [],
    fullKeywords: '',
    source: 'fallback',
    processingTimeMs: 0
  }

  if (!combinedText || combinedText.length < 10) {
    defaultResult.processingTimeMs = Date.now() - startTime
    return defaultResult
  }

  // 1. Extract quoted venue names
  const quotedEntities = extractQuotedEntities(combinedText)
  const venue = quotedEntities.length > 0 ? quotedEntities[0] : null

  // 2. LLM extraction (primary) — pass topic for context
  const llmResult = await extractWithLLM(combinedText, supabase, topic)

  if (!llmResult) {
    // Total failure - return minimal result
    const parts: string[] = []
    if (venue) parts.push(venue)

    return {
      location: null,
      venue,
      activities: [],
      atmosphere: [],
      fullKeywords: parts.join(' '),
      source: 'fallback',
      processingTimeMs: Date.now() - startTime
    }
  }

  // LLM returned searchKeywords but no location — use those
  if (!llmResult.location) {
    const parts: string[] = []
    if (venue) parts.push(venue)
    // Use LLM-generated search keywords
    if (llmResult.searchKeywords.length > 0) {
      parts.push(...llmResult.searchKeywords.slice(0, 3))
    }

    return {
      location: null,
      venue,
      activities: llmResult.activities,
      atmosphere: llmResult.atmosphere,
      fullKeywords: [...new Set(parts)].slice(0, 5).join(' | '),
      source: 'llm',
      processingTimeMs: Date.now() - startTime
    }
  }

  // 3. Optional: Tavily enrichment
  let enrichment: EnrichmentResult | null = null
  if (enableTavilyEnrichment && llmResult.location.confidence === 'high') {
    enrichment = await enrichWithTavily(llmResult.location, supabase)
  }

  // 4. Build final keywords
  const parts: string[] = []
  
  // Add venue if present
  if (venue) parts.push(venue)
  
  // Add location
  parts.push(llmResult.location.full)
  
  // Add visual elements from Tavily if available
  if (enrichment?.visualElements.length) {
    parts.push(...enrichment.visualElements.slice(0, 3))
  }
  
  // Add atmosphere
  if (llmResult.atmosphere.length) {
    parts.push(...llmResult.atmosphere.slice(0, 2))
  }

  const fullKeywords = [...new Set(parts)].slice(0, 6).join(' ')

  return {
    location: llmResult.location,
    venue,
    activities: llmResult.activities,
    atmosphere: llmResult.atmosphere,
    fullKeywords,
    source: enrichment ? 'tavily' : 'llm',
    processingTimeMs: Date.now() - startTime
  }
}

/**
 * Simple string extraction (ASYNC)
 * Convenience wrapper
 */
export async function extractKeywordsAsync(
  visualDirection: string,
  script: string,
  supabase: SupabaseClient
): Promise<string> {
  const result = await extractKeywordsStructuredAsync(visualDirection, script, supabase)
  return result.fullKeywords
}

// ============================================================================
// PROMPT ENHANCEMENT
// ============================================================================

/**
 * Enhance visual prompt with extracted keywords
 * Use this in Edge Function to improve B-ROLL image prompts
 */
export async function enhancePromptWithKeywordsAsync(
  visualDirection: string,
  script: string,
  basePrompt: string | undefined,
  supabase: SupabaseClient
): Promise<string> {
  const keywords = await extractKeywordsStructuredAsync(visualDirection, script, supabase)

  // Log extraction for debugging
  if (keywords.location) {
    console.log(`[enhancePrompt] Location: ${keywords.location.full} (${keywords.location.type}, ${keywords.source})`)
  }

  // If base prompt provided, enhance it
  if (basePrompt && basePrompt.length > 50) {
    const enhancements: string[] = []

    // Add location context if not already present
    if (keywords.location && !basePrompt.toLowerCase().includes(keywords.location.location.toLowerCase())) {
      enhancements.push(`Location: ${keywords.location.full}`)
      
      // Add location type context
      if (keywords.location.type === 'natural') {
        enhancements.push('Natural landscape photography')
      } else if (keywords.location.type === 'landmark') {
        enhancements.push('Iconic landmark shot')
      }
    }

    // Add venue if quoted and not in base prompt
    if (keywords.venue && !basePrompt.includes(keywords.venue)) {
      enhancements.push(`Setting: ${keywords.venue}`)
    }

    // Add atmosphere
    if (keywords.atmosphere.length > 0) {
      const atmosphereStr = keywords.atmosphere.slice(0, 3).join(', ')
      if (!basePrompt.toLowerCase().includes(atmosphereStr.toLowerCase())) {
        enhancements.push(`Atmosphere: ${atmosphereStr}`)
      }
    }

    if (enhancements.length > 0) {
      return `${basePrompt}\n\n${enhancements.join('. ')}.`
    }

    return basePrompt
  }

  // No base prompt - build from keywords
  if (keywords.fullKeywords.length > 0) {
    return `Cinematic scene of ${keywords.fullKeywords}. Professional cinematography, 8K quality, no text, no watermarks.`
  }

  // Fallback
  return visualDirection || script || 'Professional cinematic scene'
}

// ============================================================================
// SYNC VERSIONS (for frontend - no LLM, basic extraction only)
// ============================================================================

/**
 * Basic keyword extraction without LLM (SYNC)
 * For frontend use where async is not possible
 * Only extracts quoted entities and basic patterns
 */
export function extractKeywordsStructured(
  visualDirection: string,
  script: string
): KeywordExtractionResult {
  const combinedText = `${visualDirection} ${script}`.trim()

  // Extract quoted entities only
  const quotedEntities = extractQuotedEntities(combinedText)
  const venue = quotedEntities.length > 0 ? quotedEntities[0] : null

  const parts: string[] = []
  if (venue) parts.push(venue)

  return {
    location: null,  // No location without LLM
    venue,
    activities: [],
    atmosphere: [],
    fullKeywords: parts.join(' '),
    source: 'fallback',
    processingTimeMs: 0
  }
}

/**
 * Simple string extraction (SYNC)
 */
export function extractKeywords(visualDirection: string, script: string): string {
  const result = extractKeywordsStructured(visualDirection, script)
  return result.fullKeywords
}

/**
 * Sync version of prompt enhancement (limited functionality)
 */
export function enhancePromptWithKeywords(
  visualDirection: string,
  script: string,
  basePrompt?: string
): string {
  const keywords = extractKeywordsStructured(visualDirection, script)

  if (basePrompt && basePrompt.length > 50) {
    if (keywords.venue && !basePrompt.includes(keywords.venue)) {
      return `${basePrompt}\n\nSetting: ${keywords.venue}.`
    }
    return basePrompt
  }

  if (keywords.fullKeywords.length > 0) {
    return `Cinematic scene of ${keywords.fullKeywords}. Professional cinematography, 8K quality, no text, no watermarks.`
  }

  return visualDirection || script || 'Professional cinematic scene'
}

// ============================================================================
// UTILITY: Get suggested keywords for UI
// ============================================================================

/**
 * Get suggested keywords for Reference Image modal
 * Async version with full LLM extraction
 */
export async function getSuggestedKeywordsAsync(
  visualDirection: string,
  script: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const result = await extractKeywordsStructuredAsync(visualDirection, script, supabase)
  const suggestions: string[] = []

  // Add location
  if (result.location) {
    suggestions.push(result.location.full)
    if (result.location.region) {
      suggestions.push(result.location.region)
    }
  }

  // Add venue
  if (result.venue) {
    suggestions.push(result.venue)
  }

  // Add activities
  suggestions.push(...result.activities.slice(0, 3))

  // Add atmosphere
  suggestions.push(...result.atmosphere.slice(0, 2))

  return [...new Set(suggestions)].slice(0, 8)
}

/**
 * Get suggested keywords (SYNC - limited)
 */
export function getSuggestedKeywords(visualDirection: string, script: string): string[] {
  const result = extractKeywordsStructured(visualDirection, script)
  const suggestions: string[] = []

  if (result.venue) {
    suggestions.push(result.venue)
  }

  return suggestions
}

// ============================================================================
// RE-EXPORT for backward compatibility
// ============================================================================

// Legacy interface (deprecated but kept for compatibility)
export interface LLMLocationResult {
  location: string | null
  parent: string | null
  full: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'cache' | 'fuzzy' | 'llm'
}

/**
 * Legacy function - now redirects to LLM extraction
 * @deprecated Use extractKeywordsStructuredAsync instead
 */
export async function extractLocationSmart(
  text: string,
  supabase?: SupabaseClient
): Promise<LLMLocationResult | null> {
  if (!supabase) {
    return null
  }

  const result = await extractWithLLM(text, supabase)
  
  if (!result || !result.location) {
    return null
  }

  return {
    location: result.location.location,
    parent: result.location.region,
    full: result.location.full,
    confidence: result.location.confidence,
    source: 'llm'
  }
}
