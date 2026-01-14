/**
 * Word Limit Calculator for Sparkfluence
 * 
 * Based on speaking rates (Words Per Minute):
 * - Indonesian: 130 WPM
 * - English: 150 WPM
 * - Hindi: 120 WPM
 * 
 * Safety margin: 80% of max to account for pauses/breaths
 * 
 * Example: 5s Indonesian = (130 / 60) × 5 × 0.8 = 8.67 ≈ 9 words
 */

export type LanguageCode = 'id' | 'en' | 'hi';

// Words per minute by language
const WPM: Record<LanguageCode, number> = {
  id: 130,  // Indonesian
  en: 150,  // English
  hi: 120,  // Hindi
};

// Safety margin (80% of max capacity)
const SAFETY_MARGIN = 0.8;

/**
 * Calculate max words for a given duration and language
 */
export function getMaxWords(durationSeconds: number, language: LanguageCode = 'id'): number {
  const wpm = WPM[language] || WPM.en;
  const wordsPerSecond = wpm / 60;
  const maxWords = wordsPerSecond * durationSeconds * SAFETY_MARGIN;
  return Math.floor(maxWords);
}

/**
 * Count words in text (handles multiple languages)
 * - Splits by whitespace
 * - Filters out empty strings
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Word limit status types
 */
export type WordLimitStatus = 'ok' | 'warning' | 'error';

export interface WordLimitResult {
  count: number;
  max: number;
  percentage: number;
  status: WordLimitStatus;
  overBy: number;
}

/**
 * Get word limit status for a text
 * 
 * @param text - Script text to check
 * @param durationSeconds - Segment duration in seconds
 * @param language - Language code ('id', 'en', 'hi')
 * @returns WordLimitResult with count, max, percentage, status, overBy
 * 
 * Status thresholds:
 * - OK: ≤80% of max
 * - Warning: 81-100% of max
 * - Error: >100% of max
 */
export function getWordLimitStatus(
  text: string,
  durationSeconds: number,
  language: LanguageCode = 'id'
): WordLimitResult {
  const count = countWords(text);
  const max = getMaxWords(durationSeconds, language);
  const percentage = max > 0 ? Math.round((count / max) * 100) : 0;
  
  let status: WordLimitStatus = 'ok';
  if (percentage > 100) {
    status = 'error';
  } else if (percentage > 80) {
    status = 'warning';
  }
  
  const overBy = Math.max(0, count - max);
  
  return {
    count,
    max,
    percentage,
    status,
    overBy
  };
}

/**
 * Pre-calculated word limits table for quick reference
 * Format: { durationSeconds: { id: max, en: max, hi: max } }
 */
export const WORD_LIMITS_TABLE: Record<number, Record<LanguageCode, number>> = {
  3: { id: 5, en: 6, hi: 5 },
  5: { id: 9, en: 10, hi: 8 },
  7: { id: 12, en: 14, hi: 11 },
  8: { id: 14, en: 16, hi: 13 },
  10: { id: 17, en: 20, hi: 16 },
  12: { id: 21, en: 24, hi: 19 },
  15: { id: 26, en: 30, hi: 24 },
};

/**
 * Get word limit from pre-calculated table (faster lookup)
 * Falls back to calculation if duration not in table
 */
export function getMaxWordsFromTable(durationSeconds: number, language: LanguageCode = 'id'): number {
  const tableEntry = WORD_LIMITS_TABLE[durationSeconds];
  if (tableEntry) {
    return tableEntry[language] || tableEntry.en;
  }
  return getMaxWords(durationSeconds, language);
}

/**
 * Format word count display string
 * Example: "24/12 words" or "24 words (over by 12)"
 */
export function formatWordCount(result: WordLimitResult, language: LanguageCode = 'id'): string {
  const labels = {
    id: { words: 'kata', overBy: 'lebih' },
    en: { words: 'words', overBy: 'over by' },
    hi: { words: 'शब्द', overBy: 'अधिक' },
  };
  
  const label = labels[language] || labels.en;
  
  if (result.status === 'error') {
    return `${result.count}/${result.max} ${label.words} (${label.overBy} ${result.overBy})`;
  }
  return `${result.count}/${result.max} ${label.words}`;
}
