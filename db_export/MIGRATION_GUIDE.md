# Sparkfluence — New Supabase Project Migration Guide

## Step 1: Create New Supabase Project
1. Go to https://supabase.com/dashboard → New Project
2. Choose region: **Southeast Asia (Singapore)** (same as old)
3. Note down: **Project URL**, **Anon Key**, **Service Role Key**, **DB Password**

## Step 2: Enable Extensions
Run in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS "vector" SCHEMA public;
```
> pg_cron, pg_net, pgcrypto, uuid-ossp should be auto-enabled.
> If not, enable from Dashboard → Database → Extensions.

## Step 3: Apply Schema (Baseline + Migrations)
Option A — Using Supabase CLI:
```bash
supabase link --project-ref <NEW_PROJECT_REF>
supabase db push
```

Option B — Manual SQL:
1. Run `supabase/baseline/schema_public_20260113.sql` in SQL Editor
2. Run each migration in `supabase/migrations/` in order:
   - `20260202143927_create_trending_topics.sql`
   - `20260202143945_create_user_topic_history.sql`
   - `20260203032128_enable_pg_cron_and_pg_net.sql`
   - `20260203032400_setup_pg_cron_trending_refresh.sql`
   - `20260204025940_add_daily_reset_exhausted_api_keys_cron.sql`
   - `20260204041801_convert_interest_to_interests.sql`
   - `20260204045424_add_daily_reset_api_keys_cron.sql`
   - `20260205073127_fix_reset_exhausted_api_keys_ambiguity.sql`
   - `20260207015332_update_trending_topics_add_challenges.sql`

## Step 4: Setup Storage + Cron
Run `db_export/setup_new_project.sql` in SQL Editor.

**IMPORTANT:** After running, update `refresh_trending_data()` function:
```sql
CREATE OR REPLACE FUNCTION public.refresh_trending_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  SELECT 'https://<NEW_PROJECT_URL>' INTO _supabase_url;  -- UPDATE THIS
  SELECT '<NEW_ANON_KEY>' INTO _service_key;               -- UPDATE THIS
  -- ... rest of function
END;
$$;
```

## Step 5: Seed Data
Run `db_export/seed_data.sql` in SQL Editor.
This inserts: api_keys_pool (9), lookup_master (25), ai_model_pricing (8).

## Step 6: Set Edge Function Secrets
In Supabase Dashboard → Edge Functions → Secrets, or via CLI:
```bash
supabase secrets set GEMINI_API_KEY=<value>
supabase secrets set OPENROUTER_API_KEY=<value>
supabase secrets set FAL_AI_API_KEY=<key_id:key_secret>
supabase secrets set GROQ_API_KEY=<value>
supabase secrets set TAVILY_API_KEY=<value>
supabase secrets set RAPIDAPI_KEY=<value>
```
> Note: Most API keys are now in `api_keys_pool` table (rotation system).
> Edge Function secrets are only needed for fal.ai, Groq, and any direct env usage.

## Step 7: Deploy Edge Functions
```bash
supabase functions deploy generate-script --no-verify-jwt
supabase functions deploy generate-images --no-verify-jwt
supabase functions deploy generate-videos --no-verify-jwt
supabase functions deploy generate-tts --no-verify-jwt
supabase functions deploy generate-music --no-verify-jwt
supabase functions deploy generate-topic-suggestions --no-verify-jwt
supabase functions deploy fetch-trending-data --no-verify-jwt
supabase functions deploy autocomplete-keywords --no-verify-jwt
supabase functions deploy generate-niche-suggestions --no-verify-jwt
supabase functions deploy analyze-image --no-verify-jwt
supabase functions deploy generate-video-prompt --no-verify-jwt
supabase functions deploy recommend-styles --no-verify-jwt
supabase functions deploy rewrite-visual-direction --no-verify-jwt
```

## Step 8: Update Frontend .env
```
VITE_SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
```

## Step 9: Update Backend .env
```
SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
```

## Step 10: Update VPS Backend
Update `/root/sparkfluence/backend/.env` on VPS with new Supabase URL + service role key.

## Step 11: Update MCP Config (Claude Code)
Update `.mcp.json` with new Supabase connection string and access token.

---

## What's NOT Migrated (intentional)
- **User accounts** (auth.users) — users will need to re-register
- **Generated content** (images, videos, music) — all regenerable
- **Old job history** (image/video/music_generation_jobs) — dev data
- **Notifications** — transient data
- **User topic history** — can rebuild organically

## Storage Bucket Summary
| Bucket | Public | Max Size | MIME Types |
|--------|--------|----------|------------|
| avatars | Yes | 5 MB | jpeg, png, webp, gif |
| generated-images | Yes | 10 MB | jpeg, png, webp |
| generated-videos | Yes | 100 MB | mp4, webm |
| final-videos | Yes | 500 MB | mp4, webm |
| generated-voice | No | 50 MB | mp3, wav, mpeg |
| generated-music | No | 50 MB | mp3, wav, mpeg |
| image-references | No | 10 MB | jpeg, png, webp |
| voice-references | Yes | 50 MB | webm, mp3, wav, ogg, mpeg |
