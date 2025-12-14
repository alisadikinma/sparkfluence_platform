/*
  # Auto-create user profile on signup
  
  This migration adds a trigger that automatically creates a user_profiles entry
  when a new user is created in auth.users. This solves the RLS policy issue
  where the user isn't fully authenticated during the signup flow.
  
  1. Changes
    - Add function to create profile on new user
    - Add trigger on auth.users
    - Add RLS policy for service role insert (for upsert operations)
    
  2. Security
    - Trigger runs with SECURITY DEFINER (bypasses RLS)
    - Profile is created with user_id matching auth.users.id
*/

-- Function to create profile for new user
CREATE OR REPLACE FUNCTION public.trg_fn_create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, onboarding_completed)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS trg_auth_users_create_profile ON auth.users;
CREATE TRIGGER trg_auth_users_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_create_profile_for_new_user();

-- Ensure upsert works by allowing service role or authenticated users
-- This is for when we need to update profile data after initial creation
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
CREATE POLICY "Service role can insert profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add policy for upsert (some clients use upsert which needs both INSERT and UPDATE)
DROP POLICY IF EXISTS "Users can upsert own profile" ON user_profiles;
CREATE POLICY "Users can upsert own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
