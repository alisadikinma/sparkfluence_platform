// ============================================================================
// PlayerOverlay — Transparent layer on top of Remotion Player
// Shows draggable bounding boxes for text layers in the current segment.
// Queries the Remotion Player's actual DOM to find the exact content area,
// ensuring pixel-perfect alignment with the rendered composition.
// ============================================================================

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../../types/studio';
import type { SparkfluenceProject, LayerItem } from '../../types/studio';

/** Estimate text block height in composition pixels based on font size + content length */
function estimateTextHeight(layer: LayerItem): number {
  const fontSize = layer.text?.fontSize ?? 48;
  const content = layer.text?.content ?? '';
  const boxWidth = layer.size.w;
  const charsPerLine = Math.max(1, Math.floor(boxWidth / (fontSize * 0.55)));
  const lineCount = Math.max(1, Math.ceil(content.length / charsPerLine));
  const lineHeight = fontSize * 1.3;
  const padding = fontSize * 0.5;
  return Math.max(fontSize + padding, lineCount * lineHeight + padding);
}

interface PlayerOverlayProps {
  project: SparkfluenceProject;
  currentFrame: number;
  selectedSegmentId: string | null;
  selectedLayerId: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
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

/** Measure Remotion Player's actual content area by querying its DOM */
function measureRemotionContent(containerEl: HTMLElement): {
  offsetX: number;
  offsetY: number;
  scale: number;
} | null {
  // Remotion Player renders a div with the exact composition dimensions (1080x1920)
  // with transform: scale(...). Find it by looking for the composition-sized div.
  const containerRect = containerEl.getBoundingClientRect();

  // Find all absolutely-positioned divs inside the Player
  // Remotion's structure: outer > positioned wrapper > composition div (with transform)
  const allDivs = containerEl.querySelectorAll('div[style]');
  for (const div of allDivs) {
    const style = (div as HTMLElement).style;
    const transform = style.transform;
    // Look for the div with transform: scale(X) — this is Remotion's composition container
    if (transform && transform.startsWith('scale(')) {
      const contentRect = (div as HTMLElement).getBoundingClientRect();
      const scale = contentRect.width / STUDIO_WIDTH;
      const offsetX = contentRect.left - containerRect.left;
      const offsetY = contentRect.top - containerRect.top;
      return { offsetX, offsetY, scale };
    }
  }
  return null;
}

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  project,
  currentFrame,
  selectedSegmentId,
  selectedLayerId,
  containerRef,
  onLayerSelect,
  onLayerMove,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Measure Remotion's actual content area from the DOM
  const [contentArea, setContentArea] = useState<{ offsetX: number; offsetY: number; scale: number }>({
    offsetX: 0, offsetY: 0, scale: 1,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const result = measureRemotionContent(container);
      if (result) {
        setContentArea(result);
      }
    };

    // Measure initially and on resize
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);

    // Also measure on animation frame for smooth updates
    let rafId: number;
    const rafMeasure = () => {
      measure();
      rafId = requestAnimationFrame(rafMeasure);
    };
    // Only use rAF during drag for performance
    if (dragState) {
      rafId = requestAnimationFrame(rafMeasure);
    }

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef, dragState]);

  const { offsetX, offsetY, scale } = contentArea;

  // Find the current segment at this frame
  const currentSegment = useMemo(() => {
    return project.segments.find(
      seg => currentFrame >= seg.startFrame && currentFrame < seg.startFrame + seg.durationInFrames
    ) ?? null;
  }, [project.segments, currentFrame]);

  // Collect all visible text layers: segment layers + overlay text clips
  const visibleTextLayers = useMemo(() => {
    const result: { segmentId: string; layer: LayerItem }[] = [];

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

    for (const track of (project.overlayTracks || [])) {
      for (const clip of track.clips) {
        if (clip.type !== 'text' || !clip.text?.content) continue;
        const clipEnd = clip.startFrame + clip.durationInFrames;
        if (currentFrame >= clip.startFrame && currentFrame < clipEnd) {
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

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startMouseX;
      const dy = e.clientY - dragState.startMouseY;
      dragDeltaRef.current = { dx, dy };
      setDragDelta({ dx, dy });
    };

    const handleUp = () => {
      const compDx = dragDeltaRef.current.dx / scale;
      const compDy = dragDeltaRef.current.dy / scale;

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
  }, [dragState, scale, onLayerMove]);

  return (
    <div
      className="absolute inset-0 z-50"
      style={{
        cursor: dragState ? 'move' : 'default',
        pointerEvents: visibleTextLayers.length > 0 || dragState ? 'auto' : 'none',
      }}
    >
      {visibleTextLayers.map(({ segmentId, layer }) => {
        const isSelected = selectedSegmentId === segmentId && selectedLayerId === layer.id;
        const isDragging = dragState?.layerId === layer.id;

        // Position using actual measured offset from Remotion's DOM
        let previewX = offsetX + layer.position.x * scale;
        let previewY = offsetY + layer.position.y * scale;
        const previewW = layer.size.w * scale;
        const previewH = estimateTextHeight(layer) * scale;

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
            {isSelected && !layer.locked && (
              <>
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50" />
              </>
            )}

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
