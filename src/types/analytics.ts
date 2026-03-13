// ============================================================================
// Analytics Dashboard — Type Definitions
// ============================================================================

// --- Content & Platform Types ---
export type AnalyticsContentType = 'carousel' | 'creator_lab' | 'ad_studio';

export type AnalyticsPlatform = 'instagram' | 'tiktok' | 'linkedin';

export type DateRange = '7d' | '30d' | '90d' | 'all';

// --- Post Metrics ---
export interface PostMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
}

export interface SlideMetric {
  position: number;
  impressions: number;
  exits: number; // users who stopped swiping here
  tap_forward: number;
  tap_back: number;
}

// --- Post Analytics ---
export interface PostAnalytics {
  id: string;
  userId: string;
  socialAccountId: string;
  platformPostId: string;
  contentType: AnalyticsContentType;
  contentId: string;
  platform: AnalyticsPlatform;
  postTitle: string | null;
  thumbnailUrl: string | null;
  postedAt: string | null;
  metrics: PostMetrics;
  slideMetrics: SlideMetric[] | null;
  fetchedAt: string;
}

export interface PostAnalyticsRow {
  id: string;
  user_id: string;
  social_account_id: string;
  platform_post_id: string;
  content_type: AnalyticsContentType;
  content_id: string;
  platform: AnalyticsPlatform;
  post_title: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  metrics: PostMetrics;
  slide_metrics: SlideMetric[] | null;
  fetched_at: string;
}

// --- A/B Experiment ---
export type ABExperimentStatus = 'active' | 'completed' | 'cancelled';

export interface ABExperiment {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  variantAPostId: string | null;
  variantBPostId: string | null;
  winnerId: string | null;
  status: ABExperimentStatus;
  significanceScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ABExperimentRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  variant_a_post_id: string | null;
  variant_b_post_id: string | null;
  winner_id: string | null;
  status: ABExperimentStatus;
  significance_score: number | null;
  started_at: string;
  completed_at: string | null;
}

// --- Audience Insights ---
export interface Demographics {
  age_distribution: Record<string, number>; // e.g. { "18-24": 35, "25-34": 42 }
  gender_split: Record<string, number>; // e.g. { "male": 45, "female": 52, "other": 3 }
  top_locations: Array<{ name: string; count: number }>;
  active_hours: Record<string, number>; // hour (0-23) → follower count online
  follower_count: number;
}

export interface AudienceInsight {
  id: string;
  userId: string;
  socialAccountId: string;
  date: string;
  demographics: Demographics;
}

export interface AudienceInsightRow {
  id: string;
  user_id: string;
  social_account_id: string;
  date: string;
  demographics: Demographics;
}

// --- Mappers (DB row → frontend camelCase) ---
export function mapPostAnalyticsRow(row: PostAnalyticsRow): PostAnalytics {
  return {
    id: row.id,
    userId: row.user_id,
    socialAccountId: row.social_account_id,
    platformPostId: row.platform_post_id,
    contentType: row.content_type,
    contentId: row.content_id,
    platform: row.platform,
    postTitle: row.post_title,
    thumbnailUrl: row.thumbnail_url,
    postedAt: row.posted_at,
    metrics: row.metrics,
    slideMetrics: row.slide_metrics,
    fetchedAt: row.fetched_at,
  };
}

export function mapABExperimentRow(row: ABExperimentRow): ABExperiment {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    variantAPostId: row.variant_a_post_id,
    variantBPostId: row.variant_b_post_id,
    winnerId: row.winner_id,
    status: row.status,
    significanceScore: row.significance_score,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function mapAudienceInsightRow(row: AudienceInsightRow): AudienceInsight {
  return {
    id: row.id,
    userId: row.user_id,
    socialAccountId: row.social_account_id,
    date: row.date,
    demographics: row.demographics,
  };
}

// --- Computed / UI helper types ---
export interface OverviewCard {
  label: string;
  value: string | number;
  icon: string;
  trend: number | null; // % change vs previous period, null = no data
  trendDirection: 'up' | 'down' | 'flat';
}

export interface FunnelStage {
  label: string;
  value: number;
  dropOff: number | null; // % drop from previous stage
}

// --- Content type config (for UI badges) ---
export const CONTENT_TYPE_CONFIG: Record<AnalyticsContentType, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  carousel: {
    label: 'Carousel',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
  creator_lab: {
    label: 'Creator Lab',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  ad_studio: {
    label: 'Ad Studio',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
};

export const PLATFORM_CONFIG: Record<AnalyticsPlatform, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  instagram: {
    label: 'Instagram',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
  },
  tiktok: {
    label: 'TikTok',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
};

// --- Slide type colors (for heatmap / breakdown) ---
export const SLIDE_TYPE_COLORS: Record<string, string> = {
  HOOK: '#10B981',   // emerald
  FORE: '#F59E0B',   // amber
  BODY: '#737373',   // neutral
  PEAK: '#10B981',   // emerald
  CTA: '#3B82F6',    // blue
};
