/*
  # Create video_segments table

  1. New Tables
    - `video_segments`
      - `id` (uuid, primary key) - Unique identifier for the segment
      - `user_id` (uuid) - Reference to the user who created the content
      - `topic_id` (uuid, nullable) - Reference to the topic/content being created
      - `segment_number` (integer) - Order of the segment in the video
      - `element` (text) - Type of segment (Hook, Foreshadow, Body, Ending, CTA)
      - `duration` (text) - Duration of the segment
      - `script` (text) - Script content for the segment
      - `visual_prompt` (text) - Prompt used to generate the visual
      - `image_url` (text, nullable) - URL of the generated image
      - `video_url` (text, nullable) - URL of the generated video
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update
  
  2. Security
    - Enable RLS on `video_segments` table
    - Add policy for authenticated users to read their own segments
    - Add policy for authenticated users to insert their own segments
    - Add policy for authenticated users to update their own segments
    - Add policy for authenticated users to delete their own segments
*/

CREATE TABLE IF NOT EXISTS video_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  topic_id uuid,
  segment_number integer NOT NULL,
  element text NOT NULL,
  duration text NOT NULL DEFAULT '7.5 Second',
  script text NOT NULL,
  visual_prompt text DEFAULT '',
  image_url text,
  video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE video_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own segments"
  ON video_segments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own segments"
  ON video_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segments"
  ON video_segments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own segments"
  ON video_segments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_segments_user_id ON video_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_segments_topic_id ON video_segments(topic_id);