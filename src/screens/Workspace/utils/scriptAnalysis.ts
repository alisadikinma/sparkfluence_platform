/**
 * Shared script analysis utilities
 *
 * Used by: SmartCompanion (OverviewTab, IssuesTab)
 * Exports: analyzeSegment, generateQuickFixes, extractFeatures, types, labels
 */

import {
  scoreSegment,
  SCORING_RULES,
  hasQuestion,
  hasNumber,
  hasNegativeFrame,
  hasForeshadow,
  hasCtaAction,
  hasFirstPersonCta,
  detectPowerWords,
  type SegmentType,
} from '../../../lib/knowledge/12-scoring-engine';
import {
  analyzeEmotion,
  type EmotionType,
} from '../../../lib/knowledge/13-emotion-lexicon';

// ============================================================================
// CROSS-SEGMENT FEATURE CLASSIFICATION
// ============================================================================

/**
 * Features whose scores depend on OTHER segments (hook text, all-segment context).
 * These features still contribute to the virality SCORE but do NOT generate
 * issue cards in the Issues tab — because changing hook style would cause
 * downstream segment issues to appear/disappear, making the tab feel unstable.
 */
export const CROSS_SEGMENT_FEATURES = new Set([
  'builds_on_hook',
  'matches_hook_category',
  'emotional_match',
  'mirrors_hook_energy',
  'payoff_not_revealed',
  'matches_funnel_stage',
]);

// ============================================================================
// FILLER WORDS (for smart condensing)
// ============================================================================

/** Language-specific filler/hedge words safe to strip when condensing */
const FILLER_WORDS: Record<string, Set<string>> = {
  id: new Set(['ini', 'itu', 'tuh', 'sih', 'gitu', 'dong', 'deh', 'lho', 'kan', 'nih', 'ya', 'literally']),
  en: new Set(['literally', 'basically', 'actually', 'really', 'just', 'very', 'quite']),
  hi: new Set(['literally', 'basically', 'actually', 'matlab', 'bilkul']),
};

// ============================================================================
// TYPES
// ============================================================================

export interface SegmentInput {
  id: string;
  segmentType: string;
  script: string;
  durationSeconds: number;
  maxWords: number;
  emotion: string;
  isEnabled?: boolean;
}

export interface CoachAnalysis {
  segmentType: string;
  score: number;
  strengths: Array<{ key: string; label: string; points: number }>;
  weaknesses: Array<{ key: string; label: string; weight: number; tip: string; isStable: boolean }>;
  powerWords: string[];
  emotionDominant: EmotionType;
  emotionIntensity: number;
  flags: string[];
}

export interface QuickFix {
  id: string;
  weaknessKey?: string;
  label: string;
  preview: string;
  field: 'script' | 'visualDirection';
}

// ============================================================================
// FEATURE LABELS & TIPS
// ============================================================================

export const FEATURE_LABELS: Record<string, string> = {
  has_question: 'Question hook',
  has_number: 'Number/statistic',
  has_power_word: 'Power word',
  has_negative_frame: 'Negative framing',
  word_density_optimal: 'Word density',
  under_word_limit: 'Under word limit',
  has_pattern_interrupt: 'Pattern interrupt',
  matches_hook_category: 'Hook category match',
  payoff_not_revealed: 'Curiosity gap maintained',
  has_foreshadow: 'Foreshadow/open loop',
  has_transition: 'Smooth transition',
  builds_on_hook: 'Builds on hook',
  has_specific_detail: 'Specific detail',
  has_transition_word: 'Transition word',
  has_value_delivery: 'Value delivery',
  has_emotional_climax: 'Emotional climax',
  has_unexpected_twist: 'Unexpected twist',
  has_specific_proof: 'Specific proof',
  emotional_intensity_high: 'Emotional intensity',
  has_clear_action: 'Clear CTA action',
  first_person: 'First-person CTA',
  single_focus: 'Single focus',
  has_urgency_word: 'Urgency word',
  matches_funnel_stage: 'Funnel stage match',
  mirrors_hook_energy: 'Mirrors hook energy',
  has_callback: 'Callback to hook',
  emotional_match: 'Emotion match w/ hook',
};

export const FEATURE_TIPS: Record<string, string> = {
  has_question: 'Add a question to spark curiosity (+23% shares)',
  has_number: 'Include a number or stat (+36% CTR)',
  has_power_word: 'Use emotional/urgency words (+2.3% CTR per word)',
  has_negative_frame: 'Try negative framing like "stop" or "jangan" (+63% CTR)',
  word_density_optimal: 'Aim for 70-90% word density for natural pacing',
  under_word_limit: 'Reduce word count to stay within the time limit',
  has_pattern_interrupt: 'Add a surprise element to reset attention (+17pp retention)',
  payoff_not_revealed: 'Don\'t reveal tool/product names in HOOK — tease with quantity ("3 AI tools") instead',
  has_foreshadow: 'Add "tunggu..." or "but first..." to create open loops',
  has_transition: 'Smooth the transition from the previous segment',
  builds_on_hook: 'Connect back to what the hook promised',
  has_specific_detail: 'Replace vague claims with specific numbers/examples',
  has_transition_word: 'Add "tapi", "nah", or "but" to signal new info',
  has_value_delivery: 'Deliver concrete value — teach something actionable',
  has_emotional_climax: 'Make this the most emotionally intense moment',
  has_unexpected_twist: 'Add a surprising reveal for replay value',
  has_specific_proof: 'Add social proof or authority data',
  emotional_intensity_high: 'Use more intense emotional language',
  has_clear_action: 'Add an explicit action verb (follow, save, click)',
  first_person: 'Use first-person framing ("Get my...") for +90% CTR',
  single_focus: 'Keep to ONE action — multiple CTAs = -73% clicks',
  has_urgency_word: 'Add genuine urgency (sekarang, limited, today)',
  matches_funnel_stage: 'Match CTA to viewer awareness stage',
  mirrors_hook_energy: 'Match energy level to hook for seamless loop',
  has_callback: 'Reference something from the hook ("remember...")',
  emotional_match: 'Match emotion tone to hook (within ±0.2 intensity)',
};

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/** Extract content word set for cross-segment comparison */
function contentWords(text: string): Set<string> {
  const stops = new Set([
    'a','an','the','is','are','was','were','be','been','being','in','on','at','to','for',
    'of','with','by','from','and','or','but','not','no','so','if','than','that','this',
    'it','its','i','me','my','we','our','you','your','he','she','they','them','their',
    'yang','di','ke','dari','dan','atau','ini','itu','gue','lo','sih','tuh','gitu',
    'ka','ki','ko','hai','ye','wo','is','ke','se','ne','aur','ya','par','mein',
  ]);
  return new Set(
    text.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stops.has(w))
  );
}

export function extractFeatures(
  text: string,
  wordCount: number,
  maxWords: number,
  language: string,
  hookSegment?: SegmentInput | null,
  allSegments?: SegmentInput[],
  segmentIndex?: number,
): Record<string, boolean | number> {
  const density = maxWords > 0 ? wordCount / maxWords : 0;
  const optimalDensity =
    density >= 0.6 && density <= 0.95
      ? 1
      : density > 0.95
        ? Math.max(0, 1 - (density - 0.95) * 3.3)
        : density / 0.6;

  // Cross-segment: emotion analysis for current + hook
  const currentEmotion = analyzeEmotion(text, language);
  const hookEmotion = hookSegment ? analyzeEmotion(hookSegment.script, language) : null;

  // builds_on_hook: keyword overlap between current text and hook
  let buildsOnHook = 0.6; // raised default — most content naturally relates to its hook
  if (hookSegment && hookSegment.script) {
    const hookWords = contentWords(hookSegment.script);
    const currentWordSet = contentWords(text);
    if (hookWords.size > 0) {
      let overlap = 0;
      for (const w of currentWordSet) {
        if (hookWords.has(w)) overlap++;
      }
      // Lowered threshold: 2 keyword matches = full score (was 3)
      buildsOnHook = Math.min(1, overlap / Math.max(1, Math.min(hookWords.size, 2)));
      // Floor at 0.6 if there's any overlap at all (thematic connection)
      if (overlap > 0 && buildsOnHook < 0.6) buildsOnHook = 0.6;
    }
  }

  // has_transition: check for transition words/phrases at start of text
  const transitionStart = /^(tapi|nah|but|however|terus|lalu|nah\s+sekarang|so|meanwhile|ok\s+jadi|next|then|now|sekarang|kedua|ketiga|pertama|लेकिन|फिर|अब)\b/i.test(text.trim());
  const hasTransitionWord = /\b(tapi|nah|but|however|terus|dan|lalu|next|then|so|meanwhile|pertama|kedua|ketiga|selanjutnya|terakhir|first|second|third|finally|लेकिन|फिर)\b/i.test(text);

  // has_specific_detail: numbers, percentages, proper nouns, concrete nouns, techniques
  const hasSpecificDetail = hasNumber(text) || /\d+%|\d+[kmKM]\b|\$\d/.test(text)
    ? 1
    : /\b[A-Z][a-z]{2,}\b/.test(text) ? 0.8  // proper noun (brand, name, tool)
    : /\b(strategi|teknik|metode|formula|framework|system|prinsip|aturan|konsep|taktik|strategy|technique|method|principle|rule|concept|pattern|approach)\b/i.test(text) ? 0.65  // concrete noun / technique name
    : 0.45;

  // has_value_delivery: instructional/actionable language + explanatory patterns
  const valuePatterns = /\b(cara|step|langkah|try|use|pakai|download|click|buka|search|cari|create|bikin|buat|ciptain|ciptakan|gunakan|pasang|aktifin|setup|daftar|edit|upload|install|tambahin|setting|atur|make|get|dapet|learn|pelajari|tip|trick|तरीका|करो|बनाओ|सीखो|इस्तेमाल)\b/i;
  const explanatoryPatterns = /\b(karena|jadi|artinya|yang bikin|makanya|soalnya|because|so that|which means|the reason|that's why|इसलिए|क्योंकि|मतलब)\b/i;
  const examplePatterns = /\b(contoh|example|misalnya|kayak|seperti|like when|for instance|jadinya|hasilnya|result|misal|sebut aja)\b/i;
  const hasValueDelivery = valuePatterns.test(text) ? 1
    : explanatoryPatterns.test(text) ? 0.8
    : examplePatterns.test(text) ? 0.75
    : hasNumber(text) ? 0.7
    : 0.4;

  // has_emotional_climax: compare intensity vs average of all segments
  // Also check for explicit climax indicators (ALL CAPS, exclamation clusters, superlatives)
  let emotionalClimax = currentEmotion.intensity;
  const hasClimaxIndicator = /[A-Z]{3,}/.test(text) || /!{1,}/.test(text) ||
    /\b(paling|paling\s+\w+|paling\s+gila|terbesar|terbaik|terparah|tergila|most|biggest|best|worst|greatest|insane|GILA|GOKIL|AMAZING|INCREDIBLE|dahsyat|brutal|epic|game\s*changer|next\s*level)\b/i.test(text);
  if (allSegments && allSegments.length > 1) {
    const avgIntensity = allSegments.reduce((sum, s) => {
      return sum + analyzeEmotion(s.script, language).intensity;
    }, 0) / allSegments.length;
    if (currentEmotion.intensity > avgIntensity + 0.05) {
      emotionalClimax = 1;
    } else if (currentEmotion.intensity > avgIntensity || hasClimaxIndicator) {
      emotionalClimax = 0.8;
    } else if (hasClimaxIndicator) {
      emotionalClimax = 0.6;
    } else {
      emotionalClimax = 0.35;
    }
  } else if (hasClimaxIndicator) {
    emotionalClimax = Math.max(emotionalClimax, 0.8);
  }

  // has_unexpected_twist: contrast/reveal words and reveal phrases
  const twistPatterns = /\b(tapi\s+ternyata|ternyata|actually|turns?\s+out|plot\s+twist|surprise|gak\s+nyangka|unexpected|wait|padahal|ini\s+dia|dan\s+ini|the\s+thing\s+is|here's\s+the|mind\s+blown|this\s+changes|yang\s+bikin\s+beda|kuncinya|rahasianya|the\s+kicker|the\s+catch|लेकिन\s+असल|सच\s+में|असल\s+में)\b/i;
  const hasUnexpectedTwist = twistPatterns.test(text) ? 1 : 0;

  // has_specific_proof: social proof patterns (numbers + people/users/views)
  const proofPatterns = /\d+\s*(orang|people|users?|views?|followers?|subscribers?|juta|ribu|million|k\b|%)/i;
  const hasSpecificProof = proofPatterns.test(text) ? 1 : hasNumber(text) ? 0.5 : 0;

  // emotional_intensity_high: lexicon analysis + power word boost
  const powerWordBoost = detectPowerWords(text, language).length * 0.15;
  const boostedIntensity = Math.min(1, currentEmotion.intensity + powerWordBoost);
  const emotionalIntensityHigh = boostedIntensity >= 0.5 ? 1 : boostedIntensity >= 0.35 ? 0.7 : boostedIntensity >= 0.25 ? 0.5 : 0.3;

  // single_focus: count imperative verbs / action items (more = less focused)
  const actionVerbs = text.match(/\b(follow|save|click|share|comment|subscribe|like|download|buy|join|tap|swipe|ikutin|simpan|klik|beli)\b/gi) || [];
  const singleFocus = actionVerbs.length <= 1 ? 1 : actionVerbs.length === 2 ? 0.5 : 0;

  // mirrors_hook_energy: compare emotion intensity of current vs hook (for LOOP-END)
  let mirrorsHookEnergy = 0.6; // raised default
  if (hookEmotion) {
    const intensityDiff = Math.abs(currentEmotion.intensity - hookEmotion.intensity);
    mirrorsHookEnergy = intensityDiff <= 0.2 ? 1 : intensityDiff <= 0.35 ? 0.65 : 0.3;
  }

  // has_callback: references to earlier content ("remember", "tadi", "yang gue bilang")
  const callbackPatterns = /\b(remember|ingat|tadi|earlier|yang\s+gue\s+(bilang|sebut)|like\s+i\s+said|told\s+you|recall|याद)\b/i;
  const hasCallback = callbackPatterns.test(text) ? 1 : 0;

  // emotional_match: emotion similarity between current segment and hook
  let emotionalMatch = 0.6; // raised default — related content shares emotional tone
  if (hookEmotion) {
    const sameEmotion = currentEmotion.dominant === hookEmotion.dominant;
    const intensityDiff = Math.abs(currentEmotion.intensity - hookEmotion.intensity);
    emotionalMatch = sameEmotion ? (intensityDiff <= 0.25 ? 1 : 0.75) : intensityDiff <= 0.2 ? 0.6 : 0.35;
  }

  // payoff_not_revealed: check if HOOK reveals content words from BODY/PEAK segments
  // A good HOOK teases ("3 AI tools") without naming them ("Jasper, CapCut, Pionex")
  let payoffNotRevealed = 1; // default: no payoff revealed (good)
  if (allSegments && allSegments.length > 1) {
    // Get the HOOK segment to check
    const hookSeg = allSegments.find(s => s.segmentType === 'HOOK');
    // Only evaluate this feature for the HOOK segment itself
    if (hookSeg && hookSeg.id === (allSegments[segmentIndex ?? -1]?.id)) {
      const hookWords = contentWords(hookSeg.script);
      // Collect content words from BODY + PEAK segments (these contain the "payoff")
      const bodyPeakWords = new Set<string>();
      for (const s of allSegments) {
        if (s.segmentType?.startsWith('BODY') || s.segmentType === 'PEAK') {
          for (const w of contentWords(s.script)) {
            bodyPeakWords.add(w);
          }
        }
      }
      // Find proper nouns / brand names in HOOK that also appear in BODY/PEAK
      // These are likely tool/product names being revealed prematurely
      const hookText = hookSeg.script || '';
      const properNouns = hookText.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
      const revealedNouns = properNouns.filter(noun => {
        const lower = noun.toLowerCase();
        return bodyPeakWords.has(lower) && hookWords.has(lower);
      });
      // Also check for comma-separated lists of items (pattern: "X, Y, sama/dan/and Z")
      const listPattern = /\b(\w+),\s*(\w+),?\s*(?:sama|dan|and|aur|or)\s+(\w+)/i;
      const hasList = listPattern.test(hookText);
      if (revealedNouns.length >= 2 || (revealedNouns.length >= 1 && hasList)) {
        payoffNotRevealed = 0; // Bad: reveals multiple tool/product names
      } else if (revealedNouns.length === 1) {
        payoffNotRevealed = 0.5; // Warning: reveals one name
      }
    }
  }

  // matches_hook_category: basic heuristic based on hook type patterns
  let matchesHookCategory = 0.6; // raised default — most hooks naturally align with content
  if (hookSegment) {
    const hookHasQuestion = hasQuestion(hookSegment.script);
    const hookHasNumber = hasNumber(hookSegment.script);
    const hookHasNegative = hasNegativeFrame(hookSegment.script);
    if (hookHasQuestion && (hasNumber(text) || hasValueDelivery > 0.5)) matchesHookCategory = 1;
    else if (hookHasNumber && hasNumber(text)) matchesHookCategory = 0.85;
    else if (hookHasNegative && hasNegativeFrame(text)) matchesHookCategory = 0.7;
    else matchesHookCategory = 0.55;
  }

  // matches_funnel_stage: basic heuristic
  const matchesFunnelStage = hasCtaAction(text) ? 1.0 : hasValueDelivery > 0.5 ? 0.8 : 0.5;

  return {
    has_question: hasQuestion(text),
    has_number: hasNumber(text),
    has_power_word: detectPowerWords(text, language).length > 0,
    has_negative_frame: hasNegativeFrame(text),
    word_density_optimal: optimalDensity,
    under_word_limit: wordCount <= maxWords,
    has_pattern_interrupt: /[A-Z]{2,}/.test(text) || /!\s*[A-Z]/.test(text) || /!/.test(text) || /\b(STOP|WAIT|HEY|SERIUS|RUKO|YO)\b/.test(text) || hasForeshadow(text) || /\b(tapi tunggu|nah ini|dan yang bikin|here's the|but wait|but here|yang bikin kaget|plot twist|ternyata|lo bakal|gue kasih tau|ini yang|coba bayangin|imagine|listen|dengerin|check this|the crazy part|serius nih|ini penting|perhatiin|liat nih|tau gak|eh|oi|bro|guys)\b/i.test(text) || /\b(lo|gue|kamu|bro|guys|sis|you)\b.*\b(harus|wajib|perlu|mesti|must|need)\b/i.test(text),
    has_foreshadow: hasForeshadow(text),
    has_transition: transitionStart ? 1 : hasTransitionWord ? 0.5 : 0,
    builds_on_hook: buildsOnHook,
    has_specific_detail: hasSpecificDetail,
    has_transition_word: hasTransitionWord,
    has_value_delivery: hasValueDelivery,
    has_emotional_climax: emotionalClimax,
    has_unexpected_twist: hasUnexpectedTwist,
    has_specific_proof: hasSpecificProof,
    emotional_intensity_high: emotionalIntensityHigh,
    has_clear_action: hasCtaAction(text),
    first_person: hasFirstPersonCta(text),
    single_focus: singleFocus,
    has_urgency_word: /\b(sekarang|now|segera|today|limited|hurry|अभी|जल्दी)\b/i.test(text),
    matches_funnel_stage: matchesFunnelStage,
    payoff_not_revealed: payoffNotRevealed,
    matches_hook_category: matchesHookCategory,
    mirrors_hook_energy: mirrorsHookEnergy,
    has_callback: hasCallback,
    emotional_match: emotionalMatch,
  };
}

// ============================================================================
// ANALYSIS
// ============================================================================

export function analyzeSegment(
  segment: SegmentInput,
  language: string,
  allSegments?: SegmentInput[],
): CoachAnalysis {
  const segType = segment.segmentType || 'BODY';
  const st = segType.startsWith('BODY') ? 'BODY' : segType as SegmentType;
  const words = (segment.script || '').trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const enabledSegments = allSegments?.filter(s => s.isEnabled !== false);
  const hookSegment = enabledSegments?.find(s => s.segmentType === 'HOOK') ?? null;
  const segmentIndex = enabledSegments?.findIndex(s => s.id === segment.id) ?? -1;
  const features = extractFeatures(segment.script, wordCount, segment.maxWords, language, hookSegment, enabledSegments, segmentIndex);
  const result = scoreSegment(st, features);
  const rules = SCORING_RULES[st] || {};

  const strengths: CoachAnalysis['strengths'] = [];
  const weaknesses: CoachAnalysis['weaknesses'] = [];

  for (const [key, rule] of Object.entries(rules)) {
    const points = result.breakdown[key] ?? 0;
    if (points > 0 && points >= rule.weight * 0.4) {
      strengths.push({
        key,
        label: FEATURE_LABELS[key] || key,
        points,
      });
    } else {
      weaknesses.push({
        key,
        label: FEATURE_LABELS[key] || key,
        weight: rule.weight,
        tip: FEATURE_TIPS[key] || '',
        isStable: !CROSS_SEGMENT_FEATURES.has(key),
      });
    }
  }

  // Sort: strengths by points desc, weaknesses by weight desc
  strengths.sort((a, b) => b.points - a.points);
  weaknesses.sort((a, b) => b.weight - a.weight);

  const powerWords = detectPowerWords(segment.script, language).map((pw) => pw.word);
  const emotionResult = analyzeEmotion(segment.script, language);

  return {
    segmentType: segment.segmentType,
    score: result.total,
    strengths,
    weaknesses,
    powerWords,
    emotionDominant: emotionResult.dominant,
    emotionIntensity: emotionResult.intensity,
    flags: result.flags,
  };
}

// ============================================================================
// SMART CONDENSE (sentence-aware fix preview)
// ============================================================================

/** Score a sentence's impact for smart condensing. Higher = more impactful. */
function scoreSentenceImpact(sentence: string, language: string): number {
  let score = 0;
  const numbers = sentence.match(/\d+/g);
  if (numbers) score += numbers.length * 2;
  score += detectPowerWords(sentence, language).length;
  if (/\b(yang\s+ketiga|rahasia|bahaya|terakhir|secret|dangerous|last|third|final)\b/i.test(sentence)) score += 1;
  if (hasNegativeFrame(sentence)) score += 1;
  if (hasQuestion(sentence)) score += 0.5;
  return score;
}

/**
 * Smart condense: produces a fix preview that respects maxWords while
 * preserving the most impactful content. Unlike buildFixPreview (which
 * blindly truncates from the end), this function:
 * 1. Strips filler words
 * 2. Splits into sentences and picks the most impactful one(s)
 * 3. Falls back to filler-stripped truncation only as last resort
 */
function smartCondense(
  prefix: string,
  originalText: string,
  suffix: string,
  maxWords: number,
  language: string,
): string {
  const prefixWords = prefix.trim() ? prefix.trim().split(/\s+/) : [];
  const suffixWords = suffix.trim() ? suffix.trim().split(/\s+/) : [];
  const overhead = prefixWords.length + suffixWords.length;
  const budget = Math.max(1, maxWords - overhead);

  const origWords = originalText.trim().split(/\s+/).filter(Boolean);

  // If original fits within budget, no condensing needed
  if (origWords.length <= budget) {
    return [prefix.trim(), originalText.trim(), suffix.trim()].filter(Boolean).join(' ');
  }

  // Step 1: Strip filler words
  const fillers = FILLER_WORDS[language] ?? FILLER_WORDS.en;
  const stripped = origWords.filter(w => !fillers.has(w.toLowerCase()));
  if (stripped.length <= budget) {
    return [prefix.trim(), stripped.join(' '), suffix.trim()].filter(Boolean).join(' ');
  }

  // Step 2: Split into sentences, pick best combination
  const sentences = originalText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    const scored = sentences.map(s => {
      const cleaned = s.trim().replace(/[.!?]+$/, '');
      return {
        text: cleaned,
        words: cleaned.split(/\s+/).filter(Boolean),
        impact: scoreSentenceImpact(s, language),
      };
    });
    scored.sort((a, b) => b.impact - a.impact);

    // Try best sentence with fillers stripped
    const bestStripped = scored[0].words.filter(w => !fillers.has(w.toLowerCase()));
    if (bestStripped.length <= budget) {
      return [prefix.trim(), bestStripped.join(' '), suffix.trim()].filter(Boolean).join(' ');
    }

    // Try best sentence raw
    if (scored[0].words.length <= budget) {
      return [prefix.trim(), scored[0].words.join(' '), suffix.trim()].filter(Boolean).join(' ');
    }

    // Combine key phrases: start of best + end of second-best
    if (scored.length >= 2 && budget >= 4) {
      const halfBudget = Math.floor((budget - 1) / 2); // -1 for the em dash
      const startWords = scored[0].words.slice(0, halfBudget);
      const endBudget = budget - 1 - startWords.length; // -1 for the em dash
      const endWords = scored[1].words.slice(-Math.max(1, endBudget));
      const combined = [...startWords, '—', ...endWords];
      if (combined.length <= budget) {
        return [prefix.trim(), combined.join(' '), suffix.trim()].filter(Boolean).join(' ');
      }
    }
  }

  // Step 3: Fallback — strip fillers and truncate
  const truncated = stripped.slice(0, budget).join(' ').replace(/[,;]$/, '') + '...';
  return [prefix.trim(), truncated, suffix.trim()].filter(Boolean).join(' ');
}

// ============================================================================
// QUICK-FIX SUGGESTION GENERATOR
// ============================================================================

export function generateQuickFixes(
  segment: SegmentInput,
  analysis: CoachAnalysis,
  language: string,
): QuickFix[] {
  const fixes: QuickFix[] = [];
  const text = (segment.script || '').trim();
  if (text.length === 0) return fixes; // Guard: no text → no fixes to suggest
  const words = text.split(/\s+/).filter(Boolean);
  const maxW = segment.maxWords;
  const segTypeRaw = segment.segmentType || 'BODY';
  const st = segTypeRaw.startsWith('BODY') ? 'BODY' : segTypeRaw;

  // Weakness: no question → suggest adding one
  if (analysis.weaknesses.some(w => w.key === 'has_question')) {
    const questionStyles: Record<string, string[][]> = {
      id: [
        ['Lo tau gak', '?'],
        ['Pernah kepikiran', '?'],
        ['Kenapa', '?'],
        ['Serius, lo masih gak tau', '?'],
      ],
      en: [
        ['Did you know', '?'],
        ['Ever wondered', '?'],
        ['What if', '?'],
        ['Can you guess', '?'],
      ],
      hi: [
        ['Kya tumhe pata hai', '?'],
        ['Kabhi socha hai', '?'],
        ['Agar', '?'],
        ['Tumhe lagta hai', '?'],
      ],
    };
    const styles = questionStyles[language] ?? questionStyles.en;
    const styleIdx = words.length % styles.length;
    const [prefix, suffix] = styles[styleIdx];
    const core = text.replace(/[.!?]+$/, '');
    const qPreview = smartCondense(prefix, core.toLowerCase(), suffix, maxW, language);
    fixes.push({
      id: 'add-question',
      weaknessKey: 'has_question',
      label: 'Add question hook',
      preview: qPreview,
      field: 'script',
    });
  }

  // Weakness: no number → suggest adding one
  if (analysis.weaknesses.some(w => w.key === 'has_number')) {
    const numberInserts: Record<string, string> = {
      id: '3 cara', en: '3 ways', hi: '3 tarike',
    };
    const insert = numberInserts[language] ?? numberInserts.en;
    if (words.length > 2) {
      const preview = smartCondense(`${words[0]} ${insert}`, words.slice(1).join(' '), '', maxW, language);
      fixes.push({
        id: 'add-number',
        weaknessKey: 'has_number',
        label: 'Add number/stat',
        preview,
        field: 'script',
      });
    }
  }

  // Weakness: no negative frame → suggest negative reframe
  if (analysis.weaknesses.some(w => w.key === 'has_negative_frame') && st === 'HOOK') {
    const negPrefixes: Record<string, string> = {
      id: 'Jangan pernah', en: "Don't ever", hi: 'Kabhi mat',
    };
    const negPrefix = negPrefixes[language] ?? negPrefixes.en;
    const core = text.replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[.!?]+$/, '');
    const negPreview = smartCondense(negPrefix, core, '!', maxW, language);
    fixes.push({
      id: 'add-negative',
      weaknessKey: 'has_negative_frame',
      label: 'Negative reframe',
      preview: negPreview,
      field: 'script',
    });
  }

  // Weakness: no urgency word (CTA)
  if (analysis.weaknesses.some(w => w.key === 'has_urgency_word') && st === 'CTA') {
    const urgencyWords: Record<string, string> = {
      id: 'Sekarang!', en: 'Right now!', hi: 'Abhi!',
    };
    const urgency = urgencyWords[language] ?? urgencyWords.en;
    const urgPreview = smartCondense('', text.replace(/[.!?]*$/, ''), `— ${urgency}`, maxW, language);
    fixes.push({
      id: 'add-urgency',
      weaknessKey: 'has_urgency_word',
      label: 'Add urgency',
      preview: urgPreview,
      field: 'script',
    });
  }

  // Weakness: no first-person CTA
  if (analysis.weaknesses.some(w => w.key === 'first_person') && st === 'CTA') {
    const fpPrefixes: Record<string, string> = {
      id: 'Gue mau lo', en: 'I want you to', hi: 'Main chahta hoon tum',
    };
    const fpPrefix = fpPrefixes[language] ?? fpPrefixes.en;
    const fpCore = text.toLowerCase().replace(/[.!?]*$/, '');
    const fpPreview = smartCondense(fpPrefix, fpCore, '.', maxW, language);
    fixes.push({
      id: 'add-first-person',
      weaknessKey: 'first_person',
      label: 'First-person CTA',
      preview: fpPreview,
      field: 'script',
    });
  }

  // Weakness: no foreshadow (FORE)
  if (analysis.weaknesses.some(w => w.key === 'has_foreshadow') && st === 'FORE') {
    const foreshadowTails: Record<string, string> = {
      id: 'Tapi tunggu, yang terakhir ini...', en: 'But wait, the last one...', hi: 'Lekin ruko, aakhri wala...',
    };
    const foreTail = foreshadowTails[language] ?? foreshadowTails.en;
    const forePreview = smartCondense('', text.replace(/[.!?]*$/, '') + '.', foreTail, maxW, language);
    fixes.push({
      id: 'add-foreshadow',
      weaknessKey: 'has_foreshadow',
      label: 'Add open loop',
      preview: forePreview,
      field: 'script',
    });
  }

  // Weakness: no callback (LOOP-END)
  if (analysis.weaknesses.some(w => w.key === 'has_callback') && segment.segmentType === 'LOOP-END') {
    const callbacks: Record<string, string> = {
      id: 'Inget tadi gue bilang?', en: 'Remember what I said?', hi: 'Yaad hai maine kya kaha?',
    };
    const cb = callbacks[language] ?? callbacks.en;
    const cbPreview = smartCondense(cb, text, '', maxW, language);
    fixes.push({
      id: 'add-callback',
      weaknessKey: 'has_callback',
      label: 'Add hook callback',
      preview: cbPreview,
      field: 'script',
    });
  }

  // Weakness: builds_on_hook (FORE/BODY) — suggest connecting back to hook
  if (analysis.weaknesses.some(w => w.key === 'builds_on_hook') && st !== 'HOOK') {
    const hookPrefix: Record<string, string[]> = {
      id: ['Nah yang gue bilang tadi, ', 'Balik ke topik, ', 'Soal yang tadi, '],
      en: ['Like I said, ', 'Back to the point, ', 'About what I mentioned, '],
      hi: ['Jaise maine kaha, ', 'Wapas topic pe, ', 'Jo maine bataya, '],
    };
    const opts = hookPrefix[language] ?? hookPrefix.en;
    const pick = opts[words.length % opts.length];
    const trimmedText = text[0].toLowerCase() + text.slice(1);
    const hookConnPreview = smartCondense(pick, trimmedText, '', maxW, language);
    fixes.push({
      id: 'add-hook-connection',
      weaknessKey: 'builds_on_hook',
      label: 'Connect back to hook',
      preview: hookConnPreview,
      field: 'script',
    });
  }

  // Weakness: word_density_optimal (over-dense, >90% density) — suggest trimming
  if (analysis.weaknesses.some(w => w.key === 'word_density_optimal') && words.length > segment.maxWords * 0.9) {
    const targetWords = Math.round(segment.maxWords * 0.8);
    const trimmed = words.slice(0, targetWords).join(' ');
    fixes.push({
      id: 'reduce-density',
      weaknessKey: 'word_density_optimal',
      label: `Trim to ${targetWords} words`,
      preview: `${trimmed}...`,
      field: 'script',
    });
  }

  // BODY: suggest adding transition word
  if (analysis.weaknesses.some(w => w.key === 'has_transition_word') && (st === 'BODY' || st === 'FORE')) {
    const transitions: Record<string, string[]> = {
      id: ['Nah', 'Tapi', 'Terus', 'Nah sekarang'],
      en: ['Now', 'But', 'So', 'Meanwhile'],
      hi: ['Ab', 'Lekin', 'Phir', 'To'],
    };
    const opts = transitions[language] ?? transitions.en;
    const pick = opts[words.length % opts.length];
    const startsWithTransition = /^(tapi|nah|but|so|now|terus|ab|lekin|phir)\b/i.test(text);
    if (!startsWithTransition) {
      const transCore = text[0].toLowerCase() + text.slice(1);
      const transPreview = smartCondense(pick, transCore, '', maxW, language);
      fixes.push({
        id: 'add-transition',
        weaknessKey: 'has_transition_word',
        label: 'Add transition word',
        preview: transPreview,
        field: 'script',
      });
    }
  }

  // PEAK: suggest adding twist/reveal
  if (analysis.weaknesses.some(w => w.key === 'has_unexpected_twist') && st === 'PEAK') {
    const twists: Record<string, string> = {
      id: 'Tapi ternyata...', en: 'But turns out...', hi: 'Lekin asli mein...',
    };
    const twist = twists[language] ?? twists.en;
    const twistPreview = smartCondense(twist, text, '', maxW, language);
    fixes.push({
      id: 'add-twist',
      weaknessKey: 'has_unexpected_twist',
      label: 'Add surprise twist',
      preview: twistPreview,
      field: 'script',
    });
  }

  // BODY/PEAK: suggest adding specific detail/proof
  if (analysis.weaknesses.some(w => w.key === 'has_specific_detail' || w.key === 'has_specific_proof') && (st === 'BODY' || st === 'PEAK')) {
    const proofTemplates: Record<string, string> = {
      id: '(100 orang udah buktiin)', en: '(100 people have proven it)', hi: '(100 logon ne prove kiya)',
    };
    const proof = proofTemplates[language] ?? proofTemplates.en;
    const proofPreview = smartCondense('', text.replace(/[.!?]*$/, ''), `— ${proof}`, maxW, language);
    fixes.push({
      id: 'add-proof',
      weaknessKey: 'has_specific_proof',
      label: 'Add social proof',
      preview: proofPreview,
      field: 'script',
    });
  }

  // Any segment: suggest adding pattern interrupt
  if (analysis.weaknesses.some(w => w.key === 'has_pattern_interrupt') && st !== 'CTA') {
    if (st === 'HOOK') {
      // HOOK-specific: visual shock / scroll-stop opener
      const hookInterrupts: Record<string, string[]> = {
        id: ['STOP! ', 'Serius, ', 'Lo HARUS tau: '],
        en: ['STOP! ', 'Seriously, ', 'You NEED to know: '],
        hi: ['RUKO! ', 'Suno, ', 'Ye jaanna zaroori hai: '],
      };
      const opts = hookInterrupts[language] ?? hookInterrupts.en;
      const pick = opts[words.length % opts.length];
      const hookIntCore = text[0].toLowerCase() + text.slice(1);
      const hookIntPreview = smartCondense(pick, hookIntCore, '', maxW, language);
      fixes.push({
        id: 'add-interrupt',
        weaknessKey: 'has_pattern_interrupt',
        label: 'Add scroll-stop opener',
        preview: hookIntPreview,
        field: 'script',
      });
    } else {
      const interrupts: Record<string, string[]> = {
        id: ['Tunggu dulu...', 'Tapi ini yang gila:', 'Dan yang bikin kaget:'],
        en: ['Wait...', 'But here\'s the crazy part:', 'And what shocked me:'],
        hi: ['Ruko...', 'Lekin ye dekhlo:', 'Aur jo chaukane wali baat hai:'],
      };
      const opts = interrupts[language] ?? interrupts.en;
      const pick = opts[words.length % opts.length];
      const intPreview = smartCondense(pick, text, '', maxW, language);
      fixes.push({
        id: 'add-interrupt',
        weaknessKey: 'has_pattern_interrupt',
        label: 'Add pattern interrupt',
        preview: intPreview,
        field: 'script',
      });
    }
  }

  // Word count over limit → suggest smart trim
  if (analysis.weaknesses.some(w => w.key === 'under_word_limit') || words.length > segment.maxWords) {
    const trimPreview = smartCondense('', text, '', segment.maxWords, language);
    fixes.push({
      id: 'trim-words',
      weaknessKey: 'under_word_limit',
      label: `Trim to ${segment.maxWords} words`,
      preview: trimPreview,
      field: 'script',
    });
  }

  // Word density too low → suggest adding more words
  if (analysis.weaknesses.some(w => w.key === 'word_density_optimal') && words.length < segment.maxWords * 0.7) {
    const targetWords = Math.round(segment.maxWords * 0.8);
    const wordsToAdd = targetWords - words.length;
    const fillerTemplates: Record<string, string> = {
      id: `[Tambah ${wordsToAdd} kata lagi biar pacing pas]`,
      en: `[Add ${wordsToAdd} more words for optimal pacing]`,
      hi: `[${wordsToAdd} aur shabd jodo pacing ke liye]`,
    };
    // Low density — text is already under limit, safe to append hint
    fixes.push({
      id: 'improve-density',
      weaknessKey: 'word_density_optimal',
      label: 'Improve word density',
      preview: `${text} ${fillerTemplates[language] ?? fillerTemplates.en}`,
      field: 'script',
    });
  }

  // No power word → suggest replacing a word with power word
  if (analysis.weaknesses.some(w => w.key === 'has_power_word')) {
    const powerWordSuggestions: Record<string, string[]> = {
      id: ['GILA', 'PARAH', 'RAHASIA', 'GRATIS'],
      en: ['INSANE', 'SECRET', 'FREE', 'SHOCKING'],
      hi: ['SHOCKING', 'FREE', 'RAHASYA', 'DHAMAKA'],
    };
    const pwOpts = powerWordSuggestions[language] ?? powerWordSuggestions.en;
    const pick = pwOpts[words.length % pwOpts.length];
    const pwPreview = smartCondense(`${words[0]} ${pick}`, words.slice(1).join(' '), '', maxW, language);
    fixes.push({
      id: 'add-power-word',
      weaknessKey: 'has_power_word',
      label: 'Add power word',
      preview: pwPreview,
      field: 'script',
    });
  }

  // Emotional intensity too low → suggest intensifying language
  if (analysis.weaknesses.some(w => w.key === 'emotional_intensity_high')) {
    const intensifiers: Record<string, string[]> = {
      id: ['literally', 'GILA', 'beneran', 'serius'],
      en: ['literally', 'absolutely', 'seriously', 'genuinely'],
      hi: ['sach mein', 'bilkul', 'puri tarah', 'seriously'],
    };
    const opts = intensifiers[language] ?? intensifiers.en;
    const pick = opts[words.length % opts.length];
    if (words.length > 2) {
      const intensePreview = smartCondense(`${words[0]} ${pick}`, words.slice(1).join(' '), '', maxW, language);
      fixes.push({
        id: 'add-intensity',
        weaknessKey: 'emotional_intensity_high',
        label: 'Boost emotional intensity',
        preview: intensePreview,
        field: 'script',
      });
    }
  }

  // Clear CTA action missing
  if (analysis.weaknesses.some(w => w.key === 'has_clear_action') && st === 'CTA') {
    const actions: Record<string, string> = {
      id: 'Save & follow gue sekarang.', en: 'Save & follow me now.', hi: 'Save karo aur follow karo abhi.',
    };
    const ctaAction = actions[language] ?? actions.en;
    const ctaPreview = smartCondense('', text.replace(/[.!?]*$/, '') + '.', ctaAction, maxW, language);
    fixes.push({
      id: 'add-cta-action',
      weaknessKey: 'has_clear_action',
      label: 'Add clear action',
      preview: ctaPreview,
      field: 'script',
    });
  }

  return fixes;
}
