import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { PlatformIcons } from "../../components/ui/platform-icons";
import {
  Sparkles, Calendar, TrendingUp, Clock, ArrowUpRight,
  Heart, ChevronRight
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
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator';

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

  const getGreeting = (): string => {
    return t.dashboard.greeting.replace('{name}', userName);
  };

  const quickActions = [
    {
      icon: Sparkles,
      title: t.dashboard.quickActionsData.createNow,
      subtitle: t.dashboard.quickActionsData.createNowDesc,
      onClick: () => navigate('/script-lab'),
      bgColor: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500',
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
      <div className="flex w-full h-full bg-page items-center justify-center">
        <div className="text-text-primary text-xl">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <main className="pt-8 pb-8 px-4 sm:px-6 lg:px-8">
          {/* Greeting */}
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mb-6">
            {getGreeting()}
          </h1>

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
  );
};
