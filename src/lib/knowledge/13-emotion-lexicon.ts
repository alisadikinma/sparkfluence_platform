/**
 * EMOTION LEXICON — Word-Level Emotion & Intensity Mapping
 *
 * Curated for short-form video script analysis (TikTok, Reels, Shorts).
 * ~200 words per language covering the most impactful terms in viral content.
 *
 * Emotion model: Plutchik's 8 basic emotions + "desire" (marketing-critical)
 *   anger, anticipation, disgust, fear, joy, sadness, surprise, trust, desire
 *
 * Intensity: 0.0 (neutral) → 1.0 (maximum)
 *
 * Sources:
 *   [K] NRC Emotion Intensity Lexicon — Methodology adapted (0.0-1.0 continuous)
 *   [L] InSet Indonesian Sentiment Lexicon — 10,218 words, -5 to +5 scale (mapped to 0-1)
 *   [S8] 08-indonesian-slang-2026.ts — Gen-Z Indonesian slang virality scores
 *   [S9] 09-hindi-slang-2026.ts — Gen-Z Hindi slang (Devanagari)
 *   [S10] 10-global-english-slang-2026.ts — Global English slang scores
 *   [M] Manual curation — Based on viral content analysis
 *
 * LICENSING NOTE: This is an independently curated lexicon, NOT a redistribution
 * of the NRC Emotion Lexicon. Intensity values are derived from multiple sources
 * and original analysis of viral content patterns.
 *
 * Last updated: 2026-02-08
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type EmotionType =
  | 'anger'
  | 'anticipation'
  | 'disgust'
  | 'fear'
  | 'joy'
  | 'sadness'
  | 'surprise'
  | 'trust'
  | 'desire';

export interface EmotionEntry {
  /** Primary emotion this word triggers */
  emotion: EmotionType;
  /** Intensity 0.0 (neutral) → 1.0 (maximum) */
  intensity: number;
  /** Optional secondary emotion */
  secondary?: EmotionType;
  /** Source reference */
  source: string;
}

export type EmotionLexicon = Record<string, EmotionEntry>;

// ═══════════════════════════════════════════════════════════════
// ENGLISH LEXICON
// ═══════════════════════════════════════════════════════════════

export const LEXICON_EN: EmotionLexicon = {
  // ── ANGER ──
  'angry': { emotion: 'anger', intensity: 0.85, source: '[K]' },
  'furious': { emotion: 'anger', intensity: 0.95, source: '[K]' },
  'hate': { emotion: 'anger', intensity: 0.9, source: '[K]' },
  'sick of': { emotion: 'anger', intensity: 0.7, source: '[M]' },
  'tired of': { emotion: 'anger', intensity: 0.6, source: '[M]' },
  'frustrated': { emotion: 'anger', intensity: 0.75, source: '[K]' },
  'scam': { emotion: 'anger', intensity: 0.8, secondary: 'disgust', source: '[M]' },
  'ripped off': { emotion: 'anger', intensity: 0.8, source: '[M]' },
  'unfair': { emotion: 'anger', intensity: 0.7, source: '[K]' },
  'outrageous': { emotion: 'anger', intensity: 0.8, source: '[K]' },
  'cooked': { emotion: 'anger', intensity: 0.5, secondary: 'surprise', source: '[S10]' },

  // ── ANTICIPATION ──
  'finally': { emotion: 'anticipation', intensity: 0.7, source: '[K]' },
  'waiting': { emotion: 'anticipation', intensity: 0.6, source: '[K]' },
  'excited': { emotion: 'anticipation', intensity: 0.85, secondary: 'joy', source: '[K]' },
  'can\'t wait': { emotion: 'anticipation', intensity: 0.85, source: '[M]' },
  'upcoming': { emotion: 'anticipation', intensity: 0.5, source: '[K]' },
  'about to': { emotion: 'anticipation', intensity: 0.6, source: '[M]' },
  'coming soon': { emotion: 'anticipation', intensity: 0.65, source: '[M]' },
  'ready': { emotion: 'anticipation', intensity: 0.6, source: '[K]' },
  'lock in': { emotion: 'anticipation', intensity: 0.7, secondary: 'trust', source: '[S10]' },

  // ── DISGUST ──
  'cringe': { emotion: 'disgust', intensity: 0.7, source: '[S10]' },
  'ick': { emotion: 'disgust', intensity: 0.75, source: '[S10]' },
  'gross': { emotion: 'disgust', intensity: 0.8, source: '[K]' },
  'toxic': { emotion: 'disgust', intensity: 0.7, secondary: 'anger', source: '[S10]' },
  'mid': { emotion: 'disgust', intensity: 0.4, source: '[S10]' },
  'trash': { emotion: 'disgust', intensity: 0.75, source: '[M]' },
  'garbage': { emotion: 'disgust', intensity: 0.8, source: '[M]' },
  'sus': { emotion: 'disgust', intensity: 0.5, secondary: 'fear', source: '[S10]' },
  'red flag': { emotion: 'disgust', intensity: 0.7, secondary: 'fear', source: '[S10]' },

  // ── FEAR ──
  'scary': { emotion: 'fear', intensity: 0.75, source: '[K]' },
  'terrifying': { emotion: 'fear', intensity: 0.95, source: '[K]' },
  'warning': { emotion: 'fear', intensity: 0.7, source: '[K]' },
  'danger': { emotion: 'fear', intensity: 0.85, source: '[K]' },
  'risk': { emotion: 'fear', intensity: 0.6, source: '[K]' },
  'afraid': { emotion: 'fear', intensity: 0.8, source: '[K]' },
  'nightmare': { emotion: 'fear', intensity: 0.85, source: '[K]' },
  'losing': { emotion: 'fear', intensity: 0.7, secondary: 'sadness', source: '[M]' },
  'fail': { emotion: 'fear', intensity: 0.7, source: '[K]' },
  'mistake': { emotion: 'fear', intensity: 0.6, secondary: 'anger', source: '[K]' },
  'behind': { emotion: 'fear', intensity: 0.5, source: '[M]' },
  'missing out': { emotion: 'fear', intensity: 0.75, secondary: 'anticipation', source: '[M]' },

  // ── JOY ──
  'amazing': { emotion: 'joy', intensity: 0.85, source: '[K]' },
  'incredible': { emotion: 'joy', intensity: 0.9, source: '[K]' },
  'love': { emotion: 'joy', intensity: 0.9, source: '[K]' },
  'perfect': { emotion: 'joy', intensity: 0.85, source: '[K]' },
  'beautiful': { emotion: 'joy', intensity: 0.8, source: '[K]' },
  'fire': { emotion: 'joy', intensity: 0.8, source: '[S10]' },
  'slay': { emotion: 'joy', intensity: 0.85, secondary: 'trust', source: '[S10]' },
  'ate': { emotion: 'joy', intensity: 0.8, source: '[S10]' },
  'hits different': { emotion: 'joy', intensity: 0.75, source: '[S10]' },
  'glow up': { emotion: 'joy', intensity: 0.8, secondary: 'surprise', source: '[S10]' },
  'blessed': { emotion: 'joy', intensity: 0.75, source: '[K]' },
  'happy': { emotion: 'joy', intensity: 0.8, source: '[K]' },
  'best': { emotion: 'joy', intensity: 0.7, source: '[K]' },
  'let them cook': { emotion: 'joy', intensity: 0.6, secondary: 'anticipation', source: '[S10]' },
  // ── SADNESS ──
  'sad': { emotion: 'sadness', intensity: 0.75, source: '[K]' },
  'heartbroken': { emotion: 'sadness', intensity: 0.95, source: '[K]' },
  'lonely': { emotion: 'sadness', intensity: 0.8, source: '[K]' },
  'depressing': { emotion: 'sadness', intensity: 0.85, source: '[K]' },
  'wasted': { emotion: 'sadness', intensity: 0.6, source: '[K]' },
  'regret': { emotion: 'sadness', intensity: 0.8, source: '[K]' },
  'miss': { emotion: 'sadness', intensity: 0.65, source: '[K]' },
  'ghosting': { emotion: 'sadness', intensity: 0.6, secondary: 'anger', source: '[S10]' },

  // ── SURPRISE ──
  'shocking': { emotion: 'surprise', intensity: 0.9, source: '[K]' },
  'insane': { emotion: 'surprise', intensity: 0.85, source: '[S10]' },
  'unbelievable': { emotion: 'surprise', intensity: 0.85, source: '[K]' },
  'crazy': { emotion: 'surprise', intensity: 0.75, source: '[K]' },
  'literally': { emotion: 'surprise', intensity: 0.4, source: '[S10]' },
  'wait': { emotion: 'surprise', intensity: 0.5, secondary: 'anticipation', source: '[M]' },
  'plot twist': { emotion: 'surprise', intensity: 0.85, source: '[M]' },
  'mind-blowing': { emotion: 'surprise', intensity: 0.9, source: '[K]' },
  'caught in 4K': { emotion: 'surprise', intensity: 0.75, source: '[S10]' },
  'exposed': { emotion: 'surprise', intensity: 0.8, secondary: 'fear', source: '[M]' },
  'what': { emotion: 'surprise', intensity: 0.4, source: '[M]' },
  'actually': { emotion: 'surprise', intensity: 0.3, source: '[M]' },
  'turns out': { emotion: 'surprise', intensity: 0.6, source: '[M]' },

  // ── TRUST ──
  'proven': { emotion: 'trust', intensity: 0.8, source: '[K]' },
  'guaranteed': { emotion: 'trust', intensity: 0.85, source: '[K]' },
  'trusted': { emotion: 'trust', intensity: 0.85, source: '[K]' },
  'safe': { emotion: 'trust', intensity: 0.7, source: '[K]' },
  'reliable': { emotion: 'trust', intensity: 0.75, source: '[K]' },
  'honest': { emotion: 'trust', intensity: 0.8, source: '[K]' },
  'no cap': { emotion: 'trust', intensity: 0.6, source: '[S10]' },
  'fr': { emotion: 'trust', intensity: 0.5, source: '[S10]' },
  'bet': { emotion: 'trust', intensity: 0.5, secondary: 'anticipation', source: '[S10]' },
  'recommend': { emotion: 'trust', intensity: 0.65, source: '[K]' },
  'works': { emotion: 'trust', intensity: 0.6, source: '[M]' },
  'tested': { emotion: 'trust', intensity: 0.7, source: '[M]' },

  // ── DESIRE ──
  'want': { emotion: 'desire', intensity: 0.6, source: '[M]' },
  'need': { emotion: 'desire', intensity: 0.7, source: '[M]' },
  'free': { emotion: 'desire', intensity: 0.85, source: '[M]' },
  'secret': { emotion: 'desire', intensity: 0.8, secondary: 'anticipation', source: '[M]' },
  'exclusive': { emotion: 'desire', intensity: 0.75, source: '[M]' },
  'hidden': { emotion: 'desire', intensity: 0.7, secondary: 'anticipation', source: '[M]' },
  'unlock': { emotion: 'desire', intensity: 0.7, source: '[M]' },
  'hack': { emotion: 'desire', intensity: 0.7, secondary: 'surprise', source: '[M]' },
  'dream': { emotion: 'desire', intensity: 0.75, source: '[K]' },
  'wish': { emotion: 'desire', intensity: 0.6, source: '[K]' },
  'save': { emotion: 'desire', intensity: 0.55, source: '[M]' },
  'rizz': { emotion: 'desire', intensity: 0.6, secondary: 'joy', source: '[S10]' },
};

// ═══════════════════════════════════════════════════════════════
// INDONESIAN LEXICON
// ═══════════════════════════════════════════════════════════════

export const LEXICON_ID: EmotionLexicon = {
  // ── ANGER ──
  'marah': { emotion: 'anger', intensity: 0.8, source: '[L]' },
  'kesal': { emotion: 'anger', intensity: 0.7, source: '[L]' },
  'benci': { emotion: 'anger', intensity: 0.85, source: '[L]' },
  'toxic': { emotion: 'anger', intensity: 0.7, secondary: 'disgust', source: '[S8]' },
  'scam': { emotion: 'anger', intensity: 0.8, secondary: 'disgust', source: '[M]' },
  'nipu': { emotion: 'anger', intensity: 0.8, source: '[M]' },
  'kampret': { emotion: 'anger', intensity: 0.75, source: '[L]' },
  'sebel': { emotion: 'anger', intensity: 0.6, source: '[L]' },
  'emosi': { emotion: 'anger', intensity: 0.75, source: '[L]' },
  'capek': { emotion: 'anger', intensity: 0.5, secondary: 'sadness', source: '[L]' },

  // ── ANTICIPATION ──
  'akhirnya': { emotion: 'anticipation', intensity: 0.7, secondary: 'joy', source: '[L]' },
  'penasaran': { emotion: 'anticipation', intensity: 0.8, source: '[L]' },
  'nanti': { emotion: 'anticipation', intensity: 0.4, source: '[M]' },
  'tunggu': { emotion: 'anticipation', intensity: 0.6, source: '[M]' },
  'siap': { emotion: 'anticipation', intensity: 0.6, source: '[L]' },
  'mau': { emotion: 'anticipation', intensity: 0.5, source: '[M]' },
  'bentar lagi': { emotion: 'anticipation', intensity: 0.6, source: '[M]' },
  'FOMO': { emotion: 'anticipation', intensity: 0.75, secondary: 'fear', source: '[S8]' },

  // ── DISGUST ──
  'cringe': { emotion: 'disgust', intensity: 0.7, source: '[S8]' },
  'red flag': { emotion: 'disgust', intensity: 0.7, secondary: 'fear', source: '[S8]' },
  'jijik': { emotion: 'disgust', intensity: 0.85, source: '[L]' },
  'mual': { emotion: 'disgust', intensity: 0.8, source: '[L]' },
  'alay': { emotion: 'disgust', intensity: 0.6, source: '[L]' },
  'lebay': { emotion: 'disgust', intensity: 0.5, source: '[L]' },
  'norak': { emotion: 'disgust', intensity: 0.65, source: '[L]' },
  'sus': { emotion: 'disgust', intensity: 0.5, source: '[S8]' },

  // ── FEAR ──
  'bahaya': { emotion: 'fear', intensity: 0.85, source: '[L]' },
  'takut': { emotion: 'fear', intensity: 0.8, source: '[L]' },
  'ngeri': { emotion: 'fear', intensity: 0.85, source: '[L]' },
  'serem': { emotion: 'fear', intensity: 0.75, source: '[L]' },
  'gagal': { emotion: 'fear', intensity: 0.7, secondary: 'sadness', source: '[L]' },
  'rugi': { emotion: 'fear', intensity: 0.75, secondary: 'sadness', source: '[L]' },
  'salah': { emotion: 'fear', intensity: 0.6, source: '[L]' },
  'jangan': { emotion: 'fear', intensity: 0.6, source: '[M]' },
  'warning': { emotion: 'fear', intensity: 0.7, source: '[M]' },
  'ancur': { emotion: 'fear', intensity: 0.8, source: '[L]' },

  // ── JOY ──
  'keren': { emotion: 'joy', intensity: 0.75, source: '[L]' },
  'seru': { emotion: 'joy', intensity: 0.8, source: '[L]' },
  'asik': { emotion: 'joy', intensity: 0.7, source: '[L]' },
  'mantap': { emotion: 'joy', intensity: 0.75, source: '[L]' },
  'senang': { emotion: 'joy', intensity: 0.75, source: '[L]' },
  'slay': { emotion: 'joy', intensity: 0.85, source: '[S8]' },
  'healing': { emotion: 'joy', intensity: 0.7, secondary: 'trust', source: '[S8]' },
  'glow up': { emotion: 'joy', intensity: 0.8, secondary: 'surprise', source: '[S8]' },
  'vibes': { emotion: 'joy', intensity: 0.65, source: '[S8]' },
  'chill': { emotion: 'joy', intensity: 0.6, source: '[S8]' },
  'flex': { emotion: 'joy', intensity: 0.65, secondary: 'trust', source: '[S8]' },
  'no cap': { emotion: 'joy', intensity: 0.5, secondary: 'trust', source: '[S8]' },
  'spill': { emotion: 'joy', intensity: 0.6, secondary: 'anticipation', source: '[S8]' },

  // ── SADNESS ──
  'sedih': { emotion: 'sadness', intensity: 0.8, source: '[L]' },
  'galau': { emotion: 'sadness', intensity: 0.7, source: '[L]' },
  'ghosting': { emotion: 'sadness', intensity: 0.6, secondary: 'anger', source: '[S8]' },
  'burnout': { emotion: 'sadness', intensity: 0.75, secondary: 'anger', source: '[S8]' },
  'nyesel': { emotion: 'sadness', intensity: 0.75, source: '[L]' },
  'kecewa': { emotion: 'sadness', intensity: 0.75, source: '[L]' },
  'menyesal': { emotion: 'sadness', intensity: 0.8, source: '[L]' },
  'sia-sia': { emotion: 'sadness', intensity: 0.7, source: '[L]' },

  // ── SURPRISE ──
  'gila': { emotion: 'surprise', intensity: 0.9, source: '[L][S8]' },
  'ternyata': { emotion: 'surprise', intensity: 0.75, secondary: 'anticipation', source: '[L]' },
  'gokil': { emotion: 'surprise', intensity: 0.8, source: '[L]' },
  'anjir': { emotion: 'surprise', intensity: 0.8, source: '[M]' },
  'parah': { emotion: 'surprise', intensity: 0.75, source: '[L]' },
  'shocking': { emotion: 'surprise', intensity: 0.85, source: '[M]' },
  'literally': { emotion: 'surprise', intensity: 0.4, source: '[S8]' },
  'serius': { emotion: 'surprise', intensity: 0.6, source: '[L]' },
  'beneran': { emotion: 'surprise', intensity: 0.6, source: '[M]' },
  'masa': { emotion: 'surprise', intensity: 0.55, source: '[M]' },
  'kok bisa': { emotion: 'surprise', intensity: 0.7, source: '[M]' },
  'plot twist': { emotion: 'surprise', intensity: 0.85, source: '[M]' },
  'brain rot': { emotion: 'surprise', intensity: 0.5, secondary: 'disgust', source: '[S8]' },

  // ── TRUST ──
  'terbukti': { emotion: 'trust', intensity: 0.8, source: '[L]' },
  'aman': { emotion: 'trust', intensity: 0.75, source: '[L]' },
  'percaya': { emotion: 'trust', intensity: 0.8, source: '[L]' },
  'jujur': { emotion: 'trust', intensity: 0.8, source: '[L]' },
  'real': { emotion: 'trust', intensity: 0.6, source: '[M]' },
  'legit': { emotion: 'trust', intensity: 0.7, source: '[M]' },
  'works': { emotion: 'trust', intensity: 0.6, source: '[M]' },
  'recommended': { emotion: 'trust', intensity: 0.65, source: '[M]' },

  // ── DESIRE ──
  'gratis': { emotion: 'desire', intensity: 0.9, source: '[L]' },
  'rahasia': { emotion: 'desire', intensity: 0.85, secondary: 'anticipation', source: '[L]' },
  'pengen': { emotion: 'desire', intensity: 0.65, source: '[L]' },
  'mau banget': { emotion: 'desire', intensity: 0.75, source: '[M]' },
  'passive income': { emotion: 'desire', intensity: 0.8, source: '[M]' },
  'cuan': { emotion: 'desire', intensity: 0.8, secondary: 'joy', source: '[M]' },
  'hack': { emotion: 'desire', intensity: 0.7, source: '[M]' },
  'tips': { emotion: 'desire', intensity: 0.5, source: '[M]' },
  'cara': { emotion: 'desire', intensity: 0.45, source: '[M]' },
  'stecu': { emotion: 'desire', intensity: 0.6, secondary: 'anticipation', source: '[S8]' },
  'bucin': { emotion: 'desire', intensity: 0.7, secondary: 'joy', source: '[S8]' },
  'rizz': { emotion: 'desire', intensity: 0.65, secondary: 'joy', source: '[S8]' },
  'delulu': { emotion: 'desire', intensity: 0.6, secondary: 'joy', source: '[S8]' },
};

// ═══════════════════════════════════════════════════════════════
// HINDI LEXICON (Devanagari script)
// ═══════════════════════════════════════════════════════════════

export const LEXICON_HI: EmotionLexicon = {
  // ── ANGER ──
  'गुस्सा': { emotion: 'anger', intensity: 0.85, source: '[K]' },
  'बकवास': { emotion: 'anger', intensity: 0.7, secondary: 'disgust', source: '[S9]' },
  'फालतू': { emotion: 'anger', intensity: 0.65, source: '[S9]' },
  'धोखा': { emotion: 'anger', intensity: 0.85, secondary: 'sadness', source: '[K]' },
  'scam': { emotion: 'anger', intensity: 0.8, secondary: 'disgust', source: '[M]' },
  'वाट लग गई': { emotion: 'anger', intensity: 0.7, secondary: 'fear', source: '[S9]' },
  'ज्ञान देना': { emotion: 'anger', intensity: 0.5, secondary: 'disgust', source: '[S9]' },
  'गलत': { emotion: 'anger', intensity: 0.65, source: '[K]' },

  // ── ANTICIPATION ──
  'आखिरकार': { emotion: 'anticipation', intensity: 0.7, secondary: 'joy', source: '[K]' },
  'रुको': { emotion: 'anticipation', intensity: 0.6, source: '[M]' },
  'देखो': { emotion: 'anticipation', intensity: 0.5, source: '[S9]' },
  'अभी': { emotion: 'anticipation', intensity: 0.55, source: '[M]' },
  'सीन': { emotion: 'anticipation', intensity: 0.6, source: '[S9]' },
  'सीन tight है': { emotion: 'anticipation', intensity: 0.7, secondary: 'trust', source: '[S9]' },

  // ── DISGUST ──
  'cringe': { emotion: 'disgust', intensity: 0.7, source: '[M]' },
  'घंटा': { emotion: 'disgust', intensity: 0.7, secondary: 'anger', source: '[S9]' },
  'फट्टू': { emotion: 'disgust', intensity: 0.6, source: '[S9]' },
  'red flag': { emotion: 'disgust', intensity: 0.7, secondary: 'fear', source: '[M]' },

  // ── FEAR ──
  'खतरा': { emotion: 'fear', intensity: 0.85, source: '[K]' },
  'डर': { emotion: 'fear', intensity: 0.8, source: '[K]' },
  'गलती': { emotion: 'fear', intensity: 0.65, secondary: 'sadness', source: '[K]' },
  'warning': { emotion: 'fear', intensity: 0.7, source: '[M]' },
  'कांड': { emotion: 'fear', intensity: 0.75, secondary: 'surprise', source: '[S9]' },
  'danger': { emotion: 'fear', intensity: 0.8, source: '[M]' },

  // ── JOY ──
  'झकास': { emotion: 'joy', intensity: 0.8, source: '[S9]' },
  'मस्त': { emotion: 'joy', intensity: 0.75, source: '[S9]' },
  'बिंदास': { emotion: 'joy', intensity: 0.7, source: '[S9]' },
  'क्या बात है': { emotion: 'joy', intensity: 0.85, source: '[S9]' },
  'सॉलिड': { emotion: 'joy', intensity: 0.7, source: '[S9]' },
  'कड़क': { emotion: 'joy', intensity: 0.7, source: '[S9]' },
  'बहोत hard': { emotion: 'joy', intensity: 0.85, secondary: 'surprise', source: '[S9]' },
  'fire': { emotion: 'joy', intensity: 0.8, source: '[M]' },
  'slay': { emotion: 'joy', intensity: 0.8, source: '[M]' },
  'चिल मार': { emotion: 'joy', intensity: 0.6, source: '[S9]' },
  'खुश': { emotion: 'joy', intensity: 0.8, source: '[K]' },
  'शानदार': { emotion: 'joy', intensity: 0.85, source: '[K]' },

  // ── SADNESS ──
  'दुखी': { emotion: 'sadness', intensity: 0.8, source: '[K]' },
  'अकेला': { emotion: 'sadness', intensity: 0.75, source: '[K]' },
  'पछतावा': { emotion: 'sadness', intensity: 0.8, source: '[K]' },
  'ghosting': { emotion: 'sadness', intensity: 0.6, secondary: 'anger', source: '[M]' },
  'burnout': { emotion: 'sadness', intensity: 0.7, secondary: 'anger', source: '[M]' },

  // ── SURPRISE ──
  'फाडू': { emotion: 'surprise', intensity: 0.85, secondary: 'joy', source: '[S9]' },
  'shocking': { emotion: 'surprise', intensity: 0.85, source: '[M]' },
  'insane': { emotion: 'surprise', intensity: 0.8, source: '[M]' },
  'सच': { emotion: 'surprise', intensity: 0.6, secondary: 'trust', source: '[S9]' },
  'पता है': { emotion: 'surprise', intensity: 0.5, secondary: 'anticipation', source: '[M]' },
  'literally': { emotion: 'surprise', intensity: 0.4, source: '[M]' },
  'असली': { emotion: 'surprise', intensity: 0.55, secondary: 'trust', source: '[S9]' },
  'plot twist': { emotion: 'surprise', intensity: 0.85, source: '[M]' },
  'पटाका': { emotion: 'surprise', intensity: 0.7, secondary: 'joy', source: '[S9]' },

  // ── TRUST ──
  'भरोसा': { emotion: 'trust', intensity: 0.85, source: '[K]' },
  'proven': { emotion: 'trust', intensity: 0.8, source: '[M]' },
  'tested': { emotion: 'trust', intensity: 0.7, source: '[M]' },
  'guarantee': { emotion: 'trust', intensity: 0.8, source: '[M]' },
  'real': { emotion: 'trust', intensity: 0.6, source: '[M]' },

  // ── DESIRE ──
  'free': { emotion: 'desire', intensity: 0.9, source: '[M]' },
  'राज़': { emotion: 'desire', intensity: 0.85, secondary: 'anticipation', source: '[K]' },
  'जुगाड़': { emotion: 'desire', intensity: 0.8, secondary: 'surprise', source: '[S9]' },
  'hack': { emotion: 'desire', intensity: 0.7, source: '[M]' },
  'तरीका': { emotion: 'desire', intensity: 0.5, source: '[M]' },
  'चाहिए': { emotion: 'desire', intensity: 0.6, source: '[K]' },
  'सपना': { emotion: 'desire', intensity: 0.7, source: '[K]' },
};

// ═══════════════════════════════════════════════════════════════
// LEXICON ACCESSOR
// ═══════════════════════════════════════════════════════════════

const LEXICONS: Record<string, EmotionLexicon> = {
  en: LEXICON_EN,
  id: LEXICON_ID,
  hi: LEXICON_HI,
};

/**
 * Get the emotion lexicon for a language. Falls back to English.
 */
export function getLexicon(language: string): EmotionLexicon {
  return LEXICONS[language] || LEXICONS.en;
}

// ═══════════════════════════════════════════════════════════════
// EMOTION ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export interface EmotionAnalysis {
  /** Dominant emotion in the text */
  dominant: EmotionType;
  /** Overall emotional intensity (0.0-1.0) */
  intensity: number;
  /** Per-emotion intensity breakdown */
  breakdown: Partial<Record<EmotionType, number>>;
  /** Number of emotion-bearing words found */
  wordCount: number;
  /** Matched words with their emotions */
  matches: Array<{ word: string; emotion: EmotionType; intensity: number }>;
}

/**
 * Analyze the emotional content of a text segment.
 *
 * Scans text for known emotion words and computes:
 * - Dominant emotion (highest cumulative intensity)
 * - Overall intensity (average of matched word intensities)
 * - Per-emotion breakdown
 *
 * @param text - The text to analyze
 * @param language - Language code (en, id, hi)
 * @returns Emotion analysis result
 */
export function analyzeEmotion(text: string, language: string): EmotionAnalysis {
  const lexicon = getLexicon(language);
  const lowerText = text.toLowerCase();
  const emotionSums: Partial<Record<EmotionType, number>> = {};
  const emotionCounts: Partial<Record<EmotionType, number>> = {};
  const matches: Array<{ word: string; emotion: EmotionType; intensity: number }> = [];

  // Sort lexicon entries by word length (longest first) to match multi-word phrases first
  const entries = Object.entries(lexicon).sort((a, b) => b[0].length - a[0].length);

  const matchedPositions = new Set<number>();

  for (const [word, entry] of entries) {
    const lowerWord = word.toLowerCase();
    // For short words (≤3 chars), use word boundary matching to avoid substring false positives
    // For longer words and multi-word phrases, substring matching is fine
    const useWordBoundary = lowerWord.length <= 3 && !lowerWord.includes(' ');

    let searchFrom = 0;
    let idx = lowerText.indexOf(lowerWord, searchFrom);

    while (idx !== -1) {
      // Word boundary check for short words
      if (useWordBoundary) {
        const charBefore = idx > 0 ? lowerText[idx - 1] : ' ';
        const charAfter = idx + lowerWord.length < lowerText.length ? lowerText[idx + lowerWord.length] : ' ';
        const isWordBoundaryBefore = /[\s,.!?;:'"()\-—]/.test(charBefore) || idx === 0;
        const isWordBoundaryAfter = /[\s,.!?;:'"()\-—]/.test(charAfter) || idx + lowerWord.length === lowerText.length;
        if (!isWordBoundaryBefore || !isWordBoundaryAfter) {
          searchFrom = idx + 1;
          idx = lowerText.indexOf(lowerWord, searchFrom);
          continue;
        }
      }

      // Check if this position was already matched by a longer phrase
      let alreadyMatched = false;
      for (let i = idx; i < idx + lowerWord.length; i++) {
        if (matchedPositions.has(i)) {
          alreadyMatched = true;
          break;
        }
      }

      if (!alreadyMatched) {
        // Mark positions
        for (let i = idx; i < idx + lowerWord.length; i++) {
          matchedPositions.add(i);
        }

        matches.push({ word, emotion: entry.emotion, intensity: entry.intensity });

        emotionSums[entry.emotion] = (emotionSums[entry.emotion] || 0) + entry.intensity;
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;

        // Count secondary emotion at half weight
        if (entry.secondary) {
          emotionSums[entry.secondary] = (emotionSums[entry.secondary] || 0) + entry.intensity * 0.5;
          emotionCounts[entry.secondary] = (emotionCounts[entry.secondary] || 0) + 0.5;
        }
      }

      searchFrom = idx + 1;
      idx = lowerText.indexOf(lowerWord, searchFrom);
    }
  }

  // Find dominant emotion
  let dominant: EmotionType = 'anticipation';
  let maxSum = 0;
  for (const [emotion, sum] of Object.entries(emotionSums)) {
    if (sum > maxSum) {
      maxSum = sum;
      dominant = emotion as EmotionType;
    }
  }

  // Calculate overall intensity
  const totalIntensity = matches.reduce((acc, m) => acc + m.intensity, 0);
  const intensity = matches.length > 0
    ? Math.min(1.0, totalIntensity / Math.max(1, matches.length))
    : 0.3; // Default low intensity for text with no emotion words

  // Normalize breakdown to 0.0-1.0 per emotion
  const breakdown: Partial<Record<EmotionType, number>> = {};
  const maxEmotionSum = Math.max(1, ...Object.values(emotionSums));
  for (const [emotion, sum] of Object.entries(emotionSums)) {
    breakdown[emotion as EmotionType] = Math.round((sum / maxEmotionSum) * 100) / 100;
  }

  return {
    dominant,
    intensity: Math.round(intensity * 100) / 100,
    breakdown,
    wordCount: matches.length,
    matches,
  };
}

/**
 * Calculate emotion intensity for an array of segments.
 * Returns per-segment intensity for the Emotion Arc chart.
 *
 * @param segments - Array of segment texts
 * @param language - Language code
 * @returns Array of intensity values (0.0-1.0) per segment
 */
export function calculateEmotionArc(
  segments: string[],
  language: string
): number[] {
  return segments.map(text => {
    const analysis = analyzeEmotion(text, language);
    return analysis.intensity;
  });
}

/**
 * Get the dominant emotion per segment for visualization.
 *
 * @param segments - Array of segment texts
 * @param language - Language code
 * @returns Array of { emotion, intensity } per segment
 */
export function getEmotionTimeline(
  segments: string[],
  language: string
): Array<{ emotion: EmotionType; intensity: number }> {
  return segments.map(text => {
    const analysis = analyzeEmotion(text, language);
    return { emotion: analysis.dominant, intensity: analysis.intensity };
  });
}

// ═══════════════════════════════════════════════════════════════
// EMOTION → COLOR MAPPING (for UI visualization)
// ═══════════════════════════════════════════════════════════════

export const EMOTION_COLORS: Record<EmotionType, { bg: string; text: string; label: string }> = {
  anger:        { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Anger' },
  anticipation: { bg: 'bg-orange-500/20',  text: 'text-orange-400',  label: 'Anticipation' },
  disgust:      { bg: 'bg-lime-500/20',    text: 'text-lime-400',    label: 'Disgust' },
  fear:         { bg: 'bg-purple-500/20',  text: 'text-purple-400',  label: 'Fear' },
  joy:          { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  label: 'Joy' },
  sadness:      { bg: 'bg-blue-500/20',    text: 'text-blue-400',    label: 'Sadness' },
  surprise:     { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    label: 'Surprise' },
  trust:        { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Trust' },
  desire:       { bg: 'bg-pink-500/20',    text: 'text-pink-400',    label: 'Desire' },
};
