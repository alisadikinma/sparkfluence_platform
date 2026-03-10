// ============================================================================
// PlayerOverlay — Transparent layer on top of Remotion Player
// Shows draggable bounding boxes for text layers in the current segment.
// Queries the Remotion Player's actual DOM to find the exact content area,
// ensuring pixel-perfect alignment with the rendered composition.
// Features: drag-to-move, corner resize (scales font), edge resize (reflow).
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

type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'tm' | 'bm';

interface PlayerOverlayProps {
  project: SparkfluenceProject;
  currentFrame: number;
  selectedSegmentId: string | null;
  selectedLayerId: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLayerSelect: (segmentId: string, layerId: string) => void;
  onLayerMove: (segmentId: string, layerId: string, position: { x: number; y: number }) => void;
  onLayerResize?: (segmentId: string, layerId: string, changes: Partial<LayerItem>) => void;
}

interface DragState {
  segmentId: string;
  layerId: string;
  startMouseX: number;
  startMouseY: number;
  startPosX: number;
  startPosY: number;
}

interface ResizeState {
  segmentId: string;
  layerId: string;
  handle: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startW: number;
  startH: number;
  startX: number;
  startY: number;
  startFontSize: number;
}

/** Measure Remotion Player's actual content area by querying its DOM */
function measureRemotionContent(containerEl: HTMLElement): {
  offsetX: number;
  offsetY: number;
  scale: number;
} | null {
  const containerRect = containerEl.getBoundingClientRect();
  const allDivs = containerEl.querySelectorAll('div[style]');
  for (const div of allDivs) {
    const style = (div as HTMLElement).style;
    const transform = style.transform;
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

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize',
  ml: 'ew-resize', mr: 'ew-resize', tm: 'ns-resize', bm: 'ns-resize',
};

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  project,
  currentFrame,
  selectedSegmentId,
  selectedLayerId,
  containerRef,
  onLayerSelect,
  onLayerMove,
  onLayerResize,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizeDelta, setResizeDelta] = useState<{ dw: number; dh: number; dx: number; dy: number }>({ dw: 0, dh: 0, dx: 0, dy: 0 });
  const resizeDeltaRef = useRef<{ dw: number; dh: number; dx: number; dy: number }>({ dw: 0, dh: 0, dx: 0, dy: 0 });

  // Measure Remotion's actual content area from the DOM
  const [contentArea, setContentArea] = useState<{ offsetX: number; offsetY: number; scale: number }>({
    offsetX: 0, offsetY: 0, scale: 1,
  });

  const isInteracting = dragState || resizeState;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const result = measureRemotionContent(container);
      if (result) {
        setContentArea(result);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);

    let rafId: number;
    const rafMeasure = () => {
      measure();
      rafId = requestAnimationFrame(rafMeasure);
    };
    if (isInteracting) {
      rafId = requestAnimationFrame(rafMeasure);
    }

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef, isInteracting]);

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

  // --- Drag-to-move ---
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

  // --- Resize handles ---
  const handleResizeStart = useCallback((e: React.MouseEvent, segmentId: string, layer: LayerItem, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      segmentId,
      layerId: layer.id,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: layer.size.w,
      startH: estimateTextHeight(layer),
      startX: layer.position.x,
      startY: layer.position.y,
      startFontSize: layer.text?.fontSize ?? 48,
    });
    setResizeDelta({ dw: 0, dh: 0, dx: 0, dy: 0 });
    resizeDeltaRef.current = { dw: 0, dh: 0, dx: 0, dy: 0 };
  }, []);

  useEffect(() => {
    if (!resizeState) return;

    const handleMove = (e: MouseEvent) => {
      const rawDx = (e.clientX - resizeState.startMouseX) / scale;
      const rawDy = (e.clientY - resizeState.startMouseY) / scale;
      const h = resizeState.handle;

      let dw = 0, dh = 0, dx = 0, dy = 0;

      const isCorner = h === 'tl' || h === 'tr' || h === 'bl' || h === 'br';
      const isLeft = h === 'tl' || h === 'ml' || h === 'bl';
      const isTop = h === 'tl' || h === 'tm' || h === 'tr';
      const isRight = h === 'tr' || h === 'mr' || h === 'br';
      const isBottom = h === 'bl' || h === 'bm' || h === 'br';

      if (isCorner) {
        // Proportional resize — scale both W and H by the dominant axis
        const scaleFactor = 1 + (isBottom || isRight ? rawDy : -rawDy) / resizeState.startH;
        const clampedScale = Math.max(0.2, Math.min(3, scaleFactor));
        dw = resizeState.startW * (clampedScale - 1);
        dh = resizeState.startH * (clampedScale - 1);
        if (isLeft) dx = -dw;
        if (isTop) dy = -dh;
      } else {
        // Edge resize — width or height only
        if (isLeft) { dw = -rawDx; dx = rawDx; }
        if (isRight) { dw = rawDx; }
        if (isTop) { dh = -rawDy; dy = rawDy; }
        if (isBottom) { dh = rawDy; }
      }

      // Enforce minimums
      const newW = Math.max(40, resizeState.startW + dw);
      const newH = Math.max(20, resizeState.startH + dh);
      dw = newW - resizeState.startW;
      dh = newH - resizeState.startH;

      resizeDeltaRef.current = { dw, dh, dx, dy };
      setResizeDelta({ dw, dh, dx, dy });
    };

    const handleUp = () => {
      const { dw, dh, dx, dy } = resizeDeltaRef.current;
      const newW = Math.round(Math.max(40, resizeState.startW + dw));
      const newH = Math.round(Math.max(20, resizeState.startH + dh));
      const newX = Math.round(Math.max(0, resizeState.startX + dx));
      const newY = Math.round(Math.max(0, resizeState.startY + dy));

      const isCorner = ['tl', 'tr', 'bl', 'br'].includes(resizeState.handle);
      const isVerticalEdge = resizeState.handle === 'tm' || resizeState.handle === 'bm';

      // Scale font size proportionally for corner and vertical edge resize
      let newFontSize = resizeState.startFontSize;
      if (isCorner || isVerticalEdge) {
        const heightRatio = newH / resizeState.startH;
        newFontSize = Math.round(Math.max(12, Math.min(200, resizeState.startFontSize * heightRatio)));
      }

      if (onLayerResize) {
        const changes: Partial<LayerItem> = {
          size: { w: newW, h: newH },
          position: { x: newX, y: newY },
        };
        if ((isCorner || isVerticalEdge) && newFontSize !== resizeState.startFontSize) {
          changes.text = { fontSize: newFontSize } as any;
        }
        onLayerResize(resizeState.segmentId, resizeState.layerId, changes);
      }

      setResizeState(null);
      setResizeDelta({ dw: 0, dh: 0, dx: 0, dy: 0 });
      resizeDeltaRef.current = { dw: 0, dh: 0, dx: 0, dy: 0 };
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizeState, scale, onLayerResize]);

  // Click on empty area deselects — but only if NOT clicking on a layer box
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the overlay background itself (not a child)
    if (e.target === e.currentTarget && selectedLayerId) {
      onLayerSelect('', '');
    }
  }, [selectedLayerId, onLayerSelect]);

  // Determine cursor
  let overlayCursor = 'default';
  if (dragState) overlayCursor = 'move';
  if (resizeState) overlayCursor = HANDLE_CURSORS[resizeState.handle];

  // Always enable pointer events when something is selected (so user can click to deselect)
  const hasInteraction = visibleTextLayers.length > 0 || !!isInteracting || !!selectedLayerId;

  return (
    <div
      className="absolute inset-0 z-50"
      style={{
        cursor: overlayCursor,
        pointerEvents: hasInteraction ? 'auto' : 'none',
      }}
      onMouseDown={handleOverlayClick}
    >
      {visibleTextLayers.map(({ segmentId, layer }) => {
        const isSelected = selectedSegmentId === segmentId && selectedLayerId === layer.id;
        const isDragging = dragState?.layerId === layer.id;
        const isResizing = resizeState?.layerId === layer.id;

        // Position using actual measured offset from Remotion's DOM
        let previewX = offsetX + layer.position.x * scale;
        let previewY = offsetY + layer.position.y * scale;
        let previewW = layer.size.w * scale;
        let previewH = estimateTextHeight(layer) * scale;

        if (isDragging) {
          previewX += dragDelta.dx;
          previewY += dragDelta.dy;
        }

        if (isResizing) {
          previewW += resizeDelta.dw * scale;
          previewH += resizeDelta.dh * scale;
          previewX += resizeDelta.dx * scale;
          previewY += resizeDelta.dy * scale;
        }

        return (
          <div
            key={layer.id}
            className={`absolute ${
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
            {/* Resize handles — visible when selected */}
            {isSelected && !layer.locked && (
              <>
                {/* Corner handles — proportional resize + font scale */}
                {(['tl', 'tr', 'bl', 'br'] as ResizeHandle[]).map(h => (
                  <div
                    key={h}
                    className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white/50 z-10"
                    style={{
                      top: h.startsWith('t') ? -5 : undefined,
                      bottom: h.startsWith('b') ? -5 : undefined,
                      left: h.endsWith('l') ? -5 : undefined,
                      right: h.endsWith('r') ? -5 : undefined,
                      cursor: HANDLE_CURSORS[h],
                    }}
                    onMouseDown={(e) => handleResizeStart(e, segmentId, layer, h)}
                  />
                ))}
                {/* Edge handles — width or height only */}
                {(['ml', 'mr', 'tm', 'bm'] as ResizeHandle[]).map(h => (
                  <div
                    key={h}
                    className="absolute bg-emerald-500/60 rounded-sm z-10"
                    style={{
                      ...(h === 'ml' ? { left: -3, top: '50%', transform: 'translateY(-50%)', width: 4, height: 16, cursor: 'ew-resize' } : {}),
                      ...(h === 'mr' ? { right: -3, top: '50%', transform: 'translateY(-50%)', width: 4, height: 16, cursor: 'ew-resize' } : {}),
                      ...(h === 'tm' ? { top: -3, left: '50%', transform: 'translateX(-50%)', width: 16, height: 4, cursor: 'ns-resize' } : {}),
                      ...(h === 'bm' ? { bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 16, height: 4, cursor: 'ns-resize' } : {}),
                    }}
                    onMouseDown={(e) => handleResizeStart(e, segmentId, layer, h)}
                  />
                ))}
              </>
            )}

            {/* Label */}
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
