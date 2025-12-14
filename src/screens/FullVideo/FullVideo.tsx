import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { usePlanner } from "../../contexts/PlannerContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Loader2, CheckCircle, AlertCircle, Download, Calendar, Clock, RefreshCw } from "lucide-react";

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
  const [progressPercent, setProgressPercent] = useState(0);
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
    console.log('[FullVideo] ========== INIT ==========');
    console.log('[FullVideo] location.state:', location.state);
    console.log('[FullVideo] hasStartedCombine.current:', hasStartedCombine.current);
    
    // Try to get state from location.state first, then sessionStorage
    let state = location.state;
    if (!state) {
      console.log('[FullVideo] No location.state, trying sessionStorage...');
      const storedState = sessionStorage.getItem('fullVideoState');
      if (storedState) {
        try {
          state = JSON.parse(storedState);
          console.log('[FullVideo] Recovered state from sessionStorage');
        } catch (e) {
          console.log('[FullVideo] Failed to parse sessionStorage:', e);
        }
      }
    }
    
    if (!state) {
      console.log('[FullVideo] ERROR: No state available!');
      setCombineError('No video data received. Please go back and try again.');
      return;
    }
    
    if (hasStartedCombine.current) {
      console.log('[FullVideo] Already started combine, skipping...');
      return;
    }
    
    const segments = state?.segments || state?.selectedSegments || [];
    console.log('[FullVideo] Segments received:', segments.length);
    if (segments.length > 0) {
      console.log('[FullVideo] First segment:', JSON.stringify(segments[0], null, 2));
    }
    
    setVideoData(state);
    
    // Set title and description
    const defaultTitle = state?.topic || "Generated Video Content";
    const defaultDescription = segments.length > 0
      ? "This video contains " + segments.length + " carefully selected segments. " +
        "Total duration: " + segments.reduce((sum, seg) => sum + (seg.durationSeconds || 8), 0) + " seconds."
      : "AI-generated video content ready to be scheduled and published to your social media platforms.";
    
    setTitle(defaultTitle);
    setDescription(defaultDescription);
    
    // Check if already have final video URL
    if (state.finalVideoUrl) {
      console.log('[FullVideo] Already have finalVideoUrl:', state.finalVideoUrl);
      setFinalVideoUrl(state.finalVideoUrl);
    } else if (segments.length > 0) {
      // Check if segments have video URLs (support both videoUrl and video_url)
      const hasVideos = segments.every((s) => s.videoUrl || s.video_url);
      console.log('[FullVideo] Checking videos - hasVideos:', hasVideos);
      console.log('[FullVideo] Video URLs:', segments.map((s) => s.videoUrl || s.video_url || 'MISSING'));
      
      if (hasVideos) {
        // All segments have videos, trigger combine
        hasStartedCombine.current = true;
        console.log('[FullVideo] Starting combine process...');
        triggerCombineVideo(segments, state);
      } else {
        console.log('[FullVideo] Missing video URLs in segments');
        setCombineError('Some segments are missing video URLs. Please go back and generate videos first.');
      }
    } else {
      console.log('[FullVideo] No segments found');
      setCombineError('No video segments found. Please go back and create videos first.');
    }
  }, [location.state]);

  // Trigger combine video API (direct backend call)
  const triggerCombineVideo = async (segments, state) => {
    console.log('[FullVideo] ========== TRIGGER COMBINE ==========');
    console.log('[FullVideo] Backend URL:', BACKEND_URL);
    console.log('[FullVideo] Segments to combine:', segments.length);
    
    setIsCombining(true);
    setCombineError(null);
    setCombineProgress("Preparing video segments...");
    setProgressPercent(5);

    try {
      // Prepare segments data for backend
      const videoSegments = segments.map((seg, index) => ({
        type: seg.type || seg.element || "segment_" + (index + 1),
        video_url: seg.videoUrl || seg.video_url,
        duration_seconds: seg.durationSeconds || 8
      }));

      console.log('[FullVideo] Prepared videoSegments:', JSON.stringify(videoSegments, null, 2));
      
      // Check if all segments have video URLs
      const missingVideos = videoSegments.filter((s) => !s.video_url);
      if (missingVideos.length > 0) {
        console.log('[FullVideo] ERROR: Missing video URLs:', missingVideos);
        throw new Error(missingVideos.length + " segments are missing video URLs");
      }

      console.log('[FullVideo] All segments have video URLs');
      console.log('[FullVideo] Sending request to backend...');
      setCombineProgress("Connecting to video processor...");
      setProgressPercent(10);
      
      const requestBody = {
        project_id: state.sessionId || "project_" + Date.now(),
        segments: videoSegments,
        options: {
          bgm_url: state.selectedMusic?.audioUrl || state.selectedMusic?.url || null,
          bgm_volume: state.selectedMusic ? 0.15 : 0
        }
      };
      console.log('[FullVideo] Request body:', JSON.stringify(requestBody, null, 2));
      
      // Direct backend call (same as Loading.tsx)
      const response = await fetch(BACKEND_URL + "/api/combine-final-video", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BACKEND_API_KEY
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[FullVideo] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[FullVideo] ERROR response:', errorText);
        throw new Error("Backend error: " + response.status + " - " + errorText);
      }

      const data = await response.json();
      console.log('[FullVideo] Job created:', data);

      if (!data.success || !data.data?.job_id) {
        throw new Error("Failed to create job");
      }

      setJobId(data.data.job_id);
      setCombineProgress("Downloading video segments...");
      setProgressPercent(15);
      startPollingJobStatusDirect(data.data.job_id);

    } catch (err) {
      console.error('[FullVideo] Combine error:', err);
      setCombineError(err.message || "Failed to combine video");
      setIsCombining(false);
    }
  };



  // Poll job status directly from backend
  const startPollingJobStatusDirect = (jid) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (120 * 5s)
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      // Update progress based on attempts (15% -> 90%)
      const progressFromAttempts = Math.min(15 + (attempts * 1.5), 90);
      setProgressPercent(Math.round(progressFromAttempts));
      
      if (attempts > maxAttempts) {
        clearInterval(pollIntervalRef.current);
        setCombineError("Video processing timeout. Please try again.");
        setIsCombining(false);
        return;
      }

      await pollJobStatusDirect(jid, attempts);
    }, 5000);
  };

  const pollJobStatusDirect = async (jid, attempts = 0) => {
    try {
      const response = await fetch(BACKEND_URL + "/api/job-status/" + jid, {
        headers: { 'x-api-key': BACKEND_API_KEY }
      });
      
      if (!response.ok) {
        console.log('[FullVideo] Poll response not OK:', response.status);
        return; // Continue polling
      }

      const data = await response.json();
      const jobData = data?.data;
      console.log('[FullVideo] Job status:', jobData?.status, 'Progress:', jobData?.progress_percentage);

      // Update progress from backend if available
      if (jobData?.progress_percentage) {
        setProgressPercent(jobData.progress_percentage);
      }
      if (jobData?.current_step) {
        setCombineProgress(jobData.current_step);
      }

      if (jobData?.status === 'completed' && jobData?.final_video_url) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setProgressPercent(100);
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
      } else {
        // Update progress text based on status
        if (attempts < 5) {
          setCombineProgress("Downloading video segments...");
        } else if (attempts < 15) {
          setCombineProgress("Concatenating videos with FFmpeg...");
        } else if (attempts < 30) {
          setCombineProgress("Encoding final video...");
        } else {
          setCombineProgress("Finalizing... (this may take a while)");
        }
      }
    } catch (err) {
      console.error('[FullVideo] Direct poll error:', err);
    }
  };

  // Update planned_content with final video URL
  const updatePlannedContentWithVideo = async (videoUrl) => {
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

  const getPlatformIcon = (platformId) => {
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

  const togglePlatform = (platformId) => {
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
        thumbnail_url: videoData?.segments?.[0]?.imageUrl || videoData?.segments?.[0]?.image_url || videoData?.selectedSegments?.[0]?.imageUrl || getThumbnail(),
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
    const firstImage = segments[0]?.imageUrl || segments[0]?.image_url;
    return firstImage || "https://placehold.co/720x1280/1a1a24/7c3aed?text=Video+Preview";
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    {isCombining ? (
                      <div className="text-center px-6 max-w-xs">
                        {/* Circular Progress */}
                        <div className="relative w-24 h-24 mx-auto mb-6">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-white/20"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="url(#gradient)"
                              strokeWidth="6"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={progressPercent * 2.51 + " 251"}
                              className="transition-all duration-500"
                            />
                            <defs>
                              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#7c3aed" />
                                <stop offset="100%" stopColor="#ec4899" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">{progressPercent}%</span>
                          </div>
                        </div>
                        
                        <h3 className="text-white font-semibold text-lg mb-2">Combining Video</h3>
                        <p className="text-white/70 text-sm mb-4">{combineProgress}</p>
                        
                        {/* Linear Progress Bar */}
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-full transition-all duration-500"
                            style={{ width: progressPercent + "%" }}
                          />
                        </div>
                        <p className="text-white/50 text-xs mt-3">Please wait, this may take a minute...</p>
                      </div>
                    ) : combineError ? (
                      <div className="text-center px-6">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <p className="text-white font-semibold text-lg mb-2">Processing Failed</p>
                        <p className="text-red-400 text-sm text-center px-4 mb-6 max-w-xs">{combineError}</p>
                        <Button
                          onClick={handleRetryCombine}
                          className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-8"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40 mb-4 mx-auto">
                          <svg className="w-10 h-10 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <p className="text-white/60 text-sm">Waiting for video segments...</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Download Button */}
            {finalVideoUrl && (
              <a
                href={finalVideoUrl}
                download={(title || 'video') + ".mp4"}
                className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Video
              </a>
            )}
            
            {/* Processing Status */}
            {isCombining && (
              <div className="mt-4 bg-gradient-to-r from-[#7c3aed]/20 to-[#ec4899]/20 border border-[#7c3aed]/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#7c3aed]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">{combineProgress}</span>
                  </div>
                  <span className="text-white font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-full transition-all duration-500"
                    style={{ width: progressPercent + "%" }}
                  />
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
                    className={"relative w-14 h-7 rounded-full transition-colors " + (publishToPublic ? "bg-[#7c3aed]" : "bg-[#4e5562]")}
                  >
                    <div
                      className={"absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform " + (publishToPublic ? "translate-x-7" : "translate-x-0")}
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
                        className={"w-10 h-10 rounded-lg flex items-center justify-center transition-all " + (selectedPlatforms.includes(platform.id)
                          ? "bg-[#7c3aed] text-white border-2 border-[#7c3aed]"
                          : "bg-[#2b2b38] text-white/60 border-2 border-[#2b2b38] hover:border-[#7c3aed]/50 hover:text-white/80")}
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
