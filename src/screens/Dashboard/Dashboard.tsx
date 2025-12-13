import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { PlatformIcons } from "../../components/ui/platform-icons";
import {
  Sparkles, Calendar, TrendingUp, Clock, ArrowUpRight,
  Heart, ChevronRight, ImageIcon, Video, Loader2, AlertCircle,
  CheckCircle2, Play
} from "lucide-react";

interface PlannedContent {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  final_video_url: string | null;
}

interface CreatorGalleryItem {
  id: number;
  name: string;
  avatar: string;
  image: string;
  likes: number;
}

interface ActiveJob {
  session_id: string;
  type: 'image' | 'video';
  topic: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  created_at: string;
  updated_at: string;
}

// Job status constants
const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

// Sample creator gallery data
const sampleCreatorGallery: CreatorGalleryItem[] = [
  { id: 1, name: 'Rizky Ananda', avatar: 'https://i.pravatar.cc/150?img=1', image: 'https://images.pexels.com/photos/4974915/pexels-photo-4974915.jpeg?auto=compress&cs=tinysrgb&w=400', likes: 11100 },
  { id: 2, name: 'Salsabila Putri', avatar: 'https://i.pravatar.cc/150?img=5', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400', likes: 33300 },
  { id: 3, name: 'Citra Anggraini', avatar: 'https://i.pravatar.cc/150?img=9', image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', likes: 44400 },
  { id: 4, name: 'Budi Santoso', avatar: 'https://i.pravatar.cc/150?img=3', image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400', likes: 22500 },
  { id: 5, name: 'Dewi Lestari', avatar: 'https://i.pravatar.cc/150?img=10', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400', likes: 18900 },
  { id: 6, name: 'Ahmad Fauzi', avatar: 'https://i.pravatar.cc/150?img=7', image: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400', likes: 15700 },
];

export const Dashboard = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [weeklyContent, setWeeklyContent] = useState<PlannedContent[]>([]);
  const [tokenBalance, setTokenBalance] = useState(200);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator';

  // UI text for active jobs section
  const jobsText = {
    title: language === 'id' ? 'Proses Aktif' : language === 'hi' ? 'सक्रिय प्रक्रिया' : 'Active Jobs',
    imageGen: language === 'id' ? 'Generate Gambar' : language === 'hi' ? 'छवि जनरेशन' : 'Image Generation',
    videoGen: language === 'id' ? 'Generate Video' : language === 'hi' ? 'वीडियो जनरेशन' : 'Video Generation',
    processing: language === 'id' ? 'Sedang diproses...' : language === 'hi' ? 'प्रोसेसिंग...' : 'Processing...',
    paused: language === 'id' ? 'Dijeda' : language === 'hi' ? 'रुका हुआ' : 'Paused',
    completed: language === 'id' ? 'Selesai' : language === 'hi' ? 'पूर्ण' : 'Completed',
    failed: language === 'id' ? 'Gagal' : language === 'hi' ? 'विफल' : 'Failed',
    needsRetry: language === 'id' ? 'Perlu Retry' : language === 'hi' ? 'पुनः प्रयास करें' : 'Needs Retry',
    continue: language === 'id' ? 'Lanjutkan' : language === 'hi' ? 'जारी रखें' : 'Continue',
    noActiveJobs: language === 'id' ? 'Tidak ada proses aktif' : language === 'hi' ? 'कोई सक्रिय प्रक्रिया नहीं' : 'No active jobs',
  };

  // Fetch active jobs - show only ONE job per session (latest stage: video > image)
  const fetchActiveJobs = useCallback(async () => {
    if (!user) return;

    try {
      setJobsLoading(true);

      // Fetch image generation jobs grouped by session
      const { data: imageJobs, error: imageError } = await supabase
        .from('image_generation_jobs')
        .select('session_id, topic, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (imageError) {
        console.error('Error fetching image jobs:', imageError);
      }

      // Fetch video generation jobs grouped by session
      const { data: videoJobs, error: videoError } = await supabase
        .from('video_generation_jobs')
        .select('session_id, topic, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (videoError) {
        console.error('Error fetching video jobs:', videoError);
      }

      // Group image jobs by session
      const imageJobsBySession: Record<string, any[]> = {};
      imageJobs?.forEach(job => {
        if (!imageJobsBySession[job.session_id]) {
          imageJobsBySession[job.session_id] = [];
        }
        imageJobsBySession[job.session_id].push(job);
      });

      // Group video jobs by session
      const videoJobsBySession: Record<string, any[]> = {};
      videoJobs?.forEach(job => {
        if (!videoJobsBySession[job.session_id]) {
          videoJobsBySession[job.session_id] = [];
        }
        videoJobsBySession[job.session_id].push(job);
      });

      // Get all unique session IDs
      const allSessionIds = new Set([
        ...Object.keys(imageJobsBySession),
        ...Object.keys(videoJobsBySession)
      ]);

      // Convert to ActiveJob format - ONE entry per session (latest stage only)
      const activeJobsList: ActiveJob[] = [];

      allSessionIds.forEach(sessionId => {
        const imgJobs = imageJobsBySession[sessionId] || [];
        const vidJobs = videoJobsBySession[sessionId] || [];
        
        // Determine which stage to show (video takes priority if exists)
        const hasVideoJobs = vidJobs.length > 0;
        const jobs = hasVideoJobs ? vidJobs : imgJobs;
        const jobType: 'image' | 'video' = hasVideoJobs ? 'video' : 'image';
        
        if (jobs.length === 0) return;
        
        const pending = jobs.filter(j => j.status === JOB_STATUS.PENDING).length;
        const processing = jobs.filter(j => j.status === JOB_STATUS.PROCESSING).length;
        const completed = jobs.filter(j => j.status === JOB_STATUS.COMPLETED).length;
        const failed = jobs.filter(j => j.status === JOB_STATUS.FAILED).length;
        
        // Get most recent update time
        const mostRecentUpdate = jobs.reduce((latest, j) => {
          const jobDate = new Date(j.updated_at || j.created_at);
          return jobDate > latest ? jobDate : latest;
        }, new Date(0));
        
        const isRecent = (Date.now() - mostRecentUpdate.getTime()) < 3600000; // 1 hour
        const hasPendingOrProcessing = pending > 0 || processing > 0;
        const hasFailedNeedingRetry = failed > 0 && completed < jobs.length;
        
        // Only show if active or recently updated
        if (hasPendingOrProcessing || (isRecent && (completed > 0 || hasFailedNeedingRetry))) {
          activeJobsList.push({
            session_id: sessionId,
            type: jobType,
            topic: jobs[0]?.topic || imgJobs[0]?.topic || 'Video Project',
            total: jobs.length,
            completed,
            failed,
            pending,
            processing,
            created_at: jobs[0]?.created_at || '',
            updated_at: mostRecentUpdate.toISOString()
          });
        }
      });

      // Sort by updated_at desc
      activeJobsList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setActiveJobs(activeJobsList);
    } catch (err) {
      console.error('Error fetching active jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  }, [user]);

  // Fetch active jobs on mount and set up polling
  useEffect(() => {
    fetchActiveJobs();

    // Poll every 10 seconds - check stalled status inside the interval
    const interval = setInterval(() => {
      fetchActiveJobs();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchActiveJobs]);

  // Realtime subscription for job updates
  useEffect(() => {
    if (!user) return;

    const imageChannel = supabase
      .channel('image_jobs_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'image_generation_jobs',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchActiveJobs();
        }
      )
      .subscribe();

    const videoChannel = supabase
      .channel('video_jobs_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generation_jobs',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchActiveJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(imageChannel);
      supabase.removeChannel(videoChannel);
    };
  }, [user, fetchActiveJobs]);

  useEffect(() => {
    const initDashboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("onboarding_completed, creative_dna, interest")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Dashboard - Database error:", error);
        } else if (!profile) {
          navigate('/welcome');
          return;
        } else {
          const hasCreativeDNA = profile.creative_dna && Array.isArray(profile.creative_dna) && profile.creative_dna.length > 0;
          const hasInterest = profile.interest && profile.interest.trim() !== '';
          const isOnboardingComplete = profile.onboarding_completed === true;
          const hasAnyData = hasCreativeDNA || hasInterest || isOnboardingComplete;

          if (hasAnyData) {
            if (!profile.onboarding_completed) {
              await supabase.from("user_profiles").update({ 
                onboarding_completed: true
              }).eq("user_id", user.id);
            }
          } else {
            navigate('/welcome');
            return;
          }
        }

        // Fetch weekly content plan
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const { data: contentData } = await supabase
          .from("planned_content")
          .select("*")
          .eq("user_id", user.id)
          .gte("scheduled_date", today.toISOString().split("T")[0])
          .lte("scheduled_date", nextWeek.toISOString().split("T")[0])
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true })
          .limit(4);

        if (contentData) setWeeklyContent(contentData);

        // Fetch token balance
        const { data: tokenData } = await supabase
          .from("user_tokens")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (tokenData) setTokenBalance(tokenData.balance);

      } catch (err) {
        console.error("Error initializing dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [user, navigate]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const localeMap: Record<string, string> = {
      'id': 'id-ID',
      'en': 'en-US',
      'hi': 'hi-IN',
    };
    return date.toLocaleDateString(localeMap[language] || 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatLikes = (num: number): string => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return language === 'id' ? 'Baru saja' : 'Just now';
    if (diffMins < 60) return language === 'id' ? `${diffMins} menit lalu` : `${diffMins}m ago`;
    if (diffHours < 24) return language === 'id' ? `${diffHours} jam lalu` : `${diffHours}h ago`;
    return formatDate(dateStr);
  };

  const getGreeting = (): string => {
    return t.dashboard.greeting.replace('{name}', userName);
  };

  const handleJobClick = (job: ActiveJob) => {
    if (job.type === 'image') {
      navigate(`/video-editor?session=${job.session_id}`);
    } else {
      navigate(`/video-generation?session=${job.session_id}`);
    }
  };

  const quickActions = [
    {
      icon: Sparkles,
      title: t.dashboard.quickActionsData.createNow,
      subtitle: t.dashboard.quickActionsData.createNowDesc,
      onClick: () => navigate('/script-lab'),
      bgColor: 'bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5',
      iconBg: 'bg-[#7c3aed]',
    },
    {
      icon: Calendar,
      title: t.dashboard.quickActionsData.openPlanner,
      subtitle: t.dashboard.quickActionsData.openPlannerDesc,
      onClick: () => navigate('/planner'),
      bgColor: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500',
    },
    {
      icon: TrendingUp,
      title: t.dashboard.quickActionsData.checkInsight,
      subtitle: t.dashboard.quickActionsData.checkInsightDesc,
      onClick: () => {},
      bgColor: 'bg-gradient-to-br from-pink-500/20 to-pink-500/5',
      iconBg: 'bg-pink-500',
      disabled: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex w-full min-h-screen bg-page items-center justify-center">
        <div className="text-text-primary text-xl">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-page">
      <AppSidebar activePage="dashboard" />

      <div className="flex-1 lg:ml-0">
        <TopNavbar tokenBalance={tokenBalance} />

        <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
          {/* Greeting */}
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-6">
            {getGreeting()}
          </h1>

          {/* Active Jobs Section */}
          {(activeJobs.length > 0 || jobsLoading) && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                {jobsText.title}
                {activeJobs.some(j => {
                  const isComplete = j.pending === 0 && j.processing === 0;
                  const hasErrors = j.failed > 0;
                  const timeSince = Date.now() - new Date(j.updated_at).getTime();
                  const isTimedOut = timeSince > 120000;
                  const isStalled = !isComplete && (isTimedOut || (hasErrors && j.processing === 0));
                  // Only pulse if actively processing
                  return !isComplete && !isStalled && j.processing > 0;
                }) && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </h2>

              {jobsLoading ? (
                <div className="bg-card border border-border-default rounded-lg p-4 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary animate-spin mr-2" />
                  <span className="text-text-secondary text-sm">{t.common.loading}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {activeJobs.map((job) => {
                    const isComplete = job.pending === 0 && job.processing === 0;
                    const hasErrors = job.failed > 0;
                    const allFailed = job.failed === job.total;
                    const needsRetry = isComplete && hasErrors && job.completed < job.total;
                    const progress = job.total > 0 ? (job.completed / job.total) * 100 : 0;
                    
                    // Check if job is stalled or needs attention
                    const timeSinceUpdate = Date.now() - new Date(job.updated_at).getTime();
                    const isTimedOut = timeSinceUpdate > 120000; // 2 minutes
                    
                    // Show "Paused" if:
                    // 1. Has pending but timed out (user left page)
                    // 2. Has failed jobs and nothing actively processing (rate limited)
                    const isStalled = !isComplete && (
                      isTimedOut || 
                      (hasErrors && job.processing === 0)
                    );
                    
                    // Only show spinner if actively processing
                    const isActivelyProcessing = !isComplete && !isStalled && job.processing > 0;
                    
                    return (
                      <button
                        key={`${job.type}-${job.session_id}`}
                        onClick={() => handleJobClick(job)}
                        className={`bg-card border rounded-lg p-3 hover:border-primary/50 transition-all text-left min-w-[280px] max-w-[400px] flex-1 ${
                          allFailed ? 'border-red-500/50' : needsRetry || isStalled ? 'border-amber-500/50' : 'border-border-default'
                        }`}
                      >
                        {/* Header - Compact */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                              isComplete 
                                ? allFailed ? 'bg-red-500/20' : hasErrors ? 'bg-amber-500/20' : 'bg-green-500/20'
                                : isStalled ? 'bg-amber-500/20' : 'bg-primary/20'
                            }`}>
                              {job.type === 'image' ? (
                                <ImageIcon className={`w-4 h-4 ${
                                  isComplete 
                                    ? allFailed ? 'text-red-400' : hasErrors ? 'text-amber-400' : 'text-green-400'
                                    : isStalled ? 'text-amber-400' : 'text-primary'
                                }`} />
                              ) : (
                                <Video className={`w-4 h-4 ${
                                  isComplete 
                                    ? allFailed ? 'text-red-400' : hasErrors ? 'text-amber-400' : 'text-green-400'
                                    : isStalled ? 'text-amber-400' : 'text-primary'
                                }`} />
                              )}
                            </div>
                            <div>
                              <h3 className="text-text-primary font-medium text-xs">
                                {job.type === 'image' ? jobsText.imageGen : jobsText.videoGen}
                              </h3>
                              <p className="text-text-muted text-[10px]">
                                {formatTimeAgo(job.updated_at)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Status indicator */}
                          <div className="flex items-center gap-2">
                            {needsRetry && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                allFailed ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {jobsText.needsRetry}
                              </span>
                            )}
                            {isStalled && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                                {jobsText.paused}
                              </span>
                            )}
                            {isComplete ? (
                              allFailed ? (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              ) : hasErrors ? (
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              )
                            ) : isStalled ? (
                              <Play className="w-4 h-4 text-amber-400" />
                            ) : isActivelyProcessing ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            )}
                          </div>
                        </div>

                        {/* Topic - Single line */}
                        <p className="text-text-secondary text-xs mb-2 line-clamp-1">
                          {job.topic}
                        </p>

                        {/* Progress Bar - Compact */}
                        <div className="space-y-1">
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isComplete 
                                  ? allFailed ? 'bg-red-500' : hasErrors ? 'bg-amber-500' : 'bg-green-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${allFailed ? 100 : progress}%` }}
                            />
                          </div>
                          
                          {/* Stats - Inline */}
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              {job.completed > 0 && <span className="text-green-400">✓{job.completed}</span>}
                              {job.failed > 0 && <span className="text-red-400">✗{job.failed}</span>}
                              {job.completed === 0 && job.failed === 0 && <span className="text-text-muted">-</span>}
                            </div>
                            <span className="text-text-muted">{job.completed}/{job.total}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`${action.bgColor} border border-border-default rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`${action.iconBg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-text-primary font-semibold">{action.title}</h3>
                  <p className="text-text-secondary text-sm">{action.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Content Plan This Week */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {t.dashboard.contentPlan.title}
            </h2>

            {weeklyContent.length === 0 ? (
              <div className="bg-card border border-border-default rounded-xl p-8 text-center">
                <p className="text-text-secondary mb-4">
                  {t.dashboard.contentPlan.noContent}
                </p>
                <button
                  onClick={() => navigate('/planner')}
                  className="text-primary font-medium hover:underline"
                >
                  {t.dashboard.contentPlan.scheduleNow} →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {weeklyContent.map((content) => (
                  <div
                    key={content.id}
                    onClick={() => navigate('/planner')}
                    className="bg-card border border-border-default rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-surface text-text-primary text-xs px-2 py-1 rounded">
                        {formatDate(content.scheduled_date)}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-text-muted" />
                    </div>
                    <h3 className="text-text-primary font-medium mb-3 line-clamp-2 min-h-[48px]">
                      {content.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <PlatformIcons platforms={content.platforms} size="sm" />
                      <div className="flex items-center gap-1 bg-primary/20 px-2 py-1 rounded text-primary text-xs">
                        <Clock className="w-3 h-3" />
                        {content.scheduled_time?.slice(0, 5) || '07:00'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Creator Gallery */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary">
                  {t.dashboard.creatorGallery.title}
                </h2>
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                  {t.dashboard.creatorGallery.new}
                </span>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                {t.dashboard.creatorGallery.viewAll}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sampleCreatorGallery.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-xl overflow-hidden aspect-[4/5]"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-7 h-7 rounded-full object-cover border-2 border-white/20"
                        />
                        <span className="text-white text-sm font-medium truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-white/80 text-sm">
                        <Heart className="w-4 h-4" />
                        {formatLikes(item.likes)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
