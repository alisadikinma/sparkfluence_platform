import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { Play, Download, ChevronLeft, Calendar, Clock, Share2 } from "lucide-react";

interface Segment {
  id: string;
  type: string;
  script: string;
  imageUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number;
}

interface LocationState {
  sessionId?: string;
  topic?: string;
  segments?: Segment[];
  finalVideoUrl?: string;
  fromHistory?: boolean;
}

export const FullVideoPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [activeSegment, setActiveSegment] = useState(0);

  const topic = state?.topic || "Untitled Video";
  const segments = state?.segments || [];
  const finalVideoUrl = state?.finalVideoUrl;
  const fromHistory = state?.fromHistory || false;

  // Calculate total duration
  const totalDuration = segments.reduce((acc, seg) => acc + (seg.durationSeconds || 8), 0);

  const handleBack = () => {
    if (fromHistory) {
      navigate("/history");
    } else {
      navigate("/full-video");
    }
  };

  const handleDownload = async () => {
    if (finalVideoUrl) {
      const link = document.createElement('a');
      link.href = finalVideoUrl;
      link.download = `${topic.replace(/\s+/g, '_')}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSchedule = () => {
    navigate("/planner", {
      state: {
        sessionId: state?.sessionId,
        topic: topic,
        segments: segments,
        finalVideoUrl: finalVideoUrl
      }
    });
  };

  // If no data, show placeholder
  if (!state || segments.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a12] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="text-center py-20">
            <p className="text-white/60 mb-4">No video data available</p>
            <Button
              onClick={() => navigate("/history")}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
            >
              Go to History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-white text-center flex-1 mx-4 truncate">
            {topic}
          </h1>
          <div className="w-24"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6">
          {/* Video Preview */}
          <div className="bg-[#1a1a24] border-2 border-[#7c3aed] rounded-2xl p-4 h-fit">
            <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden mb-4 bg-black">
              {finalVideoUrl ? (
                <video
                  src={finalVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={segments[0]?.imageUrl || undefined}
                />
              ) : segments[activeSegment]?.videoUrl ? (
                <video
                  src={segments[activeSegment].videoUrl!}
                  controls
                  className="w-full h-full object-contain"
                  poster={segments[activeSegment]?.imageUrl || undefined}
                />
              ) : segments[activeSegment]?.imageUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={segments[activeSegment].imageUrl}
                    alt={segments[activeSegment].type}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white/60 text-sm">Video segment not available</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/40" />
                </div>
              )}
            </div>

            {/* Segment Thumbnails */}
            {!finalVideoUrl && segments.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {segments.map((seg, idx) => (
                  <button
                    key={seg.id}
                    onClick={() => setActiveSegment(idx)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      activeSegment === idx
                        ? 'border-[#7c3aed]'
                        : 'border-transparent hover:border-white/30'
                    }`}
                  >
                    {seg.imageUrl ? (
                      <img
                        src={seg.imageUrl}
                        alt={seg.type}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2a2a38] flex items-center justify-center">
                        <Play className="w-4 h-4 text-white/40" />
                      </div>
                    )}
                    {seg.videoUrl && (
                      <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Video Info & Actions */}
          <div className="bg-[#1a1a24]/50 border border-[#2b2b38] rounded-2xl p-6">
            <div className="space-y-6">
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">{topic}</h2>
                <div className="flex items-center gap-4 text-white/60 text-sm mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {totalDuration}s total
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="w-4 h-4" />
                    {segments.length} segments
                  </span>
                </div>
              </div>

              {/* Script Preview */}
              <div className="bg-[#0a0a12] rounded-xl p-4 max-h-[200px] overflow-y-auto">
                <h3 className="text-white/60 text-sm mb-2">Script</h3>
                <div className="space-y-3">
                  {segments.map((seg, idx) => (
                    <div key={seg.id} className="text-sm">
                      <span className="text-[#7c3aed] font-medium">{seg.type}: </span>
                      <span className="text-white/80">{seg.script}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {finalVideoUrl ? (
                  <>
                    <Button
                      onClick={handleDownload}
                      className="w-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white hover:from-[#6d28d9] hover:to-[#db2777] h-12 font-bold flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </Button>
                    <Button
                      onClick={handleSchedule}
                      variant="secondary"
                      className="w-full bg-white/10 text-white hover:bg-white/20 h-12 font-medium flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-5 h-5" />
                      Schedule to Planner
                    </Button>
                  </>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <p className="text-amber-400 text-sm mb-3">
                      Final video not generated yet. Go back to combine all segments.
                    </p>
                    <Button
                      onClick={() => navigate("/full-video", {
                        state: {
                          sessionId: state?.sessionId,
                          topic: topic,
                          segments: segments
                        }
                      })}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Combine Video
                    </Button>
                  </div>
                )}
              </div>

              {/* Info Notice */}
              <div className="bg-[#2a2a38]/50 border border-[#3a3a48] rounded-xl p-4">
                <div className="flex items-center gap-3 text-white/60 text-sm">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>
                    {finalVideoUrl 
                      ? "Your video is ready! Download or schedule it for publishing."
                      : "Preview your video segments. Combine them to create the final video."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
