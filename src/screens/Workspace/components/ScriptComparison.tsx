import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle,
  Undo2,
  ArrowRight,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Video,
  Scissors,
  Volume2,
  Type,
  Clapperboard,
  type LucideIcon,
} from 'lucide-react';
import type { HookOptions, ScoreBreakdown } from '../../../contexts/WorkspaceContext';

// ============================================================================
// LOCAL TYPES (mirror ScriptStep types)
// ============================================================================

interface DirectorChip {
  id: string;
  type: 'camera' | 'action' | 'sfx' | 'vfx' | 'text_pop' | 'cut';
  label: string;
  icon: string;
  color: string;
}

interface ScriptSegment {
  id: string;
  segmentNumber: number;
  segmentType: string;
  shotType: 'CREATOR' | 'B-ROLL';
  duration: number;
  script: string;
  visualDirection: string;
  directorChips: DirectorChip[];
  emotion: string;
  maxWords: number;
  wordCount: number;
  isOverLimit: boolean;
  retentionLevel: 'high' | 'medium' | 'low';
  needsFix: boolean;
  isFixing: boolean;
  estimatedSpeechSeconds: number;
  waveformFill: number;
}

interface ScriptComparisonProps {
  isOpen: boolean;
  viewMode: 'inline' | 'side-by-side';
  onViewModeChange: (mode: 'inline' | 'side-by-side') => void;
  version1: { segments: ScriptSegment[]; score: number; hookOptions: HookOptions };
  version2: { segments: ScriptSegment[]; score: number; hookOptions: HookOptions };
  aiRecommendation: 1 | 2;
  onKeepVersion1: () => void;
  onUseVersion2: () => void;
  onClose: () => void;
  isLoading: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRetentionBorder(segmentType: string): string {
  switch (segmentType) {
    case 'HOOK':
    case 'PEAK':
      return 'shadow-[inset_4px_0_0_0_#10B981]';
    case 'FORE':
    case 'BODY-1':
    case 'BODY-2':
      return 'shadow-[inset_4px_0_0_0_#F59E0B]';
    case 'CTA':
      return 'shadow-[inset_4px_0_0_0_#06B6D4]';
    case 'LOOP-END':
      return 'shadow-[inset_4px_0_0_0_#78716C]';
    default:
      return 'shadow-[inset_4px_0_0_0_#78716C]';
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10';
  if (score >= 60) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

/** Simple word-level diff — returns tokens tagged as 'same', 'removed', 'added' */
function diffWords(
  oldText: string,
  newText: string
): Array<{ text: string; type: 'same' | 'removed' | 'added' }> {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff tokens
  const result: Array<{ text: string; type: 'same' | 'removed' | 'added' }> = [];
  let i = m;
  let j = n;

  const tempResult: typeof result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.push({ text: oldWords[i - 1], type: 'same' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempResult.push({ text: newWords[j - 1], type: 'added' });
      j--;
    } else {
      tempResult.push({ text: oldWords[i - 1], type: 'removed' });
      i--;
    }
  }

  // Reverse and merge consecutive tokens of same type
  const reversed = tempResult.reverse();
  for (const token of reversed) {
    const last = result[result.length - 1];
    if (last && last.type === token.type) {
      last.text += ' ' + token.text;
    } else {
      result.push({ ...token });
    }
  }

  return result;
}

const chipIconMap: Record<string, LucideIcon> = {
  camera: Video,
  action: Clapperboard,
  sfx: Volume2,
  vfx: Sparkles,
  text_pop: Type,
  cut: Scissors,
};

const chipColorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400',
  amber: 'bg-amber-500/10 text-amber-400',
  green: 'bg-green-500/10 text-green-400',
  violet: 'bg-violet-500/10 text-violet-400',
  pink: 'bg-pink-500/10 text-pink-400',
  orange: 'bg-orange-500/10 text-orange-400',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Compact segment card for side-by-side view */
const CompactSegmentCard: React.FC<{
  segment: ScriptSegment;
  isRecommended?: boolean;
}> = ({ segment, isRecommended }) => (
  <div
    className={`bg-[#161616] rounded-lg p-3 ${getRetentionBorder(segment.segmentType)} ${
      isRecommended ? 'ring-1 ring-emerald-500/20' : ''
    }`}
  >
    {/* Header */}
    <div className="flex items-center gap-2 mb-2">
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#262626] text-[10px] font-mono text-[#A8A29E]">
        {segment.segmentNumber}
      </span>
      <span className="text-[11px] font-medium text-[#FAFAF9] bg-[#1E1E1E] px-2 py-0.5 rounded">
        {segment.segmentType}
      </span>
      <span className="text-[10px] text-[#78716C]">{segment.duration}s</span>
    </div>

    {/* Script text (compact) */}
    <p className="text-[13px] text-[#FAFAF9] leading-relaxed line-clamp-3">
      {segment.script}
    </p>

    {/* Director chips (compact) */}
    {segment.directorChips.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {segment.directorChips.slice(0, 3).map((chip) => {
          const IconComp = chipIconMap[chip.type] || Sparkles;
          const colorClass = chipColorMap[chip.color] || 'bg-[#262626] text-[#A8A29E]';
          return (
            <span
              key={chip.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${colorClass}`}
            >
              <IconComp className="w-2.5 h-2.5" />
              {chip.label}
            </span>
          );
        })}
        {segment.directorChips.length > 3 && (
          <span className="text-[10px] text-[#57534E]">+{segment.directorChips.length - 3}</span>
        )}
      </div>
    )}
  </div>
);

/** Inline diff view — shows changes directly on segment cards */
const InlineDiffCard: React.FC<{
  oldSegment: ScriptSegment;
  newSegment: ScriptSegment;
  scoreV1: number;
  scoreV2: number;
}> = ({ oldSegment, newSegment, scoreV1, scoreV2 }) => {
  const scriptChanged = oldSegment.script !== newSegment.script;
  const tokens = scriptChanged ? diffWords(oldSegment.script, newSegment.script) : [];

  return (
    <div
      className={`bg-[#161616] rounded-xl p-4 ${getRetentionBorder(newSegment.segmentType)} border border-[#262626]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#1E1E1E] text-[11px] font-mono text-[#A8A29E]">
            {newSegment.segmentNumber}
          </span>
          <span className="text-[12px] font-medium text-[#FAFAF9] bg-[#1E1E1E] px-2.5 py-0.5 rounded-md">
            {newSegment.segmentType}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            newSegment.shotType === 'CREATOR' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            {newSegment.shotType}
          </span>
          <span className="text-[11px] text-[#57534E]">{newSegment.duration}s</span>
        </div>

        {scriptChanged && (
          <span className="text-[11px] text-[#78716C]">
            V1: <span className={scoreColor(scoreV1)}>{scoreV1}%</span>
            <ArrowRight className="inline w-3 h-3 mx-1 text-[#57534E]" />
            V2: <span className={scoreColor(scoreV2)}>{scoreV2}%</span>
          </span>
        )}
      </div>

      {/* Script diff */}
      {scriptChanged ? (
        <div className="text-[14px] leading-relaxed">
          {tokens.map((token, idx) => {
            if (token.type === 'removed') {
              return (
                <span key={idx} className="text-red-500/50 line-through mr-1">
                  {token.text}
                </span>
              );
            }
            if (token.type === 'added') {
              return (
                <span key={idx} className="text-emerald-400 font-medium bg-emerald-500/5 rounded px-1 mr-1">
                  {token.text}
                </span>
              );
            }
            return (
              <span key={idx} className="text-[#FAFAF9] mr-1">
                {token.text}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-[14px] text-[#78716C] leading-relaxed">
          {newSegment.script}
          <span className="text-[11px] text-[#57534E] ml-2">(no change)</span>
        </p>
      )}

      {/* Director chips */}
      {newSegment.directorChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {newSegment.directorChips.map((chip) => {
            const IconComp = chipIconMap[chip.type] || Sparkles;
            const colorClass = chipColorMap[chip.color] || 'bg-[#262626] text-[#A8A29E]';
            return (
              <span
                key={chip.id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] ${colorClass}`}
              >
                <IconComp className="w-3 h-3" />
                {chip.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SKELETON LOADING
// ============================================================================

const SkeletonCard: React.FC = () => (
  <div className="bg-[#161616] rounded-xl p-4 border border-[#262626] animate-pulse">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-[#262626]" />
      <div className="w-16 h-5 rounded bg-[#262626]" />
      <div className="w-8 h-4 rounded bg-[#262626]" />
    </div>
    <div className="space-y-2">
      <div className="w-full h-4 rounded bg-[#262626]" />
      <div className="w-3/4 h-4 rounded bg-[#262626]" />
    </div>
    <div className="flex gap-2 mt-3">
      <div className="w-20 h-5 rounded-full bg-[#262626]" />
      <div className="w-16 h-5 rounded-full bg-[#262626]" />
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ScriptComparison: React.FC<ScriptComparisonProps> = ({
  isOpen,
  viewMode,
  onViewModeChange,
  version1,
  version2,
  aiRecommendation,
  onKeepVersion1,
  onUseVersion2,
  onClose,
  isLoading,
}) => {
  if (!isOpen) return null;

  // ── INLINE DIFF VIEW ──────────────────────────────────────────────────────
  if (viewMode === 'inline') {
    return (
      <div className="space-y-4">
        {/* Inline diff header bar */}
        <div className="flex items-center justify-between bg-[#161616] border border-[#262626] rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-[#FAFAF9]">Comparing Scripts</span>
            <span className={`text-[12px] px-2 py-0.5 rounded-full ${scoreBg(version1.score)} ${scoreColor(version1.score)}`}>
              V1: {version1.score}%
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#57534E]" />
            <span className={`text-[12px] px-2 py-0.5 rounded-full ${scoreBg(version2.score)} ${scoreColor(version2.score)}`}>
              V2: {version2.score}%
            </span>
            {aiRecommendation === 2 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                AI recommends V2
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <button
              onClick={() => onViewModeChange('side-by-side')}
              className="text-[11px] text-[#78716C] hover:text-[#A8A29E] transition-colors px-2 py-1 rounded hover:bg-[#252525]"
            >
              Side-by-Side
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#252525] text-[#78716C] hover:text-[#FAFAF9] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline diff cards */}
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] text-[#78716C]">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              Generating alternative script...
            </div>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {version2.segments.map((newSeg, idx) => {
              const oldSeg = version1.segments[idx];
              if (!oldSeg) return null;
              return (
                <InlineDiffCard
                  key={newSeg.id}
                  oldSegment={oldSeg}
                  newSegment={newSeg}
                  scoreV1={version1.score}
                  scoreV2={version2.score}
                />
              );
            })}
          </div>
        )}

        {/* Floating action bar */}
        {!isLoading && (
          <div className="sticky bottom-4 z-10 flex justify-center">
            <div className="inline-flex items-center gap-3 bg-[#1E1E1E] border border-[#262626] rounded-xl px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.05)]">
              <button
                onClick={onKeepVersion1}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-[#A8A29E] bg-[#161616] border border-[#262626] hover:bg-[#252525] hover:text-[#FAFAF9] transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Keep V1
              </button>
              <button
                onClick={onUseVersion2}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Accept V2
                {aiRecommendation === 2 && <Sparkles className="w-3 h-3 text-emerald-200" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── SIDE-BY-SIDE MODAL VIEW ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[#1E1E1E] border border-[#262626] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1E1E1E]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-[16px] font-semibold text-[#FAFAF9]">Compare Script Versions</h2>
            {aiRecommendation === 2 && !isLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3" />
                AI recommends V{aiRecommendation}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center bg-[#161616] rounded-lg p-0.5 border border-[#262626]">
              <button
                onClick={() => onViewModeChange('inline')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === 'inline'
                    ? 'bg-[#252525] text-[#FAFAF9]'
                    : 'text-[#78716C] hover:text-[#A8A29E]'
                }`}
              >
                Inline
              </button>
              <button
                onClick={() => onViewModeChange('side-by-side')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === 'side-by-side'
                    ? 'bg-[#252525] text-[#FAFAF9]'
                    : 'text-[#78716C] hover:text-[#A8A29E]'
                }`}
              >
                Side-by-Side
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#252525] text-[#78716C] hover:text-[#FAFAF9] transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Modal Body — Two Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-[#262626]">
          {/* VERSION 1 Column */}
          <div className="flex flex-col h-full">
            <div className="px-5 py-3 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#FAFAF9]">Version 1</span>
                <span className={`text-[12px] px-2 py-0.5 rounded-full ${scoreBg(version1.score)} ${scoreColor(version1.score)}`}>
                  {version1.score}%
                </span>
              </div>
              {aiRecommendation === 1 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {version1.segments.map((seg) => (
                <CompactSegmentCard
                  key={seg.id}
                  segment={seg}
                  isRecommended={aiRecommendation === 1}
                />
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#262626]">
              <button
                onClick={onKeepVersion1}
                className="w-full py-2.5 rounded-lg text-[13px] font-medium text-[#A8A29E] bg-[#161616] border border-[#262626] hover:bg-[#252525] hover:text-[#FAFAF9] transition-colors"
              >
                Keep Version 1
              </button>
            </div>
          </div>

          {/* VERSION 2 Column */}
          <div className="flex flex-col h-full">
            <div className="px-5 py-3 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#FAFAF9]">Version 2</span>
                {!isLoading && (
                  <span className={`text-[12px] px-2 py-0.5 rounded-full ${scoreBg(version2.score)} ${scoreColor(version2.score)}`}>
                    {version2.score}%
                  </span>
                )}
              </div>
              {aiRecommendation === 2 && !isLoading && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <>
                  <div className="flex items-center gap-2 mb-2 text-[13px] text-[#78716C]">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    Generating alternative...
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </>
              ) : (
                version2.segments.map((seg) => (
                  <CompactSegmentCard
                    key={seg.id}
                    segment={seg}
                    isRecommended={aiRecommendation === 2}
                  />
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t border-[#262626]">
              <button
                onClick={onUseVersion2}
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isLoading
                    ? 'bg-[#262626] text-[#57534E] cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Use Version 2
                    {aiRecommendation === 2 && <Sparkles className="w-3.5 h-3.5 text-emerald-200" />}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
