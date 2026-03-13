-- ============================================================================
-- MIGRATION: Social Accounts + Post Scheduling (Carousel Phase 3)
-- Tables: social_accounts, scheduled_posts
-- Function: ensure_single_default_per_platform (trigger)
-- ============================================================================

-- ============================================================================
-- 1. social_accounts — Multi-account OAuth per platform
-- 1 user can have multiple accounts per platform (e.g. 3 IG, 1 TikTok, 1 LinkedIn)
-- ============================================================================
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'linkedin')),
  platform_user_id TEXT NOT NULL,   -- IG user ID, TikTok user ID, etc.
  account_label TEXT,               -- Display name (e.g., "@myhandle")
  username TEXT,
  profile_picture_url TEXT,
  access_token TEXT NOT NULL,       -- Encrypted at rest via Supabase
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  ig_page_id TEXT,                  -- Instagram requires page_id for Graph API
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scopes TEXT[],                    -- Granted OAuth permissions
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Platform-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Indexes
CREATE INDEX idx_social_accounts_user ON public.social_accounts(user_id, platform);
CREATE INDEX idx_social_accounts_active ON public.social_accounts(user_id, is_active) WHERE is_active = true;

-- Trigger: updated_at
CREATE TRIGGER trg_social_accounts_set_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_social_accounts ON public.social_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_social_accounts ON public.social_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_social_accounts ON public.social_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_social_accounts ON public.social_accounts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. ensure_single_default_per_platform — Trigger function
-- When setting is_default = true, unset all other defaults for same user+platform
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_fn_ensure_single_default_per_platform()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when is_default is being set to true
  IF NEW.is_default = true AND (TG_OP = 'INSERT' OR OLD.is_default IS DISTINCT FROM NEW.is_default) THEN
    UPDATE public.social_accounts
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND platform = NEW.platform
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_social_accounts_ensure_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_ensure_single_default_per_platform();

-- ============================================================================
-- 3. scheduled_posts — Post scheduling queue (all features)
-- Posts from carousel, creator lab, ad studio
-- ============================================================================
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('carousel', 'creator_lab', 'ad_studio')),
  content_id TEXT NOT NULL,         -- project_id or order_id
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'linkedin')),
  caption TEXT,
  hashtags TEXT[],
  media_urls TEXT[],                -- Array of image/video URLs to post
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('now', 'scheduled')),
  scheduled_at TIMESTAMPTZ,         -- NULL for 'now' type
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),
  posted_at TIMESTAMPTZ,
  platform_post_id TEXT,            -- Post ID from the platform after publishing
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Platform-specific post settings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scheduled_posts_user ON public.scheduled_posts(user_id, status);
CREATE INDEX idx_scheduled_posts_queue ON public.scheduled_posts(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX idx_scheduled_posts_content ON public.scheduled_posts(content_type, content_id);

-- Trigger: updated_at
CREATE TRIGGER trg_scheduled_posts_set_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_scheduled_posts ON public.scheduled_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_scheduled_posts ON public.scheduled_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_scheduled_posts ON public.scheduled_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_scheduled_posts ON public.scheduled_posts FOR DELETE USING (auth.uid() = user_id);
