// ============================================================================
// Timeline Ruler — Time markers with click-to-seek
// ============================================================================

import React, { useMemo, useCallback } from 'react';
import { STUDIO_FPS } from '../../../types/studio';
import { formatTimecode } from '../../../lib/composition';

interface TimelineRulerProps {
  zoom: number;
  totalFrames: number;
  scrollLeft: number;
  pixelsPerSecond: number;
}

const RULER_HEIGHT = 28;

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  zoom,
  totalFrames,
  scrollLeft,
  pixelsPerSecond,
}) => {
  const totalSeconds = totalFrames / STUDIO_FPS;

  // Tick interval adapts to zoom level
  const tickInterval = useMemo(() => {
    if (zoom >= 3) return 0.5;
    if (zoom >= 2) return 1;
    if (zoom >= 1) return 2;
    if (zoom >= 0.5) return 5;
    return 10;
  }, [zoom]);

  // Major tick = every other tick at higher zoom, every 2nd at lower
  const majorMultiple = useMemo(() => {
    if (tickInterval <= 0.5) return 2;   // major every 1s
    if (tickInterval <= 1) return 5;     // major every 5s
    if (tickInterval <= 2) return 5;     // major every 10s
    return 2;                            // major every 2 intervals
  }, [tickInterval]);

  const ticks = useMemo(() => {
    const result: { x: number; label: string; isMajor: boolean }[] = [];
    const tickCount = Math.ceil(totalSeconds / tickInterval) + 1;

    for (let i = 0; i < tickCount; i++) {
      const seconds = i * tickInterval;
      if (seconds > totalSeconds + tickInterval) break;

      const x = seconds * pixelsPerSecond;
      const isMajor = i % majorMultiple === 0;
      const frame = Math.round(seconds * STUDIO_FPS);

      result.push({
        x,
        label: formatTimecode(frame),
        isMajor,
      });
    }
    return result;
  }, [totalSeconds, tickInterval, majorMultiple, pixelsPerSecond]);

  return (
    <div
      className="relative border-b border-[#262626] bg-[#161616] select-none cursor-pointer"
      style={{ height: RULER_HEIGHT }}
    >
      {ticks.map((tick, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{ left: tick.x }}
        >
          <div
            className={`w-px ${tick.isMajor ? 'h-3 bg-neutral-500' : 'h-2 bg-neutral-700'}`}
            style={{ marginTop: tick.isMajor ? 4 : 8 }}
          />
          {tick.isMajor && (
            <span className="absolute top-[16px] text-[9px] text-neutral-500 -translate-x-1/2 whitespace-nowrap font-mono">
              {tick.label}
            </span>
          )}
        </div>
      ))}

      {/* Total duration label at far right */}
      <div
        className="absolute top-1 text-[9px] text-neutral-600 font-mono"
        style={{ right: 4 }}
      >
        {formatTimecode(totalFrames)}
      </div>
    </div>
  );
};
