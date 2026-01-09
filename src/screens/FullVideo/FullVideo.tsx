import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { usePlanner } from "../../contexts/PlannerContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Loader2, CheckCircle, AlertCircle, Download, Calendar, Clock, RefreshCw, Captions, CaptionsOff, X, Play, Link2, ExternalLink } from "lucide-react";

// Backend API URL - adjust based on environment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://sparkfluence-api.alisadikinma.com';
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY || 'sparkfluence_prod_key_2024';

// V2 Options defaults
const DEFAULT_COMBINE_OPTIONS = {
  enable_transitions: true,
  transition_duration: 0.5,
  enable_subtitles: false,
  subtitle_style: 'tiktok',
  word_by_word: true,
  normalize_audio: true
};

// Cache key for storing combined video results
const getCacheKey = (sessionId: string) => `sparkfluence_combined_${sessionId}`;

// Platform configuration
const PLATFORM_CONFIG = {
  youtube: { name: "YouTube", implemented: true },
  instagram: { name: "Instagram", implemented: false },
  tiktok: { name: "TikTok", implemented: false },
};

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
  
  // Linked accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<string[]>([]);
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);
  const [warningPlatform, setWarningPlatform] = useState<string | null>(null);
  
  // Combine video states
  const [isCombining, setIsCombining] = useState(false);
  const [combineError, setCombineError] = useState<string | null>(null);
  const [combineProgress, setCombineProgress] = useState<string>("Initializing...");
  const [progressPercent, setProgressPercent] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showCombinePrompt, setShowCombinePrompt] = useState(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Subtitle states
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  const [isAddingSubtitles, setIsAddingSubtitles] = useState(false);
  const [subtitleProgress, setSubtitleProgress] = useState<string>("Initializing...");
  const [subtitlePercent, setSubtitlePercent] = useState(0);
  const [subtitleJobId, setSubtitleJobId] = useState<string | null>(null);
  const [videoWithoutSubtitle, setVideoWithoutSubtitle] = useState<string | null>(null);
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const subtitlePollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch linked accounts
  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("linked_accounts")
          .select("platform")
          .eq("user_id", user.id);
        
        if (error) throw error;
        
        if (data) {
          const platforms = data.map(acc => acc.platform);
          setLinkedAccounts(platforms);
          console.log('[FullVideo] Linked accounts:', platforms);
        }
      } catch (err) {
        console.error('[FullVideo] Error fetching linked accounts:', err);
      }
    };
    
    fetchLinkedAccounts();
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (subtitlePollRef.current) {
        clearInterval(subtitlePollRef.current);
      }
    };
  }, []);

  // Initialize - check cache first, don't auto-combine
  useEffect(() => {
    console.log('[FullVideo] ========== INIT ==========');
    
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
    
    const segments = state?.segments || state?.selectedSegments || [];
    const sessionId = state?.sessionId || state?.projectId;
    
    console.log('[FullVideo] SessionId:', sessionId);
    console.log('[FullVideo] Segments received:', segments.length);
    
    setVideoData(state);
    
    // Set title and description
    const defaultTitle = state?.topic || "Generated Video Content";
    const defaultDescription = segments.length > 0
      ? "This video contains " + segments.length + " carefully selected segments. " +
        "Total duration: " + segments.reduce((sum: number, seg: any) => sum + (seg.durationSeconds || 8), 0) + " seconds."
      : "AI-generated video content ready to be scheduled and published to your social media platforms.";
    
    setTitle(defaultTitle);
    setDescription(defaultDescription);
    
    // Check if already have final video URL from state
    if (state.finalVideoUrl) {
      console.log('[FullVideo] Already have finalVideoUrl from state:', state.finalVideoUrl);
      setFinalVideoUrl(state.finalVideoUrl);
      return;
    }
    
    // Check cache for previously combined video
    if (sessionId) {
      const cacheKey = getCacheKey(sessionId);
      const cachedResult = sessionStorage.getItem(cacheKey);
      if (cachedResult) {
        try {
          const cached = JSON.parse(cachedResult);
          if (cached.finalVideoUrl) {
            console.log('[FullVideo] Found cached video:', cached.finalVideoUrl);
            setFinalVideoUrl(cached.finalVideoUrl);
            if (cached.hasSubtitles) {
              setHasSubtitles(true);
            }
            if (cached.videoWithoutSubtitle) {
              setVideoWithoutSubtitle(cached.videoWithoutSubtitle);
            }
            return;
          }
        } catch (e) {
          console.log('[FullVideo] Failed to parse cache:', e);
        }
      }
    }
    
    // No cached result - show combine prompt instead of auto-combining
    if (segments.length > 0) {
      const hasVideos = segments.every((s: any) => s.videoUrl || s.video_url);
      if (hasVideos) {
        console.log('[FullVideo] Segments ready - showing combine prompt');
        setShowCombinePrompt(true);
      } else {
        console.log('[FullVideo] Missing video URLs in segments');
        setCombineError('Some segments are missing video URLs. Please go back and generate videos first.');
      }
    } else {
      console.log('[FullVideo] No segments found');
      setCombineError('No video segments found. Please go back and create videos first.');
    }
  }, [location.state]);

  // Save to cache when video is ready
  const saveToCache = (url: string, withSubtitles: boolean = false, originalUrl: string | null = null) => {
    const sessionId = videoData?.sessionId || videoData?.projectId;
    if (sessionId) {
      const cacheKey = getCacheKey(sessionId);
      sessionStorage.setItem(cacheKey, JSON.stringify({
        finalVideoUrl: url,
        hasSubtitles: withSubtitles,
        videoWithoutSubtitle: originalUrl,
        timestamp: Date.now()
      }));
      console.log('[FullVideo] Saved to cache');
    }
  };

  // Start combine video process
  const handleStartCombine = () => {
    setShowCombinePrompt(false);
    const segments = videoData?.segments || videoData?.selectedSegments || [];
    if (segments.length > 0) {
      triggerCombineVideo(segments, videoData);
    }
  };

  // Trigger combine video API (V2 with transitions + subtitles)
  const triggerCombineVideo = async (segments: any[], state: any) => {
    console.log('[FullVideo] ========== TRIGGER COMBINE V2 ==========');
    console.log('[FullVideo] Backend URL:', BACKEND_URL);
    console.log('[FullVideo] Segments to combine:', segments.length);
    
    setIsCombining(true);
    setCombineError(null);
    setCombineProgress("Preparing video segments...");
    setProgressPercent(5);

    try {
      // Prepare segments data for V2 backend
      const videoSegments = segments.map((seg: any, index: number) => ({
        segment_id: seg.id || seg.segmentId || `seg_${index}`,
        segment_number: index + 1,
        segment_type: seg.type || seg.element || "BODY",
        video_url: seg.videoUrl || seg.video_url,
        duration_seconds: seg.durationSeconds || seg.duration_seconds || 8,
        script_text: seg.script || seg.scriptText || seg.script_text || seg.text || null,
        emotion: seg.emotion || "neutral"
      }));

      console.log('[FullVideo] Prepared videoSegments (V2):', JSON.stringify(videoSegments, null, 2));
      
      // Check if all segments have video URLs
      const missingVideos = videoSegments.filter((s) => !s.video_url);
      if (missingVideos.length > 0) {
        console.log('[FullVideo] ERROR: Missing video URLs:', missingVideos);
        throw new Error(missingVideos.length + " segments are missing video URLs");
      }

      console.log('[FullVideo] All segments have video URLs');
      console.log('[FullVideo] Sending request to backend V2...');
      setCombineProgress("Connecting to video processor...");
      setProgressPercent(10);
      
      const requestBody = {
        project_id: state.projectId || state.sessionId || "project_" + Date.now(),
        session_id: state.sessionId || "session_" + Date.now(),
        segments: videoSegments,
        options: DEFAULT_COMBINE_OPTIONS
      };
      console.log('[FullVideo] Request body (V2):', JSON.stringify(requestBody, null, 2));
      
      // V2 endpoint with transitions + subtitles
      const response = await fetch(BACKEND_URL + "/api/combine-final-video-v2", {
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
      console.log('[FullVideo] Job created (V2):', data);

      if (!data.success || !data.data?.job_id) {
        throw new Error("Failed to create job");
      }

      // Log enabled features
      if (data.data?.features) {
        console.log('[FullVideo] V2 Features enabled:', data.data.features);
      }

      setJobId(data.data.job_id);
      setCombineProgress("Downloading video segments...");
      setProgressPercent(15);
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
    const maxAttempts = 120; // 10 minutes max (120 * 5s)
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      // Update progress based on attempts (15% -> 90%)
      const progressFromAttempts = Math.min(15 + (attempts * 1.5), 90);
      setProgressPercent(Math.round(progressFromAttempts));
      
      if (attempts > maxAttempts) {
        clearInterval(pollIntervalRef.current!);
        setCombineError("Video processing timeout. Please try again.");
        setIsCombining(false);
        return;
      }

      await pollJobStatusDirect(jid, attempts);
    }, 5000);
  };

  const pollJobStatusDirect = async (jid: string, attempts = 0) => {
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
        setVideoWithoutSubtitle(jobData.final_video_url);
        setIsCombining(false);
        setCombineProgress("Complete!");
        
        // Save to cache
        saveToCache(jobData.final_video_url, false, jobData.final_video_url);
        
        // Show subtitle modal
        setShowSubtitleModal(true);
        
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
        // Update progress text based on V2 steps
        setCombineProgress(getProgressText(attempts));
      }
    } catch (err) {
      console.error('[FullVideo] Direct poll error:', err);
    }
  };

  // Get progress text based on attempts (V2 steps)
  const getProgressText = (attempts: number) => {
    if (attempts < 3) return "Downloading video segments...";
    if (attempts < 8) return "Normalizing video formats...";
    if (attempts < 15) return "Applying transitions...";
    if (attempts < 22) return "Processing audio...";
    if (attempts < 30) return "Finalizing video...";
    return "Almost done... (this may take a while)";
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

  // ==================== Subtitle Functions ====================
  
  // Add subtitles to video
  const handleAddSubtitles = async () => {
    if (!finalVideoUrl) return;
    
    console.log('[FullVideo] Adding subtitles with style: tiktok');
    setIsAddingSubtitles(true);
    setShowSubtitleModal(false);
    setSubtitleProgress("Initializing...");
    setSubtitlePercent(5);
    
    try {
      const response = await fetch(BACKEND_URL + "/api/add-subtitles", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BACKEND_API_KEY
        },
        body: JSON.stringify({
          video_url: finalVideoUrl,
          subtitle_style: 'tiktok',
          project_id: videoData?.projectId || videoData?.sessionId || "subtitled"
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Subtitle API error: " + response.status + " - " + errorText);
      }
      
      const data = await response.json();
      console.log('[FullVideo] Subtitle job created:', data);
      
      if (!data.success || !data.data?.job_id) {
        throw new Error("Failed to create subtitle job");
      }
      
      setSubtitleJobId(data.data.job_id);
      startPollingSubtitleJob(data.data.job_id);
      
    } catch (err: any) {
      console.error('[FullVideo] Subtitle error:', err);
      alert("Failed to add subtitles: " + err.message);
      setIsAddingSubtitles(false);
      setShowSubtitleModal(true);
    }
  };
  
  // Poll subtitle job status
  const startPollingSubtitleJob = (jid: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    subtitlePollRef.current = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(subtitlePollRef.current!);
        alert("Subtitle processing timeout. Video is available without subtitles.");
        setIsAddingSubtitles(false);
        return;
      }
      
      try {
        const response = await fetch(BACKEND_URL + "/api/job-status/" + jid, {
          headers: { 'x-api-key': BACKEND_API_KEY }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const jobData = data?.data;
        
        console.log('[FullVideo] Subtitle job status:', jobData?.status, jobData?.progress_percentage);
        
        if (jobData?.progress_percentage) {
          setSubtitlePercent(jobData.progress_percentage);
        }
        if (jobData?.current_step) {
          setSubtitleProgress(jobData.current_step);
        }
        
        if (jobData?.status === 'completed' && jobData?.final_video_url) {
          clearInterval(subtitlePollRef.current!);
          setSubtitlePercent(100);
          setSubtitleProgress("Complete!");
          setFinalVideoUrl(jobData.final_video_url);
          setHasSubtitles(true);
          setIsAddingSubtitles(false);
          
          // Save to cache with subtitle info
          saveToCache(jobData.final_video_url, true, videoWithoutSubtitle);
          
          // Update in database
          if (videoData?.sessionId) {
            await updatePlannedContentWithVideo(jobData.final_video_url);
          }
        } else if (jobData?.status === 'failed') {
          clearInterval(subtitlePollRef.current!);
          alert("Subtitle processing failed: " + (jobData?.error_message || "Unknown error"));
          setIsAddingSubtitles(false);
        }
      } catch (err) {
        console.error('[FullVideo] Subtitle poll error:', err);
      }
    }, 5000);
  };
  
  // Skip subtitles
  const handleSkipSubtitles = () => {
    setShowSubtitleModal(false);
    console.log('[FullVideo] User skipped subtitles');
  };

  // Recombine video (clear cache and restart)
  const handleRecombine = () => {
    const sessionId = videoData?.sessionId || videoData?.projectId;
    if (sessionId) {
      const cacheKey = getCacheKey(sessionId);
      sessionStorage.removeItem(cacheKey);
    }
    
    setFinalVideoUrl(null);
    setVideoWithoutSubtitle(null);
    setHasSubtitles(false);
    setCombineError(null);
    setShowSubtitleModal(false);
    
    const segments = videoData?.segments || videoData?.selectedSegments || [];
    if (segments.length > 0) {
      triggerCombineVideo(segments, videoData);
    }
  };

  const platforms = [
    { id: "youtube", name: "YouTube" },
    { id: "instagram", name: "Instagram" },
    { id: "tiktok", name: "TikTok" },
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

  // Check if platform is connected
  const isPlatformConnected = (platformId: string) => {
    return linkedAccounts.includes(platformId);
  };

  // Check if platform is implemented
  const isPlatformImplemented = (platformId: string) => {
    return PLATFORM_CONFIG[platformId as keyof typeof PLATFORM_CONFIG]?.implemented ?? false;
  };

  // Toggle platform with connection check
  const togglePlatform = (platformId: string) => {
    // If already selected, allow deselection
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms((prev) => prev.filter((id) => id !== platformId));
      return;
    }

    // Check if platform is implemented
    if (!isPlatformImplemented(platformId)) {
      setWarningPlatform(platformId);
      setShowConnectionWarning(true);
      return;
    }

    // Check if platform is connected
    if (!isPlatformConnected(platformId)) {
      setWarningPlatform(platformId);
      setShowConnectionWarning(true);
      return;
    }

    // Platform is connected, allow selection
    setSelectedPlatforms((prev) => [...prev, platformId]);
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
      {/* Connection Warning Modal */}
      {showConnectionWarning && warningPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a24] border border-amber-500/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-white font-semibold text-lg">
                  {isPlatformImplemented(warningPlatform) ? 'Account Not Connected' : 'Coming Soon'}
                </h3>
              </div>
              <button 
                onClick={() => setShowConnectionWarning(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isPlatformImplemented(warningPlatform) ? (
              <>
                <p className="text-white/70 text-sm mb-4">
                  Kamu belum menghubungkan akun <span className="text-white font-medium">{PLATFORM_CONFIG[warningPlatform as keyof typeof PLATFORM_CONFIG]?.name}</span> ke Sparkfluence.
                </p>
                <p className="text-white/50 text-sm mb-5">
                  Hubungkan akun terlebih dahulu untuk bisa publish video ke platform ini.
                </p>
                
                <div className="bg-[#2b2b38] rounded-lg p-4 mb-5">
                  <p className="text-white/60 text-xs mb-2">Cara menghubungkan:</p>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <span className="bg-[#7c3aed]/20 text-[#7c3aed] px-2 py-0.5 rounded text-xs">Settings</span>
                    <span className="text-white/40">→</span>
                    <span className="bg-[#7c3aed]/20 text-[#7c3aed] px-2 py-0.5 rounded text-xs">Linked Accounts</span>
                    <span className="text-white/40">→</span>
                    <span className="bg-[#7c3aed]/20 text-[#7c3aed] px-2 py-0.5 rounded text-xs">Connect</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate('/settings/linked-accounts')}
                    className="flex-1 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#db2777] text-white h-11"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Connect Account
                  </Button>
                  <Button
                    onClick={() => setShowConnectionWarning(false)}
                    variant="secondary"
                    className="flex-1 bg-white/10 text-white hover:bg-white/20 border border-white/20 h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-white/70 text-sm mb-4">
                  Integrasi <span className="text-white font-medium">{PLATFORM_CONFIG[warningPlatform as keyof typeof PLATFORM_CONFIG]?.name}</span> akan segera hadir!
                </p>
                <p className="text-white/50 text-sm mb-5">
                  Saat ini hanya YouTube yang sudah tersedia. Instagram dan TikTok sedang dalam pengembangan dan memerlukan audit dari platform masing-masing.
                </p>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-5">
                  <p className="text-amber-400 text-sm">
                    💡 Tip: Gunakan YouTube untuk sementara, lalu upload manual ke platform lain.
                  </p>
                </div>
                
                <Button
                  onClick={() => setShowConnectionWarning(false)}
                  className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/20 h-11"
                >
                  Got it
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Subtitle Modal - Centered Overlay */}
      {showSubtitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a24] border border-[#7c3aed]/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-[#7c3aed]/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#7c3aed]/20 rounded-full flex items-center justify-center">
                  <Captions className="w-5 h-5 text-[#7c3aed]" />
                </div>
                <h3 className="text-white font-semibold text-lg">Add Subtitles?</h3>
              </div>
              <button 
                onClick={handleSkipSubtitles}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-white/70 text-sm mb-5">
              AI akan transcribe audio dan menambahkan subtitle animasi word-by-word ke video kamu.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={handleAddSubtitles}
                className="flex-1 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#db2777] text-white h-11"
              >
                <Captions className="w-4 h-4 mr-2" />
                Yes, Add Subtitles
              </Button>
              <Button
                onClick={handleSkipSubtitles}
                variant="secondary"
                className="flex-1 bg-white/10 text-white hover:bg-white/20 border border-white/20 h-11"
              >
                <CaptionsOff className="w-4 h-4 mr-2" />
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitle Processing Overlay */}
      {isAddingSubtitles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a24] border border-[#7c3aed]/50 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/20" />
                <circle cx="40" cy="40" r="36" stroke="url(#subtitleGradient)" strokeWidth="6" fill="none" strokeLinecap="round"
                  strokeDasharray={subtitlePercent * 2.26 + " 226"} className="transition-all duration-500" />
                <defs>
                  <linearGradient id="subtitleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{subtitlePercent}%</span>
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Adding Subtitles</h3>
            <p className="text-white/60 text-sm mb-4">{subtitleProgress}</p>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-full transition-all duration-500"
                style={{ width: subtitlePercent + "%" }} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="flex gap-2 mb-8 max-w-md mx-auto">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div key={step} className="h-1 flex-1 rounded-full bg-[#7c3aed]" />
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
                  
                  {/* Processing/Prompt Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    {showCombinePrompt ? (
                      // Combine Prompt - Ask user to start
                      <div className="text-center px-6">
                        <div className="w-20 h-20 bg-[#7c3aed]/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-[#7c3aed]/50 mb-4 mx-auto">
                          <Play className="w-10 h-10 text-[#7c3aed]" />
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2">Ready to Combine</h3>
                        <p className="text-white/60 text-sm mb-6 max-w-xs">
                          {(videoData?.segments || videoData?.selectedSegments || []).length} segments ready to be combined into one video
                        </p>
                        <Button
                          onClick={handleStartCombine}
                          className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#db2777] text-white px-8"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Combining
                        </Button>
                      </div>
                    ) : isCombining ? (
                      <div className="text-center px-6 max-w-xs">
                        {/* Circular Progress */}
                        <div className="relative w-24 h-24 mx-auto mb-6">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/20" />
                            <circle cx="48" cy="48" r="40" stroke="url(#gradient)" strokeWidth="6" fill="none" strokeLinecap="round"
                              strokeDasharray={progressPercent * 2.51 + " 251"} className="transition-all duration-500" />
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
                          <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-full transition-all duration-500"
                            style={{ width: progressPercent + "%" }} />
                        </div>
                        <p className="text-white/50 text-xs mt-3">Please wait, this may take a minute...</p>
                      </div>
                    ) : combineError ? (
                      <div className="text-center px-6">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <p className="text-white font-semibold text-lg mb-2">Processing Failed</p>
                        <p className="text-red-400 text-sm text-center px-4 mb-6 max-w-xs">{combineError}</p>
                        <Button
                          onClick={handleRecombine}
                          className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-8"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin mx-auto mb-4" />
                        <p className="text-white/60 text-sm">Loading...</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Action Buttons - Only show when video is ready */}
            {finalVideoUrl && (
              <div className="space-y-3">
                {/* Download Button */}
                <a
                  href={finalVideoUrl}
                  download={(title || 'video') + ".mp4"}
                  className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-3 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Video
                </a>
                
                {/* Subtitle & Recombine Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowSubtitleModal(true)}
                    className="flex-1 bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  >
                    <Captions className="w-4 h-4 mr-2" />
                    {hasSubtitles ? 'Change Subtitle' : 'Add Subtitle'}
                  </Button>
                  <Button
                    onClick={handleRecombine}
                    variant="secondary"
                    className="flex-1 bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recombine
                  </Button>
                </div>
                
                {/* Status Badge */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Video ready{hasSubtitles ? ' with subtitles' : ''}!</span>
                  </div>
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
                    <div className={"absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform " + (publishToPublic ? "translate-x-7" : "translate-x-0")} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/60 text-sm mb-3 font-medium">Platform</label>
                  <div className="flex gap-2">
                    {platforms.map((platform) => {
                      const isConnected = isPlatformConnected(platform.id);
                      const isImplemented = isPlatformImplemented(platform.id);
                      const isSelected = selectedPlatforms.includes(platform.id);
                      
                      return (
                        <div key={platform.id} className="relative">
                          <button
                            onClick={() => togglePlatform(platform.id)}
                            className={"w-10 h-10 rounded-lg flex items-center justify-center transition-all " + (isSelected
                              ? "bg-[#7c3aed] text-white border-2 border-[#7c3aed]"
                              : isConnected && isImplemented
                                ? "bg-[#2b2b38] text-white/60 border-2 border-[#2b2b38] hover:border-[#7c3aed]/50 hover:text-white/80"
                                : "bg-[#2b2b38]/50 text-white/30 border-2 border-[#2b2b38]/50 cursor-not-allowed")}
                            title={
                              !isImplemented 
                                ? `${platform.name} coming soon` 
                                : !isConnected 
                                  ? `${platform.name} not connected` 
                                  : platform.name
                            }
                          >
                            {getPlatformIcon(platform.id)}
                          </button>
                          
                          {/* Status indicator */}
                          {!isImplemented ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-[#1a1a24]" title="Coming soon" />
                          ) : !isConnected ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#1a1a24]" title="Not connected" />
                          ) : (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-[#1a1a24]" title="Connected" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Platform status legend */}
                  <div className="flex gap-3 mt-3 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Connected
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Not connected
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      Coming soon
                    </span>
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
                    disabled={loading || isCombining || !finalVideoUrl}
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
