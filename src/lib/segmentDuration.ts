/**
 * Auto-Duration Logic for Sparkfluence v2.0 (UPDATED)
 *
 * User NEVER manually selects duration - it's auto-calculated based on:
 * 1. Segment type (HOOK, FORE, BODY, PEAK, CTA, LOOP-END)
 * 2. Total video duration (30s, 60s, 90s)
 *
 * Updated Rules (Jan 14, 2026) - VEO 3.1 HD Compatibility:
 * - HOOK: Always 5s (quick attention grab)
 * - FORE (Foreshadowing): 5-8s depending on video length
 * - BODY-X: Always 8s (VEO 3.1 max duration)
 * - PEAK: 5-8s depending on video length
 * - CTA: 5-8s depending on video length
 * - LOOP-END: Always 5s (quick loop back)
 *
 * Strategy:
 * - 30s videos: Tight segments (mostly 5s)
 * - 60s videos: Standard segments (mix 5s+8s)
 * - 90s videos: Spacious segments (more 8s)
 *
 * NOTE: VEO 3.1 HD max duration is 8 seconds, so all 10s changed to 8s
 */

export type SegmentType = 'HOOK' | 'FORE' | 'BODY-1' | 'BODY-2' | 'BODY-3' | 'BODY-4' | 'BODY-5' | 'PEAK' | 'CTA' | 'LOOP-END';
export type VideoDuration = '30s' | '60s' | '90s';

/**
 * Calculate duration for a segment based on its type and video duration
 */
export function calculateSegmentDuration(
  segmentType: string,
  videoDuration: VideoDuration
): number {
  // Normalize segment type (handle BODY-X variants)
  const normalizedType = segmentType.toUpperCase();

  // HOOK: Always 5s (quick attention grab)
  if (normalizedType === 'HOOK') {
    return 5;
  }

  // LOOP-END: Always 5s (quick loop back)
  if (normalizedType === 'LOOP-END') {
    return 5;
  }

  // FORE (Foreshadowing): Varies by video length
  if (normalizedType === 'FORE') {
    return videoDuration === '30s' ? 5 : 8;  // VEO 3.1 max 8s
  }

  // BODY-X: Always 8s (VEO 3.1 max duration)
  if (normalizedType.startsWith('BODY')) {
    return 8;  // VEO 3.1 max 8s
  }

  // PEAK: Varies by video length (climax needs time)
  if (normalizedType === 'PEAK') {
    return videoDuration === '30s' ? 5 : 8;  // VEO 3.1 max 8s
  }

  // CTA: Varies by video length (call-to-action needs clarity)
  if (normalizedType === 'CTA') {
    return videoDuration === '30s' ? 5 : 8;  // VEO 3.1 max 8s
  }

  // Default fallback (should rarely happen)
  return 5;
}

/**
 * Calculate total video duration from all segments
 */
export function calculateTotalDuration(
  segments: Array<{ type: string; durationSeconds?: number }>,
  videoDuration: VideoDuration
): number {
  return segments.reduce((total, segment) => {
    const duration = segment.durationSeconds || calculateSegmentDuration(segment.type, videoDuration);
    return total + duration;
  }, 0);
}

/**
 * Validate if segment durations match expected total
 */
export function validateTotalDuration(
  segments: Array<{ type: string; durationSeconds?: number }>,
  videoDuration: VideoDuration
): { valid: boolean; actual: number; expected: number } {
  const actual = calculateTotalDuration(segments, videoDuration);
  const expected = parseInt(videoDuration); // '30s' -> 30

  return {
    valid: actual === expected,
    actual,
    expected
  };
}

/**
 * Auto-assign durations to segments based on video duration
 * Returns new segments array with durationSeconds populated
 */
export function assignSegmentDurations<T extends { type: string }>(
  segments: T[],
  videoDuration: VideoDuration
): Array<T & { durationSeconds: number }> {
  return segments.map(segment => ({
    ...segment,
    durationSeconds: calculateSegmentDuration(segment.type, videoDuration)
  }));
}

/**
 * Get duration display text for a segment
 */
export function getSegmentDurationText(
  segmentType: string,
  videoDuration: VideoDuration
): string {
  const duration = calculateSegmentDuration(segmentType, videoDuration);
  return `${duration}s`;
}

/**
 * Get duration explanation for UI
 */
export function getDurationExplanation(
  segmentType: string,
  videoDuration: VideoDuration
): string {
  const normalizedType = segmentType.toUpperCase();
  const duration = calculateSegmentDuration(segmentType, videoDuration);

  // HOOK: Always 5s
  if (normalizedType === 'HOOK') {
    return `${duration}s (quick attention grab)`;
  }

  // LOOP-END: Always 5s
  if (normalizedType === 'LOOP-END') {
    return `${duration}s (quick loop back)`;
  }

  // FORE: Varies
  if (normalizedType === 'FORE') {
    return videoDuration === '30s'
      ? `${duration}s (tight pacing)`
      : `${duration}s (setup time, VEO 3.1 max)`;
  }

  // BODY-X: Always 8s (VEO 3.1 max)
  if (normalizedType.startsWith('BODY')) {
    return `${duration}s (VEO 3.1 max duration)`;
  }

  // PEAK: Varies
  if (normalizedType === 'PEAK') {
    return videoDuration === '30s'
      ? `${duration}s (quick climax)`
      : `${duration}s (climax build)`;
  }

  // CTA: Varies
  if (normalizedType === 'CTA') {
    return videoDuration === '30s'
      ? `${duration}s (quick CTA)`
      : `${duration}s (clear CTA)`;
  }

  return `${duration}s (auto)`;
}
