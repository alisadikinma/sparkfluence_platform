/*
  # Add missing columns to planned_content table

  1. Changes
    - Add `content_type` (text) column - Type of content (video, image, post)
    - Add `platforms` (text[]) column - Array of platform names
    - Add `thumbnail_url` (text) column - Optional thumbnail URL
    - Add `video_data` (jsonb) column - Detailed video metadata
    - Add `is_public` (boolean) column - Public visibility flag
    
  2. Notes
    - These columns are required by the PlannerContext interface
    - Default values ensure backward compatibility
    - platform_id column is kept for lookup_master reference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planned_content' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE planned_content ADD COLUMN content_type text DEFAULT 'video';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planned_content' AND column_name = 'platforms'
  ) THEN
    ALTER TABLE planned_content ADD COLUMN platforms text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planned_content' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE planned_content ADD COLUMN thumbnail_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planned_content' AND column_name = 'video_data'
  ) THEN
    ALTER TABLE planned_content ADD COLUMN video_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planned_content' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE planned_content ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;