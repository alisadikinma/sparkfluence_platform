/*
  # Create videos table for gallery

  1. New Tables
    - `videos`
      - `id` (uuid, primary key)
      - `title` (text) - Video title
      - `description` (text) - Video description
      - `thumbnail` (text) - Video thumbnail URL
      - `platforms` (jsonb) - Selected platforms (array of platform IDs)
      - `publish_date` (date) - Scheduled publish date
      - `publish_time` (time) - Scheduled publish time
      - `created_at` (timestamptz) - When video was created
      - `updated_at` (timestamptz) - When video was last updated

  2. Security
    - Enable RLS on `videos` table
    - Add policy for public access to read videos (for demo purposes)
    - Add policy for public access to insert videos (for demo purposes)
*/

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  thumbnail text NOT NULL DEFAULT '',
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  publish_date date DEFAULT CURRENT_DATE,
  publish_time time DEFAULT '18:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read videos"
  ON videos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert videos"
  ON videos
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update videos"
  ON videos
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete videos"
  ON videos
  FOR DELETE
  TO public
  USING (true);
