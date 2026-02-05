// ============================================================================
// Sparkfluence Studio — Video Layer (Remotion)
// Renders a video clip within a layer. Uses Remotion's <Video> for preview
// and falls back to <video> tag if Remotion is not available.
// ============================================================================

import React from 'react';

interface VideoLayerProps {
  src: string;
}

export const VideoLayer: React.FC<VideoLayerProps> = ({ src }) => {
  if (!src) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a2e' }} />;
  }

  // Use Remotion's <OffthreadVideo> for frame-accurate rendering.
  // Falls back to standard video element if Remotion is not loaded.
  try {
    const { OffthreadVideo } = require('remotion');
    return (
      <OffthreadVideo
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  } catch {
    return (
      <video
        src={src}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
};
