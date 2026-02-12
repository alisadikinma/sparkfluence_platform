import React, { useMemo, useState, useCallback } from 'react';
import { ChevronLeft, Check, Zap } from 'lucide-react';
import { generateQuickFixes, type SegmentInput, type CoachAnalysis, type QuickFix } from '../../utils/scriptAnalysis';

// ============================================================================
// TYPES
// ============================================================================

interface IssuesTabProps {
  segments: SegmentInput[];
  language: string;
  focusedSegmentId: string | null;
  analysisMap: Map<string, CoachAnalysis>;
  // Lifted state from SmartCompanion (persists across tab switches)
  appliedFixes: Set<string>;
  skippedIssues: Set<string>;
  onSetAppliedFixes: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSetSkippedIssues: React.Dispatch<React.SetStateAction<Set<string>>>;
  onApplyFix: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
  onFocusSegment: (id: string | null) => void;
  onSaveNow?: () => void;
}

interface IssueItem {
  segmentId: string;
  segmentType: string;
  weaknessKey: string;
  label: string;
  weight: number;
  tip: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  fix: QuickFix | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function severityColor(sev: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  switch (sev) {
    case 'HIGH': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'LOW': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
}

function segmentBadgeColor(type: string): string {
  if (type === 'HOOK' || type === 'PEAK') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (type === 'CTA') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const IssuesTab: React.FC<IssuesTabProps> = ({
  segments,
  language,
  focusedSegmentId,
  analysisMap,
  appliedFixes,
  skippedIssues,
  onSetAppliedFixes,
  onSetSkippedIssues,
  onApplyFix,
  onFocusSegment,
  onSaveNow,
}) => {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  // Collect STABLE issues only (self-contained features, not cross-segment)
  // This ensures the issue count stays consistent when switching hook styles
  const allIssues: IssueItem[] = useMemo(() => {
    const enabled = segments.filter((s) => s.isEnabled !== false);
    const issues: IssueItem[] = [];

    for (const seg of enabled) {
      const analysis = analysisMap.get(seg.id);
      if (!analysis) continue;
      const fixes = generateQuickFixes(seg, analysis, language);

      // Only show stable (self-contained) weaknesses as issue cards
      for (const w of analysis.weaknesses) {
        if (!w.isStable) continue;
        const matchingFix = fixes.find((f) => f.weaknessKey === w.key);
        issues.push({
          segmentId: seg.id,
          segmentType: seg.segmentType,
          weaknessKey: w.key,
          label: w.label,
          weight: w.weight,
          tip: w.tip,
          severity: w.weight >= 12 ? 'HIGH' : w.weight >= 8 ? 'MEDIUM' : 'LOW',
          fix: matchingFix || null,
        });
      }
    }

    // Sort by weight descending (highest impact first)
    issues.sort((a, b) => b.weight - a.weight);
    return issues;
  }, [segments, language, analysisMap]);

  // Filter by focused segment if set
  const visibleIssues = useMemo(() => {
    if (!focusedSegmentId) return allIssues;
    return allIssues.filter((i) => i.segmentId === focusedSegmentId);
  }, [allIssues, focusedSegmentId]);

  // Progress tracking — scoped to visible issues (respects segment focus mode)
  const scopedTotal = visibleIssues.length;
  const scopedFixed = visibleIssues.filter(
    (i) => appliedFixes.has(`${i.segmentId}-${i.weaknessKey}`),
  ).length;
  const progressPct = scopedTotal > 0 ? Math.round((scopedFixed / scopedTotal) * 100) : 0;

  const handleApplyFix = useCallback(
    (issue: IssueItem) => {
      if (!issue.fix) return;
      onApplyFix(issue.segmentId, issue.fix.field, issue.fix.preview);
      onSetAppliedFixes((prev) => new Set(prev).add(`${issue.segmentId}-${issue.weaknessKey}`));
      setExpandedIssue(null);
      // Trigger immediate save so fix persists through browser refresh
      onSaveNow?.();
    },
    [onApplyFix, onSetAppliedFixes, onSaveNow],
  );

  const handleSkip = useCallback((issue: IssueItem) => {
    onSetSkippedIssues((prev) => new Set(prev).add(`${issue.segmentId}-${issue.weaknessKey}`));
  }, [onSetSkippedIssues]);

  const handleFixAll = useCallback(() => {
    const fixableIssues = visibleIssues.filter(
      (i) => i.fix && !appliedFixes.has(`${i.segmentId}-${i.weaknessKey}`) && !skippedIssues.has(`${i.segmentId}-${i.weaknessKey}`),
    );

    // Group fixes by segmentId + field to avoid stale overwrites.
    // When multiple fixes target the same segment + field (e.g. script),
    // only apply the HIGHEST-WEIGHT fix (most impactful one).
    // Fixes across DIFFERENT segments are safe to apply simultaneously.
    const grouped = new Map<string, IssueItem[]>();
    for (const issue of fixableIssues) {
      const groupKey = `${issue.segmentId}-${issue.fix!.field}`;
      const arr = grouped.get(groupKey) || [];
      arr.push(issue);
      grouped.set(groupKey, arr);
    }

    for (const [, issues] of grouped) {
      // Sort by weight desc — pick the highest-weight fix for this segment+field
      const sorted = [...issues].sort((a, b) => b.weight - a.weight);
      const best = sorted[0];
      if (best.fix) {
        onApplyFix(best.segmentId, best.fix.field, best.fix.preview);
      }
      // Mark ALL issues in this group as applied (the best fix addresses the core problem)
      for (const issue of issues) {
        onSetAppliedFixes((prev) => new Set(prev).add(`${issue.segmentId}-${issue.weaknessKey}`));
      }
    }

    // Trigger immediate save so fixes persist through browser refresh
    onSaveNow?.();
  }, [visibleIssues, appliedFixes, skippedIssues, onApplyFix, onSetAppliedFixes, onSaveNow]);

  // Focused segment info
  const focusedSeg = focusedSegmentId ? segments.find((s) => s.id === focusedSegmentId) : null;
  const focusedAnalysis = focusedSegmentId ? analysisMap.get(focusedSegmentId) ?? null : null;

  // All clear state
  const activeIssues = visibleIssues.filter(
    (i) => !appliedFixes.has(`${i.segmentId}-${i.weaknessKey}`) && !skippedIssues.has(`${i.segmentId}-${i.weaknessKey}`),
  );

  if (allIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
          <Check className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-sm font-semibold text-emerald-400">No issues detected</span>
        <p className="text-xs text-[#78716C] mt-1">Your script scores well across all segments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Segment focus breadcrumb */}
      {focusedSegmentId && focusedSeg && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onFocusSegment(null)}
            className="flex items-center gap-1 text-sm text-[#78716C] hover:text-[#A8A29E] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to all issues</span>
          </button>
          <div className="rounded-lg border border-[#262626] bg-[#161616] p-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded border font-medium ${segmentBadgeColor(focusedSeg.segmentType)}`}>
                {focusedSeg.segmentType}
              </span>
              {focusedAnalysis && (
                <span className={`text-sm font-mono font-bold ${focusedAnalysis.score >= 70 ? 'text-emerald-400' : focusedAnalysis.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {focusedAnalysis.score}%
                </span>
              )}
            </div>
            <p className="text-xs text-[#78716C] mt-1.5 line-clamp-2 leading-relaxed">{focusedSeg.script}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#78716C]">{scopedFixed}/{scopedTotal} fixed</span>
          <span className="text-[#78716C]">{progressPct}%</span>
        </div>
        <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Issue cards */}
      {activeIssues.length === 0 && scopedFixed > 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-emerald-400">All issues resolved!</span>
          <p className="text-xs text-[#78716C] mt-1">Score improved with {scopedFixed} fix{scopedFixed !== 1 ? 'es' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeIssues.map((issue) => {
            const issueKey = `${issue.segmentId}-${issue.weaknessKey}`;
            const isExpanded = expandedIssue === issueKey;

            return (
              <div key={issueKey} className="rounded-lg border border-[#262626] bg-[#161616] overflow-hidden">
                <div className="px-3.5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Severity badge */}
                    <span className={`text-xs px-2.5 py-0.5 rounded border font-bold ${severityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    {/* Segment badge */}
                    {!focusedSegmentId && (
                      <span className={`text-xs px-2.5 py-0.5 rounded border font-medium ${segmentBadgeColor(issue.segmentType)}`}>
                        {issue.segmentType}
                      </span>
                    )}
                    {/* Issue name */}
                    <span className="text-sm text-[#A8A29E] flex-1">{issue.label}</span>
                    {/* Weight */}
                    <span className="text-xs text-[#78716C]">{issue.weight}pt</span>
                  </div>
                  {issue.tip && (
                    <p className="text-xs text-[#78716C] mt-2 leading-relaxed">{issue.tip}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {issue.fix && (
                      <button
                        type="button"
                        onClick={() => setExpandedIssue(isExpanded ? null : issueKey)}
                        className="text-xs px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium"
                      >
                        {isExpanded ? 'Hide' : 'Preview fix'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSkip(issue)}
                      className="text-xs px-3 py-1.5 rounded bg-[#262626] text-[#78716C] hover:text-[#A8A29E] transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
                {/* Expanded fix preview */}
                {isExpanded && issue.fix && (
                  <div className="px-3.5 pb-3 pt-2.5 border-t border-[#262626] space-y-2">
                    <p className="text-sm text-[#78716C] leading-relaxed italic">
                      &ldquo;{issue.fix.preview}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => handleApplyFix(issue)}
                      className="w-full py-2.5 rounded text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      Apply this fix
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fix All button */}
      {activeIssues.filter((i) => i.fix).length > 1 && (
        <button
          type="button"
          onClick={handleFixAll}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Fix all ({activeIssues.filter((i) => i.fix).length} fixable)
        </button>
      )}
    </div>
  );
};
