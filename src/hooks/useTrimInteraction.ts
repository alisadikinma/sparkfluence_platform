// ============================================================================
// useTrimInteraction — Drag-based trim handles for timeline clips
// Handles mousedown on left/right edges, mousemove for live preview,
// and mouseup to commit the trim via callback.
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { STUDIO_FPS } from '../types/studio';

interface TrimHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  style: React.CSSProperties;
}

interface TrimPreview {
  newDuration: number;
  trimStart: number;
  trimEnd: number;
}

interface UseTrimInteractionReturn {
  trimHandleProps: {
    left: TrimHandleProps;
    right: TrimHandleProps;
  };
  isTrimming: boolean;
  trimPreview: TrimPreview | null;
}

const MIN_DURATION_FRAMES = 30; // 1 second at 30fps
const HANDLE_WIDTH = 6; // px hit zone

type TrimSide = 'left' | 'right';

export function useTrimInteraction(
  segmentId: string,
  startFrame: number,
  durationInFrames: number,
  pixelsPerSecond: number,
  onTrim: (trimStartFrames: number, trimEndFrames: number) => void,
  maxDurationInFrames?: number,
): UseTrimInteractionReturn {
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimPreview, setTrimPreview] = useState<TrimPreview | null>(null);

  const trimState = useRef<{
    side: TrimSide;
    startX: number;
    originalDuration: number;
    accumulatedTrimStart: number;
    accumulatedTrimEnd: number;
  } | null>(null);

  const pixelToFrames = useCallback((px: number): number => {
    const seconds = px / pixelsPerSecond;
    return Math.round(seconds * STUDIO_FPS);
  }, [pixelsPerSecond]);

  const handleMouseDown = useCallback((side: TrimSide, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    trimState.current = {
      side,
      startX: e.clientX,
      originalDuration: durationInFrames,
      accumulatedTrimStart: 0,
      accumulatedTrimEnd: 0,
    };

    setIsTrimming(true);
    setTrimPreview({ newDuration: durationInFrames, trimStart: 0, trimEnd: 0 });

    // Set cursor globally during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [durationInFrames]);

  useEffect(() => {
    if (!isTrimming) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ts = trimState.current;
      if (!ts) return;

      const deltaX = e.clientX - ts.startX;
      const deltaFrames = pixelToFrames(deltaX);

      let trimStart = 0;
      let trimEnd = 0;

      // How much can we expand beyond current duration (if maxDuration is known)
      const maxDur = maxDurationInFrames || ts.originalDuration;
      const expandableFrames = maxDur - ts.originalDuration;

      if (ts.side === 'left') {
        // Positive deltaX = drag right = shrink from left
        // Negative deltaX = drag left = expand from left
        trimStart = deltaFrames;
        // Clamp: can't shrink more than (duration - MIN), can't expand more than expandable
        trimStart = Math.max(-expandableFrames, trimStart);
        trimStart = Math.min(trimStart, ts.originalDuration - MIN_DURATION_FRAMES);
      } else {
        // Negative deltaX = drag left = shrink from right
        // Positive deltaX = drag right = expand from right
        trimEnd = -deltaFrames;
        // Clamp: can't shrink more than (duration - MIN), can't expand more than expandable
        trimEnd = Math.max(-expandableFrames, trimEnd);
        trimEnd = Math.min(trimEnd, ts.originalDuration - MIN_DURATION_FRAMES);
      }

      const newDuration = ts.originalDuration - trimStart - trimEnd;

      ts.accumulatedTrimStart = trimStart;
      ts.accumulatedTrimEnd = trimEnd;

      setTrimPreview({
        newDuration: Math.max(MIN_DURATION_FRAMES, Math.min(maxDur, newDuration)),
        trimStart,
        trimEnd,
      });
    };

    const handleMouseUp = () => {
      const ts = trimState.current;
      if (ts && (ts.accumulatedTrimStart !== 0 || ts.accumulatedTrimEnd !== 0)) {
        onTrim(ts.accumulatedTrimStart, ts.accumulatedTrimEnd);
      }

      trimState.current = null;
      setIsTrimming(false);
      setTrimPreview(null);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTrimming, pixelToFrames, onTrim]);

  // Clean up cursor on unmount
  useEffect(() => {
    return () => {
      if (isTrimming) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isTrimming]);

  const trimHandleProps: UseTrimInteractionReturn['trimHandleProps'] = {
    left: {
      onMouseDown: (e: React.MouseEvent) => handleMouseDown('left', e),
      style: {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
        width: HANDLE_WIDTH,
        cursor: 'col-resize',
        zIndex: 10,
        background: isTrimming && trimState.current?.side === 'left'
          ? 'rgba(16, 185, 129, 0.5)'
          : 'transparent',
        borderLeft: isTrimming && trimState.current?.side === 'left'
          ? '2px solid #10B981'
          : 'none',
        transition: isTrimming ? 'none' : 'background 150ms',
      },
    },
    right: {
      onMouseDown: (e: React.MouseEvent) => handleMouseDown('right', e),
      style: {
        position: 'absolute' as const,
        right: 0,
        top: 0,
        bottom: 0,
        width: HANDLE_WIDTH,
        cursor: 'col-resize',
        zIndex: 10,
        background: isTrimming && trimState.current?.side === 'right'
          ? 'rgba(16, 185, 129, 0.5)'
          : 'transparent',
        borderRight: isTrimming && trimState.current?.side === 'right'
          ? '2px solid #10B981'
          : 'none',
        transition: isTrimming ? 'none' : 'background 150ms',
      },
    },
  };

  return { trimHandleProps, isTrimming, trimPreview };
}
