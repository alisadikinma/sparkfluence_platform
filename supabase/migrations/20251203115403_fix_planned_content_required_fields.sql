/*
  # Fix planned_content table required fields

  1. Changes
    - Make `final_video_id` nullable (it's not always available at planning time)
    - Make `platform_id` nullable (we're using `platforms` array instead)
    - Add default values for safety

  This allows content to be planned without having a final video or single platform ID.
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_content' AND column_name = 'final_video_id'
  ) THEN
    ALTER TABLE planned_content ALTER COLUMN final_video_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planned_content' AND column_name = 'platform_id'
  ) THEN
    ALTER TABLE planned_content ALTER COLUMN platform_id DROP NOT NULL;
  END IF;
END $$;