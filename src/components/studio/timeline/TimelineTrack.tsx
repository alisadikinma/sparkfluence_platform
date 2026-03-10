// ============================================================================
// Timeline Track — Single horizontal track row
// CapCut-style: icon + label + lock/eye/volume controls in the header.
// Video track is taller (60px) to accommodate filmstrip thumbnails.
// ============================================================================

import React, { useCallback, useState } from 'react';
import { TimelineClip } from './TimelineClip';
import type { TimelineClipData } from './types';
import { STUDIO_FPS } from '../../../types/studio';

// --- Inline SVG icons for track controls ---
const LockIcon = ({ locked }: { locked: boolean }) => (
  locked ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  visible ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
);

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  muted ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
);

interface TimelineTrackProps {
  trackType: 'video' | 'text' | 'tts' | 'bgm' | 'sfx';
  label: string;
  icon: React.ReactNode;
  clips: TimelineClipData[];
  pixelsPerSecond: number;
  onClipClick: (clipId: string) => void;
  selectedClipId: string | null;
  onTrim?: (clipId: string, trimStartFrames: number, trimEndFrames: number) => void;
  activeTool?: string;
  onSplit?: (clipId: string, splitFrame: number) => void;
  onTransitionDrop?: (fromClipId: string, toClipId: string, transitionType: string) => void;
  onMediaInsert?: (insertIndex: number, mediaData: string) => void;
  /** Callback when user drags a clip to a new time position */
  onMove?: (clipId: string, newStartFrame: number) => void;
}

/** Video track is taller for filmstrip thumbnails; other tracks stay compact */
const TRACK_HEIGHTS: Record<string, number> = {
  video: 60,
  text: 40,
  tts: 40,
  bgm: 40,
  sfx: 40,
};

/** Clip height inside the track (track height minus vertical padding) */
const CLIP_HEIGHTS: Record<string, number> = {
  video: 52,
  text: 32,
  tts: 32,
  bgm: 32,
  sfx: 32,
};

const HEADER_WIDTH = 100;

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  trackType,
  label,
  icon,
  clips,
  pixelsPerSecond,
  onClipClick,
  selectedClipId,
  onTrim,
  activeTool,
  onSplit,
  onTransitionDrop,
  onMediaInsert,
  onMove,
}) => {
  const trackHeight = TRACK_HEIGHTS[trackType] ?? 40;
  const clipHeight = CLIP_HEIGHTS[trackType] ?? 32;

  // Local track control state (visual only for now — can connect to project state later)
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Show volume control only for audio-related tracks
  const hasVolume = trackType === 'tts' || trackType === 'bgm' || trackType === 'sfx' || trackType === 'video';

  // Track which drop zone is being hovered (index between clips)
  const [hoveredDropZone, setHoveredDropZone] = useState<number | null>(null);

  // Calculate drop zones between adjacent clips (video track only)
  const dropZones = trackType === 'video' && clips.length > 1
    ? clips.slice(0, -1).map((clip, i) => {
        const nextClip = clips[i + 1];
        const clipEndPx = ((clip.startFrame + clip.durationInFrames) / STUDIO_FPS) * pixelsPerSecond;
        const nextClipStartPx = (nextClip.startFrame / STUDIO_FPS) * pixelsPerSecond;
        const centerPx = (clipEndPx + nextClipStartPx) / 2;
        return {
          index: i,
          fromClipId: clip.id,
          toClipId: nextClip.id,
          leftPx: centerPx - 40,
          widthPx: 80,
        };
      })
    : [];

  const handleDropZoneDragOver = useCallback((e: React.DragEvent, zoneIndex: number) => {
    const hasTransition = e.dataTransfer.types.includes('application/x-studio-transition');
    const hasMedia = e.dataTransfer.types.includes('application/x-studio-media');
    if (hasTransition || hasMedia) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setHoveredDropZone(zoneIndex);
    }
  }, []);

  const handleDropZoneDragLeave = useCallback(() => {
    setHoveredDropZone(null);
  }, []);

  const handleDropZoneDrop = useCallback((e: React.DragEvent, fromClipId: string, toClipId: string, insertIndex: number) => {
    e.preventDefault();
    setHoveredDropZone(null);

    const transitionJson = e.dataTransfer.getData('application/x-studio-transition');
    if (transitionJson && onTransitionDrop) {
      try {
        const { type } = JSON.parse(transitionJson);
        onTransitionDrop(fromClipId, toClipId, type);
      } catch { /* ignore */ }
      return;
    }

    const mediaJson = e.dataTransfer.getData('application/x-studio-media');
    if (mediaJson && onMediaInsert) {
      onMediaInsert(insertIndex + 1, mediaJson);
    }
  }, [onTransitionDrop, onMediaInsert]);

  return (
    <div className="flex" style={{ height: trackHeight, opacity: isVisible ? 1 : 0.4 }}>
      {/* Fixed track header — CapCut-style with icon+label row and controls row */}
      <div
        className="flex-shrink-0 flex flex-col justify-center border-r border-b border-[#262626] bg-[#161616] px-1.5"
        style={{ width: HEADER_WIDTH }}
      >
        {/* Row 1: Icon + Label */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-neutral-500 flex-shrink-0">{icon}</span>
          <span className="text-[10px] font-medium text-neutral-400 truncate">{label}</span>
        </div>

        {/* Row 2: Lock / Eye / Volume controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-0.5 rounded transition-colors ${
              isLocked ? 'text-amber-400' : 'text-neutral-600 hover:text-neutral-400'
            }`}
            title={isLocked ? 'Unlock track' : 'Lock track'}
          >
            <LockIcon locked={isLocked} />
          </button>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className={`p-0.5 rounded transition-colors ${
              !isVisible ? 'text-red-400' : 'text-neutral-600 hover:text-neutral-400'
            }`}
            title={isVisible ? 'Hide track' : 'Show track'}
          >
            <EyeIcon visible={isVisible} />
          </button>
          {hasVolume && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-0.5 rounded transition-colors ${
                isMuted ? 'text-red-400' : 'text-neutral-600 hover:text-neutral-400'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon muted={isMuted} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable clip area */}
      <div className="flex-1 relative border-b border-[#1E1E1E] bg-[#1E1E1E]">
        {clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            pixelsPerSecond={pixelsPerSecond}
            isSelected={selectedClipId === clip.id}
            onClick={() => onClipClick(clip.id)}
            clipHeight={clipHeight}
            onTrim={onTrim}
            activeTool={activeTool}
            onSplit={onSplit}
            onMove={onMove}
          />
        ))}

        {/* Drop zones between clips (video track only) */}
        {dropZones.map((zone) => (
          <div
            key={`dropzone-${zone.index}`}
            className="absolute top-0 z-[5]"
            style={{ left: zone.leftPx, width: zone.widthPx, height: trackHeight }}
            onDragOver={(e) => handleDropZoneDragOver(e, zone.index)}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={(e) => handleDropZoneDrop(e, zone.fromClipId, zone.toClipId, zone.index)}
          >
            {hoveredDropZone === zone.index && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-0.5 h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>
            )}
          </div>
        ))}

        {/* Empty state line */}
        {clips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-[#262626]" />
          </div>
        )}
      </div>
    </div>
  );
};
