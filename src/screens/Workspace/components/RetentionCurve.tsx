import React, { useMemo } from 'react';
import {
  scoreSegment,
  calculateRetentionCurve,
  SCORE_BENCHMARKS,
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

// ============================================================================
// TYPES
// ============================================================================

interface SegmentInput {
  segmentType: string;
  script: string;
  durationSeconds?: number;
  isEnabled?: boolean;
}

interface RetentionCurveProps {
  segments: SegmentInput[];
  language?: string;
  onSegmentClick?: (segmentIndex: number) => void;
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

function extractFeatures(
  text: string,
  segmentType: SegmentType,
  wordCount: number,
  maxWords: number,
  language: string,
): Record<string, boolean | number> {
  const density = maxWords > 0 ? wordCount / maxWords : 0;
  const optimalDensity =
    density >= 0.7 && density <= 0.9
      ? 1
      : density > 0.9
        ? Math.max(0, 1 - (density - 0.9) * 5)
        : density / 0.7;

  return {
    has_question: hasQuestion(text),
    has_number: hasNumber(text),
    has_power_word: detectPowerWords(text, language).length > 0,
    has_negative_frame: hasNegativeFrame(text),
    word_density_optimal: optimalDensity,
    under_word_limit: wordCount <= maxWords,
    has_pattern_interrupt: hasForeshadow(text),
    has_foreshadow: hasForeshadow(text),
    has_transition: 0.5,
    builds_on_hook: 0.5,
    has_specific_detail: hasNumber(text) ? 1 : 0.5,
    has_transition_word: /\b(tapi|nah|but|however|terus|dan|lalu|लेकिन|फिर)\b/i.test(text),
    has_value_delivery: 0.5,
    has_emotional_climax: 0.5,
    has_unexpected_twist: 0.5,
    has_specific_proof: hasNumber(text) ? 1 : 0.5,
    emotional_intensity_high: 0.5,
    has_clear_action: hasCtaAction(text),
    first_person: hasFirstPersonCta(text),
    single_focus: 0.5,
    has_urgency_word: /\b(sekarang|now|segera|today|limited|hurry|अभी|जल्दी)\b/i.test(text),
    matches_funnel_stage: 0.5,
    matches_hook_category: 0.5,
    mirrors_hook_energy: 0.5,
    has_callback: 0.5,
    emotional_match: 0.5,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function barColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const RetentionCurve: React.FC<RetentionCurveProps> = ({
  segments,
  language = 'id',
  onSegmentClick,
}) => {
  const enabledSegments = useMemo(
    () => segments.filter((s) => s.isEnabled !== false),
    [segments],
  );

  // Score each segment, then calculate retention curve
  const retentionPoints = useMemo(() => {
    if (enabledSegments.length === 0) return [];

    const scores: number[] = [];
    const types: SegmentType[] = [];

    for (const seg of enabledSegments) {
      const st = seg.segmentType.startsWith('BODY') ? 'BODY' : seg.segmentType as SegmentType;
      const words = seg.script.trim().split(/\s+/).filter(Boolean);
      const maxWords = Math.floor((130 / 60) * (seg.durationSeconds ?? 8) * 0.8);
      const features = extractFeatures(seg.script, st, words.length, maxWords, language);
      const result = scoreSegment(st, features);
      scores.push(result.total);
      types.push(st);
    }

    return calculateRetentionCurve(scores, types);
  }, [enabledSegments, language]);

  // Find biggest drop
  const biggestDrop = useMemo(() => {
    if (retentionPoints.length < 2) return null;
    let maxDrop = 0;
    let dropIdx = -1;
    for (let i = 1; i < retentionPoints.length; i++) {
      const drop = retentionPoints[i].drop;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropIdx = i;
      }
    }
    if (maxDrop < 5) return null;
    return { index: dropIdx, drop: Math.round(maxDrop) };
  }, [retentionPoints]);

  const avgRetention = useMemo(() => {
    if (retentionPoints.length === 0) return 0;
    return Math.round(
      retentionPoints.reduce((sum, p) => sum + p.predicted, 0) / retentionPoints.length,
    );
  }, [retentionPoints]);

  if (enabledSegments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[10px] text-[#3f3f46]">No segments to analyze</p>
      </div>
    );
  }

  // Chart dimensions
  const chartWidth = 220;
  const chartHeight = 100;
  const barGap = 4;
  const barWidth = Math.max(
    12,
    (chartWidth - barGap * (retentionPoints.length - 1)) / retentionPoints.length,
  );
  const topPadding = 4;

  return (
    <div className="space-y-3">
      {/* SVG Bar Chart */}
      <svg
        width="100%"
        height={chartHeight + 24}
        viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
        className="overflow-visible"
      >
        {/* Benchmark line (top 10%) */}
        <line
          x1={0}
          y1={topPadding + chartHeight * (1 - SCORE_BENCHMARKS.top_10_percent / 100)}
          x2={chartWidth}
          y2={topPadding + chartHeight * (1 - SCORE_BENCHMARKS.top_10_percent / 100)}
          stroke="#10B981"
          strokeWidth={0.5}
          strokeDasharray="3 3"
          opacity={0.4}
        />

        {/* Bars */}
        {retentionPoints.map((point, i) => {
          const height = (point.predicted / 100) * chartHeight;
          const x = i * (barWidth + barGap);
          const y = topPadding + chartHeight - height;
          const color = barColor(point.predicted);

          return (
            <g
              key={i}
              onClick={() => onSegmentClick?.(i)}
              className={onSegmentClick ? 'cursor-pointer' : ''}
              role={onSegmentClick ? 'button' : undefined}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={2}
                fill={color}
                opacity={0.8}
                className="transition-opacity hover:opacity-100"
              />
              {/* Hover overlay for clickable bars */}
              {onSegmentClick && (
                <rect
                  x={x}
                  y={topPadding}
                  width={barWidth}
                  height={chartHeight}
                  fill="transparent"
                />
              )}
              {/* Score label on top */}
              <text
                x={x + barWidth / 2}
                y={y - 3}
                textAnchor="middle"
                className="text-[8px] fill-[#A8A29E]"
              >
                {Math.round(point.predicted)}%
              </text>
              {/* Segment label below */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + topPadding + 14}
                textAnchor="middle"
                className="text-[7px] fill-[#57534E]"
              >
                {point.segment.replace('BODY-', 'B').replace('LOOP-END', 'LOOP')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Drop alert — biggest viewer drop-off */}
      {biggestDrop && (
        <div className="flex items-start gap-1.5 text-[10px]">
          <span className="text-amber-400">&#9888;</span>
          <span className="text-[#A8A29E]">
            Biggest drop at{' '}
            <span className="text-[#FAFAF9] font-medium">
              {retentionPoints[biggestDrop.index]?.segment}
            </span>
            : -{biggestDrop.drop}% viewers leave here
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#78716C]">
          Avg retention: <span className={avgRetention >= 72 ? 'text-emerald-400' : 'text-amber-400'}>{avgRetention}%</span>
        </span>
        <span className="text-[#57534E]">
          Top 10% = {SCORE_BENCHMARKS.top_10_percent}%+
        </span>
      </div>
    </div>
  );
};
