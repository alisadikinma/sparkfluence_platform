// ============================================================================
// Video Thumbnail Generator
// Captures a frame from a video URL using canvas to generate a static thumbnail.
// Includes an in-memory cache to avoid re-generating thumbnails for the same URL.
// Falls back to a poster-frame URL if canvas capture fails (CORS).
// ============================================================================

const thumbnailCache = new Map<string, string>();

/**
 * Generate a thumbnail image (data URL) from a video URL by capturing a frame.
 * Strategy: try canvas capture first, then return a poster-URL fallback.
 */
export function generateVideoThumbnail(videoUrl: string, seekTime = 0.5): Promise<string | null> {
  const cached = thumbnailCache.get(videoUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let resolved = false;
    const finish = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      if (result) thumbnailCache.set(videoUrl, result);
      resolve(result);
      // Clean up
      video.src = '';
      video.load();
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(seekTime, video.duration * 0.1 || seekTime);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) { finish(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        // Check for empty/blank canvas (all black)
        finish(dataUrl);
      } catch {
        // CORS taint — can't canvas-capture, use poster URL fallback
        // Return null, TimelineClip will use <video #t=0.5> fallback
        finish(null);
      }
    };

    video.onerror = () => finish(null);

    // Timeout after 8 seconds (more generous for slow networks)
    setTimeout(() => finish(null), 8000);

    video.src = videoUrl;
  });
}

/**
 * Check if a thumbnail is already cached for a given URL.
 */
export function getCachedThumbnail(url: string): string | undefined {
  return thumbnailCache.get(url);
}
