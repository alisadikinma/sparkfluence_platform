-- ============================================================================
-- ADD VOICE PROMPT REFERENCE TO VIDEO GENERATION JOBS
-- Links video jobs to their voice prompt for consistency
-- ============================================================================

-- Add voice_prompt_id reference to video_generation_jobs
ALTER TABLE public.video_generation_jobs
ADD COLUMN IF NOT EXISTS voice_prompt_id uuid REFERENCES public.voice_prompts(id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_voice_prompt
ON public.video_generation_jobs(voice_prompt_id);

COMMENT ON COLUMN public.video_generation_jobs.voice_prompt_id
IS 'Reference to voice_prompts table for consistent voice across session';
