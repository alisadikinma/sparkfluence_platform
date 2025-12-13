import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { 
  Play, RefreshCw, Check, X, Loader2, Video, 
  ChevronRight, AlertCircle, Cloud, CheckCircle2, Maximize2,
  Mic, Camera, Volume2
} from "lucide-react";

interface Segment {
  id: string;
  type: string;
  element?: string;
  timing?: string;
  duration?: string;
  durationSeconds: number;
  script: string;
  visualDirection: string;
  emotion: string;
  transition: string;
  shotType: string;
  imageUrl: string | null;
  videoUrl: string | null;
  veoUuid: string | null;
  isGeneratingVideo: boolean;
  videoError: string | null;
  jobId?: string;
  prompt?: string; // Video prompt from VEO
}

interface VideoSettings {
  duration: '30s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  resolution: '720p' | '1080p';
  language?: string;
  model?: 'auto' | 'sora2' | 'veo31';
}

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

export const VideoGeneration = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTopic, setCurrentTopic] = useState("Your Video");
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, completed: 0, failed: 0 });
  const [videoPrompts, setVideoPrompts] = useState<Record<string, any>>({});
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedPrompts = useRef(false);
  const hasInitialized = useRef(false);

  // UI Text
  const uiText = {
    title: language === 'id' ? 'Generate Video' : 'Generate Video',
    subtitle: language === 'id' ? 'Generate video untuk setiap segmen dengan AI voiceover' : 'Generate video for each segment with AI voiceover',
    generateAll: language === 'id' ? 'Generate Semua Video' : 'Generate All Videos',
    remaining: language === 'id' ? 'tersisa' : 'remaining',
    generating: language === 'id' ? 'Generating...' : 'Generating...',
    ready: language === 'id' ? 'Siap' : 'Ready',
    processing: language === 'id' ? 'Memproses...' : 'Processing...',
    backToDashboard: language === 'id' ? 'Kembali ke Dashboard' : 'Back to Dashboard',
    next: language === 'id' ? 'Lanjut: Pilih Musik' : 'Next: Select Music',
    generateFirst: language === 'id' ? 'Generate Semua Video Dulu' : 'Generate All Videos First',
    loading: language === 'id' ? 'Memuat video...' : 'Loading videos...',
    backgroundProcessing: language === 'id' 
      ? 'Video sedang di-generate di background. Anda bisa menutup browser atau melakukan aktivitas lain. Kami akan kirim notifikasi saat selesai!'
      : 'Videos are being generated in the background. You can close your browser or do other activities. We\'ll notify you when done!',
    videoPrompt: language === 'id' ? 'Video Prompt' : 'Video Prompt',
    promptPending: language === 'id' ? 'Prompt akan muncul setelah generate' : 'Prompt will appear after generation',
    promptLoading: language === 'id' ? 'Memuat prompt...' : 'Loading prompts...',
    viewPrompt: language === 'id' ? 'Lihat Video Prompt' : 'View Video Prompt',
    hidePrompt: language === 'id' ? 'Sembunyikan Prompt' : 'Hide Prompt',
    platform: language === 'id' ? 'Platform' : 'Platform',
    preview: language === 'id' ? 'Preview' : 'Preview',
    retry: language === 'id' ? 'Coba Lagi' : 'Retry',
    total: language === 'id' ? 'Total' : 'Total',
    videosReady: language === 'id' ? 'video siap' : 'videos ready',
    rateLimitTitle: language === 'id' ? '⏳ Server Sedang Sibuk' : '⏳ Server Busy',
    rateLimitMessage: language === 'id' 
      ? 'Server AI sedang mengalami traffic tinggi. Silakan tunggu 10 menit lalu klik Retry untuk melanjutkan.'
      : 'AI server is experiencing high traffic. Please wait 10 minutes then click Retry to continue.',
    retryIn: language === 'id' ? 'Coba lagi dalam' : 'Retry in',
    minutes: language === 'id' ? 'menit' : 'minutes',
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
      if (checkStatusIntervalRef.current) clearInterval(checkStatusIntervalRef.current);
    };
  }, []);

  // Sync jobs with segments
  const syncJobsWithSegments = (jobs: any[], currentSegments: Segment[]): Segment[] => {
    return currentSegments.map((seg, index) => {
      const job = jobs.find(j => 
        j.segment_id === seg.id || 
        j.segment_number === index + 1 ||
        j.image_url === seg.imageUrl
      );
      
      if (job) {
        return {
          ...seg,
          jobId: job.id,
          veoUuid: job.veo_uuid || seg.veoUuid,
          videoUrl: job.video_url || seg.videoUrl,
          videoError: job.status === JOB_STATUS.FAILED ? (job.error_message || 'Video failed') : null,
          isGeneratingVideo: job.status === JOB_STATUS.PROCESSING,
          prompt: job.prompt || seg.prompt
        };
      }
      return seg;
    });
  };

  // Check existing jobs from database
  const checkExistingJobs = async (sid: string): Promise<any[] | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('session_id', sid)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error checking existing jobs:', err);
      return null;
    }
  };

  // Fetch video prompts preview (before generation)
  const fetchVideoPrompts = async (segs: Segment[], topic: string, settings: VideoSettings | null) => {
    if (segs.length === 0) return;
    
    setIsLoadingPrompts(true);
    
    try {
      const segmentsData = segs.map((seg, index) => ({
        segment_id: seg.id,
        segment_number: index + 1,
        segment_type: seg.type || seg.element,
        shot_type: seg.shotType,
        emotion: seg.emotion,
        script_text: seg.script,
        script: seg.script,
        image_url: seg.imageUrl,
        duration_seconds: seg.durationSeconds,
        visual_direction: seg.visualDirection,
        transition: seg.transition,
        character_name: 'Creator'
      }));

      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'preview_prompts',
          segments: segmentsData,
          topic: topic,
          language: 'indonesian',
          aspect_ratio: settings?.aspectRatio || '9:16',
          environment: 'studio',
          preferred_platform: settings?.model || 'auto' // 'auto' | 'sora2' | 'veo31'
        }
      });

      if (error) throw error;

      if (data?.data?.prompts) {
        const promptsMap: Record<string, any> = {};
        data.data.prompts.forEach((p: any) => {
          promptsMap[p.segment_id] = p;
        });
        setVideoPrompts(promptsMap);
        console.log('[VideoGen] Loaded prompts for', Object.keys(promptsMap).length, 'segments');
      }
    } catch (err) {
      console.error('Error fetching video prompts:', err);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Initialize from location state or URL params
  useEffect(() => {
    if (hasInitialized.current) return;
    
    const initializeData = async () => {
      const urlSessionId = searchParams.get('session');
      const stateData = location.state;
      
      let sid = urlSessionId || stateData?.sessionId || null;
      
      if (stateData?.segments && stateData.segments.length > 0) {
        sid = sid || `video_gen_${Date.now()}`;
        setSessionId(sid);
        setCurrentTopic(stateData.topic || "Your Video");
        setVideoSettings(stateData.videoSettings || null);

        // Format segments
        let initialSegments: Segment[] = stateData.segments.map((seg: any) => ({
          ...seg,
          videoUrl: seg.videoUrl || null,
          veoUuid: seg.veoUuid || null,
          isGeneratingVideo: false,
          videoError: null,
        }));

        // Check existing jobs
        const existingJobs = await checkExistingJobs(sid);
        if (existingJobs && existingJobs.length > 0) {
          initialSegments = syncJobsWithSegments(existingJobs, initialSegments);
          
          // Check if there are pending/processing jobs to resume
          const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING);
          const hasProcessing = existingJobs.some(j => j.status === JOB_STATUS.PROCESSING);
          const completed = existingJobs.filter(j => j.status === JOB_STATUS.COMPLETED).length;
          const failed = existingJobs.filter(j => j.status === JOB_STATUS.FAILED).length;
          
          // Check for rate limit errors in failed jobs
          const hasRateLimitError = existingJobs.some(j => 
            j.status === JOB_STATUS.FAILED && (
              j.error_message?.includes('RATE_LIMIT') ||
              j.error_message?.includes('GEMINI_RATE_LIMIT') ||
              j.error_message?.includes('high traffic')
            )
          );
          
          setGenerationProgress({
            current: completed + failed,
            total: existingJobs.length,
            completed,
            failed
          });
          
          // If rate limited, show warning instead of background toast
          if (hasRateLimitError) {
            setRateLimitWarning(new Date().toISOString());
            setIsBackgroundMode(false);
            setShowBackgroundToast(false);
          } else if (hasPending || hasProcessing) {
            setIsBackgroundMode(true);
            setShowBackgroundToast(true);
            
            // Resume processing
            if (hasPending) {
              startBackgroundProcessing(sid);
            }
            if (hasProcessing) {
              startStatusPolling(sid);
            }
          }
        }

        setSegments(initialSegments);
        setIsLoaded(true);
        hasInitialized.current = true;
        
        // Fetch video prompts preview (only once)
        if (!hasFetchedPrompts.current) {
          hasFetchedPrompts.current = true;
          fetchVideoPrompts(initialSegments, stateData.topic || "Your Video", stateData.videoSettings || null);
        }
        
      } else if (sid) {
        // Coming from notification with session ID
        const existingJobs = await checkExistingJobs(sid);
        
        if (existingJobs && existingJobs.length > 0) {
          setSessionId(sid);
          
          // Reconstruct segments from jobs
          const reconstructedSegments: Segment[] = existingJobs.map((job: any) => ({
            id: job.segment_id,
            type: job.segment_type,
            timing: '',
            durationSeconds: job.duration_seconds || 8,
            script: job.script_text || '',
            visualDirection: '',
            emotion: job.emotion || '',
            transition: '',
            shotType: job.shot_type || 'B-ROLL',
            imageUrl: job.image_url,
            videoUrl: job.video_url,
            veoUuid: job.veo_uuid,
            isGeneratingVideo: job.status === JOB_STATUS.PROCESSING,
            videoError: job.status === JOB_STATUS.FAILED ? job.error_message : null,
            jobId: job.id,
            prompt: job.prompt || ''
          }));
          
          setSegments(reconstructedSegments);
          setCurrentTopic(existingJobs[0]?.topic || "Your Video");
          
          // Check if should resume
          const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING);
          const hasProcessing = existingJobs.some(j => j.status === JOB_STATUS.PROCESSING);
          const completed = existingJobs.filter(j => j.status === JOB_STATUS.COMPLETED).length;
          const failed = existingJobs.filter(j => j.status === JOB_STATUS.FAILED).length;
          
          // Check for rate limit errors in failed jobs
          const hasRateLimitError = existingJobs.some(j => 
            j.status === JOB_STATUS.FAILED && (
              j.error_message?.includes('RATE_LIMIT') ||
              j.error_message?.includes('GEMINI_RATE_LIMIT') ||
              j.error_message?.includes('high traffic')
            )
          );
          
          setGenerationProgress({
            current: completed + failed,
            total: existingJobs.length,
            completed,
            failed
          });
          
          // If rate limited, show warning instead of background toast
          if (hasRateLimitError) {
            setRateLimitWarning(new Date().toISOString());
            setIsBackgroundMode(false);
            setShowBackgroundToast(false);
          } else if (hasPending || hasProcessing) {
            setIsBackgroundMode(true);
            setShowBackgroundToast(true);
            
            if (hasPending) startBackgroundProcessing(sid);
            if (hasProcessing) startStatusPolling(sid);
          }
          
          setIsLoaded(true);
          hasInitialized.current = true;
          
          // Fetch video prompts preview (only once)
          if (!hasFetchedPrompts.current) {
            hasFetchedPrompts.current = true;
            fetchVideoPrompts(reconstructedSegments, existingJobs[0]?.topic || "Your Video", null);
          }
        } else {
          navigate('/video-editor');
        }
      } else {
        navigate('/video-editor');
      }
    };

    initializeData();
  }, [location.state, searchParams, navigate, user?.id]);

  // Start background processing - process jobs one by one with rate limit protection
  const startBackgroundProcessing = useCallback((sid: string) => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }
    
    let isProcessing = false; // Prevent overlapping requests
    
    const processNext = async () => {
      if (!user) return;
      if (isProcessing) {
        console.log('[VideoGen] Skipping - previous job still processing');
        return;
      }
      
      isProcessing = true;
      
      try {
        // First check if there's already a job being processed by VEO
        const { data: processingJobs } = await supabase
          .from('video_generation_jobs')
          .select('id')
          .eq('session_id', sid)
          .eq('user_id', user.id)
          .eq('status', JOB_STATUS.PROCESSING);
        
        // If there's already a processing job, wait for it to complete first
        if (processingJobs && processingJobs.length > 0) {
          console.log('[VideoGen] Waiting for VEO to complete current job...');
          isProcessing = false;
          return;
        }
        
        // Process single job
        const { data, error } = await supabase.functions.invoke('generate-videos', {
          body: {
            mode: 'process_single',
            session_id: sid,
            user_id: user.id
          }
        });
        
        if (error) {
          console.error('Process error:', error);
          isProcessing = false;
          return;
        }
        
        const result = data?.data;
        
        // If job was submitted successfully, start polling for VEO status
        if (result?.job?.veo_uuid) {
          console.log(`[VideoGen] Job submitted: UUID=${result.job.veo_uuid}`);
          
          // Update segment as processing
          setSegments(prev => prev.map(seg => {
            if (seg.id === result.job.segment_id || parseInt(seg.id) === result.job.segment_number) {
              return {
                ...seg,
                veoUuid: result.job.veo_uuid,
                isGeneratingVideo: true,
                jobId: result.job.id
              };
            }
            return seg;
          }));
          
          // Start polling for status
          startStatusPolling(sid);
        }
        
        // Check if no more pending jobs
        if (result?.summary?.pending === 0) {
          console.log('[VideoGen] No more pending jobs to submit');
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
          }
          
          // Check if we have rate limit failures
          if (result?.summary?.failed > 0) {
            // Fetch jobs to check for rate limit errors
            const { data: failedJobs } = await supabase
              .from('video_generation_jobs')
              .select('error_message')
              .eq('session_id', sid)
              .eq('status', JOB_STATUS.FAILED);
            
            const hasRateLimit = failedJobs?.some(j => 
              j.error_message?.includes('RATE_LIMIT') ||
              j.error_message?.includes('GEMINI_RATE_LIMIT') ||
              j.error_message?.includes('high traffic')
            );
            
            if (hasRateLimit) {
              setRateLimitWarning(new Date().toISOString());
              setIsBackgroundMode(false);
              setShowBackgroundToast(false);
            }
          }
        }
        
      } catch (err) {
        console.error('Background processing error:', err);
      } finally {
        isProcessing = false;
      }
    };
    
    // Process first one immediately, then every 15 seconds (VEO rate limit protection)
    processNext();
    processingIntervalRef.current = setInterval(processNext, 15000);
  }, [user]);

  // Poll VEO status and update completed videos
  const startStatusPolling = useCallback((sid: string) => {
    if (checkStatusIntervalRef.current) return; // Already polling
    
    const checkStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-videos', {
          body: {
            mode: 'check_and_update',
            session_id: sid,
            user_id: user.id
          }
        });
        
        if (error) {
          console.error('Status check error:', error);
          return;
        }
        
        const result = data?.data;
        
        // Update progress
        if (result?.summary) {
          setGenerationProgress({
            current: result.summary.completed + result.summary.failed,
            total: result.summary.total,
            completed: result.summary.completed,
            failed: result.summary.failed
          });
        }
        
        // Update segments with completed videos
        if (result?.jobs) {
          let hasRateLimitError = false;
          
          setSegments(prev => {
            return prev.map(seg => {
              const job = result.jobs.find((j: any) => 
                j.segment_id === seg.id || 
                j.id === seg.jobId
              );
              
              if (job) {
                // Check for rate limit error (new and old format)
                if (job.status === JOB_STATUS.FAILED && (
                  job.error_message?.includes('RATE_LIMIT') ||
                  job.error_message?.includes('GEMINI_RATE_LIMIT') ||
                  job.error_message?.includes('high traffic')
                )) {
                  hasRateLimitError = true;
                }
                
                return {
                  ...seg,
                  videoUrl: job.video_url || seg.videoUrl,
                  veoUuid: job.veo_uuid || seg.veoUuid,
                  isGeneratingVideo: job.status === JOB_STATUS.PROCESSING,
                  videoError: job.status === JOB_STATUS.FAILED ? job.error_message : null,
                  prompt: job.prompt || seg.prompt
                };
              }
              return seg;
            });
          });
          
          // Show rate limit warning if detected
          if (hasRateLimitError && !rateLimitWarning) {
            setRateLimitWarning(new Date().toISOString());
            // Stop processing intervals
            if (processingIntervalRef.current) {
              clearInterval(processingIntervalRef.current);
              processingIntervalRef.current = null;
            }
            setIsBackgroundMode(false);
            setShowBackgroundToast(false);
          }
        }
        
        // Check if all complete
        if (result?.all_complete) {
          console.log('[VideoGen] All videos complete!');
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          setShowBackgroundToast(false);
          
          if (checkStatusIntervalRef.current) {
            clearInterval(checkStatusIntervalRef.current);
            checkStatusIntervalRef.current = null;
          }
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
          }
        }
        
      } catch (err) {
        console.error('Status polling error:', err);
      }
    };
    
    // Check immediately, then every 5 seconds
    checkStatus();
    checkStatusIntervalRef.current = setInterval(checkStatus, 5000);
  }, [user]);

  // Generate all videos with background job system
  const handleGenerateAllBackground = async () => {
    if (!user || !sessionId) return;
    
    const segmentsToGenerate = segments.filter(s => !s.videoUrl && s.imageUrl);
    if (segmentsToGenerate.length === 0) return;

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segmentsToGenerate.length, completed: 0, failed: 0 });

    try {
      // Prepare segments data for job creation
      const segmentsData = segmentsToGenerate.map((seg, index) => {
        const originalIndex = segments.findIndex(s => s.id === seg.id);
        return {
          segment_id: seg.id,
          segment_number: originalIndex + 1,
          segment_type: seg.type || seg.element,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          script_text: seg.script,
          image_url: seg.imageUrl,
          duration_seconds: seg.durationSeconds,
          visual_direction: seg.visualDirection,
          transition: seg.transition
        };
      });

      // Create jobs in database
      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          language: 'indonesian',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          resolution: videoSettings?.resolution || '1080p',
          preferred_platform: videoSettings?.model || 'auto' // 'auto' | 'sora2' | 'veo31'
        }
      });

      if (error) throw error;

      console.log('[VideoGen] Jobs created:', data?.data?.total_jobs);

      // Update segments with job IDs
      if (data?.data?.jobs) {
        setSegments(prev => {
          return prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_id === seg.id);
            if (job) {
              return { ...seg, jobId: job.id };
            }
            return seg;
          });
        });
      }

      // Start processing loop
      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  // Regenerate single video (legacy mode)
  const handleRegenerateVideo = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !segment.imageUrl || !user) return;

    setSegments(prev =>
      prev.map(seg =>
        seg.id === segmentId
          ? { ...seg, isGeneratingVideo: true, videoError: null }
          : seg
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          segments: [{
            segment_id: segmentId,
            segment_number: parseInt(segmentId),
            script_text: segment.script,
            image_url: segment.imageUrl,
            duration_seconds: segment.durationSeconds,
            type: segment.type || segment.element,
            emotion: segment.emotion,
            transition: segment.transition || 'Cut',
            shot_type: segment.shotType || 'B-ROLL',
            visual_direction: segment.visualDirection
          }],
          language: 'indonesian',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          resolution: videoSettings?.resolution || '720p',
          session_id: sessionId,
          user_id: user.id
        }
      });

      if (error) throw error;

      const jobData = data?.data?.videos?.[0];
      const veoUuid = jobData?.veo_response?.uuid;

      if (!veoUuid) throw new Error('No UUID returned from VEO');

      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId ? { ...seg, veoUuid } : seg
        )
      );

      // Poll for completion
      const videoUrl = await pollVideoStatus(veoUuid);
      
      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, veoUuid, videoUrl, isGeneratingVideo: false }
            : seg
        )
      );

    } catch (err: any) {
      console.error('Error generating video:', err);
      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, isGeneratingVideo: false, videoError: err.message || 'Failed to generate video' }
            : seg
        )
      );
    }
  };

  const pollVideoStatus = async (uuid: string): Promise<string> => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const { data, error } = await supabase.functions.invoke('check-video-status', {
          body: { video_uuids: [uuid], update_db: true }
        });

        if (error) throw error;

        const videoInfo = data?.data?.videos?.[0];
        
        if (videoInfo?.status === 2 && videoInfo?.video_url) {
          return videoInfo.video_url;
        } else if (videoInfo?.status === 3) {
          throw new Error(videoInfo.error_message || 'Video generation failed');
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) {
          throw err;
        }
      }
      
      attempts++;
    }

    throw new Error('Video generation timeout - please try again');
  };

  // Retry failed jobs (reset status to pending)
  const handleRetryFailedJobs = async () => {
    if (!user || !sessionId) return;
    
    try {
      // Reset failed jobs to pending in database
      const { error } = await supabase
        .from('video_generation_jobs')
        .update({ 
          status: JOB_STATUS.PENDING, 
          error_message: null,
          veo_uuid: null,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .eq('status', JOB_STATUS.FAILED);
      
      if (error) throw error;
      
      // Reset local state
      setSegments(prev => prev.map(seg => 
        seg.videoError ? { ...seg, videoError: null, isGeneratingVideo: false, veoUuid: null } : seg
      ));
      
      // Restart background processing
      setIsBackgroundMode(true);
      setShowBackgroundToast(true);
      startBackgroundProcessing(sessionId);
      
      console.log('[VideoGen] Retry: Reset failed jobs to pending');
    } catch (err) {
      console.error('Error retrying failed jobs:', err);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleNext = () => {
    const allHaveVideos = segments.every(seg => seg.videoUrl);
    if (!allHaveVideos) {
      alert(language === 'id' ? 'Harap generate semua video terlebih dahulu.' : 'Please generate videos for all segments before proceeding.');
      return;
    }

    navigate("/music-selector", {
      state: {
        sessionId,
        segments,
        topic: currentTopic,
        videoSettings
      }
    });
  };

  const totalDuration = segments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
  const videosGenerated = segments.filter(s => s.videoUrl).length;
  const allHaveVideos = segments.every(seg => seg.videoUrl);

  // Helper: Get camera movement hint based on segment type
  const getCameraHint = (segmentType: string, emotion: string): string => {
    const type = (segmentType || '').toUpperCase();
    const hints: Record<string, string> = {
      'HOOK': 'Dolly push-in → close-up',
      'FORE': 'Slow pan revealing scene',
      'FORESHADOW': 'Slow pan revealing scene',
      'BODY': 'Static shot, stable frame',
      'BODY-1': 'Slow tracking shot',
      'BODY-2': 'Static with subtle drift',
      'BODY-3': 'Gentle dolly movement',
      'PEAK': 'Push-in for emphasis',
      'CTA': 'Static → gentle push-in',
      'ENDING': 'Gentle pull-back',
      'ENDING_CTA': 'Static → gentle push-in',
    };
    return hints[type] || 'Cinematic movement';
  };

  // Helper: Get audio/ambient hint based on segment type
  const getAudioHint = (segmentType: string, shotType: string): string => {
    const type = (segmentType || '').toUpperCase();
    const isCreator = shotType === 'CREATOR';
    
    if (isCreator) {
      return '🎤 AI Voiceover + Studio ambience';
    }
    
    const hints: Record<string, string> = {
      'HOOK': '🎤 AI Voiceover + Attention SFX',
      'BODY': '🎤 AI Voiceover + Soft ambient',
      'BODY-1': '🎤 AI Voiceover + Environmental',
      'BODY-2': '🔊 Ambient only + UI sounds',
      'BODY-3': '🔊 Nature ambient + Soft music',
      'CTA': '🎤 AI Voiceover + Warm tone',
      'ENDING_CTA': '🎤 AI Voiceover + Uplifting',
    };
    return hints[type] || (isCreator ? '🎤 AI Voiceover' : '🔊 Ambient sounds');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
          <p className="text-white/60">{uiText.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Rate Limit Warning Toast */}
        {rateLimitWarning && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
            <div className="bg-gradient-to-r from-amber-600/90 to-orange-600/90 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">
                      {uiText.rateLimitTitle}
                    </h4>
                    <button 
                      onClick={() => setRateLimitWarning(null)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/90 text-xs leading-relaxed mb-3">
                    {uiText.rateLimitMessage}
                  </p>
                  <Button
                    onClick={() => {
                      setRateLimitWarning(null);
                      // Reset failed jobs to pending and restart
                      handleRetryFailedJobs();
                    }}
                    size="sm"
                    className="bg-white text-amber-700 hover:bg-white/90 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {uiText.retry}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background Processing Toast */}
        {showBackgroundToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
            <div className="bg-gradient-to-r from-[#7c3aed]/90 to-[#ec4899]/90 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">
                      {language === 'id' ? 'Proses di Background' : 'Background Processing'}
                    </h4>
                    <button 
                      onClick={() => setShowBackgroundToast(false)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-3">
                    {uiText.backgroundProcessing}
                  </p>
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{generationProgress.completed}/{generationProgress.total} complete</span>
                      {generationProgress.failed > 0 && (
                        <span className="text-red-300">{generationProgress.failed} failed</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-6 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 6 ? "bg-[#7c3aed]" : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{currentTopic}</h1>
              <p className="text-white/60 text-sm">{uiText.subtitle}</p>
            </div>
            <div className="text-right text-sm">
              <div className="text-white/60">{uiText.total}: {totalDuration}s</div>
              <div className="text-[#7c3aed] text-xs mt-1">
                {videosGenerated}/{segments.length} {uiText.videosReady}
              </div>
            </div>
          </div>
        </div>

        {/* Generate All Button */}
        {!allHaveVideos && (
          <div className="mb-6">
            <Button
              onClick={handleGenerateAllBackground}
              disabled={isGeneratingAll || isBackgroundMode}
              className={`w-full h-14 font-medium ${
                isBackgroundMode
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90"
              } text-white`}
            >
              {isBackgroundMode ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {language === 'id' ? 'Memproses di Background...' : 'Processing in Background...'} ({generationProgress.completed}/{generationProgress.total})
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  {uiText.generateAll} ({segments.length - videosGenerated} {uiText.remaining})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Segments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((segment, index) => (
            <div 
              key={segment.id} 
              className={`bg-[#1a1a24] border rounded-2xl overflow-hidden transition-all ${
                segment.videoUrl ? 'border-green-500/50' : 'border-[#2b2b38]'
              }`}
            >
              {/* Segment Header */}
              <div className="p-3 border-b border-[#2b2b38] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-0.5 rounded text-white text-xs font-semibold ${
                    segment.videoUrl ? 'bg-green-600' : 'bg-[#7c3aed]'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-white font-medium text-sm">{segment.type || segment.element}</span>
                  <span className="text-white/40 text-xs">{segment.timing || segment.duration}</span>
                </div>
                {segment.videoUrl ? (
                  <div className="flex items-center gap-1 text-green-500 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    {uiText.ready}
                  </div>
                ) : segment.isGeneratingVideo ? (
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {uiText.processing}
                  </div>
                ) : segment.veoUuid ? (
                  <div className="text-amber-400 text-xs">
                    {uiText.processing}
                  </div>
                ) : null}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex gap-4">
                  {/* Image Preview */}
                  <div className="w-28 sm:w-32 h-40 sm:h-44 flex-shrink-0 bg-[#0a0a12] rounded-lg overflow-hidden relative group">
                    {segment.imageUrl ? (
                      <>
                        <img
                          src={segment.imageUrl}
                          alt={segment.type || segment.element}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage(segment.imageUrl)}
                        />
                        {/* Expand overlay */}
                        <div 
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                          onClick={() => setPreviewImage(segment.imageUrl)}
                        >
                          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Maximize2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Script/Voiceover */}
                    {segment.script && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 text-purple-400 text-[10px] font-medium mb-1">
                          <Mic className="w-3 h-3" />
                          <span>Voiceover</span>
                        </div>
                        <p className="text-white text-xs leading-relaxed line-clamp-2 bg-purple-500/10 rounded px-2 py-1.5 border-l-2 border-purple-500">
                          "{segment.script}"
                        </p>
                      </div>
                    )}

                    {/* Camera & Audio Row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Camera Movement */}
                      <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1 rounded">
                        <Camera className="w-3 h-3" />
                        <span>{getCameraHint(segment.type || segment.element || '', segment.emotion)}</span>
                      </div>
                      
                      {/* Audio/SFX */}
                      <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded">
                        <Volume2 className="w-3 h-3" />
                        <span>{segment.script ? 'AI Voice' : 'Ambient'}</span>
                      </div>

                      {/* Platform Badge */}
                      {videoPrompts[segment.id] && (
                        <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 text-[10px] px-2 py-1 rounded">
                          <Video className="w-3 h-3" />
                          <span>{videoPrompts[segment.id].platform_name || videoPrompts[segment.id].platform}</span>
                        </div>
                      )}
                    </div>

                    {/* Video Prompt Preview (BEFORE generation) */}
                    {videoPrompts[segment.id] && (
                      <div className="mb-2">
                        <button
                          onClick={() => setExpandedPrompt(expandedPrompt === segment.id ? null : segment.id)}
                          className="flex items-center gap-1.5 text-[10px] text-white/50 hover:text-white/80 transition-colors mb-1"
                        >
                          <span>{expandedPrompt === segment.id ? '▼' : '▶'}</span>
                          <span>{expandedPrompt === segment.id ? uiText.hidePrompt : uiText.viewPrompt}</span>
                          {videoPrompts[segment.id].resolution && (
                            <span className="text-purple-400 ml-1">({videoPrompts[segment.id].resolution})</span>
                          )}
                        </button>
                        {expandedPrompt === segment.id && (
                          <div className="bg-[#0a0a12] border border-[#2b2b38] rounded-lg p-3 max-h-48 overflow-y-auto">
                            <pre className="text-white/70 text-[10px] whitespace-pre-wrap font-mono leading-relaxed">
                              {videoPrompts[segment.id].prompt}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Loading prompts indicator */}
                    {isLoadingPrompts && !videoPrompts[segment.id] && (
                      <div className="flex items-center gap-2 text-white/40 text-[10px] mb-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{uiText.promptLoading}</span>
                      </div>
                    )}

                    {/* Show generated prompt after video is made (fallback) */}
                    {segment.prompt && !videoPrompts[segment.id] && (
                      <details className="mb-2">
                        <summary className="text-white/40 text-[10px] cursor-pointer hover:text-white/60">
                          View full video prompt
                        </summary>
                        <p className="text-white/60 text-[10px] mt-1 line-clamp-4 bg-white/5 rounded p-2">
                          {segment.prompt}
                        </p>
                      </details>
                    )}

                    {/* Video Status / Actions */}
                    <div className="mt-auto">
                      {segment.isGeneratingVideo ? (
                        <div className="bg-[#0a0a12] rounded-lg p-3 flex items-center gap-2">
                          <Loader2 className="w-5 h-5 text-[#7c3aed] animate-spin" />
                          <span className="text-white/60 text-sm">{uiText.generating}</span>
                        </div>
                      ) : segment.videoError ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{segment.videoError}</span>
                          </div>
                          <Button
                            onClick={() => handleRegenerateVideo(segment.id)}
                            size="sm"
                            variant="outline"
                            disabled={isBackgroundMode}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            {uiText.retry}
                          </Button>
                        </div>
                      ) : segment.videoUrl ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setPreviewVideo(segment.videoUrl)}
                            className="flex-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            {uiText.preview}
                          </Button>
                          <Button
                            onClick={() => handleRegenerateVideo(segment.id)}
                            variant="outline"
                            disabled={isBackgroundMode}
                            className="border-[#2b2b38] bg-white hover:bg-white/80"
                          >
                            <RefreshCw className="w-4 h-4 text-black" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleRegenerateVideo(segment.id)}
                          disabled={!segment.imageUrl || isBackgroundMode}
                          className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Generate Video
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            onClick={handleBackToDashboard}
            variant="secondary"
            className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-6 sm:px-8 font-medium"
          >
            {uiText.backToDashboard}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!allHaveVideos}
            className={`h-12 px-6 sm:px-8 font-medium transition-all ${
              allHaveVideos
                ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                : "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
            }`}
          >
            {allHaveVideos ? (
              <>
                {uiText.next}
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              `${uiText.generateFirst} (${videosGenerated}/${segments.length})`
            )}
          </Button>
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 sm:p-8"
          onClick={() => setPreviewVideo(null)}
        >
          <button
            onClick={() => setPreviewVideo(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div 
            className="max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={previewVideo}
              controls
              autoPlay
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 sm:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default VideoGeneration;
