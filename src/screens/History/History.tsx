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
  Calendar, Download, Globe, Monitor, Cpu
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
}

type TabType = 'all' | 'drafts' | 'completed';

export const History = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectGroup | null>(null);

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
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch video generation jobs with metadata
      const { data: videoJobs, error: videoError } = await supabase
        .from("video_generation_jobs")
        .select("*, language, resolution, preferred_platform, duration_seconds")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (videoError) throw videoError;

      // Fetch image generation jobs for better status info
      const { data: imageJobs } = await supabase
        .from("image_generation_jobs")
        .select("session_id, topic, status, image_url")
        .eq("user_id", user.id);

      // Create image jobs map by session_id
      const imageJobsMap = new Map<string, { topic: string | null; hasImages: boolean }>();
      if (imageJobs) {
        imageJobs.forEach((job: any) => {
          const existing = imageJobsMap.get(job.session_id);
          if (!existing) {
            imageJobsMap.set(job.session_id, { 
              topic: job.topic, 
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

      // Map session IDs to planned content
      const sessionToPlanned = new Map<string, any>();
      if (plannedData) {
        plannedData.forEach(p => {
          if (p.video_data?.sessionId) {
            sessionToPlanned.set(p.video_data.sessionId, p);
          }
        });
      }

      if (videoJobs && videoJobs.length > 0) {
        // Group by session_id
        const sessionMap = new Map<string, VideoJob[]>();
        videoJobs.forEach((job: any) => {
          const existing = sessionMap.get(job.session_id) || [];
          existing.push(job);
          sessionMap.set(job.session_id, existing);
        });

        const projectList: ProjectGroup[] = [];
        sessionMap.forEach((segments, sessionId) => {
          const imagesReady = segments.filter(s => s.image_url).length;
          const videosReady = segments.filter(s => s.video_url || s.status === JOB_STATUS.COMPLETED).length;
          const videosFailed = segments.filter(s => s.status === JOB_STATUS.FAILED).length;
          const videosProcessing = segments.filter(s => s.status === JOB_STATUS.PROCESSING).length;
          const videosPending = segments.filter(s => s.status === JOB_STATUS.PENDING).length;
          const isComplete = videosReady === segments.length && segments.length > 0;
          const hasFailed = videosFailed > 0 && videosProcessing === 0 && videosPending === 0; // Only failed if nothing is processing/pending
          const isProcessing = videosProcessing > 0 || (videosPending > 0 && videosReady > 0); // Processing if any job is running OR resuming
          const planned = sessionToPlanned.get(sessionId);

          // Get topic from multiple sources (priority order)
          const topicFromJob = segments[0]?.topic;
          const topicFromImageJob = imageJobsMap.get(sessionId)?.topic;
          const topicFromPlannedData = planned?.video_data?.topic;
          const topicFromPlannedTitle = planned?.title;
          const topicTitle = topicFromJob || topicFromImageJob || topicFromPlannedData || topicFromPlannedTitle || `Video Project ${sessionId.slice(0, 8)}`;

          // Get metadata from first segment (they share same settings)
          const firstSeg = segments[0];
          const projectLanguage = firstSeg?.language || 'id';
          const projectResolution = firstSeg?.resolution || '1080p';
          const projectModel = firstSeg?.preferred_platform || 'veo31';
          const segmentDuration = firstSeg?.duration_seconds || 8;
          const totalDuration = segments.length * segmentDuration;

          // Calculate status text - PRIORITY: Processing > Failed > Pending
          let statusText = '';
          if (isComplete) {
            statusText = t.common.done || 'Complete';
          } else if (isProcessing) {
            // Show processing status with progress
            statusText = `${t.videoEditor.status.processing || 'Processing'} ${videosReady}/${segments.length}`;
          } else if (hasFailed) {
            statusText = `${videosFailed} ${t.common.failed || 'failed'}`;
          } else if (imagesReady < segments.length) {
            statusText = `${t.videoEditor.status.images || 'Images'} ${imagesReady}/${segments.length}`;
          } else {
            statusText = `${t.videoEditor.status.videos || 'Videos'} ${videosReady}/${segments.length}`;
          }

          projectList.push({
            session_id: sessionId,
            topic_title: topicTitle,
            segments: segments.sort((a, b) => parseInt(a.segment_id) - parseInt(b.segment_id)),
            total_segments: segments.length,
            images_ready: imagesReady,
            videos_ready: videosReady,
            videos_failed: videosFailed,
            videos_processing: videosProcessing,
            videos_pending: videosPending,
            is_complete: isComplete,
            has_failed: hasFailed,
            is_processing: isProcessing,
            status_text: statusText,
            created_at: segments[0].created_at,
            updated_at: segments[0].updated_at,
            planned_content_id: planned?.id,
            final_video_url: planned?.final_video_url || undefined,
            thumbnail_url: planned?.thumbnail_url || segments.find(s => s.image_url)?.image_url,
            scheduled_date: planned?.scheduled_date,
            scheduled_time: planned?.scheduled_time,
            platforms: planned?.platforms || [],
            description: planned?.description,
            // Metadata
            language: projectLanguage,
            resolution: projectResolution,
            model: projectModel,
            total_duration_seconds: totalDuration
          });
        });

        // Sort by updated_at
        projectList.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        setProjects(projectList);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (project: ProjectGroup) => {
    if (project.is_complete) {
      setSelectedProject(project);
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
  };

  const handleDeleteProject = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm(t.gallery.deleteConfirm.message)) return;

    setDeletingId(sessionId);
    try {
      const { error } = await supabase
        .from("video_generation_jobs")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user?.id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.session_id !== sessionId));
    } catch (err) {
      console.error("Error deleting project:", err);
      alert(t.errors.general);
    } finally {
      setDeletingId(null);
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
    { key: 'all', label: t.planner.filters.all, count: projects.length },
    { key: 'drafts', label: t.planner.filters.drafts, count: projects.filter(p => !p.is_complete).length },
    { key: 'completed', label: t.gallery.published, count: projects.filter(p => p.is_complete).length },
  ];

  return (
    <div className="flex w-full min-h-screen bg-page">
      <AppSidebar activePage="history" />

      <div className="flex-1 lg:ml-0">
        <TopNavbar />

        <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">{t.nav.history}</h1>
            <p className="text-text-secondary text-sm">
              {t.history.subtitle}
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
                {t.history.empty.title}
              </p>
              <Button
                onClick={() => navigate("/script-lab")}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                {t.gallery.empty.button}
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
                          {t.common.done}
                        </span>
                      ) : project.is_processing ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-blue-400 bg-blue-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          {project.videos_ready}/{project.total_segments}
                        </span>
                      ) : project.has_failed ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-red-500 bg-red-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {project.videos_failed} {t.common.failed || 'Failed'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {t.planner.draft}
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
                      {/* Language */}
                      <span className="flex items-center gap-0.5 text-[8px] text-text-muted bg-surface px-1 py-0.5 rounded">
                        <Globe className="w-2 h-2" />
                        {project.language === 'id' ? 'ID' : project.language === 'en' ? 'EN' : project.language?.toUpperCase() || 'ID'}
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

      {/* Video Detail Modal - Planner Detail Style */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-card rounded-2xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
              <h3 className="text-lg font-semibold text-text-primary">
                {t.gallery.viewDetails}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Modal Body - Two columns */}
            <div className="p-6 flex gap-6">
              {/* Left - Video Preview */}
              <div className="w-[280px] flex-shrink-0">
                <div className="bg-black rounded-xl overflow-hidden aspect-[9/16] relative">
                  {selectedProject.final_video_url ? (
                    <video
                      src={selectedProject.final_video_url}
                      controls
                      className="w-full h-full object-contain"
                      poster={selectedProject.thumbnail_url || undefined}
                    />
                  ) : selectedProject.thumbnail_url ? (
                    <>
                      <img
                        src={selectedProject.thumbnail_url}
                        alt={selectedProject.topic_title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                          <Play className="w-7 h-7 text-white ml-1" />
                        </div>
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
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-surface text-text-primary text-sm rounded-full">
                    {formatDate(selectedProject.updated_at)}
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-500 text-sm rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t.common.done}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-text-primary mb-3">
                  {selectedProject.topic_title}
                </h2>

                {/* Description */}
                <p className="text-text-secondary text-sm mb-6">
                  {selectedProject.description || t.history.empty.description}
                </p>

                {/* Platform & Time */}
                <div className="flex items-center gap-8 mb-6">
                  {/* Platforms */}
                  <div>
                    <p className="text-text-muted text-xs mb-2">
                      {t.planner.detail.platform}
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
                      {t.gallery.videoInfo.duration}
                    </p>
                    <div className="flex items-center gap-2 text-text-primary">
                      <Clock className="w-4 h-4" />
                      <span>{selectedProject.total_segments * 8}s</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      handleDeleteProject(e, selectedProject.session_id);
                      closeModal();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 border border-border-default rounded-lg text-text-primary hover:bg-surface transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.common.delete}
                  </button>

                  {selectedProject.final_video_url && (
                    <a
                      href={selectedProject.final_video_url}
                      download
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t.common.download}
                    </a>
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
