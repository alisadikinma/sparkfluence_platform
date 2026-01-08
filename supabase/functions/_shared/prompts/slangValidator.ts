/**
 * SLANG VALIDATOR - 2026
 * Helper functions for validating and scoring slang usage in scripts
 */

import { SLANG_DICTIONARY } from './viralScriptKnowledge.ts';

// ============================================================================
// SLANG TERM DATABASES
// ============================================================================

const CURRENT_SLANG: Record<string, string[]> = {
  indonesian: [
    'stecu', 'rizz', 'delulu', 'slay', 'red flag', 'cringe', 'healing',
    'burnout', 'fomo', 'toxic', 'flex', 'glow up', 'ghosting', 'spill',
    'vibes', 'bucin', 'no cap', "it's giving", 'sus', 'brain rot'
  ],
  hindi: [
    'bohot hard', 'jugaad', 'scene', 'jhakaas', 'mast', 'fadu',
    'bindaas', 'chill maar', 'bakwas', 'ghanta', 'kaand', 'kya baat hai',
    'solid', 'kadak', 'pataka', 'scene tight hai', 'fattu', 'faaltu',
    'waat lag gayi', 'gyaan dena'
  ],
  english: [
    'slay', 'rizz', 'fire', 'ate', 'cooked', 'lock in', 'delulu',
    'hits different', 'let them cook', 'mid', 'sus', 'bet', 'vibe check',
    'npc', 'ick', 'touch grass', "it's giving", 'periodt', 'caught in 4k'
  ]
};

const OUTDATED_SLANG: Record<string, string[]> = {
  indonesian: ['alay', 'lebay', 'woles', 'kids jaman now', 'LOL', 'ciyus', 'miapah'],
  hindi: ['swag', 'fully tight', 'tension not', 'tapori style'],
  english: ['on fleek', 'YOLO', 'yeet', 'lit', 'squad goals', 'bae', 'gucci', 'i cant even']
};

const ESSENTIAL_PARTICLES: Record<string, string[]> = {
  indonesian: ['sih', 'tuh', 'gitu', 'dong', 'deh', 'nih', 'kan', 'banget', 'parah', 'bet'],
  hindi: ['yaar', 'na', 'hai na', 'matlab', 'achcha', 'arre', 'toh', 'bas', 'bhai'],
  english: ['like', 'literally', 'basically', 'honestly', 'actually', 'so', 'i mean']
};

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract current slang terms from text
 */
export function extractSlangTerms(text: string, language: string): string[] {
  const terms = CURRENT_SLANG[language] || [];
  return terms.filter(term => new RegExp(`\\b${term}\\b`, 'i').test(text));
}

/**
 * Detect outdated slang terms
 */
export function detectOutdatedSlang(text: string, language: string): string[] {
  const terms = OUTDATED_SLANG[language] || [];
  return terms.filter(term => new RegExp(`\\b${term}\\b`, 'i').test(text));
}

/**
 * Extract filler words/particles
 */
export function extractParticles(text: string, language: string): string[] {
  const particles = ESSENTIAL_PARTICLES[language] || [];
  return particles.filter(particle => new RegExp(`\\b${particle}\\b`, 'i').test(text));
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface SlangValidationResult {
  current_slang: string[];
  outdated_slang: string[];
  particles: string[];
  score: number;
  warnings: string[];
  suggestions: string[];
}

/**
 * Comprehensive slang validation
 */
export function validateSlangUsage(
  text: string,
  language: string
): SlangValidationResult {
  const currentSlang = extractSlangTerms(text, language);
  const outdatedSlang = detectOutdatedSlang(text, language);
  const particles = extractParticles(text, language);
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // ========================================
  // 1. Current Slang Check (need ≥2)
  // ========================================
  if (currentSlang.length < 2) {
    warnings.push(`Only ${currentSlang.length}/2 current slang terms (need ≥2)`);
    suggestions.push('Add more 2026 trending slang from Top 20 list');
    score -= 20;
  } else if (currentSlang.length >= 2) {
    score += 10; // Bonus for good usage
  }

  // ========================================
  // 2. Outdated Slang Check (should be 0)
  // ========================================
  if (outdatedSlang.length > 0) {
    warnings.push(`Contains ${outdatedSlang.length} outdated terms: ${outdatedSlang.join(', ')}`);
    suggestions.push('Replace with current 2026 alternatives');
    score -= (outdatedSlang.length * 25); // Heavy penalty
  }

  // ========================================
  // 3. Language-Specific Checks
  // ========================================
  
  if (language === 'indonesian') {
    // Check for formal pronouns
    const formalPronouns = text.match(/\b(saya|kamu|anda)\b/gi);
    if (formalPronouns && formalPronouns.length > 0) {
      warnings.push(`Using formal pronouns (${formalPronouns.join(', ')}) - sounds corporate`);
      suggestions.push('Change to casual pronouns: gue/lo');
      score -= 15;
    }

    // Check particles (need ≥2)
    if (particles.length < 2) {
      warnings.push(`Only ${particles.length}/2 Indonesian particles - sounds unnatural`);
      suggestions.push('Add more particles: sih, tuh, gitu, dong');
      score -= 10;
    }
  }

  if (language === 'hindi') {
    // Check for excessive formal language
    const excessiveAap = text.match(/\bआप\b/gi);
    if (excessiveAap && excessiveAap.length > 2) {
      warnings.push('Too much formal "आप" - use "तुम" for youth content');
      suggestions.push('Replace with casual "tum" pronoun');
      score -= 10;
    }

    // Check fillers (need ≥2)
    if (particles.length < 2) {
      warnings.push(`Only ${particles.length}/2 Hindi fillers - sounds robotic`);
      suggestions.push('Add more fillers: yaar, na, matlab, arre');
      score -= 10;
    }
  }

  if (language === 'english') {
    // Check for regional slang (US-only, UK-only)
    const regionalSlang = ['no cap', 'lowkey', 'highkey', 'finna', 'innit', 'bare', 'bruv', 'peng'];
    const foundRegional = regionalSlang.filter(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(text)
    );
    
    if (foundRegional.length > 0) {
      warnings.push(`Contains regional slang: ${foundRegional.join(', ')} - may confuse international audience`);
      suggestions.push('Use universal English slang terms instead');
      score -= 10;
    }
  }

  // ========================================
  // 4. Emoji Check (outdated emoji usage)
  // ========================================
  if (/😂/.test(text)) {
    warnings.push('Using 😂 emoji (seen as outdated by Gen-Z)');
    suggestions.push('Use 💀 or 😭 instead for laughing');
    score -= 5;
  }

  return {
    current_slang: currentSlang,
    outdated_slang: outdatedSlang,
    particles: particles,
    score: Math.max(0, Math.min(100, score)),
    warnings,
    suggestions
  };
}

/**
 * Get slang knowledge for specific language
 */
export function getSlangKnowledge(language: string): string {
  return SLANG_DICTIONARY[language as keyof typeof SLANG_DICTIONARY] || SLANG_DICTIONARY.english;
}

/**
 * Quick slang score (0-100)
 */
export function getSlangScore(text: string, language: string): number {
  const validation = validateSlangUsage(text, language);
  return validation.score;
}
