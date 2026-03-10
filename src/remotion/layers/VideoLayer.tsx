// ============================================================================
// Sparkfluence Studio — Video Layer (Remotion)
// Renders a video clip within a layer.
// External URLs (R2, CDN) use plain <video> to avoid CORS issues.
// Local/same-origin URLs use Remotion's <Video> for frame-accurate sync.
// ============================================================================

import React from 'react';
import { Video, useCurrentFrame, useVideoConfig } from 'remotion';

interface VideoLayerProps {
  src: string;
}

/** Check if URL is cross-origin (external CDN, R2, etc.) */
function isCrossOrigin(url: string): boolean {
  if (!url) return false;
  // Blob URLs and relative paths are same-origin
  if (url.startsWith('blob:') || url.startsWith('/') || url.startsWith('./')) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export const VideoLayer: React.FC<VideoLayerProps> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!src) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a2e' }} />;
  }

  // External URLs (GeminiGen R2, CDNs) lack CORS headers.
  // Remotion's <Video> sets crossOrigin="anonymous" internally which triggers CORS preflight.
  // Plain <video> without crossOrigin can still PLAY cross-origin videos — CORS only blocks pixel reads.
  if (isCrossOrigin(src)) {
    return (
      <video
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        muted
        playsInline
        ref={(el) => {
          if (el) {
            const targetTime = frame / fps;
            if (Math.abs(el.currentTime - targetTime) > 0.1) {
              el.currentTime = targetTime;
            }
          }
        }}
      />
    );
  }

  return (
    <Video
      src={src}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};
