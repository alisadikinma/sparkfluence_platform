import React, { useMemo } from 'react';
import { Shield, Flame, Eye, Lock } from 'lucide-react';
import { analyzeSegment, type SegmentInput } from '../../utils/scriptAnalysis';
import {
  SEGMENT_WEIGHT_IN_OVERALL,
  type SegmentType,
} from '../../../../lib/knowledge/12-scoring-engine';

// ============================================================================
// TYPES
// ============================================================================

interface HookOption {
  script_text: string;
  visual_direction: string;
  hook_type: string;
}

interface HookOptions {
  option_a_safe: HookOption;
  option_b_negative: HookOption;
  option_c_visual: HookOption;
}

interface StyleTabProps {
  hookOptions: HookOptions | null;
  selectedHook: string;
  segments: SegmentInput[];
  language: string;
  scriptConfirmed: boolean;
  onSelectHook: (key: string) => void;
}

// ============================================================================
// STYLE PRESETS
// ============================================================================

interface StylePreset {
  key: 'option_a_safe' | 'option_b_negative' | 'option_c_visual';
  icon: React.ReactNode;
  name: string;
  description: string;
  audience: string;
  activeBorder: string;
  activeRing: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    key: 'option_a_safe',
    icon: <Shield className="w-4 h-4" />,
    name: 'Safe',
    description: 'Curiosity-driven hook. Proven, brand-safe, builds trust with audience.',
    audience: 'Education, How-to, Business',
    activeBorder: 'border-emerald-500',
    activeRing: 'ring-emerald-500/20',
  },
  {
    key: 'option_b_negative',
    icon: <Flame className="w-4 h-4" />,
    name: 'Bold',
    description: 'Negative-bias hook. Provocative, stops the scroll with problem framing.',
    audience: 'Finance, Health, Self-improvement',
    activeBorder: 'border-red-500',
    activeRing: 'ring-red-500/20',
  },
  {
    key: 'option_c_visual',
    icon: <Eye className="w-4 h-4" />,
    name: 'Visual',
    description: 'Visual-shock hook. Dramatic visual opening for maximum pattern interrupt.',
    audience: 'Food, Travel, Beauty, Tech',
    activeBorder: 'border-cyan-500',
    activeRing: 'ring-cyan-500/20',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const StyleTab: React.FC<StyleTabProps> = ({
  hookOptions,
  selectedHook,
  segments,
  language,
  scriptConfirmed,
  onSelectHook,
}) => {
  // Compute predicted OVERALL script score for each hook variant
  // Swaps HOOK text, then scores ALL segments with the same weighted formula as the header
  const predictedScores = useMemo(() => {
    if (!hookOptions) return {};

    const enabledSegments = segments.filter(s => s.isEnabled !== false);
    const hookIndex = enabledSegments.findIndex(s => s.segmentType === 'HOOK');
    if (hookIndex < 0) return {};

    const scores: Record<string, number> = {};

    for (const preset of STYLE_PRESETS) {
      const option = hookOptions[preset.key];
      if (!option) continue;

      // For the ACTIVE hook, use actual segment text (may have been edited by user)
      // For non-active hooks, swap in the hook option's script_text
      const isActiveHook = preset.key === selectedHook;
      const modifiedSegments = enabledSegments.map((s, i) =>
        i === hookIndex && !isActiveHook ? { ...s, script: option.script_text } : s,
      );

      // Score all segments and compute weighted overall (same as Workspace.tsx clientScore)
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const seg of modifiedSegments) {
        const analysis = analyzeSegment(seg, language, modifiedSegments);
        const segType = seg.segmentType || 'BODY';
        const st = (segType.startsWith('BODY') ? 'BODY' : segType) as SegmentType;
        const weight = SEGMENT_WEIGHT_IN_OVERALL[st] ?? 0.1;
        totalWeightedScore += analysis.score * weight;
        totalWeight += weight;
      }

      scores[preset.key] = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    }

    return scores;
  }, [hookOptions, segments, language]);

  if (!hookOptions) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-xs text-[#78716C]">
          Generate a script to see hook style options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Style cards */}
      {STYLE_PRESETS.map((preset) => {
        const option = hookOptions[preset.key];
        if (!option) return null;

        const isActive = selectedHook === preset.key;
        const score = predictedScores[preset.key] ?? 0;
        const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => !scriptConfirmed && onSelectHook(preset.key)}
            disabled={scriptConfirmed}
            className={`
              w-full text-left rounded-xl border p-4 transition-all
              ${isActive
                ? `${preset.activeBorder} ring-1 ${preset.activeRing} bg-[#161616]`
                : 'border-[#262626] bg-[#161616] hover:border-[#3f3f46]'
              }
              ${scriptConfirmed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={isActive ? 'text-emerald-400' : 'text-[#78716C]'}>
                {preset.icon}
              </span>
              <span className="text-base font-semibold text-[#F5F5F5]">
                {preset.name}
              </span>
              {isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Active
                </span>
              )}
              <span className={`ml-auto text-base font-mono font-bold ${scoreColor}`}>
                {score}%
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-[#78716C] leading-relaxed mb-2">
              {preset.description}
            </p>

            {/* Hook preview text */}
            <p className="text-sm text-[#A8A29E] leading-relaxed italic line-clamp-2">
              &ldquo;{option.script_text}&rdquo;
            </p>

            {/* Audience hint */}
            <div className="mt-2 flex items-center gap-1">
              <span className="text-xs text-[#57534E]">Best for:</span>
              <span className="text-xs text-[#78716C]">{preset.audience}</span>
            </div>

            {/* Low score warning for non-active styles */}
            {!isActive && score > 0 && score < 70 && (
              <p className="text-xs text-amber-400/70 mt-1.5">
                Lower score — fixable in Issues tab after switching.
              </p>
            )}
          </button>
        );
      })}

      {/* Locked state hint */}
      {scriptConfirmed && (
        <div className="flex items-center gap-1.5 text-xs text-[#78716C] bg-[#161616] rounded-lg p-3 border border-[#262626]">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Unconfirm script to change hook style.</span>
        </div>
      )}

      {/* Bottom hint */}
      {!scriptConfirmed && (
        <p className="text-xs text-[#78716C] text-center leading-relaxed">
          Each style changes the HOOK segment. Other segments stay the same.
        </p>
      )}
    </div>
  );
};
