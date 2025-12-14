import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { usePlanner } from "../../contexts/PlannerContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Loader2, CheckCircle, AlertCircle, Download, Calendar, Clock } from "lucide-react";

// Backend API URL - adjust based on environment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://sparkfluence-api.alisadikinma.com';
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY || 'sparkfluence_prod_key_2024';

export const FullVideo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addPlannedContent } = usePlanner();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishDate, setPublishDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [publishTime, setPublishTime] = useState("18:00");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishToPublic, setPublishToPublic] = useState(false);
  
  // Combine video states
  const [isCombining, setIsCombining] = useState(false);
  const [combineError, setCombineError] = useState<string | null>(null);
  const [combineProgress, setCombineProgress] = useState<string>("Initializing...");
  const [jobId, setJobId] = useState<string | null>(null);
  
  const hasStartedCombine = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Initialize and trigger combine video
  useEffect(() => {
    if (location.state && !hasStartedCombine.current) {
      const state = location.state;
      setVideoData(state);
      
      // Set title and description
      const defaultTitle = state?.topic || "Generated Video Content";
      const segments = state?.segments || state?.selectedSegments || [];
      const defaultDescription = segments.length > 0
        ? `This video contains ${segments.length} carefully selected segments. ` +
          `Total duration: ${segments.reduce((sum: number, seg: any) => sum + (seg.durationSeconds || 8), 0)} seconds.`
        : "AI-generated video content ready to be scheduled and published to your social media platforms.";
      
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      
      // Check if already have final video URL
      if (state.finalVideoUrl) {
        setFinalVideoUrl(state.finalVideoUrl);
      } else if (segments.length > 0 && segments.every((s: any) => s.videoUrl)) {
        // All segments have videos, trigger combine
        hasStartedCombine.current = true;
        triggerCombineVideo(segments, state);
      }
    }
  }, [location.state]);

  // Trigger combine video API (direct backend call)
  const triggerCombineVideo = async (segments: any[], state: any) => {
    setIsCombining(true);
    setCombineError(null);
    setCombineProgress("Preparing video segments...");

    try {
      // Prepare segments data for backend
      const videoSegments = segments.map((seg: any, index: number) => ({
        type: seg.type || seg.element || `segment_${index + 1}`,
        video_url: seg.videoUrl || seg.video_url,
        duration_seconds: seg.durationSeconds || 8
      }));

      // Check if all segments have video URLs
      const missingVideos = videoSegments.filter((s: any) => !s.video_url);
      if (missingVideos.length > 0) {
        throw new Error(`${missingVideos.length} segments are missing video URLs`);
      }

      console.log('[FullVideo] Triggering combine with segments:', videoSegments.length);
      setCombineProgress("Connecting to video processor...");
      
      // Direct backend call (same as Loading.tsx)
      const response = await fetch(`${BACKEND_URL}/api/combine-final-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BACKEND_API_KEY
        },
        body: JSON.stringify({
          project_id: state.sessionId || `project_${Date.now()}`,
          segments: videoSegments,
          options: {
            bgm_url: state.selectedMusic?.audioUrl || state.selectedMusic?.url || null,
            bgm_volume: state.selectedMusic ? 0.15 : 0
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[FullVideo] Job created:', data);

      if (!data.success || !data.data?.job_id) {
        throw new Error("Failed to create job");
      }

      setJobId(data.data.job_id);
      setCombineProgress("Processing video...");
      startPollingJobStatusDirect(data.data.job_id);

    } catch (err: any) {
      console.error('[FullVideo] Combine error:', err);
      setCombineError(err.message || "Failed to combine video");
      setIsCombining(false);
    }
  };



  // Poll job status directly from backend
  const startPollingJobStatusDirect = (jid: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(pollIntervalRef.current!);
        setCombineError("Video processing timeout. Please try again.");
        setIsCombining(false);
        return;
      }

      await pollJobStatusDirect(jid);
    }, 5000);
  };

  const pollJobStatusDirect = async (jid: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/job-status/${jid}`, {
        headers: { 'x-api-key': BACKEND_API_KEY }
      });
      
      if (!response.ok) {
        return; // Continue polling
      }

      const data = await response.json();
      const jobData = data?.data;

      if (jobData?.status === 'completed' && jobData?.final_video_url) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setFinalVideoUrl(jobData.final_video_url);
        setIsCombining(false);
        setCombineProgress("Complete!");
        
        if (videoData?.sessionId) {
          await updatePlannedContentWithVideo(jobData.final_video_url);
        }
      } else if (jobData?.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setCombineError(jobData?.error_message || "Video processing failed");
        setIsCombining(false);
      }
    } catch (err) {
      console.error('[FullVideo] Direct poll error:', err);
    }
  };

  // Update planned_content with final video URL
  const updatePlannedContentWithVideo = async (videoUrl: string) => {
    if (!user || !videoData?.sessionId) return;
    
    try {
      const { error } = await supabase
        .from('planned_content')
        .update({ final_video_url: videoUrl })
        .eq('user_id', user.id)
        .contains('video_data', { sessionId: videoData.sessionId });
      
      if (error) {
        console.error('[FullVideo] Failed to update planned_content:', error);
      }
    } catch (err) {
      console.error('[FullVideo] Update error:', err);
    }
  };

  // Retry combine
  const handleRetryCombine = () => {
    hasStartedCombine.current = false;
    setCombineError(null);
    setIsCombining(false);
    
    const segments = videoData?.segments || videoData?.selectedSegments || [];
    if (segments.length > 0) {
      hasStartedCombine.current = true;
      triggerCombineVideo(segments, videoData);
    }
  };

  const platforms = [
    { id: "tiktok", name: "TikTok" },
    { id: "youtube", name: "YouTube" },
    { id: "instagram", name: "Instagram" },
  ];

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case "tiktok":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        );
      case "youtube":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePlanContent = async () => {
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }

    if (!publishDate || !publishTime) {
      alert("Please select a date and time");
      return;
    }

    if (!title || title.trim() === "") {
      alert("Please enter a title for your video");
      return;
    }

    setLoading(true);

    try {
      const result = await addPlannedContent({
        title: title,
        description: description,
        content_type: "video",
        platforms: selectedPlatforms,
        scheduled_date: publishDate,
        scheduled_time: publishTime,
        status: "scheduled",
        thumbnail_url: videoData?.segments?.[0]?.imageUrl || videoData?.selectedSegments?.[0]?.imageUrl || "/rectangle-11.png",
        video_data: {
          ...videoData,
          sessionId: videoData?.sessionId || null,
        },
        final_video_url: finalVideoUrl,
        is_public: publishToPublic,
      });

      if (result) {
        alert("Content scheduled successfully!");
        navigate("/planner", {
          state: {
            highlightDate: publishDate,
            highlightTime: publishTime,
          }
        });
      } else {
        alert("Failed to schedule content. Please try again.");
      }
    } catch (error) {
      console.error("Error scheduling content:", error);
      alert("Failed to schedule content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get thumbnail from segments
  const getThumbnail = () => {
    const segments = videoData?.segments || videoData?.selectedSegments || [];
    return segments[0]?.imageUrl || "/rectangle-11.png";
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="flex gap-2 mb-8 max-w-md mx-auto">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className="h-1 flex-1 rounded-full bg-[#7c3aed]"
            />
          ))}
        </div>
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Final Video Preview</h1>
          <div className="w-24"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6">
          {/* Video Preview Section */}
          <div className="bg-[#1a1a24] border-2 border-[#7c3aed] rounded-2xl p-4 h-fit">
            <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden mb-4 bg-black">
              {finalVideoUrl ? (
                <video
                  src={finalVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={getThumbnail()}
                />
              ) : (
                <>
                  <img
                    src={getThumbnail()}
                    alt="Video preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
                  
                  {/* Processing Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {isCombining ? (
                      <>
                        <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin mb-4" />
                        <p className="text-white font-medium mb-2">Combining Video...</p>
                        <p className="text-white/60 text-sm">{combineProgress}</p>
                      </>
                    ) : combineError ? (
                      <>
                        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                        <p className="text-white font-medium mb-2">Processing Failed</p>
                        <p className="text-red-400 text-sm text-center px-4 mb-4">{combineError}</p>
                        <Button
                          onClick={handleRetryCombine}
                          className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                        >
                          Retry
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40 mb-4">
                          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <p className="text-white/60 text-sm">Waiting for video segments...</p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Download Button */}
            {finalVideoUrl && (
              <a
                href={finalVideoUrl}
                download={`${title || 'video'}.mp4`}
                className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Video
              </a>
            )}
            
            {/* Processing Status */}
            {isCombining && (
              <div className="mt-4 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-[#7c3aed] text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{combineProgress}</span>
                </div>
              </div>
            )}
            
            {finalVideoUrl && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Video ready!</span>
                </div>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="bg-[#1a1a24]/50 border border-[#2b2b38] rounded-2xl p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-white/60 text-sm mb-2 font-medium">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-[#7c3aed] transition-colors placeholder:text-white/40"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter video description"
                  rows={4}
                  className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-3 text-white text-sm leading-relaxed focus:outline-none focus:border-[#7c3aed] transition-colors resize-none placeholder:text-white/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between p-4 bg-[#2b2b38] rounded-lg">
                  <div>
                    <label className="text-white font-medium block mb-1">Publish to Public</label>
                    <p className="text-white/60 text-xs">Make this video visible to everyone</p>
                  </div>
                  <button
                    onClick={() => setPublishToPublic(!publishToPublic)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      publishToPublic ? "bg-[#7c3aed]" : "bg-[#4e5562]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        publishToPublic ? "translate-x-7" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/60 text-sm mb-3 font-medium">Platform</label>
                  <div className="flex gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          selectedPlatforms.includes(platform.id)
                            ? "bg-[#7c3aed] text-white border-2 border-[#7c3aed]"
                            : "bg-[#2b2b38] text-white/60 border-2 border-[#2b2b38] hover:border-[#7c3aed]/50 hover:text-white/80"
                        }`}
                      >
                        {getPlatformIcon(platform.id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-3 font-medium">Publish Date & Time</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="date"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="time"
                        value={publishTime}
                        onChange={(e) => setPublishTime(e.target.value)}
                        className="w-full bg-[#2b2b38] border border-[#2b2b38] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#7c3aed] transition-colors"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Clock className="w-5 h-5 text-[#7c3aed]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2b2b38]">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handlePlanContent}
                    disabled={loading || isCombining}
                    className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white hover:from-[#6d28d9] hover:to-[#db2777] h-12 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Calendar className="w-5 h-5" />
                    {loading ? "Planning..." : "Plan"}
                  </Button>
                  <Button
                    onClick={() => navigate("/history")}
                    disabled={loading}
                    className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] h-12 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="w-5 h-5" />
                    History
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
