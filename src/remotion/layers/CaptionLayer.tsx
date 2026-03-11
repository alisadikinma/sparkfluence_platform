// ============================================================================
// Sparkfluence Studio — Caption Layer (Remotion)
// Renders timed captions with style presets over video segments.
// Supports: classic, bold, neon, outline, karaoke, minimal styles.
// ============================================================================

import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { CaptionTrack, CaptionChunk, CaptionStyle } from '../../types/studio';
import { STUDIO_FPS, STUDIO_WIDTH, STUDIO_HEIGHT } from '../../types/studio';

interface CaptionLayerProps {
  track: CaptionTrack;
  segmentStartFrame: number;
}

// --- Style Definitions ---

interface CaptionStyleConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textShadow: string;
  background: string;
  borderRadius: number;
  padding: string;
  WebkitTextStroke: string;
  letterSpacing: string;
}

function getStyleConfig(style: CaptionStyle): CaptionStyleConfig {
  switch (style) {
    case 'classic':
      return {
        fontFamily: 'Inter',
        fontSize: 42,
        fontWeight: 700,
        color: '#FFFFFF',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.4)',
        background: 'transparent',
        borderRadius: 0,
        padding: '0',
        WebkitTextStroke: '0px transparent',
        letterSpacing: '0px',
      };
    case 'bold':
      return {
        fontFamily: 'Montserrat',
        fontSize: 48,
        fontWeight: 900,
        color: '#FBBF24',
        textShadow: 'none',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: '8px 20px',
        WebkitTextStroke: '0px transparent',
        letterSpacing: '0.5px',
      };
    case 'neon':
      return {
        fontFamily: 'Inter',
        fontSize: 42,
        fontWeight: 700,
        color: '#10B981',
        textShadow: '0 0 8px #10B981, 0 0 20px #10B981, 0 0 40px #059669, 0 0 60px #059669',
        background: 'transparent',
        borderRadius: 0,
        padding: '0',
        WebkitTextStroke: '0px transparent',
        letterSpacing: '1px',
      };
    case 'outline':
      return {
        fontFamily: 'Montserrat',
        fontSize: 48,
        fontWeight: 900,
        color: 'transparent',
        textShadow: 'none',
        background: 'transparent',
        borderRadius: 0,
        padding: '0',
        WebkitTextStroke: '3px #FFFFFF',
        letterSpacing: '0.5px',
      };
    case 'karaoke':
      // Base style for karaoke — highlighting is applied per-word
      return {
        fontFamily: 'Inter',
        fontSize: 42,
        fontWeight: 700,
        color: '#FFFFFF',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        background: 'transparent',
        borderRadius: 0,
        padding: '0',
        WebkitTextStroke: '0px transparent',
        letterSpacing: '0px',
      };
    case 'minimal':
      return {
        fontFamily: 'Inter',
        fontSize: 28,
        fontWeight: 400,
        color: 'rgba(255, 255, 255, 0.8)',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        background: 'transparent',
        borderRadius: 0,
        padding: '0',
        WebkitTextStroke: '0px transparent',
        letterSpacing: '0.3px',
      };
    default:
      return getStyleConfig('classic');
  }
}

// --- Active Chunk Finder ---

function findActiveChunk(
  chunks: CaptionChunk[],
  currentTimeMs: number,
): CaptionChunk | null {
  for (const chunk of chunks) {
    if (currentTimeMs >= chunk.startMs && currentTimeMs <= chunk.endMs) {
      return chunk;
    }
  }
  return null;
}

// --- Karaoke Word Renderer ---

interface KaraokeTextProps {
  chunk: CaptionChunk;
  currentTimeMs: number;
  styleConfig: CaptionStyleConfig;
  highlightColor: string;
}

const KaraokeText: React.FC<KaraokeTextProps> = ({ chunk, currentTimeMs, styleConfig, highlightColor }) => {
  const words = chunk.text.split(' ');
  const chunkDurationMs = chunk.endMs - chunk.startMs;
  const wordDuration = chunkDurationMs / Math.max(words.length, 1);

  return (
    <span>
      {words.map((word, i) => {
        const wordStartMs = chunk.startMs + i * wordDuration;
        const wordEndMs = wordStartMs + wordDuration;

        // Calculate highlight progress for this word
        let highlightProgress = 0;
        if (currentTimeMs >= wordEndMs) {
          highlightProgress = 1;
        } else if (currentTimeMs > wordStartMs) {
          highlightProgress = (currentTimeMs - wordStartMs) / wordDuration;
        }

        const color = highlightProgress > 0.5 ? highlightColor : styleConfig.color;

        return (
          <span
            key={i}
            style={{
              color,
              transition: 'color 0.05s ease',
            }}
          >
            {word}{i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
};

// --- Main Component ---

export const CaptionLayer: React.FC<CaptionLayerProps> = ({ track, segmentStartFrame }) => {
  const frame = useCurrentFrame();
  const currentTimeMs = (frame / STUDIO_FPS) * 1000;

  const styleConfig = useMemo(() => getStyleConfig(track.style), [track.style]);

  const activeChunk = useMemo(
    () => findActiveChunk(track.chunks, currentTimeMs),
    [track.chunks, currentTimeMs],
  );

  if (!activeChunk) return null;

  // Fade in/out animation
  const chunkDurationMs = activeChunk.endMs - activeChunk.startMs;
  const fadeMs = Math.min(100, chunkDurationMs * 0.15);
  const fadeOpacity = interpolate(
    currentTimeMs,
    [activeChunk.startMs, activeChunk.startMs + fadeMs, activeChunk.endMs - fadeMs, activeChunk.endMs],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Track-level overrides for position, size, and styling
  const hasCustomPosition = track.position != null;
  const trackOpacity = (track.opacity ?? 1) * fadeOpacity;
  const fontSize = track.fontSize ?? styleConfig.fontSize;
  const fontFamily = track.fontFamily ?? styleConfig.fontFamily;
  const color = track.color ?? styleConfig.color;
  const highlightColor = track.highlightColor ?? '#10B981';

  // Custom absolute positioning mode (when user has moved the caption)
  if (hasCustomPosition) {
    return (
      <div
        style={{
          position: 'absolute',
          left: track.position!.x,
          top: track.position!.y,
          width: track.size?.w ?? Math.round(STUDIO_WIDTH * 0.85),
          height: track.size?.h ?? 80,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          opacity: trackOpacity,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontFamily,
            fontSize,
            fontWeight: styleConfig.fontWeight,
            color,
            textShadow: styleConfig.textShadow,
            background: styleConfig.background,
            borderRadius: styleConfig.borderRadius,
            padding: styleConfig.padding,
            WebkitTextStroke: styleConfig.WebkitTextStroke,
            letterSpacing: styleConfig.letterSpacing,
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {track.style === 'karaoke' ? (
            <KaraokeText chunk={activeChunk} currentTimeMs={currentTimeMs} styleConfig={{ ...styleConfig, fontSize, fontFamily, color }} highlightColor={highlightColor} />
          ) : (
            activeChunk.text
          )}
        </div>
      </div>
    );
  }

  // Default bottom-15% centered positioning
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '15%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        opacity: trackOpacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: STUDIO_WIDTH * 0.85,
          textAlign: 'center',
          fontFamily,
          fontSize,
          fontWeight: styleConfig.fontWeight,
          color,
          textShadow: styleConfig.textShadow,
          background: styleConfig.background,
          borderRadius: styleConfig.borderRadius,
          padding: styleConfig.padding,
          WebkitTextStroke: styleConfig.WebkitTextStroke,
          letterSpacing: styleConfig.letterSpacing,
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}
      >
        {track.style === 'karaoke' ? (
          <KaraokeText chunk={activeChunk} currentTimeMs={currentTimeMs} styleConfig={{ ...styleConfig, fontSize, fontFamily, color }} />
        ) : (
          activeChunk.text
        )}
      </div>
    </div>
  );
};
