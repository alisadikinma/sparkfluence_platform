import React, { useMemo, useState, useCallback } from 'react';
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
  type ScoringWeight,
} from '../../../lib/knowledge/12-scoring-engine';
import {
  analyzeEmotion,
  EMOTION_COLORS,
  type EmotionType,
} from '../../../lib/knowledge/13-emotion-lexicon';

// ============================================================================
// TYPES
// ============================================================================

interface SegmentInput {
  id: string;
  segmentType: string;
  script: string;
  durationSeconds: number;
  maxWords: number;
  emotion: string;
  isEnabled?: boolean;
}

interface CoachAnalysis {
  segmentType: string;
  score: number;
  strengths: Array<{ key: string; label: string; points: number }>;
  weaknesses: Array<{ key: string; label: string; weight: number; tip: string }>;
  powerWords: string[];
  emotionDominant: EmotionType;
  emotionIntensity: number;
  flags: string[];
}

interface AIScriptCoachProps {
  segments: SegmentInput[];
  focusedSegmentId: string | null;
  language?: string;
  onApplySuggestion?: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

const FEATURE_LABELS: Record<string, string> = {
  has_question: 'Question hook',
  has_number: 'Number/statistic',
  has_power_word: 'Power word',
  has_negative_frame: 'Negative framing',
  word_density_optimal: 'Word density',
  under_word_limit: 'Under word limit',
  has_pattern_interrupt: 'Pattern interrupt',
  matches_hook_category: 'Hook category match',
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

const FEATURE_TIPS: Record<string, string> = {
  has_question: 'Add a question to spark curiosity (+23% shares)',
  has_number: 'Include a number or stat (+36% CTR)',
  has_power_word: 'Use emotional/urgency words (+2.3% CTR per word)',
  has_negative_frame: 'Try negative framing like "stop" or "jangan" (+63% CTR)',
  word_density_optimal: 'Aim for 70-90% word density for natural pacing',
  under_word_limit: 'Reduce word count to stay within the time limit',
  has_pattern_interrupt: 'Add a surprise element to reset attention (+17pp retention)',
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

function extractFeatures(
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
    density >= 0.7 && density <= 0.9
      ? 1
      : density > 0.9
        ? Math.max(0, 1 - (density - 0.9) * 5)
        : density / 0.7;

  // Cross-segment: emotion analysis for current + hook
  const currentEmotion = analyzeEmotion(text, language);
  const hookEmotion = hookSegment ? analyzeEmotion(hookSegment.script, language) : null;

  // builds_on_hook: keyword overlap between current text and hook
  let buildsOnHook = 0.5;
  if (hookSegment && hookSegment.script) {
    const hookWords = contentWords(hookSegment.script);
    const currentWordSet = contentWords(text);
    if (hookWords.size > 0) {
      let overlap = 0;
      for (const w of currentWordSet) {
        if (hookWords.has(w)) overlap++;
      }
      buildsOnHook = Math.min(1, overlap / Math.max(1, Math.min(hookWords.size, 3)));
    }
  }

  // has_transition: check for transition words/phrases at start of text
  const transitionStart = /^(tapi|nah|but|however|terus|lalu|nah\s+sekarang|so|meanwhile|ok\s+jadi|next|then|now|sekarang|kedua|ketiga|pertama|लेकिन|फिर|अब)\b/i.test(text.trim());
  const hasTransitionWord = /\b(tapi|nah|but|however|terus|dan|lalu|next|then|so|meanwhile|लेकिन|फिर)\b/i.test(text);

  // has_specific_detail: numbers, percentages, proper nouns, specific measurements
  const hasSpecificDetail = hasNumber(text) || /\d+%|\d+[kmKM]\b|\$\d/.test(text)
    ? 1
    : /\b[A-Z][a-z]{2,}\b/.test(text) ? 0.7 : 0.3;

  // has_value_delivery: instructional/actionable language
  const valuePatterns = /\b(cara|step|langkah|try|use|pakai|download|click|buka|search|cari|create|bikin|make|get|dapet|learn|pelajari|tip|trick|तरीका|करो|बनाओ)\b/i;
  const hasValueDelivery = valuePatterns.test(text) ? 1 : hasNumber(text) ? 0.6 : 0.2;

  // has_emotional_climax: compare intensity vs average of all segments
  let emotionalClimax = currentEmotion.intensity;
  if (allSegments && allSegments.length > 1) {
    const avgIntensity = allSegments.reduce((sum, s) => {
      return sum + analyzeEmotion(s.script, language).intensity;
    }, 0) / allSegments.length;
    emotionalClimax = currentEmotion.intensity > avgIntensity + 0.1 ? 1 : currentEmotion.intensity > avgIntensity ? 0.7 : 0.3;
  }

  // has_unexpected_twist: contrast/reveal words
  const twistPatterns = /\b(tapi\s+ternyata|ternyata|actually|turns?\s+out|plot\s+twist|surprise|gak\s+nyangka|unexpected|wait|padahal|लेकिन\s+असल|सच\s+में)\b/i;
  const hasUnexpectedTwist = twistPatterns.test(text) ? 1 : 0;

  // has_specific_proof: social proof patterns (numbers + people/users/views)
  const proofPatterns = /\d+\s*(orang|people|users?|views?|followers?|subscribers?|juta|ribu|million|k\b|%)/i;
  const hasSpecificProof = proofPatterns.test(text) ? 1 : hasNumber(text) ? 0.5 : 0;

  // emotional_intensity_high: directly from lexicon analysis
  const emotionalIntensityHigh = currentEmotion.intensity >= 0.6 ? 1 : currentEmotion.intensity >= 0.4 ? 0.6 : 0.2;

  // single_focus: count imperative verbs / action items (more = less focused)
  const actionVerbs = text.match(/\b(follow|save|click|share|comment|subscribe|like|download|buy|join|tap|swipe|ikutin|simpan|klik|beli)\b/gi) || [];
  const singleFocus = actionVerbs.length <= 1 ? 1 : actionVerbs.length === 2 ? 0.5 : 0;

  // mirrors_hook_energy: compare emotion intensity of current vs hook (for LOOP-END)
  let mirrorsHookEnergy = 0.5;
  if (hookEmotion) {
    const intensityDiff = Math.abs(currentEmotion.intensity - hookEmotion.intensity);
    mirrorsHookEnergy = intensityDiff <= 0.15 ? 1 : intensityDiff <= 0.3 ? 0.6 : 0.2;
  }

  // has_callback: references to earlier content ("remember", "tadi", "yang gue bilang")
  const callbackPatterns = /\b(remember|ingat|tadi|earlier|yang\s+gue\s+(bilang|sebut)|like\s+i\s+said|told\s+you|recall|याद)\b/i;
  const hasCallback = callbackPatterns.test(text) ? 1 : 0;

  // emotional_match: emotion similarity between current segment and hook
  let emotionalMatch = 0.5;
  if (hookEmotion) {
    const sameEmotion = currentEmotion.dominant === hookEmotion.dominant;
    const intensityDiff = Math.abs(currentEmotion.intensity - hookEmotion.intensity);
    emotionalMatch = sameEmotion ? (intensityDiff <= 0.2 ? 1 : 0.7) : 0.2;
  }

  // matches_hook_category: basic heuristic based on hook type patterns
  let matchesHookCategory = 0.5;
  if (hookSegment) {
    const hookHasQuestion = hasQuestion(hookSegment.script);
    const hookHasNumber = hasNumber(hookSegment.script);
    const hookHasNegative = hasNegativeFrame(hookSegment.script);
    // If hook uses a question → later segments should answer/address it
    if (hookHasQuestion && (hasNumber(text) || hasValueDelivery > 0.5)) matchesHookCategory = 1;
    else if (hookHasNumber && hasNumber(text)) matchesHookCategory = 0.8;
    else if (hookHasNegative && hasNegativeFrame(text)) matchesHookCategory = 0.6;
    else matchesHookCategory = 0.4;
  }

  // matches_funnel_stage: basic heuristic — CTA should have action, BODY should have value
  const matchesFunnelStage = hasCtaAction(text) || hasValueDelivery > 0.5 ? 0.8 : 0.4;

  return {
    has_question: hasQuestion(text),
    has_number: hasNumber(text),
    has_power_word: detectPowerWords(text, language).length > 0,
    has_negative_frame: hasNegativeFrame(text),
    word_density_optimal: optimalDensity,
    under_word_limit: wordCount <= maxWords,
    has_pattern_interrupt: hasForeshadow(text),
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
    matches_hook_category: matchesHookCategory,
    mirrors_hook_energy: mirrorsHookEnergy,
    has_callback: hasCallback,
    emotional_match: emotionalMatch,
  };
}

// ============================================================================
// ANALYSIS
// ============================================================================

function analyzeSegment(
  segment: SegmentInput,
  language: string,
  allSegments?: SegmentInput[],
): CoachAnalysis {
  const st = segment.segmentType.startsWith('BODY') ? 'BODY' : segment.segmentType as SegmentType;
  const words = segment.script.trim().split(/\s+/).filter(Boolean);
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
    if (points > 0 && points >= rule.weight * 0.5) {
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
// QUICK-FIX SUGGESTION GENERATOR
// ============================================================================

interface QuickFix {
  id: string;
  weaknessKey?: string;
  label: string;
  preview: string;
  field: 'script' | 'visualDirection';
}

function generateQuickFixes(
  segment: SegmentInput,
  analysis: CoachAnalysis,
  language: string,
): QuickFix[] {
  const fixes: QuickFix[] = [];
  const text = segment.script.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const st = segment.segmentType.startsWith('BODY') ? 'BODY' : segment.segmentType;

  // Weakness: no question → suggest adding one (varied by segment type)
  if (analysis.weaknesses.some(w => w.key === 'has_question')) {
    // Rotate through different question styles based on text length as pseudo-random seed
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
    const core = words.slice(0, Math.min(words.length, 6)).join(' ').replace(/[.!?]$/, '');
    fixes.push({
      id: 'add-question',
      weaknessKey: 'has_question',
      label: 'Add question hook',
      preview: `${prefix} ${core.toLowerCase()}${suffix}`,
      field: 'script',
    });
  }

  // Weakness: no number → suggest adding one
  if (analysis.weaknesses.some(w => w.key === 'has_number')) {
    const numberInserts: Record<string, string> = {
      id: '3 cara', en: '3 ways', hi: '3 tarike',
    };
    const insert = numberInserts[language] ?? numberInserts.en;
    // Try to insert a number near the start
    if (words.length > 2) {
      const newText = `${words[0]} ${insert} ${words.slice(1).join(' ')}`;
      fixes.push({
        id: 'add-number',
        weaknessKey: 'has_number',
        label: 'Add number/stat',
        preview: newText,
        field: 'script',
      });
    }
  }

  // Weakness: no negative frame → suggest negative reframe
  if (analysis.weaknesses.some(w => w.key === 'has_negative_frame') && st === 'HOOK') {
    const negPrefixes: Record<string, string> = {
      id: 'Jangan pernah', en: "Don't ever", hi: 'Kabhi mat',
    };
    const prefix = negPrefixes[language] ?? negPrefixes.en;
    const core = words.slice(0, Math.min(words.length, 8)).join(' ').replace(/^[A-Z]/, (c) => c.toLowerCase());
    fixes.push({
      id: 'add-negative',
      weaknessKey: 'has_negative_frame',
      label: 'Negative reframe',
      preview: `${prefix} ${core.replace(/[.!?]$/, '')}!`,
      field: 'script',
    });
  }

  // Weakness: no urgency word (CTA) → suggest adding urgency
  if (analysis.weaknesses.some(w => w.key === 'has_urgency_word') && st === 'CTA') {
    const urgencyWords: Record<string, string> = {
      id: 'Sekarang!', en: 'Right now!', hi: 'Abhi!',
    };
    fixes.push({
      id: 'add-urgency',
      weaknessKey: 'has_urgency_word',
      label: 'Add urgency',
      preview: `${text.replace(/[.!?]*$/, '')} — ${urgencyWords[language] ?? urgencyWords.en}`,
      field: 'script',
    });
  }

  // Weakness: no first-person CTA → suggest first-person rewrite
  if (analysis.weaknesses.some(w => w.key === 'first_person') && st === 'CTA') {
    const fpPrefixes: Record<string, string> = {
      id: 'Gue mau lo', en: 'I want you to', hi: 'Main chahta hoon tum',
    };
    const core = words.slice(0, Math.min(words.length, 8)).join(' ');
    fixes.push({
      id: 'add-first-person',
      weaknessKey: 'first_person',
      label: 'First-person CTA',
      preview: `${fpPrefixes[language] ?? fpPrefixes.en} ${core.toLowerCase().replace(/[.!?]*$/, '')}.`,
      field: 'script',
    });
  }

  // Weakness: no foreshadow → suggest open loop
  if (analysis.weaknesses.some(w => w.key === 'has_foreshadow') && st === 'FORE') {
    const foreshadowTails: Record<string, string> = {
      id: 'Tapi tunggu, yang terakhir ini...', en: 'But wait, the last one...', hi: 'Lekin ruko, aakhri wala...',
    };
    fixes.push({
      id: 'add-foreshadow',
      weaknessKey: 'has_foreshadow',
      label: 'Add open loop',
      preview: `${text.replace(/[.!?]*$/, '')}. ${foreshadowTails[language] ?? foreshadowTails.en}`,
      field: 'script',
    });
  }

  // Weakness: no callback (LOOP-END) → suggest callback to hook
  if (analysis.weaknesses.some(w => w.key === 'has_callback') && segment.segmentType === 'LOOP-END') {
    const callbacks: Record<string, string> = {
      id: 'Inget tadi gue bilang?', en: 'Remember what I said?', hi: 'Yaad hai maine kya kaha?',
    };
    fixes.push({
      id: 'add-callback',
      weaknessKey: 'has_callback',
      label: 'Add hook callback',
      preview: `${callbacks[language] ?? callbacks.en} ${text}`,
      field: 'script',
    });
  }

  // BODY segments: suggest adding transition word
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
      fixes.push({
        id: 'add-transition',
        weaknessKey: 'has_transition_word',
        label: 'Add transition word',
        preview: `${pick} ${text[0].toLowerCase()}${text.slice(1)}`,
        field: 'script',
      });
    }
  }

  // PEAK segments: suggest adding twist/reveal
  if (analysis.weaknesses.some(w => w.key === 'has_unexpected_twist') && st === 'PEAK') {
    const twists: Record<string, string> = {
      id: 'Tapi ternyata...', en: 'But turns out...', hi: 'Lekin asli mein...',
    };
    const twist = twists[language] ?? twists.en;
    fixes.push({
      id: 'add-twist',
      weaknessKey: 'has_unexpected_twist',
      label: 'Add surprise twist',
      preview: `${twist} ${text}`,
      field: 'script',
    });
  }

  // BODY/PEAK: suggest adding specific detail/proof
  if (analysis.weaknesses.some(w => w.key === 'has_specific_detail' || w.key === 'has_specific_proof') && (st === 'BODY' || st === 'PEAK')) {
    const proofTemplates: Record<string, string> = {
      id: '(100 orang udah buktiin)', en: '(100 people have proven it)', hi: '(100 logon ne prove kiya)',
    };
    const proof = proofTemplates[language] ?? proofTemplates.en;
    fixes.push({
      id: 'add-proof',
      weaknessKey: 'has_specific_proof',
      label: 'Add social proof',
      preview: `${text.replace(/[.!?]*$/, '')} — ${proof}`,
      field: 'script',
    });
  }

  // Any segment: suggest adding pattern interrupt
  if (analysis.weaknesses.some(w => w.key === 'has_pattern_interrupt') && st !== 'HOOK' && st !== 'CTA') {
    const interrupts: Record<string, string[]> = {
      id: ['Tunggu dulu...', 'Tapi ini yang gila:', 'Dan yang bikin kaget:'],
      en: ['Wait...', 'But here\'s the crazy part:', 'And what shocked me:'],
      hi: ['Ruko...', 'Lekin ye dekhlo:', 'Aur jo chaukane wali baat hai:'],
    };
    const opts = interrupts[language] ?? interrupts.en;
    const pick = opts[words.length % opts.length];
    fixes.push({
      id: 'add-interrupt',
      weaknessKey: 'has_pattern_interrupt',
      label: 'Add pattern interrupt',
      preview: `${pick} ${text}`,
      field: 'script',
    });
  }

  // Word count over limit → suggest trim
  if (analysis.weaknesses.some(w => w.key === 'under_word_limit') || words.length > segment.maxWords) {
    const trimmed = words.slice(0, segment.maxWords).join(' ');
    fixes.push({
      id: 'trim-words',
      weaknessKey: 'under_word_limit',
      label: `Trim to ${segment.maxWords} words`,
      preview: `${trimmed}...`,
      field: 'script',
    });
  }

  // Word density too low → suggest adding more words
  if (analysis.weaknesses.some(w => w.key === 'word_density_optimal') && words.length < segment.maxWords * 0.7) {
    const targetWords = Math.round(segment.maxWords * 0.8);
    const fillerTemplates: Record<string, string> = {
      id: `[Tambah ${targetWords - words.length} kata lagi biar pacing pas]`,
      en: `[Add ${targetWords - words.length} more words for optimal pacing]`,
      hi: `[${targetWords - words.length} aur shabd jodo pacing ke liye]`,
    };
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
    fixes.push({
      id: 'add-power-word',
      weaknessKey: 'has_power_word',
      label: 'Add power word',
      preview: `${words[0]} ${pick} ${words.slice(1).join(' ')}`,
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
      fixes.push({
        id: 'add-intensity',
        weaknessKey: 'emotional_intensity_high',
        label: 'Boost emotional intensity',
        preview: `${words[0]} ${pick} ${words.slice(1).join(' ')}`,
        field: 'script',
      });
    }
  }

  // Clear CTA action missing → suggest adding action verb
  if (analysis.weaknesses.some(w => w.key === 'has_clear_action') && st === 'CTA') {
    const actions: Record<string, string> = {
      id: 'Save & follow gue sekarang.', en: 'Save & follow me now.', hi: 'Save karo aur follow karo abhi.',
    };
    fixes.push({
      id: 'add-cta-action',
      weaknessKey: 'has_clear_action',
      label: 'Add clear action',
      preview: `${text.replace(/[.!?]*$/, '')}. ${actions[language] ?? actions.en}`,
      field: 'script',
    });
  }

  return fixes;
}

// ============================================================================
// SCORE BAR
// ============================================================================

const ScoreBar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px]">
        <span className="text-[#A8A29E]">{label}</span>
        <span className="font-mono text-[#78716C]">{value}/{max}</span>
      </div>
      <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AIScriptCoach: React.FC<AIScriptCoachProps> = ({
  segments,
  focusedSegmentId,
  language = 'id',
  onApplySuggestion,
}) => {
  const [expandedFix, setExpandedFix] = useState<string | null>(null);

  const focusedSegment = useMemo(
    () => segments.find((s) => s.id === focusedSegmentId),
    [segments, focusedSegmentId],
  );

  const analysis = useMemo(() => {
    if (!focusedSegment) return null;
    return analyzeSegment(focusedSegment, language, segments);
  }, [focusedSegment, language, segments]);

  const quickFixes = useMemo(() => {
    if (!focusedSegment || !analysis) return [];
    return generateQuickFixes(focusedSegment, analysis, language);
  }, [focusedSegment, analysis, language]);

  const handleApplyFix = useCallback((fix: QuickFix) => {
    if (focusedSegment && onApplySuggestion) {
      onApplySuggestion(focusedSegment.id, fix.field, fix.preview);
    }
  }, [focusedSegment, onApplySuggestion]);

  // No segment focused — show overview with segment scores
  if (!focusedSegment || !analysis) {
    const enabledSegs = segments.filter(s => s.isEnabled !== false);
    if (enabledSegs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[11px] text-[#57534E] leading-relaxed px-4">
            No segments available
          </p>
        </div>
      );
    }

    // Show per-segment score overview when no segment focused
    return (
      <div className="space-y-2">
        <span className="text-[9px] font-semibold text-[#57534E] uppercase tracking-wider">
          Segment Scores
        </span>
        {enabledSegs.map((seg) => {
          const segAnalysis = analyzeSegment(seg, language, segments);
          const scoreColor = segAnalysis.score >= 70 ? 'text-emerald-400' : segAnalysis.score >= 50 ? 'text-amber-400' : 'text-red-400';
          return (
            <button
              key={seg.id}
              type="button"
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-[#161616] border border-[#262626] hover:border-[#3f3f46] transition-colors text-left"
              onClick={() => {/* parent will handle via onApplySuggestion or dispatch */}}
            >
              <span className="text-[10px] font-bold text-[#FAFAF9] w-5 text-center">{seg.segmentType.startsWith('BODY') ? 'B' : seg.segmentType[0]}</span>
              <span className="text-[10px] text-[#78716C] flex-1 truncate">{seg.segmentType}</span>
              <span className={`text-[11px] font-mono font-bold ${scoreColor}`}>{segAnalysis.score}%</span>
            </button>
          );
        })}
        <p className="text-[9px] text-[#57534E] text-center pt-1">
          Click a segment card for detailed coaching
        </p>
      </div>
    );
  }

  const emotionColors = EMOTION_COLORS[analysis.emotionDominant];
  const st = analysis.segmentType.startsWith('BODY') ? 'BODY' : analysis.segmentType as SegmentType;
  const rules = SCORING_RULES[st] || {};

  // Coaching summary text based on score
  const coachingSummary = analysis.score >= 80
    ? 'Strong segment! Minor optimizations possible.'
    : analysis.score >= 60
      ? 'Good foundation. Focus on the improvements below.'
      : analysis.score >= 40
        ? 'Needs work. Apply the quick fixes to boost score.'
        : 'Weak segment. Consider rewriting with the suggestions below.';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-emerald-400">
            {analysis.segmentType}
          </span>
          <span className="text-[9px] text-[#57534E]">coaching</span>
        </div>
        <span className={`text-[11px] font-mono font-bold ${analysis.score >= 70 ? 'text-emerald-400' : analysis.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
          {analysis.score}%
        </span>
      </div>

      {/* Coaching summary */}
      <p className="text-[10px] text-[#A8A29E] leading-relaxed bg-[#161616] rounded-lg p-2 border border-[#262626]">
        {coachingSummary}
      </p>

      {/* Emotion chip */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${emotionColors?.bg ?? 'bg-[#262626]'} ${emotionColors?.text ?? 'text-[#78716C]'}`}>
          {analysis.emotionDominant}
        </span>
        <span className="text-[9px] text-[#57534E]">
          intensity {Math.round(analysis.emotionIntensity * 100)}%
        </span>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold text-emerald-500/70 uppercase tracking-wider">
            Strengths
          </span>
          <div className="mt-1 space-y-0.5">
            {analysis.strengths.map((s) => (
              <div key={s.key} className="flex items-start gap-1 text-[10px]">
                <span className="text-emerald-400 flex-shrink-0 mt-px">&#10003;</span>
                <span className="text-[#A8A29E]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses — each with inline Fix button when available */}
      {analysis.weaknesses.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold text-amber-500/70 uppercase tracking-wider">
            Improve
          </span>
          <div className="mt-1 space-y-1.5">
            {analysis.weaknesses.map((w) => {
              const matchingFix = quickFixes.find(f => f.weaknessKey === w.key);
              const isExpanded = expandedFix === `weakness-${w.key}`;

              return (
                <div key={w.key} className="rounded-lg border border-[#262626] bg-[#161616] overflow-hidden">
                  <div className="px-2.5 py-1.5">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-amber-400 flex-shrink-0">&#9888;</span>
                      <span className="text-[#A8A29E] flex-1">{w.label}</span>
                      <span className="text-[8px] text-[#57534E] mr-1">{w.weight}pt</span>
                      {matchingFix && (
                        <button
                          type="button"
                          onClick={() => setExpandedFix(isExpanded ? null : `weakness-${w.key}`)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors font-medium"
                        >
                          Fix
                        </button>
                      )}
                    </div>
                    {w.tip && (
                      <p className="text-[9px] text-[#57534E] pl-3.5 leading-relaxed mt-0.5">{w.tip}</p>
                    )}
                  </div>
                  {/* Inline fix preview — shown when Fix button clicked */}
                  {isExpanded && matchingFix && (
                    <div className="px-2.5 pb-2 pt-1 border-t border-[#262626] space-y-1.5">
                      <p className="text-[10px] text-[#78716C] leading-relaxed italic">
                        &ldquo;{matchingFix.preview}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => handleApplyFix(matchingFix)}
                        className="w-full py-1.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                      >
                        Apply this fix
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Power Words */}
      {analysis.powerWords.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold text-[#57534E] uppercase tracking-wider">
            Power Words Found
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.powerWords.map((pw, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                {pw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div>
        <span className="text-[9px] font-semibold text-[#57534E] uppercase tracking-wider">
          Score Breakdown
        </span>
        <div className="mt-1.5 space-y-1.5">
          {Object.entries(rules).map(([key, rule]) => (
            <ScoreBar
              key={key}
              label={FEATURE_LABELS[key] || key}
              value={analysis.strengths.find((s) => s.key === key)?.points ?? 0}
              max={rule.weight}
            />
          ))}
        </div>
      </div>

      {/* Flags */}
      {analysis.flags.length > 0 && (
        <div className="border-t border-[#262626] pt-2">
          <span className="text-[9px] font-semibold text-red-400/70 uppercase tracking-wider">
            Flags
          </span>
          <div className="mt-1 space-y-0.5">
            {analysis.flags.map((flag, i) => (
              <p key={i} className="text-[9px] text-[#A8A29E]">{flag}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
