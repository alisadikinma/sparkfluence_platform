-- =============================================================================
-- Sparkfluence Platform — New Project Setup
-- =============================================================================
-- Run this AFTER the baseline schema and all migrations have been applied.
-- This sets up extensions, storage buckets, storage RLS policies, and cron jobs.
--
-- Order of execution:
--   1. baseline/schema_public_*.sql
--   2. migrations/*.sql (all, in order)
--   3. THIS FILE (setup_new_project.sql)
--   4. seed_data.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
-- Most are auto-enabled on Supabase, but ensure they exist explicitly.
-- pg_cron and pg_net may require enabling via the Supabase Dashboard first.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net" SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 2. Storage Buckets
-- -----------------------------------------------------------------------------
-- Public buckets: avatars, generated-images, generated-videos, final-videos,
--                 voice-references
-- Private buckets: generated-voice, generated-music, image-references
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 3. Storage RLS Policies
-- -----------------------------------------------------------------------------
-- These policies control who can read/write to each storage bucket.
-- service_role has unrestricted access for Edge Functions and backend use.
-- -----------------------------------------------------------------------------

CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Allow users to delete own files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Allow users to update own files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Service role manages all storage" ON storage.objects FOR ALL TO service_role USING (true);
CREATE POLICY "Users can manage own image references" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'image-references' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can manage own voice references" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'voice-references' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view generated content" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ANY (ARRAY['generated-images','generated-videos','generated-voice','generated-music','final-videos']));


-- -----------------------------------------------------------------------------
-- 4. Cron Jobs
-- -----------------------------------------------------------------------------
-- These scheduled jobs handle daily maintenance tasks.
-- NOTE: pg_cron must be enabled in the Supabase Dashboard before these will work.
-- -----------------------------------------------------------------------------

-- Refresh trending data daily at 06:00 UTC
-- WARNING: The refresh_trending_data() function references the OLD Supabase
-- project URL and anon key internally. You MUST update the function body with
-- the NEW project's SUPABASE_URL and SUPABASE_ANON_KEY before enabling this
-- cron job. Check the function definition with:
--   SELECT prosrc FROM pg_proc WHERE proname = 'refresh_trending_data';
-- Then ALTER FUNCTION or DROP + re-CREATE with the new credentials.
SELECT cron.schedule('refresh-trending-data', '0 6 * * *', 'SELECT public.refresh_trending_data()');

-- Clean up expired trending topics daily at 05:00 UTC
SELECT cron.schedule('cleanup-expired-trending', '0 5 * * *', 'DELETE FROM trending_topics WHERE expires_at < NOW()');

-- Reset exhausted API keys daily at 17:05 UTC (after most daily limits reset)
SELECT cron.schedule('daily-reset-exhausted-keys', '5 17 * * *', 'SELECT public.reset_exhausted_api_keys()');
