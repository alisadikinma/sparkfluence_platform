import { apiEndpoints, API_KEY } from "../../lib/api";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePlanner } from "../../contexts/PlannerContext";
import { supabase } from "../../lib/supabase";
import {
  Clock, Video, Play, Trash2, X,
  CheckCircle, AlertCircle, Loader2, Image as ImageIcon,
  Calendar, Download, Globe, Monitor, Cpu, FileText, Wrench, Film,
  Save
} from "lucide-react";
import { Button } from "../../components/ui/button";

interface VideoJob {
  id: string;
  session_id: string;
  segment_id: string;
  segment_type: string;
  veo_uuid: string | null;
  status: number; // 0=pending, 1=processing, 2=completed, 3=failed
  video_url: string | null;
  image_url: string | null;
  script_text: string | null;
  topic: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  // Metadata fields
  language?: string;
  resolution?: string;
  preferred_platform?: string;
  duration_seconds?: number;
  // Final video fields (from migration)
  final_video_url?: string | null;
  has_subtitles?: boolean;
}

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

interface ProjectGroup {
  session_id: string;
  topic_title: string;
  segments: VideoJob[];
  total_segments: number;
  images_ready: number;
  videos_ready: number;
  videos_failed: number;
  videos_processing: number;
  videos_pending: number;
  is_complete: boolean;
  has_failed: boolean;
  is_processing: boolean;
  status_text: string;
  created_at: string;
  updated_at: string;
  planned_content_id?: string;
  final_video_url?: string;
  thumbnail_url?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  platforms?: string[];
  description?: string;
  // Metadata
  language?: string;
  resolution?: string;
  model?: string;
  total_duration_seconds: number;
  has_subtitles?: boolean;
}

type TabType = 'all' | 'drafts' | 'completed';

// Backend API imported from centralized config
// See src/lib/api.ts for configuration

export const History = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { addPlannedContent, updatePlannedContent } = usePlanner();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectGroup | null>(null);

  // New states for actions
  const [isRepairing, setIsRepairing] = useState(false);
  const [isCombining, setIsCombining] = useState(false);
  const [isAddingSubtitle, setIsAddingSubtitle] = useState(false);
  const [subtitleProgress, setSubtitleProgress] = useState(0);
  const [subtitleStep, setSubtitleStep] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Schedule form states
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [schedulePlatforms, setSchedulePlatforms] = useState<string[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Get locale for date formatting
  const getLocale = () => {
    const localeMap: Record<string, string> = {
      'id': 'id-ID',
      'en': 'en-US',
      'hi': 'hi-IN',
    };
    return localeMap[language] || 'en-US';
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[History] Fetching projects for user:', user.id);
      
      // Fetch video generation jobs with metadata (including final_video_url)
      const { data: videoJobs, error: videoError } = await supabase
        .from("video_generation_jobs")
        .select("*, language, resolution, preferred_platform, duration_seconds, final_video_url, has_subtitles")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (videoError) throw videoError;
      
      console.log('[History] Video jobs loaded:', videoJobs?.length || 0);

      // Fetch image generation jobs with full details
      const { data: imageJobs } = await supabase
        .from("image_generation_jobs")
        .select("id, session_id, segment_id, segment_type, topic, status, image_url, script_text, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      console.log('[History] Image jobs loaded:', imageJobs?.length || 0);

      // Create image jobs map by session_id - with full job data
      const imageJobsMap = new Map<string, { topic: string | null; hasImages: boolean }>();
      const imageJobsBySession = new Map<string, any[]>();
      if (imageJobs && Array.isArray(imageJobs)) {
        imageJobs.forEach((job: any) => {
          // Skip invalid jobs
          if (!job || !job.session_id) return;
          
          // Group full job data by session
          const existingJobs = imageJobsBySession.get(job.session_id) || [];
          existingJobs.push(job);
          imageJobsBySession.set(job.session_id, existingJobs);
          
          // Also maintain simple map for topic lookup
          const existing = imageJobsMap.get(job.session_id);
          if (!existing) {
            imageJobsMap.set(job.session_id, { 
              topic: job.topic || null, 
              hasImages: !!job.image_url 
            });
          } else if (job.topic && !existing.topic) {
            existing.topic = job.topic;
          }
        });
      }

      // Fetch planned content to get final video URLs and other details
      const { data: plannedData } = await supabase
        .from("planned_content")
        .select("id, title, video_data, final_video_url, thumbnail_url, scheduled_date, scheduled_time, platforms, description")
        .eq("user_id", user.id);

      // Map session IDs to planned content - with null safety
      const sessionToPlanned = new Map<string, any>();
      if (plannedData && Array.isArray(plannedData)) {
        plannedData.forEach(p => {
          // Support both camelCase and snake_case for session_id
          const sessionId = p?.video_data?.sessionId || p?.video_data?.session_id;
          if (p && sessionId) {
            sessionToPlanned.set(sessionId, p);
          }
        });
      }

      if (videoJobs && videoJobs.length > 0) {
        // Group by session_id - with null safety
        const sessionMap = new Map<string, VideoJob[]>();
        videoJobs.forEach((job: any) => {
          // Skip invalid jobs - check ALL required fields
          if (!job || !job.session_id || typeof job.status !== 'number') {
            console.warn('[History] Skipping invalid job:', job?.id, 'status:', job?.status);
            return;
          }
          const existing = sessionMap.get(job.session_id) || [];
          existing.push(job);
          sessionMap.set(job.session_id, existing);
        });

        const projectList: ProjectGroup[] = [];
        sessionMap.forEach((segments, sessionId) => {
          try {
          // Filter out any null/undefined segments and ensure status exists
          const validSegments = segments.filter(s => s && typeof s.status === 'number');
          
          if (validSegments.length === 0) {
            console.warn('[History] No valid segments for session:', sessionId);
            return; // Skip this session entirely
          }
          
          const imagesReady = validSegments.filter(s => s.image_url).length;
          // videosReady = has video_url (actual video file exists)
          const videosReady = validSegments.filter(s => s.video_url).length;
          const videosFailed = validSegments.filter(s => s.status === JOB_STATUS.FAILED).length;
          const videosProcessing = validSegments.filter(s => s.status === JOB_STATUS.PROCESSING).length;
          const videosPending = validSegments.filter(s => s.status === JOB_STATUS.PENDING).length;
          const hasFailed = videosFailed > 0 && videosProcessing === 0 && videosPending === 0;
          const isProcessing = videosProcessing > 0 || (videosPending > 0 && videosReady > 0);
          const planned = sessionToPlanned.get(sessionId);

          // Get final_video_url - combined video with subtitles
          const jobFinalVideoUrl = validSegments.find(s => s.final_video_url)?.final_video_url;
          const plannedFinalVideoUrl = planned?.final_video_url;
          const hasFinalVideo = !!(jobFinalVideoUrl || plannedFinalVideoUrl);

          // isComplete (Published) = has final_video_url (combined video exists)
          // NOT just all segments have video_url - that's just "Videos Ready"
          const isComplete = hasFinalVideo;

          // Debug: Log completion status
          console.log(`[History] Session ${sessionId.slice(0,8)}: total=${validSegments.length}, videosReady=${videosReady}, hasFinalVideo=${hasFinalVideo}, isComplete=${isComplete}`);

          // Get topic from multiple sources with proper empty string handling
          const topicFromJob = validSegments[0]?.topic?.trim();
          const topicFromImageJob = imageJobsMap.get(sessionId)?.topic?.trim();
          const topicFromPlannedData = planned?.video_data?.topic?.trim();
          const topicFromPlannedTitle = planned?.title?.trim();
          const topicFromScript = validSegments[0]?.script_text?.split('\n')[0]?.slice(0, 60)?.trim();

          // Also check localStorage for saved progress (backup source)
          let topicFromLocalStorage: string | null = null;
          try {
            const savedProgress = localStorage.getItem(`sparkfluence_video_progress_${sessionId}`);
            if (savedProgress) {
              const parsed = JSON.parse(savedProgress);
              if (parsed.topic && parsed.topic !== 'Your Video' && parsed.topic.trim().length > 0) {
                topicFromLocalStorage = parsed.topic.trim();
              }
            }
          } catch (e) {
            // Ignore localStorage errors
          }

          // Priority: plannedTitle > localStorage > job topics > script text > fallback
          const topicTitle = (topicFromPlannedTitle && topicFromPlannedTitle.length > 0)
            ? topicFromPlannedTitle
            : (topicFromLocalStorage && topicFromLocalStorage.length > 0)
              ? topicFromLocalStorage
              : (topicFromJob && topicFromJob.length > 0)
                ? topicFromJob
                : (topicFromImageJob && topicFromImageJob.length > 0)
                  ? topicFromImageJob
                  : (topicFromPlannedData && topicFromPlannedData.length > 0)
                    ? topicFromPlannedData
                    : (topicFromScript && topicFromScript.length > 0)
                      ? topicFromScript
                      : `Project ${sessionId.slice(0, 8)}`;

          console.log(`[History] Session ${sessionId.slice(0,8)}: plannedTitle="${topicFromPlannedTitle}", localStorage="${topicFromLocalStorage}", job="${topicFromJob}", imageJob="${topicFromImageJob}", final="${topicTitle}"`);

          // Get metadata from first segment OR from planned_content.video_data
          const firstSeg = validSegments[0];
          const videoData = planned?.video_data || {};
          
          // Normalize language: handle both short ('id') and long ('indonesian') formats
          const normalizeLanguage = (lang: string | undefined): string => {
            if (!lang) return 'id';
            const langLower = lang.toLowerCase();
            // Map long format to short format
            if (langLower === 'indonesian') return 'id';
            if (langLower === 'english') return 'en';
            if (langLower === 'hindi') return 'hi';
            // Already short format or unknown
            return langLower;
          };
          
          // Try segment first, then video_data (multiple possible locations), then defaults
          const rawLanguage = firstSeg?.language 
            || videoData?.language 
            || videoData?.videoSettings?.language
            || videoData?.settings?.language;
          const projectLanguage = normalizeLanguage(rawLanguage);
          const projectResolution = firstSeg?.resolution || videoData?.resolution || '1080p';
          const projectModel = firstSeg?.preferred_platform || videoData?.model || 'veo31';
          const segmentDuration = firstSeg?.duration_seconds || videoData?.duration_seconds || 8;
          const totalDuration = validSegments.length * segmentDuration;

          // Note: jobFinalVideoUrl and plannedFinalVideoUrl already computed above for isComplete
          const jobHasSubtitles = validSegments.some(s => s.has_subtitles);
          const allVideosReady = videosReady === validSegments.length && validSegments.length > 0;

          // Calculate status text - PRIORITY: Published > Videos Ready > Processing > Failed > stages
          let statusText = '';
          const allImagesReady = imagesReady === validSegments.length;

          if (isComplete) {
            // Has final_video_url - fully published
            statusText = t.common.done || 'Published';
          } else if (allVideosReady) {
            // All segment videos ready but not combined yet
            statusText = language === 'id' ? 'Video Siap' : 'Videos Ready';
          } else if (isProcessing) {
            // Show processing status with progress
            statusText = `${t.videoEditor?.status?.processing || 'Processing'} ${videosReady}/${validSegments.length}`;
          } else if (hasFailed) {
            statusText = `${videosFailed} ${t.common.failed || 'failed'}`;
          } else if (!allImagesReady) {
            // Still generating images
            statusText = `${t.videoEditor?.status?.images || 'Images'} ${imagesReady}/${validSegments.length}`;
          } else if (videosReady === 0) {
            // All images ready, no videos yet
            statusText = language === 'id' ? 'Gambar Siap' : 'Images Ready';
          } else {
            // Videos in progress (some ready, some not)
            statusText = `${t.videoEditor?.status?.videos || 'Videos'} ${videosReady}/${validSegments.length}`;
          }

          projectList.push({
            session_id: sessionId,
            topic_title: topicTitle,
            segments: validSegments.sort((a, b) => {
              const aId = parseInt(a.segment_id) || 0;
              const bId = parseInt(b.segment_id) || 0;
              return aId - bId;
            }),
            total_segments: validSegments.length,
            images_ready: imagesReady,
            videos_ready: videosReady,
            videos_failed: videosFailed,
            videos_processing: videosProcessing,
            videos_pending: videosPending,
            is_complete: isComplete,
            has_failed: hasFailed,
            is_processing: isProcessing,
            status_text: statusText,
            created_at: validSegments[0]?.created_at || new Date().toISOString(),
            updated_at: validSegments[0]?.updated_at || new Date().toISOString(),
            planned_content_id: planned?.id,
            final_video_url: jobFinalVideoUrl || plannedFinalVideoUrl || undefined,
            thumbnail_url: planned?.thumbnail_url || validSegments.find(s => s.image_url)?.image_url,
            scheduled_date: planned?.scheduled_date,
            scheduled_time: planned?.scheduled_time,
            platforms: planned?.platforms || [],
            description: planned?.description,
            // Metadata
            language: projectLanguage,
            resolution: projectResolution,
            model: projectModel,
            total_duration_seconds: totalDuration,
            has_subtitles: jobHasSubtitles
          });
          } catch (sessionErr) {
            console.warn('[History] Error processing session:', sessionId, sessionErr);
            // Continue with other sessions - don't crash the entire page
          }
        });

        // Sort by updated_at
        projectList.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        // Also add image-only sessions (sessions with images but no video jobs)
        const videoSessionIds = new Set(sessionMap.keys());
        imageJobsBySession.forEach((imgJobs, sessionId) => {
          // Skip if this session already has video jobs
          if (videoSessionIds.has(sessionId)) return;

          try {
            const validImgJobs = imgJobs.filter((j: any) => j && typeof j.status === 'number');
            if (validImgJobs.length === 0) return;

            const planned = sessionToPlanned.get(sessionId);

            // Get topic from multiple sources with proper empty string handling
            const topicFromJob = validImgJobs[0]?.topic?.trim();
            const topicFromPlanned = planned?.title?.trim() || planned?.video_data?.topic?.trim();
            const topicFromScript = validImgJobs[0]?.script_text?.split('\n')[0]?.slice(0, 60)?.trim();

            // Also check localStorage for saved progress (backup source for image-only projects)
            let topicFromLocalStorage: string | null = null;
            try {
              const savedProgress = localStorage.getItem(`sparkfluence_video_progress_${sessionId}`);
              if (savedProgress) {
                const parsed = JSON.parse(savedProgress);
                if (parsed.topic && parsed.topic !== 'Your Video' && parsed.topic.trim().length > 0) {
                  topicFromLocalStorage = parsed.topic.trim();
                }
              }
            } catch (e) {
              // Ignore localStorage errors
            }

            // Priority: plannedTitle > localStorage > job topic > script text > fallback
            const topicTitle = (topicFromPlanned && topicFromPlanned.length > 0)
              ? topicFromPlanned
              : (topicFromLocalStorage && topicFromLocalStorage.length > 0)
                ? topicFromLocalStorage
                : (topicFromJob && topicFromJob.length > 0)
                  ? topicFromJob
                  : (topicFromScript && topicFromScript.length > 0)
                    ? topicFromScript
                    : `Project ${sessionId.slice(0, 8)}`;

            console.log(`[History-ImageOnly-A] Session ${sessionId.slice(0,8)}: planned="${topicFromPlanned}", localStorage="${topicFromLocalStorage}", job="${topicFromJob}", final="${topicTitle}"`);

            // Calculate image stats
            const imagesCompleted = validImgJobs.filter((j: any) => j.status === JOB_STATUS.COMPLETED && j.image_url).length;
            const imagesFailed = validImgJobs.filter((j: any) => j.status === JOB_STATUS.FAILED).length;
            const imagesProcessing = validImgJobs.filter((j: any) => j.status === JOB_STATUS.PROCESSING).length;
            const imagesPending = validImgJobs.filter((j: any) => j.status === JOB_STATUS.PENDING).length;
            
            // Status text for image-only projects
            let statusText = '';
            if (imagesProcessing > 0) {
              statusText = `${t.videoEditor?.status?.processing || 'Processing'} ${imagesCompleted}/${validImgJobs.length}`;
            } else if (imagesFailed > 0 && imagesPending === 0) {
              statusText = `${imagesFailed} ${t.common?.failed || 'failed'}`;
            } else if (imagesCompleted === validImgJobs.length) {
              statusText = language === 'id' ? 'Gambar Siap' : 'Images Ready';
            } else {
              statusText = `${t.videoEditor?.status?.images || 'Images'} ${imagesCompleted}/${validImgJobs.length}`;
            }
            
            // Convert image jobs to VideoJob-like segments for compatibility
            const segments: VideoJob[] = validImgJobs.map((j: any) => ({
              id: j.id,
              session_id: j.session_id,
              segment_id: j.segment_id || '0',
              segment_type: j.segment_type || 'BODY',
              veo_uuid: null,
              status: j.status,
              video_url: null,
              image_url: j.image_url,
              script_text: j.script_text,
              topic: j.topic,
              error_message: null,
              created_at: j.created_at,
              updated_at: j.updated_at
            }));
            
            projectList.push({
              session_id: sessionId,
              topic_title: topicTitle,
              segments: segments.sort((a, b) => {
                const aId = parseInt(a.segment_id) || 0;
                const bId = parseInt(b.segment_id) || 0;
                return aId - bId;
              }),
              total_segments: validImgJobs.length,
              images_ready: imagesCompleted,
              videos_ready: 0,
              videos_failed: 0,
              videos_processing: 0,
              videos_pending: 0,
              is_complete: false,
              has_failed: imagesFailed > 0 && imagesProcessing === 0 && imagesPending === 0,
              is_processing: imagesProcessing > 0,
              status_text: statusText,
              created_at: validImgJobs[0]?.created_at || new Date().toISOString(),
              updated_at: validImgJobs[0]?.updated_at || new Date().toISOString(),
              planned_content_id: planned?.id,
              thumbnail_url: validImgJobs.find((j: any) => j.image_url)?.image_url,
              platforms: planned?.platforms || [],
              description: planned?.description,
              language: 'id',
              resolution: '1080p',
              model: 'veo31',
              total_duration_seconds: validImgJobs.length * 8,
              has_subtitles: false
            });
          } catch (err) {
            console.warn('[History] Error processing image-only session:', sessionId, err);
          }
        });

        // Sort by updated_at
        projectList.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        console.log('[History] Projects loaded:', projectList.length);
        setProjects(projectList);
      } else if (imageJobsBySession.size > 0) {
        // No video jobs but have image jobs - show image-only sessions
        const projectList: ProjectGroup[] = [];

        imageJobsBySession.forEach((imgJobs, sessionId) => {
          try {
            const validImgJobs = imgJobs.filter((j: any) => j && typeof j.status === 'number');
            if (validImgJobs.length === 0) return;

            const planned = sessionToPlanned.get(sessionId);

            // Get topic from multiple sources with proper empty string handling
            const topicFromJob = validImgJobs[0]?.topic?.trim();
            const topicFromPlanned = planned?.title?.trim() || planned?.video_data?.topic?.trim();
            const topicFromScript = validImgJobs[0]?.script_text?.split('\n')[0]?.slice(0, 60)?.trim();

            // Also check localStorage for saved progress (backup source for image-only projects)
            let topicFromLocalStorage: string | null = null;
            try {
              const savedProgress = localStorage.getItem(`sparkfluence_video_progress_${sessionId}`);
              if (savedProgress) {
                const parsed = JSON.parse(savedProgress);
                if (parsed.topic && parsed.topic !== 'Your Video' && parsed.topic.trim().length > 0) {
                  topicFromLocalStorage = parsed.topic.trim();
                }
              }
            } catch (e) {
              // Ignore localStorage errors
            }

            // Priority: plannedTitle > localStorage > job topic > script text > fallback
            const topicTitle = (topicFromPlanned && topicFromPlanned.length > 0)
              ? topicFromPlanned
              : (topicFromLocalStorage && topicFromLocalStorage.length > 0)
                ? topicFromLocalStorage
                : (topicFromJob && topicFromJob.length > 0)
                  ? topicFromJob
                  : (topicFromScript && topicFromScript.length > 0)
                    ? topicFromScript
                    : `Project ${sessionId.slice(0, 8)}`;

            console.log(`[History-ImageOnly-B] Session ${sessionId.slice(0,8)}: planned="${topicFromPlanned}", localStorage="${topicFromLocalStorage}", job="${topicFromJob}", final="${topicTitle}"`);

            // Calculate image stats
            const imagesCompleted = validImgJobs.filter((j: any) => j.status === JOB_STATUS.COMPLETED && j.image_url).length;
            const imagesFailed = validImgJobs.filter((j: any) => j.status === JOB_STATUS.FAILED).length;
            const imagesProcessing = validImgJobs.filter((j: any) => j.status === JOB_STATUS.PROCESSING).length;
            const imagesPending = validImgJobs.filter((j: any) => j.status === JOB_STATUS.PENDING).length;
            
            // Status text for image-only projects
            let statusText = '';
            if (imagesProcessing > 0) {
              statusText = `${t.videoEditor?.status?.processing || 'Processing'} ${imagesCompleted}/${validImgJobs.length}`;
            } else if (imagesFailed > 0 && imagesPending === 0) {
              statusText = `${imagesFailed} ${t.common?.failed || 'failed'}`;
            } else if (imagesCompleted === validImgJobs.length) {
              statusText = language === 'id' ? 'Gambar Siap' : 'Images Ready';
            } else {
              statusText = `${t.videoEditor?.status?.images || 'Images'} ${imagesCompleted}/${validImgJobs.length}`;
            }
            
            // Convert image jobs to VideoJob-like segments for compatibility
            const segments: VideoJob[] = validImgJobs.map((j: any) => ({
              id: j.id,
              session_id: j.session_id,
              segment_id: j.segment_id || '0',
              segment_type: j.segment_type || 'BODY',
              veo_uuid: null,
              status: j.status,
              video_url: null,
              image_url: j.image_url,
              script_text: j.script_text,
              topic: j.topic,
              error_message: null,
              created_at: j.created_at,
              updated_at: j.updated_at
            }));
            
            projectList.push({
              session_id: sessionId,
              topic_title: topicTitle,
              segments: segments.sort((a, b) => {
                const aId = parseInt(a.segment_id) || 0;
                const bId = parseInt(b.segment_id) || 0;
                return aId - bId;
              }),
              total_segments: validImgJobs.length,
              images_ready: imagesCompleted,
              videos_ready: 0,
              videos_failed: 0,
              videos_processing: 0,
              videos_pending: 0,
              is_complete: false,
              has_failed: imagesFailed > 0 && imagesProcessing === 0 && imagesPending === 0,
              is_processing: imagesProcessing > 0,
              status_text: statusText,
              created_at: validImgJobs[0]?.created_at || new Date().toISOString(),
              updated_at: validImgJobs[0]?.updated_at || new Date().toISOString(),
              planned_content_id: planned?.id,
              thumbnail_url: validImgJobs.find((j: any) => j.image_url)?.image_url,
              platforms: planned?.platforms || [],
              description: planned?.description,
              language: 'id',
              resolution: '1080p',
              model: 'veo31',
              total_duration_seconds: validImgJobs.length * 8,
              has_subtitles: false
            });
          } catch (err) {
            console.warn('[History] Error processing image-only session:', sessionId, err);
          }
        });
        
        if (projectList.length > 0) {
          projectList.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          console.log('[History] Image-only projects loaded:', projectList.length);
          setProjects(projectList);
        }
      }
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      console.error("Error details:", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      });
      // Don't crash the page - just show empty state
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (project: ProjectGroup) => {
    if (project.is_complete) {
      setSelectedProject(project);
      setVideoError(false);
      setActionError(null);
    } else {
      // Check if this is an image-only project (no video jobs)
      const isImageOnly = project.videos_ready === 0 && project.videos_pending === 0 && 
                          project.videos_processing === 0 && project.videos_failed === 0;
      
      if (isImageOnly) {
        // Navigate to image generation page
        navigate(`/image-generation?session=${project.session_id}`);
      } else {
        // Navigate to video generation page
        navigate("/video-generation", {
          state: {
            sessionId: project.session_id,
            topic: project.topic_title,
            segments: project.segments.map(s => ({
              id: s.segment_id,
              type: s.segment_type,
              script: s.script_text || '',
              imageUrl: s.image_url,
              videoUrl: s.video_url,
              veoUuid: s.veo_uuid,
              durationSeconds: 8,
              visualDirection: '',
              emotion: ''
            })),
            fromDraft: true
          }
        });
      }
    }
  };

  const closeModal = () => {
    setSelectedProject(null);
    setVideoError(false);
    setActionError(null);
    setShowScheduleForm(false);
    setScheduleDate('');
    setScheduleTime('09:00');
    setSchedulePlatforms([]);
  };

  // Handle schedule form submit
  const handleSaveSchedule = async () => {
    if (!selectedProject || !user) return;
    if (!scheduleDate || schedulePlatforms.length === 0) {
      setActionError(language === 'id' ? 'Pilih tanggal dan minimal 1 platform' : 'Select date and at least 1 platform');
      return;
    }

    setIsSavingSchedule(true);
    setActionError(null);

    try {
      // Check if planned_content exists for this session
      if (selectedProject.planned_content_id) {
        // Update existing
        const success = await updatePlannedContent(selectedProject.planned_content_id, {
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          platforms: schedulePlatforms,
        });
        if (!success) throw new Error('Failed to update schedule');
      } else {
        // Create new planned_content
        await addPlannedContent({
          title: selectedProject.topic_title,
          description: selectedProject.description || '',
          content_type: 'video',
          platforms: schedulePlatforms,
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          status: 'scheduled',
          thumbnail_url: selectedProject.thumbnail_url,
          final_video_url: selectedProject.final_video_url,
          video_data: {
            session_id: selectedProject.session_id,
            segments: selectedProject.segments,
          },
        });
      }

      // Update local state
      setProjects(prev => prev.map(p =>
        p.session_id === selectedProject.session_id
          ? { ...p, scheduled_date: scheduleDate, scheduled_time: scheduleTime, platforms: schedulePlatforms }
          : p
      ));

      // Update selectedProject
      setSelectedProject(prev => prev ? {
        ...prev,
        scheduled_date: scheduleDate,
        scheduled_time: scheduleTime,
        platforms: schedulePlatforms,
      } : null);

      setShowScheduleForm(false);
    } catch (err) {
      console.error('Error saving schedule:', err);
      setActionError(language === 'id' ? 'Gagal menyimpan jadwal' : 'Failed to save schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSchedulePlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleDeleteProject = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm(t.gallery?.deleteConfirm?.message || 'Are you sure you want to delete this project?')) return;

    setDeletingId(sessionId);
    try {
      // Delete from both tables
      const { error: videoError } = await supabase
        .from("video_generation_jobs")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user?.id);

      const { error: imageError } = await supabase
        .from("image_generation_jobs")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user?.id);

      if (videoError) console.warn("Error deleting video jobs:", videoError);
      if (imageError) console.warn("Error deleting image jobs:", imageError);

      setProjects(prev => prev.filter(p => p.session_id !== sessionId));
      if (selectedProject?.session_id === sessionId) {
        closeModal();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      alert(t.errors?.general || 'An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  // Repair video link - search in storage and update planned_content
  const handleRepairLink = async () => {
    if (!selectedProject || !user) return;
    
    setIsRepairing(true);
    setActionError(null);
    
    try {
      console.log('[History] Repairing link for session:', selectedProject.session_id);
      
      // List files in final-videos bucket
      const { data: files, error: listError } = await supabase.storage
        .from('final-videos')
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      
      if (listError) throw listError;
      
      // Find video matching this session (by session_id in filename or recent upload)
      const sessionId = selectedProject.session_id;
      let matchingFile = files?.find(f => f.name.includes(sessionId));
      
      // If no exact match, try to find by planned_content_id
      if (!matchingFile && selectedProject.planned_content_id) {
        matchingFile = files?.find(f => f.name.includes(selectedProject.planned_content_id!));
      }
      
      // If still no match, find most recent video from around the same time
      if (!matchingFile && files && files.length > 0) {
        const projectDate = new Date(selectedProject.updated_at);
        const tolerance = 24 * 60 * 60 * 1000; // 24 hours
        
        matchingFile = files.find(f => {
          const fileDate = new Date(f.created_at);
          return Math.abs(fileDate.getTime() - projectDate.getTime()) < tolerance;
        });
      }
      
      if (!matchingFile) {
        throw new Error(language === 'id' 
          ? 'Video tidak ditemukan di storage. Coba combine ulang.'
          : 'Video not found in storage. Try re-combining.');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('final-videos')
        .getPublicUrl(matchingFile.name);
      
      const videoUrl = urlData.publicUrl;
      console.log('[History] Found video:', videoUrl);
      
      // Update planned_content with the URL
      if (selectedProject.planned_content_id) {
        const { error: updateError } = await supabase
          .from('planned_content')
          .update({ final_video_url: videoUrl })
          .eq('id', selectedProject.planned_content_id);
        
        if (updateError) throw updateError;
      }
      
      // Update local state
      setSelectedProject(prev => prev ? { ...prev, final_video_url: videoUrl } : null);
      setProjects(prev => prev.map(p => 
        p.session_id === selectedProject.session_id 
          ? { ...p, final_video_url: videoUrl }
          : p
      ));
      
      setVideoError(false);
      console.log('[History] Link repaired successfully');
      
    } catch (err: any) {
      console.error('[History] Repair failed:', err);
      setActionError(err.message || 'Failed to repair link');
    } finally {
      setIsRepairing(false);
    }
  };

  // Combine video - navigate to full-video page
  const handleCombineVideo = () => {
    if (!selectedProject) return;
    
    // Navigate to full-video with segments
    const navigationState = {
      segments: selectedProject.segments.map(s => ({
        id: s.segment_id,
        type: s.segment_type,
        script: s.script_text || '',
        imageUrl: s.image_url,
        videoUrl: s.video_url,
        durationSeconds: s.duration_seconds || 8,
        visualDirection: '',
        emotion: ''
      })),
      topic: selectedProject.topic_title,
      sessionId: selectedProject.session_id,
      videoSettings: {
        aspectRatio: '9:16',
        resolution: selectedProject.resolution || '1080p'
      }
    };
    
    sessionStorage.setItem('fullVideoState', JSON.stringify(navigationState));
    navigate('/full-video', { state: navigationState });
  };

  // Add subtitles to video
  const handleAddSubtitle = async () => {
    if (!selectedProject?.final_video_url) return;
    
    setIsAddingSubtitle(true);
    setActionError(null);
    setSubtitleProgress(5);
    setSubtitleStep(language === 'id' ? 'Memulai...' : 'Starting...');
    
    try {
      console.log('[History] Adding subtitles to:', selectedProject.final_video_url);
      
      const response = await fetch(apiEndpoints.addSubtitles, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          video_url: selectedProject.final_video_url,
          subtitle_style: 'tiktok',
          project_id: selectedProject.planned_content_id || selectedProject.session_id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to start subtitle process');
      }
      
      const data = await response.json();
      console.log('[History] Subtitle job started:', data);
      setSubtitleProgress(10);
      setSubtitleStep(language === 'id' ? 'Mengunduh video...' : 'Downloading video...');
      
      // Poll for completion
      if (data.data?.job_id) {
        const jobId = data.data.job_id;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
          
          const statusResponse = await fetch(apiEndpoints.jobStatus(jobId), {
            headers: { 'x-api-key': API_KEY }
          });
          
          if (!statusResponse.ok) {
            attempts++;
            continue;
          }
          
          const statusData = await statusResponse.json();
          const job = statusData.data;
          
          // Update progress from backend
          if (job.progress_percentage) {
            setSubtitleProgress(job.progress_percentage);
          } else {
            // Estimate progress based on attempts
            const estimatedProgress = Math.min(10 + (attempts * 3), 90);
            setSubtitleProgress(estimatedProgress);
          }
          
          // Update step text
          if (job.current_step) {
            setSubtitleStep(job.current_step);
          } else if (attempts < 3) {
            setSubtitleStep(language === 'id' ? 'Mengunduh video...' : 'Downloading video...');
          } else if (attempts < 8) {
            setSubtitleStep(language === 'id' ? 'Transkripsi audio...' : 'Transcribing audio...');
          } else if (attempts < 15) {
            setSubtitleStep(language === 'id' ? 'Membuat subtitle...' : 'Generating subtitles...');
          } else {
            setSubtitleStep(language === 'id' ? 'Memproses video...' : 'Processing video...');
          }
          
          if (job.status === 'completed' && job.final_video_url) {
            setSubtitleProgress(100);
            setSubtitleStep(language === 'id' ? 'Selesai!' : 'Complete!');
            
            // Update with subtitled video
            if (selectedProject.planned_content_id) {
              await supabase
                .from('planned_content')
                .update({ final_video_url: job.final_video_url })
                .eq('id', selectedProject.planned_content_id);
            }
            
            // Also update video_generation_jobs (user_id required for RLS)
            const { data: updateData, error: updateError } = await supabase
              .from('video_generation_jobs')
              .update({ 
                final_video_url: job.final_video_url,
                has_subtitles: true
              })
              .eq('session_id', selectedProject.session_id)
              .eq('user_id', user?.id)
              .select('id');
            
            if (updateError) {
              console.error('[History] Failed to update video_generation_jobs:', updateError);
            } else {
              console.log(`[History] Updated ${updateData?.length || 0} video_generation_jobs with subtitle video URL`);
            }
            
            setSelectedProject(prev => prev ? { ...prev, final_video_url: job.final_video_url, has_subtitles: true } : null);
            setProjects(prev => prev.map(p => 
              p.session_id === selectedProject.session_id 
                ? { ...p, final_video_url: job.final_video_url, has_subtitles: true }
                : p
            ));
            
            console.log('[History] Subtitles added successfully');
            break;
          } else if (job.status === 'failed') {
            throw new Error(job.error_message || 'Subtitle generation failed');
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          throw new Error('Subtitle generation timed out');
        }
      }
      
    } catch (err: any) {
      console.error('[History] Add subtitle failed:', err);
      setActionError(err.message || 'Failed to add subtitles');
    } finally {
      setIsAddingSubtitle(false);
      setSubtitleProgress(0);
      setSubtitleStep('');
    }
  };

  // Download video
  const handleDownload = async () => {
    if (!selectedProject?.final_video_url) return;
    
    try {
      const response = await fetch(selectedProject.final_video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedProject.topic_title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(selectedProject.final_video_url, '_blank');
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(getLocale(), { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'drafts') return !project.is_complete;
    if (activeTab === 'completed') return project.is_complete;
    return true;
  });

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: t.planner?.filters?.all || 'All', count: projects.length },
    { key: 'drafts', label: t.planner?.filters?.drafts || 'Drafts', count: projects.filter(p => !p.is_complete).length },
    { key: 'completed', label: t.gallery?.published || 'Completed', count: projects.filter(p => p.is_complete).length },
  ];

  // UI text
  const uiText = {
    repairLink: language === 'id' ? 'Perbaiki Link' : 'Repair Link',
    repairing: language === 'id' ? 'Memperbaiki...' : 'Repairing...',
    combineVideo: language === 'id' ? 'Combine Video' : 'Combine Video',
    combining: language === 'id' ? 'Combining...' : 'Combining...',
    addSubtitle: language === 'id' ? 'Tambah Subtitle' : 'Add Subtitle',
    replaceSubtitle: language === 'id' ? 'Ganti Subtitle' : 'Replace Subtitle',
    addingSubtitle: language === 'id' ? 'Menambahkan...' : 'Adding...',
    videoNotFound: language === 'id' ? 'Video tidak dapat dimuat. Coba perbaiki link atau combine ulang.' : 'Video cannot be loaded. Try repairing link or re-combining.',
    noFinalVideo: language === 'id' ? 'Video final belum tersedia. Klik "Combine Video" untuk membuat.' : 'Final video not available. Click "Combine Video" to create.',
  };

  return (
    <div className="w-full min-h-screen bg-page">
      <main className="pb-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">{t.nav?.history || 'History'}</h1>
          <p className="text-text-secondary text-sm">
            {t.history?.subtitle || 'View all your past video projects'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-default">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary'
                }`}>
                  {tab.count}
                </span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                )}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary mb-4">
                {t.history?.empty?.title || 'No projects yet'}
              </p>
              <Button
                onClick={() => navigate("/script-lab")}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {t.gallery?.empty?.button || 'Create New Video'}
              </Button>
            </div>
          ) : (
            /* Card Grid - 5 columns on desktop, compact cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {filteredProjects.map((project) => {
                // Determine status category for styling
                const allVideosReady = project.videos_ready === project.total_segments && project.total_segments > 0;
                const allImagesReady = project.images_ready === project.total_segments && project.total_segments > 0;
                const isImagesOnly = project.videos_ready === 0 && allImagesReady;

                return (
                <div
                  key={project.session_id}
                  onClick={() => handleViewProject(project)}
                  className={`bg-card border-2 rounded-xl overflow-hidden transition-all cursor-pointer hover:scale-[1.02] hover:shadow-xl ${
                    project.is_complete
                      ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)]'
                      : allVideosReady
                      ? 'border-yellow-500/80 shadow-yellow-500/20 shadow-md'
                      : project.is_processing
                      ? 'border-blue-500/50'
                      : project.has_failed
                      ? 'border-red-500/70 shadow-red-500/15 shadow-md'
                      : isImagesOnly
                      ? 'border-purple-500/50'
                      : 'border-gray-600/50'
                  }`}
                >
                  {/* Thumbnail - compact */}
                  <div className="relative aspect-[4/3] bg-page">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.topic_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-text-muted" />
                      </div>
                    )}

                    {/* Status overlay gradient based on status */}
                    <div className={`absolute inset-0 pointer-events-none ${
                      project.is_complete
                        ? 'bg-gradient-to-t from-green-900/70 via-green-900/20 to-transparent'
                        : allVideosReady
                        ? 'bg-gradient-to-t from-yellow-900/50 via-transparent to-transparent'
                        : project.has_failed
                        ? 'bg-gradient-to-t from-red-900/50 via-transparent to-transparent'
                        : ''
                    }`} />

                    {/* Status Badge - Compact size */}
                    <div className="absolute top-1.5 right-1.5">
                      {project.is_complete ? (
                        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-white bg-green-500/90 px-1.5 py-0.5 rounded shadow-sm">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {language === 'id' ? 'Selesai' : 'Done'}
                        </span>
                      ) : allVideosReady ? (
                        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-yellow-900 bg-yellow-400/90 px-1.5 py-0.5 rounded shadow-sm">
                          <Video className="w-2.5 h-2.5" />
                          Ready
                        </span>
                      ) : project.is_processing ? (
                        <span className="flex items-center gap-0.5 text-[8px] font-medium text-white bg-blue-500/90 px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          {project.videos_ready}/{project.total_segments}
                        </span>
                      ) : project.has_failed ? (
                        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-white bg-red-500/90 px-1.5 py-0.5 rounded shadow-sm">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Failed
                        </span>
                      ) : isImagesOnly ? (
                        <span className="flex items-center gap-0.5 text-[8px] font-medium text-white bg-purple-500/90 px-1.5 py-0.5 rounded shadow-sm">
                          <ImageIcon className="w-2.5 h-2.5" />
                          Images
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[8px] font-medium text-gray-200 bg-gray-700/90 px-1.5 py-0.5 rounded shadow-sm">
                          <Clock className="w-2.5 h-2.5" />
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Segment count */}
                    <div className="absolute bottom-2 left-2">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-white bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
                        <Video className="w-2.5 h-2.5" />
                        {project.total_segments}
                      </span>
                    </div>
                  </div>

                  {/* Card Content - compact */}
                  <div className="p-2.5">
                    <h3 className="text-text-primary text-xs font-medium line-clamp-2 mb-2 min-h-[32px]">
                      {project.topic_title}
                    </h3>

                    {/* Progress Bar - THICKER and more visible */}
                    <div className="mb-2">
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            project.is_complete
                              ? 'bg-green-500'
                              : allVideosReady
                              ? 'bg-yellow-500'
                              : project.is_processing
                              ? 'bg-blue-500 animate-pulse'
                              : project.has_failed
                              ? 'bg-red-500'
                              : isImagesOnly
                              ? 'bg-purple-500'
                              : 'bg-gray-500'
                          }`}
                          style={{
                            width: project.is_complete
                              ? '100%'
                              : `${project.videos_ready > 0
                                ? (project.videos_ready / project.total_segments) * 100
                                : (project.images_ready / project.total_segments) * 100}%`
                          }}
                        />
                      </div>
                      {/* Status text - color coded and clear labels */}
                      <p className={`text-[9px] mt-1 font-medium ${
                        project.is_complete
                          ? 'text-green-400'
                          : allVideosReady
                          ? 'text-yellow-400'
                          : project.is_processing
                          ? 'text-blue-400'
                          : project.has_failed
                          ? 'text-red-400'
                          : isImagesOnly
                          ? 'text-purple-400'
                          : 'text-gray-400'
                      }`}>
                        {project.is_complete
                          ? (language === 'id' ? 'Selesai' : 'Published')
                          : allVideosReady
                          ? (language === 'id' ? 'Siap Combine' : 'Ready to Combine')
                          : project.status_text}
                      </p>
                    </div>

                    {/* Schedule & Platforms - Show for published videos with schedule */}
                    {project.is_complete && project.scheduled_date && (
                      <div className="mb-2 p-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                        <div className="flex items-center justify-between gap-1">
                          {/* Schedule Date & Time */}
                          <div className="flex items-center gap-1 text-[9px] text-cyan-400">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>
                              {new Date(project.scheduled_date).toLocaleDateString(getLocale(), {
                                month: 'short',
                                day: 'numeric'
                              })}
                              {project.scheduled_time && ` ${project.scheduled_time}`}
                            </span>
                          </div>
                          {/* Platforms */}
                          {project.platforms && project.platforms.length > 0 && (
                            <div className="flex items-center gap-1">
                              {project.platforms.map((platform) => (
                                <span key={platform} className="w-3.5 h-3.5">
                                  {platform === 'tiktok' && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>}
                                  {platform === 'youtube' && <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
                                  {platform === 'instagram' && <svg className="w-3.5 h-3.5 text-pink-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata Row - Single line with separators */}
                    <div className="flex items-center gap-1 text-[9px] text-text-muted mb-1.5">
                      <span>{project.total_duration_seconds}s</span>
                      <span className="text-text-muted/50">|</span>
                      <span>{project.resolution || '1080p'}</span>
                      <span className="text-text-muted/50">|</span>
                      <span className="text-purple-400">{project.model === 'sora2' ? 'SORA2' : project.model === 'veo31' ? 'VEO3' : 'Auto'}</span>
                      <span className="text-text-muted/50">|</span>
                      <span className="flex items-center gap-0.5">
                        {project.language === 'id' || project.language === 'indonesian' ? (
                          <svg className="w-3 h-2" viewBox="0 0 24 16"><rect width="24" height="8" fill="#FF0000"/><rect y="8" width="24" height="8" fill="#FFF"/></svg>
                        ) : project.language === 'en' || project.language === 'english' ? (
                          <svg className="w-3 h-2" viewBox="0 0 24 16"><rect width="24" height="16" fill="#012169"/><path d="M0,0 L24,16 M24,0 L0,16" stroke="#FFF" strokeWidth="2"/><path d="M12,0 V16 M0,8 H24" stroke="#FFF" strokeWidth="4"/><path d="M12,0 V16 M0,8 H24" stroke="#C8102E" strokeWidth="2"/></svg>
                        ) : project.language === 'hi' || project.language === 'hindi' ? (
                          <svg className="w-3 h-2" viewBox="0 0 24 16"><rect width="24" height="5.33" fill="#FF9933"/><rect y="5.33" width="24" height="5.33" fill="#FFF"/><rect y="10.66" width="24" height="5.33" fill="#138808"/></svg>
                        ) : (
                          <svg className="w-3 h-2" viewBox="0 0 24 16"><rect width="24" height="8" fill="#FF0000"/><rect y="8" width="24" height="8" fill="#FFF"/></svg>
                        )}
                        {project.language === 'id' || project.language === 'indonesian' ? 'ID' : project.language === 'en' || project.language === 'english' ? 'EN' : project.language === 'hi' || project.language === 'hindi' ? 'IN' : 'ID'}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-text-muted">
                        {formatDate(project.updated_at)}
                      </span>

                      <button
                        onClick={(e) => handleDeleteProject(e, project.session_id)}
                        disabled={deletingId === project.session_id}
                        className="p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        {deletingId === project.session_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
      </main>

      {/* Video Detail Modal - Compact layout */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-card rounded-xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Compact */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <h3 className="text-base font-semibold text-text-primary">
                {t.gallery?.viewDetails || 'View Details'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Modal Body - Horizontal layout */}
            <div className="p-4 flex gap-4">
              {/* Left - Video Preview with glow effect */}
              <div className="w-[160px] flex-shrink-0">
                <div className="relative group">
                  {/* Glow effect behind video */}
                  <div className="absolute -inset-1 bg-gradient-to-b from-primary/30 via-purple-500/20 to-cyan-500/30 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-[9/16] ring-1 ring-white/10">
                    {selectedProject.final_video_url && !videoError ? (
                      <video
                        src={selectedProject.final_video_url}
                        controls
                        className="w-full h-full object-contain"
                        poster={selectedProject.thumbnail_url || undefined}
                        onError={() => setVideoError(true)}
                      />
                    ) : selectedProject.thumbnail_url ? (
                      <>
                        <img
                          src={selectedProject.thumbnail_url}
                          alt={selectedProject.topic_title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[1px]">
                          {videoError ? (
                            <AlertCircle className="w-8 h-8 text-amber-400 animate-pulse" />
                          ) : !selectedProject.final_video_url ? (
                            <div className="flex flex-col items-center gap-1">
                              <Film className="w-8 h-8 text-amber-400" />
                              <span className="text-[10px] text-amber-300">No video</span>
                            </div>
                          ) : (
                            <Play className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-surface to-card">
                        <Video className="w-8 h-8 text-text-muted" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right - Details */}
              <div className="flex-1 min-w-0">
                {/* Title + Status inline */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-base font-bold text-text-primary line-clamp-2">
                    {selectedProject.topic_title}
                  </h2>
                  {/* Status badge */}
                  {selectedProject.scheduled_date && selectedProject.platforms && selectedProject.platforms.length > 0 ? (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded-full flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle className="w-3 h-3" />
                      {language === 'id' ? 'Terjadwal' : 'Scheduled'}
                    </span>
                  ) : selectedProject.final_video_url ? (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Video className="w-3 h-3" />
                      {language === 'id' ? 'Siap' : 'Ready'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs rounded-full flex items-center gap-1 whitespace-nowrap">
                      <AlertCircle className="w-3 h-3" />
                      {language === 'id' ? 'Draft' : 'Draft'}
                    </span>
                  )}
                </div>

                {/* Meta info - inline compact */}
                <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                  <span>{formatDate(selectedProject.updated_at)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedProject.total_duration_seconds}s
                  </span>
                  {selectedProject.platforms && selectedProject.platforms.length > 0 && (
                    <div className="flex items-center gap-1">
                      {selectedProject.platforms.map((platform) => (
                        <span key={platform} className="w-4 h-4">
                          {platform === 'tiktok' && <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>}
                          {platform === 'youtube' && <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
                          {platform === 'instagram' && <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {actionError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-3">
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {actionError}
                    </p>
                  </div>
                )}

                {/* Action Buttons - Enhanced with gradient effects */}
                <div className="space-y-2">
                  {selectedProject.final_video_url && !videoError ? (
                    <>
                      {/* Primary Action - Download with glow */}
                      <button
                        onClick={handleDownload}
                        className="w-full relative group overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 via-primary to-purple-600 p-[1px]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-primary to-purple-600 opacity-75 group-hover:opacity-100 blur-sm transition-opacity" />
                        <div className="relative bg-card hover:bg-card/80 rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-all">
                          <Download className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-white">{t.common?.download || 'Download'}</span>
                        </div>
                      </button>

                      {/* Secondary Actions Row */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddSubtitle}
                          disabled={isAddingSubtitle}
                          className="flex-1 relative group overflow-hidden rounded-lg border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 px-3 py-2 transition-all disabled:opacity-50"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {isAddingSubtitle ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                                <span className="text-xs text-purple-300">{subtitleProgress}%</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-xs text-purple-300">{selectedProject?.has_subtitles ? 'Replace' : 'Add'} Subtitle</span>
                              </>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(e as any, selectedProject.session_id)}
                          className="px-3 py-2 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-500/5 hover:bg-red-500/10 transition-all group"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Primary Action - Combine */}
                      <button
                        onClick={handleCombineVideo}
                        disabled={isCombining}
                        className="w-full relative group overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-primary to-purple-600 p-[1px] disabled:opacity-50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-primary to-purple-600 opacity-75 group-hover:opacity-100 blur-sm transition-opacity" />
                        <div className="relative bg-card hover:bg-card/80 rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-all">
                          {isCombining ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Film className="w-4 h-4 text-primary" />}
                          <span className="text-sm font-medium text-white">{isCombining ? 'Combining...' : 'Combine Video'}</span>
                        </div>
                      </button>

                      {/* Secondary Actions Row */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleRepairLink}
                          disabled={isRepairing}
                          className="flex-1 rounded-lg border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-2 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isRepairing ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> : <Wrench className="w-3.5 h-3.5 text-amber-400" />}
                          <span className="text-xs text-amber-300">Repair</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(e as any, selectedProject.session_id)}
                          className="px-3 py-2 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-500/5 hover:bg-red-500/10 transition-all group"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Schedule Section - Glassmorphism style */}
                {(!selectedProject.platforms || selectedProject.platforms.length === 0 || !selectedProject.scheduled_date) && selectedProject.final_video_url && (
                  <div className="mt-3 relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 border border-cyan-500/20">
                    <div className="absolute inset-0 backdrop-blur-sm" />
                    <div className="relative p-3">
                      {!showScheduleForm ? (
                        <button
                          onClick={() => {
                            setShowScheduleForm(true);
                            setScheduleDate(selectedProject.scheduled_date || '');
                            setScheduleTime(selectedProject.scheduled_time || '09:00');
                            setSchedulePlatforms(selectedProject.platforms || []);
                          }}
                          className="w-full flex items-center justify-center gap-2 text-cyan-400 text-sm py-1.5 hover:text-cyan-300 transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{language === 'id' ? 'Atur Jadwal Publish' : 'Schedule Publishing'}</span>
                          <span className="text-cyan-500/50">→</span>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/20">
                            <Calendar className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-white">{language === 'id' ? 'Jadwal Publish' : 'Schedule'}</span>
                          </div>

                          {/* Date & Time Row */}
                          <div className="flex gap-2">
                            <div className="flex-[2]">
                              <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 [color-scheme:dark]"
                              />
                            </div>
                            <div className="flex-1 min-w-[100px]">
                              <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-full bg-black/30 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 [color-scheme:dark]"
                              />
                            </div>
                          </div>

                          {/* Platforms Row */}
                          <div className="flex items-center gap-2">
                            {['tiktok', 'youtube', 'instagram'].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => togglePlatform(p)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all ${
                                  schedulePlatforms.includes(p)
                                    ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                                    : 'border-white/10 bg-black/20 hover:border-white/30'
                                }`}
                              >
                                {p === 'tiktok' && <svg className={`w-4 h-4 ${schedulePlatforms.includes(p) ? 'text-white' : 'text-white/50'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>}
                                {p === 'youtube' && <svg className={`w-4 h-4 ${schedulePlatforms.includes(p) ? 'text-red-400' : 'text-white/50'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
                                {p === 'instagram' && <svg className={`w-4 h-4 ${schedulePlatforms.includes(p) ? 'text-pink-400' : 'text-white/50'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                              </button>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={handleSaveSchedule}
                              disabled={isSavingSchedule || !scheduleDate || schedulePlatforms.length === 0}
                              className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-medium py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                            >
                              {isSavingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              {language === 'id' ? 'Simpan Jadwal' : 'Save Schedule'}
                            </button>
                            <button
                              onClick={() => setShowScheduleForm(false)}
                              className="px-4 py-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
                            >
                              {language === 'id' ? 'Batal' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
