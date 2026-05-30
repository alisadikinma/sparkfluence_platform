-- ============================================================================
-- MIGRATION: Carousel Image Feature + Global Branding Kit
-- Tables: user_branding_kit, carousel_projects, carousel_source_urls, carousel_slides
-- ============================================================================

-- ============================================================================
-- 1. user_branding_kit — Global branding (1 per user, all features)
-- ============================================================================
CREATE TABLE public.user_branding_kit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Core (flat, queryable)
  kit_name TEXT NOT NULL DEFAULT 'My Brand',
  logo_url TEXT,
  handle_text TEXT,
  font_family TEXT NOT NULL DEFAULT 'Inter',
  font_weight TEXT NOT NULL DEFAULT '700',

  -- Color Palette (JSONB)
  colors JSONB NOT NULL DEFAULT '{
    "primary": "#F5A623",
    "secondary": "#0F172A",
    "accent": "#FFFFFF",
    "highlight": "#F5A623",
    "muted": "#A3A3A3"
  }'::jsonb,

  -- Watermark Config (JSONB)
  watermark JSONB NOT NULL DEFAULT '{
    "opacity": 30,
    "position": "center",
    "icon_size": "medium"
  }'::jsonb,

  -- Text Style Presets (JSONB)
  text_presets JSONB NOT NULL DEFAULT '{
    "headline": {"fontSize": 48, "fontWeight": 900, "color": "#FFFFFF", "shadow": true, "strokeWidth": 0, "strokeColor": "#000000"},
    "subtitle": {"fontSize": 24, "fontWeight": 600, "color": "#A3A3A3", "shadow": false},
    "cta": {"fontSize": 28, "fontWeight": 800, "bgColor": "#F5A623", "textColor": "#000000", "borderRadius": 8},
    "pagination": {"fontSize": 14, "color": "#A3A3A3", "format": "[N]/[TOTAL]"}
  }'::jsonb,

  -- Wizard metadata
  discovery_method TEXT,  -- 'ai_wizard' | 'template' | 'ig_import' | 'competitor_scan'
  wizard_inputs JSONB,    -- store niche/audience/vibe for re-generation

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER trg_user_branding_kit_set_updated_at
  BEFORE UPDATE ON public.user_branding_kit
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
ALTER TABLE public.user_branding_kit ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_branding_kit ON public.user_branding_kit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_branding_kit ON public.user_branding_kit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_branding_kit ON public.user_branding_kit FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_branding_kit ON public.user_branding_kit FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_branding_kit_user_id ON public.user_branding_kit(user_id);

-- ============================================================================
-- 2. carousel_projects — Per-user carousel project sessions
-- ============================================================================
CREATE TABLE public.carousel_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL UNIQUE,  -- SF-YYYYMMDD-XXXX format

  -- Metadata
  title TEXT NOT NULL DEFAULT 'Untitled Carousel',
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, source_ready, generated, edited, video_ready, published, complete
  generation_mode TEXT NOT NULL DEFAULT 'ai',  -- 'ai' | 'manual'
  ai_text_mode BOOLEAN NOT NULL DEFAULT true,  -- true = AI Text ON (5-paragraph), false = OFF (4-paragraph)

  -- Settings
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { aspectRatio, slideCount, imageModel, ... }

  -- Source info
  source_type TEXT DEFAULT 'instagram',  -- 'instagram' | 'manual_upload'
  source_url TEXT,  -- original IG post URL

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER trg_carousel_projects_set_updated_at
  BEFORE UPDATE ON public.carousel_projects
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
ALTER TABLE public.carousel_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_carousel_projects ON public.carousel_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own_carousel_projects ON public.carousel_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_own_carousel_projects ON public.carousel_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY delete_own_carousel_projects ON public.carousel_projects FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_carousel_projects_user_id ON public.carousel_projects(user_id);
CREATE INDEX idx_carousel_projects_status ON public.carousel_projects(status);

-- ============================================================================
-- 3. carousel_source_urls — IG import URLs + media data
-- ============================================================================
CREATE TABLE public.carousel_source_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.carousel_projects(id) ON DELETE CASCADE,

  -- Source data
  source_url TEXT NOT NULL,              -- original IG post URL
  shortcode TEXT,                        -- extracted IG shortcode
  media_id TEXT,                         -- IG Graph API media_id
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of { url, media_type, width, height }
  source_order INTEGER NOT NULL DEFAULT 0,

  -- Scrape status
  scrape_status TEXT NOT NULL DEFAULT 'pending',  -- pending, fetching, completed, failed
  scrape_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER trg_carousel_source_urls_set_updated_at
  BEFORE UPDATE ON public.carousel_source_urls
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
ALTER TABLE public.carousel_source_urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_carousel_source_urls ON public.carousel_source_urls
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_source_urls.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY insert_own_carousel_source_urls ON public.carousel_source_urls
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_source_urls.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY update_own_carousel_source_urls ON public.carousel_source_urls
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_source_urls.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY delete_own_carousel_source_urls ON public.carousel_source_urls
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_source_urls.project_id AND p.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_carousel_source_urls_project_id ON public.carousel_source_urls(project_id);

-- ============================================================================
-- 4. carousel_slides — Generated/uploaded slides with editor state
-- ============================================================================
CREATE TABLE public.carousel_slides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.carousel_projects(id) ON DELETE CASCADE,

  -- Slide metadata
  slide_index INTEGER NOT NULL DEFAULT 0,
  slide_type TEXT NOT NULL DEFAULT 'BODY',  -- HOOK, FORE, BODY, PEAK, CTA
  generation_method TEXT NOT NULL DEFAULT 'ai',  -- 'ai' | 'manual' (per-slide override)

  -- AI analysis (cached from analyze-carousel-source)
  analysis_data JSONB,  -- { topic, text_content, layout, visual_style, subject_detection }

  -- Prompt & generation
  prompt TEXT,           -- AI-generated fal.ai prompt
  image_url TEXT,        -- generated or uploaded image URL
  image_model TEXT,      -- fal.ai model key used

  -- Source reference
  source_image_url TEXT,   -- original IG image URL (for comparison)
  reference_image_url TEXT, -- user-provided style reference

  -- Creator face
  creator_face BOOLEAN NOT NULL DEFAULT false,  -- uses reference image for face consistency

  -- Additional user input
  additional_note TEXT,  -- free-text appended to AI prompt

  -- Canvas editor state (fabric.js JSON)
  editor_state JSONB,

  -- Video conversion
  video_toggle BOOLEAN NOT NULL DEFAULT false,  -- marked for video conversion
  video_url TEXT,
  video_motion_preset TEXT,  -- 'subtle_zoom' | 'dynamic_pan' | 'parallax_layers' | 'custom'
  video_duration INTEGER DEFAULT 8,  -- 5, 8, or 10 seconds
  video_custom_prompt TEXT,  -- custom motion prompt (when preset = 'custom')

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER trg_carousel_slides_set_updated_at
  BEFORE UPDATE ON public.carousel_slides
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- RLS
ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_carousel_slides ON public.carousel_slides
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_slides.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY insert_own_carousel_slides ON public.carousel_slides
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_slides.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY update_own_carousel_slides ON public.carousel_slides
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_slides.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY delete_own_carousel_slides ON public.carousel_slides
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.carousel_projects p WHERE p.id = carousel_slides.project_id AND p.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_carousel_slides_project_id ON public.carousel_slides(project_id);
CREATE INDEX idx_carousel_slides_type ON public.carousel_slides(slide_type);

-- ============================================================================
-- 5. Storage bucket for carousel images (manual uploads + generated)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carousel-images',
  'carousel-images',
  true,
  10485760,  -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can manage their own files
CREATE POLICY "carousel_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'carousel-images');
CREATE POLICY "carousel_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');
CREATE POLICY "carousel_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');
CREATE POLICY "carousel_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');
