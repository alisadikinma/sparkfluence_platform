-- ============================================================================
-- VOICE PROMPTS - AVATAR LINKED VERSION
-- Voice prompts are created once per avatar (profile or saved), not per session
-- ============================================================================

-- Drop old constraints if they exist
ALTER TABLE IF EXISTS public.voice_prompts
DROP CONSTRAINT IF EXISTS voice_prompts_session_unique;

-- Add avatar reference columns (nullable for migration)
ALTER TABLE public.voice_prompts
ADD COLUMN IF NOT EXISTS avatar_id uuid REFERENCES public.user_avatars(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_profile_avatar boolean DEFAULT false;

-- Remove session_id requirement (keep column for backward compatibility but make nullable)
ALTER TABLE public.voice_prompts
ALTER COLUMN session_id DROP NOT NULL;

-- Add unique constraint: one voice_prompt per avatar OR one per user profile
-- avatar_id is set for saved avatars, is_profile_avatar=true for profile avatar
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_prompts_avatar
ON public.voice_prompts(avatar_id) WHERE avatar_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_prompts_profile
ON public.voice_prompts(user_id) WHERE is_profile_avatar = true AND avatar_id IS NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_prompts_user_profile
ON public.voice_prompts(user_id, is_profile_avatar);

COMMENT ON COLUMN public.voice_prompts.avatar_id IS 'Reference to user_avatars.id for saved avatars';
COMMENT ON COLUMN public.voice_prompts.is_profile_avatar IS 'True if this voice is for user profile avatar (not saved avatar)';
