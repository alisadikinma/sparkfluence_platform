// ============================================================================
// Sparkfluence Studio — Timeline Component
// Multi-track segment-based timeline with playhead and zoom.
// ============================================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { useStudio } from '../../contexts/StudioContext';
import { framesToSeconds, formatTimecode } from '../../lib/composition';
import { STUDIO_FPS } from '../../types/studio';

// Track row definitions
const TRACK_ROWS = [
  { id: 'video', label: 'VIDEO', color: '#7c3aed' },
  { id: 'sticker', label: 'STICKER', color: '#f59e0b' },
  { id: 'effect', label: 'EFFECT', color: '#ef4444' },
  { id: 'text', label: 'TEXT', color: '#3b82f6' },
  { id: 'tts', label: 'TTS', color: '#10b981' },
  { id: 'bgm', label: 'BGM', color: '#ec4899' },
] as const;

const TRACK_HEIGHT = 36;
const HEADER_HEIGHT = 28;
const RULER_HEIGHT = 24;
const MIN_PIXELS_PER_SECOND = 30;

export const Timeline: React.FC = () => {
  const { state, dispatch, selectedSegment } = useStudio();
  const { project, playback, zoom } = state;
  const timelineRef = useRef<HTMLDivElement>(null);

  const pixelsPerSecond = MIN_PIXELS_PER_SECOND * zoom;
  const totalSeconds = framesToSeconds(project.totalDurationInFrames);
  const totalWidth = Math.max(totalSeconds * pixelsPerSecond, 600);
  const playheadX = framesToSeconds(playback.currentFrame) * pixelsPerSecond;

  // Click on timeline → seek
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
    const seconds = x / pixelsPerSecond;
    const frame = Math.round(seconds * STUDIO_FPS);
    dispatch({ type: 'SET_CURRENT_FRAME', frame: Math.max(0, Math.min(frame, project.totalDurationInFrames)) });
  }, [pixelsPerSecond, project.totalDurationInFrames, dispatch]);

  // Select segment on click
  const handleSegmentClick = useCallback((segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_SEGMENT', segmentId });
  }, [dispatch]);

  // Ruler ticks
  const rulerTicks = useMemo(() => {
    const ticks: { x: number; label: string; major: boolean }[] = [];
    const interval = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5;
    for (let s = 0; s <= totalSeconds; s += interval) {
      ticks.push({
        x: s * pixelsPerSecond,
        label: formatTimecode(s * STUDIO_FPS),
        major: s % (interval * 2) === 0,
      });
    }
    return ticks;
  }, [totalSeconds, pixelsPerSecond, zoom]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] border-t border-[#2b2b38]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2b2b38] bg-[#13131f]">
        <span className="text-xs text-gray-400 font-medium">TIMELINE</span>
        <div className="flex-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.max(0.25, zoom - 0.25) })}
          className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-[#2b2b38]"
        >
          −
        </button>
        <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.min(4, zoom + 0.25) })}
          className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-[#2b2b38]"
        >
          +
        </button>

        <div className="w-px h-4 bg-[#2b2b38] mx-1" />

        {/* Time display */}
        <span className="text-xs text-gray-300 font-mono">
          {formatTimecode(playback.currentFrame)} / {formatTimecode(project.totalDurationInFrames)}
        </span>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div className="w-20 flex-shrink-0 border-r border-[#2b2b38]">
          <div style={{ height: RULER_HEIGHT }} className="border-b border-[#2b2b38]" />
          {TRACK_ROWS.map(track => (
            <div
              key={track.id}
              style={{ height: TRACK_HEIGHT }}
              className="flex items-center px-2 border-b border-[#1a1a28] text-[10px] font-medium text-gray-500"
            >
              <span
                className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
                style={{ backgroundColor: track.color }}
              />
              {track.label}
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Area */}
        <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-hidden" onClick={handleTimelineClick}>
          <div style={{ width: totalWidth, position: 'relative' }}>
            {/* Ruler */}
            <div style={{ height: RULER_HEIGHT }} className="border-b border-[#2b2b38] relative">
              {rulerTicks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute top-0"
                  style={{ left: tick.x }}
                >
                  <div
                    className={`w-px ${tick.major ? 'h-3 bg-gray-500' : 'h-2 bg-gray-700'}`}
                    style={{ marginTop: tick.major ? 0 : 4 }}
                  />
                  {tick.major && (
                    <span className="absolute top-3 text-[9px] text-gray-500 -translate-x-1/2">
                      {tick.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Track Rows */}
            {TRACK_ROWS.map(track => (
              <div
                key={track.id}
                style={{ height: TRACK_HEIGHT }}
                className="border-b border-[#1a1a28] relative"
              >
                {/* Render segment blocks for this track */}
                {project.segments.map(segment => {
                  const x = framesToSeconds(segment.startFrame) * pixelsPerSecond;
                  const w = framesToSeconds(segment.durationInFrames) * pixelsPerSecond;
                  const isSelected = selectedSegment?.id === segment.id;

                  // Check if segment has content for this track
                  const hasContent = getTrackContent(track.id, segment);
                  if (!hasContent && track.id !== 'video') return null;

                  return (
                    <div
                      key={segment.id}
                      onClick={(e) => handleSegmentClick(segment.id, e)}
                      className={`absolute top-1 cursor-pointer rounded transition-all ${
                        isSelected ? 'ring-1 ring-white/50' : 'hover:brightness-125'
                      }`}
                      style={{
                        left: x,
                        width: Math.max(w - 2, 4),
                        height: TRACK_HEIGHT - 8,
                        backgroundColor: `${track.color}${isSelected ? 'cc' : '66'}`,
                        borderLeft: `2px solid ${track.color}`,
                      }}
                    >
                      <span className="text-[9px] text-white/80 px-1 truncate block leading-[28px]">
                        {getTrackLabel(track.id, segment)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none z-10"
              style={{ left: playheadX }}
            >
              <div className="w-2.5 h-2.5 bg-white rounded-full -translate-x-[4px] -translate-y-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helpers ---

function getTrackContent(trackId: string, segment: any): boolean {
  switch (trackId) {
    case 'video':
      return true; // always show video track
    case 'sticker':
      return segment.layers?.some((l: any) => l.type === 'lottie' || l.type === 'image' && l.zIndex === 3);
    case 'effect':
      return segment.layers?.some((l: any) => l.type === 'effect');
    case 'text':
      return segment.layers?.some((l: any) => l.type === 'text');
    case 'tts':
      return false; // handled by global audio
    case 'bgm':
      return false; // handled by global audio
    default:
      return false;
  }
}

function getTrackLabel(trackId: string, segment: any): string {
  switch (trackId) {
    case 'video':
      return `${segment.segmentType} ${framesToSeconds(segment.durationInFrames).toFixed(0)}s`;
    case 'sticker': {
      const sticker = segment.layers?.find((l: any) => l.type === 'lottie');
      return sticker ? 'Sticker' : '';
    }
    case 'effect': {
      const fx = segment.layers?.find((l: any) => l.type === 'effect');
      return fx?.effect?.preset || '';
    }
    case 'text': {
      const text = segment.layers?.find((l: any) => l.type === 'text');
      return text?.text?.content?.slice(0, 20) || '';
    }
    default:
      return '';
  }
}
