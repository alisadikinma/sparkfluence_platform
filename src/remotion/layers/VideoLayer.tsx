// ============================================================================
// Sparkfluence Studio — Video Layer (Remotion)
// Renders a video clip within a layer. Uses Remotion's <Video> for preview.
// ============================================================================

import React from 'react';
import { Video } from 'remotion';

interface VideoLayerProps {
  src: string;
}

export const VideoLayer: React.FC<VideoLayerProps> = ({ src }) => {
  if (!src) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a2e' }} />;
  }

  return (
    <Video
      src={src}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};
