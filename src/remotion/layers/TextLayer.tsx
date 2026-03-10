// ============================================================================
// Sparkfluence Studio — Text Layer (Remotion)
// Renders text overlays with stroke outline for readability.
// Respects text.fontSize, text.lineHeight, and text.align from layer config.
// ============================================================================

import React from 'react';
import type { LayerItem } from '../../types/studio';

type TextConfig = NonNullable<LayerItem['text']>;

interface TextLayerProps {
  text: TextConfig;
}

export const TextLayer: React.FC<TextLayerProps> = ({ text }) => {
  const {
    content,
    fontFamily = 'Inter',
    fontSize = 48,
    color = '#FFFFFF',
    strokeColor = '#000000',
    strokeWidth = 2,
    align = 'center',
    lineHeight = 1.3,
  } = text;

  // Use text-shadow for stroke instead of WebkitTextStroke for better rendering
  const strokeShadow = strokeWidth > 0
    ? `${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}, -${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}, ${strokeWidth}px -${strokeWidth}px 0 ${strokeColor}, -${strokeWidth}px ${strokeWidth}px 0 ${strokeColor}, 0 ${strokeWidth}px 0 ${strokeColor}, 0 -${strokeWidth}px 0 ${strokeColor}, ${strokeWidth}px 0 0 ${strokeColor}, -${strokeWidth}px 0 0 ${strokeColor}`
    : 'none';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        padding: '4px 8px',
        overflow: 'visible',
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize,
          fontWeight: 800,
          color,
          textAlign: align,
          lineHeight,
          textShadow: strokeShadow !== 'none' ? strokeShadow : '0 2px 8px rgba(0,0,0,0.5)',
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}
      >
        {content}
      </span>
    </div>
  );
};
