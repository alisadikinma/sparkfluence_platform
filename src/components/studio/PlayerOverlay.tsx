// ============================================================================
// PlayerOverlay — Transparent layer on top of Remotion Player
// Shows draggable bounding boxes for text layers in the current segment.
// Queries the Remotion Player's actual DOM to find the exact content area,
// ensuring pixel-perfect alignment with the rendered composition.
// Features: drag-to-move, corner resize (scales font), edge resize (reflow).
// ============================================================================

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { STUDIO_WIDTH, STUDIO_HEIGHT, STUDIO_FPS } from '../../types/studio';
import type { SparkfluenceProject, LayerItem } from '../../types/studio';

/** Estimate layer height in composition pixels */
function estimateLayerHeight(layer: LayerItem): number {
  // Image/video overlays: use explicit size
  if (layer.type === 'image' || layer.type === 'video') {
    return layer.size.h;
  }
  // Text overlays: estimate from font size + content
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

/** Snap threshold in composition pixels */
const SNAP_THRESHOLD = 8;
const CANVAS_CENTER_X = STUDIO_WIDTH / 2;
const CANVAS_CENTER_Y = STUDIO_HEIGHT / 2;

interface SnapGuides {
  /** Vertical line at canvas center X */
  centerX: boolean;
  /** Horizontal line at canvas center Y */
  centerY: boolean;
  /** Vertical line at object's left/right edge matching canvas center */
  edgeX: number | null;
  /** Horizontal line at object's top/bottom edge matching canvas center */
  edgeY: number | null;
}

/** Check which alignment guides to show for a given object rect (in composition coords) */
function computeSnapGuides(
  x: number, y: number, w: number, h: number
): SnapGuides {
  const objCenterX = x + w / 2;
  const objCenterY = y + h / 2;

  const guides: SnapGuides = {
    centerX: false,
    centerY: false,
    edgeX: null,
    edgeY: null,
  };

  // Object center ↔ canvas center
  if (Math.abs(objCenterX - CANVAS_CENTER_X) < SNAP_THRESHOLD) {
    guides.centerX = true;
  }
  if (Math.abs(objCenterY - CANVAS_CENTER_Y) < SNAP_THRESHOLD) {
    guides.centerY = true;
  }

  // Object edges ↔ canvas center (only if center isn't already snapping)
  if (!guides.centerX) {
    if (Math.abs(x - CANVAS_CENTER_X) < SNAP_THRESHOLD) guides.edgeX = x;
    else if (Math.abs(x + w - CANVAS_CENTER_X) < SNAP_THRESHOLD) guides.edgeX = x + w;
  }
  if (!guides.centerY) {
    if (Math.abs(y - CANVAS_CENTER_Y) < SNAP_THRESHOLD) guides.edgeY = y;
    else if (Math.abs(y + h - CANVAS_CENTER_Y) < SNAP_THRESHOLD) guides.edgeY = y + h;
  }

  return guides;
}

/** Apply snap-to-center magnetism, returns adjusted position */
function applySnap(
  x: number, y: number, w: number, h: number
): { x: number; y: number; guides: SnapGuides } {
  let snappedX = x;
  let snappedY = y;
  const objCenterX = x + w / 2;
  const objCenterY = y + h / 2;

  // Snap object center to canvas center
  if (Math.abs(objCenterX - CANVAS_CENTER_X) < SNAP_THRESHOLD) {
    snappedX = CANVAS_CENTER_X - w / 2;
  } else if (Math.abs(x - CANVAS_CENTER_X) < SNAP_THRESHOLD) {
    snappedX = CANVAS_CENTER_X;
  } else if (Math.abs(x + w - CANVAS_CENTER_X) < SNAP_THRESHOLD) {
    snappedX = CANVAS_CENTER_X - w;
  }

  if (Math.abs(objCenterY - CANVAS_CENTER_Y) < SNAP_THRESHOLD) {
    snappedY = CANVAS_CENTER_Y - h / 2;
  } else if (Math.abs(y - CANVAS_CENTER_Y) < SNAP_THRESHOLD) {
    snappedY = CANVAS_CENTER_Y;
  } else if (Math.abs(y + h - CANVAS_CENTER_Y) < SNAP_THRESHOLD) {
    snappedY = CANVAS_CENTER_Y - h;
  }

  const guides = computeSnapGuides(snappedX, snappedY, w, h);
  return { x: snappedX, y: snappedY, guides };
}

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
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizeDelta, setResizeDelta] = useState<{ dw: number; dh: number; dx: number; dy: number }>({ dw: 0, dh: 0, dx: 0, dy: 0 });
  const resizeDeltaRef = useRef<{ dw: number; dh: number; dx: number; dy: number }>({ dw: 0, dh: 0, dx: 0, dy: 0 });

  // Snap alignment guides state
  const [activeGuides, setActiveGuides] = useState<SnapGuides>({ centerX: false, centerY: false, edgeX: null, edgeY: null });

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

  // Collect all visible interactive layers: segment text/image layers + overlay clips
  // Searches ALL segments to catch cross-segment text layers (negative inFrame or extended outFrame)
  const visibleOverlayLayers = useMemo(() => {
    const result: { segmentId: string; layer: LayerItem }[] = [];
    const addedIds = new Set<string>();

    for (const seg of project.segments) {
      for (const layer of seg.layers) {
        if (!layer.visible || addedIds.has(layer.id)) continue;
        // Check if layer is visible at current frame (accounting for cross-segment extension)
        const absoluteInFrame = seg.startFrame + layer.inFrame;
        const absoluteOutFrame = seg.startFrame + layer.outFrame;
        if (currentFrame < absoluteInFrame || currentFrame >= absoluteOutFrame) continue;

        // Include text layers (with content) and image/lottie overlays (not full-canvas base layers)
        if (layer.type === 'text' && layer.text?.content) {
          result.push({ segmentId: seg.id, layer });
          addedIds.add(layer.id);
        } else if ((layer.type === 'image' || layer.type === 'lottie') &&
          !(layer.size.w === STUDIO_WIDTH && layer.size.h === STUDIO_HEIGHT && layer.position.x === 0 && layer.position.y === 0)) {
          result.push({ segmentId: seg.id, layer });
          addedIds.add(layer.id);
        }
      }
    }

    for (const track of (project.overlayTracks || [])) {
      for (const clip of track.clips) {
        const clipEnd = clip.startFrame + clip.durationInFrames;
        if (currentFrame < clip.startFrame || currentFrame >= clipEnd) continue;

        // Support both text and image overlay clips for drag/resize
        if (clip.type === 'text' && clip.text?.content) {
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
        } else if (clip.type === 'image' || clip.type === 'video') {
          const overlayAsLayer: LayerItem = {
            id: clip.id,
            type: 'image',
            src: clip.src || '',
            position: clip.position || { x: Math.round(STUDIO_WIDTH * 0.35), y: Math.round(STUDIO_HEIGHT * 0.35) },
            size: clip.size || { w: Math.round(STUDIO_WIDTH * 0.3), h: Math.round(STUDIO_HEIGHT * 0.3) },
            zIndex: clip.zIndex || 10,
            opacity: clip.opacity ?? 1,
            rotation: 0,
            visible: true,
            locked: false,
            inFrame: 0,
            outFrame: clip.durationInFrames,
          };
          result.push({ segmentId: track.id, layer: overlayAsLayer });
        }
      }
    }

    // Add active caption chunks as virtual text layers — use stored position/size or defaults
    for (const track of (project.captions || [])) {
      const segment = project.segments.find(s => s.id === track.segmentId);
      if (!segment) continue;

      for (let i = 0; i < track.chunks.length; i++) {
        const chunk = track.chunks[i];
        const chunkStartFrame = segment.startFrame + Math.round((chunk.startMs / 1000) * STUDIO_FPS);
        const chunkEndFrame = segment.startFrame + Math.round((chunk.endMs / 1000) * STUDIO_FPS);
        if (currentFrame < chunkStartFrame || currentFrame >= chunkEndFrame) continue;

        const clipId = `caption-${track.segmentId}-${i}`;
        if (addedIds.has(clipId)) continue;
        addedIds.add(clipId);

        // Use stored position/size from track, or default (bottom 15%, centered, max-width 85%)
        const defaultW = Math.round(STUDIO_WIDTH * 0.85);
        const defaultH = 80;
        const captionW = track.size?.w ?? defaultW;
        const captionH = track.size?.h ?? defaultH;
        const captionX = track.position?.x ?? Math.round((STUDIO_WIDTH - captionW) / 2);
        const captionY = track.position?.y ?? Math.round(STUDIO_HEIGHT * 0.85 - captionH);
        const captionFontSize = track.fontSize ?? 42;

        const captionAsLayer: LayerItem = {
          id: clipId,
          type: 'text',
          src: '',
          position: { x: captionX, y: captionY },
          size: { w: captionW, h: captionH },
          zIndex: 100,
          opacity: track.opacity ?? 1,
          rotation: 0,
          visible: true,
          locked: false,
          inFrame: 0,
          outFrame: chunkEndFrame - chunkStartFrame,
          text: {
            content: chunk.text,
            fontSize: captionFontSize,
            fontFamily: track.fontFamily || 'Inter',
            color: track.color || '#FFFFFF',
          },
        };
        result.push({ segmentId: 'captions', layer: captionAsLayer });
      }
    }

    return result;
  }, [project.segments, currentFrame, project.overlayTracks, project.captions]);

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

  // Find the layer being dragged to get its width/height for snap computation
  const draggedLayer = useMemo(() => {
    if (!dragState) return null;
    return visibleOverlayLayers.find(
      v => v.segmentId === dragState.segmentId && v.layer.id === dragState.layerId
    )?.layer ?? null;
  }, [dragState, visibleOverlayLayers]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startMouseX;
      const dy = e.clientY - dragState.startMouseY;

      // Compute snap guides for real-time visual feedback
      if (draggedLayer) {
        const compX = dragState.startPosX + dx / scale;
        const compY = dragState.startPosY + dy / scale;
        const w = draggedLayer.size.w;
        const h = estimateLayerHeight(draggedLayer);
        const snap = applySnap(compX, compY, w, h);
        // Convert snapped position back to screen delta
        const snappedDx = (snap.x - dragState.startPosX) * scale;
        const snappedDy = (snap.y - dragState.startPosY) * scale;
        dragDeltaRef.current = { dx: snappedDx, dy: snappedDy };
        setDragDelta({ dx: snappedDx, dy: snappedDy });
        setActiveGuides(snap.guides);
      } else {
        dragDeltaRef.current = { dx, dy };
        setDragDelta({ dx, dy });
      }
    };

    const handleUp = () => {
      const compDx = dragDeltaRef.current.dx / scale;
      const compDy = dragDeltaRef.current.dy / scale;

      let newX = Math.round(Math.max(0, Math.min(STUDIO_WIDTH, dragState.startPosX + compDx)));
      let newY = Math.round(Math.max(0, Math.min(STUDIO_HEIGHT, dragState.startPosY + compDy)));

      onLayerMove(dragState.segmentId, dragState.layerId, { x: newX, y: newY });

      setDragState(null);
      setDragDelta({ dx: 0, dy: 0 });
      dragDeltaRef.current = { dx: 0, dy: 0 };
      setActiveGuides({ centerX: false, centerY: false, edgeX: null, edgeY: null });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, draggedLayer, scale, onLayerMove]);

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
      startH: estimateLayerHeight(layer),
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
      setActiveGuides({ centerX: false, centerY: false, edgeX: null, edgeY: null });
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
  const hasInteraction = visibleOverlayLayers.length > 0 || !!isInteracting || !!selectedLayerId;

  // Guide line positions in screen pixels
  const guideCenterXpx = offsetX + CANVAS_CENTER_X * scale;
  const guideCenterYpx = offsetY + CANVAS_CENTER_Y * scale;
  const canvasTopPx = offsetY;
  const canvasBottomPx = offsetY + STUDIO_HEIGHT * scale;
  const canvasLeftPx = offsetX;
  const canvasRightPx = offsetX + STUDIO_WIDTH * scale;
  const showAnyGuide = dragState && (activeGuides.centerX || activeGuides.centerY || activeGuides.edgeX !== null || activeGuides.edgeY !== null);

  return (
    <div
      className="absolute inset-0 z-50"
      style={{
        cursor: overlayCursor,
        pointerEvents: hasInteraction ? 'auto' : 'none',
      }}
      onMouseDown={handleOverlayClick}
    >
      {/* CapCut-style alignment guide lines */}
      {showAnyGuide && (
        <>
          {/* Vertical center line */}
          {activeGuides.centerX && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: guideCenterXpx,
                top: canvasTopPx,
                width: 1,
                height: canvasBottomPx - canvasTopPx,
                background: '#10B981',
                boxShadow: '0 0 4px rgba(16,185,129,0.6)',
                zIndex: 60,
              }}
            />
          )}
          {/* Horizontal center line */}
          {activeGuides.centerY && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: canvasLeftPx,
                top: guideCenterYpx,
                width: canvasRightPx - canvasLeftPx,
                height: 1,
                background: '#10B981',
                boxShadow: '0 0 4px rgba(16,185,129,0.6)',
                zIndex: 60,
              }}
            />
          )}
          {/* Edge-aligned vertical line (object edge at canvas center X) */}
          {activeGuides.edgeX !== null && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: offsetX + activeGuides.edgeX * scale,
                top: canvasTopPx,
                width: 1,
                height: canvasBottomPx - canvasTopPx,
                background: '#F59E0B',
                boxShadow: '0 0 4px rgba(245,158,11,0.5)',
                zIndex: 60,
              }}
            />
          )}
          {/* Edge-aligned horizontal line (object edge at canvas center Y) */}
          {activeGuides.edgeY !== null && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: canvasLeftPx,
                top: offsetY + activeGuides.edgeY * scale,
                width: canvasRightPx - canvasLeftPx,
                height: 1,
                background: '#F59E0B',
                boxShadow: '0 0 4px rgba(245,158,11,0.5)',
                zIndex: 60,
              }}
            />
          )}
        </>
      )}

      {visibleOverlayLayers.map(({ segmentId, layer }) => {
        const isSelected = selectedSegmentId === segmentId && selectedLayerId === layer.id;
        const isHovered = hoveredLayerId === layer.id;
        const showHandles = (isSelected || isHovered) && !layer.locked;
        const isDragging = dragState?.layerId === layer.id;
        const isResizing = resizeState?.layerId === layer.id;

        // Position using actual measured offset from Remotion's DOM
        let previewX = offsetX + layer.position.x * scale;
        let previewY = offsetY + layer.position.y * scale;
        let previewW = layer.size.w * scale;
        let previewH = estimateLayerHeight(layer) * scale;

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
            className={`absolute transition-[border-color] duration-75 ${
              isSelected
                ? 'border-2 border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
                : isHovered
                  ? 'border-2 border-emerald-500/60'
                  : 'border-2 border-transparent'
            } ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
            style={{
              left: previewX,
              top: previewY,
              width: previewW,
              height: previewH,
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => handleMouseDown(e, segmentId, layer)}
            onMouseEnter={() => setHoveredLayerId(layer.id)}
            onMouseLeave={() => setHoveredLayerId(prev => prev === layer.id ? null : prev)}
          >
            {/* Resize handles — visible on hover or when selected */}
            {showHandles && (
              <>
                {/* Corner handles — proportional resize + font scale */}
                {(['tl', 'tr', 'bl', 'br'] as ResizeHandle[]).map(h => (
                  <div
                    key={h}
                    className={`absolute w-2.5 h-2.5 rounded-full border border-white/50 z-10 ${
                      isSelected ? 'bg-emerald-500' : 'bg-emerald-500/70'
                    }`}
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

            {/* Label — shows on hover or selected */}
            {(isSelected || isHovered) && (
              <div className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-white text-[8px] font-medium whitespace-nowrap ${
                isSelected ? 'bg-emerald-500' : 'bg-emerald-500/70'
              }`}>
                {layer.type === 'image' ? 'Image' : (layer.text?.content?.slice(0, 20) || 'Text')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
