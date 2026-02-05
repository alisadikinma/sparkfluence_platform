// ============================================================================
// Sparkfluence Studio — Text Layer (Remotion)
// Renders subtitles/captions with stroke outline for readability.
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

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        padding: '8px 16px',
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
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          paintOrder: 'stroke fill',
          textShadow: `0 2px 8px rgba(0,0,0,0.5)`,
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}
      >
        {content}
      </span>
    </div>
  );
};
