import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { ScoreBreakdown } from '../../../contexts/WorkspaceContext';

// ============================================================================
// TYPES
// ============================================================================

interface ViralityScoreProps {
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  compact?: boolean; // Small inline vs expanded card
}

// ============================================================================
// HELPERS
// ============================================================================

type ScoreStatus = 'pass' | 'warn' | 'fail';

function scoreColor(score: number): { stroke: string; text: string } {
  if (score >= 80) return { stroke: '#10B981', text: 'text-emerald-500' };
  if (score >= 60) return { stroke: '#F59E0B', text: 'text-amber-400' };
  return { stroke: '#EF4444', text: 'text-red-400' };
}

function statusIcon(status: ScoreStatus): React.ReactNode {
  switch (status) {
    case 'pass':
      return <CheckCircle className="w-3 h-3 text-emerald-500" />;
    case 'warn':
      return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    case 'fail':
      return <XCircle className="w-3 h-3 text-red-400" />;
  }
}

function statusPillClasses(status: ScoreStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'warn':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'fail':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
}

function formatLabel(key: string): string {
  switch (key) {
    case 'hook':
      return 'Hook';
    case 'pacing':
      return 'Pacing';
    case 'density':
      return 'Density';
    case 'cta':
      return 'CTA';
    case 'editingCues':
      return 'Editing';
    default:
      return key;
  }
}

// ============================================================================
// CIRCULAR PROGRESS RING
// ============================================================================

const RING_SIZE = 96;
const RING_STROKE_WIDTH = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ProgressRingProps {
  score: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ score }) => {
  const { stroke, text } = scoreColor(score);
  const offset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="#262626"
          strokeWidth={RING_STROKE_WIDTH}
        />
        {/* Progress arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={RING_STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.3s ease',
          }}
        />
      </svg>
      {/* Score text centered inside ring */}
      <span
        className={`absolute text-xl font-bold ${text}`}
      >
        {score}%
      </span>
    </div>
  );
};

// ============================================================================
// COMPACT VARIANT
// ============================================================================

const CompactScore: React.FC<{ score: number }> = ({ score }) => {
  const { text } = scoreColor(score);
  const dotColor =
    score >= 80
      ? 'bg-emerald-500'
      : score >= 60
        ? 'bg-amber-400'
        : 'bg-red-400';

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161616] border border-[#262626]">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className={`text-xs font-semibold ${text}`}>
        {score}%
      </span>
      <span className="text-[10px] text-[#78716C]">viral</span>
    </div>
  );
};

// ============================================================================
// EXPANDED VARIANT
// ============================================================================

const ExpandedScore: React.FC<{
  score: number;
  breakdown: ScoreBreakdown;
}> = ({ score, breakdown }) => {
  const entries = Object.entries(breakdown) as Array<
    [string, { score: number; status: ScoreStatus }]
  >;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular ring */}
      <ProgressRing score={score} />

      {/* Breakdown pills */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {entries.map(([key, item]) => (
          <div
            key={key}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium
              ${statusPillClasses(item.status)}
            `}
          >
            <span>{formatLabel(key)}</span>
            {statusIcon(item.status)}
            <span className="font-bold">{item.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ViralityScore: React.FC<ViralityScoreProps> = ({
  score,
  breakdown,
  compact = false,
}) => {
  if (compact) {
    return <CompactScore score={score} />;
  }
  return <ExpandedScore score={score} breakdown={breakdown} />;
};
