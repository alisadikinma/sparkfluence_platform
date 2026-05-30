import React, { useState, useCallback, useMemo } from 'react';
import { BarChart3, AlertCircle, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoreBreakdown } from '../../../../contexts/WorkspaceContext';
import type { WorkspaceSegment } from '../../../../contexts/WorkspaceContext';
import { analyzeSegment, type SegmentInput, type CoachAnalysis } from '../../utils/scriptAnalysis';
import { OverviewTab } from './OverviewTab';
import { IssuesTab } from './IssuesTab';
import { StyleTab } from './StyleTab';

// ============================================================================
// TYPES
// ============================================================================

type TabKey = 'overview' | 'issues' | 'style';

interface HookOption {
  script_text: string;
  visual_direction: string;
  hook_type: string;
}

export interface HookOptions {
  option_a_safe: HookOption;
  option_b_negative: HookOption;
  option_c_visual: HookOption;
}

export interface SmartCompanionProps {
  segments: WorkspaceSegment[];
  language: string;
  hookOptions: HookOptions | null;
  selectedHook: string;
  scoreBreakdown: ScoreBreakdown | null;
  viralityScore: number;
  focusedSegmentId: string | null;
  scriptConfirmed: boolean;
  onSelectHook: (key: string) => void;
  onEditSegment: (id: string, field: string, value: string) => void;
  onFocusSegment: (id: string | null) => void;
  onSaveNow?: () => void;
}

// ============================================================================
// TAB CONFIG
// ============================================================================

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'issues', label: 'Issues', icon: <AlertCircle className="w-4 h-4" /> },
  { key: 'style', label: 'Style', icon: <Palette className="w-4 h-4" /> },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const SmartCompanion: React.FC<SmartCompanionProps> = ({
  segments,
  language,
  hookOptions,
  selectedHook,
  scoreBreakdown,
  viralityScore,
  focusedSegmentId,
  scriptConfirmed,
  onSelectHook,
  onEditSegment,
  onFocusSegment,
  onSaveNow,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Lifted from IssuesTab so they persist across tab switches (IssuesTab unmounts)
  // Map key = "segmentId-weaknessKey", value = { originalText } for undo support
  const [appliedFixes, setAppliedFixes] = useState<Map<string, { originalText: string }>>(new Map());
  const [skippedIssues, setSkippedIssues] = useState<Set<string>>(new Set());

  // Convert WorkspaceSegments to SegmentInput for analysis
  const segmentInputs: SegmentInput[] = useMemo(
    () =>
      segments.map((s) => ({
        id: s.id,
        segmentType: s.segmentType,
        script: s.script,
        durationSeconds: s.durationSeconds,
        maxWords: s.maxWords,
        emotion: s.emotion,
        isEnabled: s.isEnabled,
      })),
    [segments],
  );

  // Centralized analysis — compute ONCE, share with all child tabs
  const analysisMap = useMemo(() => {
    const map = new Map<string, CoachAnalysis>();
    const enabled = segmentInputs.filter((s) => s.isEnabled !== false);
    for (const seg of enabled) {
      map.set(seg.id, analyzeSegment(seg, language, segmentInputs));
    }
    return map;
  }, [segmentInputs, language]);

  // Count only STABLE issues (self-contained features, not cross-segment)
  // This ensures the badge count stays consistent when switching hooks
  const issueCount = useMemo(() => {
    let count = 0;
    for (const analysis of analysisMap.values()) {
      count += analysis.weaknesses.filter((w) => w.isStable).length;
    }
    return count;
  }, [analysisMap]);

  // When a segment is focused, show its stable issue count in badge
  const displayIssueCount = useMemo(() => {
    if (!focusedSegmentId || activeTab !== 'issues') return issueCount;
    const analysis = analysisMap.get(focusedSegmentId);
    if (!analysis) return issueCount;
    return analysis.weaknesses.filter((w) => w.isStable).length;
  }, [focusedSegmentId, activeTab, analysisMap, issueCount]);

  // Switch to issues tab with optional segment focus
  const switchToIssues = useCallback(
    (segmentId?: string) => {
      setActiveTab('issues');
      if (segmentId) {
        onFocusSegment(segmentId);
      }
    },
    [onFocusSegment],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sticky tab header */}
      <div className="sticky top-0 z-10 bg-[#0B0E14]/95 backdrop-blur-sm border-b border-[#262626] px-4 pt-3 pb-0">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  // Clear segment focus when clicking tab directly so badge count matches list
                  onFocusSegment(null);
                }}
                className={`
                  relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors rounded-t-lg
                  ${isActive ? 'text-emerald-400' : 'text-[#78716C] hover:text-[#A8A29E]'}
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {/* Issues count badge — shows focused count when segment is selected */}
                {tab.key === 'issues' && displayIssueCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    {displayIssueCount}
                  </span>
                )}
                {/* Active underline */}
                {isActive && (
                  <motion.div
                    layoutId="smart-companion-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="p-4"
          >
            {activeTab === 'overview' && (
              <OverviewTab
                segments={segments}
                segmentInputs={segmentInputs}
                language={language}
                viralityScore={viralityScore}
                scoreBreakdown={scoreBreakdown}
                issueCount={issueCount}
                analysisMap={analysisMap}
                onSegmentClick={(segmentId) => switchToIssues(segmentId)}
                onViewIssues={() => { setActiveTab('issues'); onFocusSegment(null); }}
              />
            )}
            {activeTab === 'issues' && (
              <IssuesTab
                segments={segmentInputs}
                language={language}
                focusedSegmentId={focusedSegmentId}
                analysisMap={analysisMap}
                appliedFixes={appliedFixes}
                skippedIssues={skippedIssues}
                onSetAppliedFixes={setAppliedFixes}
                onSetSkippedIssues={setSkippedIssues}
                onApplyFix={(segmentId, field, value) => onEditSegment(segmentId, field, value)}
                onFocusSegment={onFocusSegment}
                onSaveNow={onSaveNow}
              />
            )}
            {activeTab === 'style' && (
              <StyleTab
                hookOptions={hookOptions}
                selectedHook={selectedHook}
                segments={segmentInputs}
                language={language}
                scriptConfirmed={scriptConfirmed}
                onSelectHook={onSelectHook}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
