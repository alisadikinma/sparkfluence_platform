// ============================================================================
// Timeline Clip — Single clip block on a track
// Supports filmstrip thumbnail view for video clips (CapCut-style)
// Supports drag-to-move for text/audio clips
// ============================================================================

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { STUDIO_FPS } from '../../../types/studio';
import { useTrimInteraction } from '../../../hooks/useTrimInteraction';
import type { TimelineClipData } from './types';

interface TimelineClipProps {
  clip: TimelineClipData;
  pixelsPerSecond: number;
  isSelected: boolean;
  onClick: () => void;
  /** Height of this clip in pixels */
  clipHeight: number;
  /** Callback when user trims a clip edge */
  onTrim?: (clipId: string, trimStartFrames: number, trimEndFrames: number) => void;
  /** Active tool from toolbar */
  activeTool?: string;
  /** Callback for splitting at a frame position */
  onSplit?: (clipId: string, splitFrame: number) => void;
  /** Callback when user drags clip to a new time position (new absolute startFrame) */
  onMove?: (clipId: string, newStartFrame: number) => void;
}

// Segment type → background color mapping (used when no thumbnail)
const SEGMENT_COLORS: Record<string, string> = {
  HOOK: 'rgba(16, 185, 129, 0.3)',      // emerald-500/30
  PEAK: 'rgba(16, 185, 129, 0.3)',      // emerald-500/30
  FORE: 'rgba(245, 158, 11, 0.3)',      // amber-500/30
  BODY: 'rgba(245, 158, 11, 0.3)',      // amber-500/30
  CTA: 'rgba(59, 130, 246, 0.3)',       // blue-500/30
  LOOP_END: 'rgba(115, 115, 115, 0.3)', // neutral-600/30
};

const SEGMENT_BORDER_COLORS: Record<string, string> = {
  HOOK: '#10B981',
  PEAK: '#10B981',
  FORE: '#F59E0B',
  BODY: '#F59E0B',
  CTA: '#3B82F6',
  LOOP_END: '#737373',
};

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  pixelsPerSecond,
  isSelected,
  onClick,
  clipHeight,
  onTrim,
  activeTool,
  onSplit,
  onMove,
}) => {
  const effectiveWidth = Math.max((clip.durationInFrames / STUDIO_FPS) * pixelsPerSecond - 2, 8);
  const leftPx = (clip.startFrame / STUDIO_FPS) * pixelsPerSecond;
  const durationSec = (clip.durationInFrames / STUDIO_FPS).toFixed(1);

  const bgColor = clip.segmentType
    ? SEGMENT_COLORS[clip.segmentType] || clip.color
    : clip.color;
  const borderColor = clip.segmentType
    ? SEGMENT_BORDER_COLORS[clip.segmentType] || '#404040'
    : '#404040';

  // Trim interaction — only active when onTrim callback is provided
  const { trimHandleProps, isTrimming, trimPreview } = useTrimInteraction(
    clip.id,
    clip.startFrame,
    clip.durationInFrames,
    pixelsPerSecond,
    (trimStart, trimEnd) => onTrim?.(clip.id, trimStart, trimEnd),
    clip.maxDurationInFrames,
  );

  const hasThumbnail = !!clip.thumbnailUrl;
  const hasMediaFallback = !hasThumbnail && !!clip.mediaSrc;
  const hasVisual = hasThumbnail || hasMediaFallback;

  // Calculate filmstrip tile count — square tiles matching clip height
  const tileWidth = clipHeight;
  const tileCount = useMemo(
    () => (hasThumbnail ? Math.max(1, Math.ceil(effectiveWidth / tileWidth)) : 0),
    [hasThumbnail, effectiveWidth, tileWidth]
  );

  const isSplitTool = activeTool === 'split';

  // --- Drag-to-move state ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const dragStartRef = useRef<{ mouseX: number; origLeftPx: number } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      // Only count as drag if moved more than 3px (avoid accidental drags on click)
      if (Math.abs(dx) > 3) didDragRef.current = true;
      setDragOffsetPx(dx);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragStartRef.current && didDragRef.current && onMove) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const newLeftPx = Math.max(0, dragStartRef.current.origLeftPx + dx);
        const newStartFrame = Math.max(0, Math.round((newLeftPx / pixelsPerSecond) * STUDIO_FPS));
        onMove(clip.id, newStartFrame);
      }
      setIsDragging(false);
      setDragOffsetPx(0);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onMove, clip.id, pixelsPerSecond]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only enable drag for moveable clips (onMove provided) and select tool
    if (!onMove || isSplitTool) return;
    // Don't start drag from trim handle area (first/last 6px)
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    if (localX < 6 || localX > rect.width - 6) return;

    e.preventDefault();
    didDragRef.current = false;
    dragStartRef.current = { mouseX: e.clientX, origLeftPx: leftPx };
    setIsDragging(true);
  }, [onMove, isSplitTool, leftPx]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't fire click if we just finished a drag
    if (didDragRef.current) return;

    if (isSplitTool && onSplit) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickSeconds = clickX / pixelsPerSecond;
      const splitFrame = clip.startFrame + Math.round(clickSeconds * STUDIO_FPS);
      onSplit(clip.id, splitFrame);
    } else {
      onClick();
    }
  }, [isSplitTool, onSplit, onClick, clip.id, clip.startFrame, pixelsPerSecond]);

  // Compute visual position (apply drag offset during drag)
  const visualLeft = isDragging ? Math.max(0, leftPx + dragOffsetPx) : leftPx;

  return (
    <div
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className={`absolute rounded transition-all group overflow-hidden
        ${isDragging ? 'z-30 opacity-80 shadow-lg cursor-grabbing' : ''}
        ${!isDragging && isSplitTool ? 'cursor-crosshair' : ''}
        ${!isDragging && !isSplitTool && onMove ? 'cursor-grab' : ''}
        ${!isDragging && !isSplitTool && !onMove ? 'cursor-pointer' : ''}
        ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-0' : 'hover:brightness-125'}`}
      style={{
        left: visualLeft,
        width: effectiveWidth,
        height: clipHeight,
        top: 4,
        backgroundColor: hasVisual ? '#000' : bgColor,
        borderLeft: `2px solid ${borderColor}`,
        transition: isDragging ? 'none' : undefined,
      }}
    >
      {/* Filmstrip thumbnails (canvas-generated) */}
      {hasThumbnail && (
        <div className="absolute inset-0 flex overflow-hidden" style={{ marginLeft: 0 }}>
          {Array.from({ length: tileCount }).map((_, i) => (
            <img
              key={i}
              src={clip.thumbnailUrl}
              alt=""
              className="h-full flex-shrink-0 object-cover"
              style={{ width: tileWidth }}
              draggable={false}
            />
          ))}
        </div>
      )}

      {/* Video poster fallback — when thumbnail generation failed (CORS) */}
      {hasMediaFallback && (
        <div className="absolute inset-0 overflow-hidden">
          {clip.isVideo ? (
            <video
              src={clip.mediaSrc}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              playsInline
              onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.5; }}
            />
          ) : (
            <img
              src={clip.mediaSrc}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
        </div>
      )}

      {/* Bottom gradient overlay for label readability (when visual present) */}
      {hasVisual && (
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      )}

      {/* Label + duration */}
      {hasVisual ? (
        // Thumbnail mode: label at bottom-left, duration at bottom-right
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 pb-0.5">
          <span className="text-[9px] text-white font-medium truncate drop-shadow-sm leading-none">
            {clip.label}
          </span>
          {effectiveWidth > 50 && (
            <span className="text-[8px] text-white/70 ml-1 flex-shrink-0 font-mono drop-shadow-sm">
              {durationSec}s
            </span>
          )}
        </div>
      ) : (
        // Plain mode: centered label (original behavior)
        <div className="flex items-center justify-between h-full px-1.5 overflow-hidden">
          <span className="text-[9px] text-neutral-200 truncate leading-none">
            {clip.label}
          </span>
          {effectiveWidth > 50 && (
            <span className="text-[8px] text-neutral-500 ml-1 flex-shrink-0 font-mono">
              {durationSec}s
            </span>
          )}
        </div>
      )}

      {/* Trim handles */}
      {onTrim && !isDragging && (
        <>
          <div
            onMouseDown={trimHandleProps.left.onMouseDown}
            style={trimHandleProps.left.style}
            className="hover:bg-emerald-500/30 transition-colors"
          />
          <div
            onMouseDown={trimHandleProps.right.onMouseDown}
            style={trimHandleProps.right.style}
            className="hover:bg-emerald-500/30 transition-colors"
          />
        </>
      )}

      {/* Trim duration preview tooltip */}
      {isTrimming && trimPreview && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-mono whitespace-nowrap z-20 shadow-lg">
          {(trimPreview.newDuration / 30).toFixed(1)}s
        </div>
      )}

      {/* Drag position tooltip */}
      {isDragging && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-mono whitespace-nowrap z-20 shadow-lg">
          {(visualLeft / pixelsPerSecond).toFixed(1)}s
        </div>
      )}
    </div>
  );
};
