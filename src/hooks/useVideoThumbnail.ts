// ============================================================================
// useVideoThumbnail — React hook for generating video thumbnails
// Returns the original URL for images, or a generated frame-capture for videos.
// ============================================================================

import { useState, useEffect } from 'react';
import { generateVideoThumbnail } from '../lib/videoThumbnail';

/**
 * React hook that generates and returns a thumbnail for a video URL.
 * Returns the original URL for images, or the generated thumbnail for videos.
 */
export function useVideoThumbnail(url: string | undefined, isVideo: boolean): string | undefined {
  const [thumbnail, setThumbnail] = useState<string | undefined>(
    !isVideo ? url : undefined
  );

  useEffect(() => {
    if (!url) { setThumbnail(undefined); return; }
    if (!isVideo) { setThumbnail(url); return; }

    let cancelled = false;
    generateVideoThumbnail(url).then((thumb) => {
      if (!cancelled) setThumbnail(thumb || url); // fallback to video URL
    });
    return () => { cancelled = true; };
  }, [url, isVideo]);

  return thumbnail;
}
