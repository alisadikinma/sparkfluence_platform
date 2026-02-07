import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Video,
  Scissors,
  Volume2,
  Type,
  Sparkles,
  Plus,
  RefreshCw,
  CheckCircle,
  Lock,
  AlertTriangle,
  Wand2,
  User,
  Film,
  Camera,
  Clapperboard,
  Power,
  type LucideIcon,
} from 'lucide-react';
import type { HookOptions, ScoreBreakdown } from '../../../contexts/WorkspaceContext';
import { HookSelector, getHookTint } from '../components/HookSelector';
import { ViralityScore } from '../components/ViralityScore';

// ============================================================================
// LOCAL TYPES
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

interface ComparisonData {
  oldVersion: number;
  newVersion: number;
  oldScore: number;
  newScore: number;
}

interface ScriptStepProps {
  segments?: ScriptSegment[];
  onEditSegment?: (segmentId: string, field: 'script' | 'visualDirection', value: string) => void;
  onFixSegment?: (segmentId: string) => void;
  hookOptions?: HookOptions | null;
  selectedHook?: string;
  onSelectHook?: (key: string) => void;
  viralityScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  canRegenerate?: boolean;
  comparisonData?: ComparisonData | null;
  onKeepVersion?: (version: number) => void;
  onDismissComparison?: () => void;
  additionalNotes?: string;
  onNotesChange?: (notes: string) => void;
  scriptConfirmed?: boolean;
  onConfirm?: () => void;
  onUnconfirm?: () => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SEGMENTS: ScriptSegment[] = [
  {
    id: '1',
    segmentNumber: 1,
    segmentType: 'HOOK',
    shotType: 'CREATOR' as const,
    duration: 8,
    script: 'Gue baru nemuin 3 cara AI yang literally bikin passive income.',
    visualDirection:
      'Scene: Creator di coffee shop, tuang kopi | Camera: Medium \u2192 Push-in ke wajah | [TEXT POP: "3 CARA AI"] | [SFX: Ding]',
    directorChips: [
      { id: 'c1', type: 'camera' as const, label: 'Medium \u2192 Push-in', icon: 'Video', color: 'blue' },
      { id: 'c2', type: 'text_pop' as const, label: '3 CARA AI', icon: 'Type', color: 'pink' },
      { id: 'c3', type: 'sfx' as const, label: 'Ding', icon: 'Volume2', color: 'green' },
    ],
    emotion: 'excited',
    maxWords: 14,
    wordCount: 11,
    isOverLimit: false,
    retentionLevel: 'high' as const,
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 5.1,
    waveformFill: 0.64,
  },
  {
    id: '2',
    segmentNumber: 2,
    segmentType: 'FORE',
    shotType: 'B-ROLL' as const,
    duration: 10,
    script: 'Yang ketiga literally bikin gue quit 9-to-5. Stay sampai akhir.',
    visualDirection: '[CUT TO: AI tools dashboard montage] | Camera: Quick-cut sequence | [SFX: Whoosh]',
    directorChips: [
      { id: 'c4', type: 'cut' as const, label: 'CUT TO: Montage', icon: 'Scissors', color: 'orange' },
      { id: 'c5', type: 'camera' as const, label: 'Quick-cut sequence', icon: 'Video', color: 'blue' },
      { id: 'c6', type: 'sfx' as const, label: 'Whoosh', icon: 'Volume2', color: 'green' },
    ],
    emotion: 'intriguing',
    maxWords: 17,
    wordCount: 12,
    isOverLimit: false,
    retentionLevel: 'medium' as const,
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 5.5,
    waveformFill: 0.55,
  },
  {
    id: '3',
    segmentNumber: 3,
    segmentType: 'BODY-1',
    shotType: 'B-ROLL' as const,
    duration: 10,
    script: 'Pertama: AI copywriting. Jasper bikin 50 artikel sehari.',
    visualDirection: '[CUT TO: Screen recording Jasper] | Camera: Zoom-in ke text output | [SFX: Typing]',
    directorChips: [
      { id: 'c8', type: 'cut' as const, label: 'CUT TO: Screen Recording', icon: 'Scissors', color: 'orange' },
      { id: 'c9', type: 'camera' as const, label: 'Zoom-in', icon: 'Video', color: 'blue' },
      { id: 'c10', type: 'sfx' as const, label: 'Typing', icon: 'Volume2', color: 'green' },
    ],
    emotion: 'informative',
    maxWords: 17,
    wordCount: 9,
    isOverLimit: false,
    retentionLevel: 'medium' as const,
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 4.2,
    waveformFill: 0.42,
  },
  {
    id: '4',
    segmentNumber: 4,
    segmentType: 'BODY-2',
    shotType: 'B-ROLL' as const,
    duration: 10,
    script: 'Kedua: AI video. Satu TikTok 10 menit bikin. Hasilnya? 50 juta views.',
    visualDirection: '[CUT TO: AI video generation screen] | Camera: Pan across multiple TikTok screens',
    directorChips: [
      { id: 'c12', type: 'cut' as const, label: 'CUT TO: AI Video Gen', icon: 'Scissors', color: 'orange' },
      { id: 'c13', type: 'camera' as const, label: 'Pan across screens', icon: 'Video', color: 'blue' },
    ],
    emotion: 'surprising',
    maxWords: 17,
    wordCount: 14,
    isOverLimit: false,
    retentionLevel: 'medium' as const,
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 6.5,
    waveformFill: 0.65,
  },
  {
    id: '5',
    segmentNumber: 5,
    segmentType: 'PEAK',
    shotType: 'B-ROLL' as const,
    duration: 10,
    script: 'Ketiga: AI trading bot. Gue pake sendiri. Profit 40% dalam 3 bulan.',
    visualDirection: '[CUT TO: Trading dashboard green profit] | Camera: Slow zoom ke profit number',
    directorChips: [
      { id: 'c16', type: 'cut' as const, label: 'CUT TO: Trading Dashboard', icon: 'Scissors', color: 'orange' },
      { id: 'c17', type: 'camera' as const, label: 'Slow zoom', icon: 'Video', color: 'blue' },
    ],
    emotion: 'mind-blown',
    maxWords: 17,
    wordCount: 14,
    isOverLimit: false,
    retentionLevel: 'high' as const,
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 6.5,
    waveformFill: 0.65,
  },
  {
    id: '6',
    segmentNumber: 6,
    segmentType: 'CTA',
    shotType: 'CREATOR' as const,
    duration: 10,
    script: 'Mau mulai yang mana? Comment 1, 2, atau 3.',
    visualDirection: 'Scene: Creator sip kopi, relaxed smile | Camera: Medium shot',
    directorChips: [
      { id: 'c20', type: 'camera' as const, label: 'Medium shot', icon: 'Video', color: 'blue' },
      { id: 'c21', type: 'text_pop' as const, label: '1, 2, atau 3?', icon: 'Type', color: 'pink' },
    ],
    emotion: 'friendly',
    maxWords: 17,
    wordCount: 10,
    isOverLimit: false,
    retentionLevel: 'medium' as const,
    needsFix: false,
    isFixing: false,
    estimatedSpeechSeconds: 4.6,
    waveformFill: 0.46,
  },
  {
    id: '7',
    segmentNumber: 7,
    segmentType: 'LOOP-END',
    shotType: 'CREATOR' as const,
    duration: 5,
    script: 'Oh iya, gue lupa satu cara lagi...',
    visualDirection: 'Scene: Creator tuang kopi lagi (mirror HOOK) | Camera: Same angle as HOOK',
    directorChips: [
      { id: 'c23', type: 'camera' as const, label: 'Same angle as HOOK', icon: 'Video', color: 'blue' },
      { id: 'c24', type: 'sfx' as const, label: 'Rewind', icon: 'Volume2', color: 'green' },
      { id: 'c25', type: 'cut' as const, label: 'CUT TO: HOOK start', icon: 'Scissors', color: 'orange' },
    ],
    emotion: 'teasing',
    maxWords: 9,
    wordCount: 8,
    isOverLimit: false,
    retentionLevel: 'low' as const,
    needsFix: true,
    isFixing: false,
    estimatedSpeechSeconds: 3.7,
    waveformFill: 0.74,
  },
];

const MOCK_HOOK_OPTIONS: HookOptions = {
  option_a_safe: {
    script_text: 'Gue baru nemuin 3 cara AI yang literally bikin passive income.',
    visual_direction:
      'Scene: Creator di coffee shop, tuang kopi | Camera: Medium \u2192 Push-in ke wajah | [TEXT POP: "3 CARA AI"] | [SFX: Ding]',
    hook_type: 'curiosity_gap',
  },
  option_b_negative: {
    script_text: 'Lo masih kerja manual di 2026? Ketinggalan parah.',
    visual_direction:
      'Scene: Creator slam laptop tutup | Camera: Close-up slam \u2192 Whip-pan ke wajah | [SFX: Boom] | [TEXT POP: "KETINGGALAN"]',
    hook_type: 'negative_controversial',
  },
  option_c_visual: {
    script_text: 'Liat dashboard ini. Semua dari AI.',
    visual_direction:
      '[Camera: Blur \u2192 Sharp focus on screen] | Creator tunjuk laptop | [CUT TO: Screen recording dashboard] | [SFX: Cash register]',
    hook_type: 'visual_action',
  },
};

const MOCK_SCORE_BREAKDOWN: ScoreBreakdown = {
  hook: { score: 95, status: 'pass' as const },
  pacing: { score: 90, status: 'pass' as const },
  density: { score: 75, status: 'warn' as const },
  cta: { score: 88, status: 'pass' as const },
  editingCues: { score: 92, status: 'pass' as const },
};

// ============================================================================
// ICON MAP FOR DIRECTOR CHIPS
// ============================================================================

const chipIconMap: Record<string, LucideIcon> = {
  camera: Video,
  action: Clapperboard,
  sfx: Volume2,
  vfx: Sparkles,
  text_pop: Type,
  cut: Scissors,
};

const chipColorMap: Record<string, string> = {
  camera: 'bg-blue-500/10 text-blue-400',
  action: 'bg-amber-500/10 text-amber-400',
  sfx: 'bg-green-500/10 text-green-400',
  vfx: 'bg-violet-500/10 text-violet-400',
  text_pop: 'bg-pink-500/10 text-pink-400',
  cut: 'bg-orange-500/10 text-orange-400',
};

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

interface SegmentCardProps {
  segment: ScriptSegment;
  isHook: boolean;
  isLoopEnd: boolean;
  hookOptions: HookOptions | null;
  selectedHook: string;
  onSelectHook: (key: string) => void;
  onEditScript: (value: string) => void;
  onFixSegment: () => void;
  scriptConfirmed: boolean;
  loopEndEnabled: boolean;
  onToggleLoopEnd: () => void;
}

const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  isHook,
  isLoopEnd,
  hookOptions,
  selectedHook,
  onSelectHook,
  onEditScript,
  onFixSegment,
  scriptConfirmed,
  loopEndEnabled,
  onToggleLoopEnd,
}) => {
  const borderColor = retentionBorderColor(segment.segmentType);
  const isDisabledLoopEnd = isLoopEnd && !loopEndEnabled;

  // Determine card background — hook tint when HOOK segment selected
  const cardBg = isHook ? getHookTint(selectedHook) : undefined;

  return (
    <div
      className={`
        relative rounded-xl border border-[#262626] overflow-hidden
        transition-all duration-200
        ${isDisabledLoopEnd ? 'opacity-40' : ''}
      `}
      style={{
        boxShadow: `inset 4px 0 0 0 ${borderColor}`,
        backgroundColor: cardBg || '#161616',
      }}
    >
      <div className="p-4 space-y-3">
        {/* LOOP-END toggle */}
        {isLoopEnd && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider">
              Loop End
            </span>
            <button
              type="button"
              onClick={onToggleLoopEnd}
              disabled={scriptConfirmed}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold
                transition-all duration-200 border
                ${scriptConfirmed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${
                  loopEndEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-[#1E1E1E] text-[#57534E] border-[#262626]'
                }
              `}
            >
              <Power className="w-3 h-3" />
              {loopEndEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Duration */}
          <span className="text-[11px] text-[#A8A29E] font-mono">
            {segment.duration}s
          </span>

          {/* Fix button */}
          {segment.needsFix && !segment.isFixing && (
            <button
              type="button"
              onClick={onFixSegment}
              disabled={scriptConfirmed || isDisabledLoopEnd}
              className={`
                inline-flex items-center gap-1 text-[10px] font-medium
                px-2 py-0.5 rounded-full border
                bg-amber-500/10 text-amber-400 border-amber-500/30
                hover:bg-amber-500/20 transition-colors
                ${(scriptConfirmed || isDisabledLoopEnd) ? 'opacity-50 cursor-not-allowed' : ''}
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
        </div>

        {/* HOOK special: HookSelector */}
        {isHook && hookOptions && (
          <HookSelector
            options={hookOptions}
            selectedKey={selectedHook}
            onSelect={onSelectHook}
            disabled={scriptConfirmed || isDisabledLoopEnd}
          />
        )}

        {/* Script text area */}
        {!isHook && (
          <AutoResizeTextarea
            value={segment.script}
            onChange={onEditScript}
            disabled={scriptConfirmed || isDisabledLoopEnd}
            className={`
              text-[15px] leading-relaxed text-[#FAFAF9]
              ${(scriptConfirmed || isDisabledLoopEnd) ? 'cursor-not-allowed' : ''}
            `}
            placeholder="Enter script text..."
          />
        )}

        {/* Word count */}
        <div className="flex justify-end">
          <span
            className={`text-[12px] font-mono ${
              segment.isOverLimit ? 'text-red-400' : 'text-[#78716C]'
            }`}
          >
            {segment.wordCount}/{segment.maxWords} words
          </span>
        </div>

        {/* Waveform overlay bar */}
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-[#0B0E14] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${waveformColor(segment.waveformFill)}`}
              style={{ width: `${Math.min(segment.waveformFill * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[11px] font-mono text-[#78716C]">
              {segment.estimatedSpeechSeconds.toFixed(1)}s / {segment.duration}s
            </span>
          </div>
        </div>

        {/* Director Chips row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {segment.directorChips.map((chip) => {
            const ChipIcon = chipIconMap[chip.type] || Camera;
            const colorClass = chipColorMap[chip.type] || 'bg-[#262626] text-[#A8A29E]';

            return (
              <span
                key={chip.id}
                className={`
                  inline-flex items-center gap-1 rounded-full px-3 py-1
                  text-[12px] font-medium ${colorClass}
                `}
              >
                <ChipIcon className="w-3 h-3" />
                {chip.label}
              </span>
            );
          })}

          {/* Add chip button */}
          {!scriptConfirmed && !isDisabledLoopEnd && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1
                text-[12px] font-medium text-[#57534E] bg-[#1E1E1E] border border-dashed border-[#3f3f46]
                hover:border-[#57534E] hover:text-[#78716C] transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SCRIPTSTEP COMPONENT
// ============================================================================

export const ScriptStep: React.FC<ScriptStepProps> = ({
  segments: segmentsProp,
  onEditSegment: onEditSegmentProp,
  onFixSegment: onFixSegmentProp,
  hookOptions: hookOptionsProp,
  selectedHook: selectedHookProp,
  onSelectHook: onSelectHookProp,
  viralityScore: viralityScoreProp,
  scoreBreakdown: scoreBreakdownProp,
  onRegenerate: onRegenerateProp,
  isRegenerating: isRegeneratingProp,
  canRegenerate: canRegenerateProp,
  additionalNotes: additionalNotesProp,
  onNotesChange: onNotesChangeProp,
  scriptConfirmed: scriptConfirmedProp,
  onConfirm: onConfirmProp,
  onUnconfirm: onUnconfirmProp,
}) => {
  // Internal state (fallback to mock data when props not provided)
  const [internalSegments, setInternalSegments] = useState<ScriptSegment[]>(MOCK_SEGMENTS);
  const [internalSelectedHook, setInternalSelectedHook] = useState('option_a_safe');
  const [internalNotes, setInternalNotes] = useState('');
  const [internalConfirmed, setInternalConfirmed] = useState(false);
  const [loopEndEnabled, setLoopEndEnabled] = useState(true);

  // Resolve props vs internal state
  const segments = segmentsProp ?? internalSegments;
  const hookOptions = hookOptionsProp ?? MOCK_HOOK_OPTIONS;
  const selectedHook = selectedHookProp ?? internalSelectedHook;
  const viralityScore = viralityScoreProp ?? 88;
  const scoreBreakdown = scoreBreakdownProp ?? MOCK_SCORE_BREAKDOWN;
  const isRegenerating = isRegeneratingProp ?? false;
  const canRegenerate = canRegenerateProp ?? true;
  const additionalNotes = additionalNotesProp ?? internalNotes;
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

  const handleRegenerate = useCallback(() => {
    if (onRegenerateProp) {
      onRegenerateProp();
    }
  }, [onRegenerateProp]);

  const handleNotesChange = useCallback(
    (notes: string) => {
      if (onNotesChangeProp) {
        onNotesChangeProp(notes);
      } else {
        setInternalNotes(notes);
      }
    },
    [onNotesChangeProp],
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

  const handleToggleLoopEnd = useCallback(() => {
    setLoopEndEnabled((prev) => !prev);
  }, []);

  return (
    <div className="space-y-4">
      {/* ================================================================ */}
      {/* TOP ACTION BAR                                                   */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Virality Score (compact) */}
        <ViralityScore score={viralityScore} breakdown={scoreBreakdown} compact />

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Regenerate button */}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating || !canRegenerate || scriptConfirmed}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
              transition-all duration-200
              ${
                isRegenerating || !canRegenerate || scriptConfirmed
                  ? 'border-[#262626] bg-[#161616] text-[#57534E] cursor-not-allowed'
                  : 'border-[#3f3f46] bg-[#1E1E1E] text-[#A8A29E] hover:border-amber-500/40 hover:text-amber-400'
              }
            `}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
            />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>

          {/* Confirm / Unconfirm button */}
          {scriptConfirmed ? (
            <button
              type="button"
              onClick={handleUnconfirm}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border
                border-amber-500/30 bg-amber-500/10 text-amber-400
                text-xs font-medium transition-all duration-200
                hover:bg-amber-500/20"
            >
              <Lock className="w-3.5 h-3.5" />
              Unlock Script
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border
                border-emerald-500/30 bg-emerald-500/10 text-emerald-400
                text-xs font-medium transition-all duration-200
                hover:bg-emerald-500/20 hover:border-emerald-500/50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm & Continue
            </button>
          )}
        </div>
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
        {segments.map((segment) => {
          const isHook = segment.segmentType === 'HOOK';
          const isLoopEnd = segment.segmentType === 'LOOP-END';

          return (
            <SegmentCard
              key={segment.id}
              segment={segment}
              isHook={isHook}
              isLoopEnd={isLoopEnd}
              hookOptions={hookOptions}
              selectedHook={selectedHook}
              onSelectHook={handleSelectHook}
              onEditScript={(value) => handleEditSegment(segment.id, 'script', value)}
              onFixSegment={() => handleFixSegment(segment.id)}
              scriptConfirmed={scriptConfirmed}
              loopEndEnabled={isLoopEnd ? loopEndEnabled : true}
              onToggleLoopEnd={handleToggleLoopEnd}
            />
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* ADDITIONAL NOTES                                                  */}
      {/* ================================================================ */}
      <div className="rounded-xl border border-[#262626] bg-[#161616] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#78716C]" />
          <span className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider">
            Additional Notes
          </span>
        </div>
        <textarea
          value={additionalNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          disabled={scriptConfirmed}
          placeholder="Add notes for the AI to consider during regeneration..."
          rows={3}
          className={`
            w-full bg-[#0B0E14] border border-[#262626] rounded-lg px-3 py-2
            text-[13px] text-[#FAFAF9] placeholder-[#57534E]
            outline-none resize-none
            focus:border-emerald-500/40 transition-colors
            ${scriptConfirmed ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
      </div>

      {/* ================================================================ */}
      {/* EXPANDED VIRALITY SCORE                                           */}
      {/* ================================================================ */}
      <div className="rounded-xl border border-[#262626] bg-[#161616] p-6">
        <ViralityScore score={viralityScore} breakdown={scoreBreakdown} />
      </div>
    </div>
  );
};
