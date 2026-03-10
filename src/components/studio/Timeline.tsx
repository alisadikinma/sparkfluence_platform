// ============================================================================
// Sparkfluence Studio — Timeline Container
// Multi-track timeline with ruler, playhead, and zoom controls.
// Composes: TimelineRuler, TimelineTrack, Playhead
// ============================================================================

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useStudio } from '../../contexts/StudioContext';
import { framesToSeconds, formatTimecode, generateId, createVideoLayer, createImageLayer, createTextLayer, secondsToFrames } from '../../lib/composition';
import { generateVideoThumbnail } from '../../lib/videoThumbnail';
import { STUDIO_FPS } from '../../types/studio';
import type { SegmentComposition, OverlayTrack, OverlayClip } from '../../types/studio';
import { TimelineRuler } from './timeline/TimelineRuler';
import { TimelineTrack } from './timeline/TimelineTrack';
import { Playhead } from './timeline/Playhead';
import { TransitionDiamond } from './timeline/TransitionDiamond';
import { TransitionPicker } from './panels/TransitionPicker';
import type { TransitionType } from '../../types/studio';
import type { TimelineClipData } from './timeline/types';

// Re-export shared type for external consumers
export type { TimelineClipData } from './timeline/types';

// SVG icons (inline to avoid extra dependencies)
const VideoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const TextIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const MicIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MusicIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const HEADER_WIDTH = 100;

/** Portal wrapper for TransitionPicker — renders in document.body to avoid overflow clipping */
const TransitionPickerPortal: React.FC<{
  anchorX: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}> = ({ anchorX, scrollContainerRef, children }) => {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Position picker above the scroll container, centered on diamond X
    const scrollLeft = container.scrollLeft;
    const leftPx = rect.left + anchorX - scrollLeft - 150; // 150 = half picker width
    const topPx = rect.top - 8; // 8px gap above container
    setPos({ left: Math.max(8, leftPx), top: topPx });
  }, [anchorX, scrollContainerRef]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed z-[200]"
      style={{ left: pos.left, bottom: `${window.innerHeight - pos.top}px` }}
    >
      {children}
    </div>,
    document.body
  );
};

interface TimelineProps {
  activeTool?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ activeTool }) => {
  const { state, dispatch } = useStudio();
  const { project, playback, zoom, selection } = state;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [thumbnailMap, setThumbnailMap] = useState<Map<string, string>>(new Map());

  // Transition picker popover state: which diamond pair is open
  const [activeTransitionPicker, setActiveTransitionPicker] = useState<{
    fromId: string;
    toId: string;
    positionX: number;
  } | null>(null);

  // Generate thumbnails for video segments (async, updates state when ready)
  useEffect(() => {
    let cancelled = false;

    const generateThumbnails = async () => {
      const newMap = new Map(thumbnailMap);
      let changed = false;

      for (const seg of project.segments) {
        if (newMap.has(seg.id)) continue;

        const videoLayer = seg.layers.find(l => l.type === 'video');
        const imageLayer = seg.layers.find(l => l.type === 'image');

        if (videoLayer?.src) {
          const thumb = await generateVideoThumbnail(videoLayer.src);
          if (cancelled) return;
          if (thumb) {
            newMap.set(seg.id, thumb);
            changed = true;
          }
        } else if (imageLayer?.src) {
          newMap.set(seg.id, imageLayer.src);
          changed = true;
        }
      }

      if (changed && !cancelled) setThumbnailMap(newMap);
    };

    generateThumbnails();
    return () => { cancelled = true; };
  }, [project.segments]);

  // Auto-scroll timeline to keep playhead visible during playback
  useEffect(() => {
    if (!playback.isPlaying || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const playheadPx = (playback.currentFrame / STUDIO_FPS) * (zoom * 30) + HEADER_WIDTH;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;

    // If playhead is near the right edge (within 80px) or past it, scroll to follow
    if (playheadPx > viewRight - 80 || playheadPx < viewLeft + HEADER_WIDTH) {
      container.scrollLeft = playheadPx - container.clientWidth * 0.3;
    }
  }, [playback.isPlaying, playback.currentFrame, zoom]);

  // Core calculations
  const pixelsPerSecond = zoom * 30;
  const totalSeconds = framesToSeconds(project.totalDurationInFrames);
  const totalWidth = Math.max(totalSeconds * pixelsPerSecond, 600);

  // Handle horizontal scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // Ctrl+wheel = zoom, plain wheel = horizontal scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.25 : 0.25;
        const newZoom = Math.max(0.25, Math.min(4, zoom + delta));
        dispatch({ type: 'SET_ZOOM', zoom: newZoom });
      } else {
        // Horizontal scroll on regular wheel
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft += e.deltaY;
        }
      }
    },
    [zoom, dispatch]
  );

  // Click on ruler area → seek
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const seconds = x / pixelsPerSecond;
      const frame = Math.round(seconds * STUDIO_FPS);
      dispatch({
        type: 'SET_CURRENT_FRAME',
        frame: Math.max(0, Math.min(frame, project.totalDurationInFrames)),
      });
    },
    [pixelsPerSecond, scrollLeft, project.totalDurationInFrames, dispatch]
  );

  // Build clip data for video track from segments (with thumbnail extraction)
  const videoClips: TimelineClipData[] = useMemo(
    () =>
      project.segments.map((seg) => {
        const videoLayer = seg.layers.find((l) => l.type === 'video');
        const imageLayer = seg.layers.find((l) => l.type === 'image');
        const hasMedia = !!(videoLayer?.src || imageLayer?.src);
        const thumbnailUrl = thumbnailMap.get(seg.id) || undefined;

        return {
          id: seg.id,
          label: seg.segmentType,
          startFrame: seg.startFrame,
          durationInFrames: seg.durationInFrames,
          color: hasMedia ? 'rgba(115, 115, 115, 0.3)' : 'rgba(115, 115, 115, 0.15)',
          segmentType: seg.segmentType,
          thumbnailUrl: hasMedia ? thumbnailUrl : undefined,
          maxDurationInFrames: seg.maxDurationInFrames,
          mediaSrc: videoLayer?.src || imageLayer?.src,
          isVideo: !!videoLayer?.src,
        };
      }),
    [project.segments, thumbnailMap]
  );

  // Build clip data for TTS track
  const ttsClips: TimelineClipData[] = useMemo(
    () =>
      project.audio.tts.map((track) => ({
        id: track.id,
        label: track.label,
        startFrame: track.startFrame,
        durationInFrames: track.durationInFrames,
        color: 'rgba(16, 185, 129, 0.25)',
        segmentType: undefined,
      })),
    [project.audio.tts]
  );

  // Build clip data for BGM track
  const bgmClips: TimelineClipData[] = useMemo(
    () =>
      project.audio.bgm.map((track) => ({
        id: track.id,
        label: track.label,
        startFrame: track.startFrame,
        durationInFrames: track.durationInFrames,
        color: 'rgba(236, 72, 153, 0.25)',
        segmentType: undefined,
      })),
    [project.audio.bgm]
  );

  // Build packed text track rows — only create new rows when clips overlap in time
  const packedTextTracks: TimelineClipData[][] = useMemo(() => {
    const totalFrames = project.totalDurationInFrames || 1;
    // Collect all text clips
    const allTextClips: TimelineClipData[] = [];
    for (const seg of project.segments) {
      for (const layer of seg.layers) {
        if (layer.type !== 'text' || !layer.text?.content) continue;
        allTextClips.push({
          id: layer.id,
          label: layer.text.content.length > 30
            ? layer.text.content.slice(0, 30) + '…'
            : layer.text.content,
          startFrame: seg.startFrame + layer.inFrame,
          durationInFrames: layer.outFrame - layer.inFrame,
          maxDurationInFrames: totalFrames, // Allow extending across segments
          color: 'rgba(16, 185, 129, 0.25)',
          segmentType: seg.segmentType,
        });
      }
    }

    if (allTextClips.length === 0) return [];

    // Pack clips into minimum track rows (greedy: place each clip on first row where it fits)
    const rows: TimelineClipData[][] = [];
    for (const clip of allTextClips) {
      const clipEnd = clip.startFrame + clip.durationInFrames;
      let placed = false;
      for (const row of rows) {
        const overlaps = row.some(existing => {
          const existingEnd = existing.startFrame + existing.durationInFrames;
          return clip.startFrame < existingEnd && clipEnd > existing.startFrame;
        });
        if (!overlaps) {
          row.push(clip);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([clip]);
      }
    }

    return rows;
  }, [project.segments]);

  // Build caption clips (Groq Whisper auto-captions — grouped in one track)
  const captionClips: TimelineClipData[] = useMemo(() => {
    const clips: TimelineClipData[] = [];
    const captionTracks = project.captions || [];

    for (const track of captionTracks) {
      const segment = project.segments.find(s => s.id === track.segmentId);
      if (!segment) continue;

      for (let i = 0; i < track.chunks.length; i++) {
        const chunk = track.chunks[i];
        const startFrame = segment.startFrame + Math.round((chunk.startMs / 1000) * STUDIO_FPS);
        const endFrame = segment.startFrame + Math.round((chunk.endMs / 1000) * STUDIO_FPS);
        const duration = Math.max(1, endFrame - startFrame);

        clips.push({
          id: `caption-${track.segmentId}-${i}`,
          label: chunk.text,
          startFrame,
          durationInFrames: duration,
          color: 'rgba(16, 185, 129, 0.15)',
          segmentType: undefined,
        });
      }
    }

    return clips;
  }, [project.segments, project.captions]);

  // Build clip data for overlay tracks
  const overlayTracks = project.overlayTracks || [];

  const overlayTrackClips = useMemo(() => {
    const totalFrames = project.totalDurationInFrames || 1;
    return overlayTracks.map(track => ({
      track,
      clips: track.clips.map((clip): TimelineClipData => ({
        id: clip.id,
        label: clip.type === 'text' ? (clip.text?.content?.slice(0, 25) || 'Text') : clip.src.split('/').pop()?.slice(0, 20) || clip.type,
        startFrame: clip.startFrame,
        durationInFrames: clip.durationInFrames,
        maxDurationInFrames: totalFrames, // Allow extending to full project length
        color: track.trackType === 'video' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.25)',
        segmentType: undefined,
        mediaSrc: clip.type !== 'text' ? clip.src : undefined,
        isVideo: clip.type === 'video',
      })),
    }));
  }, [overlayTracks, project.totalDurationInFrames]);

  // Handle adding a new overlay track
  const handleAddOverlayTrack = useCallback(
    (trackType: 'video' | 'text') => {
      dispatch({ type: 'ADD_OVERLAY_TRACK', trackType });
    },
    [dispatch]
  );

  // Handle dropping media onto an overlay track
  const handleOverlayTrackDrop = useCallback(
    (trackId: string, e: React.DragEvent) => {
      const mediaJson = e.dataTransfer.getData('application/x-studio-media');
      if (!mediaJson) return;

      try {
        const media = JSON.parse(mediaJson) as {
          id: string;
          type: 'video' | 'image';
          url: string;
          name: string;
          durationSec: number;
        };

        // Calculate frame position from drop X
        const rect = e.currentTarget.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const dropSeconds = dropX / pixelsPerSecond;
        const startFrame = Math.max(0, Math.round(dropSeconds * STUDIO_FPS));

        const clip: OverlayClip = {
          id: generateId('oclip'),
          type: media.type,
          src: media.url,
          startFrame,
          durationInFrames: secondsToFrames(media.durationSec),
          position: { x: 0, y: 0 },
          size: { w: 1080, h: 1920 },
          opacity: 1,
          zIndex: 10,
        };

        dispatch({ type: 'ADD_OVERLAY_CLIP', trackId, clip });
      } catch {
        // Invalid data — ignore
      }
    },
    [dispatch, pixelsPerSecond]
  );

  // Handle overlay clip click
  const handleOverlayClipClick = useCallback(
    (clipId: string) => {
      // Select the overlay clip (find which track it belongs to)
      for (const track of (project.overlayTracks || [])) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          dispatch({ type: 'SELECT_LAYER', segmentId: track.id, layerId: clipId });
          return;
        }
      }
    },
    [project.overlayTracks, dispatch]
  );

  // Handle overlay clip trim — adjusts startFrame/durationInFrames
  const handleOverlayTrim = useCallback(
    (clipId: string, trimStartFrames: number, trimEndFrames: number) => {
      for (const track of (project.overlayTracks || [])) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          const newStartFrame = Math.max(0, clip.startFrame + trimStartFrames);
          const newDuration = clip.durationInFrames - trimStartFrames - trimEndFrames;
          if (newDuration > 0) {
            dispatch({
              type: 'UPDATE_OVERLAY_CLIP',
              trackId: track.id,
              clipId,
              changes: { startFrame: newStartFrame, durationInFrames: newDuration },
            });
          }
          return;
        }
      }
    },
    [project.overlayTracks, dispatch]
  );

  // Handle overlay clip move — repositions on timeline
  const handleOverlayMove = useCallback(
    (clipId: string, newAbsoluteStartFrame: number) => {
      for (const track of (project.overlayTracks || [])) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          dispatch({
            type: 'MOVE_OVERLAY_CLIP',
            trackId: track.id,
            clipId,
            startFrame: Math.max(0, newAbsoluteStartFrame),
          });
          return;
        }
      }
    },
    [project.overlayTracks, dispatch]
  );

  // Handle drop on empty area below tracks (auto-create overlay track)
  const handleEmptyAreaDrop = useCallback(
    (e: React.DragEvent) => {
      const mediaJson = e.dataTransfer.getData('application/x-studio-media');
      if (!mediaJson) return;

      try {
        const media = JSON.parse(mediaJson) as { type: 'video' | 'image' };
        const trackType = media.type === 'video' ? 'video' as const : 'video' as const;
        dispatch({ type: 'ADD_OVERLAY_TRACK', trackType });
        // The clip will need to be added after the track is created
        // For simplicity, we'll just create the track — user can then drag onto it
      } catch { /* ignore */ }
    },
    [dispatch]
  );

  // Handle drop of media from left panel onto timeline
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  const handleTimelineDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDropTarget(false);
      setDropIndicatorIndex(null);

      const mediaJson = e.dataTransfer.getData('application/x-studio-media');
      if (!mediaJson) return;

      try {
        const media = JSON.parse(mediaJson) as {
          id: string;
          type: 'video' | 'image';
          url: string;
          name: string;
          durationSec: number;
          // Pipeline-specific fields (optional)
          pipelineSegId?: string;
          segmentType?: string;
          script?: string;
          emotion?: string;
          visualDirection?: string;
          layout?: string;
          isOnTimeline?: boolean;
        };

        // Calculate insert index from drop X position
        const container = scrollContainerRef.current;
        let insertIndex = project.segments.length; // default: append
        if (container) {
          const rect = container.getBoundingClientRect();
          const dropX = e.clientX - rect.left + container.scrollLeft - HEADER_WIDTH;
          const dropSeconds = dropX / pixelsPerSecond;

          // Find which segment boundary the drop is closest to
          let accSec = 0;
          for (let i = 0; i < project.segments.length; i++) {
            const segSec = project.segments[i].durationInFrames / STUDIO_FPS;
            const midpoint = accSec + segSec / 2;
            if (dropSeconds < midpoint) {
              insertIndex = i;
              break;
            }
            accSec += segSec;
          }
        }

        const segId = media.pipelineSegId || media.id;

        // If this segment is already on the timeline, MOVE it (reorder)
        if (media.isOnTimeline && segId) {
          const currentIndex = project.segments.findIndex(s => s.id === segId);
          if (currentIndex !== -1) {
            // Adjust insert index since we're removing first
            const adjustedIndex = insertIndex > currentIndex ? insertIndex - 1 : insertIndex;
            if (adjustedIndex === currentIndex) return; // dropped in same position — no-op
            // Build new order: remove from current position, insert at new position
            const ids = project.segments.map(s => s.id);
            ids.splice(currentIndex, 1);
            ids.splice(adjustedIndex, 0, segId);
            dispatch({ type: 'REORDER_SEGMENTS', segmentIds: ids });
            return;
          }
        }

        // New segment — create and insert
        const durFrames = secondsToFrames(media.durationSec);
        const layers = media.type === 'video'
          ? [createVideoLayer(media.url, durFrames)]
          : [createImageLayer(media.url, durFrames)];

        // Add text/subtitle layer if script exists
        if (media.script) {
          layers.push(createTextLayer(media.script, durFrames));
        }

        const segment: SegmentComposition = {
          id: segId || generateId('seg_drop'),
          segmentType: (media.segmentType || 'BODY') as SegmentComposition['segmentType'],
          startFrame: 0,
          durationInFrames: durFrames,
          layout: (media.layout || 'full') as any,
          layers,
          script: media.script || '',
          emotion: media.emotion || 'neutral',
          visualDirection: media.visualDirection || '',
        };

        dispatch({ type: 'INSERT_SEGMENT_AT', segment, insertIndex });
      } catch {
        // Invalid drag data — ignore
      }
    },
    [dispatch, pixelsPerSecond, project.segments]
  );

  const handleTimelineDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-studio-media')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDropTarget(true);

      // Calculate drop indicator position
      const container = scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const dropX = e.clientX - rect.left + container.scrollLeft - HEADER_WIDTH;
        const dropSeconds = dropX / pixelsPerSecond;

        let idx = project.segments.length;
        let accSec = 0;
        for (let i = 0; i < project.segments.length; i++) {
          const segSec = project.segments[i].durationInFrames / STUDIO_FPS;
          const midpoint = accSec + segSec / 2;
          if (dropSeconds < midpoint) {
            idx = i;
            break;
          }
          accSec += segSec;
        }
        setDropIndicatorIndex(idx);
      }
    }
  }, [pixelsPerSecond, project.segments]);

  const handleTimelineDragLeave = useCallback(() => {
    setIsDropTarget(false);
    setDropIndicatorIndex(null);
  }, []);

  // Handle trim — dispatch TRIM_SEGMENT for video clips
  const handleTrim = useCallback(
    (clipId: string, trimStartFrames: number, trimEndFrames: number) => {
      dispatch({
        type: 'TRIM_SEGMENT',
        segmentId: clipId,
        trimStartFrames,
        trimEndFrames,
      });
    },
    [dispatch]
  );

  // Handle split — dispatch SPLIT_SEGMENT_AT_FRAME
  const handleSplit = useCallback(
    (clipId: string, splitFrame: number) => {
      dispatch({ type: 'SPLIT_SEGMENT_AT_FRAME', segmentId: clipId, splitFrame });
    },
    [dispatch]
  );

  // Handle transition drop between two clips
  const handleTransitionDrop = useCallback(
    (fromClipId: string, toClipId: string, transitionType: string) => {
      // Check if transition already exists between these segments
      const existing = project.transitions.find(
        t => t.betweenSegments[0] === fromClipId && t.betweenSegments[1] === toClipId
      );
      if (existing) {
        // Update existing transition type
        dispatch({ type: 'UPDATE_TRANSITION', transitionId: existing.id, changes: { type: transitionType as any } });
      } else {
        // Create new transition
        dispatch({
          type: 'ADD_TRANSITION',
          transition: {
            id: generateId('trans'),
            type: transitionType as any,
            durationInFrames: secondsToFrames(0.5),
            betweenSegments: [fromClipId, toClipId],
          },
        });
      }
    },
    [project.transitions, dispatch]
  );

  // Handle media insert between clips on main track
  const handleMediaInsert = useCallback(
    (insertIndex: number, mediaJson: string) => {
      try {
        const media = JSON.parse(mediaJson) as {
          id: string;
          type: 'video' | 'image';
          url: string;
          name: string;
          durationSec: number;
          pipelineSegId?: string;
          segmentType?: string;
          script?: string;
          emotion?: string;
          visualDirection?: string;
          layout?: string;
        };

        const durFrames = secondsToFrames(media.durationSec);
        const layers = media.type === 'video'
          ? [createVideoLayer(media.url, durFrames)]
          : [createImageLayer(media.url, durFrames)];

        // Add text/subtitle layer if script exists
        if (media.script) {
          layers.push(createTextLayer(media.script, durFrames));
        }

        const segment: SegmentComposition = {
          id: media.pipelineSegId || generateId('seg_insert'),
          segmentType: (media.segmentType || 'BODY') as SegmentComposition['segmentType'],
          startFrame: 0,
          durationInFrames: durFrames,
          layout: (media.layout || 'full') as any,
          layers,
          script: media.script || '',
          emotion: media.emotion || 'neutral',
          visualDirection: media.visualDirection || '',
        };

        dispatch({ type: 'INSERT_SEGMENT_AT', segment, insertIndex });
      } catch {
        // Invalid data — ignore
      }
    },
    [dispatch]
  );

  // Handle text layer trim — adjusts inFrame/outFrame of text layer
  // Allows extending beyond segment boundary (cross-segment text expansion)
  const handleTextTrim = useCallback(
    (clipId: string, trimStartFrames: number, trimEndFrames: number) => {
      const totalFrames = project.totalDurationInFrames || 1;
      for (const seg of project.segments) {
        const textLayer = seg.layers.find(l => l.id === clipId && l.type === 'text');
        if (textLayer) {
          const newInFrame = Math.max(0, textLayer.inFrame + trimStartFrames);
          // Allow outFrame beyond segment boundary, clamped to total project duration
          const maxOutFrame = totalFrames - seg.startFrame;
          const newOutFrame = Math.min(maxOutFrame, textLayer.outFrame - trimEndFrames);
          if (newOutFrame > newInFrame) {
            dispatch({
              type: 'UPDATE_LAYER',
              segmentId: seg.id,
              layerId: clipId,
              changes: { inFrame: newInFrame, outFrame: newOutFrame },
            });
          }
          return;
        }
      }
    },
    [project.segments, project.totalDurationInFrames, dispatch]
  );

  // Handle text layer move — repositions text within project timeline (can cross segment boundaries)
  const handleTextMove = useCallback(
    (clipId: string, newAbsoluteStartFrame: number) => {
      const totalFrames = project.totalDurationInFrames || 1;
      for (const seg of project.segments) {
        const textLayer = seg.layers.find(l => l.id === clipId && l.type === 'text');
        if (!textLayer) continue;

        const duration = textLayer.outFrame - textLayer.inFrame;
        // Convert absolute frame to relative inFrame within this segment
        const newInFrame = Math.max(-seg.startFrame, newAbsoluteStartFrame - seg.startFrame);
        // Allow outFrame to extend beyond segment boundary (cross-segment text)
        const newOutFrame = newInFrame + duration;

        // Clamp: can't go before project start or after project end
        const clampedInFrame = Math.max(0, newInFrame);
        const clampedOutFrame = Math.min(totalFrames - seg.startFrame, newOutFrame);

        if (clampedOutFrame > clampedInFrame) {
          dispatch({
            type: 'UPDATE_LAYER',
            segmentId: seg.id,
            layerId: clipId,
            changes: { inFrame: clampedInFrame, outFrame: clampedOutFrame },
          });
        }
        return;
      }
    },
    [project.segments, project.totalDurationInFrames, dispatch]
  );

  // Handle clip click — for video clips, select segment; for text layers, select layer
  const handleClipClick = useCallback(
    (clipId: string) => {
      // Check if it's a segment (video track)
      const isSegment = project.segments.some((s) => s.id === clipId);
      if (isSegment) {
        dispatch({ type: 'SELECT_SEGMENT', segmentId: clipId });
        return;
      }
      // Check if it's a text layer within a segment
      for (const seg of project.segments) {
        const textLayer = seg.layers.find(l => l.id === clipId && l.type === 'text');
        if (textLayer) {
          dispatch({ type: 'SELECT_LAYER', segmentId: seg.id, layerId: textLayer.id });
          return;
        }
      }
    },
    [project.segments, dispatch]
  );

  return (
    <div className="flex flex-col bg-[#161616] border-t border-[#262626]" style={{ minHeight: 180 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#262626] bg-[#161616]">
        <span className="text-xs text-neutral-400 font-medium">TIMELINE</span>
        <div className="flex-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.max(0.25, zoom - 0.25) })}
          className="text-neutral-400 hover:text-neutral-200 text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors"
        >
          -
        </button>
        <span className="text-xs text-neutral-500 w-10 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.min(4, zoom + 0.25) })}
          className="text-neutral-400 hover:text-neutral-200 text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors"
        >
          +
        </button>

        <div className="w-px h-4 bg-[#262626] mx-1" />

        {/* Time display */}
        <span className="text-xs text-neutral-300 font-mono">
          {formatTimecode(playback.currentFrame)} / {formatTimecode(project.totalDurationInFrames)}
        </span>
      </div>

      {/* Timeline Body */}
      <div className="flex flex-1 overflow-hidden" onWheel={handleWheel}>
        {/* Fixed track headers column — rendered inside each TimelineTrack */}
        {/* Scrollable area containing ruler + all tracks + playhead */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Ruler row */}
          <div className="flex">
            {/* Empty header cell aligned with track headers */}
            <div
              className="flex-shrink-0 border-r border-b border-[#262626] bg-[#161616]"
              style={{ width: HEADER_WIDTH, height: 28 }}
            />
            {/* Scrollable ruler */}
            <div
              className="flex-1 overflow-hidden cursor-pointer"
              onClick={handleRulerClick}
            >
              <div style={{ width: totalWidth, marginLeft: -scrollLeft }}>
                <TimelineRuler
                  zoom={zoom}
                  totalFrames={project.totalDurationInFrames}
                  scrollLeft={scrollLeft}
                  pixelsPerSecond={pixelsPerSecond}
                />
              </div>
            </div>
          </div>

          {/* Tracks + playhead container */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Tracks area — the track component handles its own header + scrollable clip area */}
            <div
              ref={scrollContainerRef}
              className={`flex-1 overflow-x-auto overflow-y-auto transition-colors ${
                isDropTarget ? 'bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/30' : ''
              }`}
              onScroll={handleScroll}
              onDrop={handleTimelineDrop}
              onDragOver={handleTimelineDragOver}
              onDragLeave={handleTimelineDragLeave}
            >
              <div style={{ width: totalWidth + HEADER_WIDTH, position: 'relative' }}>
                {/* Empty drop zone ABOVE video track — for dragging overlay videos on top */}
                <div
                  className="flex"
                  style={{ height: 28 }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/x-studio-media')) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleEmptyAreaDrop(e);
                  }}
                >
                  <div
                    className="flex-shrink-0 border-r border-b border-[#262626] bg-[#161616]"
                    style={{ width: HEADER_WIDTH }}
                  />
                  <div className="flex-1 border-b border-[#1E1E1E] bg-[#1A1A1A]" />
                </div>

                {/* Video Track + Transition Diamonds */}
                <div className="relative">
                  {/* Drop position indicator */}
                  {isDropTarget && dropIndicatorIndex !== null && (() => {
                    // Calculate pixel position for the drop indicator
                    let accFrames = 0;
                    for (let i = 0; i < dropIndicatorIndex && i < project.segments.length; i++) {
                      accFrames += project.segments[i].durationInFrames;
                    }
                    const indicatorPx = (accFrames / STUDIO_FPS) * pixelsPerSecond + HEADER_WIDTH;
                    return (
                      <div
                        className="absolute top-0 bottom-0 z-30 pointer-events-none"
                        style={{ left: indicatorPx - 1 }}
                      >
                        <div className="w-0.5 h-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                      </div>
                    );
                  })()}
                  <TimelineTrack
                    trackType="video"
                    label="Video"
                    icon={<VideoIcon />}
                    clips={videoClips}
                    pixelsPerSecond={pixelsPerSecond}
                    onClipClick={handleClipClick}
                    selectedClipId={selection.segmentId}
                    onTrim={handleTrim}
                    activeTool={activeTool}
                    onSplit={handleSplit}
                    onTransitionDrop={handleTransitionDrop}
                    onMediaInsert={handleMediaInsert}
                  />

                  {/* Transition diamonds between adjacent clips */}
                  {videoClips.length > 1 && videoClips.slice(0, -1).map((clip, i) => {
                    const nextClip = videoClips[i + 1];
                    const clipEndPx = ((clip.startFrame + clip.durationInFrames) / STUDIO_FPS) * pixelsPerSecond;
                    const nextClipStartPx = (nextClip.startFrame / STUDIO_FPS) * pixelsPerSecond;
                    const centerPx = (clipEndPx + nextClipStartPx) / 2 + HEADER_WIDTH;

                    const transition = project.transitions.find(
                      t => t.betweenSegments[0] === clip.id && t.betweenSegments[1] === nextClip.id
                    ) ?? null;

                    const isPickerOpen = activeTransitionPicker?.fromId === clip.id && activeTransitionPicker?.toId === nextClip.id;

                    return (
                      <React.Fragment key={`td-${clip.id}-${nextClip.id}`}>
                        <TransitionDiamond
                          transition={transition}
                          fromSegmentId={clip.id}
                          toSegmentId={nextClip.id}
                          pixelsPerSecond={pixelsPerSecond}
                          positionX={centerPx}
                          onClick={() => {
                            if (!transition) {
                              // Create default fade first, then open picker
                              handleTransitionDrop(clip.id, nextClip.id, 'fade');
                            }
                            // Toggle picker popover
                            if (isPickerOpen) {
                              setActiveTransitionPicker(null);
                            } else {
                              setActiveTransitionPicker({ fromId: clip.id, toId: nextClip.id, positionX: centerPx });
                            }
                          }}
                          onDelete={transition ? () => {
                            dispatch({ type: 'REMOVE_TRANSITION', transitionId: transition.id });
                            setActiveTransitionPicker(null);
                          } : undefined}
                        />
                        {/* Transition Picker Popover — rendered via portal to avoid overflow clipping */}
                        {isPickerOpen && (
                          <TransitionPickerPortal
                            anchorX={centerPx}
                            scrollContainerRef={scrollContainerRef}
                          >
                            <TransitionPicker
                              fromSegmentId={clip.id}
                              toSegmentId={nextClip.id}
                              currentTransition={transition}
                              onSelect={(type: TransitionType, durationFrames: number) => {
                                if (transition) {
                                  dispatch({ type: 'UPDATE_TRANSITION', transitionId: transition.id, changes: { type, durationInFrames: durationFrames } });
                                } else {
                                  handleTransitionDrop(clip.id, nextClip.id, type);
                                }
                              }}
                              onRemove={() => {
                                if (transition) {
                                  dispatch({ type: 'REMOVE_TRANSITION', transitionId: transition.id });
                                }
                              }}
                              onClose={() => setActiveTransitionPicker(null)}
                            />
                          </TransitionPickerPortal>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Text Tracks — packed rows, new row only when clips overlap */}
                {packedTextTracks.map((rowClips, i) => (
                  <TimelineTrack
                    key={`text-row-${i}`}
                    trackType="text"
                    label={packedTextTracks.length === 1 ? 'Text' : `T${i + 1}`}
                    icon={<TextIcon />}
                    clips={rowClips}
                    pixelsPerSecond={pixelsPerSecond}
                    onClipClick={handleClipClick}
                    selectedClipId={selection.layerId}
                    onTrim={handleTextTrim}
                    onMove={handleTextMove}
                    activeTool={activeTool}
                  />
                ))}

                {/* Captions Track — grouped auto-generated captions */}
                {captionClips.length > 0 && (
                  <TimelineTrack
                    trackType="text"
                    label="Captions"
                    icon={<TextIcon />}
                    clips={captionClips}
                    pixelsPerSecond={pixelsPerSecond}
                    onClipClick={handleClipClick}
                    selectedClipId={selection.layerId}
                  />
                )}

                {/* TTS Track — only show when has clips */}
                {ttsClips.length > 0 && (
                  <TimelineTrack
                    trackType="tts"
                    label="TTS"
                    icon={<MicIcon />}
                    clips={ttsClips}
                    pixelsPerSecond={pixelsPerSecond}
                    onClipClick={handleClipClick}
                    selectedClipId={null}
                  />
                )}

                {/* BGM Track — only show when has clips */}
                {bgmClips.length > 0 && (
                  <TimelineTrack
                    trackType="bgm"
                    label="BGM"
                    icon={<MusicIcon />}
                    clips={bgmClips}
                    pixelsPerSecond={pixelsPerSecond}
                    onClipClick={handleClipClick}
                    selectedClipId={null}
                  />
                )}

                {/* Overlay Tracks (Video 2, Text 2, etc.) — only show when has clips */}
                {overlayTrackClips.filter(({ clips: oClips }) => oClips.length > 0).map(({ track, clips: oClips }) => (
                  <div
                    key={track.id}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('application/x-studio-media')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                      }
                    }}
                    onDrop={(e) => { e.preventDefault(); handleOverlayTrackDrop(track.id, e); }}
                  >
                    <TimelineTrack
                      trackType={track.trackType === 'video' ? 'video' : 'text'}
                      label={track.label}
                      icon={track.trackType === 'video' ? <VideoIcon /> : <TextIcon />}
                      clips={oClips}
                      pixelsPerSecond={pixelsPerSecond}
                      onClipClick={handleOverlayClipClick}
                      selectedClipId={selection.layerId}
                      onTrim={handleOverlayTrim}
                      onMove={handleOverlayMove}
                      activeTool={activeTool}
                    />
                  </div>
                ))}

                {/* Drop zone for creating overlay tracks via drag */}
                <div
                  className="flex"
                  style={{ height: 32 }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/x-studio-media')) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }
                  }}
                  onDrop={handleEmptyAreaDrop}
                >
                  <div
                    className="flex-shrink-0 border-r border-b border-[#262626] bg-[#161616]"
                    style={{ width: HEADER_WIDTH }}
                  />
                  <div className="flex-1 border-b border-[#1E1E1E] bg-[#1A1A1A] flex items-center justify-center">
                    <span className="text-[10px] text-neutral-600">Drop media here to create new track</span>
                  </div>
                </div>

                {/* Playhead overlay — spans all tracks, offset by header width */}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: HEADER_WIDTH, right: 0 }}
                >
                  <Playhead
                    pixelsPerSecond={pixelsPerSecond}
                    scrollLeft={scrollLeft}
                    containerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
