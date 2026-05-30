/**
 * SLANG VALIDATOR - 2026
 * Helper functions for validating and scoring slang usage in scripts
 */

import INDONESIAN_SLANG_RAW from '../knowledge/08-indonesian-slang-2026.ts'
import HINDI_SLANG_RAW from '../knowledge/09-hindi-slang-2026.ts'
import ENGLISH_SLANG_RAW from '../knowledge/10-global-english-slang-2026.ts'

const SLANG_DICTIONARY = {
  indonesian: INDONESIAN_SLANG_RAW,
  hindi: HINDI_SLANG_RAW,
  english: ENGLISH_SLANG_RAW
};

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
    // Devanagari + Romanized for detection
    'बहोत hard', 'bohot hard', 'जुगाड़', 'jugaad', 'सीन', 'scene', 'झकास', 'jhakaas',
    'मस्त', 'mast', 'फाडू', 'fadu', 'बिंदास', 'bindaas', 'बकवास', 'bakwas',
    'घंटा', 'ghanta', 'कांड', 'kaand', 'क्या बात है', 'kya baat hai',
    'सॉलिड', 'solid', 'कड़क', 'kadak', 'पटाका', 'pataka'
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
  hindi: [
    // Devanagari + Romanized
    'यार', 'yaar', 'ना', 'na', 'है ना', 'hai na', 'मतलब', 'matlab',
    'अच्छा', 'achcha', 'अरे', 'arre', 'तो', 'toh', 'बस', 'bas', 'भाई', 'bhai'
  ],
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
    // Check for excessive formal language (Devanagari + romanized)
    const excessiveAap = text.match(/(आप|\baap\b)/gi);
    if (excessiveAap && excessiveAap.length > 2) {
      warnings.push('Too much formal "आप" - use "तुम" for youth content');
      suggestions.push('Replace with casual "तुम" pronoun');
      score -= 10;
    }
    
    // Check if script is using Devanagari (should have at least some Hindi characters)
    const devanagariChars = text.match(/[\u0900-\u097F]/g);
    if (!devanagariChars || devanagariChars.length < 10) {
      warnings.push('Hindi script should use Devanagari (हिंदी) characters, not romanized');
      suggestions.push('Write Hindi words in Devanagari script: यार, मैं, तुम, क्या, etc.');
      score -= 30; // Heavy penalty for not using Devanagari
    }

    // Check fillers (need ≥2)
    if (particles.length < 2) {
      warnings.push(`Only ${particles.length}/2 Hindi fillers - sounds robotic`);
      suggestions.push('Add more fillers: यार, ना, मतलब, अरे');
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
