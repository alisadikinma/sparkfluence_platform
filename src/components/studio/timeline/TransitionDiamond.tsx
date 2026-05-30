// ============================================================================
// TransitionDiamond — Diamond shape rendered between adjacent clips on timeline
// Color-coded by transition type with hover tooltip showing type name
// ============================================================================

import React, { useState } from 'react';
import type { TransitionItem, TransitionType } from '../../../types/studio';

interface TransitionDiamondProps {
  transition: TransitionItem | null;
  fromSegmentId: string;
  toSegmentId: string;
  pixelsPerSecond: number;
  positionX: number;
  onClick: () => void;
  onDelete?: () => void;
}

// Color per transition type
const TRANSITION_COLORS: Record<TransitionType, { bg: string; border: string; text: string; hoverBg: string }> = {
  fade:        { bg: 'rgba(16, 185, 129, 0.20)', border: 'rgba(16, 185, 129, 0.60)', text: '#10B981', hoverBg: 'rgba(16, 185, 129, 0.35)' },
  slide:       { bg: 'rgba(59, 130, 246, 0.20)', border: 'rgba(59, 130, 246, 0.60)', text: '#3B82F6', hoverBg: 'rgba(59, 130, 246, 0.35)' },
  wipe:        { bg: 'rgba(245, 158, 11, 0.20)', border: 'rgba(245, 158, 11, 0.60)', text: '#F59E0B', hoverBg: 'rgba(245, 158, 11, 0.35)' },
  flip:        { bg: 'rgba(168, 85, 247, 0.20)', border: 'rgba(168, 85, 247, 0.60)', text: '#A855F7', hoverBg: 'rgba(168, 85, 247, 0.35)' },
  'clock-wipe':{ bg: 'rgba(236, 72, 153, 0.20)', border: 'rgba(236, 72, 153, 0.60)', text: '#EC4899', hoverBg: 'rgba(236, 72, 153, 0.35)' },
  iris:        { bg: 'rgba(6, 182, 212, 0.20)',  border: 'rgba(6, 182, 212, 0.60)',  text: '#06B6D4', hoverBg: 'rgba(6, 182, 212, 0.35)' },
};

const TRANSITION_LABELS: Record<TransitionType, string> = {
  fade: 'Fade',
  slide: 'Slide',
  wipe: 'Wipe',
  flip: 'Flip',
  'clock-wipe': 'Clock',
  iris: 'Iris',
};

// Minimal SVG icons per transition type (16x16 viewBox)
const TRANSITION_ICONS: Record<TransitionType, React.ReactNode> = {
  fade: (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="12" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="9" y="2" width="5" height="12" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  slide: (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="6" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <path d="M10 8L14 5V11L10 8Z" fill="currentColor" />
    </svg>
  ),
  wipe: (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="2" y="2" width="6" height="12" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  flip: (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <path d="M4 3L4 13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 5L4 8L7 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 3L12 13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5L12 8L9 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  'clock-wipe': (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M8 8L8 3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8L12 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  iris: (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
};

export const TransitionDiamond: React.FC<TransitionDiamondProps> = ({
  transition,
  fromSegmentId,
  toSegmentId,
  pixelsPerSecond,
  positionX,
  onClick,
  onDelete,
}) => {
  const hasTransition = transition !== null;
  const diamondSize = 20;
  const [isHovered, setIsHovered] = useState(false);

  const colors = hasTransition
    ? TRANSITION_COLORS[transition.type] || TRANSITION_COLORS.fade
    : null;

  return (
    <div
      className="absolute z-10 cursor-pointer group"
      style={{
        left: positionX - diamondSize / 2,
        top: '50%',
        transform: 'translateY(-50%)',
        width: diamondSize,
        height: diamondSize,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasTransition && onDelete) {
          onDelete();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Diamond shape via 45deg rotation */}
      <div
        className="w-full h-full flex items-center justify-center transition-all duration-150"
        style={
          hasTransition && colors
            ? {
                backgroundColor: isHovered ? colors.hoverBg : colors.bg,
                border: `1px solid ${colors.border}`,
                transform: 'rotate(45deg)',
                borderRadius: 3,
              }
            : {
                backgroundColor: isHovered ? 'rgba(64,64,64,0.6)' : 'rgba(38,38,38,0.6)',
                border: '1px dashed rgba(115,115,115,0.6)',
                transform: 'rotate(45deg)',
                borderRadius: 3,
              }
        }
      >
        {/* Icon counter-rotated to stay upright */}
        <div style={{ transform: 'rotate(-45deg)' }}>
          {hasTransition ? (
            <span style={{ color: colors?.text }}>
              {TRANSITION_ICONS[transition.type] || TRANSITION_ICONS['fade']}
            </span>
          ) : (
            <svg
              width="8"
              height="8"
              viewBox="0 0 16 16"
              fill="none"
              className="text-neutral-500 group-hover:text-neutral-400"
            >
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Hover tooltip — shows transition type name */}
      {isHovered && hasTransition && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap z-30 shadow-lg pointer-events-none"
          style={{
            bottom: diamondSize + 4,
            backgroundColor: colors?.text,
            color: '#000',
          }}
        >
          {TRANSITION_LABELS[transition.type] || transition.type}
        </div>
      )}

      {/* Hover tooltip for empty diamond */}
      {isHovered && !hasTransition && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 text-[9px] font-medium whitespace-nowrap z-30 shadow-lg pointer-events-none"
          style={{ bottom: diamondSize + 4 }}
        >
          Add transition
        </div>
      )}
    </div>
  );
};
