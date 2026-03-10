// ============================================================================
// Timeline Playhead — Draggable emerald vertical line
// ============================================================================

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { STUDIO_FPS } from '../../../types/studio';
import { useStudio } from '../../../contexts/StudioContext';

const HEADER_WIDTH = 100;

interface PlayheadProps {
  pixelsPerSecond: number;
  scrollLeft: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const Playhead: React.FC<PlayheadProps> = ({
  pixelsPerSecond,
  scrollLeft,
  containerRef,
}) => {
  const { state, dispatch } = useStudio();
  const { playback, project } = state;
  const isDragging = useRef(false);
  const [dragging, setDragging] = useState(false);

  const currentSeconds = playback.currentFrame / STUDIO_FPS;
  const positionPx = currentSeconds * pixelsPerSecond;

  const clampFrame = useCallback(
    (frame: number) => Math.max(0, Math.min(frame, project.totalDurationInFrames)),
    [project.totalDurationInFrames]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      setDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft - HEADER_WIDTH;
      const seconds = x / pixelsPerSecond;
      const frame = Math.round(seconds * STUDIO_FPS);
      dispatch({ type: 'SET_CURRENT_FRAME', frame: clampFrame(frame) });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, containerRef, pixelsPerSecond, clampFrame, dispatch]);

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: positionPx }}
    >
      {/* Marker triangle at top */}
      <div
        className="pointer-events-auto cursor-col-resize"
        onMouseDown={handleMouseDown}
        style={{ position: 'relative', zIndex: 21 }}
      >
        <div
          className="absolute -translate-x-1/2"
          style={{
            top: 0,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid #10B981',
            filter: dragging ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.7))' : 'drop-shadow(0 0 2px rgba(16, 185, 129, 0.5))',
          }}
        />
        {/* Small circle below triangle for easier grab */}
        <div
          className="absolute -translate-x-1/2 rounded-full"
          style={{
            top: 7,
            width: 6,
            height: 6,
            backgroundColor: '#10B981',
            boxShadow: dragging
              ? '0 0 8px rgba(16, 185, 129, 0.7)'
              : '0 0 4px rgba(16, 185, 129, 0.5)',
          }}
        />
      </div>

      {/* Vertical line */}
      <div
        className="absolute top-0 bottom-0 -translate-x-[0.5px]"
        style={{
          width: 1,
          backgroundColor: '#10B981',
          boxShadow: dragging
            ? '0 0 6px rgba(16, 185, 129, 0.6)'
            : '0 0 3px rgba(16, 185, 129, 0.4)',
        }}
      />
    </div>
  );
};
