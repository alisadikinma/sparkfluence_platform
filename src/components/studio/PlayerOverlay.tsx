// ============================================================================
// PlayerOverlay — Transparent layer on top of Remotion Player
// Shows draggable bounding boxes for text layers in the current segment.
// Converts preview pixel coordinates ↔ composition coordinates (1080×1920).
// Always renders full-area overlay for proper mouse capture during drag.
// ============================================================================

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../../types/studio';
import type { SparkfluenceProject, LayerItem } from '../../types/studio';

interface PlayerOverlayProps {
  project: SparkfluenceProject;
  currentFrame: number;
  selectedSegmentId: string | null;
  selectedLayerId: string | null;
  containerWidth: number;
  containerHeight: number;
  onLayerSelect: (segmentId: string, layerId: string) => void;
  onLayerMove: (segmentId: string, layerId: string, position: { x: number; y: number }) => void;
}

interface DragState {
  segmentId: string;
  layerId: string;
  startMouseX: number;
  startMouseY: number;
  startPosX: number;
  startPosY: number;
}

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  project,
  currentFrame,
  selectedSegmentId,
  selectedLayerId,
  containerWidth,
  containerHeight,
  onLayerSelect,
  onLayerMove,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Scale factors: preview pixels → composition pixels
  const scaleX = containerWidth / STUDIO_WIDTH;
  const scaleY = containerHeight / STUDIO_HEIGHT;

  // Find the current segment at this frame
  const currentSegment = useMemo(() => {
    return project.segments.find(
      seg => currentFrame >= seg.startFrame && currentFrame < seg.startFrame + seg.durationInFrames
    ) ?? null;
  }, [project.segments, currentFrame]);

  // Collect all visible text layers: segment layers + overlay text clips
  const visibleTextLayers = useMemo(() => {
    const result: { segmentId: string; layer: LayerItem }[] = [];

    // 1. Segment text layers
    if (currentSegment) {
      const relativeFrame = currentFrame - currentSegment.startFrame;
      for (const layer of currentSegment.layers) {
        if (
          layer.type === 'text' &&
          layer.visible &&
          layer.text?.content &&
          relativeFrame >= layer.inFrame &&
          relativeFrame < layer.outFrame
        ) {
          result.push({ segmentId: currentSegment.id, layer });
        }
      }
    }

    // 2. Overlay text clips (cross-segment, absolute frames)
    for (const track of (project.overlayTracks || [])) {
      for (const clip of track.clips) {
        if (clip.type !== 'text' || !clip.text?.content) continue;
        const clipEnd = clip.startFrame + clip.durationInFrames;
        if (currentFrame >= clip.startFrame && currentFrame < clipEnd) {
          // Adapt overlay clip to LayerItem-like shape for rendering
          const overlayAsLayer: LayerItem = {
            id: clip.id,
            type: 'text',
            src: '',
            position: clip.position || { x: STUDIO_WIDTH * 0.1, y: STUDIO_HEIGHT * 0.5 },
            size: clip.size || { w: STUDIO_WIDTH * 0.8, h: 120 },
            zIndex: clip.zIndex || 10,
            opacity: clip.opacity ?? 1,
            rotation: 0,
            visible: true,
            locked: false,
            inFrame: 0,
            outFrame: clip.durationInFrames,
            text: clip.text,
          };
          result.push({ segmentId: track.id, layer: overlayAsLayer });
        }
      }
    }

    return result;
  }, [currentSegment, currentFrame, project.overlayTracks]);

  const handleMouseDown = useCallback((e: React.MouseEvent, segmentId: string, layer: LayerItem) => {
    e.preventDefault();
    e.stopPropagation();

    onLayerSelect(segmentId, layer.id);

    if (layer.locked) return;

    setDragState({
      segmentId,
      layerId: layer.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: layer.position.x,
      startPosY: layer.position.y,
    });
    setDragDelta({ dx: 0, dy: 0 });
    dragDeltaRef.current = { dx: 0, dy: 0 };
  }, [onLayerSelect]);

  // Use window-level mouse events for reliable drag tracking
  // dragDeltaRef avoids stale closure — handleUp always reads current value
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startMouseX;
      const dy = e.clientY - dragState.startMouseY;
      dragDeltaRef.current = { dx, dy };
      setDragDelta({ dx, dy }); // state for visual re-render only
    };

    const handleUp = () => {
      // Read from ref (always current, no stale closure)
      const compDx = dragDeltaRef.current.dx / scaleX;
      const compDy = dragDeltaRef.current.dy / scaleY;

      const newX = Math.round(Math.max(0, Math.min(STUDIO_WIDTH, dragState.startPosX + compDx)));
      const newY = Math.round(Math.max(0, Math.min(STUDIO_HEIGHT, dragState.startPosY + compDy)));

      onLayerMove(dragState.segmentId, dragState.layerId, { x: newX, y: newY });

      setDragState(null);
      setDragDelta({ dx: 0, dy: 0 });
      dragDeltaRef.current = { dx: 0, dy: 0 };
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, scaleX, scaleY, onLayerMove]); // removed dragDelta from deps — ref handles it

  // Always render the overlay for pointer event capture
  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        cursor: dragState ? 'move' : 'default',
        // Only block pointer events on the overlay itself when dragging
        pointerEvents: visibleTextLayers.length > 0 || dragState ? 'auto' : 'none',
      }}
    >
      {visibleTextLayers.map(({ segmentId, layer }) => {
        const isSelected = selectedSegmentId === segmentId && selectedLayerId === layer.id;
        const isDragging = dragState?.layerId === layer.id;

        // Position in preview pixels
        let previewX = layer.position.x * scaleX;
        let previewY = layer.position.y * scaleY;
        const previewW = layer.size.w * scaleX;
        const previewH = layer.size.h * scaleY;

        // Apply drag delta during drag
        if (isDragging) {
          previewX += dragDelta.dx;
          previewY += dragDelta.dy;
        }

        return (
          <div
            key={layer.id}
            className={`absolute transition-shadow ${
              isSelected
                ? 'border-2 border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
                : 'border border-transparent hover:border-dashed hover:border-white/40'
            } ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
            style={{
              left: previewX,
              top: previewY,
              width: previewW,
              height: previewH,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => handleMouseDown(e, segmentId, layer)}
          >
            {/* Corner handles for selected text */}
            {isSelected && !layer.locked && (
              <>
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
              </>
            )}

            {/* Label when selected */}
            {isSelected && (
              <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-medium whitespace-nowrap">
                {layer.text?.content?.slice(0, 20) || 'Text'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
