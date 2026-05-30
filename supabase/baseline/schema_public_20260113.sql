--
-- PostgreSQL database dump
--

\restrict CaLBoJ1XaS1nUWfORkZvNKLNg2BtURs7EqyBycyygf1ulYBDbz4f2mb0sIm73Bp

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: calculate_session_cost(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_session_cost(p_session_id text) RETURNS jsonb
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


ALTER FUNCTION public.calculate_session_cost(p_session_id text) OWNER TO postgres;

--
-- Name: match_knowledge(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_knowledge(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10) RETURNS TABLE(id uuid, chunk_text text, section_title text, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
  SELECT id, chunk_text, section_title, 1 - (embedding <=> query_embedding) as similarity
  FROM knowledge_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION public.match_knowledge(query_embedding public.vector, match_threshold double precision, match_count integer) OWNER TO postgres;

--
-- Name: trg_fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_fn_set_updated_at() OWNER TO postgres;

--
-- Name: trg_fn_stock_searches_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_stock_searches_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_fn_stock_searches_set_updated_at() OWNER TO postgres;

--
-- Name: uuid_generate_v4(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$;


ALTER FUNCTION public.uuid_generate_v4() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_model_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_model_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    provider text DEFAULT 'fal-ai'::text NOT NULL,
    model_id text NOT NULL,
    model_name text NOT NULL,
    pricing_type text NOT NULL,
    base_price numeric(10,6) DEFAULT 0 NOT NULL,
    unit_price numeric(10,6) DEFAULT 0,
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_model_pricing_category_check CHECK ((category = ANY (ARRAY['image'::text, 'video'::text, 'voice'::text, 'music'::text]))),
    CONSTRAINT ai_model_pricing_pricing_type_check CHECK ((pricing_type = ANY (ARRAY['per_image'::text, 'per_second'::text, 'per_character'::text, 'per_generation'::text, 'per_megapixel'::text, 'base_plus_unit'::text])))
);


ALTER TABLE public.ai_model_pricing OWNER TO postgres;

--
-- Name: analytics_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.analytics_summary OWNER TO postgres;

--
-- Name: api_keys_pool; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    key_name text NOT NULL,
    api_key text NOT NULL,
    usage_count integer DEFAULT 0,
    usage_limit integer NOT NULL,
    limit_type text DEFAULT 'requests'::text,
    is_active boolean DEFAULT true,
    is_exhausted boolean DEFAULT false,
    priority integer DEFAULT 1,
    reset_period text DEFAULT 'monthly'::text,
    last_reset_at timestamp with time zone DEFAULT now(),
    next_reset_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.api_keys_pool OWNER TO postgres;

--
-- Name: generation_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generation_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    topic text NOT NULL,
    language text DEFAULT 'id'::text,
    duration text DEFAULT '60s'::text,
    aspect_ratio text DEFAULT '9:16'::text,
    image_model text,
    video_model text,
    voice_model text DEFAULT 'chatterbox/text-to-speech/turbo'::text,
    music_model text DEFAULT 'minimax-music/v2'::text,
    include_subtitles boolean DEFAULT true,
    include_music boolean DEFAULT true,
    music_volume integer DEFAULT 25,
    selected_music_id uuid,
    script_data jsonb,
    segments_count integer DEFAULT 0,
    status text DEFAULT 'draft'::text,
    current_step text DEFAULT 'script'::text,
    estimated_cost numeric(10,4) DEFAULT 0,
    actual_cost numeric(10,4) DEFAULT 0,
    sparks_used integer DEFAULT 0,
    final_video_url text,
    final_video_duration integer,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    order_id text,
    CONSTRAINT generation_sessions_aspect_ratio_check CHECK ((aspect_ratio = ANY (ARRAY['9:16'::text, '16:9'::text, '1:1'::text]))),
    CONSTRAINT generation_sessions_duration_check CHECK ((duration = ANY (ARRAY['30s'::text, '60s'::text, '90s'::text]))),
    CONSTRAINT generation_sessions_language_check CHECK ((language = ANY (ARRAY['id'::text, 'en'::text, 'hi'::text]))),
    CONSTRAINT generation_sessions_music_volume_check CHECK (((music_volume >= 0) AND (music_volume <= 100))),
    CONSTRAINT generation_sessions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'script_ready'::text, 'images_pending'::text, 'images_complete'::text, 'videos_pending'::text, 'videos_complete'::text, 'combining'::text, 'completed'::text, 'failed'::text])))
);


ALTER TABLE public.generation_sessions OWNER TO postgres;

--
-- Name: image_generation_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    segment_id text NOT NULL,
    segment_number integer DEFAULT 1 NOT NULL,
    segment_type text,
    generation_number integer DEFAULT 1,
    is_selected boolean DEFAULT false,
    source_type text DEFAULT 'generated'::text,
    stock_source text,
    stock_id text,
    stock_photographer text,
    model_selected text,
    shot_type text DEFAULT 'B-ROLL'::text,
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
    style text DEFAULT 'cinematic'::text,
    aspect_ratio text DEFAULT '9:16'::text,
    estimated_cost numeric(10,6) DEFAULT 0,
    actual_cost numeric(10,6) DEFAULT 0,
    provider text DEFAULT 'fal-ai'::text,
    fallback_provider text,
    status integer DEFAULT 0 NOT NULL,
    error_message text,
    fal_request_id text,
    generation_time_ms integer,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    regeneration_notes text,
    reference_image_url text,
    CONSTRAINT image_generation_jobs_source_type_check CHECK ((source_type = ANY (ARRAY['generated'::text, 'stock'::text, 'uploaded'::text])))
);


ALTER TABLE public.image_generation_jobs OWNER TO postgres;

--
-- Name: knowledge_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_type text NOT NULL,
    file_name text NOT NULL,
    section_title text NOT NULL,
    chunk_text text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.knowledge_embeddings OWNER TO postgres;

--
-- Name: linked_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.linked_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    platform text NOT NULL,
    platform_user_id text NOT NULL,
    platform_username text,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp with time zone,
    scopes text[],
    connected_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.linked_accounts OWNER TO postgres;

--
-- Name: lookup_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lookup_master (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lookup_master OWNER TO postgres;

--
-- Name: music_generation_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.music_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    prompt text NOT NULL,
    mood text,
    genre text,
    duration_seconds integer,
    audio_url text,
    actual_duration_ms integer,
    saved_to_library boolean DEFAULT false,
    library_id uuid,
    estimated_cost numeric(10,6) DEFAULT 0.03,
    actual_cost numeric(10,6) DEFAULT 0,
    status integer DEFAULT 0,
    error_message text,
    fal_request_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.music_generation_jobs OWNER TO postgres;

--
-- Name: music_library; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.music_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    artist text NOT NULL,
    genre text NOT NULL,
    mood text,
    duration integer NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.music_library OWNER TO postgres;

--
-- Name: niche_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.niche_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interest text NOT NULL,
    profession text NOT NULL,
    niches jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.niche_cache OWNER TO postgres;

--
-- Name: niche_recommendations_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.niche_recommendations_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    input_hash text NOT NULL,
    interest text NOT NULL,
    profession text NOT NULL,
    niches jsonb NOT NULL,
    hit_count integer DEFAULT 0,
    last_hit_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.niche_recommendations_cache OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'system'::text NOT NULL,
    title text NOT NULL,
    message text,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_payment_intent_id text,
    stripe_invoice_id text,
    stripe_charge_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'idr'::text NOT NULL,
    payment_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reference_type text,
    reference_id uuid,
    receipt_url text,
    invoice_pdf text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payment_history OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_payment_intent_id text,
    stripe_invoice_id text,
    stripe_checkout_session_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'idr'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_type text NOT NULL,
    plan_id text,
    topup_package_id text,
    sparks_amount integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: phone_otp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phone_otp (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.phone_otp OWNER TO postgres;

--
-- Name: phone_otp_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phone_otp_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    attempt_type text NOT NULL,
    success boolean DEFAULT false,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.phone_otp_attempts OWNER TO postgres;

--
-- Name: planned_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planned_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    final_video_id uuid,
    final_video_url text,
    title text NOT NULL,
    description text DEFAULT ''::text,
    platform_id uuid,
    platforms text[] DEFAULT '{}'::text[],
    content_type text DEFAULT 'video'::text,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone NOT NULL,
    status text DEFAULT 'planned'::text,
    thumbnail_url text,
    video_data jsonb DEFAULT '{}'::jsonb,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.planned_content OWNER TO postgres;

--
-- Name: social_media_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.social_media_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    planned_content_id uuid,
    platform text NOT NULL,
    platform_post_id text,
    post_url text,
    published_at timestamp with time zone NOT NULL,
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
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.social_media_analytics OWNER TO postgres;

--
-- Name: sparks_balance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sparks_balance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_balance integer DEFAULT 0 NOT NULL,
    monthly_allocation integer DEFAULT 30 NOT NULL,
    bonus_sparks integer DEFAULT 0 NOT NULL,
    used_this_period integer DEFAULT 0 NOT NULL,
    last_reset_at timestamp with time zone DEFAULT now(),
    next_reset_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sparks_balance OWNER TO postgres;

--
-- Name: sparks_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sparks_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    transaction_type text NOT NULL,
    reference_type text,
    reference_id text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sparks_transactions OWNER TO postgres;

--
-- Name: stock_image_searches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_image_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    segment_number integer NOT NULL,
    query text NOT NULL,
    provider text NOT NULL,
    image_url text,
    image_metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_image_searches_provider_check CHECK ((provider = ANY (ARRAY['unsplash'::text, 'pexels'::text])))
);


ALTER TABLE public.stock_image_searches OWNER TO postgres;

--
-- Name: stripe_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stripe_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id text NOT NULL,
    billing_cycle text,
    price_type text NOT NULL,
    stripe_price_id text NOT NULL,
    stripe_product_id text NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'idr'::text NOT NULL,
    sparks_amount integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stripe_prices OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text,
    plan_id text DEFAULT 'free'::text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at timestamp with time zone,
    canceled_at timestamp with time zone,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: topup_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topup_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_payment_intent_id text,
    stripe_checkout_session_id text,
    package_id text NOT NULL,
    sparks_amount integer NOT NULL,
    price_idr integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


ALTER TABLE public.topup_orders OWNER TO postgres;

--
-- Name: user_avatars; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Avatar'::text NOT NULL,
    storage_path text NOT NULL,
    avatar_url text NOT NULL,
    character_description text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_avatars OWNER TO postgres;

--
-- Name: user_image_references; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_image_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Reference'::text NOT NULL,
    description text,
    storage_path text NOT NULL,
    image_url text NOT NULL,
    width integer,
    height integer,
    file_size integer,
    mime_type text,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_image_references OWNER TO postgres;

--
-- Name: user_music_library; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_music_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Untitled'::text NOT NULL,
    description text,
    prompt text,
    mood text,
    genre text,
    audio_url text NOT NULL,
    duration_ms integer,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_favorite boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_music_library OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    phone_number text,
    phone_verified boolean DEFAULT false,
    phone_verified_at timestamp with time zone,
    country text DEFAULT 'ID'::text,
    language text DEFAULT 'id'::text,
    onboarding_completed boolean DEFAULT false,
    interest text,
    profession text,
    interest_id uuid,
    profession_id uuid,
    platforms text[] DEFAULT '{}'::text[],
    objectives text[] DEFAULT '{}'::text[],
    selected_niches text[] DEFAULT '{}'::text[],
    creative_dna text[] DEFAULT '{}'::text[],
    character_description text,
    character_ref_png text,
    voice_reference_url text,
    voice_reference_duration_ms integer,
    voice_recorded_at timestamp with time zone,
    notification_settings jsonb DEFAULT '{"in_app": true, "marketing": false, "app_updates": true, "email_updates": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    voice_reference_duration_seconds integer
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: video_generation_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    aspect_ratio text DEFAULT '9:16'::text,
    resolution text DEFAULT '720p'::text,
    voice_url text,
    voice_duration_ms integer,
    voice_character text,
    script_text text,
    visual_direction text,
    shot_type text,
    emotion text,
    video_url text,
    thumbnail_url text,
    veo_uuid text,
    avatar_selection text DEFAULT 'no_avatar'::text,
    has_profile_image boolean DEFAULT false,
    profile_image_url text,
    creator_gender text DEFAULT 'male'::text,
    character_description text,
    face_anchor_url text,
    voice_anchor jsonb,
    topic text,
    topic_title text,
    language text DEFAULT 'id'::text,
    platform text,
    preferred_platform text,
    environment text DEFAULT 'studio'::text,
    final_video_url text,
    has_subtitles boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    current_step text DEFAULT 'video'::text,
    estimated_cost numeric(10,6) DEFAULT 0,
    actual_cost numeric(10,6) DEFAULT 0,
    status integer DEFAULT 0,
    error_message text,
    fal_request_id text,
    generation_time_ms integer,
    retry_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.video_generation_jobs OWNER TO postgres;

--
-- Name: videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    thumbnail text DEFAULT ''::text NOT NULL,
    platforms jsonb DEFAULT '[]'::jsonb NOT NULL,
    publish_date date DEFAULT CURRENT_DATE,
    publish_time time without time zone DEFAULT '18:00:00'::time without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.videos OWNER TO postgres;

--
-- Name: voice_generation_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voice_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    segment_id text NOT NULL,
    segment_number integer DEFAULT 1 NOT NULL,
    script_text text NOT NULL,
    language text DEFAULT 'id'::text,
    voice_reference_url text,
    voice_style text,
    audio_url text,
    duration_ms integer,
    character_count integer,
    estimated_cost numeric(10,6) DEFAULT 0,
    actual_cost numeric(10,6) DEFAULT 0,
    status integer DEFAULT 0,
    error_message text,
    fal_request_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.voice_generation_jobs OWNER TO postgres;

--
-- Name: ai_model_pricing ai_model_pricing_model_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_model_pricing
    ADD CONSTRAINT ai_model_pricing_model_id_key UNIQUE (model_id);


--
-- Name: ai_model_pricing ai_model_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_model_pricing
    ADD CONSTRAINT ai_model_pricing_pkey PRIMARY KEY (id);


--
-- Name: analytics_summary analytics_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_summary
    ADD CONSTRAINT analytics_summary_pkey PRIMARY KEY (id);


--
-- Name: api_keys_pool api_keys_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys_pool
    ADD CONSTRAINT api_keys_pool_pkey PRIMARY KEY (id);


--
-- Name: generation_sessions generation_sessions_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_sessions
    ADD CONSTRAINT generation_sessions_order_id_key UNIQUE (order_id);


--
-- Name: generation_sessions generation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_sessions
    ADD CONSTRAINT generation_sessions_pkey PRIMARY KEY (id);


--
-- Name: generation_sessions generation_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_sessions
    ADD CONSTRAINT generation_sessions_session_id_key UNIQUE (session_id);


--
-- Name: image_generation_jobs image_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_generation_jobs
    ADD CONSTRAINT image_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: knowledge_embeddings knowledge_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_embeddings
    ADD CONSTRAINT knowledge_embeddings_pkey PRIMARY KEY (id);


--
-- Name: linked_accounts linked_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.linked_accounts
    ADD CONSTRAINT linked_accounts_pkey PRIMARY KEY (id);


--
-- Name: linked_accounts linked_accounts_user_id_platform_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.linked_accounts
    ADD CONSTRAINT linked_accounts_user_id_platform_key UNIQUE (user_id, platform);


--
-- Name: lookup_master lookup_master_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lookup_master
    ADD CONSTRAINT lookup_master_category_name_key UNIQUE (category, name);


--
-- Name: lookup_master lookup_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lookup_master
    ADD CONSTRAINT lookup_master_pkey PRIMARY KEY (id);


--
-- Name: music_generation_jobs music_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_generation_jobs
    ADD CONSTRAINT music_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: music_generation_jobs music_generation_jobs_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_generation_jobs
    ADD CONSTRAINT music_generation_jobs_session_id_key UNIQUE (session_id);


--
-- Name: music_library music_library_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_library
    ADD CONSTRAINT music_library_pkey PRIMARY KEY (id);


--
-- Name: niche_cache niche_cache_interest_profession_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niche_cache
    ADD CONSTRAINT niche_cache_interest_profession_key UNIQUE (interest, profession);


--
-- Name: niche_cache niche_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niche_cache
    ADD CONSTRAINT niche_cache_pkey PRIMARY KEY (id);


--
-- Name: niche_recommendations_cache niche_recommendations_cache_input_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niche_recommendations_cache
    ADD CONSTRAINT niche_recommendations_cache_input_hash_key UNIQUE (input_hash);


--
-- Name: niche_recommendations_cache niche_recommendations_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niche_recommendations_cache
    ADD CONSTRAINT niche_recommendations_cache_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: phone_otp_attempts phone_otp_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_otp_attempts
    ADD CONSTRAINT phone_otp_attempts_pkey PRIMARY KEY (id);


--
-- Name: phone_otp phone_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_otp
    ADD CONSTRAINT phone_otp_pkey PRIMARY KEY (id);


--
-- Name: planned_content planned_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_content
    ADD CONSTRAINT planned_content_pkey PRIMARY KEY (id);


--
-- Name: social_media_analytics social_media_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_media_analytics
    ADD CONSTRAINT social_media_analytics_pkey PRIMARY KEY (id);


--
-- Name: sparks_balance sparks_balance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sparks_balance
    ADD CONSTRAINT sparks_balance_pkey PRIMARY KEY (id);


--
-- Name: sparks_balance sparks_balance_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sparks_balance
    ADD CONSTRAINT sparks_balance_user_id_key UNIQUE (user_id);


--
-- Name: sparks_transactions sparks_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sparks_transactions
    ADD CONSTRAINT sparks_transactions_pkey PRIMARY KEY (id);


--
-- Name: stock_image_searches stock_image_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_image_searches
    ADD CONSTRAINT stock_image_searches_pkey PRIMARY KEY (id);


--
-- Name: stripe_prices stripe_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stripe_prices
    ADD CONSTRAINT stripe_prices_pkey PRIMARY KEY (id);


--
-- Name: stripe_prices stripe_prices_stripe_price_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stripe_prices
    ADD CONSTRAINT stripe_prices_stripe_price_id_key UNIQUE (stripe_price_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: topup_orders topup_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topup_orders
    ADD CONSTRAINT topup_orders_pkey PRIMARY KEY (id);


--
-- Name: user_avatars user_avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_avatars
    ADD CONSTRAINT user_avatars_pkey PRIMARY KEY (id);


--
-- Name: user_image_references user_image_references_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_image_references
    ADD CONSTRAINT user_image_references_pkey PRIMARY KEY (id);


--
-- Name: user_music_library user_music_library_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_music_library
    ADD CONSTRAINT user_music_library_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: video_generation_jobs video_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_generation_jobs
    ADD CONSTRAINT video_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: voice_generation_jobs voice_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voice_generation_jobs
    ADD CONSTRAINT voice_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: voice_generation_jobs voice_jobs_session_segment_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voice_generation_jobs
    ADD CONSTRAINT voice_jobs_session_segment_unique UNIQUE (session_id, segment_id);


--
-- Name: idx_ai_model_pricing_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_model_pricing_active ON public.ai_model_pricing USING btree (is_active, category);


--
-- Name: idx_ai_model_pricing_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_model_pricing_category ON public.ai_model_pricing USING btree (category);


--
-- Name: idx_analytics_summary_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_summary_period ON public.analytics_summary USING btree (period_type, period_start);


--
-- Name: idx_analytics_summary_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_summary_user ON public.analytics_summary USING btree (user_id);


--
-- Name: idx_api_keys_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_provider ON public.api_keys_pool USING btree (provider, is_active);


--
-- Name: idx_gen_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gen_sessions_session_id ON public.generation_sessions USING btree (session_id);


--
-- Name: idx_gen_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gen_sessions_status ON public.generation_sessions USING btree (status);


--
-- Name: idx_gen_sessions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gen_sessions_user ON public.generation_sessions USING btree (user_id);


--
-- Name: idx_generation_sessions_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generation_sessions_order_id ON public.generation_sessions USING btree (order_id);


--
-- Name: idx_image_jobs_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_jobs_model ON public.image_generation_jobs USING btree (model_selected);


--
-- Name: idx_image_jobs_segment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_jobs_segment ON public.image_generation_jobs USING btree (session_id, segment_id);


--
-- Name: idx_image_jobs_selected_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_image_jobs_selected_unique ON public.image_generation_jobs USING btree (session_id, segment_id) WHERE (is_selected = true);


--
-- Name: idx_image_jobs_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_jobs_session ON public.image_generation_jobs USING btree (session_id);


--
-- Name: idx_image_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_jobs_status ON public.image_generation_jobs USING btree (status);


--
-- Name: idx_image_jobs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_jobs_user ON public.image_generation_jobs USING btree (user_id);


--
-- Name: idx_knowledge_embedding_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_embedding_vector ON public.knowledge_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_knowledge_embeddings_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_embeddings_project ON public.knowledge_embeddings USING btree (project_type);


--
-- Name: idx_linked_accounts_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_linked_accounts_user ON public.linked_accounts USING btree (user_id);


--
-- Name: idx_music_jobs_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_jobs_session ON public.music_generation_jobs USING btree (session_id);


--
-- Name: idx_music_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_jobs_status ON public.music_generation_jobs USING btree (status);


--
-- Name: idx_music_jobs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_jobs_user ON public.music_generation_jobs USING btree (user_id);


--
-- Name: idx_music_library_genre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_library_genre ON public.music_library USING btree (genre);


--
-- Name: idx_music_library_mood; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_music_library_mood ON public.music_library USING btree (mood);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_payment_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_user ON public.payment_history USING btree (user_id);


--
-- Name: idx_payments_stripe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_stripe ON public.payments USING btree (stripe_payment_intent_id);


--
-- Name: idx_payments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_user ON public.payments USING btree (user_id);


--
-- Name: idx_phone_otp_attempts_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_otp_attempts_phone ON public.phone_otp_attempts USING btree (phone_number);


--
-- Name: idx_phone_otp_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_otp_phone ON public.phone_otp USING btree (phone_number);


--
-- Name: idx_planned_content_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planned_content_date ON public.planned_content USING btree (scheduled_date);


--
-- Name: idx_planned_content_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planned_content_user ON public.planned_content USING btree (user_id);


--
-- Name: idx_social_analytics_platform; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_social_analytics_platform ON public.social_media_analytics USING btree (platform);


--
-- Name: idx_social_analytics_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_social_analytics_user ON public.social_media_analytics USING btree (user_id);


--
-- Name: idx_sparks_balance_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sparks_balance_user ON public.sparks_balance USING btree (user_id);


--
-- Name: idx_sparks_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sparks_transactions_type ON public.sparks_transactions USING btree (transaction_type);


--
-- Name: idx_sparks_transactions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sparks_transactions_user ON public.sparks_transactions USING btree (user_id);


--
-- Name: idx_stock_searches_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_searches_session ON public.stock_image_searches USING btree (session_id, segment_number);


--
-- Name: idx_stock_searches_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_searches_user_id ON public.stock_image_searches USING btree (user_id);


--
-- Name: idx_subscriptions_stripe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_stripe ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_subscriptions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_user ON public.subscriptions USING btree (user_id);


--
-- Name: idx_topup_orders_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_topup_orders_user ON public.topup_orders USING btree (user_id);


--
-- Name: idx_user_avatars_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_avatars_user ON public.user_avatars USING btree (user_id);


--
-- Name: idx_user_image_refs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_image_refs_user ON public.user_image_references USING btree (user_id);


--
-- Name: idx_user_music_library_mood; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_music_library_mood ON public.user_music_library USING btree (user_id, mood);


--
-- Name: idx_user_music_library_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_music_library_user ON public.user_music_library USING btree (user_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_video_jobs_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_jobs_model ON public.video_generation_jobs USING btree (model_selected);


--
-- Name: idx_video_jobs_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_jobs_session ON public.video_generation_jobs USING btree (session_id);


--
-- Name: idx_video_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_jobs_status ON public.video_generation_jobs USING btree (status);


--
-- Name: idx_video_jobs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_jobs_user ON public.video_generation_jobs USING btree (user_id);


--
-- Name: idx_voice_jobs_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voice_jobs_session ON public.voice_generation_jobs USING btree (session_id);


--
-- Name: idx_voice_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voice_jobs_status ON public.voice_generation_jobs USING btree (status);


--
-- Name: idx_voice_jobs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voice_jobs_user ON public.voice_generation_jobs USING btree (user_id);


--
-- Name: ai_model_pricing trg_ai_model_pricing_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ai_model_pricing_updated_at BEFORE UPDATE ON public.ai_model_pricing FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: analytics_summary trg_analytics_summary_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_analytics_summary_updated_at BEFORE UPDATE ON public.analytics_summary FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: api_keys_pool trg_api_keys_pool_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_api_keys_pool_updated_at BEFORE UPDATE ON public.api_keys_pool FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: generation_sessions trg_generation_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_generation_sessions_updated_at BEFORE UPDATE ON public.generation_sessions FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: image_generation_jobs trg_image_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_image_jobs_updated_at BEFORE UPDATE ON public.image_generation_jobs FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: knowledge_embeddings trg_knowledge_embeddings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_knowledge_embeddings_updated_at BEFORE UPDATE ON public.knowledge_embeddings FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: linked_accounts trg_linked_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_linked_accounts_updated_at BEFORE UPDATE ON public.linked_accounts FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: music_generation_jobs trg_music_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_music_jobs_updated_at BEFORE UPDATE ON public.music_generation_jobs FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: niche_cache trg_niche_cache_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_niche_cache_updated_at BEFORE UPDATE ON public.niche_cache FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: niche_recommendations_cache trg_niche_recs_cache_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_niche_recs_cache_updated_at BEFORE UPDATE ON public.niche_recommendations_cache FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: payments trg_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: planned_content trg_planned_content_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_planned_content_updated_at BEFORE UPDATE ON public.planned_content FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: social_media_analytics trg_social_analytics_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_social_analytics_updated_at BEFORE UPDATE ON public.social_media_analytics FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: sparks_balance trg_sparks_balance_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sparks_balance_updated_at BEFORE UPDATE ON public.sparks_balance FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: stock_image_searches trg_stock_searches_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_stock_searches_set_updated_at BEFORE UPDATE ON public.stock_image_searches FOR EACH ROW EXECUTE FUNCTION public.trg_fn_stock_searches_set_updated_at();


--
-- Name: stripe_prices trg_stripe_prices_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_stripe_prices_updated_at BEFORE UPDATE ON public.stripe_prices FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: user_avatars trg_user_avatars_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_avatars_updated_at BEFORE UPDATE ON public.user_avatars FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: user_image_references trg_user_image_refs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_image_refs_updated_at BEFORE UPDATE ON public.user_image_references FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: user_music_library trg_user_music_library_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_music_library_updated_at BEFORE UPDATE ON public.user_music_library FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: user_profiles trg_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: video_generation_jobs trg_video_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_video_jobs_updated_at BEFORE UPDATE ON public.video_generation_jobs FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: videos trg_videos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: voice_generation_jobs trg_voice_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_voice_jobs_updated_at BEFORE UPDATE ON public.voice_generation_jobs FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();


--
-- Name: analytics_summary analytics_summary_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_summary
    ADD CONSTRAINT analytics_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generation_sessions generation_sessions_selected_music_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_sessions
    ADD CONSTRAINT generation_sessions_selected_music_id_fkey FOREIGN KEY (selected_music_id) REFERENCES public.user_music_library(id);


--
-- Name: generation_sessions generation_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_sessions
    ADD CONSTRAINT generation_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: image_generation_jobs image_generation_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_generation_jobs
    ADD CONSTRAINT image_generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: linked_accounts linked_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.linked_accounts
    ADD CONSTRAINT linked_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: music_generation_jobs music_generation_jobs_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_generation_jobs
    ADD CONSTRAINT music_generation_jobs_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.user_music_library(id);


--
-- Name: music_generation_jobs music_generation_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.music_generation_jobs
    ADD CONSTRAINT music_generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_history payment_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: planned_content planned_content_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_content
    ADD CONSTRAINT planned_content_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: social_media_analytics social_media_analytics_planned_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_media_analytics
    ADD CONSTRAINT social_media_analytics_planned_content_id_fkey FOREIGN KEY (planned_content_id) REFERENCES public.planned_content(id);


--
-- Name: social_media_analytics social_media_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_media_analytics
    ADD CONSTRAINT social_media_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sparks_balance sparks_balance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sparks_balance
    ADD CONSTRAINT sparks_balance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sparks_transactions sparks_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sparks_transactions
    ADD CONSTRAINT sparks_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stock_image_searches stock_image_searches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_image_searches
    ADD CONSTRAINT stock_image_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: topup_orders topup_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topup_orders
    ADD CONSTRAINT topup_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_avatars user_avatars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_avatars
    ADD CONSTRAINT user_avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_image_references user_image_references_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_image_references
    ADD CONSTRAINT user_image_references_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_music_library user_music_library_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_music_library
    ADD CONSTRAINT user_music_library_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_interest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_interest_id_fkey FOREIGN KEY (interest_id) REFERENCES public.lookup_master(id);


--
-- Name: user_profiles user_profiles_profession_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_profession_id_fkey FOREIGN KEY (profession_id) REFERENCES public.lookup_master(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: video_generation_jobs video_generation_jobs_source_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_generation_jobs
    ADD CONSTRAINT video_generation_jobs_source_image_id_fkey FOREIGN KEY (source_image_id) REFERENCES public.image_generation_jobs(id) ON DELETE SET NULL;


--
-- Name: video_generation_jobs video_generation_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_generation_jobs
    ADD CONSTRAINT video_generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: voice_generation_jobs voice_generation_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voice_generation_jobs
    ADD CONSTRAINT voice_generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_model_pricing Anyone can read ai pricing; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read ai pricing" ON public.ai_model_pricing FOR SELECT USING (true);


--
-- Name: lookup_master Anyone can read lookup; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read lookup" ON public.lookup_master FOR SELECT USING (true);


--
-- Name: music_library Anyone can read music library; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read music library" ON public.music_library FOR SELECT USING (true);


--
-- Name: stripe_prices Anyone can read stripe prices; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read stripe prices" ON public.stripe_prices FOR SELECT USING (true);


--
-- Name: image_generation_jobs Service role all image jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all image jobs" ON public.image_generation_jobs TO service_role USING (true);


--
-- Name: music_generation_jobs Service role all music jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all music jobs" ON public.music_generation_jobs TO service_role USING (true);


--
-- Name: payments Service role all payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all payments" ON public.payments TO service_role USING (true);


--
-- Name: generation_sessions Service role all sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all sessions" ON public.generation_sessions TO service_role USING (true);


--
-- Name: sparks_balance Service role all sparks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all sparks" ON public.sparks_balance TO service_role USING (true);


--
-- Name: subscriptions Service role all subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all subscriptions" ON public.subscriptions TO service_role USING (true);


--
-- Name: sparks_transactions Service role all transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all transactions" ON public.sparks_transactions TO service_role USING (true);


--
-- Name: user_profiles Service role all user_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all user_profiles" ON public.user_profiles TO service_role USING (true);


--
-- Name: video_generation_jobs Service role all video jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all video jobs" ON public.video_generation_jobs TO service_role USING (true);


--
-- Name: voice_generation_jobs Service role all voice jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role all voice jobs" ON public.voice_generation_jobs TO service_role USING (true);


--
-- Name: stock_image_searches Service role has full access to stock searches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role has full access to stock searches" ON public.stock_image_searches USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: lookup_master Service role manages lookup; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role manages lookup" ON public.lookup_master TO service_role USING (true);


--
-- Name: ai_model_pricing Service role manages pricing; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role manages pricing" ON public.ai_model_pricing TO service_role USING (true);


--
-- Name: stock_image_searches Users can delete their own stock searches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own stock searches" ON public.stock_image_searches FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: stock_image_searches Users can insert their own stock searches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own stock searches" ON public.stock_image_searches FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stock_image_searches Users can update their own stock searches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own stock searches" ON public.stock_image_searches FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: stock_image_searches Users can view their own stock searches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own stock searches" ON public.stock_image_searches FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: social_media_analytics Users manage own analytics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own analytics" ON public.social_media_analytics USING ((auth.uid() = user_id));


--
-- Name: user_avatars Users manage own avatars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own avatars" ON public.user_avatars USING ((auth.uid() = user_id));


--
-- Name: image_generation_jobs Users manage own image jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own image jobs" ON public.image_generation_jobs USING ((auth.uid() = user_id));


--
-- Name: user_image_references Users manage own image refs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own image refs" ON public.user_image_references USING ((auth.uid() = user_id));


--
-- Name: linked_accounts Users manage own linked accounts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own linked accounts" ON public.linked_accounts USING ((auth.uid() = user_id));


--
-- Name: music_generation_jobs Users manage own music jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own music jobs" ON public.music_generation_jobs USING ((auth.uid() = user_id));


--
-- Name: user_music_library Users manage own music library; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own music library" ON public.user_music_library USING ((auth.uid() = user_id));


--
-- Name: notifications Users manage own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own notifications" ON public.notifications USING ((auth.uid() = user_id));


--
-- Name: payments Users manage own payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own payments" ON public.payments USING ((auth.uid() = user_id));


--
-- Name: planned_content Users manage own planned content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own planned content" ON public.planned_content USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users manage own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own profile" ON public.user_profiles USING ((auth.uid() = user_id));


--
-- Name: generation_sessions Users manage own sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own sessions" ON public.generation_sessions USING ((auth.uid() = user_id));


--
-- Name: sparks_balance Users manage own sparks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own sparks" ON public.sparks_balance USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users manage own subscription; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own subscription" ON public.subscriptions USING ((auth.uid() = user_id));


--
-- Name: topup_orders Users manage own topups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own topups" ON public.topup_orders USING ((auth.uid() = user_id));


--
-- Name: video_generation_jobs Users manage own video jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own video jobs" ON public.video_generation_jobs USING ((auth.uid() = user_id));


--
-- Name: voice_generation_jobs Users manage own voice jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage own voice jobs" ON public.voice_generation_jobs USING ((auth.uid() = user_id));


--
-- Name: payment_history Users view own payment history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view own payment history" ON public.payment_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: analytics_summary Users view own summary; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view own summary" ON public.analytics_summary FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sparks_transactions Users view own transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view own transactions" ON public.sparks_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_model_pricing; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_summary; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: image_generation_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.image_generation_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: linked_accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: lookup_master; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lookup_master ENABLE ROW LEVEL SECURITY;

--
-- Name: music_generation_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.music_generation_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: music_library; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.music_library ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_content; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.planned_content ENABLE ROW LEVEL SECURITY;

--
-- Name: social_media_analytics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: sparks_balance; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sparks_balance ENABLE ROW LEVEL SECURITY;

--
-- Name: sparks_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sparks_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_image_searches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_image_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_prices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: topup_orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: user_avatars; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: user_image_references; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_image_references ENABLE ROW LEVEL SECURITY;

--
-- Name: user_music_library; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_music_library ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: video_generation_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_generation_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.voice_generation_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION calculate_session_cost(p_session_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_session_cost(p_session_id text) TO anon;
GRANT ALL ON FUNCTION public.calculate_session_cost(p_session_id text) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_session_cost(p_session_id text) TO service_role;


--
-- Name: FUNCTION match_knowledge(query_embedding public.vector, match_threshold double precision, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_knowledge(query_embedding public.vector, match_threshold double precision, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_knowledge(query_embedding public.vector, match_threshold double precision, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_knowledge(query_embedding public.vector, match_threshold double precision, match_count integer) TO service_role;


--
-- Name: FUNCTION trg_fn_set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_fn_set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.trg_fn_set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.trg_fn_set_updated_at() TO service_role;


--
-- Name: FUNCTION trg_fn_stock_searches_set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_fn_stock_searches_set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.trg_fn_stock_searches_set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.trg_fn_stock_searches_set_updated_at() TO service_role;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v4() TO anon;
GRANT ALL ON FUNCTION public.uuid_generate_v4() TO authenticated;
GRANT ALL ON FUNCTION public.uuid_generate_v4() TO service_role;


--
-- Name: TABLE ai_model_pricing; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_model_pricing TO anon;
GRANT ALL ON TABLE public.ai_model_pricing TO authenticated;
GRANT ALL ON TABLE public.ai_model_pricing TO service_role;


--
-- Name: TABLE analytics_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.analytics_summary TO anon;
GRANT ALL ON TABLE public.analytics_summary TO authenticated;
GRANT ALL ON TABLE public.analytics_summary TO service_role;


--
-- Name: TABLE api_keys_pool; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.api_keys_pool TO anon;
GRANT ALL ON TABLE public.api_keys_pool TO authenticated;
GRANT ALL ON TABLE public.api_keys_pool TO service_role;


--
-- Name: TABLE generation_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.generation_sessions TO anon;
GRANT ALL ON TABLE public.generation_sessions TO authenticated;
GRANT ALL ON TABLE public.generation_sessions TO service_role;


--
-- Name: TABLE image_generation_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.image_generation_jobs TO anon;
GRANT ALL ON TABLE public.image_generation_jobs TO authenticated;
GRANT ALL ON TABLE public.image_generation_jobs TO service_role;


--
-- Name: TABLE knowledge_embeddings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knowledge_embeddings TO anon;
GRANT ALL ON TABLE public.knowledge_embeddings TO authenticated;
GRANT ALL ON TABLE public.knowledge_embeddings TO service_role;


--
-- Name: TABLE linked_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.linked_accounts TO anon;
GRANT ALL ON TABLE public.linked_accounts TO authenticated;
GRANT ALL ON TABLE public.linked_accounts TO service_role;


--
-- Name: TABLE lookup_master; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lookup_master TO anon;
GRANT ALL ON TABLE public.lookup_master TO authenticated;
GRANT ALL ON TABLE public.lookup_master TO service_role;


--
-- Name: TABLE music_generation_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.music_generation_jobs TO anon;
GRANT ALL ON TABLE public.music_generation_jobs TO authenticated;
GRANT ALL ON TABLE public.music_generation_jobs TO service_role;


--
-- Name: TABLE music_library; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.music_library TO anon;
GRANT ALL ON TABLE public.music_library TO authenticated;
GRANT ALL ON TABLE public.music_library TO service_role;


--
-- Name: TABLE niche_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.niche_cache TO anon;
GRANT ALL ON TABLE public.niche_cache TO authenticated;
GRANT ALL ON TABLE public.niche_cache TO service_role;


--
-- Name: TABLE niche_recommendations_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.niche_recommendations_cache TO anon;
GRANT ALL ON TABLE public.niche_recommendations_cache TO authenticated;
GRANT ALL ON TABLE public.niche_recommendations_cache TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE payment_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_history TO anon;
GRANT ALL ON TABLE public.payment_history TO authenticated;
GRANT ALL ON TABLE public.payment_history TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE phone_otp; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.phone_otp TO anon;
GRANT ALL ON TABLE public.phone_otp TO authenticated;
GRANT ALL ON TABLE public.phone_otp TO service_role;


--
-- Name: TABLE phone_otp_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.phone_otp_attempts TO anon;
GRANT ALL ON TABLE public.phone_otp_attempts TO authenticated;
GRANT ALL ON TABLE public.phone_otp_attempts TO service_role;


--
-- Name: TABLE planned_content; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.planned_content TO anon;
GRANT ALL ON TABLE public.planned_content TO authenticated;
GRANT ALL ON TABLE public.planned_content TO service_role;


--
-- Name: TABLE social_media_analytics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.social_media_analytics TO anon;
GRANT ALL ON TABLE public.social_media_analytics TO authenticated;
GRANT ALL ON TABLE public.social_media_analytics TO service_role;


--
-- Name: TABLE sparks_balance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sparks_balance TO anon;
GRANT ALL ON TABLE public.sparks_balance TO authenticated;
GRANT ALL ON TABLE public.sparks_balance TO service_role;


--
-- Name: TABLE sparks_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sparks_transactions TO anon;
GRANT ALL ON TABLE public.sparks_transactions TO authenticated;
GRANT ALL ON TABLE public.sparks_transactions TO service_role;


--
-- Name: TABLE stock_image_searches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stock_image_searches TO anon;
GRANT ALL ON TABLE public.stock_image_searches TO authenticated;
GRANT ALL ON TABLE public.stock_image_searches TO service_role;


--
-- Name: TABLE stripe_prices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stripe_prices TO anon;
GRANT ALL ON TABLE public.stripe_prices TO authenticated;
GRANT ALL ON TABLE public.stripe_prices TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE topup_orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.topup_orders TO anon;
GRANT ALL ON TABLE public.topup_orders TO authenticated;
GRANT ALL ON TABLE public.topup_orders TO service_role;


--
-- Name: TABLE user_avatars; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_avatars TO anon;
GRANT ALL ON TABLE public.user_avatars TO authenticated;
GRANT ALL ON TABLE public.user_avatars TO service_role;


--
-- Name: TABLE user_image_references; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_image_references TO anon;
GRANT ALL ON TABLE public.user_image_references TO authenticated;
GRANT ALL ON TABLE public.user_image_references TO service_role;


--
-- Name: TABLE user_music_library; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_music_library TO anon;
GRANT ALL ON TABLE public.user_music_library TO authenticated;
GRANT ALL ON TABLE public.user_music_library TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: TABLE video_generation_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.video_generation_jobs TO anon;
GRANT ALL ON TABLE public.video_generation_jobs TO authenticated;
GRANT ALL ON TABLE public.video_generation_jobs TO service_role;


--
-- Name: TABLE videos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.videos TO anon;
GRANT ALL ON TABLE public.videos TO authenticated;
GRANT ALL ON TABLE public.videos TO service_role;


--
-- Name: TABLE voice_generation_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.voice_generation_jobs TO anon;
GRANT ALL ON TABLE public.voice_generation_jobs TO authenticated;
GRANT ALL ON TABLE public.voice_generation_jobs TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict CaLBoJ1XaS1nUWfORkZvNKLNg2BtURs7EqyBycyygf1ulYBDbz4f2mb0sIm73Bp

