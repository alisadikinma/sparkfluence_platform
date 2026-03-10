// ============================================================================
// TransitionPicker — Popover panel for selecting transition type & duration
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TransitionItem, TransitionType } from '../../../types/studio';
import { STUDIO_FPS } from '../../../types/studio';

interface TransitionPickerProps {
  fromSegmentId: string;
  toSegmentId: string;
  currentTransition: TransitionItem | null;
  onSelect: (type: TransitionType, durationFrames: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

interface TransitionOption {
  type: TransitionType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    type: 'fade',
    label: 'Fade',
    description: 'Cross-dissolve',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="10" height="20" rx="2" fill="currentColor" opacity="0.8" />
        <rect x="18" y="6" width="10" height="20" rx="2" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    type: 'slide',
    label: 'Slide',
    description: 'Push from right',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="8" width="12" height="16" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="14" y="6" width="14" height="20" rx="2" fill="currentColor" opacity="0.8" />
        <path d="M20 16L26 12V20L20 16Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'wipe',
    label: 'Wipe',
    description: 'Horizontal reveal',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="24" height="20" rx="2" fill="currentColor" opacity="0.25" />
        <rect x="4" y="6" width="14" height="20" rx="2" fill="currentColor" opacity="0.8" />
        <line x1="18" y1="6" x2="18" y2="26" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: 'flip',
    label: 'Flip',
    description: '3D card flip',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path d="M8 6L8 26" stroke="currentColor" strokeWidth="2" />
        <path d="M14 10L8 16L14 22" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M24 6L24 26" stroke="currentColor" strokeWidth="2" />
        <path d="M18 10L24 16L18 22" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    type: 'clock-wipe',
    label: 'Clock',
    description: 'Radial sweep',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M16 16L16 7" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16L24 12" stroke="currentColor" strokeWidth="2" />
        <path d="M16 6 A10 10 0 0 1 25.5 11.5 L16 16 Z" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    type: 'iris',
    label: 'Iris',
    description: 'Circle reveal',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="24" height="20" rx="2" fill="currentColor" opacity="0.2" />
        <circle cx="16" cy="16" r="6" fill="currentColor" opacity="0.7" />
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      </svg>
    ),
  },
];

// Duration range: 0.3s to 1.0s, step 0.1s
const MIN_DURATION_S = 0.3;
const MAX_DURATION_S = 1.0;
const DURATION_STEP_S = 0.1;

function framesToDurationSeconds(frames: number): number {
  return Math.round((frames / STUDIO_FPS) * 10) / 10;
}

function durationSecondsToFrames(seconds: number): number {
  return Math.round(seconds * STUDIO_FPS);
}

export const TransitionPicker: React.FC<TransitionPickerProps> = ({
  fromSegmentId,
  toSegmentId,
  currentTransition,
  onSelect,
  onRemove,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<TransitionType>(
    currentTransition?.type ?? 'fade'
  );
  const [durationS, setDurationS] = useState<number>(
    currentTransition
      ? framesToDurationSeconds(currentTransition.durationInFrames)
      : 0.5
  );

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay adding listener to prevent immediate close from the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleTypeSelect = useCallback(
    (type: TransitionType) => {
      setSelectedType(type);
      onSelect(type, durationSecondsToFrames(durationS));
    },
    [durationS, onSelect]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setDurationS(val);
      onSelect(selectedType, durationSecondsToFrames(val));
    },
    [selectedType, onSelect]
  );

  return (
    <div
      ref={panelRef}
      className="bg-[#1E1E1E] border border-[#262626] rounded-xl shadow-2xl p-4 w-[300px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-200">Transition</h3>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 3x2 Grid of transition types */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TRANSITION_OPTIONS.map((opt) => {
          const isSelected = selectedType === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => handleTypeSelect(opt.type)}
              className={`
                flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all duration-150
                ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400'
                    : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600 hover:text-neutral-300'
                }
              `}
            >
              <div className="w-7 h-7 flex items-center justify-center">{opt.icon}</div>
              <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Duration slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-neutral-400">Duration</span>
          <span className="text-xs font-mono text-neutral-300">{durationS.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={MIN_DURATION_S}
          max={MAX_DURATION_S}
          step={DURATION_STEP_S}
          value={durationS}
          onChange={handleDurationChange}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-neutral-700 accent-emerald-500
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-emerald-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-emerald-400
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:w-3.5
            [&::-moz-range-thumb]:h-3.5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-emerald-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-emerald-400
            [&::-moz-range-thumb]:cursor-pointer
          "
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-neutral-600">{MIN_DURATION_S}s</span>
          <span className="text-[9px] text-neutral-600">{MAX_DURATION_S}s</span>
        </div>
      </div>

      {/* Remove button (only when transition exists) */}
      {currentTransition && (
        <button
          onClick={() => {
            onRemove();
            onClose();
          }}
          className="w-full py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
        >
          Remove Transition
        </button>
      )}
    </div>
  );
};
