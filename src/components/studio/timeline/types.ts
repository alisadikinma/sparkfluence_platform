// ============================================================================
// Timeline — Shared Types
// ============================================================================

export interface TimelineClipData {
  id: string;
  label: string;
  startFrame: number;
  durationInFrames: number;
  color: string;
  segmentType?: string;
  thumbnailUrl?: string;
  maxDurationInFrames?: number;
  /** Raw video/image source URL — used as fallback when thumbnail generation fails */
  mediaSrc?: string;
  /** Whether the source is a video (vs image) */
  isVideo?: boolean;
}
