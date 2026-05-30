/**
 * Entity Check & Fix - Simple regex-based detection + one-shot LLM fix
 * 
 * Flow:
 * 1. checkIncompleteEntities() - Regex scan (instant, no LLM)
 * 2. fixIncompleteEntities() - One LLM call (only if issues found)
 * 
 * @example
 * Input:  "Gue baru dapet M4 Pro dan Galaxy S24"
 * Output: "Gue baru dapet POCO M4 Pro dan Samsung Galaxy S24"
 */

// ============================================================
// PATTERNS & BRANDS
// ============================================================

/**
 * Patterns yang likely incomplete (butuh brand prefix)
 * Format: [regex, expectedBrand]
 * 
 * Note: Pattern lebih specific di atas, lebih generic di bawah
 * untuk avoid false positives
 */
const INCOMPLETE_PATTERNS: Array<[RegExp, string]> = [
  // ═══════════════════════════════════════════════════════════
  // POCO patterns (M/X/F/C series)
  // ═══════════════════════════════════════════════════════════
  [/\b(M[4-9]\s*Pro\s*5G)\b/gi, 'POCO'],
  [/\b(M[4-9]\s*Pro)\b/gi, 'POCO'],
  [/\b(M[4-9])\b/gi, 'POCO'],
  [/\b(X[4-9]\s*Pro\s*5G)\b/gi, 'POCO'],
  [/\b(X[4-9]\s*Pro)\b/gi, 'POCO'],
  [/\b(X[4-9])\b/gi, 'POCO'],
  [/\b(F[4-9]\s*Pro)\b/gi, 'POCO'],
  [/\b(F[4-9])\b/gi, 'POCO'],
  [/\b(C[56]\d)\b/gi, 'POCO'],  // C55, C65, etc
  
  // ═══════════════════════════════════════════════════════════
  // Samsung patterns (Galaxy tanpa Samsung prefix)
  // ═══════════════════════════════════════════════════════════
  [/\b(Galaxy\s+S\d+\s*Ultra)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+S\d+\s*(?:Plus|\+))\b/gi, 'Samsung'],
  [/\b(Galaxy\s+S\d+\s*FE)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+S\d+)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+A\d+[sS]?)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+M\d+)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+Z\s*Fold\s*\d+)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+Z\s*Flip\s*\d+)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+Tab\s+\S+)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+Buds\s*\S*)\b/gi, 'Samsung'],
  [/\b(Galaxy\s+Watch\s*\d*)\b/gi, 'Samsung'],
  
  // ═══════════════════════════════════════════════════════════
  // Xiaomi patterns (Redmi series)
  // ═══════════════════════════════════════════════════════════
  [/\b(Redmi\s+Note\s+\d+\s*Pro\s*(?:Plus|\+|Max)?)\b/gi, 'Xiaomi'],
  [/\b(Redmi\s+Note\s+\d+\s*[SsPp]?)\b/gi, 'Xiaomi'],
  [/\b(Redmi\s+Note\s+\d+)\b/gi, 'Xiaomi'],
  [/\b(Redmi\s+K\d+\s*(?:Pro)?)\b/gi, 'Xiaomi'],
  [/\b(Redmi\s+\d+[A-Za-z]?)\b/gi, 'Xiaomi'],
  [/\b(Redmi\s+Pad\s*\S*)\b/gi, 'Xiaomi'],
  [/\b(Redmi\s+Buds\s*\d*\S*)\b/gi, 'Xiaomi'],
  
  // ═══════════════════════════════════════════════════════════
  // OPPO patterns (Reno, Find series)
  // ═══════════════════════════════════════════════════════════
  [/\b(Reno\s*\d+\s*Pro\s*(?:Plus|\+)?)\b/gi, 'OPPO'],
  [/\b(Reno\s*\d+)\b/gi, 'OPPO'],
  [/\b(Find\s+X\d+\s*(?:Pro|Ultra)?)\b/gi, 'OPPO'],
  [/\b(Find\s+N\d+\s*(?:Flip|Fold)?)\b/gi, 'OPPO'],
  [/\b(A\d{2}[sxkSXK]?)\b/gi, 'OPPO'],  // A98, A79, etc - careful with this one
  
  // ═══════════════════════════════════════════════════════════
  // OnePlus patterns (Nord, numbered)
  // ═══════════════════════════════════════════════════════════
  [/\b(Nord\s+CE\s*\d+\s*(?:Lite)?)\b/gi, 'OnePlus'],
  [/\b(Nord\s+\d+)\b/gi, 'OnePlus'],
  [/\b(Nord\s+N\d+)\b/gi, 'OnePlus'],
  
  // ═══════════════════════════════════════════════════════════
  // ASUS patterns (ROG, Zenfone)
  // ═══════════════════════════════════════════════════════════
  [/\b(ROG\s+Phone\s*\d+\s*(?:Pro|Ultimate)?)\b/gi, 'ASUS'],
  [/\b(ROG\s+Phone\s*\d+)\b/gi, 'ASUS'],
  [/\b(Zenfone\s*\d+\s*(?:Flip)?)\b/gi, 'ASUS'],
  
  // ═══════════════════════════════════════════════════════════
  // Google patterns (Pixel)
  // ═══════════════════════════════════════════════════════════
  [/\b(Pixel\s+\d+\s*Pro\s*XL)\b/gi, 'Google'],
  [/\b(Pixel\s+\d+\s*Pro)\b/gi, 'Google'],
  [/\b(Pixel\s+\d+a?)\b/gi, 'Google'],
  [/\b(Pixel\s+Fold)\b/gi, 'Google'],
  [/\b(Pixel\s+Buds\s*\S*)\b/gi, 'Google'],
  [/\b(Pixel\s+Watch\s*\d*)\b/gi, 'Google'],
  
  // ═══════════════════════════════════════════════════════════
  // Realme patterns (GT, Narzo, numbered)
  // ═══════════════════════════════════════════════════════════
  [/\b(GT\s+\d+\s*(?:Pro|Neo)?)\b/gi, 'Realme'],
  [/\b(GT\s+Neo\s*\d+)\b/gi, 'Realme'],
  [/\b(Narzo\s+\d+\s*(?:Pro|[Aa])?)\b/gi, 'Realme'],
  
  // ═══════════════════════════════════════════════════════════
  // Vivo patterns (V, X, Y, T series)
  // ═══════════════════════════════════════════════════════════
  [/\b(V\d{2}\s*(?:Pro|[eSs])?)\b/gi, 'Vivo'],  // V30, V29 Pro, V30e
  [/\b(X\d{2,3}\s*(?:Pro|Ultra)?)\b/gi, 'Vivo'],  // X100 Pro
  [/\b(Y\d{2}[sSt]?)\b/gi, 'Vivo'],  // Y36, Y27s
  [/\b(T\d\s*(?:Pro|[Xx])?)\b/gi, 'Vivo'],  // T3, T3 Pro
  
  // ═══════════════════════════════════════════════════════════
  // Nothing patterns
  // ═══════════════════════════════════════════════════════════
  [/\b(Phone\s*\(?[12]\)?)\b/gi, 'Nothing'],
  [/\b(Phone\s+[12]a?)\b/gi, 'Nothing'],
  [/\b(Ear\s*\(?[12]\)?)\b/gi, 'Nothing'],
  
  // ═══════════════════════════════════════════════════════════
  // Sony patterns (Xperia)
  // ═══════════════════════════════════════════════════════════
  [/\b(Xperia\s+[15]\s*[IViv]+)\b/gi, 'Sony'],
  [/\b(Xperia\s+10\s*[IViv]+)\b/gi, 'Sony'],
  [/\b(Xperia\s+Pro-I)\b/gi, 'Sony'],
  
  // ═══════════════════════════════════════════════════════════
  // Motorola patterns (Edge, Moto G, Razr)
  // ═══════════════════════════════════════════════════════════
  [/\b(Edge\s+\d+\s*(?:Pro|Ultra|Neo)?)\b/gi, 'Motorola'],
  [/\b(Moto\s+G\d+\s*(?:Power|Play|Plus|Stylus)?)\b/gi, 'Motorola'],
  [/\b(Razr\s*(?:Plus|\+|\d+)?)\b/gi, 'Motorola'],
  
  // ═══════════════════════════════════════════════════════════
  // Honor patterns
  // ═══════════════════════════════════════════════════════════
  [/\b(Magic\s*[VvSs]?\d*\s*(?:Pro|Ultimate|Lite)?)\b/gi, 'Honor'],
  [/\b(Honor\s+\d+\s*(?:Pro|Lite)?)\b/gi, 'Honor'],  // This needs prefix check
  
  // ═══════════════════════════════════════════════════════════
  // Infinix patterns
  // ═══════════════════════════════════════════════════════════
  [/\b(Note\s+\d+\s*(?:Pro|[Ss])?)\b/gi, 'Infinix'],  // Careful - overlaps with Redmi Note
  [/\b(Hot\s+\d+\s*(?:Pro|[iIsS])?)\b/gi, 'Infinix'],
  [/\b(Zero\s+\d+\s*(?:Pro|Ultra)?)\b/gi, 'Infinix'],
  [/\b(GT\s+\d+\s*Pro)\b/gi, 'Infinix'],  // Infinix GT 10 Pro - overlaps with Realme
  
  // ═══════════════════════════════════════════════════════════
  // Tecno patterns
  // ═══════════════════════════════════════════════════════════
  [/\b(Spark\s+\d+\s*(?:Pro|Go|[Cc])?)\b/gi, 'Tecno'],
  [/\b(Camon\s+\d+\s*(?:Pro|Premier)?)\b/gi, 'Tecno'],
  [/\b(Phantom\s+[VvXx]?\d*\s*(?:Pro|Fold|Ultimate)?)\b/gi, 'Tecno'],
  [/\b(Pova\s+\d+\s*(?:Pro|[Xx])?)\b/gi, 'Tecno'],
]

/**
 * Brand prefixes untuk check apakah sudah ada
 */
const BRAND_PREFIXES = [
  'poco', 'samsung', 'xiaomi', 'apple', 'oppo', 'vivo',
  'oneplus', 'google', 'asus', 'sony', 'motorola', 'realme',
  'nothing', 'honor', 'infinix', 'tecno', 'huawei', 'nokia',
  'iphone', 'ipad', 'macbook', 'airpods',  // Apple implicit
  'mi ',  // Xiaomi Mi series
]

// ============================================================
// TYPES
// ============================================================

export interface EntityCheckResult {
  hasIssues: boolean
  issues: EntityIssue[]
}

export interface EntityIssue {
  found: string         // "M4 Pro"
  expectedBrand: string // "POCO"
  position: number      // Character position in script
}

export interface ProcessResult {
  script: string
  wasFixed: boolean
  issuesFound: number
  issuesFixed: string[]
}

// ============================================================
// CHECK FUNCTION (Regex only - instant)
// ============================================================

/**
 * Check script for incomplete product names
 * Pure regex - no LLM call, instant response
 */
export function checkIncompleteEntities(script: string): EntityCheckResult {
  const issues: EntityIssue[] = []
  const foundSet = new Set<string>()  // Dedupe by position
  
  for (const [pattern, expectedBrand] of INCOMPLETE_PATTERNS) {
    // Reset regex state (important for global patterns)
    pattern.lastIndex = 0
    
    let match: RegExpExecArray | null
    while ((match = pattern.exec(script)) !== null) {
      const found = match[1]
      const position = match.index
      
      // Skip if already found at this position
      const key = `${position}`
      if (foundSet.has(key)) continue
      
      // Check if brand prefix exists before the match (within 20 chars)
      const beforeStart = Math.max(0, position - 20)
      const beforeText = script.substring(beforeStart, position).toLowerCase()
      
      const hasBrandPrefix = BRAND_PREFIXES.some(brand => 
        beforeText.includes(brand.toLowerCase())
      )
      
      if (!hasBrandPrefix) {
        foundSet.add(key)
        issues.push({ found: found.trim(), expectedBrand, position })
      }
    }
  }
  
  // Sort by position for consistent output
  issues.sort((a, b) => a.position - b.position)
  
  // Dedupe by found text (keep first occurrence)
  const uniqueIssues: EntityIssue[] = []
  const seenText = new Set<string>()
  for (const issue of issues) {
    const normalizedText = issue.found.toLowerCase().replace(/\s+/g, ' ')
    if (!seenText.has(normalizedText)) {
      seenText.add(normalizedText)
      uniqueIssues.push(issue)
    }
  }
  
  return {
    hasIssues: uniqueIssues.length > 0,
    issues: uniqueIssues
  }
}

// ============================================================
// FIX FUNCTION (One LLM call)
// ============================================================

/**
 * Fix incomplete entities with ONE LLM call
 * Only called if checkIncompleteEntities found issues
 */
export async function fixIncompleteEntities(
  script: string,
  issues: EntityIssue[],
  callLLM: (prompt: string) => Promise<string>
): Promise<string> {
  
  if (issues.length === 0) return script
  
  // Build fix instructions
  const fixList = issues.map(i => 
    `- "${i.found}" → "${i.expectedBrand} ${i.found}"`
  ).join('\n')
  
  const prompt = `Perbaiki nama produk yang kurang lengkap di script ini.

YANG PERLU DIPERBAIKI:
${fixList}

SCRIPT:
---
${script}
---

INSTRUKSI:
1. Tambahkan brand prefix yang benar ke setiap produk yang kurang lengkap
2. Jangan ubah apapun selain menambahkan brand prefix
3. Pertahankan semua formatting, emoji, struktur segment, dan JSON structure

OUTPUT: Script yang sudah diperbaiki saja, tanpa penjelasan atau markdown.`

  try {
    const fixed = await callLLM(prompt)
    
    // Clean up response (remove markdown if present)
    let cleanFixed = fixed.trim()
    if (cleanFixed.startsWith('```')) {
      cleanFixed = cleanFixed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    
    return cleanFixed
  } catch (e) {
    console.error('[EntityFix] LLM fix failed:', e)
    // Fallback: simple string replace
    return simpleReplace(script, issues)
  }
}

/**
 * Fallback: Simple string replacement (if LLM fails)
 * Less accurate but better than nothing
 */
function simpleReplace(script: string, issues: EntityIssue[]): string {
  let result = script
  
  // Sort by position descending to avoid offset issues when replacing
  const sortedIssues = [...issues].sort((a, b) => b.position - a.position)
  
  for (const issue of sortedIssues) {
    // Create regex that matches the exact text (case-insensitive)
    const escapedFound = issue.found.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escapedFound}\\b`, 'gi')
    
    // Replace all occurrences that don't have brand prefix
    result = result.replace(pattern, (match, offset) => {
      // Check if already has brand prefix
      const beforeStart = Math.max(0, offset - 20)
      const beforeText = result.substring(beforeStart, offset).toLowerCase()
      
      const hasBrandPrefix = BRAND_PREFIXES.some(brand => 
        beforeText.includes(brand.toLowerCase())
      )
      
      if (hasBrandPrefix) {
        return match  // Don't replace
      }
      
      return `${issue.expectedBrand} ${match}`
    })
  }
  
  return result
}

// ============================================================
// MAIN EXPORT: Check & Fix Combined
// ============================================================

/**
 * Main function: Check and fix script in one call
 * 
 * @param script - The generated script (can be raw text or JSON string)
 * @param callLLM - LLM function to call for fixing (only if issues found)
 * @returns ProcessResult with fixed script and metadata
 * 
 * @example
 * const result = await checkAndFixEntities(script, callGemini)
 * if (result.wasFixed) {
 *   console.log('Fixed:', result.issuesFixed)
 * }
 */
export async function checkAndFixEntities(
  script: string,
  callLLM: (prompt: string) => Promise<string>
): Promise<ProcessResult> {
  
  // Step 1: Check (instant, regex only)
  const check = checkIncompleteEntities(script)
  
  if (!check.hasIssues) {
    return {
      script,
      wasFixed: false,
      issuesFound: 0,
      issuesFixed: []
    }
  }
  
  // Step 2: Fix (1 LLM call)
  console.log(`[EntityCheck] Found ${check.issues.length} incomplete entities:`, 
    check.issues.map(i => `"${i.found}" → ${i.expectedBrand}`))
  
  const fixedScript = await fixIncompleteEntities(script, check.issues, callLLM)
  
  // Verify fix worked
  const verifyCheck = checkIncompleteEntities(fixedScript)
  const actuallyFixed = check.issues.length - verifyCheck.issues.length
  
  if (verifyCheck.hasIssues) {
    console.warn(`[EntityCheck] ${verifyCheck.issues.length} issues remain after fix`)
  }
  
  return {
    script: fixedScript,
    wasFixed: true,
    issuesFound: check.issues.length,
    issuesFixed: check.issues.map(i => `${i.found} → ${i.expectedBrand} ${i.found}`)
  }
}
