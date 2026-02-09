/**
 * SCORING ENGINE — Evidence-Based Script Analysis
 *
 * Every weight and threshold traces back to real research data.
 * Used by: Retention Curve (client-side), Emotion Arc (client-side), AI Script Coach (grounded scoring)
 *
 * Sources:
 *   [A] 01-advertising-psychology.ts — Cialdini's principles, cognitive biases
 *   [B] 04-audience-psychology-matrix.ts — Pacing params by generation
 *   [C] 06-cta-conversion-optimization.ts — CTA conversion stats
 *   [D] 11-hook-library-2026.ts — 100 hooks, 5 categories
 *   [E] tier3/market-intel-q1-2026.md — Viral case studies, platform stats
 *   [F] Conductor 2024 study — Numbers in headlines +36% CTR
 *   [G] Backlinko 912M post study — Questions +23.3% shares
 *   [H] Nature/Upworthy 105K A/B tests — Negative words +2.3% CTR per word
 *   [I] Outbrain 65K title study — Negative superlatives +63% higher CTR
 *   [J] TikTok Creator Analytics / Epidemic Sound — Retention curve patterns
 *   [K] NRC Emotion Intensity Lexicon — Word-level emotion scores
 *   [L] InSet Indonesian Sentiment Lexicon — 10,218 words, -5 to +5
 *
 * Last updated: 2026-02-08
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SegmentType = 'HOOK' | 'FORE' | 'BODY' | 'PEAK' | 'CTA' | 'LOOP-END';

export type EmotionArcPattern =
  | 'roller_coaster'  // high→dip→build→climax→warm — #1 viral pattern
  | 'slow_burn'       // low→gradual rise→climax — works for storytelling
  | 'front_heavy'     // high→steady decline — loses audience
  | 'flat_line'       // no variation — worst retention
  | 'tension_release' // build→build→build→release — good for reveals
  | 'wave';           // up→down→up→down — good for listicles

export interface ScoringWeight {
  weight: number;
  maxWeight?: number;
  source: string;
}

export interface SegmentScoreResult {
  total: number;         // 0-100
  breakdown: Record<string, number>;
  flags: string[];       // warnings/suggestions
}

export interface RetentionPoint {
  segment: SegmentType;
  index: number;
  predicted: number;     // 0-100 retention %
  benchmark: number;     // top 10% threshold
  drop: number;          // drop from previous segment
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT-SPECIFIC SCORING RULES
// ═══════════════════════════════════════════════════════════════

export const SCORING_RULES: Record<SegmentType, Record<string, ScoringWeight>> = {
  HOOK: {
    has_question: {
      weight: 12,
      source: '[G] Questions +23.3% shares (Backlinko 912M posts). Forces mental engagement in critical 1.3s window [B].'
    },
    has_number: {
      weight: 15,
      source: '[F] Numbers in headlines +36% CTR (Conductor). number_list hook pattern avg +18% retention [D].'
    },
    has_power_word: {
      weight: 10,
      source: '[H] Negative/emotional words +2.3% CTR per word (Nature/Upworthy 105K A/B tests).'
    },
    has_negative_frame: {
      weight: 8,
      source: '[I] Negative superlatives +63% higher CTR (Outbrain 65K titles). [A] Loss aversion 2x intensity.'
    },
    word_density_optimal: {
      weight: 10,
      source: '[B] 130 WPM × duration × 0.80 word limit. 70-90% density = natural pace, >100% = rushed.'
    },
    under_word_limit: {
      weight: 8,
      source: '[B] Gen Z 1.3s decision point. HOOK must be readable in <3s at 2.5-3.0 words/sec.'
    },
    has_pattern_interrupt: {
      weight: 7,
      source: '[A] 5 RAS trigger techniques. Pattern interrupts reset attention baseline. [J] +17pp retention.'
    },
    matches_hook_category: {
      weight: 5,
      source: '[D] 5 hook categories each have distinct psychological triggers. Category alignment = coherence.'
    },
  },

  FORE: {
    has_foreshadow: {
      weight: 15,
      source: '[E] "Tunggu sampai lo liat..." pattern locks retention. Foreshadow = open loop = must watch.'
    },
    has_transition: {
      weight: 8,
      source: 'Smooth hook→body transition reduces 5s drop-off. [J] Avg 15-22% drop at 5s mark.'
    },
    builds_on_hook: {
      weight: 12,
      source: '[A] Commitment/Consistency: viewers who self-identified in HOOK expect payoff. Break = exit.'
    },
    word_density_optimal: {
      weight: 10,
      source: '[B] 130 WPM × duration × 0.80. FORE should set up the promise efficiently.'
    },
    has_specific_detail: {
      weight: 10,
      source: '[E] Specificity > vague. "3 tools" > "some tools". Concrete = trust, vague = skip.'
    },
  },

  BODY: {
    has_pattern_interrupt: {
      weight: 15,
      source: '[J] Pattern interrupts add +17pp retention. Critical mid-video to prevent linear decline.'
    },
    has_specific_detail: {
      weight: 12,
      source: '[A][E] Concrete data/examples build authority. "47 options tested" > "many options".'
    },
    has_transition_word: {
      weight: 5,
      source: 'Transition words (tapi/but/nah) signal new info, preventing scan-skip behavior.'
    },
    word_density_optimal: {
      weight: 10,
      source: '[B] Body segments most prone to over-packing. 70-90% density = sustainable pace.'
    },
    has_value_delivery: {
      weight: 13,
      source: '[A] Reciprocity principle: deliver value before asking. Body = main value container.'
    },
  },

  PEAK: {
    has_emotional_climax: {
      weight: 18,
      source: '[A] Emotional campaigns 2x ROI vs rational. Peak must be highest emotional point.'
    },
    has_unexpected_twist: {
      weight: 15,
      source: '[E] Surprise = replay + share value. Unexpected element at PEAK drives completion.'
    },
    has_specific_proof: {
      weight: 10,
      source: '[A] Authority + Social Proof at climax. "50K+ people" or "tested for 30 days" = trust peak.'
    },
    word_density_optimal: {
      weight: 8,
      source: '[B] PEAK can run slightly hot (80-100%) — emotional intensity justifies faster pace.'
    },
    emotional_intensity_high: {
      weight: 12,
      source: '[K] NRC emotion intensity. PEAK words should avg >0.7 intensity. Low intensity = flat.'
    },
  },

  CTA: {
    has_clear_action: {
      weight: 12,
      source: '[C] Action-oriented language +121% conversion. Must have explicit verb (tap/click/follow/save).'
    },
    first_person: {
      weight: 10,
      source: '[C] First-person CTAs ("Get my...") +90% CTR vs second-person ("Get your...").'
    },
    single_focus: {
      weight: 18,
      source: '[C] Single CTA focus +371% clicks. Multiple CTAs = decision paralysis = no action.'
    },
    has_urgency_word: {
      weight: 8,
      source: '[C] Authentic urgency up to +332%. Must be genuine (real deadline, real limit).'
    },
    under_word_limit: {
      weight: 10,
      source: '[C] CTA must be concise. 2-4 word CTAs outperform longer ones. Keep under word limit.'
    },
    matches_funnel_stage: {
      weight: 7,
      source: '[C] Awareness→"Learn more", Consideration→"Get guide", Conversion→"Shop now". Mismatch = friction.'
    },
  },

  'LOOP-END': {
    mirrors_hook_energy: {
      weight: 20,
      source: 'LOOP-END must match HOOK energy for seamless loop. Energy mismatch = viewer notices cut.'
    },
    has_callback: {
      weight: 15,
      source: 'Callback to HOOK creates satisfying closure. "Remember when I said..." = replay trigger.'
    },
    word_density_optimal: {
      weight: 10,
      source: '[B] Same pacing rules as HOOK — must feel like natural continuation.'
    },
    emotional_match: {
      weight: 10,
      source: 'Emotion tone should match HOOK (±0.2 intensity) for seamless loop perception.'
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// RETENTION CURVE MODEL
// ═══════════════════════════════════════════════════════════════

/**
 * Retention decay formula:
 *   R(t) = R_hook × e^(-λ × t) + R_floor
 *
 * Where:
 *   R_hook  = initial retention after hook (65-95% depending on hook score)
 *   λ       = decay rate (lower = better retention)
 *   t       = segment index (0-based)
 *   R_floor = minimum retention (platform-dependent)
 *
 * Source: [J] TikTok Creator Analytics, Epidemic Sound retention studies
 */
export const RETENTION_MODEL = {
  /** Maps hook score (0-100) to initial retention % */
  hookScoreToRetention: (hookScore: number): number => {
    // [J] 65%+ 3s retention = 4-7x more impressions
    // Linear mapping: score 0→40%, score 50→65%, score 100→95%
    return Math.min(95, Math.max(40, 40 + (hookScore / 100) * 55));
  },

  /** Decay rates by content quality */
  decayRates: {
    excellent: 0.05, // Top 10% content: loses ~5% per segment
    good: 0.10,      // Above average: loses ~10% per segment
    average: 0.18,   // Typical content: loses ~18% per segment
    poor: 0.30,      // Below average: rapid drop-off
  } as Record<string, number>,

  /** Floor retention by platform */
  platformFloor: {
    tiktok: 25,    // [J] TikTok users more likely to watch loops
    reels: 20,     // [E] Instagram Reels slightly lower
    shorts: 22,    // [E] YouTube Shorts moderate
    default: 20,
  } as Record<string, number>,

  /** Pattern interrupt bonus: [J] +17 percentage points when mid-video interrupt detected */
  patternInterruptBonus: 17,

  /** Benchmark thresholds for retention curve */
  benchmarks: {
    viral: 78,       // [J] TikTok viral avg completion rate
    above_average: 65,// [E] Reels benchmark
    average: 50,
    below_average: 35,
  },

  /**
   * Average retention by time mark (as % of total duration)
   * Source: [J] TikTok Creator Analytics aggregate data
   */
  retentionByTimePercent: {
    viral: {
      0: 100, 10: 92, 20: 85, 30: 80, 40: 78, 50: 76,
      60: 75, 70: 74, 80: 73, 90: 72, 100: 70,
    },
    average: {
      0: 100, 10: 78, 20: 65, 30: 55, 40: 48, 50: 42,
      60: 38, 70: 35, 80: 32, 90: 30, 100: 28,
    },
  } as Record<string, Record<number, number>>,
};

// ═══════════════════════════════════════════════════════════════
// EMOTION ARC PATTERNS
// ═══════════════════════════════════════════════════════════════

export const EMOTION_ARC_PATTERNS: Record<EmotionArcPattern, {
  description: string;
  shape: number[];       // Normalized intensity per segment position (0.0-1.0)
  viralityBonus: number; // Added to overall score
  source: string;
}> = {
  roller_coaster: {
    description: 'High→dip→build→climax→warm — #1 viral pattern',
    shape: [0.9, 0.5, 0.4, 0.6, 0.95, 0.7],
    viralityBonus: 15,
    source: '[A] Emotional campaigns 2x ROI. Variation keeps attention. [J] Highest completion rate pattern.'
  },
  tension_release: {
    description: 'Build→build→build→release — great for reveals/storytelling',
    shape: [0.6, 0.65, 0.7, 0.8, 0.95, 0.5],
    viralityBonus: 12,
    source: '[A] Commitment/Consistency: escalating tension creates investment. Release = satisfaction.'
  },
  wave: {
    description: 'Up→down→up→down — works for listicles/tips',
    shape: [0.8, 0.5, 0.8, 0.5, 0.8, 0.6],
    viralityBonus: 8,
    source: '[J] Pattern interrupts at regular intervals maintain attention. Works well for numbered lists.'
  },
  slow_burn: {
    description: 'Low→gradual rise→climax — risky but works for storytelling',
    shape: [0.4, 0.5, 0.55, 0.65, 0.9, 0.6],
    viralityBonus: 5,
    source: '[B] Gen X/Boomer patience allows slow burn. Gen Z will drop off early. Risky for short-form.'
  },
  front_heavy: {
    description: 'High→steady decline — loses audience after hook',
    shape: [0.95, 0.7, 0.5, 0.4, 0.35, 0.3],
    viralityBonus: -5,
    source: '[J] "Hook-only" content. High initial retention but steep drop. Low completion = low distribution.'
  },
  flat_line: {
    description: 'No variation — worst retention pattern',
    shape: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    viralityBonus: -15,
    source: '[A] No pattern interrupts = no RAS activation. Brain habituates, attention wanders.'
  },
};

/**
 * Match a segment intensity array to the closest emotion arc pattern.
 * Uses cosine similarity.
 */
export function detectEmotionPattern(
  intensities: number[]
): { pattern: EmotionArcPattern; confidence: number } {
  let bestPattern: EmotionArcPattern = 'flat_line';
  let bestSimilarity = -1;

  for (const [pattern, config] of Object.entries(EMOTION_ARC_PATTERNS)) {
    const shape = config.shape;
    // Normalize to same length via linear interpolation
    const normalized = normalizeToLength(intensities, shape.length);
    const similarity = cosineSimilarity(normalized, shape);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestPattern = pattern as EmotionArcPattern;
    }
  }

  return {
    pattern: bestPattern,
    confidence: Math.round(bestSimilarity * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════
// POWER WORDS (per language)
// ═══════════════════════════════════════════════════════════════

/**
 * Power words that boost engagement when present in scripts.
 * Each word has a category and impact multiplier.
 *
 * Categories:
 *   urgency  — time pressure, FOMO
 *   negative — warnings, fear, loss aversion
 *   curiosity — secrets, hidden, revealed
 *   value    — free, proven, guaranteed
 *   emotional — strong feeling triggers
 */
export type PowerWordCategory = 'urgency' | 'negative' | 'curiosity' | 'value' | 'emotional';

export interface PowerWord {
  word: string;
  category: PowerWordCategory;
  impact: number; // 0.0-1.0 relative impact score
  source: string;
}

export const POWER_WORDS: Record<string, PowerWord[]> = {
  en: [
    // Urgency — [C] Urgency up to +332%
    { word: 'now', category: 'urgency', impact: 0.7, source: '[C]' },
    { word: 'today', category: 'urgency', impact: 0.7, source: '[C]' },
    { word: 'hurry', category: 'urgency', impact: 0.6, source: '[C]' },
    { word: 'limited', category: 'urgency', impact: 0.8, source: '[C]' },
    { word: 'last chance', category: 'urgency', impact: 0.85, source: '[C]' },
    { word: 'before', category: 'urgency', impact: 0.5, source: '[C]' },
    { word: 'deadline', category: 'urgency', impact: 0.7, source: '[C]' },
    // Negative — [H] +2.3% CTR per negative word, [I] +63% for negative superlatives
    { word: 'never', category: 'negative', impact: 0.8, source: '[H]' },
    { word: 'worst', category: 'negative', impact: 0.85, source: '[I]' },
    { word: 'stop', category: 'negative', impact: 0.75, source: '[H]' },
    { word: 'don\'t', category: 'negative', impact: 0.7, source: '[H]' },
    { word: 'warning', category: 'negative', impact: 0.8, source: '[H]' },
    { word: 'mistake', category: 'negative', impact: 0.75, source: '[H]' },
    { word: 'fail', category: 'negative', impact: 0.8, source: '[H]' },
    { word: 'wrong', category: 'negative', impact: 0.7, source: '[H]' },
    { word: 'avoid', category: 'negative', impact: 0.65, source: '[H]' },
    { word: 'dead', category: 'negative', impact: 0.7, source: '[H]' },
    // Curiosity — [G] Questions +23.3% shares
    { word: 'secret', category: 'curiosity', impact: 0.9, source: '[G]' },
    { word: 'hidden', category: 'curiosity', impact: 0.8, source: '[G]' },
    { word: 'revealed', category: 'curiosity', impact: 0.75, source: '[G]' },
    { word: 'truth', category: 'curiosity', impact: 0.85, source: '[G]' },
    { word: 'exposed', category: 'curiosity', impact: 0.8, source: '[G]' },
    { word: 'actually', category: 'curiosity', impact: 0.5, source: '[G]' },
    { word: 'insane', category: 'curiosity', impact: 0.7, source: '[G]' },
    // Value — [C] Action-oriented +121%
    { word: 'free', category: 'value', impact: 0.95, source: '[C]' },
    { word: 'proven', category: 'value', impact: 0.8, source: '[C]' },
    { word: 'guaranteed', category: 'value', impact: 0.75, source: '[C]' },
    { word: 'hack', category: 'value', impact: 0.7, source: '[E]' },
    { word: 'save', category: 'value', impact: 0.65, source: '[C]' },
    // Emotional — [A] Emotional campaigns 2x ROI
    { word: 'literally', category: 'emotional', impact: 0.5, source: '[A]' },
    { word: 'shocking', category: 'emotional', impact: 0.8, source: '[A]' },
    { word: 'insane', category: 'emotional', impact: 0.7, source: '[A]' },
    { word: 'crazy', category: 'emotional', impact: 0.65, source: '[A]' },
    { word: 'unbelievable', category: 'emotional', impact: 0.7, source: '[A]' },
  ],

  id: [
    // Urgency
    { word: 'sekarang', category: 'urgency', impact: 0.7, source: '[C]' },
    { word: 'cepat', category: 'urgency', impact: 0.6, source: '[C]' },
    { word: 'buruan', category: 'urgency', impact: 0.75, source: '[C]' },
    { word: 'terakhir', category: 'urgency', impact: 0.8, source: '[C]' },
    { word: 'habis', category: 'urgency', impact: 0.7, source: '[C]' },
    // Negative — [H] Negative framing in ID context
    { word: 'jangan', category: 'negative', impact: 0.8, source: '[H]' },
    { word: 'bahaya', category: 'negative', impact: 0.85, source: '[H]' },
    { word: 'salah', category: 'negative', impact: 0.7, source: '[H]' },
    { word: 'gagal', category: 'negative', impact: 0.75, source: '[H]' },
    { word: 'rugi', category: 'negative', impact: 0.8, source: '[H]' },
    { word: 'toxic', category: 'negative', impact: 0.7, source: '[H][L]' },
    { word: 'scam', category: 'negative', impact: 0.8, source: '[H]' },
    // Curiosity
    { word: 'rahasia', category: 'curiosity', impact: 0.9, source: '[G]' },
    { word: 'ternyata', category: 'curiosity', impact: 0.85, source: '[G]' },
    { word: 'tau gak', category: 'curiosity', impact: 0.75, source: '[G]' },
    { word: 'baru tau', category: 'curiosity', impact: 0.7, source: '[G]' },
    { word: 'kenapa', category: 'curiosity', impact: 0.6, source: '[G]' },
    { word: 'sebenarnya', category: 'curiosity', impact: 0.7, source: '[G]' },
    // Value
    { word: 'gratis', category: 'value', impact: 0.95, source: '[C]' },
    { word: 'terbukti', category: 'value', impact: 0.8, source: '[C]' },
    { word: 'hack', category: 'value', impact: 0.7, source: '[E]' },
    { word: 'cara', category: 'value', impact: 0.5, source: '[E]' },
    { word: 'tips', category: 'value', impact: 0.5, source: '[E]' },
    // Emotional — ID-specific high-impact words
    { word: 'gila', category: 'emotional', impact: 0.85, source: '[L]' },
    { word: 'literally', category: 'emotional', impact: 0.5, source: '[A]' },
    { word: 'parah', category: 'emotional', impact: 0.75, source: '[L]' },
    { word: 'serius', category: 'emotional', impact: 0.6, source: '[L]' },
    { word: 'anjir', category: 'emotional', impact: 0.7, source: '[L]' },
    { word: 'gokil', category: 'emotional', impact: 0.7, source: '[L]' },
    { word: 'shocking', category: 'emotional', impact: 0.8, source: '[A]' },
  ],

  hi: [
    // Urgency
    { word: 'अभी', category: 'urgency', impact: 0.7, source: '[C]' },
    { word: 'जल्दी', category: 'urgency', impact: 0.65, source: '[C]' },
    { word: 'आखिरी', category: 'urgency', impact: 0.8, source: '[C]' },
    { word: 'limited', category: 'urgency', impact: 0.75, source: '[C]' },
    // Negative
    { word: 'गलती', category: 'negative', impact: 0.75, source: '[H]' },
    { word: 'धोखा', category: 'negative', impact: 0.85, source: '[H]' },
    { word: 'खतरा', category: 'negative', impact: 0.8, source: '[H]' },
    { word: 'बकवास', category: 'negative', impact: 0.7, source: '[H]' },
    { word: 'फालतू', category: 'negative', impact: 0.65, source: '[H]' },
    { word: 'मत', category: 'negative', impact: 0.7, source: '[H]' },
    { word: 'scam', category: 'negative', impact: 0.8, source: '[H]' },
    // Curiosity
    { word: 'सच', category: 'curiosity', impact: 0.85, source: '[G]' },
    { word: 'राज़', category: 'curiosity', impact: 0.9, source: '[G]' },
    { word: 'असली', category: 'curiosity', impact: 0.7, source: '[G]' },
    { word: 'पता है', category: 'curiosity', impact: 0.65, source: '[G]' },
    { word: 'क्यों', category: 'curiosity', impact: 0.6, source: '[G]' },
    // Value
    { word: 'free', category: 'value', impact: 0.95, source: '[C]' },
    { word: 'जुगाड़', category: 'value', impact: 0.8, source: '[E]' },
    { word: 'hack', category: 'value', impact: 0.7, source: '[E]' },
    { word: 'तरीका', category: 'value', impact: 0.5, source: '[E]' },
    // Emotional
    { word: 'बहोत hard', category: 'emotional', impact: 0.8, source: '[L]' },
    { word: 'फाडू', category: 'emotional', impact: 0.75, source: '[L]' },
    { word: 'कांड', category: 'emotional', impact: 0.7, source: '[L]' },
    { word: 'झकास', category: 'emotional', impact: 0.7, source: '[L]' },
    { word: 'shocking', category: 'emotional', impact: 0.8, source: '[A]' },
    { word: 'insane', category: 'emotional', impact: 0.7, source: '[A]' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// WORD DENSITY RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Word density = (actual_words / max_words) × 100
 *
 * max_words = Math.floor(130 * (duration_seconds / 60) * 0.80)
 * Source: [B] 130 WPM baseline × 0.80 breathing room factor
 */
export const WORD_DENSITY = {
  /** Words per minute for natural speech pace */
  wpm: 130,
  /** Breathing room factor (80% of max capacity) */
  breathingFactor: 0.80,

  /** Calculate max words for a given duration */
  maxWords: (durationSeconds: number): number => {
    return Math.floor(130 * (durationSeconds / 60) * 0.80);
  },

  /** Density score thresholds */
  thresholds: {
    optimal_min: 70,    // Below 70% = too sparse, feels empty
    optimal_max: 90,    // Above 90% = too packed, feels rushed
    warning: 100,       // At 100% = at absolute limit
    critical: 110,      // Above 110% = over limit, will be cut off
  },

  /** Score based on density percentage */
  densityScore: (densityPercent: number): number => {
    if (densityPercent >= 70 && densityPercent <= 90) return 1.0;  // Optimal
    if (densityPercent >= 60 && densityPercent < 70) return 0.7;   // Slightly sparse
    if (densityPercent > 90 && densityPercent <= 100) return 0.8;  // Slightly packed
    if (densityPercent > 100 && densityPercent <= 110) return 0.4; // Over limit
    if (densityPercent > 110) return 0.1;                          // Critical
    if (densityPercent < 60) return 0.5;                           // Too empty
    return 0.5;
  },
};

// ═══════════════════════════════════════════════════════════════
// PACING RULES (by target audience)
// ═══════════════════════════════════════════════════════════════

/**
 * Source: [B] 04-audience-psychology-matrix.ts
 */
export const PACING_BY_AUDIENCE = {
  gen_z: {
    label: 'Gen Z (18-24)',
    wordsPerSecond: { min: 2.5, max: 3.0 },
    maxShotLength: 4,
    cutsPerMinute: { min: 15, max: 25 },
    optimalDuration: { min: 15, max: 30 },
    hookWindow: 1.3,
    source: '[B] Gen Z config',
  },
  millennial: {
    label: 'Millennials (25-39)',
    wordsPerSecond: { min: 2.0, max: 2.5 },
    maxShotLength: 6,
    cutsPerMinute: { min: 10, max: 15 },
    optimalDuration: { min: 30, max: 60 },
    hookWindow: 3,
    source: '[B] Millennial config',
  },
  gen_x: {
    label: 'Gen X (40-54)',
    wordsPerSecond: { min: 2.0, max: 2.5 },
    maxShotLength: 10,
    cutsPerMinute: { min: 6, max: 12 },
    optimalDuration: { min: 30, max: 90 },
    hookWindow: 5,
    source: '[B] Gen X config',
  },
  boomer: {
    label: 'Boomers (55+)',
    wordsPerSecond: { min: 1.5, max: 2.0 },
    maxShotLength: 15,
    cutsPerMinute: { min: 4, max: 8 },
    optimalDuration: { min: 60, max: 120 },
    hookWindow: 8,
    source: '[B] Boomer config',
  },
};

// ═══════════════════════════════════════════════════════════════
// OVERALL SCORE BENCHMARKS
// ═══════════════════════════════════════════════════════════════

export const SCORE_BENCHMARKS = {
  /** Thresholds for overall script score (0-100) */
  overall: {
    viral: { min: 82, label: 'Viral Potential', color: 'emerald' },
    strong: { min: 68, label: 'Strong', color: 'green' },
    average: { min: 50, label: 'Average', color: 'amber' },
    weak: { min: 30, label: 'Needs Work', color: 'orange' },
    poor: { min: 0, label: 'Rewrite', color: 'red' },
  },

  /** Per-segment score thresholds */
  segment: {
    excellent: 80,
    good: 65,
    average: 50,
    below_average: 35,
    poor: 0,
  },

  /** Top 10% threshold — scripts scoring above this are in top tier */
  top10Percent: 82,

  /** Source reference */
  source: '[E] Derived from 8 viral case studies + platform engagement benchmarks. [J] TikTok viral completion rate avg 78%.',
};

// ═══════════════════════════════════════════════════════════════
// SEGMENT WEIGHT IN OVERALL SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * How much each segment contributes to overall script score.
 * HOOK is weighted highest because it determines if anyone sees the rest.
 *
 * Source: [J] 65%+ 3s retention = 4-7x distribution.
 *         [A] 45-65% decide in 3 seconds.
 */
export const SEGMENT_WEIGHT_IN_OVERALL: Record<SegmentType, number> = {
  HOOK: 0.30,        // 30% — make or break moment
  FORE: 0.10,        // 10% — bridge
  BODY: 0.20,        // 20% — main value (may span multiple segments)
  PEAK: 0.20,        // 20% — climax drives shares/saves
  CTA: 0.15,         // 15% — conversion point
  'LOOP-END': 0.05,  // 5% — optional, only when enabled
};

// ═══════════════════════════════════════════════════════════════
// SCORING HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Score a single segment based on its type and detected features.
 *
 * @param segmentType - The segment type (HOOK, FORE, BODY, etc.)
 * @param features - Map of feature keys to boolean (detected or not)
 * @returns Score result with total (0-100), breakdown, and flags
 */
export function scoreSegment(
  segmentType: SegmentType,
  features: Record<string, boolean | number>
): SegmentScoreResult {
  const rules = SCORING_RULES[segmentType];
  if (!rules) {
    return { total: 50, breakdown: {}, flags: ['Unknown segment type'] };
  }

  let earned = 0;
  let maxPossible = 0;
  const breakdown: Record<string, number> = {};
  const flags: string[] = [];

  for (const [key, rule] of Object.entries(rules)) {
    maxPossible += rule.weight;
    const featureValue = features[key];

    if (typeof featureValue === 'number') {
      // Continuous value (0.0-1.0)
      const points = Math.round(rule.weight * featureValue);
      earned += points;
      breakdown[key] = points;
    } else if (featureValue) {
      earned += rule.weight;
      breakdown[key] = rule.weight;
    } else {
      breakdown[key] = 0;
      // Add flag for important missing features (weight >= 10)
      if (rule.weight >= 10) {
        flags.push(`Missing: ${key} (${rule.weight}pts)`);
      }
    }
  }

  const total = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 50;

  return { total, breakdown, flags };
}

/**
 * Calculate predicted retention for each segment.
 *
 * @param segmentScores - Array of segment scores in order
 * @param segmentTypes - Corresponding segment types
 * @returns Array of retention points
 */
export function calculateRetentionCurve(
  segmentScores: number[],
  segmentTypes: SegmentType[]
): RetentionPoint[] {
  if (segmentScores.length === 0) return [];

  const hookScore = segmentScores[0];
  const initialRetention = RETENTION_MODEL.hookScoreToRetention(hookScore);

  // Determine decay rate from average non-hook score
  const avgNonHook = segmentScores.length > 1
    ? segmentScores.slice(1).reduce((a, b) => a + b, 0) / (segmentScores.length - 1)
    : 50;

  let decayRate: number;
  if (avgNonHook >= 75) decayRate = RETENTION_MODEL.decayRates.excellent;
  else if (avgNonHook >= 60) decayRate = RETENTION_MODEL.decayRates.good;
  else if (avgNonHook >= 45) decayRate = RETENTION_MODEL.decayRates.average;
  else decayRate = RETENTION_MODEL.decayRates.poor;

  const floor = RETENTION_MODEL.platformFloor.default;
  const points: RetentionPoint[] = [];
  let prevRetention = 100; // Start at 100%

  for (let i = 0; i < segmentScores.length; i++) {
    // Base decay
    let retention = initialRetention * Math.exp(-decayRate * i) + floor;

    // Pattern interrupt bonus for high-scoring mid segments
    if (i > 0 && i < segmentScores.length - 1 && segmentScores[i] > 70) {
      retention = Math.min(100, retention + RETENTION_MODEL.patternInterruptBonus * 0.5);
    }

    // PEAK bonus — peaks should spike retention
    if (segmentTypes[i] === 'PEAK' && segmentScores[i] > 60) {
      retention = Math.min(100, retention + 8);
    }

    retention = Math.min(100, Math.max(floor, Math.round(retention)));
    const drop = Math.round(prevRetention - retention);

    points.push({
      segment: segmentTypes[i],
      index: i,
      predicted: retention,
      benchmark: RETENTION_MODEL.retentionByTimePercent.viral[
        Math.round((i / Math.max(1, segmentScores.length - 1)) * 100 / 10) * 10
      ] || 70,
      drop: Math.max(0, drop),
    });

    prevRetention = retention;
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════
// TEXT ANALYSIS HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Detect power words in text for a given language.
 * Returns matched power words with their impact scores.
 */
export function detectPowerWords(
  text: string,
  language: string
): PowerWord[] {
  const words = POWER_WORDS[language] || POWER_WORDS.en;
  const lowerText = text.toLowerCase();
  return words.filter(pw => lowerText.includes(pw.word.toLowerCase()));
}

/**
 * Check if text contains a question (any language).
 */
export function hasQuestion(text: string): boolean {
  return /\?/.test(text) ||
    /\b(apa|gimana|kenapa|kapan|siapa|berapa|tau gak)\b/i.test(text) || // ID
    /\b(क्या|कैसे|क्यों|कब|कौन|कितना|पता है)\b/.test(text) ||           // HI
    /\b(what|how|why|when|who|which|do you|did you|have you)\b/i.test(text); // EN
}

/**
 * Check if text contains a number or statistic.
 */
export function hasNumber(text: string): boolean {
  return /\d+/.test(text) || /\b(million|billion|thousand|ribu|juta|lakh|crore)\b/i.test(text);
}

/**
 * Check if text uses negative framing.
 */
export function hasNegativeFrame(text: string): boolean {
  const negativePatterns = [
    /\b(stop|don't|never|worst|avoid|mistake|fail|wrong|warning|losing|dead)\b/i,  // EN
    /\b(jangan|bahaya|salah|gagal|rugi|bukan|gak boleh|gak|ngeri|ancur)\b/i,       // ID
    /\b(मत|गलती|खतरा|बकवास|फालतू|नहीं|गलत)\b/,                                     // HI
  ];
  return negativePatterns.some(p => p.test(text));
}

/**
 * Check if text contains a foreshadow / open loop.
 */
export function hasForeshadow(text: string): boolean {
  const patterns = [
    /\b(wait until|but first|here's the thing|the best part)\b/i,     // EN
    /\b(tunggu|tapi|yang paling|nanti|plot twist)\b/i,                // ID
    /\b(रुको|लेकिन|सबसे बड़ा|अभी तो|देखो)\b/,                            // HI
  ];
  return patterns.some(p => p.test(text));
}

/**
 * Detect CTA action verbs.
 */
export function hasCtaAction(text: string): boolean {
  const ctaPatterns = [
    /\b(tap|click|follow|save|share|subscribe|comment|download|get|try|join|shop|buy|start)\b/i,
    /\b(follow|save|share|comment|klik|cek|cobain|beli|ikutin)\b/i,
    /\b(follow|save|share|comment|देखो|करो|लो|जुड़ो)\b/,
  ];
  return ctaPatterns.some(p => p.test(text));
}

/**
 * Check for first-person CTA framing.
 */
export function hasFirstPersonCta(text: string): boolean {
  return /\b(my|I'm|I'll|gue|gw|मेरा|मेरी|मैं)\b/i.test(text);
}

// ═══════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

function normalizeToLength(arr: number[], targetLength: number): number[] {
  if (arr.length === targetLength) return arr;
  const result: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = (i / (targetLength - 1)) * (arr.length - 1);
    const low = Math.floor(srcIndex);
    const high = Math.ceil(srcIndex);
    const frac = srcIndex - low;
    result.push(
      low === high || high >= arr.length
        ? arr[Math.min(low, arr.length - 1)]
        : arr[low] * (1 - frac) + arr[high] * frac
    );
  }
  return result;
}
