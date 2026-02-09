import React, { useMemo } from 'react';
import {
  analyzeEmotion,
  calculateEmotionArc,
  EMOTION_COLORS,
  type EmotionType,
} from '../../../lib/knowledge/13-emotion-lexicon';
import {
  detectEmotionPattern,
  EMOTION_ARC_PATTERNS,
  type EmotionArcPattern,
} from '../../../lib/knowledge/12-scoring-engine';

// ============================================================================
// TYPES
// ============================================================================

interface SegmentInput {
  segmentType: string;
  script: string;
  isEnabled?: boolean;
}

interface EmotionArcProps {
  segments: SegmentInput[];
  language?: string;
  onSegmentClick?: (index: number) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function patternLabel(pattern: EmotionArcPattern): { label: string; color: string } {
  switch (pattern) {
    case 'roller_coaster':
      return { label: 'Roller Coaster', color: 'text-emerald-400' };
    case 'slow_burn':
      return { label: 'Slow Burn', color: 'text-amber-400' };
    case 'front_heavy':
      return { label: 'Front-Heavy', color: 'text-red-400' };
    case 'flat_line':
      return { label: 'Flat Line', color: 'text-red-400' };
    case 'tension_release':
      return { label: 'Tension & Release', color: 'text-emerald-400' };
    case 'wave':
      return { label: 'Wave', color: 'text-blue-400' };
    default:
      return { label: 'Unknown', color: 'text-[#78716C]' };
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EmotionArc: React.FC<EmotionArcProps> = ({
  segments,
  language = 'id',
  onSegmentClick,
}) => {
  const enabledSegments = useMemo(
    () => segments.filter((s) => s.isEnabled !== false),
    [segments],
  );

  // Analyze each segment's emotion
  const emotionData = useMemo(() => {
    return enabledSegments.map((s) => {
      const analysis = analyzeEmotion(s.script, language);
      return {
        segmentType: s.segmentType,
        intensity: analysis.intensity,
        dominant: analysis.dominant,
      };
    });
  }, [enabledSegments, language]);

  // Detect arc pattern
  const intensities = emotionData.map((d) => d.intensity);
  const detectedPattern = useMemo(() => {
    if (intensities.length < 3) return null;
    return detectEmotionPattern(intensities);
  }, [intensities]);

  if (enabledSegments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[10px] text-[#3f3f46]">No segments to analyze</p>
      </div>
    );
  }

  // Chart dimensions
  const chartWidth = 220;
  const chartHeight = 80;
  const padding = { top: 8, bottom: 20, left: 0, right: 0 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Build polyline points
  const points = emotionData.map((d, i) => {
    const x = padding.left + (i / Math.max(emotionData.length - 1, 1)) * plotWidth;
    const y = padding.top + plotHeight - d.intensity * plotHeight;
    return { x, y };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaStr = `${padding.left},${padding.top + plotHeight} ${polylineStr} ${padding.left + plotWidth},${padding.top + plotHeight}`;

  const patternInfo = detectedPattern ? patternLabel(detectedPattern.pattern) : null;

  return (
    <div className="space-y-3">
      {/* SVG Line Chart */}
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="overflow-visible"
      >
        {/* Area fill */}
        <polygon
          points={areaStr}
          fill="url(#emotion-gradient)"
          opacity={0.15}
        />
        <defs>
          <linearGradient id="emotion-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Line */}
        <polyline
          points={polylineStr}
          fill="none"
          stroke="#10B981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points + labels */}
        {points.map((p, i) => {
          const d = emotionData[i];
          const emotionColor = EMOTION_COLORS[d.dominant]?.text ?? 'text-[#78716C]';

          return (
            <g key={i}>
              {/* Clickable circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#0B0E14"
                stroke="#10B981"
                strokeWidth={2}
                className="cursor-pointer hover:stroke-emerald-300 transition-colors"
                onClick={() => onSegmentClick?.(i)}
              />
              {/* Segment label below */}
              <text
                x={p.x}
                y={chartHeight - 2}
                textAnchor="middle"
                className="text-[7px] fill-[#57534E]"
              >
                {d.segmentType.replace('BODY-', 'B').replace('LOOP-END', 'LOOP')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Pattern detection */}
      {patternInfo && detectedPattern && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#78716C]">Pattern:</span>
          <span className={`font-medium ${patternInfo.color}`}>
            {detectedPattern.confidence >= 0.6 ? '\u2713' : '\u223C'} {patternInfo.label}
          </span>
          <span className="text-[#57534E]">
            ({Math.round(detectedPattern.confidence * 100)}%)
          </span>
        </div>
      )}

      {/* Emotion breakdown chips */}
      <div className="flex flex-wrap gap-1">
        {emotionData.map((d, i) => {
          const colors = EMOTION_COLORS[d.dominant];
          return (
            <span
              key={i}
              className={`text-[9px] px-1.5 py-0.5 rounded ${colors?.bg ?? 'bg-[#262626]'} ${colors?.text ?? 'text-[#78716C]'}`}
            >
              {d.dominant}
            </span>
          );
        })}
      </div>
    </div>
  );
};
