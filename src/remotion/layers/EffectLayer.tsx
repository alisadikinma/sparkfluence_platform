// ============================================================================
// Sparkfluence Studio — Effect Layer (Remotion)
// Renders CSS-based visual effects. Phase 4 upgrades to canvas particles.
// ============================================================================

import React from 'react';
import type { LayerItem } from '../../types/studio';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../../types/studio';
import { getEffectCSS } from '../../lib/effectLibrary';

interface EffectLayerProps {
  layer: LayerItem;
  frame: number;
  totalFrames: number;
}

export const EffectLayer: React.FC<EffectLayerProps> = ({ layer, frame, totalFrames }) => {
  if (!layer.effect?.preset) return null;

  const progress = totalFrames > 0 ? frame / totalFrames : 0;
  const css = getEffectCSS(layer.effect.preset, progress);

  return (
    <div
      style={{
        ...css,
        opacity: layer.opacity,
        zIndex: layer.zIndex,
      }}
    />
  );
};
