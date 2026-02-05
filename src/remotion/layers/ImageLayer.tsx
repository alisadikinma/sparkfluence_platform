// ============================================================================
// Sparkfluence Studio — Image Layer (Remotion)
// Renders a static image within a layer.
// ============================================================================

import React from 'react';

interface ImageLayerProps {
  src: string;
}

export const ImageLayer: React.FC<ImageLayerProps> = ({ src }) => {
  if (!src) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
          fontSize: 14,
        }}
      >
        No image
      </div>
    );
  }

  // Use Remotion's <Img> for better rendering pipeline compatibility.
  try {
    const { Img } = require('remotion');
    return (
      <Img
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  } catch {
    return (
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
};
