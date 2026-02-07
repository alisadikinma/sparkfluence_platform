import React from 'react';
import {
  Plane,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Video,
} from 'lucide-react';

// Types
interface PreFlightItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'pending';
  detail: string;
}

interface VideoSegment {
  id: string;
  segmentNumber: number;
  segmentType: string;
  hasVideo: boolean;
  progress: number;
}

interface VideoStepShellProps {
  segmentCount?: number;
  videosGenerated?: number;
  onGenerateAll?: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
  preFlightItems?: PreFlightItem[];
  allPreFlightPassed?: boolean;
  children?: React.ReactNode;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  canNext?: boolean;
}

// Mock data
const MOCK_PREFLIGHT: PreFlightItem[] = [
  { id: 'hook', label: 'Hook', status: 'pass', detail: 'Strong' },
  { id: 'pacing', label: 'Pacing', status: 'pass', detail: 'Fast' },
  { id: 'cta', label: 'CTA', status: 'pass', detail: 'Included' },
  { id: 'images', label: 'Images', status: 'pass', detail: '7/7' },
  { id: 'duration', label: 'Duration', status: 'pass', detail: '60s' },
  { id: 'script', label: 'Script', status: 'pass', detail: 'Confirmed' },
];

const MOCK_VIDEO_SEGMENTS: VideoSegment[] = [
  { id: '1', segmentNumber: 1, segmentType: 'HOOK', hasVideo: true, progress: 100 },
  { id: '2', segmentNumber: 2, segmentType: 'FORE', hasVideo: true, progress: 100 },
  { id: '3', segmentNumber: 3, segmentType: 'BODY-1', hasVideo: false, progress: 65 },
  { id: '4', segmentNumber: 4, segmentType: 'BODY-2', hasVideo: false, progress: 0 },
  { id: '5', segmentNumber: 5, segmentType: 'PEAK', hasVideo: false, progress: 0 },
  { id: '6', segmentNumber: 6, segmentType: 'CTA', hasVideo: false, progress: 0 },
  { id: '7', segmentNumber: 7, segmentType: 'LOOP-END', hasVideo: false, progress: 0 },
];

// Pre-Flight Badge Component
const PreFlightBadge: React.FC<{ item: PreFlightItem }> = ({ item }) => {
  const getStatusStyles = () => {
    switch (item.status) {
      case 'pass':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'warn':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'fail':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending':
        return 'bg-[#262626] text-[#57534E] border-[#262626]';
      default:
        return 'bg-[#262626] text-[#57534E] border-[#262626]';
    }
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case 'pass':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'warn':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'fail':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}
    >
      {getStatusIcon()}
      <span className="font-semibold">{item.label}:</span>
      <span>{item.detail}</span>
    </div>
  );
};

// Video Segment Card Component
const VideoSegmentCard: React.FC<{ segment: VideoSegment }> = ({ segment }) => {
  return (
    <div className="bg-[#161616] rounded-xl border border-[#262626] overflow-hidden group hover:border-emerald-500/30 transition-colors">
      {/* 9:16 Aspect Ratio Container */}
      <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
        {/* Content positioned absolutely */}
        <div className="absolute inset-0 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-[#262626]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A8A29E]">
                Segment {segment.segmentNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {segment.segmentType}
              </span>
            </div>
          </div>

          {/* Video Preview Area */}
          <div className="flex-1 relative bg-gradient-to-br from-[#1E1E1E] via-[#161616] to-[#0B0E14] flex items-center justify-center">
            {segment.hasVideo ? (
              <>
                {/* Play Button Overlay */}
                <button className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all transform hover:scale-105 group-hover:shadow-emerald-500/40">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </button>
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Video className="w-10 h-10 text-[#57534E]" />
                <span className="text-xs text-[#78716C]">
                  {segment.progress > 0 ? 'Generating...' : 'Not generated'}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {segment.progress > 0 && (
            <div className="h-1 bg-[#262626]">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${segment.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
const VideoStep: React.FC<VideoStepShellProps> = ({
  segmentCount = 7,
  videosGenerated = 2,
  onGenerateAll,
  isGenerating = false,
  canGenerate = true,
  preFlightItems = MOCK_PREFLIGHT,
  allPreFlightPassed = true,
  children,
  onPrevStep,
  onNextStep,
  canNext = false,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[#FAFAF9]">Video Generation</h2>
          <span className="px-3 py-1 rounded-full bg-[#161616] border border-[#262626] text-sm font-medium text-[#A8A29E]">
            {videosGenerated}/{segmentCount} done
          </span>
        </div>

        <button
          onClick={onGenerateAll}
          disabled={!canGenerate || !allPreFlightPassed || isGenerating}
          className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#262626] disabled:text-[#57534E] disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:shadow-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              Generate All
            </>
          )}
        </button>
      </div>

      {/* Pre-Flight Checklist Banner */}
      <div className="bg-[#161616] rounded-xl border border-[#262626] p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Plane className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#FAFAF9] mb-3">
              Ready to Generate?
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {preFlightItems.map((item) => (
                <PreFlightBadge key={item.id} item={item} />
              ))}
            </div>
            {allPreFlightPassed && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                  All checks passed!
                </span>
              </div>
            )}
            {!allPreFlightPassed && (
              <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Please resolve issues before generating videos</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Skeleton Video Preview (when generating) */}
        {isGenerating && (
          <div className="mb-6 bg-[#161616] rounded-xl border border-[#262626] p-6">
            <div className="flex flex-col items-center gap-4">
              {/* 9:16 Preview Container */}
              <div
                className="relative bg-gradient-to-br from-[#1E1E1E] via-emerald-500/5 to-[#0B0E14] rounded-lg overflow-hidden border border-emerald-500/20"
                style={{ width: '280px', height: '497px' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#A8A29E]">
                      Storyboard Preview
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Info */}
              <div className="w-full max-w-md">
                <p className="text-sm font-medium text-[#FAFAF9] mb-2 text-center">
                  Currently generating: Segment 3 of {segmentCount}
                </p>
                <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: '43%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Segment Cards Grid */}
        {children || (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-6">
            {MOCK_VIDEO_SEGMENTS.map((segment) => (
              <VideoSegmentCard key={segment.id} segment={segment} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-[#262626] mt-6">
        <button
          onClick={onPrevStep}
          className="px-5 py-2.5 rounded-lg bg-[#161616] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#404040] text-[#FAFAF9] font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Images
        </button>

        <button
          onClick={onNextStep}
          disabled={!canNext}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#262626] disabled:text-[#57534E] disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:shadow-none"
        >
          Continue to Studio
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VideoStep;
export type { VideoStepShellProps, PreFlightItem };
