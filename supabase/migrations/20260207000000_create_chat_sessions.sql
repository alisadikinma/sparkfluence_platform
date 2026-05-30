-- ============================================================================
-- MIGRATION: Create chat_sessions table for v3.0 Chat-Based Platform
-- ============================================================================

CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  session_type TEXT NOT NULL DEFAULT 'script_gen',  -- script_gen, creator_lab, ad_studio
  title TEXT NOT NULL DEFAULT 'Untitled',
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, script_ready, images_ready, video_ready, complete

  -- Input data
  topic TEXT,
  input_type TEXT DEFAULT 'topic',  -- topic, transcript, image, youtube
  settings JSONB DEFAULT '{}',      -- { duration, aspectRatio, language, model, avatarOption, avatarId, avatarUrl }

  -- Script data
  script_data JSONB,                -- { segments, hook_options, metadata, quality_report }
  selected_hook TEXT,               -- 'option_a_safe' | 'option_b_negative' | 'option_c_visual'
  script_versions JSONB DEFAULT '[]', -- Array of { version, segments, hook_options, score, created_at }
  selected_version INT DEFAULT 1,
  script_confirmed BOOLEAN DEFAULT FALSE,
  additional_notes TEXT,

  -- Image data
  image_data JSONB,                 -- { segments with imageUrl, images array }

  -- Video data
  video_data JSONB,                 -- { segments with videoUrl }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_order_id ON public.chat_sessions(order_id);
CREATE INDEX idx_chat_sessions_updated ON public.chat_sessions(user_id, updated_at DESC);

-- RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_chat_sessions ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_chat_sessions ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_chat_sessions ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_chat_sessions ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger (reuses existing trigger function)
CREATE TRIGGER trg_chat_sessions_set_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();
