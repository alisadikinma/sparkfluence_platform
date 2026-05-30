// ============================================================================
// Caption Style Picker — 2x3 grid of caption style thumbnails.
// Clicking a style applies it globally to all captions.
// ============================================================================

import React from 'react';
import type { CaptionStyle } from '../../../types/studio';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CaptionStylePickerProps {
  currentStyle: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
}

// ---------------------------------------------------------------------------
// Style definitions — used for both rendering thumbnails and future caption rendering
// ---------------------------------------------------------------------------
interface CaptionStyleDef {
  id: CaptionStyle;
  label: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  bgColor: string | null;
  strokeColor: string | null;
  strokeWidth: number;
  glow: string | null;
  opacity: number;
  description: string;
}

const CAPTION_STYLES: CaptionStyleDef[] = [
  {
    id: 'classic',
    label: 'Classic',
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 36,
    color: '#FFFFFF',
    bgColor: null,
    strokeColor: null,
    strokeWidth: 0,
    glow: null,
    opacity: 1,
    description: 'White bold text with drop shadow',
  },
  {
    id: 'bold',
    label: 'Bold',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    fontSize: 40,
    color: '#FBBF24',
    bgColor: '#000000',
    strokeColor: null,
    strokeWidth: 0,
    glow: null,
    opacity: 1,
    description: 'Yellow text on black pill background',
  },
  {
    id: 'neon',
    label: 'Neon',
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 36,
    color: '#10B981',
    bgColor: null,
    strokeColor: null,
    strokeWidth: 0,
    glow: '0 0 8px #10B981, 0 0 16px #10B98180',
    opacity: 1,
    description: 'Emerald text with neon glow effect',
  },
  {
    id: 'outline',
    label: 'Outline',
    fontFamily: 'Montserrat',
    fontWeight: 900,
    fontSize: 40,
    color: 'transparent',
    bgColor: null,
    strokeColor: '#FFFFFF',
    strokeWidth: 3,
    glow: null,
    opacity: 1,
    description: 'Transparent fill with white stroke',
  },
  {
    id: 'karaoke',
    label: 'Karaoke',
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 36,
    color: '#FFFFFF',
    bgColor: null,
    strokeColor: null,
    strokeWidth: 0,
    glow: null,
    opacity: 1,
    description: 'White to emerald gradient reveal',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 28,
    color: '#FFFFFF',
    bgColor: null,
    strokeColor: null,
    strokeWidth: 0,
    glow: null,
    opacity: 0.8,
    description: 'Subtle small white text',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const CaptionStylePicker: React.FC<CaptionStylePickerProps> = ({
  currentStyle,
  onStyleChange,
}) => {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
        Caption Style
      </p>

      <div className="grid grid-cols-3 gap-2">
        {CAPTION_STYLES.map((style) => {
          const isSelected = currentStyle === style.id;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              className={`group flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all ${
                isSelected
                  ? 'bg-emerald-500/10 border-2 border-emerald-500/60'
                  : 'bg-neutral-800 border-2 border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {/* Thumbnail preview */}
              <StyleThumbnail style={style} />

              {/* Label */}
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isSelected ? 'text-emerald-400' : 'text-neutral-400 group-hover:text-neutral-300'
                }`}
              >
                {style.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Thumbnail — mini preview showing styled sample text
// ---------------------------------------------------------------------------
const StyleThumbnail: React.FC<{ style: CaptionStyleDef }> = ({ style }) => {
  const previewText = 'Abc';

  // Build inline style for the preview text
  const textStyle: React.CSSProperties = {
    fontFamily: `"${style.fontFamily}", sans-serif`,
    fontWeight: style.fontWeight,
    fontSize: 14,
    lineHeight: 1.2,
    color: style.color,
    opacity: style.opacity,
    textShadow: style.glow ?? undefined,
    WebkitTextStroke:
      style.strokeColor && style.strokeWidth > 0
        ? `${Math.max(1, style.strokeWidth * 0.5)}px ${style.strokeColor}`
        : undefined,
  };

  // Karaoke: half white, half emerald via gradient clip
  if (style.id === 'karaoke') {
    textStyle.background = 'linear-gradient(90deg, #FFFFFF 50%, #10B981 50%)';
    textStyle.WebkitBackgroundClip = 'text';
    textStyle.WebkitTextFillColor = 'transparent';
    textStyle.color = undefined as unknown as string;
  }

  // Classic: drop shadow
  if (style.id === 'classic') {
    textStyle.textShadow = '1px 1px 3px rgba(0,0,0,0.8)';
  }

  return (
    <div className="w-full h-8 rounded bg-neutral-900 flex items-center justify-center overflow-hidden">
      {style.bgColor ? (
        <span
          className="inline-block px-1.5 py-0.5 rounded"
          style={{ backgroundColor: style.bgColor }}
        >
          <span style={textStyle}>{previewText}</span>
        </span>
      ) : (
        <span style={textStyle}>{previewText}</span>
      )}
    </div>
  );
};

// Export style definitions for use in actual caption rendering
export { CAPTION_STYLES };
export type { CaptionStyleDef };
