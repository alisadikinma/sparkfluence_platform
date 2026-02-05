// ============================================================================
// Sparkfluence Studio — Segment Renderer
// Renders all layers within a single segment in z-index order.
// ============================================================================

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import type { SegmentComposition, LayerItem } from '../../types/studio';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../../types/studio';
import { getLayoutRegions } from '../../lib/composition';
import { VideoLayer } from './VideoLayer';
import { ImageLayer } from './ImageLayer';
import { TextLayer } from './TextLayer';
import { EffectLayer } from './EffectLayer';

interface SegmentRendererProps {
  segment: SegmentComposition;
}

export const SegmentRenderer: React.FC<SegmentRendererProps> = ({ segment }) => {
  const sortedLayers = [...segment.layers]
    .filter(l => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <AbsoluteFill>
      {sortedLayers.map((layer) => (
        <Sequence
          key={layer.id}
          from={layer.inFrame}
          durationInFrames={layer.outFrame - layer.inFrame}
        >
          <LayerRenderer layer={layer} segmentDuration={segment.durationInFrames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// --- Layer Type Router ---

interface LayerRendererProps {
  layer: LayerItem;
  segmentDuration: number;
}

const LayerRenderer: React.FC<LayerRendererProps> = ({ layer, segmentDuration }) => {
  const frame = useCurrentFrame();
  const totalFrames = layer.outFrame - layer.inFrame;

  // Calculate animation progress
  const enterFrames = layer.animation?.enterDurationFrames || 0;
  const exitFrames = layer.animation?.exitDurationFrames || 0;

  let opacity = layer.opacity;
  let transform = '';

  // Enter animation
  if (enterFrames > 0 && frame < enterFrames) {
    const progress = frame / enterFrames;
    const anim = getEnterTransform(layer.animation?.enter || 'none', progress);
    opacity *= anim.opacity;
    transform = anim.transform;
  }

  // Exit animation
  if (exitFrames > 0 && frame > totalFrames - exitFrames) {
    const progress = (totalFrames - frame) / exitFrames;
    const anim = getExitTransform(layer.animation?.exit || 'none', progress);
    opacity *= anim.opacity;
    transform += ` ${anim.transform}`;
  }

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: layer.position.x,
    top: layer.position.y,
    width: layer.size.w,
    height: layer.size.h,
    opacity,
    transform: `rotate(${layer.rotation}deg) ${transform}`.trim(),
    zIndex: layer.zIndex,
    overflow: 'hidden',
  };

  switch (layer.type) {
    case 'video':
      return (
        <div style={positionStyle}>
          <VideoLayer src={layer.src} />
        </div>
      );
    case 'image':
      return (
        <div style={positionStyle}>
          <ImageLayer src={layer.src} />
        </div>
      );
    case 'text':
      return (
        <div style={positionStyle}>
          <TextLayer text={layer.text!} />
        </div>
      );
    case 'effect':
      return <EffectLayer layer={layer} frame={frame} totalFrames={totalFrames} />;
    case 'lottie':
      // Lottie placeholder — renders as static image for now.
      // Phase 4 adds @remotion/lottie integration.
      return (
        <div style={positionStyle}>
          <img
            src={layer.src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    default:
      return null;
  }
};

// --- Animation Helpers ---

function getEnterTransform(type: string, progress: number): { opacity: number; transform: string } {
  switch (type) {
    case 'fade-in':
      return { opacity: progress, transform: '' };
    case 'pop-in':
      return { opacity: progress, transform: `scale(${0.3 + progress * 0.7})` };
    case 'slide-left':
      return { opacity: 1, transform: `translateX(${(1 - progress) * 100}px)` };
    case 'slide-right':
      return { opacity: 1, transform: `translateX(${(progress - 1) * 100}px)` };
    case 'slide-up':
      return { opacity: 1, transform: `translateY(${(1 - progress) * 100}px)` };
    case 'slide-down':
      return { opacity: 1, transform: `translateY(${(progress - 1) * 100}px)` };
    case 'bounce': {
      // Simple bounce easing
      const t = progress;
      const bounce = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return { opacity: 1, transform: `scale(${bounce})` };
    }
    case 'scale-up':
      return { opacity: progress, transform: `scale(${progress})` };
    default:
      return { opacity: 1, transform: '' };
  }
}

function getExitTransform(type: string, progress: number): { opacity: number; transform: string } {
  switch (type) {
    case 'fade-out':
      return { opacity: progress, transform: '' };
    case 'slide-out':
      return { opacity: 1, transform: `translateX(${(1 - progress) * 100}px)` };
    case 'scale-down':
      return { opacity: progress, transform: `scale(${progress})` };
    default:
      return { opacity: 1, transform: '' };
  }
}
