/*
  # Add final video URL to planned content

  1. Changes
    - Add `final_video_url` (text) column to store the URL of the final rendered video
    - This column will be populated after video generation is complete
    
  2. Notes
    - The `video_data` jsonb column can still be used for detailed video metadata
    - The `final_video_url` provides a direct reference to the final video file
    - Default value is null until video is generated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planned_content' AND column_name = 'final_video_url'
  ) THEN
    ALTER TABLE planned_content ADD COLUMN final_video_url text DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_planned_content_final_video_url ON planned_content(final_video_url) WHERE final_video_url IS NOT NULL;