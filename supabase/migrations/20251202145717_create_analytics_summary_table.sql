/*
  # Create analytics summary table for dashboard aggregates

  1. New Tables
    - `analytics_summary`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - Links to auth.users
      - `period_type` (text) - Type of period: 'daily', 'weekly', 'monthly', 'yearly', 'all_time'
      - `period_start` (date) - Start date of the period
      - `period_end` (date) - End date of the period
      - `total_views` (bigint, default 0) - Aggregated total views
      - `total_engagement` (bigint, default 0) - Aggregated total engagement
      - `content_created_count` (integer, default 0) - Number of content pieces created
      - `total_followers` (bigint, default 0) - Current total followers across platforms
      - `views_growth_percentage` (decimal(5,2), default 0) - Growth from previous period
      - `engagement_growth_percentage` (decimal(5,2), default 0) - Growth from previous period
      - `content_growth_count` (integer, default 0) - Content increase from previous period
      - `followers_growth_count` (bigint, default 0) - Follower increase from previous period
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `analytics_summary` table
    - Add policies for users to view and manage their own summary data
*/

CREATE TABLE IF NOT EXISTS analytics_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_views bigint DEFAULT 0,
  total_engagement bigint DEFAULT 0,
  content_created_count integer DEFAULT 0,
  total_followers bigint DEFAULT 0,
  views_growth_percentage decimal(5,2) DEFAULT 0,
  engagement_growth_percentage decimal(5,2) DEFAULT 0,
  content_growth_count integer DEFAULT 0,
  followers_growth_count bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_type, period_start, period_end)
);

ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics summary"
  ON analytics_summary
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics summary"
  ON analytics_summary
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics summary"
  ON analytics_summary
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics summary"
  ON analytics_summary
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_summary_user_period ON analytics_summary(user_id, period_type, period_start DESC);