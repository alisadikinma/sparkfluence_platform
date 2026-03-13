import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  CalendarDays, Clock, RefreshCw, ChevronLeft, ChevronRight,
  Image, Video, Megaphone, AlertCircle, CheckCircle2, XCircle,
  Loader2, Link2
} from 'lucide-react';

interface ScheduledPost {
  id: string;
  contentType: 'carousel' | 'creator_lab' | 'ad_studio';
  contentId: string;
  platform: string;
  caption: string | null;
  hashtags: string[];
  scheduleType: 'now' | 'scheduled';
  scheduledAt: string | null;
  timezone: string;
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled';
  postedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  socialAccountLabel: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  publishing: { label: 'Publishing', icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  published: { label: 'Published', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-neutral-400', bg: 'bg-neutral-500/10' },
};

const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  carousel: { label: 'Carousel', icon: Image, color: 'text-pink-400' },
  creator_lab: { label: 'Creator Lab', icon: Video, color: 'text-emerald-400' },
  ad_studio: { label: 'Ad Studio', icon: Megaphone, color: 'text-blue-400' },
};

interface SchedulingTabProps {
  userId: string;
}

export const SchedulingTab: React.FC<SchedulingTabProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('scheduled_posts')
      .select(`
        *,
        social_accounts!inner(account_label)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (statusFilter !== 'all') {
      query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPosts(data.map((row: any) => ({
        id: row.id,
        contentType: row.content_type,
        contentId: row.content_id,
        platform: row.platform,
        caption: row.caption,
        hashtags: row.hashtags || [],
        scheduleType: row.schedule_type,
        scheduledAt: row.scheduled_at,
        timezone: row.timezone,
        status: row.status,
        postedAt: row.posted_at,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        socialAccountLabel: row.social_accounts?.account_label || null,
      })));
    }
    setLoading(false);
  }, [userId, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Calendar helpers
  const calendarMonth = calendarDate.getMonth();
  const calendarYear = calendarDate.getFullYear();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const monthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getPostsForDate = (day: number): ScheduledPost[] => {
    return posts.filter(p => {
      if (!p.scheduledAt) return false;
      const d = new Date(p.scheduledAt);
      return d.getDate() === day && d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
    });
  };

  const statusCounts = posts.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-200">Scheduling</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {posts.length} total posts · {statusCounts.pending || 0} pending
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Calendar
            </button>
          </div>
          <button
            onClick={fetchPosts}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'publishing', 'published', 'failed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            {s !== 'all' && statusCounts[s] ? ` (${statusCounts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <CalendarDays className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-neutral-200 font-semibold mb-2">No scheduled posts</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Schedule your first post from the Carousel, Creator Lab, or Ad Studio workspace.
          </p>
          <button
            onClick={() => navigate('/settings/social-accounts')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Connect Social Accounts
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-3">
          {posts.map((post) => {
            const statusConf = STATUS_CONFIG[post.status] || STATUS_CONFIG.pending;
            const typeConf = CONTENT_TYPE_CONFIG[post.contentType] || CONTENT_TYPE_CONFIG.carousel;
            const StatusIcon = statusConf.icon;
            const TypeIcon = typeConf.icon;

            return (
              <div
                key={post.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-lg ${statusConf.bg} flex items-center justify-center flex-shrink-0`}>
                  <StatusIcon className={`w-5 h-5 ${statusConf.color} ${post.status === 'publishing' ? 'animate-spin' : ''}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <TypeIcon className={`w-3.5 h-3.5 ${typeConf.color}`} />
                    <span className="text-xs text-neutral-400">{typeConf.label}</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-xs text-neutral-500 capitalize">{post.platform}</span>
                    {post.socialAccountLabel && (
                      <>
                        <span className="text-neutral-700">·</span>
                        <span className="text-xs text-neutral-500">{post.socialAccountLabel}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-neutral-300 truncate">
                    {post.caption || 'No caption'}
                  </p>
                  {post.errorMessage && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-xs text-red-400 truncate">{post.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Schedule Time */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-neutral-400">
                    {post.scheduleType === 'now' ? 'Post Now' : formatDateTime(post.scheduledAt)}
                  </p>
                  {post.postedAt && (
                    <p className="text-xs text-emerald-400 mt-0.5">
                      Posted {formatDateTime(post.postedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Calendar View */
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-neutral-200">{monthLabel}</span>
            <button
              onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs text-neutral-600 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = getPostsForDate(day);
              const isToday =
                day === new Date().getDate() &&
                calendarMonth === new Date().getMonth() &&
                calendarYear === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`h-20 rounded-lg border p-1.5 ${
                    isToday
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-neutral-800/50 hover:border-neutral-700'
                  }`}
                >
                  <span className={`text-xs ${isToday ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayPosts.slice(0, 2).map(p => {
                      const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                      return (
                        <div
                          key={p.id}
                          className={`text-[9px] px-1 py-0.5 rounded truncate ${sc.bg} ${sc.color}`}
                        >
                          {p.platform}
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <span className="text-[9px] text-neutral-500">+{dayPosts.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
