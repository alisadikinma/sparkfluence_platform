import { apiEndpoints, API_KEY } from "../../lib/api";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { 
  Clock, Video, Play, Trash2, X,
  CheckCircle, AlertCircle, Loader2, Image as ImageIcon,
  Calendar, Download, Globe, Monitor, Cpu, FileText, Wrench, Film
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

      // Fetch image generation jobs for better status info
      const { data: imageJobs } = await supabase
        .from("image_generation_jobs")
        .select("session_id, topic, status, image_url")
        .eq("user_id", user.id);

      // Create image jobs map by session_id - with null safety
      const imageJobsMap = new Map<string, { topic: string | null; hasImages: boolean }>();
      if (imageJobs && Array.isArray(imageJobs)) {
        imageJobs.forEach((job: any) => {
          // Skip invalid jobs
          if (!job || !job.session_id) return;
          
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
          if (p && p.video_data?.sessionId) {
            sessionToPlanned.set(p.video_data.sessionId, p);
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
          const videosReady = validSegments.filter(s => s.video_url || s.status === JOB_STATUS.COMPLETED).length;
          const videosFailed = validSegments.filter(s => s.status === JOB_STATUS.FAILED).length;
          const videosProcessing = validSegments.filter(s => s.status === JOB_STATUS.PROCESSING).length;
          const videosPending = validSegments.filter(s => s.status === JOB_STATUS.PENDING).length;
          const isComplete = videosReady === validSegments.length && validSegments.length > 0;
          const hasFailed = videosFailed > 0 && videosProcessing === 0 && videosPending === 0; // Only failed if nothing is processing/pending
          const isProcessing = videosProcessing > 0 || (videosPending > 0 && videosReady > 0); // Processing if any job is running OR resuming
          const planned = sessionToPlanned.get(sessionId);

          // Get topic from multiple sources (priority order)
          const topicFromJob = validSegments[0]?.topic;
          const topicFromImageJob = imageJobsMap.get(sessionId)?.topic;
          const topicFromPlannedData = planned?.video_data?.topic;
          const topicFromPlannedTitle = planned?.title;
          const topicTitle = topicFromJob || topicFromImageJob || topicFromPlannedData || topicFromPlannedTitle || `Video Project ${sessionId.slice(0, 8)}`;

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

          // Get final_video_url from video_generation_jobs first (new migration), then planned_content
          const jobFinalVideoUrl = validSegments.find(s => s.final_video_url)?.final_video_url || undefined;
          const jobHasSubtitles = validSegments.some(s => s.has_subtitles);
          
          // Debug: Log final_video_url sources
          if (jobFinalVideoUrl || planned?.final_video_url) {
            console.log(`[History] Session ${sessionId.slice(0,8)}: jobFinalVideoUrl=${!!jobFinalVideoUrl}, plannedFinalVideoUrl=${!!planned?.final_video_url}`);
          }

          // Calculate status text - PRIORITY: Processing > Failed > Pending
          let statusText = '';
          if (isComplete) {
            statusText = t.common.done || 'Complete';
          } else if (isProcessing) {
            // Show processing status with progress
            statusText = `${t.videoEditor?.status?.processing || 'Processing'} ${videosReady}/${validSegments.length}`;
          } else if (hasFailed) {
            statusText = `${videosFailed} ${t.common.failed || 'failed'}`;
          } else if (imagesReady < validSegments.length) {
            statusText = `${t.videoEditor?.status?.images || 'Images'} ${imagesReady}/${validSegments.length}`;
          } else {
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
            final_video_url: jobFinalVideoUrl || planned?.final_video_url || undefined,
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

        console.log('[History] Projects loaded:', projectList.length);
        setProjects(projectList);
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
  };

  const closeModal = () => {
    setSelectedProject(null);
    setVideoError(false);
    setActionError(null);
  };

  const handleDeleteProject = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm(t.gallery?.deleteConfirm?.message || 'Are you sure you want to delete this project?')) return;

    setDeletingId(sessionId);
    try {
      const { error } = await supabase
        .from("video_generation_jobs")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user?.id);

      if (error) throw error;

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
    <div className="flex w-full min-h-screen bg-page">
      <AppSidebar activePage="history" />

      <div className="flex-1 lg:ml-0">
        <TopNavbar />

        <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {filteredProjects.map((project) => (
                <div
                  key={project.session_id}
                  onClick={() => handleViewProject(project)}
                  className={`bg-card border rounded-xl overflow-hidden transition-all cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
                    project.is_complete
                      ? 'border-green-500/30 hover:border-green-500/50'
                      : project.is_processing
                      ? 'border-blue-500/30 hover:border-blue-500/50'
                      : project.has_failed
                      ? 'border-red-500/30 hover:border-red-500/50'
                      : 'border-amber-500/30 hover:border-amber-500/50'
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
                    
                    {/* Status Badge - Priority: Complete > Processing > Failed > Draft */}
                    <div className="absolute top-1.5 right-1.5">
                      {project.is_complete ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-green-500 bg-green-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {t.common?.done || 'Done'}
                        </span>
                      ) : project.is_processing ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-blue-400 bg-blue-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          {project.videos_ready}/{project.total_segments}
                        </span>
                      ) : project.has_failed ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-red-500 bg-red-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {project.videos_failed} {t.common?.failed || 'Failed'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {t.planner?.draft || 'Draft'}
                        </span>
                      )}
                    </div>

                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Segment count */}
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="flex items-center gap-0.5 text-[9px] text-white bg-black/60 backdrop-blur-sm px-1 py-0.5 rounded">
                        <Video className="w-2 h-2" />
                        {project.total_segments}
                      </span>
                    </div>
                  </div>

                  {/* Card Content - compact */}
                  <div className="p-2">
                    <h3 className="text-text-primary text-xs font-medium line-clamp-2 mb-1.5 min-h-[32px]">
                      {project.topic_title}
                    </h3>

                    {/* Progress Bar */}
                    <div className="mb-1.5">
                      <div className="h-1 bg-surface rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            project.is_complete 
                              ? 'bg-green-500' 
                              : project.is_processing
                              ? 'bg-blue-500'
                              : project.has_failed
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ 
                            width: `${(project.videos_ready / project.total_segments) * 100}%` 
                          }}
                        />
                      </div>
                      {/* Status text under progress */}
                      <p className="text-[8px] text-text-muted mt-0.5">
                        {project.status_text}
                      </p>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {/* Duration */}
                      <span className="flex items-center gap-0.5 text-[8px] text-text-muted bg-surface px-1 py-0.5 rounded">
                        <Clock className="w-2 h-2" />
                        {project.total_duration_seconds}s
                      </span>
                      {/* Resolution */}
                      <span className="flex items-center gap-0.5 text-[8px] text-text-muted bg-surface px-1 py-0.5 rounded">
                        <Monitor className="w-2 h-2" />
                        {project.resolution || '1080p'}
                      </span>
                      {/* Model */}
                      <span className="flex items-center gap-0.5 text-[8px] text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">
                        <Cpu className="w-2 h-2" />
                        {project.model === 'sora2' ? 'SORA 2' : project.model === 'veo31' ? 'VEO 3.1' : 'Auto'}
                      </span>
                      {/* Language - Display full name */}
                      <span className="flex items-center gap-0.5 text-[8px] text-text-muted bg-surface px-1 py-0.5 rounded">
                        <Globe className="w-2 h-2" />
                        {project.language === 'id' || project.language === 'indonesian' ? '🇮🇩 ID' 
                          : project.language === 'en' || project.language === 'english' ? '🇺🇸 EN' 
                          : project.language === 'hi' || project.language === 'hindi' ? '🇮🇳 HI' 
                          : project.language?.toUpperCase() || '🇮🇩 ID'}
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
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Video Detail Modal - Enhanced with more actions */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-card rounded-2xl max-w-3xl w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default sticky top-0 bg-card z-10">
              <h3 className="text-lg font-semibold text-text-primary">
                {t.gallery?.viewDetails || 'View Details'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Modal Body - Two columns */}
            <div className="p-6 flex flex-col md:flex-row gap-6">
              {/* Left - Video Preview */}
              <div className="w-full md:w-[280px] flex-shrink-0">
                <div className="bg-black rounded-xl overflow-hidden aspect-[9/16] relative">
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4">
                        {videoError ? (
                          <>
                            <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                            <p className="text-white/80 text-xs text-center mb-3">
                              {uiText.videoNotFound}
                            </p>
                          </>
                        ) : !selectedProject.final_video_url ? (
                          <>
                            <Film className="w-10 h-10 text-amber-400 mb-2" />
                            <p className="text-white/80 text-xs text-center mb-3">
                              {uiText.noFinalVideo}
                            </p>
                          </>
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                            <Play className="w-7 h-7 text-white ml-1" />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface">
                      <Video className="w-12 h-12 text-text-muted" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right - Details */}
              <div className="flex-1 min-w-0">
                {/* Date & Status Badges */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="px-3 py-1 bg-surface text-text-primary text-sm rounded-full">
                    {formatDate(selectedProject.updated_at)}
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-500 text-sm rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t.common?.done || 'Done'}
                  </span>
                  {!selectedProject.final_video_url && (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-sm rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {language === 'id' ? 'Belum Combine' : 'Not Combined'}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-text-primary mb-3">
                  {selectedProject.topic_title}
                </h2>

                {/* Description */}
                <p className="text-text-secondary text-sm mb-4">
                  {selectedProject.description || (t.history?.empty?.description || 'Your generation history will appear here')}
                </p>

                {/* Error Message */}
                {actionError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {actionError}
                    </p>
                  </div>
                )}

                {/* Platform & Time */}
                <div className="flex items-center gap-8 mb-6">
                  {/* Platforms */}
                  <div>
                    <p className="text-text-muted text-xs mb-2">
                      {t.planner?.detail?.platform || 'Platform'}
                    </p>
                    <div className="flex items-center gap-2">
                      {(selectedProject.platforms && selectedProject.platforms.length > 0) ? (
                        selectedProject.platforms.map((platform) => (
                          <div key={platform} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                            {platform === 'tiktok' && (
                              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                              </svg>
                            )}
                            {platform === 'youtube' && (
                              <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            )}
                            {platform === 'instagram' && (
                              <svg className="w-5 h-5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-text-muted text-sm">-</span>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <p className="text-text-muted text-xs mb-2">
                      {t.gallery?.videoInfo?.duration || 'Duration'}
                    </p>
                    <div className="flex items-center gap-2 text-text-primary">
                      <Clock className="w-4 h-4" />
                      <span>{selectedProject.total_duration_seconds}s</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Grid layout */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Row 1: Primary actions */}
                  {selectedProject.final_video_url && !videoError ? (
                    <>
                      <Button
                        onClick={handleDownload}
                        className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {t.common?.download || 'Download'}
                      </Button>
                      <Button
                        onClick={handleAddSubtitle}
                        disabled={isAddingSubtitle}
                        variant="outline"
                        className={`relative overflow-hidden transition-all duration-500 ${
                          isAddingSubtitle 
                            ? 'border-purple-500 bg-purple-950/50 text-white min-h-[80px] col-span-2' 
                            : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10'
                        } flex flex-col items-center justify-center gap-1 py-3`}
                      >
                        {isAddingSubtitle ? (
                          <>
                            {/* Animated gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/0 via-purple-600/30 to-purple-900/0 animate-pulse" />
                            
                            {/* Progress bar container */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-purple-950">
                              {/* Animated progress fill with glow */}
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 transition-all duration-500 ease-out relative"
                                style={{ width: `${subtitleProgress}%` }}
                              >
                                {/* Shimmer effect */}
                                <div 
                                  className="absolute inset-0 animate-shimmer"
                                  style={{ 
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                    backgroundSize: '200% 100%'
                                  }} 
                                />
                                {/* Glow on leading edge */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-fuchsia-400 rounded-full blur-md animate-pulse" />
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center gap-2">
                              {/* Percentage with glow */}
                              <div className="flex items-center gap-3">
                                {/* Spinning loader with gradient */}
                                <div className="relative w-8 h-8">
                                  <div className="absolute inset-0 rounded-full border-2 border-purple-500/30" />
                                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-fuchsia-500 animate-spin" />
                                  <div className="absolute inset-1 rounded-full bg-purple-500/20 animate-pulse" />
                                </div>
                                <span className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-fuchsia-300 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                  {subtitleProgress}%
                                </span>
                              </div>
                              
                              {/* Step text with typing effect */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-purple-200/90 font-medium">
                                  {subtitleStep}
                                </span>
                                <span className="flex gap-0.5">
                                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                              </div>
                            </div>
                            
                            {/* Corner accents */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-purple-400/50" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-purple-400/50" />
                            <div className="absolute bottom-1.5 left-0 w-3 h-3 border-l-2 border-b-2 border-purple-400/50" />
                            <div className="absolute bottom-1.5 right-0 w-3 h-3 border-r-2 border-b-2 border-purple-400/50" />
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {selectedProject?.has_subtitles ? uiText.replaceSubtitle : uiText.addSubtitle}
                          </div>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCombineVideo}
                        disabled={isCombining}
                        className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2"
                      >
                        {isCombining ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Film className="w-4 h-4" />
                        )}
                        {isCombining ? uiText.combining : uiText.combineVideo}
                      </Button>
                      <Button
                        onClick={handleRepairLink}
                        disabled={isRepairing}
                        variant="outline"
                        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-2"
                      >
                        {isRepairing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wrench className="w-4 h-4" />
                        )}
                        {isRepairing ? uiText.repairing : uiText.repairLink}
                      </Button>
                    </>
                  )}
                  
                  {/* Row 2: Secondary actions */}
                  <Button
                    onClick={(e) => {
                      handleDeleteProject(e as any, selectedProject.session_id);
                    }}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.common?.delete || 'Delete'}
                  </Button>
                  
                  {/* If video exists but has error, show repair option */}
                  {selectedProject.final_video_url && videoError && (
                    <Button
                      onClick={handleRepairLink}
                      disabled={isRepairing}
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-2"
                    >
                      {isRepairing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wrench className="w-4 h-4" />
                      )}
                      {isRepairing ? uiText.repairing : uiText.repairLink}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
