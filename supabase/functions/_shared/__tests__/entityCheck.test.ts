/**
 * Unit tests for entityCheck.ts
 * 
 * Run with:
 *   deno test --allow-read supabase/functions/_shared/__tests__/entityCheck.test.ts
 */

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { 
  checkIncompleteEntities, 
  checkAndFixEntities,
  type EntityCheckResult 
} from '../entityCheck.ts'

// ============================================================
// CHECK FUNCTION TESTS
// ============================================================

Deno.test('checkIncompleteEntities - detects M4 Pro without POCO', () => {
  const script = 'Gue baru dapet M4 Pro dan ini reviewnya!'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues.length, 1)
  assertEquals(result.issues[0].found, 'M4 Pro')
  assertEquals(result.issues[0].expectedBrand, 'POCO')
})

Deno.test('checkIncompleteEntities - ignores complete POCO M4 Pro', () => {
  const script = 'POCO M4 Pro adalah HP terbaik di kelasnya!'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, false)
  assertEquals(result.issues.length, 0)
})

Deno.test('checkIncompleteEntities - detects Galaxy without Samsung', () => {
  const script = 'Galaxy S24 Ultra kameranya gila sih bro'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].found, 'Galaxy S24 Ultra')
  assertEquals(result.issues[0].expectedBrand, 'Samsung')
})

Deno.test('checkIncompleteEntities - ignores Samsung Galaxy S24', () => {
  const script = 'Samsung Galaxy S24 Ultra adalah flagship terbaik!'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, false)
})

Deno.test('checkIncompleteEntities - detects Redmi Note without Xiaomi', () => {
  const script = 'Redmi Note 13 Pro harganya cuma 3 jutaan'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].expectedBrand, 'Xiaomi')
})

Deno.test('checkIncompleteEntities - ignores Xiaomi Redmi Note', () => {
  const script = 'Xiaomi Redmi Note 13 Pro sangat recommended'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, false)
})

Deno.test('checkIncompleteEntities - detects multiple incomplete entities', () => {
  const script = `
    Hari ini gue mau compare M4 Pro vs Galaxy S24.
    Kalau Redmi Note 13 gimana?
    ROG Phone 8 juga bagus sih.
  `
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues.length, 4)
  
  const brands = result.issues.map(i => i.expectedBrand)
  assertStringIncludes(brands.join(','), 'POCO')
  assertStringIncludes(brands.join(','), 'Samsung')
  assertStringIncludes(brands.join(','), 'Xiaomi')
  assertStringIncludes(brands.join(','), 'ASUS')
})

Deno.test('checkIncompleteEntities - no issues in non-tech script', () => {
  const script = 'Tips skincare: cuci muka 2x sehari, pakai sunscreen, dan jangan lupa moisturizer!'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, false)
  assertEquals(result.issues.length, 0)
})

Deno.test('checkIncompleteEntities - detects Reno without OPPO', () => {
  const script = 'Reno 12 Pro kameranya bagus banget'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].expectedBrand, 'OPPO')
})

Deno.test('checkIncompleteEntities - detects Nord without OnePlus', () => {
  const script = 'Nord 4 adalah HP mid-range terbaik'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].expectedBrand, 'OnePlus')
})

Deno.test('checkIncompleteEntities - detects Pixel without Google', () => {
  const script = 'Pixel 9 Pro punya AI features terbaik'
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].expectedBrand, 'Google')
})

Deno.test('checkIncompleteEntities - handles case variations', () => {
  const script1 = 'm4 pro bagus'
  const script2 = 'M4 PRO bagus'
  const script3 = 'M4 Pro bagus'
  
  assertEquals(checkIncompleteEntities(script1).hasIssues, true)
  assertEquals(checkIncompleteEntities(script2).hasIssues, true)
  assertEquals(checkIncompleteEntities(script3).hasIssues, true)
})

Deno.test('checkIncompleteEntities - handles JSON script format', () => {
  const script = `{
    "segments": [
      {
        "segment_id": "VIDEO-001",
        "type": "HOOK",
        "script_text": "Lo wajib tau tentang M4 Pro ini!"
      }
    ]
  }`
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].found, 'M4 Pro')
})

Deno.test('checkIncompleteEntities - mixed complete and incomplete', () => {
  const script = `
    POCO M4 Pro bagus banget.
    Tapi M4 Pro ini juga ada kekurangannya.
    Samsung Galaxy S24 juga recommended.
    Kalau Galaxy Z Fold 6 gimana?
  `
  const result = checkIncompleteEntities(script)
  
  // Should only detect incomplete ones
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues.length, 2)  // M4 Pro (second one) and Galaxy Z Fold 6
})

// ============================================================
// CHECK AND FIX TESTS
// ============================================================

Deno.test('checkAndFixEntities - fixes incomplete entities', async () => {
  const script = 'Review M4 Pro hari ini!'
  
  // Mock LLM that returns fixed version
  const mockCallLLM = async (prompt: string): Promise<string> => {
    return 'Review POCO M4 Pro hari ini!'
  }
  
  const result = await checkAndFixEntities(script, mockCallLLM)
  
  assertEquals(result.wasFixed, true)
  assertEquals(result.issuesFound, 1)
  assertStringIncludes(result.script, 'POCO M4 Pro')
})

Deno.test('checkAndFixEntities - skips fix if no issues', async () => {
  const script = 'POCO M4 Pro adalah HP terbaik!'
  
  // Mock LLM should not be called
  const mockCallLLM = async (_prompt: string): Promise<string> => {
    throw new Error('LLM should not be called when no issues')
  }
  
  const result = await checkAndFixEntities(script, mockCallLLM)
  
  assertEquals(result.wasFixed, false)
  assertEquals(result.issuesFound, 0)
  assertEquals(result.script, script)
})

Deno.test('checkAndFixEntities - handles multiple fixes', async () => {
  const script = 'M4 Pro vs Galaxy S24, mana yang lebih worth?'
  
  // Mock LLM
  const mockCallLLM = async (_prompt: string): Promise<string> => {
    return 'POCO M4 Pro vs Samsung Galaxy S24, mana yang lebih worth?'
  }
  
  const result = await checkAndFixEntities(script, mockCallLLM)
  
  assertEquals(result.wasFixed, true)
  assertEquals(result.issuesFound, 2)
  assertStringIncludes(result.script, 'POCO M4 Pro')
  assertStringIncludes(result.script, 'Samsung Galaxy S24')
})

Deno.test('checkAndFixEntities - handles LLM failure gracefully', async () => {
  const script = 'Review M4 Pro hari ini!'
  
  // Mock LLM that fails
  const mockCallLLM = async (_prompt: string): Promise<string> => {
    throw new Error('LLM API error')
  }
  
  const result = await checkAndFixEntities(script, mockCallLLM)
  
  // Should use fallback simple replace
  assertEquals(result.wasFixed, true)
  assertStringIncludes(result.script, 'POCO')
})

Deno.test('checkAndFixEntities - returns fix metadata', async () => {
  const script = 'M4 Pro bagus, Reno 12 juga oke'
  
  const mockCallLLM = async (_prompt: string): Promise<string> => {
    return 'POCO M4 Pro bagus, OPPO Reno 12 juga oke'
  }
  
  const result = await checkAndFixEntities(script, mockCallLLM)
  
  assertEquals(result.issuesFixed.length, 2)
  assertStringIncludes(result.issuesFixed[0], 'M4 Pro')
  assertStringIncludes(result.issuesFixed[0], 'POCO')
})

// ============================================================
// EDGE CASES
// ============================================================

Deno.test('checkIncompleteEntities - handles empty script', () => {
  const result = checkIncompleteEntities('')
  assertEquals(result.hasIssues, false)
})

Deno.test('checkIncompleteEntities - handles script with only numbers', () => {
  const script = 'Harga 3 juta, diskon 50%, total 1.5 juta'
  const result = checkIncompleteEntities(script)
  assertEquals(result.hasIssues, false)
})

Deno.test('checkIncompleteEntities - detects in visual_direction field', () => {
  const script = `"visual_direction": "Close-up shot of M4 Pro displaying home screen"`
  const result = checkIncompleteEntities(script)
  
  assertEquals(result.hasIssues, true)
  assertEquals(result.issues[0].found, 'M4 Pro')
})

Deno.test('checkIncompleteEntities - handles brand with different casing', () => {
  // All these should NOT be flagged
  const scripts = [
    'POCO M4 Pro bagus',
    'poco M4 Pro bagus',
    'Poco M4 Pro bagus',
  ]
  
  for (const script of scripts) {
    const result = checkIncompleteEntities(script)
    assertEquals(result.hasIssues, false, `Failed for: ${script}`)
  }
})

console.log('All entityCheck tests passed!')
