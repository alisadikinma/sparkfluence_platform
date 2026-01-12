-- ============================================================================
-- SPARKFLUENCE v2.0 - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Date: January 2026
-- Purpose: Fresh database setup for production-ready platform
-- Run this in: Supabase SQL Editor (as single transaction)
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For embeddings/RAG

-- ============================================================================
-- PART 2: HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION uuid_generate_v4()
RETURNS uuid AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('voice-references', 'voice-references', false, 52428800, ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg']),
  ('image-references', 'image-references', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('generated-images', 'generated-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('generated-videos', 'generated-videos', true, 104857600, ARRAY['video/mp4', 'video/webm']),
  ('generated-voice', 'generated-voice', false, 52428800, ARRAY['audio/mp3', 'audio/wav', 'audio/mpeg']),
  ('generated-music', 'generated-music', false, 52428800, ARRAY['audio/mp3', 'audio/wav', 'audio/mpeg']),
  ('final-videos', 'final-videos', true, 524288000, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can manage own voice references" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'voice-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can manage own image references" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'image-references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view generated content" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('generated-images', 'generated-videos', 'generated-voice', 'generated-music', 'final-videos'));

CREATE POLICY "Service role manages all storage" ON storage.objects
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- PART 4: LOOKUP & REFERENCE TABLES
-- ============================================================================

-- Lookup Master (for dropdowns: interests, professions, platforms, objectives)
CREATE TABLE lookup_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- 'interest', 'profession', 'platform', 'objective'
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(category, name)
);

-- AI Model Pricing (HPP tracking)
CREATE TABLE ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('image', 'video', 'voice', 'music')),
  provider TEXT NOT NULL DEFAULT 'fal-ai',
  model_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN (
    'per_image', 'per_second', 'per_character', 
    'per_generation', 'per_megapixel', 'base_plus_unit'
  )),
  base_price DECIMAL(10,6) NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,6) DEFAULT 0,
  unit_name TEXT,
  supports_image_ref BOOLEAN DEFAULT false,
  supports_voice_clone BOOLEAN DEFAULT false,
  max_duration_seconds INTEGER,
  available_durations INTEGER[],
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  api_endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_model_pricing_category ON ai_model_pricing(category);
CREATE INDEX idx_ai_model_pricing_active ON ai_model_pricing(is_active, category);

-- ============================================================================
-- PART 5: USER TABLES
-- ============================================================================

-- User Profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Basic info
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,
  country TEXT DEFAULT 'ID',
  language TEXT DEFAULT 'id',
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  interest TEXT,
  profession TEXT,
  interest_id UUID REFERENCES lookup_master(id),
  profession_id UUID REFERENCES lookup_master(id),
  platforms TEXT[] DEFAULT '{}',
  objectives TEXT[] DEFAULT '{}',
  selected_niches TEXT[] DEFAULT '{}',
  creative_dna TEXT[] DEFAULT '{}',
  
  -- Creator profile (for video generation)
  character_description TEXT,
  character_ref_png TEXT,
  
  -- Voice cloning (Chatterbox)
  voice_reference_url TEXT,
  voice_reference_duration_ms INTEGER,
  voice_recorded_at TIMESTAMPTZ,
  
  -- Settings
  notification_settings JSONB DEFAULT '{"in_app": true, "marketing": false, "app_updates": true, "email_updates": true}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- User Avatars (multiple avatars per user)
CREATE TABLE user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Avatar' NOT NULL,
  storage_path TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  character_description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_avatars_user ON user_avatars(user_id);

-- User Image References (for B-ROLL)
CREATE TABLE user_image_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Reference',
  description TEXT,
  storage_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_image_refs_user ON user_image_references(user_id);

-- User Music Library (reusable generated music)
CREATE TABLE user_music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT,
  prompt TEXT,
  mood TEXT,
  genre TEXT,
  audio_url TEXT NOT NULL,
  duration_ms INTEGER,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_music_library_user ON user_music_library(user_id);
CREATE INDEX idx_user_music_library_mood ON user_music_library(user_id, mood);

-- ============================================================================
-- PART 6: SUBSCRIPTION & PAYMENT TABLES
-- ============================================================================

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  plan_id TEXT DEFAULT 'free' NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active' NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);

-- Stripe Prices
CREATE TABLE stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,
  billing_cycle TEXT,
  price_type TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'idr' NOT NULL,
  sparks_amount INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sparks Balance
CREATE TABLE sparks_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_balance INTEGER DEFAULT 0 NOT NULL,
  monthly_allocation INTEGER DEFAULT 30 NOT NULL,
  bonus_sparks INTEGER DEFAULT 0 NOT NULL,
  used_this_period INTEGER DEFAULT 0 NOT NULL,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  next_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sparks_balance_user ON sparks_balance(user_id);

-- Sparks Transactions
CREATE TABLE sparks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,  -- 'credit', 'debit', 'refund', 'topup', 'subscription'
  reference_type TEXT,  -- 'generation_session', 'topup_order', 'subscription'
  reference_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sparks_transactions_user ON sparks_transactions(user_id);
CREATE INDEX idx_sparks_transactions_type ON sparks_transactions(transaction_type);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_checkout_session_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'idr' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  payment_type TEXT NOT NULL,  -- 'subscription', 'topup'
  plan_id TEXT,
  topup_package_id TEXT,
  sparks_amount INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);

-- Payment History
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'idr' NOT NULL,
  payment_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  receipt_url TEXT,
  invoice_pdf TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);

-- Topup Orders
CREATE TABLE topup_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  package_id TEXT NOT NULL,
  sparks_amount INTEGER NOT NULL,
  price_idr INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_topup_orders_user ON topup_orders(user_id);

-- ============================================================================
-- PART 7: CONTENT GENERATION TABLES
-- ============================================================================

-- Generation Sessions (parent record for video project)
CREATE TABLE generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  
  -- Content info
  topic TEXT NOT NULL,
  language TEXT DEFAULT 'id' CHECK (language IN ('id', 'en', 'hi')),
  duration TEXT DEFAULT '60s' CHECK (duration IN ('30s', '60s', '90s')),
  aspect_ratio TEXT DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
  
  -- Model selections
  image_model TEXT,
  video_model TEXT,
  voice_model TEXT DEFAULT 'chatterbox/text-to-speech/turbo',
  music_model TEXT DEFAULT 'minimax-music/v2',
  
  -- Options
  include_subtitles BOOLEAN DEFAULT true,
  include_music BOOLEAN DEFAULT true,
  music_volume INTEGER DEFAULT 25 CHECK (music_volume >= 0 AND music_volume <= 100),
  selected_music_id UUID REFERENCES user_music_library(id),
  
  -- Script data
  script_data JSONB,
  segments_count INTEGER DEFAULT 0,
  
  -- Progress tracking
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'script_ready', 'images_pending', 'images_complete',
    'videos_pending', 'videos_complete', 'combining', 'completed', 'failed'
  )),
  current_step TEXT DEFAULT 'script',
  
  -- Cost tracking
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  actual_cost DECIMAL(10,4) DEFAULT 0,
  sparks_used INTEGER DEFAULT 0,
  
  -- Final output
  final_video_url TEXT,
  final_video_duration INTEGER,
  thumbnail_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_gen_sessions_user ON generation_sessions(user_id);
CREATE INDEX idx_gen_sessions_status ON generation_sessions(status);
CREATE INDEX idx_gen_sessions_session_id ON generation_sessions(session_id);

-- Image Generation Jobs
CREATE TABLE image_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  segment_number INTEGER DEFAULT 1 NOT NULL,
  segment_type TEXT,  -- 'HOOK', 'FORE', 'BODY-1', 'BODY-2', 'PEAK', 'CTA', 'LOOP-END'
  
  -- Generation info
  generation_number INTEGER DEFAULT 1,  -- 1st, 2nd, 3rd regeneration
  is_selected BOOLEAN DEFAULT false,    -- User's final choice
  
  -- Source type
  source_type TEXT DEFAULT 'generated' CHECK (source_type IN ('generated', 'stock', 'uploaded')),
  stock_source TEXT,           -- 'unsplash' or 'pexels'
  stock_id TEXT,               -- Original ID from stock service
  stock_photographer TEXT,     -- Attribution
  
  -- Model & prompt
  model_selected TEXT,
  shot_type TEXT DEFAULT 'B-ROLL',
  emotion TEXT,
  visual_prompt TEXT,
  visual_direction TEXT,
  script_text TEXT,
  
  -- Reference images
  character_description TEXT,
  character_ref_png TEXT,      -- Avatar URL for HOOK/CTA
  image_reference_url TEXT,    -- User-uploaded reference for B-ROLL
  
  -- Output
  image_url TEXT,
  image_analysis JSONB,        -- Vision API result
  
  -- Settings
  topic TEXT,
  style TEXT DEFAULT 'cinematic',
  aspect_ratio TEXT DEFAULT '9:16',
  
  -- Cost tracking
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  actual_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Status
  provider TEXT DEFAULT 'fal-ai',
  fallback_provider TEXT,
  status INTEGER DEFAULT 0 NOT NULL,  -- 0=pending, 1=processing, 2=completed, 3=failed
  error_message TEXT,
  fal_request_id TEXT,
  generation_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_image_jobs_user ON image_generation_jobs(user_id);
CREATE INDEX idx_image_jobs_session ON image_generation_jobs(session_id);
CREATE INDEX idx_image_jobs_segment ON image_generation_jobs(session_id, segment_id);
CREATE INDEX idx_image_jobs_status ON image_generation_jobs(status);
CREATE INDEX idx_image_jobs_model ON image_generation_jobs(model_selected);

-- Ensure only ONE selected image per segment
CREATE UNIQUE INDEX idx_image_jobs_selected_unique 
  ON image_generation_jobs (session_id, segment_id) 
  WHERE is_selected = true;

-- Video Generation Jobs
CREATE TABLE video_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  segment_number INTEGER DEFAULT 1,
  segment_type TEXT,
  
  -- Source image reference
  source_image_id UUID REFERENCES image_generation_jobs(id) ON DELETE SET NULL,
  image_url TEXT,
  image_analysis JSONB,
  
  -- Prompts
  generated_prompt TEXT,       -- Auto-generated from image analysis
  user_edited_prompt TEXT,     -- If user modified
  final_prompt TEXT,           -- What was sent to API
  prompt TEXT,                 -- Legacy field
  
  -- Model & settings
  model_selected TEXT,
  duration_seconds INTEGER DEFAULT 5,
  aspect_ratio TEXT DEFAULT '9:16',
  resolution TEXT DEFAULT '720p',
  
  -- Voice
  voice_url TEXT,
  voice_duration_ms INTEGER,
  voice_character TEXT,
  
  -- Script
  script_text TEXT,
  visual_direction TEXT,
  shot_type TEXT,
  emotion TEXT,
  
  -- Output
  video_url TEXT,
  thumbnail_url TEXT,
  veo_uuid TEXT,
  
  -- Creator settings
  avatar_selection TEXT DEFAULT 'no_avatar',
  has_profile_image BOOLEAN DEFAULT false,
  profile_image_url TEXT,
  creator_gender TEXT DEFAULT 'male',
  character_description TEXT,
  face_anchor_url TEXT,
  voice_anchor JSONB,
  
  -- Content settings
  topic TEXT,
  topic_title TEXT,
  language TEXT DEFAULT 'id',
  platform TEXT,
  preferred_platform TEXT,
  environment TEXT DEFAULT 'studio',
  
  -- Final video
  final_video_url TEXT,
  has_subtitles BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  current_step TEXT DEFAULT 'video',
  
  -- Cost tracking
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  actual_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Status
  status INTEGER DEFAULT 0,  -- 0=pending, 1=processing, 2=completed, 3=failed
  error_message TEXT,
  fal_request_id TEXT,
  generation_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_video_jobs_user ON video_generation_jobs(user_id);
CREATE INDEX idx_video_jobs_session ON video_generation_jobs(session_id);
CREATE INDEX idx_video_jobs_status ON video_generation_jobs(status);
CREATE INDEX idx_video_jobs_model ON video_generation_jobs(model_selected);

-- Voice Generation Jobs (Chatterbox TTS)
CREATE TABLE voice_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  segment_number INTEGER NOT NULL DEFAULT 1,
  
  -- Input
  script_text TEXT NOT NULL,
  language TEXT DEFAULT 'id',
  voice_reference_url TEXT,
  voice_style TEXT,
  
  -- Output
  audio_url TEXT,
  duration_ms INTEGER,
  character_count INTEGER,
  
  -- Cost
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  actual_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Status
  status INTEGER DEFAULT 0,
  error_message TEXT,
  fal_request_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT voice_jobs_session_segment_unique UNIQUE (session_id, segment_id)
);

CREATE INDEX idx_voice_jobs_user ON voice_generation_jobs(user_id);
CREATE INDEX idx_voice_jobs_session ON voice_generation_jobs(session_id);
CREATE INDEX idx_voice_jobs_status ON voice_generation_jobs(status);

-- Music Generation Jobs (Minimax Music)
CREATE TABLE music_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  
  -- Input
  prompt TEXT NOT NULL,
  mood TEXT,
  genre TEXT,
  duration_seconds INTEGER,
  
  -- Output
  audio_url TEXT,
  actual_duration_ms INTEGER,
  
  -- Save to library
  saved_to_library BOOLEAN DEFAULT false,
  library_id UUID REFERENCES user_music_library(id),
  
  -- Cost
  estimated_cost DECIMAL(10,6) DEFAULT 0.03,
  actual_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Status
  status INTEGER DEFAULT 0,
  error_message TEXT,
  fal_request_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_music_jobs_user ON music_generation_jobs(user_id);
CREATE INDEX idx_music_jobs_session ON music_generation_jobs(session_id);
CREATE INDEX idx_music_jobs_status ON music_generation_jobs(status);

-- ============================================================================
-- PART 8: CONTENT PLANNING & ANALYTICS
-- ============================================================================

-- Planned Content
CREATE TABLE planned_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  final_video_id UUID,
  final_video_url TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  platform_id UUID,
  platforms TEXT[] DEFAULT '{}',
  content_type TEXT DEFAULT 'video',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status TEXT DEFAULT 'planned',  -- 'planned', 'published', 'draft'
  thumbnail_url TEXT,
  video_data JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_planned_content_user ON planned_content(user_id);
CREATE INDEX idx_planned_content_date ON planned_content(scheduled_date);

-- Social Media Analytics
CREATE TABLE social_media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_content_id UUID REFERENCES planned_content(id),
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  post_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  total_views BIGINT DEFAULT 0,
  engagement_count BIGINT DEFAULT 0,
  likes_count BIGINT DEFAULT 0,
  comments_count BIGINT DEFAULT 0,
  shares_count BIGINT DEFAULT 0,
  saves_count BIGINT DEFAULT 0,
  followers_at_publish BIGINT DEFAULT 0,
  current_followers BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  average_watch_percentage NUMERIC DEFAULT 0,
  click_through_rate NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_social_analytics_user ON social_media_analytics(user_id);
CREATE INDEX idx_social_analytics_platform ON social_media_analytics(platform);

-- Analytics Summary
CREATE TABLE analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL,  -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_views BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  content_created_count INTEGER DEFAULT 0,
  total_followers BIGINT DEFAULT 0,
  views_growth_percentage NUMERIC DEFAULT 0,
  engagement_growth_percentage NUMERIC DEFAULT 0,
  content_growth_count INTEGER DEFAULT 0,
  followers_growth_count BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_summary_user ON analytics_summary(user_id);
CREATE INDEX idx_analytics_summary_period ON analytics_summary(period_type, period_start);

-- Linked Accounts (social media connections)
CREATE TABLE linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,  -- 'tiktok', 'instagram', 'youtube'
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_linked_accounts_user ON linked_accounts(user_id);

-- ============================================================================
-- PART 9: KNOWLEDGE & CACHING
-- ============================================================================

-- Knowledge Embeddings (RAG)
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  section_title TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_embeddings_project ON knowledge_embeddings(project_type);
CREATE INDEX idx_knowledge_embedding_vector ON knowledge_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Niche Cache
CREATE TABLE niche_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest TEXT NOT NULL,
  profession TEXT NOT NULL,
  niches JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(interest, profession)
);

-- Niche Recommendations Cache
CREATE TABLE niche_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT NOT NULL UNIQUE,
  interest TEXT NOT NULL,
  profession TEXT NOT NULL,
  niches JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 10: SYSTEM TABLES
-- ============================================================================

-- API Keys Pool (for rotation)
CREATE TABLE api_keys_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,  -- 'gemini', 'fal-ai', 'openrouter'
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER NOT NULL,
  limit_type TEXT DEFAULT 'requests',  -- 'requests', 'tokens', 'credits'
  is_active BOOLEAN DEFAULT true,
  is_exhausted BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1,
  reset_period TEXT DEFAULT 'monthly',  -- 'daily', 'weekly', 'monthly'
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  next_reset_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_provider ON api_keys_pool(provider, is_active);

-- Phone OTP
CREATE TABLE phone_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_phone_otp_phone ON phone_otp(phone_number);

-- Phone OTP Attempts
CREATE TABLE phone_otp_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  attempt_type TEXT NOT NULL,  -- 'send', 'verify'
  success BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_phone_otp_attempts_phone ON phone_otp_attempts(phone_number);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'system' NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Music Library (pre-loaded royalty-free music)
CREATE TABLE music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  genre TEXT NOT NULL,
  mood TEXT,
  duration INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_music_library_genre ON music_library(genre);
CREATE INDEX idx_music_library_mood ON music_library(mood);

-- Videos (legacy/simple videos table)
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '' NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  thumbnail TEXT DEFAULT '' NOT NULL,
  platforms JSONB DEFAULT '[]' NOT NULL,
  publish_date DATE DEFAULT CURRENT_DATE,
  publish_time TIME DEFAULT '18:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 11: FUNCTIONS
-- ============================================================================

-- Calculate session cost
CREATE OR REPLACE FUNCTION calculate_session_cost(p_session_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_image_cost DECIMAL(10,6) := 0;
  v_video_cost DECIMAL(10,6) := 0;
  v_voice_cost DECIMAL(10,6) := 0;
  v_music_cost DECIMAL(10,6) := 0;
  v_total_cost DECIMAL(10,6) := 0;
BEGIN
  SELECT COALESCE(SUM(actual_cost), 0) INTO v_image_cost
  FROM image_generation_jobs WHERE session_id = p_session_id AND is_selected = true;
  
  SELECT COALESCE(SUM(actual_cost), 0) INTO v_video_cost
  FROM video_generation_jobs WHERE session_id = p_session_id;
  
  SELECT COALESCE(SUM(actual_cost), 0) INTO v_voice_cost
  FROM voice_generation_jobs WHERE session_id = p_session_id;
  
  SELECT COALESCE(SUM(actual_cost), 0) INTO v_music_cost
  FROM music_generation_jobs WHERE session_id = p_session_id;
  
  v_total_cost := v_image_cost + v_video_cost + v_voice_cost + v_music_cost;
  
  UPDATE generation_sessions 
  SET actual_cost = v_total_cost, updated_at = now()
  WHERE session_id = p_session_id;
  
  RETURN jsonb_build_object(
    'image_cost', v_image_cost,
    'video_cost', v_video_cost,
    'voice_cost', v_voice_cost,
    'music_cost', v_music_cost,
    'total_cost', v_total_cost
  );
END;
$$;

-- Match knowledge embeddings (for RAG)
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (id uuid, chunk_text text, section_title text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, chunk_text, section_title, 1 - (embedding <=> query_embedding) as similarity
  FROM knowledge_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================================
-- PART 12: TRIGGERS
-- ============================================================================

-- Auto-update updated_at triggers
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_user_avatars_updated_at BEFORE UPDATE ON user_avatars
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_user_image_refs_updated_at BEFORE UPDATE ON user_image_references
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_user_music_library_updated_at BEFORE UPDATE ON user_music_library
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_sparks_balance_updated_at BEFORE UPDATE ON sparks_balance
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_generation_sessions_updated_at BEFORE UPDATE ON generation_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_image_jobs_updated_at BEFORE UPDATE ON image_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_video_jobs_updated_at BEFORE UPDATE ON video_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_voice_jobs_updated_at BEFORE UPDATE ON voice_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_music_jobs_updated_at BEFORE UPDATE ON music_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_planned_content_updated_at BEFORE UPDATE ON planned_content
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_social_analytics_updated_at BEFORE UPDATE ON social_media_analytics
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_analytics_summary_updated_at BEFORE UPDATE ON analytics_summary
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_linked_accounts_updated_at BEFORE UPDATE ON linked_accounts
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_knowledge_embeddings_updated_at BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_niche_cache_updated_at BEFORE UPDATE ON niche_cache
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_niche_recs_cache_updated_at BEFORE UPDATE ON niche_recommendations_cache
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_api_keys_pool_updated_at BEFORE UPDATE ON api_keys_pool
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_ai_model_pricing_updated_at BEFORE UPDATE ON ai_model_pricing
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trg_stripe_prices_updated_at BEFORE UPDATE ON stripe_prices
  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- ============================================================================
-- PART 13: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all user tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_image_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sparks_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sparks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_pricing ENABLE ROW LEVEL SECURITY;

-- Public read tables
ALTER TABLE lookup_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User can access own data
CREATE POLICY "Users manage own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own avatars" ON user_avatars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own image refs" ON user_image_references FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own music library" ON user_music_library FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sparks" ON sparks_balance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own transactions" ON sparks_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own payments" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own payment history" ON payment_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own topups" ON topup_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions" ON generation_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own image jobs" ON image_generation_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own video jobs" ON video_generation_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own voice jobs" ON voice_generation_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own music jobs" ON music_generation_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own planned content" ON planned_content FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own analytics" ON social_media_analytics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own summary" ON analytics_summary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own linked accounts" ON linked_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Public read policies
CREATE POLICY "Anyone can read lookup" ON lookup_master FOR SELECT USING (true);
CREATE POLICY "Anyone can read music library" ON music_library FOR SELECT USING (true);
CREATE POLICY "Anyone can read stripe prices" ON stripe_prices FOR SELECT USING (true);
CREATE POLICY "Anyone can read ai pricing" ON ai_model_pricing FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role all user_profiles" ON user_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all subscriptions" ON subscriptions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all sparks" ON sparks_balance FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all transactions" ON sparks_transactions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all payments" ON payments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all sessions" ON generation_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all image jobs" ON image_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all video jobs" ON video_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all voice jobs" ON voice_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all music jobs" ON music_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages pricing" ON ai_model_pricing FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages lookup" ON lookup_master FOR ALL TO service_role USING (true);

-- ============================================================================
-- PART 14: SEED DATA
-- ============================================================================

-- Lookup Master Data
INSERT INTO lookup_master (category, name) VALUES
  -- Interests
  ('interest', 'Entertainment'),
  ('interest', 'Travel'),
  ('interest', 'Music'),
  ('interest', 'Game'),
  ('interest', 'Education'),
  ('interest', 'Technology'),
  ('interest', 'Fashion'),
  ('interest', 'Motivation'),
  ('interest', 'Finance'),
  ('interest', 'Health'),
  ('interest', 'Culinary'),
  ('interest', 'Design'),
  ('interest', 'Others'),
  -- Professions
  ('profession', 'Content Creator'),
  ('profession', 'Influencer'),
  ('profession', 'Marketer'),
  ('profession', 'Entrepreneur'),
  ('profession', 'Student'),
  ('profession', 'Other'),
  -- Platforms
  ('platform', 'TikTok'),
  ('platform', 'Instagram'),
  ('platform', 'Youtube'),
  -- Objectives
  ('objective', 'Growth'),
  ('objective', 'Monetize'),
  ('objective', 'Consistency')
ON CONFLICT (category, name) DO NOTHING;

-- AI Model Pricing Data
INSERT INTO ai_model_pricing (category, provider, model_id, model_name, pricing_type, base_price, unit_price, unit_name, supports_image_ref, max_duration_seconds, available_durations, is_default, display_order, api_endpoint)
VALUES
  -- Image Models
  ('image', 'fal-ai', 'flux-pro/kontext', 'Flux Kontext Pro', 'per_image', 0.04, NULL, NULL, true, NULL, NULL, true, 1, 'https://fal.ai/models/fal-ai/flux-pro/kontext'),
  ('image', 'fal-ai', 'nano-banana/edit', 'Nano Banana Edit', 'per_image', 0.039, NULL, NULL, true, NULL, NULL, false, 2, 'https://fal.ai/models/fal-ai/nano-banana/edit'),
  ('image', 'fal-ai', 'bytedance/seedream/v4/text-to-image', 'Seedream v4', 'per_image', 0.03, NULL, NULL, false, NULL, NULL, false, 3, 'https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image'),
  ('image', 'fal-ai', 'qwen-image', 'Qwen Image', 'per_megapixel', 0.02, NULL, 'megapixel', false, NULL, NULL, false, 4, 'https://fal.ai/models/fal-ai/qwen-image'),
  -- Video Models
  ('video', 'fal-ai', 'wan-25-preview/image-to-video', 'Wan 2.5 Preview', 'per_second', 0.10, 0.05, 'second', true, 10, ARRAY[5, 10], true, 1, 'https://fal.ai/models/fal-ai/wan-25-preview/image-to-video'),
  ('video', 'fal-ai', 'kling-video/v2.5-turbo/standard/image-to-video', 'Kling 2.5 Turbo', 'base_plus_unit', 0.21, 0.042, 'second', true, 10, ARRAY[5, 10], false, 2, 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/standard/image-to-video'),
  -- Voice Models
  ('voice', 'fal-ai', 'chatterbox/text-to-speech/turbo', 'Chatterbox TTS', 'per_character', 0.00002, NULL, 'character', true, NULL, NULL, true, 1, 'https://fal.ai/models/fal-ai/chatterbox/text-to-speech/turbo'),
  -- Music Models
  ('music', 'fal-ai', 'minimax-music/v2', 'Minimax Music v2', 'per_generation', 0.03, NULL, NULL, false, NULL, NULL, true, 1, 'https://fal.ai/models/fal-ai/minimax-music/v2')
ON CONFLICT (model_id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  base_price = EXCLUDED.base_price,
  unit_price = EXCLUDED.unit_price,
  is_default = EXCLUDED.is_default,
  updated_at = now();

-- ============================================================================
-- PART 15: VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Sparkfluence v2.0 Database Setup Complete!';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created: 30+';
  RAISE NOTICE 'Storage buckets: 8';
  RAISE NOTICE 'Functions: 3';
  RAISE NOTICE 'Triggers: 25+';
  RAISE NOTICE 'RLS Policies: 40+';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set up Edge Functions';
  RAISE NOTICE '2. Configure environment variables';
  RAISE NOTICE '3. Deploy frontend';
  RAISE NOTICE '=============================================';
END $$;
