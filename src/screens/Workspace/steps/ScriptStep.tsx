import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Scissors,
  RefreshCw,
  CheckCircle,
  Lock,
  Wand2,
  User,
  Film,
  Power,
  ChevronDown,
  GitMerge,
  SplitSquareHorizontal,
  AlertTriangle,
  ClipboardCopy,
  Check,
  Clock,
} from 'lucide-react';
import type { HookOptions, ScoreBreakdown, WorkspaceSegment } from '../../../contexts/WorkspaceContext';
import { ViralityScore } from '../components/ViralityScore';
import { parseVisualDirection, StructuredVDChips } from '../../ImageGeneration/components';

function getHookTint(key: string): string {
  switch (key) {
    case 'option_a_safe': return 'rgba(34, 197, 94, 0.04)';
    case 'option_b_negative': return 'rgba(239, 68, 68, 0.04)';
    case 'option_c_visual': return 'rgba(6, 182, 212, 0.04)';
    default: return 'transparent';
  }
}

// ============================================================================
// LOCAL TYPES
// ============================================================================

interface ScriptSegment {
  id: string;
  segmentNumber: number;
  segmentType: string;
  shotType: 'CREATOR' | 'B-ROLL';
  duration: number;
  script: string;
  visualDirection: string;
  emotion: string;
  maxWords: number;
  wordCount: number;
  isOverLimit: boolean;
  retentionLevel: 'high' | 'medium' | 'low';
  needsFix: boolean;
  isFixing: boolean;
  estimatedSpeechSeconds: number;
  waveformFill: number;
  isEnabled?: boolean;
}

interface ScriptStepProps {
  // Data — accepts either mapped ScriptSegment[] or raw WorkspaceSegment[]
  topic?: string;
  segments?: ScriptSegment[];
  workspaceSegments?: WorkspaceSegment[];
  onEditSegment?: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
  onFixSegment?: (segmentId: string) => void;
  hookOptions?: HookOptions | null;
  selectedHook?: string;
  onSelectHook?: (key: string) => void;
  viralityScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  isRegenerating?: boolean;
  scriptConfirmed?: boolean;
  onConfirm?: () => void;
  onUnconfirm?: () => void;
  // Segment operations
  onToggleSegment?: (segmentId: string) => void;
  onAdjustDuration?: (segmentId: string, durationSeconds: number) => void;
  // Regenerate
  onRegenerateScript?: () => void;
  // Coach focus
  focusedSegmentId?: string | null;
  onFocusSegment?: (segmentId: string) => void;
  // Merge/Split
  onMergeSegments?: (segmentId1: string, segmentId2: string) => void;
  onSplitSegment?: (segmentId: string, splitIndex: number) => void;
}

// ============================================================================
// RETENTION HEATMAP COLORS
// ============================================================================

function retentionBorderColor(segmentType: string): string {
  switch (segmentType) {
    case 'HOOK':
    case 'PEAK':
      return '#10B981'; // emerald
    case 'FORE':
    case 'BODY-1':
    case 'BODY-2':
    case 'BODY-3':
      return '#F59E0B'; // amber
    case 'CTA':
      return '#06B6D4'; // cyan
    case 'LOOP-END':
      return '#78716C'; // muted gray
    default:
      return '#F59E0B';
  }
}

// ============================================================================
// SHOT TYPE ICON
// ============================================================================

function ShotTypeIcon({ shotType }: { shotType: 'CREATOR' | 'B-ROLL' }) {
  if (shotType === 'CREATOR') {
    return <User className="w-3 h-3" />;
  }
  return <Film className="w-3 h-3" />;
}

// ============================================================================
// WAVEFORM BAR
// ============================================================================

function waveformColor(fill: number): string {
  if (fill <= 0.7) return 'bg-emerald-500';
  if (fill <= 0.9) return 'bg-amber-400';
  return 'bg-red-400';
}

// ============================================================================
// AUTO-RESIZE TEXTAREA
// ============================================================================

interface AutoResizeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none ${className}`}
    />
  );
};

// ============================================================================
// SEGMENT CARD
// ============================================================================

// ============================================================================
// WORD DENSITY HELPERS
// ============================================================================

function calculateWordDensity(wordCount: number, maxWords: number): number {
  if (maxWords <= 0) return 0;
  return Math.round((wordCount / maxWords) * 100);
}

function densityColor(density: number): { bg: string; text: string; label: string } {
  if (density >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Good density' };
  if (density >= 50) return { bg: 'bg-amber-400', text: 'text-amber-400', label: 'Consider adding detail' };
  return { bg: 'bg-red-400', text: 'text-red-400', label: 'Low density' };
}

// Duration options for the dropdown
const DURATION_OPTIONS = [3, 5, 8] as const;

function maxWordsForDuration(seconds: number): number {
  return Math.round((130 / 60) * seconds * 0.80);
}

// ============================================================================
// WORKSPACE → SCRIPT SEGMENT MAPPER
// ============================================================================

function mapWorkspaceToScriptSegment(ws: WorkspaceSegment): ScriptSegment {
  const words = ws.script.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const maxWords = ws.maxWords || maxWordsForDuration(ws.durationSeconds);
  const density = maxWords > 0 ? wordCount / maxWords : 0;
  const estimatedSpeechSeconds = parseFloat((wordCount / (130 / 60)).toFixed(1));
  const waveformFill = ws.durationSeconds > 0 ? estimatedSpeechSeconds / ws.durationSeconds : 0;

  return {
    id: ws.id,
    segmentNumber: ws.segmentNumber,
    segmentType: ws.segmentType,
    shotType: ws.shotType,
    duration: ws.durationSeconds,
    script: ws.script,
    visualDirection: ws.visualDirection,
    emotion: ws.emotion,
    maxWords,
    wordCount,
    isOverLimit: wordCount > maxWords,
    retentionLevel: density >= 0.7 ? 'high' : density >= 0.5 ? 'medium' : 'low',
    needsFix: density < 0.5 || wordCount > maxWords,
    isFixing: false,
    estimatedSpeechSeconds,
    waveformFill,
    isEnabled: ws.isEnabled,
  };
}

// ============================================================================
// SEGMENT CARD
// ============================================================================

interface SegmentCardProps {
  segment: ScriptSegment;
  isLoopEnd: boolean;
  selectedHook: string;
  isHookSegment: boolean;
  onEditScript: (value: string) => void;
  onFixSegment: () => void;
  scriptConfirmed: boolean;
  segmentEnabled: boolean;
  onToggleEnabled: () => void;
  onDurationChange: (seconds: number) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  canMergeDown?: boolean;
  onMerge?: () => void;
  canSplit?: boolean;
  onSplitAtIndex?: (index: number) => void;
  lowDensity?: boolean;
  nextSegmentDuration?: number;
}

const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  isLoopEnd,
  selectedHook,
  isHookSegment,
  onEditScript,
  onFixSegment,
  scriptConfirmed,
  segmentEnabled,
  onToggleEnabled,
  onDurationChange,
  isFocused,
  onFocus,
  canMergeDown,
  onMerge,
  canSplit,
  onSplitAtIndex,
  lowDensity,
  nextSegmentDuration,
}) => {
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showSplitPicker, setShowSplitPicker] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const mergedDuration = segment.duration + (nextSegmentDuration ?? 0);
  const mergeExceedsLimit = mergedDuration > 8;
  const borderColor = retentionBorderColor(segment.segmentType);
  const isDisabled = !segmentEnabled;
  const density = calculateWordDensity(segment.wordCount, segment.maxWords);
  const densityInfo = densityColor(density);

  // Determine card background — hook tint when HOOK segment
  const cardBg = isHookSegment ? getHookTint(selectedHook) : undefined;

  return (
    <div
      className={`
        relative rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500/30
        ${isDisabled ? 'opacity-40' : ''}
        ${isFocused ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-[#262626]'}
      `}
      style={{
        boxShadow: isFocused
          ? `inset 4px 0 0 0 ${borderColor}, 0 0 12px rgba(16,185,129,0.08)`
          : `inset 4px 0 0 0 ${borderColor}`,
        backgroundColor: cardBg || '#161616',
      }}
      tabIndex={0}
      role="button"
      aria-label={`Segment ${segment.segmentNumber} - ${segment.segmentType}`}
      onClick={onFocus}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus?.(); } }}
    >
      <div className="p-3 space-y-3">
        {/* Enable/Disable toggle row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Segment number */}
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1E1E1E] text-[11px] font-bold text-[#FAFAF9]">
              {segment.segmentNumber}
            </span>

            {/* Segment type badge */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAFAF9] bg-[#252525] px-2 py-0.5 rounded">
              {segment.segmentType}
            </span>

            {/* Shot type badge */}
            <span
              className={`
                inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider
                px-2 py-0.5 rounded border
                ${
                  segment.shotType === 'CREATOR'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                }
              `}
            >
              <ShotTypeIcon shotType={segment.shotType} />
              {segment.shotType}
            </span>

            {/* Duration adjuster dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => !scriptConfirmed && !isDisabled && setShowDurationDropdown(!showDurationDropdown)}
                disabled={scriptConfirmed || isDisabled}
                className={`
                  inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border
                  transition-colors
                  ${scriptConfirmed || isDisabled
                    ? 'text-[#57534E] border-[#262626] cursor-not-allowed'
                    : 'text-[#A8A29E] border-[#3f3f46] hover:border-emerald-500/40 hover:text-emerald-400 cursor-pointer'
                  }
                `}
              >
                {segment.duration}s
                <ChevronDown className="w-3 h-3" />
              </button>
              {showDurationDropdown && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-[#1E1E1E] border border-[#3f3f46] rounded-lg shadow-xl overflow-hidden">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        onDurationChange(d);
                        setShowDurationDropdown(false);
                      }}
                      className={`
                        block w-full text-left px-4 py-1.5 text-[11px] font-mono
                        transition-colors
                        ${d === segment.duration
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-[#A8A29E] hover:bg-[#262626]'
                        }
                      `}
                    >
                      {d}s ({maxWordsForDuration(d)}w)
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side: toggle + fix */}
          <div className="flex items-center gap-2">
            {/* Fix button */}
            {segment.needsFix && !segment.isFixing && (
              <button
                type="button"
                onClick={onFixSegment}
                disabled={scriptConfirmed || isDisabled}
                className={`
                  inline-flex items-center gap-1 text-[10px] font-medium
                  px-2 py-0.5 rounded-full border
                  bg-amber-500/10 text-amber-400 border-amber-500/30
                  hover:bg-amber-500/20 transition-colors
                  ${(scriptConfirmed || isDisabled) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Wand2 className="w-3 h-3" />
                Fix
              </button>
            )}
            {segment.isFixing && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Fixing...
              </span>
            )}

            {/* Enable/disable toggle */}
            <button
              type="button"
              onClick={onToggleEnabled}
              disabled={scriptConfirmed}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold
                transition-all duration-200 border
                ${scriptConfirmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${
                  segmentEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-[#1E1E1E] text-[#57534E] border-[#262626]'
                }
              `}
            >
              <Power className="w-3 h-3" />
              {segmentEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Script text area */}
        <AutoResizeTextarea
          value={segment.script}
          onChange={onEditScript}
          disabled={scriptConfirmed || isDisabled}
          className={`
            text-[15px] leading-relaxed text-[#FAFAF9]
            ${(scriptConfirmed || isDisabled) ? 'cursor-not-allowed' : ''}
          `}
          placeholder="Enter script text..."
        />

        {/* Smart bar: word density + speech timing merged */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Emotion chip inline */}
            {segment.emotion && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-500/10 text-violet-400 flex-shrink-0">
                {segment.emotion}
              </span>
            )}
            {/* Bar */}
            <div className="flex-1 h-1.5 bg-[#0B0E14] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${densityInfo.bg}`}
                style={{ width: `${Math.min(density, 100)}%` }}
              />
            </div>
            {/* Combined label */}
            <span className={`text-[11px] font-mono flex-shrink-0 ${segment.isOverLimit ? 'text-red-400' : 'text-[#78716C]'}`}>
              {segment.wordCount}/{segment.maxWords}w &middot; {segment.estimatedSpeechSeconds.toFixed(1)}s/{segment.duration}s
            </span>
          </div>
        </div>

        {/* Visual Direction (structured 6-category display) */}
        {segment.visualDirection && (() => {
          const svd = parseVisualDirection(segment.visualDirection);
          if (!svd) return null;
          return <StructuredVDChips structuredVD={svd} />;
        })()}

        {/* Merge/Split actions + auto-merge suggestion */}
        {!scriptConfirmed && !isDisabled && (canMergeDown || canSplit || lowDensity) && (
          <div className="space-y-2 pt-1 border-t border-[#1E1E1E]">
            <div className="flex items-center gap-2">
              {canSplit && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowSplitPicker(!showSplitPicker); }}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium transition-colors ${
                    showSplitPicker
                      ? 'text-emerald-400'
                      : 'text-[#78716C] hover:text-[#A8A29E]'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  {showSplitPicker ? 'Cancel Split' : 'Split'}
                </button>
              )}
              {canMergeDown && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMergeConfirm(true); }}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716C] hover:text-[#A8A29E] transition-colors"
                >
                  <GitMerge className="w-3 h-3" />
                  Merge &darr;
                </button>
              )}
              {lowDensity && canMergeDown && (
                <span className="text-[9px] text-amber-400/70 ml-auto">
                  Low density — consider merging
                </span>
              )}
            </div>

            {/* Split word picker: click between words to choose split point */}
            {showSplitPicker && (
              <div className="rounded-lg bg-[#0B0E14] border border-[#262626] p-2">
                <p className="text-[9px] text-[#57534E] mb-1.5">Click between words to split:</p>
                <div className="flex flex-wrap items-center gap-y-1">
                  {segment.script.trim().split(/\s+/).map((word, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="text-[12px] text-[#FAFAF9] px-0.5">{word}</span>
                      {i < arr.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSplitAtIndex?.(i + 1);
                            setShowSplitPicker(false);
                          }}
                          className="w-4 h-5 flex items-center justify-center text-[#3f3f46] hover:text-emerald-400
                            hover:bg-emerald-500/10 rounded transition-colors mx-0.5"
                          title={`Split after "${word}"`}
                        >
                          <SplitSquareHorizontal className="w-3 h-3" />
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Merge confirmation dialog */}
            {showMergeConfirm && (
              <div className="rounded-lg bg-[#0B0E14] border border-[#262626] p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {mergeExceedsLimit ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <GitMerge className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="text-[11px] text-[#FAFAF9] font-medium">
                      {mergeExceedsLimit
                        ? `Merge akan jadi ${mergedDuration}s (melebihi batas 8s)`
                        : `Merge segment ini? Hasil: ${mergedDuration}s`
                      }
                    </p>
                    {mergeExceedsLimit && (
                      <p className="text-[10px] text-amber-400/80">
                        Durasi setelah merge melebihi 8 detik. Segment yang terlalu panjang bisa menurunkan retention.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMerge?.();
                      setShowMergeConfirm(false);
                    }}
                    className={`flex-1 py-1.5 rounded text-[10px] font-medium border transition-colors ${
                      mergeExceedsLimit
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {mergeExceedsLimit ? 'Merge Anyway' : 'Yes, Merge'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowMergeConfirm(false); }}
                    className="flex-1 py-1.5 rounded text-[10px] font-medium text-[#78716C] bg-[#161616] border border-[#262626] hover:border-[#3f3f46] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SCRIPTSTEP COMPONENT
// ============================================================================

export const ScriptStep: React.FC<ScriptStepProps> = ({
  topic,
  segments: segmentsProp,
  workspaceSegments: workspaceSegmentsProp,
  onEditSegment: onEditSegmentProp,
  onFixSegment: onFixSegmentProp,
  hookOptions: hookOptionsProp,
  selectedHook: selectedHookProp,
  onSelectHook: onSelectHookProp,
  viralityScore: viralityScoreProp,
  scoreBreakdown: scoreBreakdownProp,
  isRegenerating: isRegeneratingProp,
  scriptConfirmed: scriptConfirmedProp,
  onConfirm: onConfirmProp,
  onUnconfirm: onUnconfirmProp,
  onToggleSegment: onToggleSegmentProp,
  onAdjustDuration: onAdjustDurationProp,
  onRegenerateScript: onRegenerateScriptProp,
  focusedSegmentId,
  onFocusSegment,
  onMergeSegments: onMergeSegmentsProp,
  onSplitSegment: onSplitSegmentProp,
}) => {
  // Internal state (no mock fallback — only real workspace data)
  const [internalSegments, setInternalSegments] = useState<ScriptSegment[]>([]);
  const [internalSelectedHook, setInternalSelectedHook] = useState('option_a_safe');
  const [internalConfirmed, setInternalConfirmed] = useState(false);

  // Resolve props vs internal state — map WorkspaceSegment[] if provided
  const mappedSegments = React.useMemo(
    () => workspaceSegmentsProp?.map(mapWorkspaceToScriptSegment),
    [workspaceSegmentsProp],
  );
  const segments = segmentsProp ?? mappedSegments ?? internalSegments;
  const hookOptions = hookOptionsProp ?? null;
  const selectedHook = selectedHookProp ?? internalSelectedHook;
  const viralityScore = viralityScoreProp ?? 0;
  const scoreBreakdown = scoreBreakdownProp ?? null;
  const isRegenerating = isRegeneratingProp ?? false;
  const scriptConfirmed = scriptConfirmedProp ?? internalConfirmed;

  // Handlers
  const handleEditSegment = useCallback(
    (segmentId: string, field: 'script' | 'visualDirection', value: string) => {
      if (onEditSegmentProp) {
        onEditSegmentProp(segmentId, field, value);
      } else {
        setInternalSegments((prev) =>
          prev.map((seg) => (seg.id === segmentId ? { ...seg, [field]: value } : seg)),
        );
      }
    },
    [onEditSegmentProp],
  );

  const handleFixSegment = useCallback(
    (segmentId: string) => {
      if (onFixSegmentProp) {
        onFixSegmentProp(segmentId);
      }
    },
    [onFixSegmentProp],
  );

  const handleSelectHook = useCallback(
    (key: string) => {
      if (onSelectHookProp) {
        onSelectHookProp(key);
      } else {
        setInternalSelectedHook(key);
      }
    },
    [onSelectHookProp],
  );

  const handleConfirm = useCallback(() => {
    if (onConfirmProp) {
      onConfirmProp();
    } else {
      setInternalConfirmed(true);
    }
  }, [onConfirmProp]);

  const handleUnconfirm = useCallback(() => {
    if (onUnconfirmProp) {
      onUnconfirmProp();
    } else {
      setInternalConfirmed(false);
    }
  }, [onUnconfirmProp]);

  const handleToggleSegment = useCallback(
    (segmentId: string) => {
      if (onToggleSegmentProp) {
        onToggleSegmentProp(segmentId);
      } else {
        setInternalSegments((prev) =>
          prev.map((seg) => seg.id === segmentId ? { ...seg, isEnabled: !(seg.isEnabled ?? true) } : seg),
        );
      }
    },
    [onToggleSegmentProp],
  );

  const handleAdjustDuration = useCallback(
    (segmentId: string, durationSeconds: number) => {
      if (onAdjustDurationProp) {
        onAdjustDurationProp(segmentId, durationSeconds);
      } else {
        setInternalSegments((prev) =>
          prev.map((seg) =>
            seg.id === segmentId
              ? { ...seg, duration: durationSeconds, maxWords: maxWordsForDuration(durationSeconds) }
              : seg
          ),
        );
      }
    },
    [onAdjustDurationProp],
  );

  // Copy all script text to clipboard
  const [copySuccess, setCopySuccess] = useState(false);
  const handleCopyScript = useCallback(() => {
    const enabledSegments = segments.filter((s) => s.isEnabled !== false);
    const header = topic ? `${topic}\n\n` : '';
    const body = enabledSegments
      .map((s) => `[${s.segmentType}] ${s.duration}s — ${s.shotType}\n${s.script}`)
      .join('\n\n');
    navigator.clipboard.writeText(header + body).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [segments, topic]);

  return (
    <div className="space-y-4">
      {/* ================================================================ */}
      {/* TOP ACTION BAR — Score + Duration + Hook Tabs + Confirm           */}
      {/* ================================================================ */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Virality Score pill */}
        {scoreBreakdown && <ViralityScore score={viralityScore} breakdown={scoreBreakdown} compact />}

        {/* Total Duration pill */}
        {(() => {
          const enabledSegs = segments.filter(s => s.isEnabled !== false);
          const totalSec = enabledSegs.reduce((sum, s) => sum + s.duration, 0);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          const display = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${totalSec}s`;
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262626] bg-[#161616] text-xs font-mono text-[#A8A29E]">
              <Clock className="w-3.5 h-3.5" />
              {display}
              <span className="text-[#57534E]">/ {enabledSegs.length} seg</span>
            </span>
          );
        })()}

        {/* Hook variant tabs (Safe / Bold / Visual) */}
        {hookOptions && (
          <div className="flex items-center gap-1">
            {Object.entries(hookOptions).map(([key, hook]) => {
              const isActive = selectedHook === key;
              const label = key.includes('safe') ? 'Safe' : key.includes('negative') ? 'Bold' : 'Visual';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => !scriptConfirmed && handleSelectHook(key)}
                  disabled={scriptConfirmed}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200 border cursor-pointer
                    ${scriptConfirmed ? 'cursor-not-allowed opacity-60' : ''}
                    ${isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-[#262626] bg-[#161616] text-[#78716C] hover:text-[#A8A29E] hover:border-[#3f3f46]'
                    }
                  `}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-[#3f3f46]'}`} />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Regenerate Script (icon-only + tooltip) */}
        {isRegenerating ? (
          <span className="inline-flex items-center justify-center w-8 h-8 text-amber-400" title="Generating new script...">
            <RefreshCw className="w-4 h-4 motion-safe:animate-spin" />
          </span>
        ) : (
          <button
            type="button"
            onClick={onRegenerateScriptProp}
            disabled={scriptConfirmed || !onRegenerateScriptProp}
            className={`
              inline-flex items-center justify-center w-8 h-8 rounded-lg
              border transition-all duration-200
              ${scriptConfirmed || !onRegenerateScriptProp
                ? 'border-[#262626] bg-[#161616] text-[#57534E] cursor-not-allowed opacity-60'
                : 'border-[#262626] bg-[#161616] text-[#78716C] hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 cursor-pointer'
              }
            `}
            title={scriptConfirmed ? 'Unlock script to regenerate' : 'Regenerate entire script'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Copy Script (icon-only + tooltip) */}
        <button
          type="button"
          onClick={handleCopyScript}
          className={`
            inline-flex items-center justify-center w-8 h-8 rounded-lg
            border border-[#262626] bg-[#161616] transition-all duration-200 cursor-pointer
            ${copySuccess
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
              : 'text-[#78716C] hover:text-[#A8A29E] hover:border-[#3f3f46]'
            }
          `}
          title={copySuccess ? 'Copied!' : 'Copy all script to clipboard'}
        >
          {copySuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <ClipboardCopy className="w-4 h-4" />
          )}
        </button>

        {/* Confirm / Unlock */}
        {scriptConfirmed ? (
          <button
            type="button"
            onClick={handleUnconfirm}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border
              border-amber-500/30 bg-amber-500/10 text-amber-400
              text-xs font-medium transition-all duration-200 cursor-pointer
              hover:bg-amber-500/20"
          >
            <Lock className="w-3.5 h-3.5" />
            Unlock Script
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              bg-emerald-500 text-white
              text-xs font-medium transition-all duration-200 cursor-pointer
              hover:bg-emerald-600"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Confirm & Continue
          </button>
        )}
      </div>

      {/* Confirmed banner */}
      {scriptConfirmed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-[11px] text-emerald-400">
            Script confirmed. Editing is locked. Unlock to make changes.
          </span>
        </div>
      )}

      {/* ================================================================ */}
      {/* SEGMENT CARDS LIST                                                */}
      {/* ================================================================ */}
      <div className="space-y-3">
        {segments.map((segment, segIdx) => {
          const isHook = segment.segmentType === 'HOOK';
          const isLoopEnd = segment.segmentType === 'LOOP-END';
          const nextSegment = segments[segIdx + 1];
          const segDensity = calculateWordDensity(segment.wordCount, segment.maxWords);
          // Can merge: not HOOK, not last, next exists and is same shot type or both BODY-like
          const canMergeDown = !isHook && !isLoopEnd && !!nextSegment &&
            nextSegment.segmentType !== 'HOOK' && nextSegment.segmentType !== 'LOOP-END';
          // Can split: word count >= 4 (need at least 2 words per half)
          const canSplit = segment.wordCount >= 4;
          const lowDensity = segDensity < 50;

          return (
            <SegmentCard
              key={segment.id}
              segment={segment}
              isLoopEnd={isLoopEnd}
              selectedHook={selectedHook}
              isHookSegment={isHook}
              onEditScript={(value) => handleEditSegment(segment.id, 'script', value)}
              onFixSegment={() => handleFixSegment(segment.id)}
              scriptConfirmed={scriptConfirmed}
              segmentEnabled={segment.isEnabled ?? true}
              onToggleEnabled={() => handleToggleSegment(segment.id)}
              onDurationChange={(seconds) => handleAdjustDuration(segment.id, seconds)}
              isFocused={focusedSegmentId === segment.id}
              onFocus={() => onFocusSegment?.(segment.id)}
              canMergeDown={canMergeDown}
              onMerge={() => nextSegment && onMergeSegmentsProp?.(segment.id, nextSegment.id)}
              canSplit={canSplit}
              onSplitAtIndex={(index) => {
                onSplitSegmentProp?.(segment.id, index);
              }}
              lowDensity={lowDensity}
              nextSegmentDuration={nextSegment?.duration}
            />
          );
        })}
      </div>

    </div>
  );
};
