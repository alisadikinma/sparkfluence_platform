/*
  # Create social media analytics table

  1. New Tables
    - `social_media_analytics`
      - `id` (uuid, primary key) - Unique identifier for each analytics record
      - `user_id` (uuid, foreign key) - Links to auth.users
      - `planned_content_id` (uuid, foreign key, nullable) - Links to planned_content table
      - `platform` (text) - Social media platform name (TikTok, Instagram, YouTube, Meta)
      - `platform_post_id` (text, nullable) - Unique ID from the platform API
      - `post_url` (text, nullable) - Direct URL to the published post
      - `published_at` (timestamptz) - When the content was published to the platform
      - `total_views` (bigint, default 0) - Total number of views
      - `engagement_count` (bigint, default 0) - Total engagement (likes, comments, shares, saves)
      - `likes_count` (bigint, default 0) - Number of likes/reactions
      - `comments_count` (bigint, default 0) - Number of comments
      - `shares_count` (bigint, default 0) - Number of shares/reposts
      - `saves_count` (bigint, default 0) - Number of saves/bookmarks
      - `followers_at_publish` (bigint, default 0) - Follower count when content was published
      - `current_followers` (bigint, default 0) - Current follower count
      - `reach` (bigint, default 0) - Total unique users reached
      - `impressions` (bigint, default 0) - Total impressions
      - `engagement_rate` (decimal(5,2), default 0) - Engagement rate percentage
      - `watch_time_seconds` (bigint, default 0) - Total watch time in seconds (for videos)
      - `average_watch_percentage` (decimal(5,2), default 0) - Average watch percentage
      - `click_through_rate` (decimal(5,2), default 0) - CTR percentage
      - `last_synced_at` (timestamptz) - Last time data was synced from platform API
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `social_media_analytics` table
    - Add policies for users to view and manage their own analytics data
*/

CREATE TABLE IF NOT EXISTS social_media_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  planned_content_id uuid REFERENCES planned_content(id) ON DELETE SET NULL,
  platform text NOT NULL,
  platform_post_id text,
  post_url text,
  published_at timestamptz NOT NULL,
  total_views bigint DEFAULT 0,
  engagement_count bigint DEFAULT 0,
  likes_count bigint DEFAULT 0,
  comments_count bigint DEFAULT 0,
  shares_count bigint DEFAULT 0,
  saves_count bigint DEFAULT 0,
  followers_at_publish bigint DEFAULT 0,
  current_followers bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  engagement_rate decimal(5,2) DEFAULT 0,
  watch_time_seconds bigint DEFAULT 0,
  average_watch_percentage decimal(5,2) DEFAULT 0,
  click_through_rate decimal(5,2) DEFAULT 0,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON social_media_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON social_media_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics"
  ON social_media_analytics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics"
  ON social_media_analytics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON social_media_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_planned_content_id ON social_media_analytics(planned_content_id);
CREATE INDEX IF NOT EXISTS idx_analytics_platform ON social_media_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_published_at ON social_media_analytics(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_platform_post_id ON social_media_analytics(platform, platform_post_id);