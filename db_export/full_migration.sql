-- ============================================================
-- SPARKFLUENCE — Full Database Migration (extracted from live DB)
-- Generated: 2026-02-11
-- Source: lgccaexqwmmvuvxbacic.supabase.co
-- Tables: 34 (excluded: niche_cache, music_library, stock_image_searches)
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" SCHEMA public;
-- pg_cron and pg_net: enable via Supabase Dashboard → Database → Extensions

-- ============================================================
-- SECTION 2: HELPER FUNCTIONS (must exist before tables/triggers)
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_stock_searches_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_topic_outfit_cache_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$;

-- ============================================================
-- SECTION 3: TABLES (34 tables)
-- ============================================================

-- 1. ai_model_pricing
CREATE TABLE public.ai_model_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  provider text NOT NULL DEFAULT 'fal-ai',
  model_id text NOT NULL UNIQUE,
  model_name text NOT NULL,
  pricing_type text NOT NULL,
  base_price numeric NOT NULL DEFAULT 0,
  unit_price numeric DEFAULT 0,
  unit_name text,
  supports_image_ref boolean DEFAULT false,
  supports_voice_clone boolean DEFAULT false,
  max_duration_seconds integer,
  available_durations integer[],
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  notes text,
  api_endpoint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. analytics_summary
CREATE TABLE public.analytics_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  period_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_views bigint DEFAULT 0,
  total_engagement bigint DEFAULT 0,
  content_created_count integer DEFAULT 0,
  total_followers bigint DEFAULT 0,
  views_growth_percentage numeric DEFAULT 0,
  engagement_growth_percentage numeric DEFAULT 0,
  content_growth_count integer DEFAULT 0,
  followers_growth_count bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. api_keys_pool
CREATE TABLE public.api_keys_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  key_name text NOT NULL,
  api_key text NOT NULL,
  usage_count integer DEFAULT 0,
  usage_limit integer NOT NULL,
  limit_type text DEFAULT 'requests',
  is_active boolean DEFAULT true,
  is_exhausted boolean DEFAULT false,
  priority integer DEFAULT 1,
  reset_period text DEFAULT 'monthly',
  last_reset_at timestamptz DEFAULT now(),
  next_reset_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. generation_sessions
CREATE TABLE public.generation_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  topic text NOT NULL,
  language text DEFAULT 'id',
  duration text DEFAULT '60s',
  aspect_ratio text DEFAULT '9:16',
  image_model text,
  video_model text,
  voice_model text DEFAULT 'chatterbox/text-to-speech/turbo',
  music_model text DEFAULT 'minimax-music/v2',
  include_subtitles boolean DEFAULT true,
  include_music boolean DEFAULT true,
  music_volume integer DEFAULT 25,
  selected_music_id uuid,
  script_data jsonb,
  segments_count integer DEFAULT 0,
  status text DEFAULT 'draft',
  current_step text DEFAULT 'script',
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  sparks_used integer DEFAULT 0,
  final_video_url text,
  final_video_duration integer,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  order_id text UNIQUE
);

-- 5. image_generation_jobs
CREATE TABLE public.image_generation_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  segment_id text NOT NULL,
  segment_number integer NOT NULL DEFAULT 1,
  segment_type text,
  generation_number integer DEFAULT 1,
  is_selected boolean DEFAULT false,
  source_type text DEFAULT 'generated',
  stock_source text,
  stock_id text,
  stock_photographer text,
  model_selected text,
  shot_type text DEFAULT 'B-ROLL',
  emotion text,
  visual_prompt text,
  visual_direction text,
  script_text text,
  character_description text,
  character_ref_png text,
  image_reference_url text,
  image_url text,
  image_analysis jsonb,
  topic text,
  style text DEFAULT 'cinematic',
  aspect_ratio text DEFAULT '9:16',
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  provider text DEFAULT 'fal-ai',
  fallback_provider text,
  status integer NOT NULL DEFAULT 0,
  error_message text,
  fal_request_id text,
  generation_time_ms integer,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  regeneration_notes text,
  reference_image_url text,
  include_creator_face boolean DEFAULT false,
  creator_ref_for_broll text
);

-- 6. knowledge_embeddings
CREATE TABLE public.knowledge_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_type text NOT NULL,
  file_name text NOT NULL,
  section_title text NOT NULL,
  chunk_text text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(768),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. linked_accounts
CREATE TABLE public.linked_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  platform_user_id text NOT NULL,
  platform_username text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- 8. lookup_master
CREATE TABLE public.lookup_master (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, name)
);

-- 9. music_generation_jobs
CREATE TABLE public.music_generation_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  prompt text NOT NULL,
  mood text,
  genre text,
  duration_seconds integer,
  audio_url text,
  actual_duration_ms integer,
  saved_to_library boolean DEFAULT false,
  library_id uuid,
  estimated_cost numeric DEFAULT 0.03,
  actual_cost numeric DEFAULT 0,
  status integer DEFAULT 0,
  error_message text,
  fal_request_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. niche_recommendations_cache
CREATE TABLE public.niche_recommendations_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  input_hash text NOT NULL UNIQUE,
  interest text NOT NULL,
  profession text NOT NULL,
  niches jsonb NOT NULL,
  hit_count integer DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 12. payment_history
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_charge_id text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'idr',
  payment_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reference_type text,
  reference_id uuid,
  receipt_url text,
  invoice_pdf text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 13. payments
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'idr',
  status text NOT NULL DEFAULT 'pending',
  payment_type text NOT NULL,
  plan_id text,
  topup_package_id text,
  sparks_amount integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 14. phone_otp
CREATE TABLE public.phone_otp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL UNIQUE,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 15. phone_otp_attempts
CREATE TABLE public.phone_otp_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  attempt_type text NOT NULL,
  success boolean DEFAULT false,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- 16. planned_content
CREATE TABLE public.planned_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  final_video_id uuid,
  final_video_url text,
  title text NOT NULL,
  description text DEFAULT '',
  platform_id uuid,
  platforms text[] DEFAULT '{}',
  content_type text DEFAULT 'video',
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  status text DEFAULT 'planned',
  thumbnail_url text,
  video_data jsonb DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 17. social_media_analytics
CREATE TABLE public.social_media_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  planned_content_id uuid,
  platform text NOT NULL,
  platform_post_id text,
  post_url text,
  published_at timestamptz NOT NULL,
  total_views bigint DEFAULT 0,
  engagement_count bigint DEFAULT 0,
  likes_count bigint DEFAULT 0,
  comments_count bigint DEFAULT 0,
  shares_count bigint DEFAULT 0,
  saves_count bigint DEFAULT 0,
  followers_at_publish bigint DEFAULT 0,
  current_followers bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  watch_time_seconds bigint DEFAULT 0,
  average_watch_percentage numeric DEFAULT 0,
  click_through_rate numeric DEFAULT 0,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 18. sparks_balance
CREATE TABLE public.sparks_balance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  current_balance integer NOT NULL DEFAULT 0,
  monthly_allocation integer NOT NULL DEFAULT 30,
  bonus_sparks integer NOT NULL DEFAULT 0,
  used_this_period integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz DEFAULT now(),
  next_reset_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 19. sparks_transactions
CREATE TABLE public.sparks_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  transaction_type text NOT NULL,
  reference_type text,
  reference_id text,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 20. stripe_prices
CREATE TABLE public.stripe_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id text NOT NULL,
  billing_cycle text,
  price_type text NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  stripe_product_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'idr',
  sparks_amount integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 21. subscriptions
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  plan_id text NOT NULL DEFAULT 'free',
  billing_cycle text DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 22. topic_outfit_cache
CREATE TABLE public.topic_outfit_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_hash text NOT NULL UNIQUE,
  topic_original text NOT NULL,
  category text NOT NULL,
  outfit text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 23. topup_orders
CREATE TABLE public.topup_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  package_id text NOT NULL,
  sparks_amount integer NOT NULL,
  price_idr integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 24. trending_challenges
CREATE TABLE public.trending_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  source text NOT NULL DEFAULT 'tiktok',
  country text NOT NULL DEFAULT 'GLOBAL',
  volume_score integer DEFAULT 50,
  hashtags text[] DEFAULT '{}',
  example_format text,
  script_instruction text,
  raw_data jsonb,
  fetch_date date DEFAULT CURRENT_DATE,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  UNIQUE(slug, source, fetch_date)
);

-- 25. trending_topics
CREATE TABLE public.trending_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  keyword text NOT NULL,
  country text NOT NULL,
  category text,
  volume_score integer DEFAULT 0,
  raw_data jsonb,
  fetch_date date DEFAULT CURRENT_DATE,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '8 hours'),
  UNIQUE(source, keyword, country, fetch_date)
);

-- 26. user_avatars
CREATE TABLE public.user_avatars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Avatar',
  storage_path text NOT NULL,
  avatar_url text NOT NULL,
  character_description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 27. user_image_references
CREATE TABLE public.user_image_references (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Reference',
  description text,
  storage_path text NOT NULL,
  image_url text NOT NULL,
  width integer,
  height integer,
  file_size integer,
  mime_type text,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 28. user_music_library
CREATE TABLE public.user_music_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled',
  description text,
  prompt text,
  mood text,
  genre text,
  audio_url text NOT NULL,
  duration_ms integer,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  is_favorite boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 29. user_profiles
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  phone_number text,
  phone_verified boolean DEFAULT false,
  phone_verified_at timestamptz,
  country text DEFAULT 'ID',
  language text DEFAULT 'id',
  onboarding_completed boolean DEFAULT false,
  interest text,
  profession text,
  interest_id uuid,
  profession_id uuid,
  platforms text[] DEFAULT '{}',
  objectives text[] DEFAULT '{}',
  selected_niches text[] DEFAULT '{}',
  creative_dna text[] DEFAULT '{}',
  character_description text,
  character_ref_png text,
  notification_settings jsonb DEFAULT '{"in_app": true, "marketing": false, "app_updates": true, "email_updates": true}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  voice_reference_url text,
  voice_reference_duration_seconds integer,
  voice_recorded_at timestamptz,
  interests text[] DEFAULT '{}'
);

-- 30. user_topic_history
CREATE TABLE public.user_topic_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_title text NOT NULL,
  topic_description text,
  trending_source text,
  trending_keyword text,
  action text DEFAULT 'selected',
  created_at timestamptz DEFAULT now()
);

-- 31. video_generation_jobs
CREATE TABLE public.video_generation_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  segment_id text NOT NULL,
  segment_number integer DEFAULT 1,
  segment_type text,
  source_image_id uuid,
  image_url text,
  image_analysis jsonb,
  generated_prompt text,
  user_edited_prompt text,
  final_prompt text,
  prompt text,
  model_selected text,
  duration_seconds integer DEFAULT 5,
  aspect_ratio text DEFAULT '9:16',
  resolution text DEFAULT '720p',
  voice_duration_ms integer,
  script_text text,
  visual_direction text,
  shot_type text,
  emotion text,
  video_url text,
  thumbnail_url text,
  veo_uuid text,
  avatar_selection text DEFAULT 'no_avatar',
  has_profile_image boolean DEFAULT false,
  profile_image_url text,
  creator_gender text DEFAULT 'male',
  character_description text,
  face_anchor_url text,
  voice_anchor jsonb,
  topic text,
  topic_title text,
  language text DEFAULT 'id',
  platform text,
  preferred_platform text,
  environment text DEFAULT 'studio',
  final_video_url text,
  has_subtitles boolean DEFAULT false,
  is_approved boolean DEFAULT true,
  current_step text DEFAULT 'video',
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  status integer DEFAULT 0,
  error_message text,
  fal_request_id text,
  generation_time_ms integer,
  retry_count integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  webhook_received_at timestamptz,
  provider text DEFAULT 'fal.ai',
  last_retry_at timestamptz,
  next_retry_at timestamptz,
  max_retries integer DEFAULT 3,
  version integer DEFAULT 0,
  voice_prompt_id uuid,
  seed integer,
  negative_prompt text
);

-- 32. videos
CREATE TABLE public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  thumbnail text NOT NULL DEFAULT '',
  platforms jsonb NOT NULL DEFAULT '[]',
  publish_date date DEFAULT CURRENT_DATE,
  publish_time time DEFAULT '18:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 33. voice_prompts
CREATE TABLE public.voice_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text,
  language text NOT NULL,
  gender text NOT NULL,
  voice_description text NOT NULL,
  voice_age text NOT NULL,
  voice_accent text NOT NULL,
  voice_tone text NOT NULL,
  voice_pace text NOT NULL,
  voice_prompt_block text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  avatar_id uuid,
  is_profile_avatar boolean DEFAULT false
);

-- 34. webhook_events
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  received_at timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 4: CUSTOM FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_session_cost(p_session_id text)
RETURNS jsonb LANGUAGE plpgsql AS $$
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

  -- voice_generation_jobs may not exist yet
  -- SELECT COALESCE(SUM(actual_cost), 0) INTO v_voice_cost
  -- FROM voice_generation_jobs WHERE session_id = p_session_id;

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

CREATE OR REPLACE FUNCTION public.get_available_api_key(p_provider text)
RETURNS TABLE(key_id uuid, api_key text, key_name text, usage_count integer, usage_limit integer)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    akp.id AS key_id,
    akp.api_key,
    akp.key_name,
    COALESCE(akp.usage_count, 0) AS usage_count,
    akp.usage_limit
  FROM api_keys_pool akp
  WHERE akp.provider = p_provider
    AND COALESCE(akp.is_active, true) = true
    AND COALESCE(akp.is_exhausted, false) = false
    AND (akp.usage_limit IS NULL OR COALESCE(akp.usage_count, 0) < akp.usage_limit)
  ORDER BY
    COALESCE(akp.priority, 0) DESC,
    COALESCE(akp.usage_count, 0) ASC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_api_key_usage(p_key_id uuid, p_increment integer DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE api_keys_pool
  SET
    usage_count = COALESCE(usage_count, 0) + p_increment,
    updated_at = NOW()
  WHERE id = p_key_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_api_key_exhausted(p_key_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE api_keys_pool
  SET
    is_exhausted = true,
    updated_at = NOW()
  WHERE id = p_key_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_exhausted_api_keys(p_provider text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE api_keys_pool
  SET
    is_exhausted = false,
    usage_count = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE COALESCE(is_exhausted, false) = true
    AND (p_provider IS NULL OR provider = p_provider);

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_api_keys_stats(p_provider text DEFAULT NULL)
RETURNS TABLE(provider text, total_keys bigint, active_keys bigint, exhausted_keys bigint, total_usage bigint, total_limit bigint, usage_percentage numeric)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    akp.provider,
    COUNT(*)::BIGINT AS total_keys,
    COUNT(*) FILTER (WHERE COALESCE(akp.is_active, true) AND NOT COALESCE(akp.is_exhausted, false))::BIGINT AS active_keys,
    COUNT(*) FILTER (WHERE COALESCE(akp.is_exhausted, false))::BIGINT AS exhausted_keys,
    COALESCE(SUM(COALESCE(akp.usage_count, 0)), 0)::BIGINT AS total_usage,
    COALESCE(SUM(akp.usage_limit), 0)::BIGINT AS total_limit,
    CASE
      WHEN COALESCE(SUM(akp.usage_limit), 0) > 0
      THEN ROUND((COALESCE(SUM(COALESCE(akp.usage_count, 0)), 0)::NUMERIC / SUM(akp.usage_limit)::NUMERIC) * 100, 2)
      ELSE 0
    END AS usage_percentage
  FROM api_keys_pool akp
  WHERE p_provider IS NULL OR akp.provider = p_provider
  GROUP BY akp.provider
  ORDER BY akp.provider;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10)
RETURNS TABLE(id uuid, chunk_text text, section_title text, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT id, chunk_text, section_title, 1 - (embedding <=> query_embedding) as similarity
  FROM knowledge_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- NOTE: Update the URL and anon key below to match your NEW Supabase project!
CREATE OR REPLACE FUNCTION public.refresh_trending_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _supabase_url text;
  _service_key text;
BEGIN
  -- !! UPDATE THESE for your new project !!
  SELECT 'https://YOUR_NEW_PROJECT.supabase.co' INTO _supabase_url;
  SELECT 'YOUR_NEW_ANON_KEY' INTO _service_key;

  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/fetch-trending-data',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    )
  );

  RAISE LOG 'refresh_trending_data: Edge function called at %', now();
END;
$$;

-- ============================================================
-- SECTION 5: INDEXES
-- ============================================================

CREATE INDEX idx_ai_model_pricing_active ON public.ai_model_pricing (is_active, category);
CREATE INDEX idx_ai_model_pricing_category ON public.ai_model_pricing (category);
CREATE INDEX idx_analytics_summary_period ON public.analytics_summary (period_type, period_start);
CREATE INDEX idx_analytics_summary_user ON public.analytics_summary (user_id);
CREATE INDEX idx_api_keys_provider ON public.api_keys_pool (provider, is_active);
CREATE INDEX idx_gen_sessions_session_id ON public.generation_sessions (session_id);
CREATE INDEX idx_gen_sessions_status ON public.generation_sessions (status);
CREATE INDEX idx_gen_sessions_user ON public.generation_sessions (user_id);
CREATE INDEX idx_generation_sessions_order_id ON public.generation_sessions (order_id);
CREATE INDEX idx_image_generation_jobs_include_creator_face ON public.image_generation_jobs (include_creator_face) WHERE (include_creator_face = true);
CREATE INDEX idx_image_generation_jobs_multi_image ON public.image_generation_jobs (session_id, segment_number, generation_number);
CREATE INDEX idx_image_jobs_model ON public.image_generation_jobs (model_selected);
CREATE INDEX idx_image_jobs_segment ON public.image_generation_jobs (session_id, segment_id);
CREATE UNIQUE INDEX idx_image_jobs_selected_unique ON public.image_generation_jobs (session_id, segment_id) WHERE (is_selected = true);
CREATE INDEX idx_image_jobs_session ON public.image_generation_jobs (session_id);
CREATE INDEX idx_image_jobs_status ON public.image_generation_jobs (status);
CREATE INDEX idx_image_jobs_user ON public.image_generation_jobs (user_id);
CREATE INDEX idx_knowledge_embedding_vector ON public.knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_knowledge_embeddings_project ON public.knowledge_embeddings (project_type);
CREATE INDEX idx_linked_accounts_user ON public.linked_accounts (user_id);
CREATE INDEX idx_music_jobs_session ON public.music_generation_jobs (session_id);
CREATE INDEX idx_music_jobs_status ON public.music_generation_jobs (status);
CREATE INDEX idx_music_jobs_user ON public.music_generation_jobs (user_id);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id, is_read) WHERE (is_read = false);
CREATE INDEX idx_notifications_user ON public.notifications (user_id);
CREATE INDEX idx_payment_history_user ON public.payment_history (user_id);
CREATE INDEX idx_payments_stripe ON public.payments (stripe_payment_intent_id);
CREATE INDEX idx_payments_user ON public.payments (user_id);
CREATE INDEX idx_phone_otp_phone ON public.phone_otp (phone_number);
CREATE INDEX idx_phone_otp_attempts_phone ON public.phone_otp_attempts (phone_number);
CREATE INDEX idx_planned_content_date ON public.planned_content (scheduled_date);
CREATE INDEX idx_planned_content_user ON public.planned_content (user_id);
CREATE INDEX idx_social_analytics_platform ON public.social_media_analytics (platform);
CREATE INDEX idx_social_analytics_user ON public.social_media_analytics (user_id);
CREATE INDEX idx_sparks_balance_user ON public.sparks_balance (user_id);
CREATE INDEX idx_sparks_transactions_type ON public.sparks_transactions (transaction_type);
CREATE INDEX idx_sparks_transactions_user ON public.sparks_transactions (user_id);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions (stripe_customer_id);
CREATE INDEX idx_subscriptions_user ON public.subscriptions (user_id);
CREATE INDEX idx_topic_outfit_cache_category ON public.topic_outfit_cache (category);
CREATE INDEX idx_topic_outfit_cache_hash ON public.topic_outfit_cache (topic_hash);
CREATE INDEX idx_topup_orders_user ON public.topup_orders (user_id);
CREATE INDEX idx_trending_challenges_category ON public.trending_challenges (category, volume_score DESC);
CREATE INDEX idx_trending_challenges_lookup ON public.trending_challenges (country, expires_at DESC);
CREATE INDEX idx_trending_topics_lookup ON public.trending_topics (country, expires_at DESC);
CREATE INDEX idx_trending_topics_source ON public.trending_topics (source, country);
CREATE INDEX idx_user_avatars_user ON public.user_avatars (user_id);
CREATE INDEX idx_user_image_refs_user ON public.user_image_references (user_id);
CREATE INDEX idx_user_music_library_mood ON public.user_music_library (user_id, mood);
CREATE INDEX idx_user_music_library_user ON public.user_music_library (user_id);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles (user_id);
CREATE INDEX idx_user_topic_history_created ON public.user_topic_history (created_at);
CREATE INDEX idx_user_topic_history_user ON public.user_topic_history (user_id, created_at DESC);
CREATE INDEX idx_video_jobs_model ON public.video_generation_jobs (model_selected);
CREATE INDEX idx_video_jobs_next_retry ON public.video_generation_jobs (next_retry_at) WHERE ((status = 3) AND (retry_count < 3));
CREATE INDEX idx_video_jobs_session ON public.video_generation_jobs (session_id);
CREATE INDEX idx_video_jobs_status ON public.video_generation_jobs (status);
CREATE INDEX idx_video_jobs_user ON public.video_generation_jobs (user_id);
CREATE INDEX idx_video_jobs_veo_uuid ON public.video_generation_jobs (veo_uuid);
CREATE INDEX idx_video_jobs_voice_prompt ON public.video_generation_jobs (voice_prompt_id);
CREATE UNIQUE INDEX idx_voice_prompts_avatar ON public.voice_prompts (avatar_id) WHERE (avatar_id IS NOT NULL);
CREATE UNIQUE INDEX idx_voice_prompts_profile ON public.voice_prompts (user_id) WHERE ((is_profile_avatar = true) AND (avatar_id IS NULL));
CREATE INDEX idx_voice_prompts_session ON public.voice_prompts (session_id);
CREATE INDEX idx_voice_prompts_user ON public.voice_prompts (user_id);
CREATE INDEX idx_voice_prompts_user_profile ON public.voice_prompts (user_id, is_profile_avatar);
CREATE INDEX idx_webhook_events_job_id ON public.webhook_events (job_id);
CREATE INDEX idx_webhook_events_received ON public.webhook_events (received_at DESC);

-- ============================================================
-- SECTION 6: TRIGGERS
-- ============================================================

CREATE TRIGGER trg_ai_model_pricing_updated_at BEFORE UPDATE ON public.ai_model_pricing FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_analytics_summary_updated_at BEFORE UPDATE ON public.analytics_summary FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_api_keys_pool_updated_at BEFORE UPDATE ON public.api_keys_pool FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_generation_sessions_updated_at BEFORE UPDATE ON public.generation_sessions FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_image_jobs_updated_at BEFORE UPDATE ON public.image_generation_jobs FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_knowledge_embeddings_updated_at BEFORE UPDATE ON public.knowledge_embeddings FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_linked_accounts_updated_at BEFORE UPDATE ON public.linked_accounts FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_music_jobs_updated_at BEFORE UPDATE ON public.music_generation_jobs FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_niche_recs_cache_updated_at BEFORE UPDATE ON public.niche_recommendations_cache FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_planned_content_updated_at BEFORE UPDATE ON public.planned_content FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_social_analytics_updated_at BEFORE UPDATE ON public.social_media_analytics FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_sparks_balance_updated_at BEFORE UPDATE ON public.sparks_balance FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_stripe_prices_updated_at BEFORE UPDATE ON public.stripe_prices FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_topic_outfit_cache_set_updated_at BEFORE UPDATE ON public.topic_outfit_cache FOR EACH ROW EXECUTE FUNCTION trg_fn_topic_outfit_cache_set_updated_at();
CREATE TRIGGER trg_user_avatars_updated_at BEFORE UPDATE ON public.user_avatars FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_user_image_refs_updated_at BEFORE UPDATE ON public.user_image_references FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_user_music_library_updated_at BEFORE UPDATE ON public.user_music_library FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_video_jobs_updated_at BEFORE UPDATE ON public.video_generation_jobs FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_voice_prompts_set_updated_at BEFORE UPDATE ON public.voice_prompts FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- ============================================================
-- SECTION 7: ROW LEVEL SECURITY (Enable + Policies)
-- ============================================================

-- Enable RLS on all relevant tables
ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_outfit_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_image_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- NOT enabled: api_keys_pool, knowledge_embeddings, niche_recommendations_cache, phone_otp, phone_otp_attempts, videos

-- RLS Policies
CREATE POLICY "Anyone can read ai pricing" ON public.ai_model_pricing FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages pricing" ON public.ai_model_pricing FOR ALL TO service_role USING (true);

CREATE POLICY "Users view own summary" ON public.analytics_summary FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role all sessions" ON public.generation_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own sessions" ON public.generation_sessions FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role all image jobs" ON public.image_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own image jobs" ON public.image_generation_jobs FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users manage own linked accounts" ON public.linked_accounts FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read lookup" ON public.lookup_master FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages lookup" ON public.lookup_master FOR ALL TO service_role USING (true);

CREATE POLICY "Service role all music jobs" ON public.music_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own music jobs" ON public.music_generation_jobs FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users view own payment history" ON public.payment_history FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role all payments" ON public.payments FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own payments" ON public.payments FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users manage own planned content" ON public.planned_content FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users manage own analytics" ON public.social_media_analytics FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role all sparks" ON public.sparks_balance FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own sparks" ON public.sparks_balance FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role all transactions" ON public.sparks_transactions FOR ALL TO service_role USING (true);
CREATE POLICY "Users view own transactions" ON public.sparks_transactions FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read stripe prices" ON public.stripe_prices FOR SELECT TO public USING (true);

CREATE POLICY "Service role all subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own subscription" ON public.subscriptions FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "topic_outfit_cache_insert" ON public.topic_outfit_cache FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "topic_outfit_cache_select" ON public.topic_outfit_cache FOR SELECT TO public USING (true);

CREATE POLICY "Users manage own topups" ON public.topup_orders FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "delete_service_trending_challenges" ON public.trending_challenges FOR DELETE TO public USING (true);
CREATE POLICY "insert_service_trending_challenges" ON public.trending_challenges FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "select_all_trending_challenges" ON public.trending_challenges FOR SELECT TO public USING (true);
CREATE POLICY "update_service_trending_challenges" ON public.trending_challenges FOR UPDATE TO public USING (true);

CREATE POLICY "select_all_trending_topics" ON public.trending_topics FOR SELECT TO public USING (true);
CREATE POLICY "select_authenticated_trending_topics" ON public.trending_topics FOR SELECT TO authenticated USING (expires_at > now());

CREATE POLICY "Users manage own avatars" ON public.user_avatars FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users manage own image refs" ON public.user_image_references FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Users manage own music library" ON public.user_music_library FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "Service role all user_profiles" ON public.user_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "insert_own_user_profiles" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "select_own_user_profiles" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_own_user_profiles" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insert_own_topic_history" ON public.user_topic_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "select_own_topic_history" ON public.user_topic_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role all video jobs" ON public.video_generation_jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Users manage own video jobs" ON public.video_generation_jobs FOR ALL TO public USING (auth.uid() = user_id);

CREATE POLICY "delete_own_voice_prompts" ON public.voice_prompts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_voice_prompts" ON public.voice_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "select_own_voice_prompts" ON public.voice_prompts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service_role_voice_prompts" ON public.voice_prompts FOR ALL TO service_role USING (true);
CREATE POLICY "update_own_voice_prompts" ON public.voice_prompts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access webhook_events" ON public.webhook_events FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access_webhook_events" ON public.webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_view_own_webhook_events" ON public.webhook_events FOR SELECT TO authenticated USING (job_id IN (SELECT id FROM video_generation_jobs WHERE user_id = auth.uid()));

-- ============================================================
-- SECTION 8: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
('generated-images', 'generated-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
('generated-videos', 'generated-videos', true, 104857600, ARRAY['video/mp4','video/webm']),
('final-videos', 'final-videos', true, 524288000, ARRAY['video/mp4','video/webm']),
('generated-voice', 'generated-voice', false, 52428800, ARRAY['audio/mp3','audio/wav','audio/mpeg']),
('generated-music', 'generated-music', false, 52428800, ARRAY['audio/mp3','audio/wav','audio/mpeg']),
('image-references', 'image-references', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
('voice-references', 'voice-references', true, 52428800, ARRAY['audio/webm','audio/mp3','audio/wav','audio/ogg','audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies (wrapped in DO block to skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Allow authenticated uploads') THEN
    CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Allow public read') THEN
    CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Allow users to delete own files') THEN
    CREATE POLICY "Allow users to delete own files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Allow users to update own files') THEN
    CREATE POLICY "Allow users to update own files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Anyone can view avatars') THEN
    CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Service role manages all storage') THEN
    CREATE POLICY "Service role manages all storage" ON storage.objects FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users can manage own image references') THEN
    CREATE POLICY "Users can manage own image references" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'image-references' AND (auth.uid())::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users can manage own voice references') THEN
    CREATE POLICY "Users can manage own voice references" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'voice-references' AND (auth.uid())::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users can upload own avatars') THEN
    CREATE POLICY "Users can upload own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND policyname='Users can view generated content') THEN
    CREATE POLICY "Users can view generated content" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ANY (ARRAY['generated-images','generated-videos','generated-voice','generated-music','final-videos']));
  END IF;
END $$;

-- ============================================================
-- SECTION 9: CRON JOBS (requires pg_cron extension enabled)
-- ============================================================

SELECT cron.schedule('refresh-trending-data', '0 6 * * *', 'SELECT public.refresh_trending_data()');
SELECT cron.schedule('cleanup-expired-trending', '0 5 * * *', $$DELETE FROM trending_topics WHERE expires_at < NOW()$$);
SELECT cron.schedule('daily-reset-exhausted-keys', '5 17 * * *', 'SELECT public.reset_exhausted_api_keys()');

-- ============================================================
-- SECTION 10: SEED DATA
-- ============================================================

-- API Keys Pool
INSERT INTO api_keys_pool (id, provider, key_name, api_key, usage_count, usage_limit, limit_type, is_active, is_exhausted, priority, reset_period, notes) VALUES
('285371cd-cbb5-4191-9d4c-7af10cc736c3', 'gemini', 'aimonk.com@gmail.com', 'AIzaSyAb2tQdplE0-PbMBaWMthk1MQdaCH3mAvs', 0, 1500, 'requests', true, false, 4, 'daily', null),
('ebc0c717-2497-43c7-8e32-8fb820ddd1e1', 'gemini', 'outskill2025@gmail.com', 'AIzaSyD1kAelRyWQzetor-rG5oC-Zk8Pd6BAuOg', 0, 1500, 'requests', true, false, 3, 'daily', null),
('c678ad59-8bb0-479c-a82f-a3932b74f6d1', 'gemini', 'sparkfluence.com@gmail.com', 'AIzaSyCxQ6JbO_GGEjMR_KNSvrA0NbjsXL1t6ag', 0, 1500, 'requests', true, false, 2, 'daily', null),
('c1ad4e9a-dadb-44f2-9292-d3a9ac4c5a7e', 'gemini', 'ali.sadikincom85@gmail.com', 'AIzaSyCl226QNxQFeRKuZi3RF4X9aat9c-ORjsw', 0, 1500, 'requests', true, false, 1, 'daily', null),
('65d6d815-7c4c-4d1d-9cde-3053a1354145', 'openrouter', 'alisadikinmaai', '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', 0, 500000, 'tokens', true, false, 1, 'daily', 'paid|initial:4.76|threshold:0.95'),
('6489fedf-3b09-4779-9168-36ae8652fefe', 'tavily', 'aimonk.com', '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', 0, 1000, 'requests', true, false, 4, 'daily', null),
('360b77db-9540-4da7-a878-b8a0aa0d3c0a', 'tavily', 'sparkfluence.com', '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', 0, 1000, 'requests', true, false, 3, 'daily', null),
('5b4c5361-66dc-47aa-b37f-a4e81f038b89', 'tavily', 'alisadikinmaai', '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', 0, 1000, 'requests', true, false, 2, 'daily', null),
('5ad893d7-872f-488d-a8e0-b0ffcbe27a3f', 'tavily', 'ali.sadikincom85', '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', 0, 1000, 'requests', true, false, 1, 'daily', null);

-- Lookup Master
INSERT INTO lookup_master (id, category, name, created_at) VALUES
('7de4334e-9082-44be-a5af-c3ce221d9066', 'interest', 'Culinary', '2026-01-12 17:22:32.833649+00'),
('71219386-803e-4785-8966-66714d4002b2', 'interest', 'Design', '2026-01-12 17:22:32.833649+00'),
('153b8d1a-a94d-464f-af6a-dd03d4dffeb0', 'interest', 'Education', '2026-01-12 17:22:32.833649+00'),
('4bd2127a-3429-49f9-b263-e362b5aeb514', 'interest', 'Entertainment', '2026-01-12 17:22:32.833649+00'),
('cf2d947c-5eb7-4475-862d-e52402511a3a', 'interest', 'Fashion', '2026-01-12 17:22:32.833649+00'),
('34f96639-09c8-4a03-a7eb-8d031d693469', 'interest', 'Finance', '2026-01-12 17:22:32.833649+00'),
('15d73e12-fc72-4d63-bc78-354c14530093', 'interest', 'Game', '2026-01-12 17:22:32.833649+00'),
('3204a372-1c46-47b7-8ba3-54730d153d89', 'interest', 'Health', '2026-01-12 17:22:32.833649+00'),
('cf52cb76-5936-48c2-a198-9303cbf8a490', 'interest', 'Motivation', '2026-01-12 17:22:32.833649+00'),
('56d18283-0908-4e73-86d9-fb8ebd6db47a', 'interest', 'Music', '2026-01-12 17:22:32.833649+00'),
('4e1d2a4d-9d87-4551-a143-3c180175ce41', 'interest', 'Others', '2026-01-12 17:22:32.833649+00'),
('985b84b0-644c-49a4-9cfa-2604794ea5b8', 'interest', 'Technology', '2026-01-12 17:22:32.833649+00'),
('13f15e44-d961-4af3-a675-4fbfbb6e6689', 'interest', 'Travel', '2026-01-12 17:22:32.833649+00'),
('b16e2be4-d49e-4735-a9e0-e6c35b978993', 'objective', 'Consistency', '2026-01-12 17:22:32.833649+00'),
('9b9c84c8-56a0-4075-96d5-9214f8d1976c', 'objective', 'Growth', '2026-01-12 17:22:32.833649+00'),
('59deeeab-b680-4ba0-8c81-b0963e9a0eb5', 'objective', 'Monetize', '2026-01-12 17:22:32.833649+00'),
('8b24d82a-0c05-4b65-8c10-f795b663446a', 'platform', 'Instagram', '2026-01-12 17:22:32.833649+00'),
('2410ef04-d893-4d76-8ef9-44e45f0cec8d', 'platform', 'TikTok', '2026-01-12 17:22:32.833649+00'),
('2a78b346-a0d9-4a1b-a73e-b67a63d9df9a', 'platform', 'Youtube', '2026-01-12 17:22:32.833649+00'),
('aed3bf3e-e389-488f-bb37-b17a9a2fe10b', 'profession', 'Content Creator', '2026-01-12 17:22:32.833649+00'),
('76494f01-dfe5-47ff-b75d-c1839d023550', 'profession', 'Entrepreneur', '2026-01-12 17:22:32.833649+00'),
('a203dd17-1b9c-4b77-bddd-bd53443dd492', 'profession', 'Influencer', '2026-01-12 17:22:32.833649+00'),
('da5818d6-0a11-4d3b-bbc4-044c32fd05aa', 'profession', 'Marketer', '2026-01-12 17:22:32.833649+00'),
('eaeefe55-0305-4313-80af-0fa357540a66', 'profession', 'Other', '2026-01-12 17:22:32.833649+00'),
('71eb120b-735b-4b1c-8efa-e83bef7df53e', 'profession', 'Student', '2026-01-12 17:22:32.833649+00');

-- AI Model Pricing
INSERT INTO ai_model_pricing (id, category, provider, model_id, model_name, pricing_type, base_price, unit_price, unit_name, supports_image_ref, supports_voice_clone, max_duration_seconds, available_durations, is_active, is_default, display_order, notes, api_endpoint) VALUES
('27e93df6-a6f0-41b5-bbc3-f182885b85af', 'image', 'fal-ai', 'flux-pro/kontext', 'Flux Kontext Pro', 'per_image', 0.040000, null, null, true, false, null, null, true, true, 1, null, 'https://fal.ai/models/fal-ai/flux-pro/kontext'),
('4d280f73-b3cc-4a3d-82c4-5c8f186e1baa', 'image', 'fal-ai', 'nano-banana/edit', 'Nano Banana Edit', 'per_image', 0.039000, null, null, true, false, null, null, true, false, 2, null, 'https://fal.ai/models/fal-ai/nano-banana/edit'),
('b55126b9-d2b4-40f6-93e6-d21b0d1c6a93', 'image', 'fal-ai', 'bytedance/seedream/v4/text-to-image', 'Seedream v4', 'per_image', 0.030000, null, null, false, false, null, null, true, false, 3, null, 'https://fal.ai/models/fal-ai/bytedance/seedream/v4/text-to-image'),
('2f7c9583-7206-4e60-8bbd-77af188fb6fc', 'image', 'fal-ai', 'qwen-image', 'Qwen Image', 'per_megapixel', 0.020000, null, 'megapixel', false, false, null, null, true, false, 4, null, 'https://fal.ai/models/fal-ai/qwen-image'),
('4c64cb53-0d27-4e32-b9e7-73ff5bd0f310', 'music', 'fal-ai', 'minimax-music/v2', 'Minimax Music v2', 'per_generation', 0.030000, null, null, false, false, null, null, true, true, 1, null, 'https://fal.ai/models/fal-ai/minimax-music/v2'),
('1018b2ac-1df8-4426-99d7-d14a6d85f4d9', 'video', 'fal-ai', 'wan-25-preview/image-to-video', 'Wan 2.5 Preview', 'per_second', 0.100000, 0.050000, 'second', true, false, 10, ARRAY[5,10], true, true, 1, null, 'https://fal.ai/models/fal-ai/wan-25-preview/image-to-video'),
('3497c357-f442-46bd-8dfa-48c902df8d72', 'video', 'fal-ai', 'kling-video/v2.5-turbo/standard/image-to-video', 'Kling 2.5 Turbo', 'base_plus_unit', 0.210000, 0.042000, 'second', true, false, 10, ARRAY[5,10], true, false, 2, null, 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/standard/image-to-video'),
('4dd78a0c-062a-4a77-9923-1661933e36e8', 'voice', 'fal-ai', 'chatterbox/text-to-speech/turbo', 'Chatterbox TTS', 'per_character', 0.000020, null, 'character', true, false, null, null, true, true, 1, null, 'https://fal.ai/models/fal-ai/chatterbox/text-to-speech/turbo');

-- ============================================================
-- DONE! After running this:
-- 1. Enable pg_cron + pg_net from Dashboard → Database → Extensions
-- 2. Update refresh_trending_data() with new project URL + anon key
-- 3. Set Edge Function secrets (FAL_AI_API_KEY, GROQ_API_KEY, etc.)
-- 4. Deploy Edge Functions via supabase functions deploy
-- 5. Update .env files with new VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
-- ============================================================
