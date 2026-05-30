// ============================================================================
// Audio Clip — Single audio clip block on an audio track
// Supports TTS, BGM, and SFX with waveform visualization
// ============================================================================

import React from 'react';
import { VolumeX } from 'lucide-react';
import { STUDIO_FPS } from '../../../types/studio';

// Track type → color mapping
const TRACK_COLORS: Record<string, { bg: string; border: string; wave: string }> = {
  tts: {
    bg: 'rgba(96, 165, 250, 0.25)',     // blue-400/25
    border: '#60A5FA',                    // blue-400
    wave: 'rgba(96, 165, 250, 0.6)',     // blue-400/60
  },
  bgm: {
    bg: 'rgba(192, 132, 252, 0.25)',     // purple-400/25
    border: '#C084FC',                    // purple-400
    wave: 'rgba(192, 132, 252, 0.6)',    // purple-400/60
  },
  sfx: {
    bg: 'rgba(251, 191, 36, 0.25)',      // amber-400/25
    border: '#FBBF24',                    // amber-400
    wave: 'rgba(251, 191, 36, 0.6)',     // amber-400/60
  },
};

export interface AudioClipData {
  id: string;
  label: string;
  startFrame: number;
  durationInFrames: number;
  color: string;
  muted: boolean;
  trackType: 'tts' | 'bgm' | 'sfx';
}

interface AudioClipProps {
  clip: AudioClipData;
  pixelsPerSecond: number;
  isSelected: boolean;
  onClick: () => void;
  peaks?: number[];
}

// Placeholder waveform bars when no real peaks are available
function generatePlaceholderBars(count: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Pseudo-random pattern using sin waves for a natural-looking waveform
    const t = i / count;
    const v =
      0.3 +
      0.25 * Math.sin(t * Math.PI * 6.7) +
      0.15 * Math.sin(t * Math.PI * 13.3) +
      0.1 * Math.sin(t * Math.PI * 23.1);
    bars.push(Math.max(0.08, Math.min(1, v)));
  }
  return bars;
}

export const AudioClip: React.FC<AudioClipProps> = ({
  clip,
  pixelsPerSecond,
  isSelected,
  onClick,
  peaks,
}) => {
  const widthPx = (clip.durationInFrames / STUDIO_FPS) * pixelsPerSecond;
  const leftPx = (clip.startFrame / STUDIO_FPS) * pixelsPerSecond;
  const effectiveWidth = Math.max(widthPx - 2, 8);

  const colors = TRACK_COLORS[clip.trackType] || TRACK_COLORS.sfx;

  // Use real peaks if available, otherwise generate placeholder bars
  const barCount = Math.max(4, Math.min(200, Math.floor(effectiveWidth / 3)));
  const displayPeaks = peaks && peaks.length > 0
    ? resamplePeaks(peaks, barCount)
    : generatePlaceholderBars(barCount);

  const barWidth = effectiveWidth / barCount;
  const maxBarHeight = 28; // clip height minus padding

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-[4px] rounded cursor-pointer transition-all duration-100 group overflow-hidden
        ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-0' : 'hover:brightness-125'}
        ${clip.muted ? 'opacity-50' : ''}`}
      style={{
        left: leftPx,
        width: effectiveWidth,
        height: 32,
        backgroundColor: colors.bg,
        borderLeft: `2px solid ${colors.border}`,
      }}
    >
      {/* Waveform visualization — mirrored top + bottom (CapCut-style) */}
      <svg
        width={effectiveWidth}
        height={32}
        className="absolute inset-0"
        preserveAspectRatio="none"
      >
        {displayPeaks.map((peak, i) => {
          const barH = Math.max(2, peak * (maxBarHeight / 2));
          const centerY = 16; // vertical center of the 32px clip
          const x = i * barWidth;
          return (
            <rect
              key={i}
              x={x + barWidth * 0.15}
              y={centerY - barH}
              width={Math.max(0.5, barWidth * 0.7)}
              height={barH * 2}
              rx={0.5}
              fill={colors.wave}
            />
          );
        })}
      </svg>

      {/* Label overlay */}
      <div className="relative z-10 flex items-center justify-between h-full px-1.5 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          {clip.muted && (
            <VolumeX size={10} className="text-neutral-400 flex-shrink-0" />
          )}
          <span
            className={`text-[9px] text-neutral-200 truncate leading-none
              ${clip.muted ? 'line-through text-neutral-500' : ''}`}
          >
            {clip.label}
          </span>
        </div>
        {widthPx > 50 && (
          <span className="text-[8px] text-neutral-500 ml-1 flex-shrink-0 font-mono">
            {(clip.durationInFrames / STUDIO_FPS).toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Resample an array of peaks to a target number of bars.
 * Uses simple linear interpolation / max-pooling.
 */
function resamplePeaks(peaks: number[], targetCount: number): number[] {
  if (peaks.length === 0) return [];
  if (peaks.length === targetCount) return peaks;

  const result: number[] = [];
  const ratio = peaks.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), peaks.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      if (peaks[j] > max) max = peaks[j];
    }
    // If start === end (target > source), just use the nearest value
    if (start === end) {
      max = peaks[Math.min(start, peaks.length - 1)];
    }
    result.push(max);
  }

  return result;
}
