import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { PlatformIcons } from "../../components/ui/platform-icons";
import { AnalyticsTab } from "./AnalyticsTab";
import { SchedulingTab } from "./SchedulingTab";
import {
  Calendar, Clock, ArrowUpRight,
  ChevronRight, LayoutDashboard, BarChart3, CalendarDays,
  Zap, MessageSquare, Clapperboard, GalleryHorizontalEnd,
  Plus, Layers, CheckCircle2, ImageIcon, FileVideo, FileText
} from "lucide-react";

// ═══ Tab Definitions ═══

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'scheduling', label: 'Scheduling', icon: CalendarDays },
  { id: 'automation', label: 'Automation', icon: Zap, comingSoon: true },
  { id: 'inbox', label: 'Inbox', icon: MessageSquare, comingSoon: true },
] as const;

type TabId = typeof TABS[number]['id'];

// ═══ Overview Tab Types ═══

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

interface CarouselProject {
  id: string;
  project_id: string;
  title: string;
  status: string;
  slide_count: number;
  updated_at: string;
}

// ═══ Status config for Carousel ═══

const CAROUSEL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:        { label: 'Draft',       color: 'text-neutral-400', bg: 'bg-neutral-800' },
  source_ready: { label: 'Source Ready', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  generated:    { label: 'Generated',   color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  edited:       { label: 'Edited',      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  video_ready:  { label: 'Video Ready', color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  published:    { label: 'Published',   color: 'text-green-400',   bg: 'bg-green-500/10' },
};

const CAROUSEL_STATUS_ICON: Record<string, React.ComponentType<any>> = {
  draft:        FileText,
  source_ready: ImageIcon,
  generated:    Layers,
  edited:       Layers,
  video_ready:  FileVideo,
  published:    CheckCircle2,
};

// ═══ Overview Tab Component ═══

const OverviewContent: React.FC<{
  weeklyContent: PlannedContent[];
  carouselProjects: CarouselProject[];
  navigate: ReturnType<typeof useNavigate>;
  t: any;
  language: string;
}> = ({ weeklyContent, carouselProjects, navigate, t, language }) => {

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const localeMap: Record<string, string> = { 'id': 'id-ID', 'en': 'en-US', 'hi': 'hi-IN' };
    return date.toLocaleDateString(localeMap[language] || 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatRelativeTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const quickActions = [
    {
      icon: Clapperboard,
      title: 'Creator Lab',
      subtitle: 'Create viral video content',
      onClick: () => navigate('/creator-lab'),
      gradient: 'from-emerald-500/20 via-emerald-500/8 to-transparent',
      iconBg: 'bg-emerald-500',
      border: 'hover:border-emerald-500/40',
      badge: null,
    },
    {
      icon: Calendar,
      title: 'Content Planner',
      subtitle: 'Plan & schedule posts',
      onClick: () => navigate('/planner'),
      gradient: 'from-blue-500/20 via-blue-500/8 to-transparent',
      iconBg: 'bg-blue-500',
      border: 'hover:border-blue-500/40',
      badge: weeklyContent.length > 0 ? `${weeklyContent.length} this week` : null,
    },
    {
      icon: GalleryHorizontalEnd,
      title: 'Carousel Images',
      subtitle: 'Create scroll-stopping slides',
      onClick: () => navigate('/carousel-images'),
      gradient: 'from-violet-500/20 via-violet-500/8 to-transparent',
      iconBg: 'bg-violet-500',
      border: 'hover:border-violet-500/40',
      badge: carouselProjects.length > 0 ? `${carouselProjects.length} projects` : null,
    },
  ];

  return (
    <>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              bg-gradient-to-br ${action.gradient}
              border border-neutral-800 ${action.border}
              rounded-xl p-4 flex items-center gap-4 transition-all duration-200
              text-left group cursor-pointer
            `}
          >
            <div className={`${action.iconBg} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-200`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[#F5F5F5] font-semibold text-sm">{action.title}</h3>
              <p className="text-neutral-500 text-xs mt-0.5">{action.subtitle}</p>
            </div>
            {action.badge && (
              <span className="text-[10px] font-medium text-neutral-400 bg-neutral-800 px-2 py-1 rounded-full flex-shrink-0">
                {action.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Plan This Week */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">
            {t.dashboard.contentPlan.title}
          </h2>
          <button
            onClick={() => navigate('/planner')}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Open Planner
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {weeklyContent.length === 0 ? (
          <div
            onClick={() => navigate('/planner')}
            className="border border-dashed border-neutral-800 rounded-xl p-6 text-center cursor-pointer hover:border-neutral-700 hover:bg-neutral-900/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto mb-3 group-hover:bg-neutral-700 transition-colors">
              <Calendar className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-500 mb-2">{t.dashboard.contentPlan.noContent}</p>
            <span className="text-xs font-medium text-blue-400">
              {t.dashboard.contentPlan.scheduleNow} →
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weeklyContent.map((content) => (
              <div
                key={content.id}
                onClick={() => navigate('/planner')}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-neutral-800 text-neutral-400 text-[11px] px-2 py-0.5 rounded font-medium">
                    {formatDate(content.scheduled_date)}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                </div>
                <h3 className="text-[#F5F5F5] text-sm font-medium mb-3 line-clamp-2 min-h-[40px] leading-snug">
                  {content.title}
                </h3>
                <div className="flex items-center justify-between">
                  <PlatformIcons platforms={content.platforms} size="sm" />
                  <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 text-xs">
                    <Clock className="w-3 h-3" />
                    {content.scheduled_time?.slice(0, 5) || '07:00'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Carousel Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Carousel Projects</h2>
            {carouselProjects.length > 0 && (
              <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] px-2 py-0.5 rounded-full font-medium">
                {carouselProjects.length}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/carousel-images')}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {carouselProjects.length === 0 ? (
          /* Empty state — CTA to create first carousel */
          <div
            onClick={() => navigate('/carousel-images')}
            className="border border-dashed border-neutral-800 rounded-xl p-8 cursor-pointer hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
                <GalleryHorizontalEnd className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-sm font-medium text-neutral-400 mb-1">No carousel projects yet</p>
              <p className="text-xs text-neutral-600 mb-4 max-w-xs">
                Import Instagram slides or upload images to create your first AI-rebrand carousel
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg group-hover:bg-violet-500/20 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Create Carousel
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {carouselProjects.map((project) => {
              const statusCfg = CAROUSEL_STATUS_CONFIG[project.status] || CAROUSEL_STATUS_CONFIG.draft;
              const StatusIcon = CAROUSEL_STATUS_ICON[project.status] || FileText;

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/carousel-images/${project.project_id}`)}
                  className="bg-neutral-900 border border-neutral-800 hover:border-violet-500/30 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${statusCfg.bg} ${statusCfg.color} flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-violet-400 transition-colors" />
                  </div>

                  <h3 className="text-[#F5F5F5] text-sm font-medium mb-3 line-clamp-1">
                    {project.title || 'Untitled Project'}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      <Layers className="w-3 h-3" />
                      {project.slide_count ?? 0} slides
                    </div>
                    <span className="text-[11px] text-neutral-600">
                      {formatRelativeTime(project.updated_at)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* New project CTA card */}
            <button
              onClick={() => navigate('/carousel-images')}
              className="border border-dashed border-neutral-800 hover:border-violet-500/30 hover:bg-violet-500/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 group min-h-[100px]"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Plus className="w-4 h-4 text-neutral-500 group-hover:text-violet-400 transition-colors" />
              </div>
              <span className="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">New Carousel</span>
            </button>
          </div>
        )}
      </section>
    </>
  );
};

// ═══ Coming Soon Placeholder ═══

const ComingSoonTab: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mb-4">
      <Zap className="w-8 h-8 text-neutral-600" />
    </div>
    <h3 className="text-lg font-semibold text-neutral-200 mb-2">{title}</h3>
    <p className="text-sm text-neutral-500 text-center max-w-md">{description}</p>
    <span className="mt-4 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400">
      Coming in Phase 6
    </span>
  </div>
);

// ═══ Main Dashboard Component ═══

export const Dashboard = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [weeklyContent, setWeeklyContent] = useState<PlannedContent[]>([]);
  const [carouselProjects, setCarouselProjects] = useState<CarouselProject[]>([]);

  const activeTab = (searchParams.get('tab') as TabId) || 'overview';
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Creator';

  const setActiveTab = (tab: TabId) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

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

        // Fetch weekly content plan (current week: Sunday to Saturday)
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

        const { data: contentData } = await supabase
          .from("planned_content")
          .select("*")
          .eq("user_id", user.id)
          .gte("scheduled_date", startOfWeek.toISOString().split("T")[0])
          .lte("scheduled_date", endOfWeek.toISOString().split("T")[0])
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true })
          .limit(8);

        if (contentData) setWeeklyContent(contentData);

        // Fetch recent carousel projects
        const { data: carouselData, error: carouselError } = await supabase
          .from("carousel_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5);

        if (carouselError) {
          console.error("Dashboard - Carousel fetch error:", carouselError);
        } else if (carouselData) {
          setCarouselProjects(carouselData.map((row: any) => ({
            id: row.id,
            project_id: row.project_id,
            title: row.title,
            status: row.status,
            slide_count: row.slide_count ?? 0,
            updated_at: row.updated_at,
          })));
        }

      } catch (err) {
        console.error("Error initializing dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [user, navigate]);

  const getGreeting = (): string => {
    return t.dashboard.greeting.replace('{name}', userName);
  };

  if (loading) {
    return (
      <div className="flex w-full h-full bg-[#0B0E14] items-center justify-center">
        <div className="text-neutral-400 text-sm">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with Greeting + Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#F5F5F5] mb-4">
          {getGreeting()}
        </h1>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 border-b border-neutral-800">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isComingSoon = 'comingSoon' in tab && tab.comingSoon;

            return (
              <button
                key={tab.id}
                onClick={() => !isComingSoon && setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap
                  ${isActive
                    ? 'text-emerald-400'
                    : isComingSoon
                      ? 'text-neutral-700 cursor-not-allowed'
                      : 'text-neutral-500 hover:text-neutral-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isComingSoon && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-600">
                    Soon
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {activeTab === 'overview' && (
          <OverviewContent
            weeklyContent={weeklyContent}
            carouselProjects={carouselProjects}
            navigate={navigate}
            t={t}
            language={language}
          />
        )}

        {activeTab === 'analytics' && user && (
          <AnalyticsTab userId={user.id} />
        )}

        {activeTab === 'scheduling' && user && (
          <SchedulingTab userId={user.id} />
        )}

        {activeTab === 'automation' && (
          <ComingSoonTab
            title="Automation"
            description="Build Instagram DM automation flows with a visual builder. Trigger responses to comments and messages automatically."
          />
        )}

        {activeTab === 'inbox' && (
          <ComingSoonTab
            title="Inbox"
            description="View and manage all your Instagram conversations in one place. Track automation interactions and reply manually."
          />
        )}
      </div>
    </div>
  );
};
