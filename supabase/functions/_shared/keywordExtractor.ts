// ============================================================================
// SMART KEYWORD EXTRACTION SYSTEM - Deno Edge Function Version
// 3-Layer Extraction: Cache → Fuzzy Match → LLM Fallback (via api_keys_pool)
// Shared between Frontend + Edge Function for consistency
// ============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callGeminiHybrid } from './apiKeyRotation.ts'

/**
 * Location hierarchy - sub-regions map to parent regions
 * Format: subregion -> parent context to append
 * This is DATA, not logic - easily extensible by adding new entries
 * LAYER 1: O(1) direct lookup
 */
export const LOCATION_HIERARCHY: Record<string, string> = {
  // Tokyo districts
  akihabara: 'Tokyo Japan', shinjuku: 'Tokyo Japan', shibuya: 'Tokyo Japan',
  odaiba: 'Tokyo Japan', harajuku: 'Tokyo Japan', ginza: 'Tokyo Japan',
  roppongi: 'Tokyo Japan', ikebukuro: 'Tokyo Japan', asakusa: 'Tokyo Japan',
  ueno: 'Tokyo Japan', nakano: 'Tokyo Japan', shimokitazawa: 'Tokyo Japan',
  
  // Osaka districts
  dotonbori: 'Osaka Japan', namba: 'Osaka Japan', umeda: 'Osaka Japan',
  shinsekai: 'Osaka Japan', tennoji: 'Osaka Japan',
  
  // Kyoto areas
  gion: 'Kyoto Japan', arashiyama: 'Kyoto Japan', fushimi: 'Kyoto Japan',
  
  // Seoul districts
  gangnam: 'Seoul Korea', hongdae: 'Seoul Korea', myeongdong: 'Seoul Korea',
  itaewon: 'Seoul Korea', insadong: 'Seoul Korea', dongdaemun: 'Seoul Korea',
  
  // Shanghai districts
  pudong: 'Shanghai China', bund: 'Shanghai China', jingan: 'Shanghai China',
  
  // Beijing areas
  wangfujing: 'Beijing China', sanlitun: 'Beijing China',
  
  // Singapore areas
  orchard: 'Singapore', marina: 'Singapore', sentosa: 'Singapore',
  
  // Bangkok areas
  sukhumvit: 'Bangkok Thailand', silom: 'Bangkok Thailand', khaosan: 'Bangkok Thailand',
  
  // NYC areas
  manhattan: 'New York USA', brooklyn: 'New York USA', queens: 'New York USA',
  soho: 'New York USA', tribeca: 'New York USA', harlem: 'New York USA',
  
  // LA areas
  hollywood: 'Los Angeles USA', beverly: 'Los Angeles USA', venice: 'Los Angeles USA',
  santamonica: 'Los Angeles USA',
  
  // London areas
  sohouk: 'London UK', shoreditch: 'London UK', camden: 'London UK',
  westminster: 'London UK', coventgarden: 'London UK',
  
  // Paris areas
  montmartre: 'Paris France', marais: 'Paris France', champs: 'Paris France',
  
  // Jakarta areas
  kemang: 'Jakarta Indonesia', sudirman: 'Jakarta Indonesia', menteng: 'Jakarta Indonesia',
  senayan: 'Jakarta Indonesia', kuningan: 'Jakarta Indonesia', scbd: 'Jakarta Indonesia',
  pik: 'Jakarta Indonesia', kelapa: 'Jakarta Indonesia',
  
  // Bali areas
  seminyak: 'Bali Indonesia', ubud: 'Bali Indonesia', canggu: 'Bali Indonesia',
  kuta: 'Bali Indonesia', sanur: 'Bali Indonesia', nusa: 'Bali Indonesia',
  
  // Mumbai areas
  bandra: 'Mumbai India', colaba: 'Mumbai India', juhu: 'Mumbai India',
  andheri: 'Mumbai India', worli: 'Mumbai India',
  
  // Delhi areas
  connaught: 'Delhi India', hauz: 'Delhi India', saket: 'Delhi India',
  
  // Cities without districts (direct match)
  tokyo: 'Japan', osaka: 'Japan', kyoto: 'Japan', seoul: 'Korea',
  shanghai: 'China', beijing: 'China', singapore: '', bangkok: 'Thailand',
  newyork: 'USA', losangeles: 'USA', london: 'UK', paris: 'France',
  jakarta: 'Indonesia', bali: 'Indonesia', mumbai: 'India', delhi: 'India',
  dubai: 'UAE', hongkong: '', taipei: 'Taiwan', sydney: 'Australia',
  melbourne: 'Australia', toronto: 'Canada', vancouver: 'Canada',
  berlin: 'Germany', amsterdam: 'Netherlands', barcelona: 'Spain',
  madrid: 'Spain', rome: 'Italy', milan: 'Italy', zurich: 'Switzerland',
}

/**
 * Context words that indicate style/mood/atmosphere
 */
const CONTEXT_PATTERNS: string[] = [
  'retro', 'vintage', 'modern', 'futuristic', 'neon', 'cyberpunk',
  'traditional', 'classic', 'minimalist', 'luxurious', 'cozy',
  'busy', 'crowded', 'quiet', 'peaceful', 'vibrant', 'dark',
  'bright', 'colorful', 'moody', 'atmospheric', 'cinematic',
  'professional', 'casual', 'formal', 'urban', 'rural',
  'gaming', 'esports', 'tech', 'startup', 'corporate',
  'street', 'underground', 'rooftop', 'indoor', 'outdoor'
]

/**
 * Significant nouns that should be extracted
 */
const NOUN_PATTERNS: string[] = [
  'arcade', 'cafe', 'restaurant', 'bar', 'club', 'lounge',
  'office', 'studio', 'store', 'shop', 'mall', 'market',
  'temple', 'shrine', 'museum', 'gallery', 'theater',
  'station', 'terminal', 'airport', 'hotel', 'resort',
  'park', 'garden', 'beach', 'mountain', 'river', 'lake',
  'street', 'alley', 'boulevard', 'avenue', 'plaza',
  'tower', 'building', 'skyscraper', 'bridge', 'landmark',
  'center', 'complex', 'campus', 'warehouse', 'factory',
  'gym', 'spa', 'salon', 'clinic', 'hospital',
  'school', 'university', 'library', 'bookstore',
  'kitchen', 'bedroom', 'living', 'bathroom', 'balcony'
]

// ============================================================================
// LAYER 2: FUZZY MATCHING (Levenshtein Distance)
// Handles typos like "Sinjuku" → "Shinjuku", "Akihabra" → "Akihabara"
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * No external dependencies - pure implementation for Deno compatibility
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
function similarityRatio(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)
  return maxLength === 0 ? 1 : 1 - distance / maxLength
}

/**
 * Find best fuzzy match from LOCATION_HIERARCHY
 * Returns null if no match above threshold
 */
function fuzzyMatchLocation(
  word: string, 
  threshold: number = 0.75
): { key: string; similarity: number } | null {
  const lowerWord = word.toLowerCase()
  let bestMatch: { key: string; similarity: number } | null = null
  
  for (const key of Object.keys(LOCATION_HIERARCHY)) {
    // Skip very short keys to avoid false positives
    if (key.length < 4 || lowerWord.length < 4) continue
    
    const similarity = similarityRatio(lowerWord, key)
    
    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { key, similarity }
      }
    }
  }
  
  return bestMatch
}

// ============================================================================
// LAYER 3: LLM EXTRACTION (Gemini 2.0 Flash - FREE)
// Handles completely unknown locations not in cache
// ============================================================================

/**
 * LLM extraction result interface
 */
export interface LLMLocationResult {
  location: string | null
  parent: string | null
  full: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'cache' | 'fuzzy' | 'llm'
}

/**
 * Extract location using Gemini LLM via api_keys_pool (async, for Edge Functions)
 * Uses hybrid rotation: pool first → secrets fallback
 * Call this when cache + fuzzy both fail
 */
export async function extractLocationWithLLM(
  text: string,
  supabase: SupabaseClient
): Promise<LLMLocationResult | null> {
  if (!text || text.length < 10) {
    return null
  }
  
  const prompt = `Extract geographic location from this text. Return JSON only, no markdown.

Rules:
- Extract the most specific location mentioned (district, city, or country)
- If multiple locations, pick the most prominent one
- If no location found, return {"location": null}
- Confidence: "high" if explicitly named, "medium" if implied, "low" if uncertain

Format:
{
  "location": "district or city name",
  "parent": "city or country (parent region)",
  "full": "complete location string for search",
  "confidence": "high|medium|low"
}

Text: "${text.substring(0, 500)}"

JSON only:`

  try {
    // Use hybrid rotation: api_keys_pool → secrets fallback
    const result = await callGeminiHybrid(
      supabase,
      [{ role: 'user', content: prompt }],
      {
        model: 'gemini-2.0-flash',
        temperature: 0.1,
        maxTokens: 256
      }
    )
    
    if (!result.success || !result.content) {
      console.warn(`[LLM Location] Gemini error: ${result.error}`)
      return null
    }
    
    // Parse JSON response
    const cleanContent = result.content.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleanContent)
    
    if (!parsed.location) {
      return null
    }
    
    console.log(`[LLM Location] Extracted via ${result.source}: ${parsed.full}`)
    
    return {
      location: parsed.location,
      parent: parsed.parent || null,
      full: parsed.full || `${parsed.location}${parsed.parent ? ' ' + parsed.parent : ''}`,
      confidence: parsed.confidence || 'medium',
      source: 'llm'
    }
  } catch (error) {
    console.warn(`[LLM Location] Extraction failed: ${error}`)
    return null
  }
}

// ============================================================================
// COMBINED EXTRACTION FUNCTIONS
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
 * LAYER 1: Extract location using exact pattern matching (O(1) cache lookup)
 * Returns: { location: string, fullLocation: string } or null
 */
function extractLocationFromCache(text: string): { location: string; fullLocation: string; source: 'cache' } | null {
  const lowerText = text.toLowerCase()
  
  // Check each location in hierarchy
  for (const [subregion, parentContext] of Object.entries(LOCATION_HIERARCHY)) {
    // Match whole word only (with word boundaries)
    const pattern = new RegExp(`\\b${subregion}\\b`, 'i')
    if (pattern.test(lowerText)) {
      // Capitalize first letter
      const capitalizedLocation = subregion.charAt(0).toUpperCase() + subregion.slice(1)
      const fullLocation = parentContext 
        ? `${capitalizedLocation} ${parentContext}`
        : capitalizedLocation
      return { location: capitalizedLocation, fullLocation, source: 'cache' }
    }
  }
  
  return null
}

/**
 * LAYER 2: Extract location using fuzzy matching (typo tolerance)
 * Returns: { location: string, fullLocation: string } or null
 */
function extractLocationWithFuzzy(text: string): { location: string; fullLocation: string; source: 'fuzzy'; similarity: number } | null {
  const words = text.toLowerCase().split(/[\s,.\-_]+/).filter(w => w.length >= 4)
  
  for (const word of words) {
    const match = fuzzyMatchLocation(word, 0.75) // 75% similarity threshold
    if (match) {
      const parentContext = LOCATION_HIERARCHY[match.key]
      const capitalizedLocation = match.key.charAt(0).toUpperCase() + match.key.slice(1)
      const fullLocation = parentContext 
        ? `${capitalizedLocation} ${parentContext}`
        : capitalizedLocation
      
      console.log(`[Fuzzy Match] "${word}" → "${match.key}" (${(match.similarity * 100).toFixed(0)}% match)`)
      
      return { 
        location: capitalizedLocation, 
        fullLocation, 
        source: 'fuzzy',
        similarity: match.similarity
      }
    }
  }
  
  return null
}

/**
 * Combined location extraction pattern (SYNC - no LLM)
 * Layer 1: Cache → Layer 2: Fuzzy
 * Use this for frontend (sync) or when LLM is not available
 */
function extractLocationPattern(text: string): { location: string; fullLocation: string; source: 'cache' | 'fuzzy' } | null {
  // Layer 1: Exact cache lookup
  const cacheResult = extractLocationFromCache(text)
  if (cacheResult) {
    return cacheResult
  }
  
  // Layer 2: Fuzzy matching
  const fuzzyResult = extractLocationWithFuzzy(text)
  if (fuzzyResult) {
    return { location: fuzzyResult.location, fullLocation: fuzzyResult.fullLocation, source: 'fuzzy' }
  }
  
  return null
}

/**
 * Combined location extraction (ASYNC - with LLM fallback via api_keys_pool)
 * Layer 1: Cache → Layer 2: Fuzzy → Layer 3: LLM (Gemini via pool)
 * Use this for Edge Functions where we have Supabase client
 */
export async function extractLocationSmart(
  text: string,
  supabase?: SupabaseClient
): Promise<LLMLocationResult | null> {
  // Layer 1: Exact cache lookup
  const cacheResult = extractLocationFromCache(text)
  if (cacheResult) {
    return {
      location: cacheResult.location,
      parent: LOCATION_HIERARCHY[cacheResult.location.toLowerCase()] || null,
      full: cacheResult.fullLocation,
      confidence: 'high',
      source: 'cache'
    }
  }
  
  // Layer 2: Fuzzy matching
  const fuzzyResult = extractLocationWithFuzzy(text)
  if (fuzzyResult) {
    return {
      location: fuzzyResult.location,
      parent: LOCATION_HIERARCHY[fuzzyResult.location.toLowerCase()] || null,
      full: fuzzyResult.fullLocation,
      confidence: fuzzyResult.similarity > 0.9 ? 'high' : 'medium',
      source: 'fuzzy'
    }
  }
  
  // Layer 3: LLM extraction via api_keys_pool (if supabase provided)
  if (supabase) {
    console.log(`[Location Extraction] Cache + Fuzzy failed, trying LLM via pool...`)
    const llmResult = await extractLocationWithLLM(text, supabase)
    if (llmResult) {
      console.log(`[Location Extraction] LLM found: ${llmResult.full} (confidence: ${llmResult.confidence})`)
      return llmResult
    }
  }
  
  return null
}

/**
 * Extract context words (style/mood indicators)
 */
function extractContextWords(text: string): string[] {
  const lowerText = text.toLowerCase()
  const found: string[] = []
  
  for (const word of CONTEXT_PATTERNS) {
    if (lowerText.includes(word) && !found.includes(word)) {
      found.push(word)
    }
  }
  
  return found.slice(0, 3) // Max 3 context words
}

/**
 * Extract significant nouns
 */
function extractSignificantNouns(text: string): string[] {
  const lowerText = text.toLowerCase()
  const found: string[] = []
  
  for (const noun of NOUN_PATTERNS) {
    if (lowerText.includes(noun) && !found.includes(noun)) {
      found.push(noun)
    }
  }
  
  return found.slice(0, 2) // Max 2 nouns
}

// ============================================================================
// EXPORTED INTERFACES & FUNCTIONS
// ============================================================================

/**
 * Structured keyword extraction result
 */
export interface KeywordExtractionResult {
  venue: string | null           // Quoted venue name like 'Game Center'
  location: string | null        // Detected location like 'Akihabara'
  locationFull: string | null    // Full location with context like 'Akihabara Tokyo Japan'
  locationSource: 'cache' | 'fuzzy' | 'llm' | null  // Which layer found it
  context: string[]              // Style/mood words like ['retro', 'neon']
  nouns: string[]                // Significant nouns like ['arcade', 'cafe']
  fullKeywords: string           // Combined string for search
}

/**
 * Main extraction function - returns structured result (SYNC version)
 * Uses Cache + Fuzzy only (no LLM)
 * Suitable for frontend use
 */
export function extractKeywordsStructured(
  visualDirection: string,
  script: string
): KeywordExtractionResult {
  const combinedText = `${visualDirection} ${script}`
  
  // 1. Extract quoted venue names
  const quotedEntities = extractQuotedEntities(combinedText)
  const venue = quotedEntities.length > 0 ? quotedEntities[0] : null
  
  // 2. Extract location with cache + fuzzy (sync)
  const locationResult = extractLocationPattern(combinedText)
  const location = locationResult?.location || null
  const locationFull = locationResult?.fullLocation || null
  const locationSource = locationResult?.source || null
  
  // 3. Extract context/style words
  const context = extractContextWords(combinedText)
  
  // 4. Extract significant nouns
  const nouns = extractSignificantNouns(combinedText)
  
  // 5. Build combined keywords string
  const parts: string[] = []
  if (venue) parts.push(venue)
  if (locationFull) parts.push(locationFull)
  if (context.length > 0) parts.push(...context.slice(0, 2))
  if (parts.length < 3 && nouns.length > 0) {
    // Add nouns that aren't redundant
    for (const noun of nouns) {
      if (!parts.some(p => p.toLowerCase().includes(noun))) {
        parts.push(noun)
        break
      }
    }
  }
  
  const fullKeywords = [...new Set(parts)].slice(0, 5).join(' ')
  
  return { venue, location, locationFull, locationSource, context, nouns, fullKeywords }
}

/**
 * Main extraction function - returns structured result (ASYNC version with LLM)
 * Uses Cache + Fuzzy + LLM fallback via api_keys_pool
 * Suitable for Edge Functions
 */
export async function extractKeywordsStructuredAsync(
  visualDirection: string,
  script: string,
  supabase?: SupabaseClient
): Promise<KeywordExtractionResult> {
  const combinedText = `${visualDirection} ${script}`
  
  // 1. Extract quoted venue names
  const quotedEntities = extractQuotedEntities(combinedText)
  const venue = quotedEntities.length > 0 ? quotedEntities[0] : null
  
  // 2. Extract location with cache + fuzzy + LLM (async)
  const locationResult = await extractLocationSmart(combinedText, supabase)
  const location = locationResult?.location || null
  const locationFull = locationResult?.full || null
  const locationSource = locationResult?.source || null
  
  // 3. Extract context/style words
  const context = extractContextWords(combinedText)
  
  // 4. Extract significant nouns
  const nouns = extractSignificantNouns(combinedText)
  
  // 5. Build combined keywords string
  const parts: string[] = []
  if (venue) parts.push(venue)
  if (locationFull) parts.push(locationFull)
  if (context.length > 0) parts.push(...context.slice(0, 2))
  if (parts.length < 3 && nouns.length > 0) {
    for (const noun of nouns) {
      if (!parts.some(p => p.toLowerCase().includes(noun))) {
        parts.push(noun)
        break
      }
    }
  }
  
  const fullKeywords = [...new Set(parts)].slice(0, 5).join(' ')
  
  return { venue, location, locationFull, locationSource, context, nouns, fullKeywords }
}

/**
 * Simple string-based keyword extraction (SYNC)
 * Convenience wrapper for backward compatibility
 */
export function extractKeywords(visualDirection: string, script: string): string {
  const result = extractKeywordsStructured(visualDirection, script)
  return result.fullKeywords
}

/**
 * Simple string-based keyword extraction (ASYNC with LLM via pool)
 * For Edge Functions
 */
export async function extractKeywordsAsync(
  visualDirection: string, 
  script: string,
  supabase?: SupabaseClient
): Promise<string> {
  const result = await extractKeywordsStructuredAsync(visualDirection, script, supabase)
  return result.fullKeywords
}

/**
 * Get suggested keywords for Reference Image modal
 * Based on detected location and activity
 */
export function getSuggestedKeywords(visualDirection: string, script: string): string[] {
  const result = extractKeywordsStructured(visualDirection, script)
  const suggestions: string[] = []
  
  // Add location-based suggestions
  if (result.locationFull) {
    suggestions.push(result.locationFull)
  }
  
  // Add venue
  if (result.venue) {
    suggestions.push(result.venue)
  }
  
  // Add context words
  suggestions.push(...result.context)
  
  // Add nouns
  suggestions.push(...result.nouns)
  
  return [...new Set(suggestions)].slice(0, 6)
}

/**
 * Enhance visual prompt with extracted keywords (SYNC)
 * Use this in Edge Function to improve B-ROLL image prompts
 */
export function enhancePromptWithKeywords(
  visualDirection: string,
  script: string,
  basePrompt?: string
): string {
  const keywords = extractKeywordsStructured(visualDirection, script)
  
  // If base prompt provided, enhance it
  if (basePrompt && basePrompt.length > 50) {
    const enhancements: string[] = []
    
    // Add location context if not already present
    if (keywords.locationFull && !basePrompt.toLowerCase().includes(keywords.location?.toLowerCase() || '')) {
      enhancements.push(`Location: ${keywords.locationFull}`)
    }
    
    // Add venue if quoted and not in base prompt
    if (keywords.venue && !basePrompt.includes(keywords.venue)) {
      enhancements.push(`Setting: ${keywords.venue}`)
    }
    
    // Add atmosphere from context words
    if (keywords.context.length > 0) {
      const contextStr = keywords.context.join(', ')
      if (!basePrompt.toLowerCase().includes(contextStr.toLowerCase())) {
        enhancements.push(`Atmosphere: ${contextStr}`)
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

/**
 * Enhance visual prompt with extracted keywords (ASYNC with LLM via pool)
 * Use this in Edge Function for full extraction power
 */
export async function enhancePromptWithKeywordsAsync(
  visualDirection: string,
  script: string,
  basePrompt: string | undefined,
  supabase?: SupabaseClient
): Promise<string> {
  const keywords = await extractKeywordsStructuredAsync(visualDirection, script, supabase)
  
  // Log extraction source for debugging
  if (keywords.locationSource) {
    console.log(`[enhancePromptAsync] Location "${keywords.location}" found via ${keywords.locationSource}`)
  }
  
  // If base prompt provided, enhance it
  if (basePrompt && basePrompt.length > 50) {
    const enhancements: string[] = []
    
    // Add location context if not already present
    if (keywords.locationFull && !basePrompt.toLowerCase().includes(keywords.location?.toLowerCase() || '')) {
      enhancements.push(`Location: ${keywords.locationFull}`)
    }
    
    // Add venue if quoted and not in base prompt
    if (keywords.venue && !basePrompt.includes(keywords.venue)) {
      enhancements.push(`Setting: ${keywords.venue}`)
    }
    
    // Add atmosphere from context words
    if (keywords.context.length > 0) {
      const contextStr = keywords.context.join(', ')
      if (!basePrompt.toLowerCase().includes(contextStr.toLowerCase())) {
        enhancements.push(`Atmosphere: ${contextStr}`)
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
// UTILITY EXPORTS FOR TESTING
// ============================================================================

export const _internal = {
  levenshteinDistance,
  similarityRatio,
  fuzzyMatchLocation,
  extractLocationFromCache,
  extractLocationWithFuzzy,
  extractQuotedEntities,
  extractContextWords,
  extractSignificantNouns
}
