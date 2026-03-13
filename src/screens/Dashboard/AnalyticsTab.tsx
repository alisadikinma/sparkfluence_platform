import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart3, Eye, Heart, MessageCircle, Share2, Bookmark,
  TrendingUp, TrendingDown, RefreshCw, Loader2, ChevronUp,
  ChevronDown, ChevronLeft, ChevronRight, Link2, Trophy,
  Clock, Users, MapPin, Calendar, Beaker, Filter, ArrowRight,
  Image as ImageIcon, Minus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  PostAnalytics,
  PostAnalyticsRow,
  ABExperiment,
  ABExperimentRow,
  AudienceInsight,
  AudienceInsightRow,
  DateRange,
  AnalyticsContentType,
  SlideMetric,
  FunnelStage,
} from '../../types/analytics';
import {
  mapPostAnalyticsRow,
  mapABExperimentRow,
  mapAudienceInsightRow,
  CONTENT_TYPE_CONFIG,
  SLIDE_TYPE_COLORS,
} from '../../types/analytics';

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

const POSTS_PER_PAGE = 10;

const SEGMENT_LABELS: Record<number, string> = {
  0: 'HOOK',
  1: 'FORE',
  2: 'BODY',
  3: 'BODY',
  4: 'BODY',
  5: 'BODY',
  6: 'BODY',
  7: 'BODY',
  8: 'PEAK',
  9: 'CTA',
};

type SortField = 'posted_at' | 'impressions' | 'reach' | 'engagement_rate' | 'likes' | 'comments' | 'shares' | 'saves';
type SortDir = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateCutoff(range: DateRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getSegmentLabel(position: number, totalSlides: number): string {
  if (position === 0) return 'HOOK';
  if (position === totalSlides - 1) return 'CTA';
  if (position === 1) return 'FORE';
  if (position >= totalSlides - 3 && position < totalSlides - 1) return 'PEAK';
  return 'BODY';
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsTabProps {
  userId: string;
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-neutral-900 border border-neutral-800 rounded-xl p-4 animate-pulse ${className}`}>
    <div className="h-3 w-20 bg-neutral-800 rounded mb-3" />
    <div className="h-7 w-32 bg-neutral-800 rounded mb-2" />
    <div className="h-3 w-16 bg-neutral-800 rounded" />
  </div>
);

const SkeletonTable: React.FC = () => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 animate-pulse">
    <div className="h-4 w-40 bg-neutral-800 rounded mb-4" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex gap-4 py-3 border-t border-neutral-800/50">
        <div className="h-4 w-10 bg-neutral-800 rounded" />
        <div className="h-4 flex-1 bg-neutral-800 rounded" />
        <div className="h-4 w-16 bg-neutral-800 rounded" />
        <div className="h-4 w-16 bg-neutral-800 rounded" />
      </div>
    ))}
  </div>
);

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-3 text-neutral-700">{icon}</div>
    <p className="text-neutral-400 text-sm font-medium">{title}</p>
    <p className="text-neutral-600 text-xs mt-1 max-w-xs">{description}</p>
  </div>
);

// ─── Section Wrapper ─────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <div className={`bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden ${className}`}>
    <div className="px-5 py-3.5 border-b border-neutral-800/50">
      <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Trend Badge ─────────────────────────────────────────────────────────────

const TrendBadge: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <span className="text-xs text-neutral-600">--</span>;
  const isUp = value > 0;
  const isFlat = value === 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isFlat
          ? 'text-neutral-500'
          : isUp
          ? 'text-emerald-400'
          : 'text-red-400'
      }`}
    >
      {isFlat ? (
        <Minus className="w-3 h-3" />
      ) : isUp ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

// ─── SVG Line Chart (Time Trends) ────────────────────────────────────────────

const LineChart: React.FC<{
  data: Array<{ date: string; value: number }>;
  color: string;
  height?: number;
}> = ({ data, color, height = 200 }) => {
  if (data.length === 0) return null;

  const W = 700;
  const H = height;
  const PX = 50;
  const PY = 20;
  const plotW = W - PX * 2;
  const plotH = H - PY * 2;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * plotW,
    y: PY + plotH - ((d.value - minVal) / range) * plotH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${PY + plotH} L ${points[0].x} ${PY + plotH} Z`;

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    Math.round(minVal + (range * i) / (yTicks - 1))
  );

  // X-axis labels (show ~6 labels max)
  const xStep = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yTickValues.map((v, i) => {
        const y = PY + plotH - ((v - minVal) / range) * plotH;
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#262626" strokeWidth="1" />
            <text x={PX - 8} y={y + 4} textAnchor="end" fill="#737373" fontSize="10">
              {formatNumber(v)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill={color} opacity="0.08" />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#161616" strokeWidth="1.5">
          <title>{`${p.date}: ${formatNumber(p.value)}`}</title>
        </circle>
      ))}

      {/* X-axis labels */}
      {xLabels.map((d) => {
        const idx = data.indexOf(d);
        const x = PX + (idx / Math.max(data.length - 1, 1)) * plotW;
        const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <text key={d.date} x={x} y={H - 2} textAnchor="middle" fill="#737373" fontSize="10">
            {label}
          </text>
        );
      })}
    </svg>
  );
};

// ─── SVG Horizontal Bar Chart ────────────────────────────────────────────────

const HorizontalBarChart: React.FC<{
  data: Array<{ label: string; value: number; color: string }>;
}> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 w-16 text-right flex-shrink-0">{d.label}</span>
          <div className="flex-1 h-6 bg-neutral-800 rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${(d.value / maxVal) * 100}%`,
                backgroundColor: d.color,
                opacity: 0.7,
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-300 font-medium">
              {formatNumber(d.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

const DonutChart: React.FC<{
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}> = ({ data, size = 160 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const r = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * r;

  let accumulated = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d) => {
          const pct = d.value / total;
          const dashLength = pct * circumference;
          const dashOffset = -accumulated * circumference;
          accumulated += pct;
          return (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              opacity="0.8"
            >
              <title>{`${d.label}: ${d.value}%`}</title>
            </circle>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#F5F5F5" fontSize="18" fontWeight="600">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#737373" fontSize="10">
          total
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-neutral-400">{d.label}</span>
            <span className="text-xs text-neutral-200 font-medium">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Mini Bar Chart (Active Hours) ───────────────────────────────────────────

const MiniBarChart: React.FC<{
  data: Record<string, number>;
  barColor?: string;
}> = ({ data, barColor = '#10B981' }) => {
  const entries = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    value: data[String(i)] ?? 0,
  }));
  const maxVal = Math.max(...entries.map(e => e.value), 1);

  return (
    <div className="flex items-end gap-[2px] h-16">
      {entries.map((e) => (
        <div
          key={e.hour}
          className="flex-1 rounded-t-sm transition-all duration-300 relative group"
          style={{
            height: `${(e.value / maxVal) * 100}%`,
            backgroundColor: barColor,
            opacity: e.value > 0 ? 0.3 + (e.value / maxVal) * 0.7 : 0.1,
            minHeight: '2px',
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-[9px] text-neutral-300 whitespace-nowrap z-10">
            {e.hour}:00 — {formatNumber(e.value)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Engagement Funnel ───────────────────────────────────────────────────────

const FunnelChart: React.FC<{ stages: FunnelStage[] }> = ({ stages }) => {
  const maxVal = stages[0]?.value || 1;

  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, i) => {
        const widthPct = Math.max((stage.value / maxVal) * 100, 8);
        return (
          <div key={stage.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-400">{stage.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-200 font-medium">{formatNumber(stage.value)}</span>
                {stage.dropOff !== null && (
                  <span className="text-[10px] text-red-400">-{stage.dropOff.toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div className="h-7 bg-neutral-800 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, #10B981 0%, #059669 ${widthPct}%)`,
                  opacity: 1 - i * 0.12,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Engagement Heatmap ──────────────────────────────────────────────────────

const EngagementHeatmap: React.FC<{
  slideData: Array<{ position: number; avgImpressions: number; avgExitRate: number }>;
}> = ({ slideData }) => {
  const maxImpressions = Math.max(...slideData.map(d => d.avgImpressions), 1);

  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
      {slideData.map((d) => {
        const intensity = d.avgImpressions / maxImpressions;
        const bgOpacity = 0.1 + intensity * 0.6;
        return (
          <div
            key={d.position}
            className="flex flex-col items-center rounded-lg p-2 border border-neutral-800 transition-all hover:border-emerald-500/30"
            style={{
              backgroundColor: `rgba(16, 185, 129, ${bgOpacity})`,
            }}
          >
            <span className="text-[10px] text-neutral-400 mb-1">#{d.position + 1}</span>
            <span className="text-xs text-neutral-200 font-medium">{formatNumber(d.avgImpressions)}</span>
            <span className="text-[10px] text-red-400 mt-0.5">{d.avgExitRate.toFixed(1)}% exit</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ userId }) => {
  // ── State ──────────────────────────────────────────────────────────────────

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [hasSocialAccounts, setHasSocialAccounts] = useState<boolean | null>(null);

  // Data
  const [posts, setPosts] = useState<PostAnalytics[]>([]);
  const [previousPosts, setPreviousPosts] = useState<PostAnalytics[]>([]);
  const [experiments, setExperiments] = useState<ABExperiment[]>([]);
  const [audience, setAudience] = useState<AudienceInsight | null>(null);

  // Table state
  const [sortField, setSortField] = useState<SortField>('posted_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [contentTypeFilter, setContentTypeFilter] = useState<AnalyticsContentType | 'all'>('all');
  const [page, setPage] = useState(0);

  // Trend chart metric toggle
  const [trendMetric, setTrendMetric] = useState<'impressions' | 'reach' | 'engagement'>('impressions');

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Check social accounts
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      setHasSocialAccounts((accounts?.length ?? 0) > 0);

      if (!accounts?.length) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const cutoff = getDateCutoff(dateRange);

      // Fetch current period posts
      let postQuery = supabase
        .from('post_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('posted_at', { ascending: false });

      if (cutoff) {
        postQuery = postQuery.gte('posted_at', cutoff);
      }

      const { data: postRows } = await postQuery;
      const mappedPosts = (postRows as PostAnalyticsRow[] | null)?.map(mapPostAnalyticsRow) ?? [];
      setPosts(mappedPosts);

      // Fetch previous period for trend comparison
      if (cutoff) {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const prevCutoff = new Date();
        prevCutoff.setDate(prevCutoff.getDate() - days * 2);
        const prevEnd = cutoff;

        const { data: prevRows } = await supabase
          .from('post_analytics')
          .select('*')
          .eq('user_id', userId)
          .gte('posted_at', prevCutoff.toISOString())
          .lt('posted_at', prevEnd);

        const mappedPrev = (prevRows as PostAnalyticsRow[] | null)?.map(mapPostAnalyticsRow) ?? [];
        setPreviousPosts(mappedPrev);
      } else {
        setPreviousPosts([]);
      }

      // Fetch A/B experiments
      const { data: expRows } = await supabase
        .from('ab_experiments')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20);

      setExperiments((expRows as ABExperimentRow[] | null)?.map(mapABExperimentRow) ?? []);

      // Fetch latest audience insights
      const { data: audienceRows } = await supabase
        .from('audience_insights')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1);

      if (audienceRows?.length) {
        setAudience(mapAudienceInsightRow(audienceRows[0] as AudienceInsightRow));
      } else {
        setAudience(null);
      }

      // Track last synced
      if (mappedPosts.length > 0) {
        const latestFetch = mappedPosts.reduce((latest, p) =>
          p.fetchedAt > latest ? p.fetchedAt : latest,
          mappedPosts[0].fetchedAt
        );
        setLastSyncedAt(latestFetch);
      }
    } catch (err) {
      console.error('[AnalyticsTab] fetchData error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, dateRange]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [contentTypeFilter, sortField, sortDir, dateRange]);

  // ── Computed Data ──────────────────────────────────────────────────────────

  // Overview cards
  const overview = useMemo(() => {
    const totalReach = posts.reduce((s, p) => s + (p.metrics.reach || 0), 0);
    const prevReach = previousPosts.reduce((s, p) => s + (p.metrics.reach || 0), 0);
    const reachTrend = prevReach > 0 ? ((totalReach - prevReach) / prevReach) * 100 : null;

    const avgEngagement = posts.length > 0
      ? posts.reduce((s, p) => s + (p.metrics.engagement_rate || 0), 0) / posts.length
      : 0;
    const prevAvgEngagement = previousPosts.length > 0
      ? previousPosts.reduce((s, p) => s + (p.metrics.engagement_rate || 0), 0) / previousPosts.length
      : 0;
    const engagementTrend = prevAvgEngagement > 0
      ? ((avgEngagement - prevAvgEngagement) / prevAvgEngagement) * 100
      : null;

    const postCount = posts.length;
    const prevPostCount = previousPosts.length;
    const postTrend = prevPostCount > 0
      ? ((postCount - prevPostCount) / prevPostCount) * 100
      : null;

    const bestPost = posts.length > 0
      ? posts.reduce((best, p) => (p.metrics.engagement_rate > best.metrics.engagement_rate ? p : best), posts[0])
      : null;

    return { totalReach, reachTrend, avgEngagement, engagementTrend, postCount, postTrend, bestPost };
  }, [posts, previousPosts]);

  // Filtered & sorted posts for table
  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (contentTypeFilter !== 'all') {
      result = result.filter(p => p.contentType === contentTypeFilter);
    }

    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'posted_at':
          aVal = a.postedAt || '';
          bVal = b.postedAt || '';
          break;
        case 'impressions':
          aVal = a.metrics.impressions;
          bVal = b.metrics.impressions;
          break;
        case 'reach':
          aVal = a.metrics.reach;
          bVal = b.metrics.reach;
          break;
        case 'engagement_rate':
          aVal = a.metrics.engagement_rate;
          bVal = b.metrics.engagement_rate;
          break;
        case 'likes':
          aVal = a.metrics.likes;
          bVal = b.metrics.likes;
          break;
        case 'comments':
          aVal = a.metrics.comments;
          bVal = b.metrics.comments;
          break;
        case 'shares':
          aVal = a.metrics.shares;
          bVal = b.metrics.shares;
          break;
        case 'saves':
          aVal = a.metrics.saves;
          bVal = b.metrics.saves;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [posts, contentTypeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE);

  // Slide type breakdown (aggregate slide_metrics by position-based type)
  const slideBreakdown = useMemo(() => {
    const typeAgg: Record<string, { totalImpressions: number; count: number }> = {
      HOOK: { totalImpressions: 0, count: 0 },
      FORE: { totalImpressions: 0, count: 0 },
      BODY: { totalImpressions: 0, count: 0 },
      PEAK: { totalImpressions: 0, count: 0 },
      CTA: { totalImpressions: 0, count: 0 },
    };

    for (const post of posts) {
      if (!post.slideMetrics?.length) continue;
      const totalSlides = post.slideMetrics.length;
      for (const sm of post.slideMetrics) {
        const type = getSegmentLabel(sm.position, totalSlides);
        if (typeAgg[type]) {
          typeAgg[type].totalImpressions += sm.impressions;
          typeAgg[type].count += 1;
        }
      }
    }

    return Object.entries(typeAgg)
      .filter(([, v]) => v.count > 0)
      .map(([label, v]) => ({
        label,
        value: Math.round(v.totalImpressions / v.count),
        color: SLIDE_TYPE_COLORS[label] || '#737373',
      }));
  }, [posts]);

  // Engagement funnel
  const funnelStages = useMemo((): FunnelStage[] => {
    if (posts.length === 0) return [];

    const totals = posts.reduce(
      (acc, p) => ({
        impressions: acc.impressions + p.metrics.impressions,
        reach: acc.reach + p.metrics.reach,
        likes: acc.likes + p.metrics.likes,
        comments: acc.comments + p.metrics.comments,
        shares: acc.shares + p.metrics.shares,
        saves: acc.saves + p.metrics.saves,
      }),
      { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
    );

    const stages: Array<{ label: string; value: number }> = [
      { label: 'Impressions', value: totals.impressions },
      { label: 'Reach', value: totals.reach },
      { label: 'Likes', value: totals.likes },
      { label: 'Comments', value: totals.comments },
      { label: 'Shares', value: totals.shares },
      { label: 'Saves', value: totals.saves },
    ];

    return stages.map((s, i) => ({
      ...s,
      dropOff: i === 0 ? null : stages[i - 1].value > 0
        ? ((stages[i - 1].value - s.value) / stages[i - 1].value) * 100
        : null,
    }));
  }, [posts]);

  // Time trends (daily aggregation)
  const trendData = useMemo(() => {
    if (posts.length === 0) return [];

    const dailyMap = new Map<string, { impressions: number; reach: number; engagement: number; count: number }>();

    for (const p of posts) {
      if (!p.postedAt) continue;
      const dateKey = p.postedAt.substring(0, 10);
      const existing = dailyMap.get(dateKey) || { impressions: 0, reach: 0, engagement: 0, count: 0 };
      existing.impressions += p.metrics.impressions;
      existing.reach += p.metrics.reach;
      existing.engagement += p.metrics.engagement_rate;
      existing.count += 1;
      dailyMap.set(dateKey, existing);
    }

    const sorted = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        value: trendMetric === 'engagement'
          ? d.count > 0 ? d.engagement / d.count : 0
          : d[trendMetric],
      }));

    return sorted;
  }, [posts, trendMetric]);

  // Heatmap data (slide positions aggregated)
  const heatmapData = useMemo(() => {
    const posMap = new Map<number, { totalImpressions: number; totalExits: number; totalImps: number; count: number }>();

    for (const post of posts) {
      if (!post.slideMetrics?.length) continue;
      for (const sm of post.slideMetrics) {
        const existing = posMap.get(sm.position) || { totalImpressions: 0, totalExits: 0, totalImps: 0, count: 0 };
        existing.totalImpressions += sm.impressions;
        existing.totalExits += sm.exits;
        existing.totalImps += sm.impressions;
        existing.count += 1;
        posMap.set(sm.position, existing);
      }
    }

    return Array.from(posMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([position, d]) => ({
        position,
        avgImpressions: Math.round(d.totalImpressions / d.count),
        avgExitRate: d.totalImps > 0 ? (d.totalExits / d.totalImps) * 100 : 0,
      }));
  }, [posts]);

  // ── Sort handler ───────────────────────────────────────────────────────────

  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-neutral-700" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-emerald-400" />
      : <ChevronDown className="w-3 h-3 text-emerald-400" />;
  };

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-neutral-800 rounded animate-pulse" />
          <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  // ── Render: No Social Accounts ─────────────────────────────────────────────

  if (hasSocialAccounts === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-5">
          <Link2 className="w-7 h-7 text-neutral-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-200 mb-2">Connect a Social Account</h3>
        <p className="text-sm text-neutral-500 max-w-md mb-6">
          Link your Instagram, TikTok, or LinkedIn account to start tracking post performance,
          audience insights, and engagement analytics.
        </p>
        <a
          href="/settings/social-accounts"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
        >
          Connect Account
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // ── Render: Main ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* ── 1. Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Analytics</h2>
          {lastSyncedAt && (
            <p className="text-xs text-neutral-600 mt-0.5">
              Last synced {formatTimeAgo(lastSyncedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Date range pills */}
          <div className="inline-flex items-center bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            {DATE_RANGE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setDateRange(opt.key)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  dateRange === opt.key
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                } ${opt.key !== '7d' ? 'border-l border-neutral-800' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── No data state ────────────────────────────────────────────────────── */}
      {posts.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl">
          <EmptyState
            icon={<BarChart3 className="w-10 h-10" />}
            title="No analytics data yet"
            description="Post content and connect your social accounts to start seeing engagement metrics here."
          />
        </div>
      )}

      {posts.length > 0 && (
        <>
          {/* ── 2. Overview Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reach */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500">Total Reach</span>
              </div>
              <p className="text-2xl font-bold text-neutral-100">{formatNumber(overview.totalReach)}</p>
              <TrendBadge value={overview.reachTrend} />
            </div>

            {/* Avg Engagement */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500">Avg Engagement</span>
              </div>
              <p className="text-2xl font-bold text-neutral-100">{formatPercent(overview.avgEngagement)}</p>
              <TrendBadge value={overview.engagementTrend} />
            </div>

            {/* Total Posts */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500">Total Posts</span>
              </div>
              <p className="text-2xl font-bold text-neutral-100">{overview.postCount}</p>
              <TrendBadge value={overview.postTrend} />
            </div>

            {/* Best Post */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500">Best Post</span>
              </div>
              {overview.bestPost ? (
                <div className="flex items-center gap-3">
                  {overview.bestPost.thumbnailUrl ? (
                    <img
                      src={overview.bestPost.thumbnailUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-neutral-700" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-400">
                      {formatPercent(overview.bestPost.metrics.engagement_rate)}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">
                      {overview.bestPost.postTitle || 'Untitled'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-600">--</p>
              )}
            </div>
          </div>

          {/* ── 3. Per-Post Table ──────────────────────────────────────────────── */}
          <Section title="Per-Post Performance">
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-3.5 h-3.5 text-neutral-600" />
              <div className="inline-flex items-center bg-neutral-800 rounded-lg overflow-hidden">
                {(['all', 'carousel', 'creator_lab', 'ad_studio'] as const).map(ct => (
                  <button
                    key={ct}
                    onClick={() => setContentTypeFilter(ct)}
                    className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                      contentTypeFilter === ct
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-neutral-500 hover:text-neutral-300'
                    } ${ct !== 'all' ? 'border-l border-neutral-700' : ''}`}
                  >
                    {ct === 'all' ? 'All' : CONTENT_TYPE_CONFIG[ct].label}
                  </button>
                ))}
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="w-8 h-8" />}
                title="No posts match filter"
                description="Try changing the content type filter or date range."
              />
            ) : (
              <>
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        {([
                          { field: 'posted_at' as SortField, label: 'Post' },
                          { field: 'impressions' as SortField, label: 'Impressions' },
                          { field: 'reach' as SortField, label: 'Reach' },
                          { field: 'engagement_rate' as SortField, label: 'Eng %' },
                          { field: 'likes' as SortField, label: 'Likes' },
                          { field: 'comments' as SortField, label: 'Comments' },
                          { field: 'shares' as SortField, label: 'Shares' },
                          { field: 'saves' as SortField, label: 'Saves' },
                        ]).map(col => (
                          <th
                            key={col.field}
                            onClick={() => handleSort(col.field)}
                            className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-neutral-500 font-medium cursor-pointer hover:text-neutral-300 transition-colors select-none"
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              <SortIndicator field={col.field} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPosts.map(post => {
                        const ctConfig = CONTENT_TYPE_CONFIG[post.contentType];
                        return (
                          <tr
                            key={post.id}
                            className="border-b border-neutral-800/30 hover:bg-neutral-800/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {post.thumbnailUrl ? (
                                  <img
                                    src={post.thumbnailUrl}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                    <ImageIcon className="w-3.5 h-3.5 text-neutral-700" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs text-neutral-200 truncate max-w-[180px]">
                                    {post.postTitle || 'Untitled'}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className={`text-[9px] font-medium ${ctConfig.color}`}
                                    >
                                      {ctConfig.label}
                                    </span>
                                    <span className="text-[9px] text-neutral-600">
                                      {formatDate(post.postedAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-300">
                              {formatNumber(post.metrics.impressions)}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-300">
                              {formatNumber(post.metrics.reach)}
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-emerald-400">
                              {formatPercent(post.metrics.engagement_rate)}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-300">
                              {formatNumber(post.metrics.likes)}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-300">
                              {formatNumber(post.metrics.comments)}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-300">
                              {formatNumber(post.metrics.shares)}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-300">
                              {formatNumber(post.metrics.saves)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 px-1">
                    <span className="text-xs text-neutral-600">
                      {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-neutral-500">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* ── Row: Slide Breakdown + Funnel ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── 4. Slide Type Breakdown ───────────────────────────────────────── */}
            <Section title="Slide Type Breakdown">
              {slideBreakdown.length > 0 ? (
                <>
                  <p className="text-[10px] text-neutral-600 mb-3">
                    Average impressions per slide type
                  </p>
                  <HorizontalBarChart data={slideBreakdown} />
                </>
              ) : (
                <EmptyState
                  icon={<BarChart3 className="w-8 h-8" />}
                  title="No slide data"
                  description="Slide-level metrics appear for carousel posts with per-slide tracking."
                />
              )}
            </Section>

            {/* ── 5. Engagement Funnel ──────────────────────────────────────────── */}
            <Section title="Engagement Funnel">
              {funnelStages.length > 0 ? (
                <FunnelChart stages={funnelStages} />
              ) : (
                <EmptyState
                  icon={<BarChart3 className="w-8 h-8" />}
                  title="No funnel data"
                  description="Engagement funnel builds from aggregated post metrics."
                />
              )}
            </Section>
          </div>

          {/* ── 6. Time Trends ─────────────────────────────────────────────────── */}
          <Section title="Time Trends">
            <div className="flex items-center gap-2 mb-4">
              {(['impressions', 'reach', 'engagement'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTrendMetric(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    trendMetric === m
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-500 border border-transparent hover:text-neutral-300'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            {trendData.length > 1 ? (
              <LineChart
                data={trendData}
                color={
                  trendMetric === 'impressions'
                    ? '#10B981'
                    : trendMetric === 'reach'
                    ? '#3B82F6'
                    : '#F59E0B'
                }
              />
            ) : (
              <EmptyState
                icon={<TrendingUp className="w-8 h-8" />}
                title="Not enough data points"
                description="At least 2 data points are needed to render the trend chart."
              />
            )}
          </Section>

          {/* ── 7. A/B Experiments ─────────────────────────────────────────────── */}
          <Section title="A/B Experiments">
            {experiments.length > 0 ? (
              <div className="space-y-4">
                {experiments.map(exp => {
                  const variantA = posts.find(p => p.id === exp.variantAPostId);
                  const variantB = posts.find(p => p.id === exp.variantBPostId);
                  return (
                    <div
                      key={exp.id}
                      className="bg-[#161616] border border-neutral-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Beaker className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm font-medium text-neutral-200">{exp.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              exp.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : exp.status === 'active'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                            }`}
                          >
                            {exp.status}
                          </span>
                          {exp.significanceScore !== null && (
                            <span className="text-[10px] text-neutral-500">
                              Significance: {exp.significanceScore.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {exp.description && (
                        <p className="text-xs text-neutral-500 mb-3">{exp.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {/* Variant A */}
                        <div
                          className={`rounded-lg border p-3 ${
                            exp.winnerId === exp.variantAPostId
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-neutral-800 bg-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-neutral-300">Variant A</span>
                            {exp.winnerId === exp.variantAPostId && (
                              <Trophy className="w-3 h-3 text-emerald-400" />
                            )}
                          </div>
                          {variantA ? (
                            <div className="space-y-1">
                              <p className="text-xs text-neutral-400 truncate">
                                {variantA.postTitle || 'Untitled'}
                              </p>
                              <p className="text-sm font-semibold text-neutral-200">
                                {formatPercent(variantA.metrics.engagement_rate)} eng
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {formatNumber(variantA.metrics.reach)} reach
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-600">No post linked</p>
                          )}
                        </div>

                        {/* Variant B */}
                        <div
                          className={`rounded-lg border p-3 ${
                            exp.winnerId === exp.variantBPostId
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-neutral-800 bg-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-neutral-300">Variant B</span>
                            {exp.winnerId === exp.variantBPostId && (
                              <Trophy className="w-3 h-3 text-emerald-400" />
                            )}
                          </div>
                          {variantB ? (
                            <div className="space-y-1">
                              <p className="text-xs text-neutral-400 truncate">
                                {variantB.postTitle || 'Untitled'}
                              </p>
                              <p className="text-sm font-semibold text-neutral-200">
                                {formatPercent(variantB.metrics.engagement_rate)} eng
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {formatNumber(variantB.metrics.reach)} reach
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-600">No post linked</p>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-neutral-600 mt-2">
                        Started {formatDate(exp.startedAt)}
                        {exp.completedAt && ` — Completed ${formatDate(exp.completedAt)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Beaker className="w-8 h-8" />}
                title="No experiments yet"
                description="Create A/B experiments to compare post variants and find what works best."
              />
            )}
          </Section>

          {/* ── 8. Engagement Heatmap ──────────────────────────────────────────── */}
          <Section title="Engagement Heatmap">
            {heatmapData.length > 0 ? (
              <>
                <p className="text-[10px] text-neutral-600 mb-3">
                  Average impressions and exit rate per slide position across all posts
                </p>
                <EngagementHeatmap slideData={heatmapData} />
              </>
            ) : (
              <EmptyState
                icon={<BarChart3 className="w-8 h-8" />}
                title="No heatmap data"
                description="Slide-level metrics are needed to build the engagement heatmap."
              />
            )}
          </Section>

          {/* ── 9. Audience Demographics ───────────────────────────────────────── */}
          <Section title="Audience Demographics">
            {audience ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Age Distribution */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-3">
                    Age Distribution
                  </p>
                  <HorizontalBarChart
                    data={Object.entries(audience.demographics.age_distribution)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([label, value]) => ({
                        label,
                        value,
                        color: '#10B981',
                      }))}
                  />
                </div>

                {/* Gender Split */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-3">
                    Gender Split
                  </p>
                  <DonutChart
                    data={Object.entries(audience.demographics.gender_split).map(
                      ([label, value], i) => ({
                        label: label.charAt(0).toUpperCase() + label.slice(1),
                        value,
                        color: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][i % 4],
                      })
                    )}
                  />
                </div>

                {/* Top Locations */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-3">
                    Top Locations
                  </p>
                  {audience.demographics.top_locations.length > 0 ? (
                    <div className="space-y-2">
                      {audience.demographics.top_locations.slice(0, 5).map((loc, i) => {
                        const maxCount = audience.demographics.top_locations[0]?.count || 1;
                        return (
                          <div key={loc.name} className="flex items-center gap-3">
                            <span className="text-xs text-neutral-500 w-4 text-right">{i + 1}</span>
                            <MapPin className="w-3 h-3 text-neutral-600 flex-shrink-0" />
                            <span className="text-xs text-neutral-300 w-24 truncate">{loc.name}</span>
                            <div className="flex-1 h-4 bg-neutral-800 rounded overflow-hidden">
                              <div
                                className="h-full bg-emerald-500/40 rounded transition-all"
                                style={{ width: `${(loc.count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-500 w-12 text-right">
                              {formatNumber(loc.count)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-600">No location data</p>
                  )}
                </div>

                {/* Active Hours */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-3">
                    Active Hours (UTC)
                  </p>
                  <MiniBarChart data={audience.demographics.active_hours} />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-neutral-600">0:00</span>
                    <span className="text-[9px] text-neutral-600">6:00</span>
                    <span className="text-[9px] text-neutral-600">12:00</span>
                    <span className="text-[9px] text-neutral-600">18:00</span>
                    <span className="text-[9px] text-neutral-600">23:00</span>
                  </div>
                  {audience.demographics.follower_count > 0 && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <Users className="w-3.5 h-3.5 text-neutral-600" />
                      <span className="text-xs text-neutral-500">
                        {formatNumber(audience.demographics.follower_count)} followers
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No audience data"
                description="Audience demographics sync automatically from connected social accounts."
              />
            )}
          </Section>
        </>
      )}
    </div>
  );
};
