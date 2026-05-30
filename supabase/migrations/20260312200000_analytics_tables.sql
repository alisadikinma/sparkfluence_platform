-- ============================================================================
-- Migration: 20260312200000_analytics_tables
-- Description: Analytics tables for Carousel Image feature Phase 4
--   - post_analytics: Per-post metrics from Instagram Insights API
--   - ab_experiments: A/B experiment tracking
--   - audience_insights: Demographics snapshots
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. post_analytics — Per-post metrics from Instagram Insights API
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.post_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform_post_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('carousel', 'creator_lab', 'ad_studio')),
    content_id TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'tiktok', 'linkedin')),
    post_title TEXT,
    thumbnail_url TEXT,
    posted_at TIMESTAMPTZ,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    slide_metrics JSONB,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_account_id, platform_post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_user ON public.post_analytics (user_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_analytics_content ON public.post_analytics (content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_posted ON public.post_analytics (user_id, posted_at DESC);

CREATE TRIGGER trg_post_analytics_set_updated_at
    BEFORE UPDATE ON public.post_analytics
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_set_updated_at();

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_post_analytics ON public.post_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_post_analytics ON public.post_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_post_analytics ON public.post_analytics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY delete_own_post_analytics ON public.post_analytics
    FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. ab_experiments — A/B experiment tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    variant_a_post_id UUID REFERENCES public.post_analytics(id) ON DELETE SET NULL,
    variant_b_post_id UUID REFERENCES public.post_analytics(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES public.post_analytics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    significance_score NUMERIC(5,4),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_experiments_user ON public.ab_experiments (user_id, status);

CREATE TRIGGER trg_ab_experiments_set_updated_at
    BEFORE UPDATE ON public.ab_experiments
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_set_updated_at();

ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_ab_experiments ON public.ab_experiments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_ab_experiments ON public.ab_experiments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_ab_experiments ON public.ab_experiments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY delete_own_ab_experiments ON public.ab_experiments
    FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. audience_insights — Demographics snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audience_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_audience_insights_user ON public.audience_insights (user_id, date DESC);

ALTER TABLE public.audience_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_audience_insights ON public.audience_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_audience_insights ON public.audience_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_audience_insights ON public.audience_insights
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY delete_own_audience_insights ON public.audience_insights
    FOR DELETE USING (auth.uid() = user_id);
