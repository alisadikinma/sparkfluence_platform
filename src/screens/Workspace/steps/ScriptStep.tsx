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
  ChevronDown,
  GitMerge,
  SplitSquareHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { HookOptions, ScoreBreakdown } from '../../../contexts/WorkspaceContext';
import { HookSelector, getHookTint } from '../components/HookSelector';
import { ViralityScore } from '../components/ViralityScore';
import { ScriptComparison } from '../components/ScriptComparison';

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
  isEnabled?: boolean;
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
  // Phase 2: Segment operations
  onToggleSegment?: (segmentId: string) => void;
  onAdjustDuration?: (segmentId: string, durationSeconds: number) => void;
  // Phase 3: Version system
  scriptVersions?: Array<{ version: number; score: number }>;
  selectedVersion?: number;
  onSelectVersion?: (version: number) => void;
  onGenerateNewVersion?: () => void;
  // Phase 5: Coach focus
  focusedSegmentId?: string | null;
  onFocusSegment?: (segmentId: string) => void;
  // Phase 6: Merge/Split
  onMergeSegments?: (segmentId1: string, segmentId2: string) => void;
  onSplitSegment?: (segmentId: string, splitIndex: number) => void;
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
const DURATION_OPTIONS = [5, 6, 7, 8] as const;

function maxWordsForDuration(seconds: number): number {
  return Math.floor((130 / 60) * seconds * 0.80);
}

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
  segmentEnabled: boolean;
  onToggleEnabled: () => void;
  onDurationChange: (seconds: number) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  canMergeDown?: boolean;
  onMerge?: () => void;
  canSplit?: boolean;
  onSplit?: () => void;
  lowDensity?: boolean;
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
  segmentEnabled,
  onToggleEnabled,
  onDurationChange,
  isFocused,
  onFocus,
  canMergeDown,
  onMerge,
  canSplit,
  onSplit,
  lowDensity,
}) => {
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const borderColor = retentionBorderColor(segment.segmentType);
  const isDisabled = !segmentEnabled;
  const density = calculateWordDensity(segment.wordCount, segment.maxWords);
  const densityInfo = densityColor(density);

  // Determine card background — hook tint when HOOK segment selected
  const cardBg = isHook ? getHookTint(selectedHook) : undefined;

  return (
    <div
      className={`
        relative rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200
        ${isDisabled ? 'opacity-40' : ''}
        ${isFocused ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-[#262626]'}
      `}
      style={{
        boxShadow: `inset 4px 0 0 0 ${borderColor}`,
        backgroundColor: cardBg || '#161616',
      }}
      onClick={onFocus}
    >
      <div className="p-4 space-y-3">
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

        {/* HOOK special: HookSelector */}
        {isHook && hookOptions && (
          <HookSelector
            options={hookOptions}
            selectedKey={selectedHook}
            onSelect={onSelectHook}
            disabled={scriptConfirmed || isDisabled}
          />
        )}

        {/* Script text area */}
        {!isHook && (
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
        )}

        {/* Word density indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-medium ${densityInfo.text}`}>
              {density}% {densityInfo.label}
            </span>
            <span
              className={`text-[12px] font-mono ${
                segment.isOverLimit ? 'text-red-400' : 'text-[#78716C]'
              }`}
            >
              {segment.wordCount}/{segment.maxWords} words
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0B0E14] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${densityInfo.bg}`}
              style={{ width: `${Math.min(density, 100)}%` }}
            />
          </div>
        </div>

        {/* Waveform / speech timing bar */}
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

        {/* Emotion badge + Director Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Emotion badge */}
          {segment.emotion && (
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium bg-violet-500/10 text-violet-400">
              {segment.emotion}
            </span>
          )}

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
          {!scriptConfirmed && !isDisabled && (
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

        {/* Merge/Split actions + auto-merge suggestion */}
        {!scriptConfirmed && !isDisabled && (canMergeDown || canSplit || lowDensity) && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#1E1E1E]">
            {canSplit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSplit?.(); }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716C] hover:text-[#A8A29E] transition-colors"
              >
                <Scissors className="w-3 h-3" />
                Split
              </button>
            )}
            {canMergeDown && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMerge?.(); }}
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
        )}
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
  onToggleSegment: onToggleSegmentProp,
  onAdjustDuration: onAdjustDurationProp,
  scriptVersions: scriptVersionsProp,
  selectedVersion: selectedVersionProp,
  onSelectVersion: onSelectVersionProp,
  onGenerateNewVersion: onGenerateNewVersionProp,
  focusedSegmentId,
  onFocusSegment,
  onMergeSegments: onMergeSegmentsProp,
  onSplitSegment: onSplitSegmentProp,
}) => {
  // Internal state (fallback to mock data when props not provided)
  const [internalSegments, setInternalSegments] = useState<ScriptSegment[]>(MOCK_SEGMENTS);
  const [internalSelectedHook, setInternalSelectedHook] = useState('option_a_safe');
  const [internalNotes, setInternalNotes] = useState('');
  const [internalConfirmed, setInternalConfirmed] = useState(false);

  // Version system state
  const [internalVersions, setInternalVersions] = useState<Array<{ version: number; score: number }>>([
    { version: 1, score: 88 },
  ]);
  const [internalSelectedVersion, setInternalSelectedVersion] = useState(1);
  const [showCompare, setShowCompare] = useState(false);
  const [compareViewMode, setCompareViewMode] = useState<'inline' | 'side-by-side'>('inline');

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
  const scriptVersions = scriptVersionsProp ?? internalVersions;
  const selectedVersion = selectedVersionProp ?? internalSelectedVersion;
  const maxVersions = 3;

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

  const handleSelectVersion = useCallback(
    (version: number) => {
      if (onSelectVersionProp) {
        onSelectVersionProp(version);
      } else {
        setInternalSelectedVersion(version);
      }
    },
    [onSelectVersionProp],
  );

  const handleGenerateNewVersion = useCallback(() => {
    if (onGenerateNewVersionProp) {
      onGenerateNewVersionProp();
    } else {
      // Mock: add a new version with slightly different score
      const nextVersion = internalVersions.length + 1;
      if (nextVersion <= maxVersions) {
        setInternalVersions((prev) => [
          ...prev,
          { version: nextVersion, score: Math.max(60, Math.min(99, 88 + Math.floor(Math.random() * 10 - 5))) },
        ]);
        setInternalSelectedVersion(nextVersion);
      }
    }
  }, [onGenerateNewVersionProp, internalVersions.length]);

  return (
    <div className="space-y-4">
      {/* ================================================================ */}
      {/* TOP ACTION BAR                                                   */}
      {/* ================================================================ */}
      <div className="space-y-3">
        {/* Row 1: Virality Score + Action buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Virality Score (compact) */}
          <ViralityScore score={viralityScore} breakdown={scoreBreakdown} compact />

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {/* Generate Version N / Regenerate */}
            <button
              type="button"
              onClick={scriptVersions.length < maxVersions ? handleGenerateNewVersion : handleRegenerate}
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
              {isRegenerating
                ? 'Generating...'
                : scriptVersions.length < maxVersions
                  ? `Generate V${scriptVersions.length + 1}`
                  : 'Regenerate'
              }
            </button>

            {/* Compare button (only when 2+ versions) */}
            {scriptVersions.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowCompare(!showCompare)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
                  transition-all duration-200
                  ${showCompare
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-[#3f3f46] bg-[#1E1E1E] text-[#A8A29E] hover:border-[#57534E]'
                  }
                `}
              >
                Compare
              </button>
            )}

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

        {/* Row 2: Version tabs */}
        {scriptVersions.length > 0 && (
          <div className="flex items-center gap-1.5">
            {scriptVersions.map((v) => (
              <button
                key={v.version}
                type="button"
                onClick={() => handleSelectVersion(v.version)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200 border
                  ${selectedVersion === v.version
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-[#262626] bg-[#161616] text-[#78716C] hover:text-[#A8A29E] hover:border-[#3f3f46]'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selectedVersion === v.version ? 'bg-emerald-500' : 'bg-[#3f3f46]'}`} />
                V{v.version}
                <span className={`text-[10px] ${selectedVersion === v.version ? 'text-emerald-400/70' : 'text-[#57534E]'}`}>
                  {v.score}%
                </span>
              </button>
            ))}
          </div>
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
              isHook={isHook}
              isLoopEnd={isLoopEnd}
              hookOptions={hookOptions}
              selectedHook={selectedHook}
              onSelectHook={handleSelectHook}
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
              onSplit={() => {
                // Split at midpoint by default
                const midpoint = Math.ceil(segment.wordCount / 2);
                onSplitSegmentProp?.(segment.id, midpoint);
              }}
              lowDensity={lowDensity}
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
      {/* SCRIPT COMPARISON (Phase 3)                                       */}
      {/* ================================================================ */}
      {scriptVersions.length >= 2 && (
        <ScriptComparison
          isOpen={showCompare}
          viewMode={compareViewMode}
          onViewModeChange={setCompareViewMode}
          version1={{
            segments: segments as any,
            score: scriptVersions[0]?.score ?? 0,
            hookOptions: hookOptions as any,
          }}
          version2={{
            segments: segments as any,
            score: scriptVersions[scriptVersions.length - 1]?.score ?? 0,
            hookOptions: hookOptions as any,
          }}
          aiRecommendation={2}
          onKeepVersion1={() => {
            handleSelectVersion(1);
            setShowCompare(false);
          }}
          onUseVersion2={() => {
            handleSelectVersion(scriptVersions[scriptVersions.length - 1]?.version ?? 2);
            setShowCompare(false);
          }}
          onClose={() => setShowCompare(false)}
          isLoading={isRegenerating}
        />
      )}

    </div>
  );
};
