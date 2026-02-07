import React from 'react';
import { Shield, Flame, Eye, type LucideIcon } from 'lucide-react';
import type { HookOptions } from '../../../contexts/WorkspaceContext';

// ============================================================================
// TYPES
// ============================================================================

interface HookSelectorProps {
  options: HookOptions;
  selectedKey: string; // 'option_a_safe' | 'option_b_negative' | 'option_c_visual'
  onSelect: (key: string) => void;
  disabled: boolean; // true after script confirmed
}

// ============================================================================
// HOOK TINT HELPER (exported)
// ============================================================================

/**
 * Returns a Tailwind-compatible inline style background for the parent card
 * based on the selected hook variant.
 */
export function getHookTint(key: string): string {
  switch (key) {
    case 'option_a_safe':
      return 'rgba(34, 197, 94, 0.04)';
    case 'option_b_negative':
      return 'rgba(239, 68, 68, 0.04)';
    case 'option_c_visual':
      return 'rgba(6, 182, 212, 0.04)';
    default:
      return 'transparent';
  }
}

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

interface TabDef {
  key: string;
  label: string;
  Icon: LucideIcon;
  activeBorder: string;
  activeBg: string;
  activeText: string;
}

const TABS: TabDef[] = [
  {
    key: 'option_a_safe',
    label: 'Safe',
    Icon: Shield,
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-500/10',
    activeText: 'text-emerald-400',
  },
  {
    key: 'option_b_negative',
    label: 'Bold',
    Icon: Flame,
    activeBorder: 'border-red-500',
    activeBg: 'bg-red-500/10',
    activeText: 'text-red-400',
  },
  {
    key: 'option_c_visual',
    label: 'Visual',
    Icon: Eye,
    activeBorder: 'border-cyan-500',
    activeBg: 'bg-cyan-500/10',
    activeText: 'text-cyan-400',
  },
];

// ============================================================================
// HOOK TYPE BADGE COLOR
// ============================================================================

function hookTypeBadgeClasses(hookType: string): string {
  switch (hookType) {
    case 'curiosity_gap':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'negative_controversial':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'visual_action':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    default:
      return 'bg-[#262626] text-[#A8A29E] border-[#262626]';
  }
}

function formatHookType(hookType: string): string {
  return hookType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================================
// COMPONENT
// ============================================================================

export const HookSelector: React.FC<HookSelectorProps> = ({
  options,
  selectedKey,
  onSelect,
  disabled,
}) => {
  const selectedOption =
    options[selectedKey as keyof HookOptions] ?? options.option_a_safe;

  return (
    <div className="space-y-3">
      {/* Tab buttons */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const isActive = selectedKey === tab.key;
          const TabIcon = tab.Icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              disabled={disabled}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
                transition-all duration-200
                ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed border-[#262626] bg-[#161616] text-[#57534E]'
                    : isActive
                      ? `${tab.activeBorder} ${tab.activeBg} ${tab.activeText}`
                      : 'border-[#262626] bg-[#161616] text-[#78716C] hover:border-[#3f3f46] hover:text-[#A8A29E]'
                }
              `}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Preview of selected hook */}
      <div className="space-y-2">
        <p className="text-[15px] leading-relaxed text-[#FAFAF9]">
          {selectedOption.script_text}
        </p>
        <span
          className={`
            inline-block text-[10px] font-semibold uppercase tracking-wider
            px-2.5 py-1 rounded-full border
            ${hookTypeBadgeClasses(selectedOption.hook_type)}
          `}
        >
          {formatHookType(selectedOption.hook_type)}
        </span>
      </div>
    </div>
  );
};
