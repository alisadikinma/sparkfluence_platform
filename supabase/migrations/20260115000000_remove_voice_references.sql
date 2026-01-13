-- ============================================================================
-- REMOVE VOICE REFERENCE COLUMNS (VEO 3.1 has native audio)
--
-- This migration removes voice-related columns and tables that are no longer
-- needed since VEO 3.1 HD has native audio generation (lip-sync included).
--
-- Related Changes:
-- - Frontend: VoiceRecorder component removed
-- - Onboarding: Voice step removed (Profile → Preferences)
-- - Profile: Voice tab removed
-- - generate-videos: TTS integration removed
-- ============================================================================

-- Remove voice columns from user_profiles
-- These were used for voice cloning/TTS reference audio
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS voice_reference_url,
  DROP COLUMN IF EXISTS voice_reference_duration_ms,
  DROP COLUMN IF EXISTS voice_reference_duration_seconds,
  DROP COLUMN IF EXISTS voice_recorded_at;

-- Drop voice_generation_jobs table (no longer needed)
-- This table tracked TTS generation jobs
DROP TABLE IF EXISTS voice_generation_jobs CASCADE;

-- Remove audio_url from video_generation_jobs if exists
-- This was used to store TTS-generated audio URLs
ALTER TABLE video_generation_jobs
  DROP COLUMN IF EXISTS audio_url,
  DROP COLUMN IF EXISTS voice_url,
  DROP COLUMN IF EXISTS voice_character;

-- ============================================================================
-- Note: Storage cleanup for 'voice-references' bucket should be done manually
-- via Supabase Dashboard or separate script to avoid accidental data loss.
-- ============================================================================
