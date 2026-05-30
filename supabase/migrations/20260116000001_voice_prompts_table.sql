-- ============================================================================
-- VOICE PROMPTS TABLE
-- Stores voice character prompts for consistent narration across video segments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.voice_prompts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id text NOT NULL,

    -- Voice Character Properties
    language text NOT NULL,           -- indonesian, english, hindi, spanish
    gender text NOT NULL,             -- male, female

    -- Voice Profile Details
    voice_description text NOT NULL,  -- Full description (e.g., "Indonesian male, warm friendly tone")
    voice_age text NOT NULL,          -- e.g., "25-30 years old"
    voice_accent text NOT NULL,       -- e.g., "Indonesian native with Jakarta urban accent"
    voice_tone text NOT NULL,         -- e.g., "warm, friendly, enthusiastic"
    voice_pace text NOT NULL,         -- e.g., "medium-fast, natural conversational rhythm"

    -- Full VEO 3.1 Prompt Block (cached for performance)
    voice_prompt_block text NOT NULL,

    -- Metadata
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT voice_prompts_session_unique UNIQUE(session_id),
    CONSTRAINT voice_prompts_gender_check CHECK (gender IN ('male', 'female')),
    CONSTRAINT voice_prompts_language_check CHECK (language IN ('indonesian', 'english', 'hindi', 'spanish'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_prompts_session ON public.voice_prompts(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_prompts_user ON public.voice_prompts(user_id);

-- RLS Policy
ALTER TABLE public.voice_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_voice_prompts" ON public.voice_prompts
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_voice_prompts" ON public.voice_prompts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_voice_prompts" ON public.voice_prompts
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "delete_own_voice_prompts" ON public.voice_prompts
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role full access (for edge functions)
CREATE POLICY "service_role_voice_prompts" ON public.voice_prompts
FOR ALL TO service_role USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER trg_voice_prompts_set_updated_at
    BEFORE UPDATE ON public.voice_prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_set_updated_at();

-- Grant permissions
GRANT ALL ON TABLE public.voice_prompts TO authenticated;
GRANT ALL ON TABLE public.voice_prompts TO service_role;

COMMENT ON TABLE public.voice_prompts IS 'Stores voice character prompts for VEO 3.1 video generation consistency';
