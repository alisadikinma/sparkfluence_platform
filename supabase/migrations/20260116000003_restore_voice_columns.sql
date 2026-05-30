-- ============================================================================
-- RESTORE VOICE REFERENCE COLUMNS FOR WAN 2.5 VOICE CLONING
--
-- This migration restores voice reference columns for TTS voice cloning
-- integration with WAN 2.5 video model (fal-ai/wan-25-preview/image-to-video).
--
-- The WAN 2.5 model supports audio_url parameter for voice integration,
-- allowing users to clone their voice via Chatterbox Turbo TTS.
--
-- Related Features:
-- - Profile: Voice recording tab (5-10s samples)
-- - Video Generation: WAN 2.5 model with TTS integration
-- - TTS: Chatterbox Turbo voice cloning
-- ============================================================================

-- Restore voice columns to user_profiles
-- These are used for voice cloning reference audio
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS voice_reference_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_reference_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS voice_recorded_at TIMESTAMPTZ;

-- Add comments explaining column usage
COMMENT ON COLUMN user_profiles.voice_reference_url IS
  'URL to 5-10s audio sample for TTS voice cloning (Chatterbox Turbo)';

COMMENT ON COLUMN user_profiles.voice_reference_duration_seconds IS
  'Duration of voice reference in seconds (must be 5-10s for optimal cloning)';

COMMENT ON COLUMN user_profiles.voice_recorded_at IS
  'Timestamp when voice reference was recorded/uploaded';

-- ============================================================================
-- Note: Storage bucket 'voice-references' should be created via Supabase
-- Dashboard with the following settings:
-- - Public: true (for TTS API access)
-- - File size limit: 15MB
-- - Allowed MIME types: audio/wav, audio/mpeg, audio/webm
-- ============================================================================
