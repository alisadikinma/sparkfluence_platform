-- Migration: Add voice_character column to video_generation_jobs table
-- Purpose: Store consistent voice character JSON for entire video session
-- This ensures the same voice is used across HOOK, BODY, CTA segments

-- Add voice_character column
ALTER TABLE video_generation_jobs
ADD COLUMN IF NOT EXISTS voice_character TEXT;

-- Add comment
COMMENT ON COLUMN video_generation_jobs.voice_character IS 'JSON string containing voice character profile (gender, age, accent, tone, pace) for consistent voiceover across all segments in a session';
