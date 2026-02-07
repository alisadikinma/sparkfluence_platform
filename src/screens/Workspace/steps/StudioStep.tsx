import React, { useState } from 'react';
import { ArrowLeft, Download, Play, Pause, Film, Music, Volume2, Layers } from 'lucide-react';

interface StudioStepShellProps {
  children?: React.ReactNode;
  onPrevStep?: () => void;
  onExport?: () => void;
}

const MOCK_TIMELINE_SEGMENTS = [
  { id: '1', type: 'HOOK', duration: 8, color: 'bg-emerald-500/30' },
  { id: '2', type: 'FORE', duration: 10, color: 'bg-amber-500/30' },
  { id: '3', type: 'BODY-1', duration: 10, color: 'bg-amber-500/30' },
  { id: '4', type: 'BODY-2', duration: 10, color: 'bg-amber-500/30' },
  { id: '5', type: 'PEAK', duration: 10, color: 'bg-emerald-500/30' },
  { id: '6', type: 'CTA', duration: 10, color: 'bg-cyan-500/30' },
  { id: '7', type: 'LOOP-END', duration: 5, color: 'bg-gray-500/30' },
];

const TIME_MARKERS = ['0:00', '0:08', '0:18', '0:28', '0:38', '0:48', '0:58', '1:00'];
const TIMELINE_TRACKS = [
  { id: 'video', label: 'Video', icon: Layers },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'music', label: 'Music', icon: Music },
];

export const StudioStep: React.FC<StudioStepShellProps> = ({
  children,
  onPrevStep = () => {},
  onExport = () => {},
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const totalDuration = MOCK_TIMELINE_SEGMENTS.reduce((sum, seg) => sum + seg.duration, 0);

  return (
    <div className="flex flex-col h-full bg-[#0B0E14]">
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8 min-h-0">
        <div className="relative w-full max-w-[360px] aspect-[9/16] max-h-[60vh]">
          {children ? (
            // Render the actual Remotion Player when provided
            <div className="w-full h-full bg-black rounded-2xl ring-1 ring-white/10 overflow-hidden">
              {children}
            </div>
          ) : (
            // Placeholder when no children
            <div className="w-full h-full bg-black rounded-2xl ring-1 ring-white/10 border-2 border-dashed border-[#262626] flex flex-col items-center justify-center gap-4 p-6">
              <Film className="w-16 h-16 text-[#78716C]" />
              <p className="text-[#A8A29E] text-sm text-center">
                Timeline editor will load here
              </p>
            </div>
          )}

          {/* Play/Pause Overlay Button */}
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all group-hover:bg-white/20 group-hover:scale-110">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white fill-white" />
              ) : (
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Timeline Placeholder */}
      <div className="bg-[#161616] border-t border-[#262626] p-6 space-y-4">
        {/* Time Ruler */}
        <div className="relative h-6 border-b border-[#262626]">
          <div className="absolute inset-x-0 top-0 flex justify-between text-xs text-[#78716C] px-20">
            {TIME_MARKERS.map((time, idx) => (
              <span key={idx}>{time}</span>
            ))}
          </div>
        </div>

        {/* Timeline Tracks */}
        <div className="space-y-3">
          {TIMELINE_TRACKS.map((track) => {
            const TrackIcon = track.icon;
            return (
              <div key={track.id} className="flex items-start gap-4">
                {/* Track Label */}
                <div className="w-16 flex items-center gap-2 text-[#A8A29E] text-sm pt-2">
                  <TrackIcon className="w-4 h-4" />
                  <span>{track.label}</span>
                </div>

                {/* Track Content */}
                <div className="flex-1 relative h-12 bg-[#1E1E1E] rounded-lg border border-[#262626]">
                  {track.id === 'video' && (
                    <div className="absolute inset-0 flex items-center px-2 gap-1">
                      {MOCK_TIMELINE_SEGMENTS.map((segment, idx) => {
                        const widthPercentage = (segment.duration / totalDuration) * 100;
                        return (
                          <div
                            key={segment.id}
                            className={`h-10 rounded ${segment.color} border border-white/10 flex items-center justify-center text-xs font-medium text-white/90 px-2`}
                            style={{ width: `${widthPercentage}%` }}
                          >
                            {segment.type}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead Marker */}
        <div className="relative h-0">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 shadow-lg shadow-emerald-500/50 z-10"
            style={{ left: '30%', height: '180px', marginTop: '-180px' }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
              <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="bg-[#161616] border-t border-[#262626] px-6 py-4 flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={onPrevStep}
          className="flex items-center gap-2 px-4 py-2 text-[#A8A29E] hover:text-[#FAFAF9] transition-colors rounded-lg hover:bg-[#1E1E1E]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Video</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-emerald-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Export Video</span>
        </button>
      </div>
    </div>
  );
};

export default StudioStep;
