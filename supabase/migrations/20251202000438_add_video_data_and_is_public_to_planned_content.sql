/*
  # Add video data and public flag to planned content

  1. Changes
    - Add `video_data` (jsonb) column to store full video information including segments, music, etc.
    - Add `is_public` (boolean) column to track whether content should be published publicly
    
  2. Notes
    - Using jsonb for flexible video data storage
    - Default is_public to false for privacy
*/

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