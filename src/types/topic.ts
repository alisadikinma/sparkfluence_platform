export type TrendingSource = 'google' | 'tiktok' | 'youtube' | 'news' | 'ai_creative' | 'ai';

export interface Topic {
  id: number;
  title: string;
  description: string;
  trending_source?: TrendingSource;
  trending_keyword?: string | null;
  hashtags?: string[];
}

export interface TikTokChallenge {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  hashtags: string[];
  example_format: string;
  script_instruction: string;
  volume_score: number;
}

export const SOURCE_BADGE_CONFIG: Record<TrendingSource, { label: string; bg: string; text: string; border: string }> = {
  google:      { label: 'Google',    bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  tiktok:      { label: 'TikTok',    bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-500/30' },
  youtube:     { label: 'YouTube',   bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30' },
  news:        { label: 'News',      bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/30' },
  ai_creative: { label: 'AI',        bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  ai:          { label: 'AI',        bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30' },
};
