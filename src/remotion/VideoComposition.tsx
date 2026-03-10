// ============================================================================
// Sparkfluence Studio — Main Remotion Composition
// This is what @remotion/player renders for preview.
// Sequences segments end-to-end, each with its own layer stack.
// Supports transitions (fade, slide, wipe) between consecutive segments.
// ============================================================================

import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate } from 'remotion';
import type { SparkfluenceProject, TransitionItem, TransitionType, SegmentComposition, CaptionTrack, OverlayTrack } from '../types/studio';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../types/studio';
import { SegmentRenderer } from './layers/SegmentRenderer';
import { CaptionLayer } from './layers/CaptionLayer';
import { OverlayClipRenderer } from './layers/OverlayClipRenderer';

interface VideoCompositionProps {
  project: SparkfluenceProject;
}

// --- Transition wrapper that applies visual effects to outgoing/incoming segments ---

interface TransitionWrapperProps {
  transition: TransitionItem;
  role: 'outgoing' | 'incoming';
  children: React.ReactNode;
}

const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  transition,
  role,
  children,
}) => {
  const frame = useCurrentFrame();
  const dur = transition.durationInFrames;

  // Resolve to a renderable transition type (unsupported types fall back to fade)
  const effectiveType: TransitionType = (() => {
    switch (transition.type) {
      case 'fade':
      case 'slide':
      case 'wipe':
        return transition.type;
      // flip, clock-wipe, iris use fade as fallback for now
      default:
        return 'fade';
    }
  })();

  if (effectiveType === 'fade') {
    // Cross-dissolve: outgoing fades from 1 to 0, incoming fades from 0 to 1
    const opacity =
      role === 'outgoing'
        ? interpolate(frame, [0, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        : interpolate(frame, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    return (
      <AbsoluteFill style={{ opacity }}>
        {children}
      </AbsoluteFill>
    );
  }

  if (effectiveType === 'slide') {
    // Slide: incoming slides in from right over outgoing
    if (role === 'outgoing') {
      // Outgoing stays in place (or optionally slides left)
      const translateX = interpolate(frame, [0, dur], [0, -STUDIO_WIDTH * 0.3], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return (
        <AbsoluteFill style={{ transform: `translateX(${translateX}px)` }}>
          {children}
        </AbsoluteFill>
      );
    }
    // Incoming slides in from right
    const translateX = interpolate(frame, [0, dur], [STUDIO_WIDTH, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill style={{ transform: `translateX(${translateX}px)` }}>
        {children}
      </AbsoluteFill>
    );
  }

  if (effectiveType === 'wipe') {
    // Horizontal wipe: incoming is revealed left-to-right via clip-path
    if (role === 'outgoing') {
      // Outgoing is fully visible, then hidden as wipe progresses
      const clipRight = interpolate(frame, [0, dur], [100, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return (
        <AbsoluteFill
          style={{
            clipPath: `inset(0 ${100 - clipRight}% 0 0)`,
          }}
        >
          {children}
        </AbsoluteFill>
      );
    }
    // Incoming wipes in from left
    const clipLeft = interpolate(frame, [0, dur], [100, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill
        style={{
          clipPath: `inset(0 0 0 ${clipLeft}%)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  // Fallback: no effect
  return <AbsoluteFill>{children}</AbsoluteFill>;
};

// --- Main Composition ---

export const VideoComposition: React.FC<VideoCompositionProps> = ({ project }) => {
  // Build a lookup: transition between [fromId, toId]
  const transitionMap = useMemo(() => {
    const map = new Map<string, TransitionItem>();
    for (const t of project.transitions) {
      const key = `${t.betweenSegments[0]}__${t.betweenSegments[1]}`;
      map.set(key, t);
    }
    return map;
  }, [project.transitions]);

  // Build a lookup: caption track by segment ID
  const captionMap = useMemo(() => {
    const map = new Map<string, CaptionTrack>();
    for (const track of project.captions || []) {
      map.set(track.segmentId, track);
    }
    return map;
  }, [project.captions]);

  // Pre-compute adjusted start frames and overlaps for transitions.
  // When a transition exists between segment A and segment B, segment B starts
  // earlier by the transition duration so the two overlap visually.
  const segmentLayout = useMemo(() => {
    const segments = project.segments;
    const layout: Array<{
      segment: SegmentComposition;
      adjustedStart: number;
      transitionIn: TransitionItem | null;  // transition from previous segment INTO this one
      transitionOut: TransitionItem | null; // transition from this segment INTO next one
    }> = [];

    let cumulativeOffset = 0; // total frames pulled back due to transitions

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const prevSeg = i > 0 ? segments[i - 1] : null;
      const nextSeg = i < segments.length - 1 ? segments[i + 1] : null;

      const transIn = prevSeg
        ? transitionMap.get(`${prevSeg.id}__${seg.id}`) ?? null
        : null;
      const transOut = nextSeg
        ? transitionMap.get(`${seg.id}__${nextSeg.id}`) ?? null
        : null;

      // If there's a transition into this segment, it starts earlier by that duration
      if (transIn) {
        cumulativeOffset += transIn.durationInFrames;
      }

      layout.push({
        segment: seg,
        adjustedStart: seg.startFrame - cumulativeOffset,
        transitionIn: transIn,
        transitionOut: transOut,
      });
    }

    return layout;
  }, [project.segments, transitionMap]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {segmentLayout.map(({ segment, adjustedStart, transitionIn, transitionOut }) => {
        const hasTransIn = transitionIn !== null;
        const hasTransOut = transitionOut !== null;
        const captionTrack = captionMap.get(segment.id);

        return (
          <Sequence
            key={segment.id}
            from={Math.max(0, adjustedStart)}
            durationInFrames={segment.durationInFrames}
            name={`${segment.segmentType}-${segment.id.slice(-4)}`}
          >
            {/* Base segment (no transition active) */}
            {!hasTransIn && !hasTransOut && (
              <SegmentRenderer segment={segment} />
            )}

            {/* Segment with transitions — we need frame-aware rendering */}
            {(hasTransIn || hasTransOut) && (
              <TransitionSegment
                segment={segment}
                transitionIn={transitionIn}
                transitionOut={transitionOut}
              />
            )}

            {/* Caption overlay — rendered on top of segment content */}
            {captionTrack && captionTrack.chunks.length > 0 && (
              <CaptionLayer track={captionTrack} segmentStartFrame={segment.startFrame} />
            )}
          </Sequence>
        );
      })}

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

      {/* Overlay tracks — rendered on top of main segments */}
      {(project.overlayTracks || []).map((oTrack) =>
        oTrack.clips.map((clip) => (
          <Sequence
            key={clip.id}
            from={clip.startFrame}
            durationInFrames={clip.durationInFrames}
            name={`overlay-${clip.id.slice(-6)}`}
          >
            <OverlayClipRenderer clip={clip} clipStartFrame={0} />
          </Sequence>
        ))
      )}
    </AbsoluteFill>
  );
};

// --- TransitionSegment: handles fade-in/out at segment boundaries ---

interface TransitionSegmentProps {
  segment: SegmentComposition;
  transitionIn: TransitionItem | null;
  transitionOut: TransitionItem | null;
}

const TransitionSegment: React.FC<TransitionSegmentProps> = ({
  segment,
  transitionIn,
  transitionOut,
}) => {
  const frame = useCurrentFrame();
  const dur = segment.durationInFrames;
  const transInDur = transitionIn?.durationInFrames ?? 0;
  const transOutDur = transitionOut?.durationInFrames ?? 0;

  // Determine if we're in the transition-in zone or transition-out zone
  const inTransInZone = transitionIn && frame < transInDur;
  const inTransOutZone = transitionOut && frame >= dur - transOutDur;

  if (inTransInZone && transitionIn) {
    // During the transition-in period, this segment is the "incoming" one
    return (
      <TransitionWrapper transition={transitionIn} role="incoming">
        <SegmentRenderer segment={segment} />
      </TransitionWrapper>
    );
  }

  if (inTransOutZone && transitionOut) {
    // During the transition-out period, this segment is the "outgoing" one
    // We need to calculate frame relative to the transition start
    const transOutStart = dur - transOutDur;
    const relativeFrame = frame - transOutStart;

    return (
      <TransitionOutWrapper transition={transitionOut} relativeFrame={relativeFrame}>
        <SegmentRenderer segment={segment} />
      </TransitionOutWrapper>
    );
  }

  // Normal rendering (no transition active at this frame)
  return <SegmentRenderer segment={segment} />;
};

// --- TransitionOutWrapper: manually drives outgoing transition with a relative frame ---

interface TransitionOutWrapperProps {
  transition: TransitionItem;
  relativeFrame: number;
  children: React.ReactNode;
}

const TransitionOutWrapper: React.FC<TransitionOutWrapperProps> = ({
  transition,
  relativeFrame,
  children,
}) => {
  const dur = transition.durationInFrames;
  const frame = relativeFrame;

  const effectiveType: TransitionType = (() => {
    switch (transition.type) {
      case 'fade':
      case 'slide':
      case 'wipe':
        return transition.type;
      default:
        return 'fade';
    }
  })();

  if (effectiveType === 'fade') {
    const opacity = interpolate(frame, [0, dur], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  }

  if (effectiveType === 'slide') {
    const translateX = interpolate(frame, [0, dur], [0, -STUDIO_WIDTH * 0.3], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill style={{ transform: `translateX(${translateX}px)` }}>
        {children}
      </AbsoluteFill>
    );
  }

  if (effectiveType === 'wipe') {
    const clipRight = interpolate(frame, [0, dur], [100, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - clipRight}% 0 0)` }}>
        {children}
      </AbsoluteFill>
    );
  }

  return <AbsoluteFill>{children}</AbsoluteFill>;
};

// --- Simple Audio Layer ---
const AudioLayer: React.FC<{ src: string; volume: number }> = ({ src, volume }) => {
  if (!src) return null;
  return <Audio src={src} volume={volume} />;
};
