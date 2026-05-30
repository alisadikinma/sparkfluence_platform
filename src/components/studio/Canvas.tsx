// ============================================================================
// Sparkfluence Studio — Canvas Preview
// Shows the 9:16 video preview. Wraps @remotion/player when available,
// falls back to a static layer preview.
// ============================================================================

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useStudio } from '../../contexts/StudioContext';
import { STUDIO_WIDTH, STUDIO_HEIGHT, STUDIO_FPS } from '../../types/studio';
import { formatTimecode } from '../../lib/composition';

// Scale factor: fit 1080x1920 into the available container
function useCanvasScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const padding = 32;
        const scaleX = (width - padding) / STUDIO_WIDTH;
        const scaleY = (height - padding) / STUDIO_HEIGHT;
        setScale(Math.min(scaleX, scaleY, 0.5));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return scale;
}

export const Canvas: React.FC = () => {
  const { state, dispatch } = useStudio();
  const { project, playback, selection } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useCanvasScale(containerRef);

  const canvasW = STUDIO_WIDTH * scale;
  const canvasH = STUDIO_HEIGHT * scale;

  // Find current segment based on playhead
  const currentSegment = project.segments.find(seg =>
    playback.currentFrame >= seg.startFrame &&
    playback.currentFrame < seg.startFrame + seg.durationInFrames
  );

  // Playback controls
  const togglePlay = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', isPlaying: !playback.isPlaying });
  }, [playback.isPlaying, dispatch]);

  const seekBack = useCallback(() => {
    // Jump to previous segment start
    if (!currentSegment) return;
    const prevSeg = project.segments.find(s =>
      s.startFrame + s.durationInFrames <= currentSegment.startFrame
    );
    dispatch({
      type: 'SET_CURRENT_FRAME',
      frame: prevSeg ? prevSeg.startFrame : 0,
    });
  }, [currentSegment, project.segments, dispatch]);

  const seekForward = useCallback(() => {
    // Jump to next segment start
    if (!currentSegment) return;
    const nextSeg = project.segments.find(s =>
      s.startFrame >= currentSegment.startFrame + currentSegment.durationInFrames
    );
    if (nextSeg) {
      dispatch({ type: 'SET_CURRENT_FRAME', frame: nextSeg.startFrame });
    }
  }, [currentSegment, project.segments, dispatch]);

  // Simple frame animation when playing
  useEffect(() => {
    if (!playback.isPlaying) return;
    const interval = setInterval(() => {
      dispatch({
        type: 'SET_CURRENT_FRAME',
        frame: (state.playback.currentFrame + 1) % (project.totalDurationInFrames || 1),
      });
    }, 1000 / STUDIO_FPS);
    return () => clearInterval(interval);
  }, [playback.isPlaying, project.totalDurationInFrames, dispatch, state.playback.currentFrame]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
      >
        <div
          style={{ width: canvasW, height: canvasH }}
          className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        >
          {/* Layer Rendering (static preview) */}
          {currentSegment ? (
            <SegmentPreview segment={currentSegment} scale={scale} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
              No segments
            </div>
          )}

          {/* Segment type badge */}
          {currentSegment && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
              {currentSegment.segmentType}
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-[#2b2b38] bg-[#0f0f1a]">
        <button onClick={seekBack} className="text-gray-400 hover:text-white p-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19,20 9,12 19,4" /><line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white"
        >
          {playback.isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <button onClick={seekForward} className="text-gray-400 hover:text-white p-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,4 15,12 5,20" /><line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        <span className="text-xs text-gray-400 font-mono ml-3">
          {formatTimecode(playback.currentFrame)} / {formatTimecode(project.totalDurationInFrames)}
        </span>
      </div>
    </div>
  );
};

// --- Static Segment Preview ---
// Renders layers as positioned divs (non-Remotion fallback).
// When @remotion/player is installed, SparkfluenceStudio.tsx uses Player directly.

const SegmentPreview: React.FC<{ segment: any; scale: number }> = ({ segment, scale }) => {
  const sortedLayers = [...(segment.layers || [])]
    .filter((l: any) => l.visible !== false)
    .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <>
      {sortedLayers.map((layer: any) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: (layer.position?.x || 0) * scale,
          top: (layer.position?.y || 0) * scale,
          width: (layer.size?.w || STUDIO_WIDTH) * scale,
          height: (layer.size?.h || STUDIO_HEIGHT) * scale,
          opacity: layer.opacity ?? 1,
          zIndex: layer.zIndex || 0,
          overflow: 'hidden',
        };

        switch (layer.type) {
          case 'video':
            return (
              <div key={layer.id} style={style}>
                {layer.src ? (
                  <video
                    src={layer.src}
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
              </div>
            );
          case 'image':
            return (
              <div key={layer.id} style={style}>
                {layer.src ? (
                  <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
              </div>
            );
          case 'text':
            return (
              <div key={layer.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                <span style={{
                  fontFamily: layer.text?.fontFamily || 'Inter',
                  fontSize: (layer.text?.fontSize || 48) * scale,
                  fontWeight: 800,
                  color: layer.text?.color || '#fff',
                  WebkitTextStroke: `${(layer.text?.strokeWidth || 2) * scale}px ${layer.text?.strokeColor || '#000'}`,
                  paintOrder: 'stroke fill',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                }}>
                  {layer.text?.content}
                </span>
              </div>
            );
          case 'lottie':
            return (
              <div key={layer.id} style={style}>
                {layer.src && <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
};
