// ============================================================================
// OverlayClipRenderer — Renders a single overlay clip (video/image/text)
// Used by VideoComposition to render overlay track clips on top of segments.
// ============================================================================

import React from 'react';
import { Img, OffthreadVideo, useCurrentFrame } from 'remotion';
import type { OverlayClip } from '../../types/studio';

interface OverlayClipRendererProps {
  clip: OverlayClip;
  /** The absolute frame offset of this clip on the timeline */
  clipStartFrame: number;
}

export const OverlayClipRenderer: React.FC<OverlayClipRendererProps> = ({
  clip,
  clipStartFrame,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - clipStartFrame;

  // Don't render if outside clip bounds
  if (relativeFrame < 0 || relativeFrame >= clip.durationInFrames) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: clip.position.x,
    top: clip.position.y,
    width: clip.size.w,
    height: clip.size.h,
    opacity: clip.opacity,
    zIndex: clip.zIndex,
  };

  if (clip.type === 'video' && clip.src) {
    return (
      <div style={style}>
        <OffthreadVideo
          src={clip.src}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
        />
      </div>
    );
  }

  if (clip.type === 'image' && clip.src) {
    return (
      <div style={style}>
        <Img
          src={clip.src}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  if (clip.type === 'text' && clip.text?.content) {
    const textStyle: React.CSSProperties = {
      ...style,
      fontFamily: clip.text.fontFamily || 'Inter',
      fontSize: clip.text.fontSize || 48,
      color: clip.text.color || '#FFFFFF',
      textAlign: (clip.text.align as React.CSSProperties['textAlign']) || 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: clip.text.align === 'left' ? 'flex-start' : clip.text.align === 'right' ? 'flex-end' : 'center',
      padding: '8px 12px',
      lineHeight: 1.3,
      wordBreak: 'break-word' as const,
    };

    // Text stroke via text-shadow
    const strokeColor = clip.text.strokeColor || '#000000';
    const strokeWidth = clip.text.strokeWidth || 0;
    if (strokeWidth > 0) {
      textStyle.textShadow = [
        `${strokeWidth}px 0 ${strokeColor}`,
        `-${strokeWidth}px 0 ${strokeColor}`,
        `0 ${strokeWidth}px ${strokeColor}`,
        `0 -${strokeWidth}px ${strokeColor}`,
      ].join(', ');
    }

    return (
      <div style={textStyle}>
        {clip.text.content}
      </div>
    );
  }

  return null;
};
