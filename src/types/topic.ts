export type TrendingSource = 'google' | 'tiktok' | 'instagram' | 'ai';

export interface Topic {
  id: number;
  title: string;
  description: string;
  trending_source?: TrendingSource;
  trending_keyword?: string | null;
  hashtags?: string[];
}

export const SOURCE_BADGE_CONFIG: Record<TrendingSource, { label: string; bg: string; text: string; border: string }> = {
  tiktok:    { label: 'TikTok',    bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-500/30' },
  google:    { label: 'Google',    bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  instagram: { label: 'Instagram', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  ai:        { label: 'AI',        bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30' },
};
