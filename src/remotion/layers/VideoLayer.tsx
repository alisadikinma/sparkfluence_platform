// ============================================================================
// Sparkfluence Studio — Video Layer (Remotion)
// Renders a video clip within a layer.
// External URLs (R2, CDN) use plain <video> with play/pause sync for audio.
// Local/same-origin URLs use Remotion's <Video> for frame-accurate sync.
// ============================================================================

import React, { useRef, useEffect } from 'react';
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

// --- Cross-Origin Video: plain <video> with play/pause/seek sync ---
// Cannot use Remotion's <Video> for cross-origin because it sets
// crossOrigin="anonymous" internally which triggers CORS preflight.
// Plain <video> without crossOrigin can still PLAY cross-origin videos
// — CORS only blocks pixel reads, not playback.

const CrossOriginVideo: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevFrameRef = useRef<number>(-1);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const targetTime = frame / fps;
    const diff = frame - prevFrameRef.current;
    prevFrameRef.current = frame;

    // Clear any pending pause timeout
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (diff === 1) {
      // Normal playback — frame advanced by 1
      if (el.paused) {
        el.play().catch(() => {});
      }
      // Correct drift if video fell out of sync
      if (Math.abs(el.currentTime - targetTime) > 0.2) {
        el.currentTime = targetTime;
      }
    } else {
      // Seeking (diff > 1 or < 0) or first frame (diff = frame+1 from init -1)
      if (!el.paused) el.pause();
      el.currentTime = targetTime;
    }

    // Auto-pause if no frame update comes within 100ms.
    // At 30fps frames arrive every ~33ms, so 100ms silence = definitely paused.
    pauseTimerRef.current = setTimeout(() => {
      if (el && !el.paused) {
        el.pause();
        el.currentTime = targetTime;
      }
    }, 100);

    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    };
  }, [frame, fps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      const el = videoRef.current;
      if (el && !el.paused) el.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      playsInline
    />
  );
};

// --- Main VideoLayer ---

export const VideoLayer: React.FC<VideoLayerProps> = ({ src }) => {
  if (!src) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a2e' }} />;
  }

  // External URLs (GeminiGen R2, CDNs) lack CORS headers — use plain <video> with sync
  if (isCrossOrigin(src)) {
    return <CrossOriginVideo src={src} />;
  }

  // Same-origin: use Remotion's <Video> for frame-accurate sync + audio
  return (
    <Video
      src={src}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};
