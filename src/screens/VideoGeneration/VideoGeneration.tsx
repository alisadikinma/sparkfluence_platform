import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { calculateSegmentDuration } from "../../lib/segmentDuration";
import {
  Play, RefreshCw, Check, X, Loader2, Video,
  ChevronRight, AlertCircle, Cloud, CheckCircle2, Maximize2,
  Mic, Camera, Volume2, Download
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
  videoProgress?: number; // 0-100 percentage
  isDismissed?: boolean; // Skip this segment from final video
}

interface VideoSettings {
  duration: '30s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  resolution: '720p' | '1080p';
  language?: string;
  model?: 'auto' | 'veo-3.1-hd' | 'veo-3.1-fast'; // auto = VEO 3.1 HD (default)
}

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

// ============================================================================
// SESSION REFRESH & RETRY HELPER
// Fixes ERR_CONNECTION_CLOSED during long polling operations
// ============================================================================
async function ensureValidSession(): Promise<boolean> {
  try {
    // Try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('[VideoGen] Session invalid, attempting refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('[VideoGen] Session refresh failed:', refreshError);
        return false;
      }
      console.log('[VideoGen] Session refreshed successfully');
    }
    return true;
  } catch (err) {
    console.error('[VideoGen] Session check error:', err);
    return false;
  }
}

async function invokeWithRetry(
  functionName: string, 
  body: any, 
  maxRetries: number = 3
): Promise<{ data: any; error: any }> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure valid session before each attempt
      const sessionValid = await ensureValidSession();
      if (!sessionValid && attempt === maxRetries) {
        return { data: null, error: { message: 'Session expired. Please refresh the page.' } };
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      
      if (error) {
        // Check if it's a network/auth error that should be retried
        const isRetryable = 
          error.message?.includes('fetch') ||
          error.message?.includes('network') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('CONNECTION');
        
        if (isRetryable && attempt < maxRetries) {
          console.log(`[VideoGen] Retry ${attempt}/${maxRetries} for ${functionName}: ${error.message}`);
          await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
          continue;
        }
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err: any) {
      lastError = err;
      console.error(`[VideoGen] Attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  
  return { data: null, error: lastError || { message: 'Max retries exceeded' } };
}

// ============================================================================
// SEGMENT TYPE MAPPING - Fixes SEGMENT_X to proper HOOK/BODY/CTA naming
// ============================================================================
const SEGMENT_TYPE_BY_POSITION: Record<number, Record<number, string>> = {
  // 5 segments (30s video): HOOK, FORE, BODY-1, PEAK, CTA
  5: {
    1: 'HOOK',
    2: 'FORE',
    3: 'BODY-1',
    4: 'PEAK',
    5: 'CTA'
  },
  // 6 segments: HOOK, FORE, BODY-1, BODY-2, PEAK, CTA
  6: {
    1: 'HOOK',
    2: 'FORE',
    3: 'BODY-1',
    4: 'BODY-2',
    5: 'PEAK',
    6: 'CTA'
  },
  // 7 segments: HOOK, FORE, BODY-1, BODY-2, BODY-3, PEAK, CTA
  7: {
    1: 'HOOK',
    2: 'FORE',
    3: 'BODY-1',
    4: 'BODY-2',
    5: 'BODY-3',
    6: 'PEAK',
    7: 'CTA'
  },
  // 8 segments (60s video): HOOK, FORE, BODY-1, BODY-2, BODY-3, BODY-4, PEAK, CTA
  8: {
    1: 'HOOK',
    2: 'FORE',
    3: 'BODY-1',
    4: 'BODY-2',
    5: 'BODY-3',
    6: 'BODY-4',
    7: 'PEAK',
    8: 'CTA'
  }
};

/**
 * Maps segment_type from DB to proper naming
 * - If already proper (HOOK, BODY-1, etc.) → return as-is
 * - If generic (SEGMENT_1, SEGMENT_2) → map based on position and total count
 */
function mapSegmentType(segmentType: string, segmentNumber: number, totalSegments: number): string {
  // If already proper type, return as-is
  const properTypes = ['HOOK', 'FORE', 'FORESHADOW', 'BODY', 'BODY-1', 'BODY-2', 'BODY-3', 'BODY-4', 'PEAK', 'CTA', 'ENDING', 'LOOP-END', 'ENDING_CTA'];
  const upperType = (segmentType || '').toUpperCase();
  
  if (properTypes.includes(upperType) || upperType.startsWith('BODY')) {
    return segmentType;
  }
  
  // Map SEGMENT_X to proper type based on position
  const mapping = SEGMENT_TYPE_BY_POSITION[totalSegments];
  if (mapping && mapping[segmentNumber]) {
    console.log(`[VideoGen] Mapping ${segmentType} → ${mapping[segmentNumber]} (pos ${segmentNumber}/${totalSegments})`);
    return mapping[segmentNumber];
  }
  
  // Fallback: First segment = HOOK, Last = CTA, rest = BODY-X
  if (segmentNumber === 1) return 'HOOK';
  if (segmentNumber === totalSegments) return 'CTA';
  return `BODY-${segmentNumber - 1}`;
}

/**
 * Determines shot_type based on segment type
 * HOOK and CTA = CREATOR (face visible)
 * Others = B-ROLL (no face)
 */
function getShotTypeFromSegmentType(segmentType: string): string {
  const upperType = (segmentType || '').toUpperCase();
  const creatorTypes = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA', 'ENDING'];
  return creatorTypes.includes(upperType) ? 'CREATOR' : 'B-ROLL';
}

// ============================================================================
// WORD COUNT VALIDATION - Shows warning if script exceeds duration-based limit
// ============================================================================

/**
 * Calculate max words allowed for a duration (in seconds)
 * Based on speech rate: Indonesian ~130 WPM, English ~150 WPM, Hindi ~125 WPM
 * Using 80% safety margin to prevent rushed speech
 */
function getMaxWordsForDuration(durationSeconds: number, language: string = 'indonesian'): number {
  const speechRates: Record<string, number> = {
    indonesian: 130, // WPM
    id: 130,
    hindi: 125,
    hi: 125,
    english: 150,
    en: 150,
  };
  const safetyMargin = 0.80;
  const wpm = speechRates[language?.toLowerCase()] || 130;
  const wordsPerSecond = wpm / 60;
  return Math.floor(durationSeconds * wordsPerSecond * safetyMargin);
}

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(w => w.replace(/[^\w]/g, '').length > 0);
  return words.length;
}

interface WordCountStatus {
  actual: number;
  max: number;
  percentage: number;
  status: 'ok' | 'warning' | 'over';
}

/**
 * Get word count status for a segment
 * Returns { actual, max, percentage, status }
 */
function getWordCountStatus(script: string, durationSeconds: number, language: string = 'indonesian'): WordCountStatus {
  const actual = countWords(script);
  const max = getMaxWordsForDuration(durationSeconds, language);
  const percentage = max > 0 ? Math.round((actual / max) * 100) : 0;
  
  let status: 'ok' | 'warning' | 'over' = 'ok';
  if (actual > max) {
    status = 'over';
  } else if (percentage >= 80) {
    status = 'warning';
  }
  
  return { actual, max, percentage, status };
}

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
  // Per-segment video model override (key: segment.id, value: 'veo-3.1-hd' | 'veo-3.1-fast')
  const [segmentModelOverrides, setSegmentModelOverrides] = useState<Record<string, 'veo-3.1-hd' | 'veo-3.1-fast'>>({});

  // Avatar info for voice prompt retrieval
  const [avatarOption, setAvatarOption] = useState<'none' | 'profile' | 'saved' | 'upload'>('none');
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedPrompts = useRef(false);
  const hasInitialized = useRef(false);
  
  // Sequential processing control refs
  const isSequentialProcessingRef = useRef(false);
  const shouldStopProcessingRef = useRef(false);

  // ============================================================================
  // SESSION PERSISTENCE - Backup sessionId to sessionStorage for page refresh
  // ============================================================================
  const SESSION_STORAGE_KEY = 'vg_active_session';

  // Save sessionId to sessionStorage when it changes
  useEffect(() => {
    if (sessionId && isLoaded) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        sessionId,
        topic: currentTopic,
        timestamp: Date.now()
      }));
    }
  }, [sessionId, currentTopic, isLoaded]);

  // Restore from sessionStorage if no URL params or location state
  useEffect(() => {
    if (hasInitialized.current) return;

    const urlSessionId = searchParams.get('session');
    const stateData = location.state;

    // If we have URL params or state, let the normal flow handle it
    if (urlSessionId || stateData?.sessionId || stateData?.segments) {
      return;
    }

    // Try to restore from sessionStorage
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const { sessionId: savedSessionId, timestamp } = JSON.parse(saved);
        // Only restore if session is less than 24 hours old
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (savedSessionId && (Date.now() - timestamp) < maxAge) {
          console.log('[VideoGen] Restoring session from sessionStorage:', savedSessionId);
          // Navigate with session param to trigger proper initialization
          navigate(`/video-generation?session=${savedSessionId}`, { replace: true });
        } else {
          // Clear stale session
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (e) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, [searchParams, location.state, navigate]);

  // Clear sessionStorage when leaving the page successfully (going to combine/next step)
  const clearSessionPersistence = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  // UI Text
  const uiText = {
    title: language === 'id' ? 'Generate Video' : 'Generate Video',
    subtitle: language === 'id' ? 'Generate video untuk setiap segmen dengan AI voiceover' : 'Generate video for each segment with AI voiceover',
    generateAll: language === 'id' ? 'Generate Semua Video' : 'Generate All Videos',
    remaining: language === 'id' ? 'tersisa' : 'remaining',
    generating: language === 'id' ? 'Generating...' : 'Generating...',
    ready: language === 'id' ? 'Siap' : 'Ready',
    processing: language === 'id' ? 'Memproses...' : 'Processing...',
    backToDashboard: language === 'id' ? 'Sebelumnya' : 'Previous',
    next: language === 'id' ? 'Combine Video' : 'Combine Video',
    generateFirst: language === 'id' ? 'Combine Video' : 'Combine Video',
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
    dismiss: language === 'id' ? 'Lewati' : 'Skip',
    dismissed: language === 'id' ? 'Dilewati' : 'Skipped',
    total: language === 'id' ? 'Total' : 'Total',
    videosReady: language === 'id' ? 'video siap' : 'videos ready',
    rateLimitTitle: language === 'id' ? '⏳ Server Sedang Sibuk' : '⏳ Server Busy',
    rateLimitMessage: language === 'id' 
      ? 'Server AI sedang mengalami traffic tinggi. Silakan tunggu 10 menit lalu klik Retry untuk melanjutkan.'
      : 'AI server is experiencing high traffic. Please wait 10 minutes then click Retry to continue.',
    retryIn: language === 'id' ? 'Coba lagi dalam' : 'Retry in',
    minutes: language === 'id' ? 'menit' : 'minutes',
  };

  // AUTO-SYNC from database after component loads
  // This runs AFTER initial render to ensure video URLs are synced from DB
  useEffect(() => {
    if (!isLoaded || !sessionId || !user) return;
    
    const autoSyncFromDB = async () => {
      console.log('[AUTO-SYNC] 🔄 Running auto-sync after load...');
      console.log('[AUTO-SYNC] sessionId:', sessionId);
      
      try {
        const { data: jobs, error } = await supabase
          .from('video_generation_jobs')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .order('segment_number', { ascending: true });
        
        if (error) {
          console.error('[AUTO-SYNC] DB error:', error);
          return;
        }
        
        if (!jobs || jobs.length === 0) {
          console.log('[AUTO-SYNC] No jobs found');
          return;
        }
        
        console.log('[AUTO-SYNC] Found', jobs.length, 'jobs');
        jobs.forEach((j, i) => {
          console.log(`[AUTO-SYNC] Job ${i+1}: seg#${j.segment_number}, status=${j.status}, video=${j.video_url ? 'YES' : 'NO'}`);
        });
        
        // Force update segments with DB data
        setSegments(prev => {
          const updated = prev.map((seg, index) => {
            const segmentNumber = index + 1;
            const job = jobs.find(j => j.segment_number === segmentNumber);
            
            if (job && job.video_url && !seg.videoUrl) {
              console.log(`[AUTO-SYNC] ✅ Updating segment ${segmentNumber} with video URL`);
              return {
                ...seg,
                jobId: job.id,
                veoUuid: job.veo_uuid,
                videoUrl: job.video_url,
                videoError: job.status === 3 ? job.error_message : null,
                isGeneratingVideo: job.status === 1
              };
            } else if (job) {
              // Still update other fields even if video exists
              return {
                ...seg,
                jobId: job.id,
                veoUuid: job.veo_uuid || seg.veoUuid,
                videoUrl: job.video_url || seg.videoUrl,
                videoError: job.status === 3 ? job.error_message : null,
                isGeneratingVideo: job.status === 1
              };
            }
            return seg;
          });
          
          // Log final state
          const withVideo = updated.filter(s => s.videoUrl).length;
          console.log(`[AUTO-SYNC] Result: ${withVideo}/${updated.length} segments have video`);
          
          return updated;
        });
        
      } catch (err) {
        console.error('[AUTO-SYNC] Error:', err);
      }
    };
    
    // Small delay to ensure state is settled
    const timer = setTimeout(autoSyncFromDB, 300);
    return () => clearTimeout(timer);
  }, [isLoaded, sessionId, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop sequential processing
      shouldStopProcessingRef.current = true;
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
      if (checkStatusIntervalRef.current) clearInterval(checkStatusIntervalRef.current);
    };
  }, []);

  // ============================================================================
  // REALTIME SUBSCRIPTION - Listen for webhook updates from Geminigen.ai
  // ============================================================================
  useEffect(() => {
    if (!sessionId || !user) return;

    console.log('[REALTIME] Setting up subscription for session:', sessionId);

    const channel = supabase
      .channel(`video_jobs_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generation_jobs',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('[REALTIME] Job updated:', payload.new);

          const job = payload.new as {
            id: string;
            segment_id: string;
            segment_number: number;
            veo_uuid: string;
            video_url: string | null;
            status: number;
            error_message: string | null;
          };

          // Update segment state based on webhook update
          setSegments(prev => prev.map((seg, index) => {
            const segmentNumber = index + 1;
            if (segmentNumber === job.segment_number || seg.id === job.segment_id) {
              console.log(`[REALTIME] Updating segment ${segmentNumber}:`, {
                status: job.status,
                hasVideo: !!job.video_url
              });

              return {
                ...seg,
                jobId: job.id,
                veoUuid: job.veo_uuid,
                videoUrl: job.video_url || seg.videoUrl,
                videoError: job.status === 3 ? (job.error_message || 'Generation failed') : null,
                isGeneratingVideo: job.status === 1
              };
            }
            return seg;
          }));
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[REALTIME] Removing subscription');
      supabase.removeChannel(channel);
    };
  }, [sessionId, user]);

  // MANUAL FORCE SYNC - Called when user wants to refresh from DB
  const forceRefreshFromDatabase = async () => {
    if (!sessionId || !user) {
      console.log('[FORCE_REFRESH] No sessionId or user');
      return;
    }
    
    console.log('[FORCE_REFRESH] 🔄 Starting force refresh from database...');
    console.log('[FORCE_REFRESH] Session ID:', sessionId);
    
    try {
      const { data: jobs, error } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true });
      
      if (error) {
        console.error('[FORCE_REFRESH] DB error:', error);
        return;
      }
      
      console.log('[FORCE_REFRESH] Found', jobs?.length || 0, 'jobs in DB');
      
      if (!jobs || jobs.length === 0) {
        console.log('[FORCE_REFRESH] No jobs found');
        return;
      }
      
      // Log each job
      jobs.forEach((j, i) => {
        console.log(`[FORCE_REFRESH] Job ${i+1}: segment_number=${j.segment_number}, status=${j.status}, video_url=${j.video_url ? 'YES' : 'NO'}`);
        if (j.video_url) {
          console.log(`[FORCE_REFRESH]   URL: ${j.video_url}`);
        }
      });
      
      // FORCE UPDATE segments by segment_number (array index)
      setSegments(prev => {
        console.log('[FORCE_REFRESH] Current segments:', prev.length);
        
        return prev.map((seg, index) => {
          const segmentNumber = index + 1;
          const job = jobs.find(j => j.segment_number === segmentNumber);
          
          if (job) {
            console.log(`[FORCE_REFRESH] Segment ${segmentNumber}: Found job, video_url=${job.video_url ? 'YES' : 'NO'}`);
            return {
              ...seg,
              jobId: job.id,
              veoUuid: job.veo_uuid,
              videoUrl: job.video_url || null,
              videoError: job.status === 3 ? job.error_message : null,
              isGeneratingVideo: job.status === 1
            };
          } else {
            console.log(`[FORCE_REFRESH] Segment ${segmentNumber}: No matching job`);
            return seg;
          }
        });
      });
      
      console.log('[FORCE_REFRESH] ✅ Done!');
      
    } catch (err) {
      console.error('[FORCE_REFRESH] Error:', err);
    }
  };

  // Sync jobs with segments - FORCED DATABASE PRIORITY (2026)
  // Always trust database video_url over frontend state
  const syncJobsWithSegments = (jobs: any[], currentSegments: Segment[]): Segment[] => {
    console.log('[SYNC] ═══════════════════════════════════════════');
    console.log(`[SYNC] Syncing ${currentSegments.length} segments with ${jobs.length} jobs`);
    
    // Create lookup map by segment_number (most reliable key)
    const jobsByNumber = new Map<number, any>();
    jobs.forEach(j => {
      const num = j.segment_number || parseInt(j.segment_id) || 0;
      if (num > 0) jobsByNumber.set(num, j);
    });
    
    console.log(`[SYNC] Jobs by number: ${Array.from(jobsByNumber.keys()).join(', ')}`);
    
    return currentSegments.map((seg, index) => {
      const segmentNumber = index + 1;
      
      // Primary match: by segment_number
      let job = jobsByNumber.get(segmentNumber);
      
      // Fallback: by segment_id
      if (!job) {
        job = jobs.find(j => j.segment_id === seg.id);
      }
      
      // Fallback: by image_url
      if (!job && seg.imageUrl) {
        job = jobs.find(j => j.image_url === seg.imageUrl);
      }
      
      if (job) {
        const hasVideo = !!job.video_url;
        const status = job.status === 2 ? 'COMPLETED' : job.status === 1 ? 'PROCESSING' : job.status === 3 ? 'FAILED' : 'PENDING';
        
        console.log(`[SYNC] ✓ Segment ${segmentNumber} (${seg.type || seg.element}):`);
        console.log(`[SYNC]   - Job ID: ${job.id}`);
        console.log(`[SYNC]   - Status: ${status}`);
        console.log(`[SYNC]   - Video URL: ${hasVideo ? job.video_url.substring(0, 60) + '...' : 'NONE'}`);
        console.log(`[SYNC]   - UUID: ${job.veo_uuid || 'NONE'}`);
        
        return {
          ...seg,
          id: seg.id, // Keep original ID
          jobId: job.id,
          veoUuid: job.veo_uuid || seg.veoUuid,
          // FORCE video_url from database (most important!)
          videoUrl: job.video_url || null,
          videoError: job.status === JOB_STATUS.FAILED ? (job.error_message || 'Video failed') : null,
          isGeneratingVideo: job.status === JOB_STATUS.PROCESSING,
          prompt: job.prompt || seg.prompt
        };
      } else {
        console.log(`[SYNC] ✗ Segment ${segmentNumber} (${seg.type || seg.element}): NO MATCH FOUND`);
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

      // Determine content language from settings (NOT UI language)
      // Map language setting to API expected format
      const contentLanguage = settings?.language || 'indonesian';
      
      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'preview_prompts',
          segments: segmentsData,
          topic: topic,
          language: contentLanguage,
          aspect_ratio: settings?.aspectRatio || '9:16',
          environment: 'studio',
          preferred_platform: settings?.model || 'auto' // 'auto' | 'sora2' | 'veo31'
        }
      });
      
      console.log('[VideoGen] fetchVideoPrompts with language:', contentLanguage);

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

        // Set avatar info from ImageGeneration
        if (stateData.avatarOption) setAvatarOption(stateData.avatarOption);
        if (stateData.avatarId) setAvatarId(stateData.avatarId);
        if (stateData.avatarUrl) setAvatarUrl(stateData.avatarUrl);

        // Format segments
        let initialSegments: Segment[] = stateData.segments.map((seg: any) => ({
          ...seg,
          videoUrl: seg.videoUrl || null,
          veoUuid: seg.veoUuid || null,
          isGeneratingVideo: false,
          videoError: null,
        }));

        // Check existing jobs and sync video URLs - CRITICAL FOR RESUME
        const existingJobs = await checkExistingJobs(sid);
        console.log('[INIT] 🔍 checkExistingJobs returned:', existingJobs?.length || 0, 'jobs');
        
        if (existingJobs && existingJobs.length > 0) {
          console.log('[INIT] ═══════════════════════════════════════════════');
          console.log(`[INIT] Processing ${existingJobs.length} jobs from database`);
          
          // Log each job with full details
          existingJobs.forEach((j, i) => {
            const statusText = j.status === 2 ? 'COMPLETED' : j.status === 1 ? 'PROCESSING' : j.status === 3 ? 'FAILED' : 'PENDING';
            console.log(`[INIT] DB Job ${i+1}:`);
            console.log(`[INIT]   - segment_number: ${j.segment_number}`);
            console.log(`[INIT]   - segment_id: "${j.segment_id}"`);
            console.log(`[INIT]   - segment_type: ${j.segment_type}`);
            console.log(`[INIT]   - status: ${statusText} (${j.status})`);
            console.log(`[INIT]   - video_url: ${j.video_url ? 'YES - ' + j.video_url.substring(0, 60) : 'NO'}`);
          });
          
          console.log('[INIT] Frontend segments BEFORE sync:');
          initialSegments.forEach((s, i) => {
            console.log(`[INIT]   Segment ${i+1}: id="${s.id}", type=${s.type || s.element}, videoUrl=${s.videoUrl ? 'YES' : 'NO'}`);
          });
          
          // SYNC - this should update videoUrl from database
          initialSegments = syncJobsWithSegments(existingJobs, initialSegments);
          
          console.log('[INIT] Frontend segments AFTER sync:');
          initialSegments.forEach((s, i) => {
            console.log(`[INIT]   Segment ${i+1}: type=${s.type || s.element}, videoUrl=${s.videoUrl ? 'YES ✓ ' + s.videoUrl.substring(0, 40) : 'NO ✗'}, jobId=${s.jobId || 'none'}`);
          });
          console.log('[INIT] ═══════════════════════════════════════════════');
          
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
          
          // Reconstruct segments from jobs with proper type mapping
          const totalJobs = existingJobs.length;
          const reconstructedSegments: Segment[] = existingJobs.map((job: any, index: number) => {
            const segmentNumber = job.segment_number || (index + 1);
            // Map SEGMENT_X to proper type (HOOK, BODY-1, CTA, etc.)
            const mappedType = mapSegmentType(job.segment_type || '', segmentNumber, totalJobs);
            // Derive shot_type from mapped segment type
            const derivedShotType = getShotTypeFromSegmentType(mappedType);
            
            console.log(`[VideoGen] Reconstruct segment ${segmentNumber}: ${job.segment_type} → ${mappedType} (${derivedShotType})`);
            
            return {
              id: job.segment_id,
              type: mappedType,
              timing: '',
              durationSeconds: job.duration_seconds || calculateSegmentDuration(mappedType, '60s'),
              script: job.script_text || '',
              visualDirection: '',
              emotion: job.emotion || '',
              transition: '',
              shotType: derivedShotType,
              imageUrl: job.image_url,
              videoUrl: job.video_url,
              veoUuid: job.veo_uuid,
              isGeneratingVideo: job.status === JOB_STATUS.PROCESSING,
              videoError: job.status === JOB_STATUS.FAILED ? job.error_message : null,
              jobId: job.id,
              prompt: job.prompt || ''
            };
          });
          
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
          navigate('/image-generation');
        }
      } else {
        navigate('/image-generation');
      }
    };

    initializeData();
  }, [location.state, searchParams, navigate, user?.id]);

  // ============================================================================
  // CONTROLLED PARALLEL PROCESSING (2026)
  // - Max 3 videos running in parallel
  // - 60 second delay between submissions
  // - Wait for completion before starting next (after initial 3)
  // ============================================================================
  const startBackgroundProcessing = useCallback((sid: string) => {
    // Prevent multiple simultaneous processing loops
    if (isSequentialProcessingRef.current) {
      console.log('[VideoGen] Processing already running');
      return;
    }
    
    shouldStopProcessingRef.current = false;
    isSequentialProcessingRef.current = true;
    
    const STAGGER_DELAY_MS = 60000;  // 60 seconds (1 minute) between submissions
    const POLL_INTERVAL_MS = 10000;  // 10 seconds between status checks
    const MAX_PARALLEL = 3;          // Max 3 videos running at once
    const MAX_POLL_ATTEMPTS = 60;    // 10 minutes max total wait
    
    // Track active jobs being polled
    const activePollingJobs = new Map<string, { jobId: string; segmentId: string; segmentNumber: number }>(); 
    
    const processControlledParallel = async () => {
      console.log('[VideoGen] 🚀 Starting controlled parallel processing (max 3, 60s delay)...');
      
      if (!user) {
        console.error('[VideoGen] No user - aborting');
        isSequentialProcessingRef.current = false;
        return;
      }
      
      try {
        // ================================================================
        // PHASE 1: Get all PENDING jobs sorted by segment_number
        // ================================================================
        await ensureValidSession();
        const { data: pendingJobs, error: fetchError } = await supabase
          .from('video_generation_jobs')
          .select('*')
          .eq('session_id', sid)
          .eq('user_id', user.id)
          .eq('status', JOB_STATUS.PENDING)
          .order('segment_number', { ascending: true });
        
        if (fetchError) {
          console.error('[VideoGen] Failed to fetch pending jobs:', fetchError);
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          isSequentialProcessingRef.current = false;
          return;
        }
        
        if (!pendingJobs || pendingJobs.length === 0) {
          console.log('[VideoGen] No pending jobs to process');
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          isSequentialProcessingRef.current = false;
          return;
        }
        
        console.log(`[VideoGen] Found ${pendingJobs.length} pending jobs: ${pendingJobs.map(j => j.segment_type).join(' → ')}`);
        
        // ================================================================
        // PHASE 2: Submit jobs with controlled parallelism
        // - Submit up to MAX_PARALLEL initially with 60s delay between each
        // - After that, wait for one to complete before submitting next
        // ================================================================
        const jobQueue = [...pendingJobs]; // Jobs waiting to be submitted
        const completedUuids = new Set<string>();
        const failedUuids = new Set<string>();
        let totalSubmitted = 0;
        
        // Helper: Submit a single job
        const submitJob = async (job: any): Promise<{ uuid: string; jobId: string; segmentId: string; segmentNumber: number } | null> => {
          console.log(`[VideoGen] 📤 Submitting: ${job.segment_type} (segment #${job.segment_number})`);
          
          const { data, error } = await invokeWithRetry('generate-videos', {
            mode: 'process_single',
            job_id: job.id,
            session_id: sid,
            user_id: user.id
          });
          
          if (error) {
            console.error(`[VideoGen] ❌ Failed to submit ${job.segment_type}:`, error);
            setSegments(prev => prev.map(seg => 
              seg.id === job.segment_id 
                ? { ...seg, isGeneratingVideo: false, videoError: error.message || 'Submit failed' }
                : seg
            ));
            setGenerationProgress(prev => ({ ...prev, failed: prev.failed + 1, current: prev.current + 1 }));
            return null;
          }
          
          const result = data?.data;
          if (result?.job?.veo_uuid) {
            const { id: jobId, veo_uuid: uuid, segment_id: segmentId, segment_number: segmentNumber } = result.job;
            console.log(`[VideoGen] ✅ Submitted: ${job.segment_type} → UUID: ${uuid}`);
            
            // Update UI
            setSegments(prev => prev.map(seg => 
              seg.id === segmentId || seg.jobId === jobId
                ? { ...seg, veoUuid: uuid, isGeneratingVideo: true, jobId, videoProgress: 0 }
                : seg
            ));
            
            return { uuid, jobId, segmentId, segmentNumber };
          }
          
          return null;
        };
        
        // Helper: Check active jobs from database (webhook updates DB, realtime updates UI)
        // This is now just a backup check, main updates come from realtime subscription
        const pollActiveJobs = async (): Promise<boolean> => {
          if (activePollingJobs.size === 0) return false;

          const uuidsToCheck = Array.from(activePollingJobs.keys());
          console.log(`[VideoGen] 🔄 Checking ${uuidsToCheck.length} active jobs from DB...`);

          try {
            // Query database directly instead of calling check-video-status
            const { data: jobsData, error: dbError } = await supabase
              .from('video_generation_jobs')
              .select('*')
              .in('veo_uuid', uuidsToCheck);

            if (dbError) {
              console.error('[VideoGen] DB check error:', dbError);
              return false;
            }

            let anyCompleted = false;

            if (jobsData) {
              for (const videoInfo of jobsData) {
                const uuid = videoInfo.veo_uuid;
                const jobInfo = activePollingJobs.get(uuid);
                if (!jobInfo) continue;

                // Status 2 = completed
                if (videoInfo.status === 2 && videoInfo.video_url) {
                  console.log(`[VideoGen] ✅ COMPLETE: Segment ${jobInfo.segmentNumber} → ${videoInfo.video_url.substring(0, 50)}...`);

                  setSegments(prev => prev.map(seg =>
                    seg.veoUuid === uuid || seg.id === jobInfo.segmentId
                      ? { ...seg, videoUrl: videoInfo.video_url, isGeneratingVideo: false, videoError: null, videoProgress: 100 }
                      : seg
                  ));

                  setGenerationProgress(prev => ({
                    ...prev,
                    current: prev.completed + 1 + prev.failed,
                    completed: prev.completed + 1
                  }));

                  completedUuids.add(uuid);
                  activePollingJobs.delete(uuid);
                  anyCompleted = true;
                }
                // Status 3 = failed
                else if (videoInfo.status === 3) {
                  console.log(`[VideoGen] ❌ FAILED: Segment ${jobInfo.segmentNumber} - ${videoInfo.error_message}`);

                  setSegments(prev => prev.map(seg =>
                    seg.veoUuid === uuid || seg.id === jobInfo.segmentId
                      ? { ...seg, isGeneratingVideo: false, videoError: videoInfo.error_message || 'Generation failed', videoProgress: 0 }
                      : seg
                  ));

                  setGenerationProgress(prev => ({
                    ...prev,
                    current: prev.completed + prev.failed + 1,
                    failed: prev.failed + 1
                  }));

                  if (videoInfo.error_message?.includes('RATE_LIMIT') || videoInfo.error_message?.includes('high traffic')) {
                    setRateLimitWarning(new Date().toISOString());
                  }

                  failedUuids.add(uuid);
                  activePollingJobs.delete(uuid);
                  anyCompleted = true; // Treat as "slot freed"
                }
                // Status 1 = still processing
                else {
                  const progress = videoInfo.status_percentage || 0;
                  console.log(`[VideoGen] ⏳ Segment ${jobInfo.segmentNumber}: ${progress}%`);
                  
                  setSegments(prev => prev.map(seg => 
                    seg.veoUuid === uuid || seg.id === jobInfo.segmentId
                      ? { ...seg, videoProgress: progress, isGeneratingVideo: true }
                      : seg
                  ));
                }
              }
            }
            
            return anyCompleted;
          } catch (err) {
            console.error('[VideoGen] Poll error:', err);
            return false;
          }
        };
        
        // ================================================================
        // MAIN LOOP: Submit with controlled parallelism
        // ================================================================
        while ((jobQueue.length > 0 || activePollingJobs.size > 0) && !shouldStopProcessingRef.current) {
          
          // Submit new jobs if we have capacity and jobs in queue
          while (jobQueue.length > 0 && activePollingJobs.size < MAX_PARALLEL && !shouldStopProcessingRef.current) {
            const job = jobQueue.shift()!;
            const submitted = await submitJob(job);
            
            if (submitted) {
              activePollingJobs.set(submitted.uuid, {
                jobId: submitted.jobId,
                segmentId: submitted.segmentId,
                segmentNumber: submitted.segmentNumber
              });
              totalSubmitted++;
              
              // Wait 60s before submitting next (if more jobs in queue and we have capacity)
              if (jobQueue.length > 0 && activePollingJobs.size < MAX_PARALLEL && !shouldStopProcessingRef.current) {
                console.log(`[VideoGen] ⏳ Waiting 60s before next submission... (${activePollingJobs.size}/${MAX_PARALLEL} active)`);
                await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS));
              }
            }
          }
          
          // If we have MAX_PARALLEL running or queue empty, poll and wait for completion
          if (activePollingJobs.size > 0) {
            const anyCompleted = await pollActiveJobs();
            
            // If nothing completed and we still have active jobs, wait before next poll
            if (!anyCompleted && activePollingJobs.size > 0 && !shouldStopProcessingRef.current) {
              await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            }
            // If something completed and we have more jobs, the next iteration will submit
          }
        }
        
        // ================================================================
        // DONE
        // ================================================================
        console.log(`[VideoGen] 🎉 Processing complete! Submitted: ${totalSubmitted}, Completed: ${completedUuids.size}, Failed: ${failedUuids.size}`);
        
      } catch (err) {
        console.error('[VideoGen] Fatal processing error:', err);
      } finally {
        setIsGeneratingAll(false);
        setIsBackgroundMode(false);
        setShowBackgroundToast(false);
        isSequentialProcessingRef.current = false;
        console.log('[VideoGen] Processing ended');
      }
    };
    
    // Start processing
    processControlledParallel();
  }, [user, language]);

  // Poll VEO status and update completed videos
  const startStatusPolling = useCallback((sid: string) => {
    if (checkStatusIntervalRef.current) return; // Already polling
    
    const checkStatus = async () => {
      if (!user) return;
      
      try {
        // Use invokeWithRetry for session refresh and retry logic
        const { data, error } = await invokeWithRetry('generate-videos', {
          mode: 'check_and_update',
          session_id: sid,
          user_id: user.id
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
                  videoProgress: job.status_percentage || seg.videoProgress || 0,
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
    
    // Check immediately, then every 15 seconds
    checkStatus();
    checkStatusIntervalRef.current = setInterval(checkStatus, 15000);
  }, [user]);

  // Generate all videos with background job system
  const handleGenerateAllBackground = async () => {
    if (!user || !sessionId) return;
    
    const segmentsToGenerate = segments.filter(s => !s.videoUrl && s.imageUrl);
    if (segmentsToGenerate.length === 0) return;

    // CRITICAL: Stop any existing processing loop and reset refs
    // This fixes the bug where loop stops after 1 video when retrying
    console.log('[VideoGen] Stopping any existing processing loop...');
    shouldStopProcessingRef.current = true;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for loop to stop
    isSequentialProcessingRef.current = false; // Reset ref to allow new loop
    shouldStopProcessingRef.current = false; // Reset stop flag

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setRateLimitWarning(null); // Clear any previous warnings
    
    // Calculate initial progress based on already completed videos
    const alreadyCompleted = segments.filter(s => s.videoUrl).length;
    setGenerationProgress({ 
      current: alreadyCompleted, 
      total: segments.length, 
      completed: alreadyCompleted, 
      failed: 0 
    });

    try {
      // Ensure session is valid before database operations
      await ensureValidSession();
      
      // IMPORTANT: First reset any FAILED jobs back to PENDING so they get processed
      // This handles the case where user clicks "Generate All" after some jobs failed
      const { error: resetError } = await supabase
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
      
      if (resetError) {
        console.warn('[VideoGen] Failed to reset failed jobs:', resetError);
      } else {
        console.log('[VideoGen] Reset any failed jobs to pending');
        // Update local state to clear errors
        setSegments(prev => prev.map(seg => 
          seg.videoError ? { ...seg, videoError: null, isGeneratingVideo: false, veoUuid: null } : seg
        ));
      }

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

      // Determine content language from settings (NOT UI language)
      const contentLanguage = videoSettings?.language || 'indonesian';
      console.log('[VideoGen] Creating jobs with language:', contentLanguage);
      
      // Create jobs in database (with retry for network errors)
      const { data, error } = await invokeWithRetry('generate-videos', {
        mode: 'create_jobs',
        user_id: user.id,
        session_id: sessionId,
        segments: segmentsData,
        topic: currentTopic,
        language: contentLanguage,
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        resolution: videoSettings?.resolution || '1080p',
        preferred_platform: videoSettings?.model || 'auto', // 'auto' | 'sora2' | 'veo31'
        // Avatar info for voice prompt retrieval
        avatar_selection: avatarOption === 'saved' ? 'saved' : avatarOption === 'profile' ? 'use_profile' : 'no_avatar',
        avatar_id: avatarId,
        profile_image_url: avatarUrl
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

      // Reset processing flag before starting (in case it's stuck from previous run)
      isSequentialProcessingRef.current = false;

      // Check how many pending jobs exist
      const pendingCount = data?.data?.jobs?.filter((j: any) => j.status === 0).length || 0;
      console.log(`[VideoGen] Jobs ready, ${pendingCount} pending. Starting processing...`);

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
      // Determine content language from settings
      const contentLanguage = videoSettings?.language || 'indonesian';
      
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
          language: contentLanguage,
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          resolution: videoSettings?.resolution || '1080p', // Default to 1080p Full HD
          session_id: sessionId,
          user_id: user.id
        }
      });

      if (error) throw error;

      const jobData = data?.data?.videos?.[0];
      const veoUuid = jobData?.veo_response?.uuid;

      if (!veoUuid) throw new Error('No UUID returned from VEO');

      // Update segment with UUID - realtime subscription will handle the rest
      // when webhook updates the database, UI will auto-update
      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId ? { ...seg, veoUuid, isGeneratingVideo: true } : seg
        )
      );

      console.log(`[VideoGen] Video job submitted, UUID: ${veoUuid}. Waiting for webhook...`);
      // No polling needed - realtime subscription will update UI when webhook fires

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

  // Retry failed jobs (reset status to pending)
  const handleRetryFailedJobs = async () => {
    if (!user || !sessionId) return;
    
    // Stop any existing processing first
    shouldStopProcessingRef.current = true;
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for loop to stop
    
    try {
      // Ensure session is valid before database operations
      await ensureValidSession();
      
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
      
      // Reset rate limit warning
      setRateLimitWarning(null);
      
      // Restart background processing
      isSequentialProcessingRef.current = false; // Allow new loop to start
      setIsBackgroundMode(true);
      setShowBackgroundToast(true);
      startBackgroundProcessing(sessionId);
      
      console.log('[VideoGen] Retry: Reset failed jobs to pending');
    } catch (err) {
      console.error('Error retrying failed jobs:', err);
    }
  };

  // Dismiss/Skip a failed segment from the final video
  const handleDismissSegment = (segmentId: string) => {
    setSegments(prev => prev.map(seg => 
      seg.id === segmentId 
        ? { ...seg, isDismissed: true, videoError: null }
        : seg
    ));
    console.log(`[VideoGen] Dismissed segment ${segmentId}`);
  };

  // Undo dismiss - restore segment
  const handleUndoDismiss = (segmentId: string) => {
    setSegments(prev => prev.map(seg => 
      seg.id === segmentId 
        ? { ...seg, isDismissed: false }
        : seg
    ));
    console.log(`[VideoGen] Restored segment ${segmentId}`);
  };

  const handleBackToDashboard = () => {
    // Navigate back to image-generation (previous step)
    navigate("/image-generation", {
      state: {
        sessionId,
        segments,
        topic: currentTopic,
        videoSettings,
        returning: true
      }
    });
  };

  const handleNext = () => {
    // Filter out dismissed segments for navigation
    const activeSegs = segments.filter(s => !s.isDismissed);
    const allHaveVideos = activeSegs.length > 0 && activeSegs.every(seg => seg.videoUrl);
    
    console.log('[VideoGen] handleNext called, allHaveVideos:', allHaveVideos);
    console.log('[VideoGen] Active segments:', activeSegs.length, 'Dismissed:', segments.length - activeSegs.length);
    console.log('[VideoGen] Segments with videoUrl:', activeSegs.map(s => ({ id: s.id, type: s.type, hasVideo: !!s.videoUrl })));
    
    if (!allHaveVideos) {
      alert(language === 'id' ? 'Harap generate semua video terlebih dahulu.' : 'Please generate videos for all segments before proceeding.');
      return;
    }

    // Go directly to full-video with combine process (only active segments)
    const navigationState = {
      segments: activeSegs,
      selectedSegments: activeSegs, // Also pass as selectedSegments for compatibility
      selectedMusic: null,
      topic: currentTopic,
      sessionId,
      videoSettings
    };
    console.log('[VideoGen] Navigating to /full-video with state:', navigationState);
    
    // Save to sessionStorage as backup (in case location.state is lost)
    sessionStorage.setItem('fullVideoState', JSON.stringify(navigationState));
    console.log('[VideoGen] Saved state to sessionStorage');

    // Clear video generation session persistence since we're moving to next step
    clearSessionPersistence();

    navigate("/full-video", { state: navigationState });
  };

  // Filter out dismissed segments for counting
  const activeSegments = segments.filter(s => !s.isDismissed);
  const totalDuration = activeSegments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
  const videosGenerated = activeSegments.filter(s => s.videoUrl).length;
  const allHaveVideos = activeSegments.length > 0 && activeSegments.every(seg => seg.videoUrl);

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

  // Helper: Get effective video model for a segment
  const getEffectiveModel = (segmentId: string): 'veo-3.1-hd' | 'veo-3.1-fast' => {
    // Per-segment override takes priority
    if (segmentModelOverrides[segmentId]) {
      return segmentModelOverrides[segmentId];
    }
    // Then use video settings from earlier selection
    if (videoSettings?.model === 'veo-3.1-fast') return 'veo-3.1-fast';
    // Default to VEO 3.1 HD
    return 'veo-3.1-hd';
  };

  // Helper: Get model display name
  const getModelDisplayName = (model: 'veo-3.1-hd' | 'veo-3.1-fast'): string => {
    return model === 'veo-3.1-fast' ? 'VEO 3.1 Fast' : 'VEO 3.1 HD';
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

  // Download helper functions
  const handleDownloadImage = async (imageUrl: string, segmentType: string, segmentId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${segmentType}_${segmentId}_image.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Image download failed:', err);
      window.open(imageUrl, '_blank');
    }
  };

  const handleDownloadVideo = async (videoUrl: string, segmentType: string, segmentId: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${segmentType}_${segmentId}_video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Video download failed:', err);
      window.open(videoUrl, '_blank');
    }
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
    <div className="min-h-screen bg-[#0a0a12] p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
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
                {videosGenerated}/{activeSegments.length} {uiText.videosReady}
                {segments.length !== activeSegments.length && (
                  <span className="text-gray-400 ml-1">
                    ({segments.length - activeSegments.length} {language === 'id' ? 'dilewati' : 'skipped'})
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Global Model Selector + Generate All Button */}
        {!allHaveVideos && (
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            {/* Global Model Selector */}
            <div className="flex items-center gap-2 bg-[#1a1a24] border border-[#2b2b38] rounded-xl px-4 py-3">
              <Video className="w-4 h-4 text-purple-400" />
              <label className="text-sm text-gray-400 whitespace-nowrap">
                {language === 'id' ? 'Model:' : 'Model:'}
              </label>
              <select
                value={videoSettings?.model || 'auto'}
                onChange={(e) => {
                  const newModel = e.target.value as 'auto' | 'veo-3.1-hd' | 'veo-3.1-fast';
                  setVideoSettings(prev => prev
                    ? { ...prev, model: newModel }
                    : { duration: '60s', aspectRatio: '9:16', resolution: '1080p', model: newModel }
                  );
                  // Reset all per-segment overrides when global model changes
                  setSegmentModelOverrides({});
                }}
                className="bg-[#0a0a12] border border-[#3b3b4f] rounded-lg px-3 py-1.5 text-white text-sm cursor-pointer hover:border-[#7c3aed] focus:border-[#7c3aed] focus:outline-none transition-colors"
              >
                <option value="auto">Auto (VEO 3.1 HD)</option>
                <option value="veo-3.1-hd">VEO 3.1 HD ($0.50)</option>
                <option value="veo-3.1-fast">VEO 3.1 Fast ($0.19)</option>
              </select>
            </div>

            {/* Generate All Button */}
            <Button
              onClick={handleGenerateAllBackground}
              disabled={isGeneratingAll || isBackgroundMode}
              className={`flex-1 h-14 font-medium ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment, index) => (
            <div 
              key={segment.id} 
              className={`bg-[#1a1a24] border rounded-2xl overflow-hidden transition-all ${
                segment.isDismissed 
                  ? 'border-gray-500/30 opacity-50' 
                  : segment.videoUrl 
                    ? 'border-green-500/50' 
                    : 'border-[#2b2b38]'
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
                  <span className="text-white/40 text-xs">{segment.durationSeconds}s</span>
                </div>
                {segment.isDismissed ? (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <X className="w-3 h-3" />
                    {uiText.dismissed}
                  </div>
                ) : segment.videoUrl ? (
                  <div className="flex items-center gap-1 text-green-500 text-xs" title={segment.videoUrl}>
                    <CheckCircle2 className="w-3 h-3" />
                    {uiText.ready}
                    {/* DEBUG: Show URL snippet */}
                    <span className="text-[8px] text-white/30 ml-1 max-w-[60px] truncate">
                      {segment.videoUrl?.includes('supabase') ? '✓SB' : segment.videoUrl?.substring(0, 15)}
                    </span>
                  </div>
                ) : segment.videoError ? (
                  <div className="flex items-center gap-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </div>
                ) : segment.isGeneratingVideo ? (
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {segment.videoProgress && segment.videoProgress > 0 
                      ? `${segment.videoProgress}%`
                      : uiText.processing
                    }
                  </div>
                ) : segment.veoUuid ? (
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {segment.videoProgress && segment.videoProgress > 0 
                      ? `${segment.videoProgress}%`
                      : uiText.processing
                    }
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
                        {/* Hover overlay with actions */}
                        <div 
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"
                        >
                          <button
                            onClick={() => setPreviewImage(segment.imageUrl)}
                            className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"
                            title="Preview"
                          >
                            <Maximize2 className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (segment.imageUrl) handleDownloadImage(segment.imageUrl, segment.type || segment.element || 'segment', segment.id);
                            }}
                            className="p-2 bg-green-600 rounded-lg"
                            title="Download Image"
                          >
                            <Download className="w-4 h-4 text-white" />
                          </button>
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

                      {/* Video Model Selector - only show before video is generated */}
                      {!segment.videoUrl && !segment.isGeneratingVideo && (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={getEffectiveModel(segment.id)}
                            onChange={(e) => {
                              const newModel = e.target.value as 'veo-3.1-hd' | 'veo-3.1-fast';
                              setSegmentModelOverrides(prev => ({
                                ...prev,
                                [segment.id]: newModel
                              }));
                            }}
                            className="bg-[#0a0a12] border border-[#3b3b4f] rounded px-2 py-1 text-white text-[10px] cursor-pointer hover:border-[#7c3aed] focus:border-[#7c3aed] focus:outline-none transition-colors"
                          >
                            <option value="veo-3.1-hd">VEO 3.1 HD ($0.50)</option>
                            <option value="veo-3.1-fast">VEO 3.1 Fast ($0.19)</option>
                          </select>
                        </div>
                      )}

                      {/* Show selected model badge after video is generated */}
                      {segment.videoUrl && (
                        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded">
                          <Video className="w-3 h-3" />
                          <span>{getModelDisplayName(getEffectiveModel(segment.id))}</span>
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
                        <div className="bg-[#0a0a12] rounded-lg p-3">
                          {/* Progress Bar with Percentage */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-white/60 text-xs">
                                  {language === 'id' ? 'Generating...' : 'Generating...'}
                                </span>
                                <span className="text-[#7c3aed] text-xs font-medium">
                                  {segment.videoProgress || 0}%
                                </span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${segment.videoProgress || 0}%` }}
                                />
                              </div>
                            </div>
                            <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin flex-shrink-0" />
                          </div>
                          {/* Estimated time hint */}
                          {(segment.videoProgress || 0) > 0 && (segment.videoProgress || 0) < 100 && (
                            <p className="text-white/40 text-[10px] mt-1.5 text-center">
                              {(segment.videoProgress || 0) < 30 
                                ? (language === 'id' ? 'Memulai render...' : 'Starting render...')
                                : (segment.videoProgress || 0) < 70
                                  ? (language === 'id' ? 'Memproses video...' : 'Processing video...')
                                  : (language === 'id' ? 'Hampir selesai...' : 'Almost done...')
                              }
                            </p>
                          )}
                        </div>
                      ) : segment.isDismissed ? (
                        <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <X className="w-4 h-4 flex-shrink-0" />
                            <span>{uiText.dismissed}</span>
                          </div>
                          <Button
                            onClick={() => handleUndoDismiss(segment.id)}
                            size="sm"
                            variant="outline"
                            className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            {language === 'id' ? 'Kembalikan' : 'Restore'}
                          </Button>
                        </div>
                      ) : segment.videoError ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{segment.videoError}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRegenerateVideo(segment.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              {uiText.retry}
                            </Button>
                            <Button
                              onClick={() => handleDismissSegment(segment.id)}
                              size="sm"
                              variant="outline"
                              className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              {uiText.dismiss}
                            </Button>
                          </div>
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
                            onClick={() => {
                              if (segment.videoUrl) handleDownloadVideo(segment.videoUrl, segment.type || segment.element || 'segment', segment.id);
                            }}
                            variant="outline"
                            className="border-green-500/50 bg-green-600 hover:bg-green-700 text-white"
                            title="Download Video"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleRegenerateVideo(segment.id)}
                            variant="outline"
                            disabled={isBackgroundMode}
                            className="border-[#2b2b38] bg-white hover:bg-white/80"
                            title="Regenerate"
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
              `${uiText.generateFirst} (${videosGenerated}/${activeSegments.length})`
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
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (previewVideo) handleDownloadVideo(previewVideo, 'preview', Date.now().toString());
              }}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              title="Download Video"
            >
              <Download className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setPreviewVideo(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
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
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (previewImage) handleDownloadImage(previewImage, 'preview', Date.now().toString());
              }}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              title="Download Image"
            >
              <Download className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
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
