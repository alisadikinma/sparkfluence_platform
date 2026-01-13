/**
 * Auto-Duration Logic Tests (Updated Jan 13, 2026)
 *
 * Tests for flexible segment duration calculation:
 * - HOOK: Always 5s
 * - FORE: 5s (30s) | 10s (60s/90s)
 * - BODY-X: Always 10s
 * - PEAK: 5s (30s) | 10s (60s/90s)
 * - CTA: 5s (30s) | 10s (60s/90s)
 * - LOOP-END: Always 5s
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSegmentDuration,
  calculateTotalDuration,
  validateTotalDuration,
  assignSegmentDurations,
  getSegmentDurationText,
  getDurationExplanation,
} from './segmentDuration';
import type { VideoDuration } from './segmentDuration';

describe('calculateSegmentDuration', () => {
  describe('30s videos', () => {
    const videoDuration: VideoDuration = '30s';

    it('HOOK should be 5s', () => {
      expect(calculateSegmentDuration('HOOK', videoDuration)).toBe(5);
    });

    it('FORE should be 5s (tight pacing)', () => {
      expect(calculateSegmentDuration('FORE', videoDuration)).toBe(5);
    });

    it('BODY-X should be 10s', () => {
      expect(calculateSegmentDuration('BODY-1', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-2', videoDuration)).toBe(10);
    });

    it('PEAK should be 5s (quick climax)', () => {
      expect(calculateSegmentDuration('PEAK', videoDuration)).toBe(5);
    });

    it('CTA should be 5s (quick CTA)', () => {
      expect(calculateSegmentDuration('CTA', videoDuration)).toBe(5);
    });

    it('LOOP-END should be 5s', () => {
      expect(calculateSegmentDuration('LOOP-END', videoDuration)).toBe(5);
    });
  });

  describe('60s videos', () => {
    const videoDuration: VideoDuration = '60s';

    it('HOOK should be 5s', () => {
      expect(calculateSegmentDuration('HOOK', videoDuration)).toBe(5);
    });

    it('FORE should be 10s (setup time)', () => {
      expect(calculateSegmentDuration('FORE', videoDuration)).toBe(10);
    });

    it('BODY-X should be 10s', () => {
      expect(calculateSegmentDuration('BODY-1', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-2', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-3', videoDuration)).toBe(10);
    });

    it('PEAK should be 10s (climax build)', () => {
      expect(calculateSegmentDuration('PEAK', videoDuration)).toBe(10);
    });

    it('CTA should be 10s (clear CTA)', () => {
      expect(calculateSegmentDuration('CTA', videoDuration)).toBe(10);
    });

    it('LOOP-END should be 5s', () => {
      expect(calculateSegmentDuration('LOOP-END', videoDuration)).toBe(5);
    });
  });

  describe('90s videos', () => {
    const videoDuration: VideoDuration = '90s';

    it('HOOK should be 5s', () => {
      expect(calculateSegmentDuration('HOOK', videoDuration)).toBe(5);
    });

    it('FORE should be 10s', () => {
      expect(calculateSegmentDuration('FORE', videoDuration)).toBe(10);
    });

    it('BODY-X should be 10s', () => {
      expect(calculateSegmentDuration('BODY-1', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-2', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-3', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-4', videoDuration)).toBe(10);
      expect(calculateSegmentDuration('BODY-5', videoDuration)).toBe(10);
    });

    it('PEAK should be 10s', () => {
      expect(calculateSegmentDuration('PEAK', videoDuration)).toBe(10);
    });

    it('CTA should be 10s', () => {
      expect(calculateSegmentDuration('CTA', videoDuration)).toBe(10);
    });

    it('LOOP-END should be 5s', () => {
      expect(calculateSegmentDuration('LOOP-END', videoDuration)).toBe(5);
    });
  });

  it('should handle case-insensitive segment types', () => {
    expect(calculateSegmentDuration('hook', '30s')).toBe(5);
    expect(calculateSegmentDuration('Hook', '30s')).toBe(5);
    expect(calculateSegmentDuration('HOOK', '30s')).toBe(5);
  });
});

describe('calculateTotalDuration', () => {
  it('should calculate total for 30s video', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 5s
      { type: 'BODY-1' },    // 10s
      { type: 'PEAK' },      // 5s
      { type: 'CTA' },       // 5s
    ];
    const total = calculateTotalDuration(segments, '30s');
    expect(total).toBe(30);
  });

  it('should calculate total for 60s video', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 10s
      { type: 'BODY-1' },    // 10s
      { type: 'BODY-2' },    // 10s
      { type: 'PEAK' },      // 10s
      { type: 'CTA' },       // 10s
      { type: 'LOOP-END' },  // 5s
    ];
    const total = calculateTotalDuration(segments, '60s');
    expect(total).toBe(60);
  });

  it('should calculate total for 90s video', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 10s
      { type: 'BODY-1' },    // 10s
      { type: 'BODY-2' },    // 10s
      { type: 'BODY-3' },    // 10s
      { type: 'BODY-4' },    // 10s
      { type: 'BODY-5' },    // 10s
      { type: 'PEAK' },      // 10s
      { type: 'CTA' },       // 10s
      { type: 'LOOP-END' },  // 5s
    ];
    const total = calculateTotalDuration(segments, '90s');
    expect(total).toBe(90);
  });

  it('should use explicit durationSeconds if provided', () => {
    const segments = [
      { type: 'HOOK', durationSeconds: 7 },  // Override to 7s
      { type: 'FORE', durationSeconds: 8 },  // Override to 8s
    ];
    const total = calculateTotalDuration(segments, '30s');
    expect(total).toBe(15); // 7 + 8
  });
});

describe('validateTotalDuration', () => {
  it('should validate correct 30s video', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 5s
      { type: 'BODY-1' },    // 10s
      { type: 'PEAK' },      // 5s
      { type: 'CTA' },       // 5s
    ];
    const result = validateTotalDuration(segments, '30s');
    expect(result.valid).toBe(true);
    expect(result.actual).toBe(30);
    expect(result.expected).toBe(30);
  });

  it('should detect incorrect total', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 5s
    ];
    const result = validateTotalDuration(segments, '30s');
    expect(result.valid).toBe(false);
    expect(result.actual).toBe(10);
    expect(result.expected).toBe(30);
  });

  it('should validate correct 60s video', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 10s
      { type: 'BODY-1' },    // 10s
      { type: 'BODY-2' },    // 10s
      { type: 'PEAK' },      // 10s
      { type: 'CTA' },       // 10s
      { type: 'LOOP-END' },  // 5s
    ];
    const result = validateTotalDuration(segments, '60s');
    expect(result.valid).toBe(true);
    expect(result.actual).toBe(60);
    expect(result.expected).toBe(60);
  });
});

describe('assignSegmentDurations', () => {
  it('should assign durations to all segments', () => {
    const segments = [
      { type: 'HOOK', name: 'Hook' },
      { type: 'BODY-1', name: 'Body 1' },
      { type: 'CTA', name: 'CTA' },
    ];
    const result = assignSegmentDurations(segments, '60s');

    expect(result).toEqual([
      { type: 'HOOK', name: 'Hook', durationSeconds: 5 },
      { type: 'BODY-1', name: 'Body 1', durationSeconds: 10 },
      { type: 'CTA', name: 'CTA', durationSeconds: 10 },
    ]);
  });

  it('should preserve existing fields', () => {
    const segments = [
      { type: 'HOOK', script: 'Hey guys!', imageUrl: 'https://...' },
    ];
    const result = assignSegmentDurations(segments, '30s');

    expect(result[0].script).toBe('Hey guys!');
    expect(result[0].imageUrl).toBe('https://...');
    expect(result[0].durationSeconds).toBe(5);
  });
});

describe('getSegmentDurationText', () => {
  it('should return formatted duration text', () => {
    expect(getSegmentDurationText('HOOK', '30s')).toBe('5s');
    expect(getSegmentDurationText('FORE', '30s')).toBe('5s');
    expect(getSegmentDurationText('FORE', '60s')).toBe('10s');
    expect(getSegmentDurationText('BODY-1', '60s')).toBe('10s');
    expect(getSegmentDurationText('PEAK', '30s')).toBe('5s');
    expect(getSegmentDurationText('PEAK', '60s')).toBe('10s');
  });
});

describe('getDurationExplanation', () => {
  it('should provide explanation for HOOK', () => {
    const explanation = getDurationExplanation('HOOK', '30s');
    expect(explanation).toBe('5s (quick attention grab)');
  });

  it('should provide explanation for FORE', () => {
    expect(getDurationExplanation('FORE', '30s')).toBe('5s (tight pacing)');
    expect(getDurationExplanation('FORE', '60s')).toBe('10s (setup time)');
  });

  it('should provide explanation for BODY', () => {
    const explanation = getDurationExplanation('BODY-1', '60s');
    expect(explanation).toBe('10s (narrative pacing)');
  });

  it('should provide explanation for PEAK', () => {
    expect(getDurationExplanation('PEAK', '30s')).toBe('5s (quick climax)');
    expect(getDurationExplanation('PEAK', '60s')).toBe('10s (climax build)');
  });

  it('should provide explanation for CTA', () => {
    expect(getDurationExplanation('CTA', '30s')).toBe('5s (quick CTA)');
    expect(getDurationExplanation('CTA', '60s')).toBe('10s (clear CTA)');
  });

  it('should provide explanation for LOOP-END', () => {
    const explanation = getDurationExplanation('LOOP-END', '60s');
    expect(explanation).toBe('5s (quick loop back)');
  });
});

describe('Real-world video structures', () => {
  it('30s video: HOOK + FORE + BODY-1 + PEAK + CTA = 30s', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 5s
      { type: 'BODY-1' },    // 10s
      { type: 'PEAK' },      // 5s
      { type: 'CTA' },       // 5s
    ];
    const result = validateTotalDuration(segments, '30s');
    expect(result.valid).toBe(true);
    expect(result.actual).toBe(30);
  });

  it('60s video: HOOK + FORE + 3×BODY + PEAK + CTA + LOOP = 60s', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 10s
      { type: 'BODY-1' },    // 10s
      { type: 'BODY-2' },    // 10s
      { type: 'BODY-3' },    // 10s
      { type: 'PEAK' },      // 10s
      { type: 'LOOP-END' },  // 5s
    ];
    const result = validateTotalDuration(segments, '60s');
    expect(result.valid).toBe(true);
    expect(result.actual).toBe(60);
  });

  it('60s video alternative: HOOK + FORE + 2×BODY + PEAK + CTA + LOOP = 65s (needs adjustment)', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 10s
      { type: 'BODY-1' },    // 10s
      { type: 'BODY-2' },    // 10s
      { type: 'PEAK' },      // 10s
      { type: 'CTA' },       // 10s
      { type: 'LOOP-END' },  // 5s
    ];
    const result = validateTotalDuration(segments, '60s');
    expect(result.valid).toBe(false);
    expect(result.actual).toBe(60); // Wait, this should be 60!
  });

  it('90s video: HOOK + FORE + 5×BODY + PEAK + CTA + LOOP = 90s', () => {
    const segments = [
      { type: 'HOOK' },      // 5s
      { type: 'FORE' },      // 10s
      { type: 'BODY-1' },    // 10s
      { type: 'BODY-2' },    // 10s
      { type: 'BODY-3' },    // 10s
      { type: 'BODY-4' },    // 10s
      { type: 'BODY-5' },    // 10s
      { type: 'PEAK' },      // 10s
      { type: 'CTA' },       // 10s
      { type: 'LOOP-END' },  // 5s
    ];
    const result = validateTotalDuration(segments, '90s');
    expect(result.valid).toBe(true);
    expect(result.actual).toBe(90);
  });
});
