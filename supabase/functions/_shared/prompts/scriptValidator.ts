/**
 * SCRIPT VALIDATOR - P0 #2
 * Validates script output and auto-fixes common issues
 * 
 * Checks:
 * 1. ≥2 virality factors present
 * 2. Visual direction ≥50 words
 * 3. Foreshadow has urgency phrase
 * 4. Shot types correct (HOOK/CTA = CREATOR)
 * 5. Slang usage (via slangValidator)
 * 
 * Created: 2026-01-13
 */

import { validateSlangUsage, SlangValidationResult } from './slangValidator.ts';
import { detectContentType } from './contentTypeDetector.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationIssue {
  segment_id: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  auto_fixed: boolean;
  fix_applied?: string;
}

export interface ScriptValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  virality_check: ViralityCheckResult;
  slang_check?: SlangValidationResult;
  auto_fixes_applied: number;
  segments: any[]; // Fixed segments
}

export interface ViralityCheckResult {
  factors_found: string[];
  factors_count: number;
  passed: boolean; // ≥2 required
  suggestions: string[];
}

// ============================================================================
// VIRALITY FACTOR DETECTION
// ============================================================================

const VIRALITY_PATTERNS: Record<string, RegExp[]> = {
  'Pro/Contra (Debate)': [
    /unpopular\s+opinion/i,
    /kontroversial/i,
    /sebenarnya/i,
    /yang\s+salah/i,
    /setuju\s+atau/i,
    /agree\s+or\s+disagree/i,
    /controversial/i,
  ],
  'Relatability': [
    /pernah\s+(nggak|gak|ga)\s+sih/i,
    /is\s+it\s+just\s+me/i,
    /pov[:\s]/i,
    /siapa\s+yang\s+relate/i,
    /gue\s+juga\s+(pernah|dulu)/i,
    /we\s+all/i,
    /everyone\s+does/i,
  ],
  'Celebrity/Authority': [
    /\b(elon|musk|jeff|bezos|zuckerberg|gates|trump|biden|jokowi|prabowo)\b/i,
    /ceo\s+of/i,
    /founder/i,
    /expert/i,
    /dokter|doctor/i,
    /professor/i,
    /millionaire|billionaire/i,
  ],
  'Trending/Current': [
    /viral/i,
    /trending/i,
    /hari\s+ini/i,
    /today/i,
    /baru\s+(saja|aja)/i,
    /just\s+(happened|dropped)/i,
    /breaking/i,
    /2026|2025/i,
  ],
  'Emotion (Strong)': [
    /😭|😱|🔥|💀|😤/,
    /gila\s+(banget|bet)?/i,
    /insane/i,
    /shocking/i,
    /amazing/i,
    /heartbreaking/i,
    /sedih\s+banget/i,
    /bikin\s+(nangis|emosi|marah)/i,
  ],
  'Shock Value': [
    /\d+%\s+(orang|people)/i,
    /ternyata/i,
    /turns\s+out/i,
    /rahasia/i,
    /secret/i,
    /nggak\s+(nyangka|percaya)/i,
    /you\s+won'?t\s+believe/i,
    /mind[\s-]?blow/i,
  ],
  'Comedy/Humor': [
    /wkwk|haha|lmao|lol/i,
    /lucu/i,
    /funny/i,
    /ngakak/i,
    /😂|🤣/,
    /comedy/i,
    /jokes?/i,
  ],
};

/**
 * Check virality factors in script text
 */
export function checkViralityFactors(fullScriptText: string): ViralityCheckResult {
  const factorsFound: string[] = [];
  const suggestions: string[] = [];

  for (const [factor, patterns] of Object.entries(VIRALITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fullScriptText)) {
        if (!factorsFound.includes(factor)) {
          factorsFound.push(factor);
        }
        break;
      }
    }
  }

  const passed = factorsFound.length >= 2;

  if (!passed) {
    if (factorsFound.length === 0) {
      suggestions.push('Add shock value: Include surprising statistic or fact');
      suggestions.push('Add relatability: Use "Pernah nggak sih lo..." or "POV:"');
    } else if (factorsFound.length === 1) {
      const missing = Object.keys(VIRALITY_PATTERNS).filter(f => !factorsFound.includes(f));
      suggestions.push(`Consider adding: ${missing.slice(0, 2).join(' or ')}`);
    }
  }

  return {
    factors_found: factorsFound,
    factors_count: factorsFound.length,
    passed,
    suggestions,
  };
}

// ============================================================================
// VISUAL DIRECTION VALIDATION
// ============================================================================

/**
 * Count words in text (handles multiple languages)
 */
function countWords(text: string): number {
  if (!text) return 0;
  // Split by whitespace and filter empty strings
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Enhance visual direction if too short
 */
function enhanceVisualDirection(
  segment: any,
  language: string
): string {
  const current = segment.visual_direction || '';
  const currentWords = countWords(current);
  
  if (currentWords >= 50) return current;

  const isCreator = segment.shot_type?.toUpperCase() === 'CREATOR';
  const emotion = segment.emotion || 'Curiosity';
  
  // Enhancement templates
  const creatorEnhancements: Record<string, string> = {
    Curiosity: 'Expression shows genuine curiosity with raised eyebrows and slight head tilt. Eyes bright and engaged, looking directly at camera. Subtle forward lean suggesting shared secret. Background slightly blurred, focus on face.',
    Shock: 'Wide-eyed expression with raised eyebrows and slightly open mouth. Frozen moment of realization. Hands may be raised in surprise gesture. High contrast lighting emphasizing dramatic reaction.',
    Intrigue: 'Knowing smirk with one eyebrow slightly raised. Steady confident gaze at camera. Composed posture suggesting insider knowledge. Warm lighting creating trustworthy atmosphere.',
    Awe: 'Bright eyes with genuine smile forming. Relaxed facial muscles showing authentic amazement. Open body language welcoming viewer into the discovery. Soft golden lighting.',
    Tension: 'Furrowed brow with intense fixed gaze. Tight jaw suggesting seriousness. Rigid shoulders and controlled breathing. Dramatic side lighting creating shadows.',
    Resolution: 'Relaxed confident smile with steady eye contact. Open palm gesture suggesting sharing. Squared shoulders conveying authority. Balanced warm lighting.',
    Urgency: 'Intense direct gaze with forward lean. Animated hand gestures emphasizing points. Quick energy in posture. Bright even lighting for clarity.',
  };

  const brollEnhancements: Record<string, string> = {
    default: 'Cinematic composition with strong visual hierarchy. Main subject positioned using rule of thirds. Soft depth of field separating foreground from background. Natural or dramatic lighting matching scene mood. Subtle motion or activity within frame.',
    tech: 'Clean modern aesthetic with glowing screens or interfaces. Shallow depth of field on key elements. Cool blue-tinted lighting suggesting technology. Data visualizations or code visible in background.',
    food: 'Appetizing hero shot with steam or freshness indicators. Warm golden lighting enhancing colors. Complementary props and garnishes. Shallow depth isolating main dish.',
    nature: 'Sweeping landscape or intimate nature detail. Golden hour or dramatic weather lighting. Leading lines drawing eye to focal point. Sense of scale or grandeur.',
    product: 'Premium product photography aesthetic. Clean background with subtle reflections. Rim lighting creating separation. Rotating or revealing motion.',
  };

  let enhancement = '';
  
  if (isCreator) {
    enhancement = creatorEnhancements[emotion] || creatorEnhancements.Curiosity;
  } else {
    // Try to detect b-roll category from existing content
    const text = current.toLowerCase();
    if (text.includes('tech') || text.includes('code') || text.includes('screen') || text.includes('ai')) {
      enhancement = brollEnhancements.tech;
    } else if (text.includes('food') || text.includes('cook') || text.includes('dish') || text.includes('masak')) {
      enhancement = brollEnhancements.food;
    } else if (text.includes('nature') || text.includes('outdoor') || text.includes('landscape')) {
      enhancement = brollEnhancements.nature;
    } else if (text.includes('product') || text.includes('item') || text.includes('box')) {
      enhancement = brollEnhancements.product;
    } else {
      enhancement = brollEnhancements.default;
    }
  }

  // Combine original with enhancement
  const enhanced = current ? `${current} ${enhancement}` : enhancement;
  return enhanced.trim();
}

// ============================================================================
// FORESHADOW VALIDATION
// ============================================================================

const FORESHADOW_URGENCY_PATTERNS: Record<string, RegExp[]> = {
  indonesian: [
    /sampai\s+(habis|akhir)/i,
    /stay\s+sampai/i,
    /tonton\s+sampai/i,
    /jangan\s+(skip|lewat)/i,
  ],
  hindi: [
    /end\s+tak\s+dekho/i,
    /last\s+tak/i,
    /puri\s+video/i,
    /skip\s+mat/i,
  ],
  english: [
    /watch\s+(until|till)\s+(the\s+)?end/i,
    /stay\s+(until|till)/i,
    /don'?t\s+skip/i,
    /wait\s+for\s+(the\s+)?end/i,
  ],
};

const URGENCY_PHRASES: Record<string, string[]> = {
  indonesian: [
    'Tonton sampai habis!',
    'Stay sampai akhir!',
    'Jangan skip, yang terakhir paling gila!',
  ],
  hindi: [
    'End tak dekho!',
    'Last tak ruko!',
    'Skip mat karna!',
  ],
  english: [
    'Watch until the end!',
    'Stay till the end!',
    'Don\'t skip—the last one is insane!',
  ],
};

/**
 * Check if foreshadow has urgency phrase
 */
function hasForeshadowUrgency(text: string, language: string): boolean {
  const patterns = FORESHADOW_URGENCY_PATTERNS[language] || FORESHADOW_URGENCY_PATTERNS.english;
  return patterns.some(p => p.test(text));
}

/**
 * Add urgency phrase to foreshadow
 */
function addForeshadowUrgency(text: string, language: string): string {
  const phrases = URGENCY_PHRASES[language] || URGENCY_PHRASES.english;
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  return `${text} ${phrase}`;
}

// ============================================================================
// SHOT TYPE VALIDATION
// ============================================================================

const CREATOR_SEGMENT_TYPES = ['HOOK', 'CTA', 'LOOP-END', 'ENDING', 'ENDING_CTA'];
const BROLL_SEGMENT_TYPES = ['FORE', 'FORESHADOW', 'BODY', 'PEAK', 'TWIST'];

/**
 * Determine correct shot type based on segment type
 */
function getCorrectShotType(segmentType: string): 'CREATOR' | 'B-ROLL' {
  const upper = segmentType?.toUpperCase() || '';
  
  // Check if it's a CREATOR segment
  if (CREATOR_SEGMENT_TYPES.some(t => upper === t || upper.startsWith(t))) {
    return 'CREATOR';
  }
  
  // Check if it's a B-ROLL segment
  if (BROLL_SEGMENT_TYPES.some(t => upper === t || upper.startsWith(t))) {
    return 'B-ROLL';
  }
  
  // Default: BODY-X segments are B-ROLL
  if (upper.startsWith('BODY')) {
    return 'B-ROLL';
  }
  
  return 'B-ROLL'; // Safe default
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate and auto-fix script segments
 */
export function validateAndFixScript(
  segments: any[],
  topic: string,
  language: string = 'indonesian'
): ScriptValidationResult {
  const issues: ValidationIssue[] = [];
  let autoFixesApplied = 0;
  let score = 100;

  // Clone segments for modification
  const fixedSegments = JSON.parse(JSON.stringify(segments));

  // ========================================
  // 1. VIRALITY CHECK
  // ========================================
  const fullScriptText = segments
    .map(s => s.script_text || '')
    .join(' ');
  
  const viralityCheck = checkViralityFactors(fullScriptText);
  
  if (!viralityCheck.passed) {
    issues.push({
      segment_id: 'GLOBAL',
      field: 'virality_factors',
      severity: 'warning',
      message: `Only ${viralityCheck.factors_count}/2 virality factors found. Need ≥2 for viral potential.`,
      auto_fixed: false,
    });
    score -= 15;
  }

  // ========================================
  // 2. PER-SEGMENT VALIDATION
  // ========================================
  for (let i = 0; i < fixedSegments.length; i++) {
    const segment = fixedSegments[i];
    const segmentId = segment.segment_id || `VIDEO-${String(i + 1).padStart(3, '0')}`;
    const segmentType = segment.type?.toUpperCase() || '';

    // ----- 2a. Shot Type Check -----
    const correctShotType = getCorrectShotType(segmentType);
    const currentShotType = segment.shot_type?.toUpperCase();
    
    if (currentShotType !== correctShotType) {
      issues.push({
        segment_id: segmentId,
        field: 'shot_type',
        severity: 'error',
        message: `${segmentType} should be ${correctShotType}, got ${currentShotType || 'undefined'}`,
        auto_fixed: true,
        fix_applied: `Changed to ${correctShotType}`,
      });
      segment.shot_type = correctShotType;
      autoFixesApplied++;
    }

    // ----- 2b. Visual Direction Length -----
    const visualWords = countWords(segment.visual_direction);
    if (visualWords < 50) {
      const enhanced = enhanceVisualDirection(segment, language);
      issues.push({
        segment_id: segmentId,
        field: 'visual_direction',
        severity: 'warning',
        message: `Visual direction only ${visualWords} words (need ≥50)`,
        auto_fixed: true,
        fix_applied: `Enhanced from ${visualWords} to ${countWords(enhanced)} words`,
      });
      segment.visual_direction = enhanced;
      autoFixesApplied++;
      score -= 5;
    }

    // ----- 2c. Foreshadow Urgency Check -----
    if (segmentType === 'FORE' || segmentType === 'FORESHADOW') {
      const scriptText = segment.script_text || '';
      if (!hasForeshadowUrgency(scriptText, language)) {
        const fixed = addForeshadowUrgency(scriptText, language);
        issues.push({
          segment_id: segmentId,
          field: 'script_text',
          severity: 'warning',
          message: 'Foreshadow missing urgency phrase (sampai habis/watch till end)',
          auto_fixed: true,
          fix_applied: 'Added urgency phrase',
        });
        segment.script_text = fixed;
        autoFixesApplied++;
        score -= 5;
      }
    }

    // ----- 2d. Missing Required Fields -----
    if (!segment.emotion) {
      segment.emotion = i === 0 ? 'Curiosity' : 'Intrigue';
      issues.push({
        segment_id: segmentId,
        field: 'emotion',
        severity: 'warning',
        message: 'Missing emotion label',
        auto_fixed: true,
        fix_applied: `Set to ${segment.emotion}`,
      });
      autoFixesApplied++;
    }

    if (!segment.transition) {
      segment.transition = 'Cut';
      issues.push({
        segment_id: segmentId,
        field: 'transition',
        severity: 'warning',
        message: 'Missing transition',
        auto_fixed: true,
        fix_applied: 'Set to Cut',
      });
      autoFixesApplied++;
    }
  }

  // ========================================
  // 3. SLANG VALIDATION
  // ========================================
  const slangCheck = validateSlangUsage(fullScriptText, language);
  
  if (slangCheck.score < 70) {
    issues.push({
      segment_id: 'GLOBAL',
      field: 'slang_usage',
      severity: 'warning',
      message: `Slang score ${slangCheck.score}/100. ${slangCheck.warnings.join('; ')}`,
      auto_fixed: false,
    });
    score -= (100 - slangCheck.score) / 5; // Proportional penalty
  }

  // ========================================
  // 4. CONTENT COVERAGE (for listicles)
  // ========================================
  const detection = detectContentType(topic, language);
  if (detection.primary_type === 'listicle' && detection.item_count) {
    const bodySegments = fixedSegments.filter((s: any) => 
      s.type?.toUpperCase().startsWith('BODY') || 
      s.type?.toUpperCase() === 'PEAK'
    );
    
    if (bodySegments.length < detection.item_count) {
      issues.push({
        segment_id: 'GLOBAL',
        field: 'content_coverage',
        severity: 'error',
        message: `Topic mentions ${detection.item_count} items but only ${bodySegments.length} content segments. Missing items!`,
        auto_fixed: false,
      });
      score -= 20;
    }
  }

  // ========================================
  // 5. CALCULATE FINAL SCORE
  // ========================================
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const valid = finalScore >= 70 && !issues.some(i => i.severity === 'error' && !i.auto_fixed);

  return {
    valid,
    score: finalScore,
    issues,
    virality_check: viralityCheck,
    slang_check: slangCheck,
    auto_fixes_applied: autoFixesApplied,
    segments: fixedSegments,
  };
}

/**
 * Quick validation score without fixes
 */
export function getQuickValidationScore(
  segments: any[],
  topic: string,
  language: string = 'indonesian'
): number {
  const result = validateAndFixScript(segments, topic, language);
  return result.score;
}
