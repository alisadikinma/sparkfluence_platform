-- ============================================================================
-- Migration: Add Face Anchor columns to video_generation_jobs
-- Date: 2026-01-09
-- Purpose: Support dynamic face/avatar selection from UI for Sora 2.0 consistency
-- ============================================================================

-- Add avatar selection columns
ALTER TABLE video_generation_jobs 
ADD COLUMN IF NOT EXISTS avatar_selection text DEFAULT 'no_avatar',
ADD COLUMN IF NOT EXISTS has_profile_image boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS creator_gender text DEFAULT 'male',
ADD COLUMN IF NOT EXISTS character_description text;

-- Add comment for documentation
COMMENT ON COLUMN video_generation_jobs.avatar_selection IS 'UI selection: no_avatar | use_profile | upload_new';
COMMENT ON COLUMN video_generation_jobs.has_profile_image IS 'Whether profile image is available for face anchor';
COMMENT ON COLUMN video_generation_jobs.profile_image_url IS 'URL to profile image for face anchor';
COMMENT ON COLUMN video_generation_jobs.creator_gender IS 'Creator gender: male | female (for voice/face generation)';
COMMENT ON COLUMN video_generation_jobs.character_description IS 'Text description of creator (fallback if no profile image)';

-- Create index for faster queries by avatar selection
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_avatar_selection 
ON video_generation_jobs(avatar_selection) 
WHERE avatar_selection != 'no_avatar';

-- Log migration
DO $$ 
BEGIN 
  RAISE NOTICE 'Migration complete: Added face anchor columns to video_generation_jobs';
END $$;
