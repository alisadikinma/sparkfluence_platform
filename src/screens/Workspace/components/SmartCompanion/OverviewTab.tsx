import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ScoreBreakdown, WorkspaceSegment } from '../../../../contexts/WorkspaceContext';
import { ViralityScore } from '../ViralityScore';
import { RetentionCurve } from '../RetentionCurve';
import { EmotionArc } from '../EmotionArc';
import { type SegmentInput, type CoachAnalysis } from '../../utils/scriptAnalysis';

// ============================================================================
// TYPES
// ============================================================================

interface OverviewTabProps {
  segments: WorkspaceSegment[];
  segmentInputs: SegmentInput[];
  language: string;
  viralityScore: number;
  scoreBreakdown: ScoreBreakdown | null;
  issueCount: number;
  analysisMap: Map<string, CoachAnalysis>;
  onSegmentClick: (segmentId: string) => void;
  onViewIssues: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const OverviewTab: React.FC<OverviewTabProps> = ({
  segments,
  segmentInputs,
  language,
  viralityScore,
  scoreBreakdown,
  issueCount,
  analysisMap,
  onSegmentClick,
  onViewIssues,
}) => {
  // Find the segment with the biggest potential score improvement
  const worstSegment = useMemo(() => {
    const enabled = segmentInputs.filter((s) => s.isEnabled !== false);
    if (enabled.length === 0) return null;

    let worst: { id: string; type: string; score: number } | null = null;
    for (const seg of enabled) {
      const analysis = analysisMap.get(seg.id);
      if (!analysis) continue;
      if (!worst || analysis.score < worst.score) {
        worst = { id: seg.id, type: seg.segmentType, score: analysis.score };
      }
    }
    return worst;
  }, [segmentInputs, analysisMap]);

  // Estimate potential score after fixing issues
  const potentialScore = useMemo(() => {
    if (issueCount === 0) return viralityScore;
    // Rough estimate: each issue fix adds ~3-5 points on average, capped at 95
    return Math.min(95, viralityScore + Math.round(issueCount * 3.5));
  }, [viralityScore, issueCount]);

  // Build precomputed scores array from analysisMap for RetentionCurve
  // This guarantees RetentionCurve shows the SAME scores as IssuesTab/OverviewTab
  const retentionScores = useMemo(() => {
    const enabled = segments.filter((s) => s.isEnabled !== false);
    return enabled.map((seg) => {
      const analysis = analysisMap.get(seg.id);
      return {
        score: analysis?.score ?? 0,
        segmentType: seg.segmentType,
      };
    });
  }, [segments, analysisMap]);

  // Handle retention curve segment click → convert index to segment ID
  const handleRetentionClick = (segmentIndex: number) => {
    const enabledSegs = segments.filter((s) => s.isEnabled !== false);
    const seg = enabledSegs[segmentIndex];
    if (seg) onSegmentClick(seg.id);
  };

  // Handle emotion arc segment click → convert index to segment ID
  const handleEmotionClick = (segmentIndex: number) => {
    const enabledSegs = segments.filter((s) => s.isEnabled !== false);
    const seg = enabledSegs[segmentIndex];
    if (seg) onSegmentClick(seg.id);
  };

  return (
    <div className="space-y-4">
      {/* Virality Score (expanded ring + breakdown) */}
      {scoreBreakdown && (
        <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
          <ViralityScore score={viralityScore} breakdown={scoreBreakdown} />
        </div>
      )}

      {/* Retention Curve */}
      {segments.length > 0 && (
        <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
          <span className="text-sm font-semibold text-[#78716C] uppercase tracking-wider block">
            Viewer Retention
          </span>
          <p className="text-xs text-[#78716C] leading-relaxed mt-0.5 mb-3">
            Estimated % of viewers still watching. Click a bar to fix that segment.
          </p>
          <RetentionCurve
            segments={segments}
            language={language}
            precomputedScores={retentionScores}
            onSegmentClick={handleRetentionClick}
          />
        </div>
      )}

      {/* Emotion Arc */}
      {segments.length > 0 && (
        <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
          <span className="text-sm font-semibold text-[#78716C] uppercase tracking-wider block mb-2">
            Emotion Arc
          </span>
          <EmotionArc
            segments={segments}
            language={language}
            onSegmentClick={handleEmotionClick}
          />
        </div>
      )}

      {/* Issues Banner */}
      {issueCount > 0 && (
        <button
          type="button"
          onClick={onViewIssues}
          className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-left transition-colors hover:bg-amber-500/10 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-amber-400">
                {issueCount} issue{issueCount !== 1 ? 's' : ''} found
              </span>
              <p className="text-xs text-[#78716C] mt-0.5">
                Fix to boost score to ~{potentialScore}%
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400/60 group-hover:text-amber-400 transition-colors" />
          </div>
        </button>
      )}

      {/* Worst segment quick fix link */}
      {worstSegment && worstSegment.score < 70 && (
        <button
          type="button"
          onClick={() => onSegmentClick(worstSegment.id)}
          className="w-full text-left text-sm text-emerald-400/70 hover:text-emerald-400 transition-colors flex items-center gap-1"
        >
          <span>Show me how to fix {worstSegment.type} ({worstSegment.score}%)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* All clear state */}
      {issueCount === 0 && segments.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-center">
          <span className="text-sm font-semibold text-emerald-400">
            All clear! No issues detected.
          </span>
          <p className="text-xs text-[#78716C] mt-0.5">
            Your script is scoring well across all segments.
          </p>
        </div>
      )}
    </div>
  );
};
