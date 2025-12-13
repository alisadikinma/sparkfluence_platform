/*
  # Create planned content table for content planner

  1. New Tables
    - `planned_content`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - Reference to auth.users
      - `title` (text) - Content title
      - `description` (text) - Content description
      - `content_type` (text) - Type of content (video, image, post)
      - `platforms` (text[]) - Array of platforms (instagram, tiktok, youtube)
      - `scheduled_date` (date) - Date when content is scheduled
      - `scheduled_time` (time) - Time when content is scheduled
      - `status` (text) - Status (draft, scheduled, published)
      - `thumbnail_url` (text) - Optional thumbnail URL
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `planned_content` table
    - Add policies for authenticated users to manage their own content
*/

CREATE TABLE IF NOT EXISTS planned_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  content_type text DEFAULT 'video',
  platforms text[] DEFAULT ARRAY[]::text[],
  scheduled_date date NOT NULL,
  scheduled_time time DEFAULT '12:00:00',
  status text DEFAULT 'draft',
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE planned_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planned content"
  ON planned_content
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planned content"
  ON planned_content
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planned content"
  ON planned_content
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own planned content"
  ON planned_content
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planned_content_user_id ON planned_content(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_content_scheduled_date ON planned_content(scheduled_date);