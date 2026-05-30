// ============================================================================
// Audio Properties Panel — Volume, fades, mute, delete for audio tracks
// ============================================================================

import React, { useMemo } from 'react';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';
import type { AudioTrackItem } from '../../../types/studio';
import { STUDIO_FPS } from '../../../types/studio';

interface AudioPropertiesProps {
  track: AudioTrackItem;
  trackType: 'tts' | 'bgm' | 'sfx';
  onUpdate: (changes: Partial<AudioTrackItem>) => void;
  onRemove: () => void;
}

const TRACK_TYPE_LABELS: Record<string, string> = {
  tts: 'Voice (TTS)',
  bgm: 'Background Music',
  sfx: 'Sound Effect',
};

const TRACK_TYPE_COLORS: Record<string, string> = {
  tts: '#60A5FA',    // blue-400
  bgm: '#C084FC',    // purple-400
  sfx: '#FBBF24',    // amber-400
};

// Slider component with consistent styling
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
  accentColor?: string;
}> = ({ label, value, min, max, step, displayValue, onChange, accentColor = '#10B981' }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{label}</span>
        <span className="text-xs font-mono text-neutral-300">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, #404040 ${percentage}%, #404040 100%)`,
        }}
      />
    </div>
  );
};

// Volume envelope SVG preview
const VolumeEnvelopePreview: React.FC<{
  volume: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  durationInFrames: number;
  color: string;
}> = ({ volume, fadeInFrames, fadeOutFrames, durationInFrames, color }) => {
  const width = 200;
  const height = 40;
  const padding = 4;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const totalFrames = Math.max(durationInFrames, 1);
  const fadeInX = padding + (fadeInFrames / totalFrames) * innerWidth;
  const fadeOutX = padding + ((totalFrames - fadeOutFrames) / totalFrames) * innerWidth;
  const volumeY = padding + innerHeight * (1 - volume);
  const bottomY = padding + innerHeight;

  // Clamp fade points
  const safeInX = Math.min(fadeInX, fadeOutX);
  const safeOutX = Math.max(fadeInX, fadeOutX);

  const pathD = [
    `M ${padding} ${bottomY}`,           // start at bottom-left
    `L ${safeInX} ${volumeY}`,           // fade in to peak volume
    `L ${safeOutX} ${volumeY}`,          // sustain at peak volume
    `L ${padding + innerWidth} ${bottomY}`, // fade out to bottom-right
  ].join(' ');

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-neutral-400">Volume Envelope</span>
      <svg
        width={width}
        height={height}
        className="rounded bg-neutral-900 border border-neutral-800"
      >
        {/* Grid lines */}
        <line x1={padding} y1={padding + innerHeight * 0.5} x2={padding + innerWidth} y2={padding + innerHeight * 0.5} stroke="#262626" strokeWidth={0.5} />
        <line x1={padding} y1={padding} x2={padding + innerWidth} y2={padding} stroke="#262626" strokeWidth={0.5} strokeDasharray="2,2" />

        {/* Fill */}
        <path
          d={`${pathD} L ${padding + innerWidth} ${bottomY} L ${padding} ${bottomY} Z`}
          fill={color}
          opacity={0.15}
        />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots at control points */}
        <circle cx={safeInX} cy={volumeY} r={2.5} fill={color} />
        <circle cx={safeOutX} cy={volumeY} r={2.5} fill={color} />
      </svg>
    </div>
  );
};

export const AudioProperties: React.FC<AudioPropertiesProps> = ({
  track,
  trackType,
  onUpdate,
  onRemove,
}) => {
  const color = TRACK_TYPE_COLORS[trackType] || '#10B981';

  // Volume: 0-1 internally, display as 0-100%
  const volumePercent = Math.round(track.volume * 100);

  // Fade: stored in frames, display as seconds (0-2s range)
  const fadeInSeconds = track.fadeInFrames / STUDIO_FPS;
  const fadeOutSeconds = track.fadeOutFrames / STUDIO_FPS;

  // TTS lock mode (visual only for now)
  const [lockMode, setLockMode] = React.useState<'locked' | 'free'>('locked');

  // Duration display
  const durationSec = useMemo(
    () => (track.durationInFrames / STUDIO_FPS).toFixed(1),
    [track.durationInFrames]
  );

  return (
    <div className="bg-[#161616] rounded-xl border border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-neutral-200 truncate">{track.label}</span>
        </div>
        <span className="text-xs text-neutral-500 font-mono flex-shrink-0 ml-2">{durationSec}s</span>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Track type label */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">{TRACK_TYPE_LABELS[trackType]}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${color}15`,
              color,
              border: `1px solid ${color}30`,
            }}
          >
            {trackType.toUpperCase()}
          </span>
        </div>

        {/* Volume slider */}
        <Slider
          label="Volume"
          value={volumePercent}
          min={0}
          max={100}
          step={1}
          displayValue={`${volumePercent}%`}
          onChange={(val) => onUpdate({ volume: val / 100 })}
          accentColor={color}
        />

        {/* Fade In slider (0-2 seconds → 0-60 frames) */}
        <Slider
          label="Fade In"
          value={fadeInSeconds}
          min={0}
          max={2}
          step={0.05}
          displayValue={`${fadeInSeconds.toFixed(2)}s`}
          onChange={(val) => onUpdate({ fadeInFrames: Math.round(val * STUDIO_FPS) })}
          accentColor={color}
        />

        {/* Fade Out slider (0-2 seconds → 0-60 frames) */}
        <Slider
          label="Fade Out"
          value={fadeOutSeconds}
          min={0}
          max={2}
          step={0.05}
          displayValue={`${fadeOutSeconds.toFixed(2)}s`}
          onChange={(val) => onUpdate({ fadeOutFrames: Math.round(val * STUDIO_FPS) })}
          accentColor={color}
        />

        {/* Volume envelope preview */}
        <VolumeEnvelopePreview
          volume={track.volume}
          fadeInFrames={track.fadeInFrames}
          fadeOutFrames={track.fadeOutFrames}
          durationInFrames={track.durationInFrames}
          color={color}
        />

        {/* Mute toggle */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-neutral-400">Mute</span>
          <button
            onClick={() => onUpdate({ muted: !track.muted })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${track.muted
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
              }`}
          >
            {track.muted ? (
              <>
                <VolumeX size={12} />
                Muted
              </>
            ) : (
              <>
                <Volume2 size={12} />
                Active
              </>
            )}
          </button>
        </div>

        {/* TTS-specific: Lock to segment toggle (visual only) */}
        {trackType === 'tts' && (
          <div className="space-y-1.5">
            <span className="text-xs text-neutral-400">Position Mode</span>
            <div className="flex gap-2">
              <button
                onClick={() => setLockMode('locked')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${lockMode === 'locked'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:bg-neutral-700'
                  }`}
              >
                Lock to segment
              </button>
              <button
                onClick={() => setLockMode('free')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${lockMode === 'free'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:bg-neutral-700'
                  }`}
              >
                Free position
              </button>
            </div>
          </div>
        )}

        {/* Delete button (SFX only — TTS and BGM are tied to pipeline) */}
        {trackType === 'sfx' && (
          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-2 w-full rounded-lg text-xs font-medium
                bg-red-500/10 text-red-400 border border-red-500/20
                hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={12} />
              Remove Sound Effect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
