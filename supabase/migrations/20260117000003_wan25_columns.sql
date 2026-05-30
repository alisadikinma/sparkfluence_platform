-- ============================================================================
-- ADD WAN 2.5 SPECIFIC COLUMNS TO VIDEO_GENERATION_JOBS
--
-- These columns support WAN 2.5 video model features:
-- - seed: For reproducible generation (character/environment consistency)
-- - negative_prompt: To improve output quality
--
-- WAN 2.5 API (fal-ai/wan-25-preview/image-to-video) Parameters:
-- - resolution: 480p, 720p (default), 1080p
-- - duration: 5 or 10 seconds
-- - seed: integer for reproducibility
-- - negative_prompt: text to avoid in generation
-- - audio_url: for TTS voice integration
-- ============================================================================

-- Add seed column for reproducible video generation
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS seed INTEGER DEFAULT NULL;

-- Add negative_prompt column for quality improvement
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS negative_prompt TEXT DEFAULT NULL;

-- Add comments explaining column usage
COMMENT ON COLUMN video_generation_jobs.seed IS
  'Seed for reproducible video generation (WAN 2.5 only) - ensures character/environment consistency across all segments in a session';

COMMENT ON COLUMN video_generation_jobs.negative_prompt IS
  'Negative prompt for video generation - content to avoid (e.g., blur, distort, low quality, defects)';

-- ============================================================================
-- Note: Resolution column already exists in the table (default '720p')
-- Note: Duration is stored in duration_seconds column
-- ============================================================================
