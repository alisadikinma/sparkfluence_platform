// ============================================================================
// Sparkfluence Studio — Main Remotion Composition
// This is what @remotion/player renders for preview.
// Sequences segments end-to-end, each with its own layer stack.
// ============================================================================

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SparkfluenceProject } from '../types/studio';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../types/studio';
import { SegmentRenderer } from './layers/SegmentRenderer';

interface VideoCompositionProps {
  project: SparkfluenceProject;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({ project }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {project.segments.map((segment) => (
        <Sequence
          key={segment.id}
          from={segment.startFrame}
          durationInFrames={segment.durationInFrames}
          name={`${segment.segmentType}-${segment.id.slice(-4)}`}
        >
          <SegmentRenderer segment={segment} />
        </Sequence>
      ))}

      {/* Global audio tracks */}
      {project.audio.bgm.map((track) =>
        !track.muted && track.src ? (
          <Sequence
            key={track.id}
            from={track.startFrame}
            durationInFrames={track.durationInFrames}
            name={`bgm-${track.id.slice(-4)}`}
          >
            <AudioLayer src={track.src} volume={track.volume} />
          </Sequence>
        ) : null
      )}

      {project.audio.tts.map((track) =>
        !track.muted && track.src ? (
          <Sequence
            key={track.id}
            from={track.startFrame}
            durationInFrames={track.durationInFrames}
            name={`tts-${track.id.slice(-4)}`}
          >
            <AudioLayer src={track.src} volume={track.volume} />
          </Sequence>
        ) : null
      )}

      {project.audio.sfx.map((track) =>
        !track.muted && track.src ? (
          <Sequence
            key={track.id}
            from={track.startFrame}
            durationInFrames={track.durationInFrames}
            name={`sfx-${track.id.slice(-4)}`}
          >
            <AudioLayer src={track.src} volume={track.volume} />
          </Sequence>
        ) : null
      )}
    </AbsoluteFill>
  );
};

// --- Simple Audio Layer ---
const AudioLayer: React.FC<{ src: string; volume: number }> = ({ src, volume }) => {
  // Remotion's <Audio> component handles playback in preview and render.
  // Imported lazily to avoid issues when Remotion is not installed yet.
  try {
    const { Audio } = require('remotion');
    return <Audio src={src} volume={volume} />;
  } catch {
    return null;
  }
};
