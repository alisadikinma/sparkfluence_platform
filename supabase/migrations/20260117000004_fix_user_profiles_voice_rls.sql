-- ============================================================================
-- FIX USER_PROFILES RLS FOR VOICE COLUMNS
--
-- This migration ensures:
-- 1. Voice columns exist in user_profiles
-- 2. RLS policies allow users to update their own profile (including voice)
--
-- Error being fixed:
-- "new row violates row-level security policy" when saving voice recording
-- ============================================================================

-- Step 1: Ensure voice columns exist
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS voice_reference_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_reference_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS voice_recorded_at TIMESTAMPTZ;

-- Step 2: Ensure RLS is enabled on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if any (to recreate cleanly)
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "select_own_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "update_own_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "insert_own_user_profiles" ON user_profiles;

-- Step 4: Create comprehensive RLS policies

-- SELECT: Users can view their own profile
CREATE POLICY "select_own_user_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can create their own profile
CREATE POLICY "insert_own_user_profiles" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own profile (including voice columns)
CREATE POLICY "update_own_user_profiles" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- ============================================================================
-- Note: This migration should be deployed to production via Supabase Dashboard
-- SQL Editor or through the CLI: supabase db push
-- ============================================================================
