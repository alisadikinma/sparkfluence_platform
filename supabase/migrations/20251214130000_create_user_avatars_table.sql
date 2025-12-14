/*
  # Create user avatars table
  
  Store multiple avatars per user with names for reuse in ScriptLab
  
  1. New Table
    - user_avatars: stores avatar metadata
      - id (uuid, PK)
      - user_id (uuid, FK)
      - name (text) - user-given name for the avatar
      - storage_path (text) - path in Supabase storage
      - avatar_url (text) - public URL
      - character_description (text) - AI-generated description
      - is_default (boolean) - mark as default avatar
      - created_at, updated_at (timestamps)
  
  2. Storage
    - Create bucket for avatars if not exists
*/

-- Create user_avatars table
CREATE TABLE IF NOT EXISTS public.user_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Avatar',
  storage_path text NOT NULL,
  avatar_url text NOT NULL,
  character_description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON public.user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_is_default ON public.user_avatars(user_id, is_default);

-- Enable RLS
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own avatars"
  ON public.user_avatars
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own avatars"
  ON public.user_avatars
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own avatars"
  ON public.user_avatars
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own avatars"
  ON public.user_avatars
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.trg_fn_user_avatars_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_avatars_set_updated_at ON public.user_avatars;
CREATE TRIGGER trg_user_avatars_set_updated_at
  BEFORE UPDATE ON public.user_avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_user_avatars_set_updated_at();

-- Ensure only one default per user
CREATE OR REPLACE FUNCTION public.trg_fn_ensure_single_default_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_avatars
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_default_avatar ON public.user_avatars;
CREATE TRIGGER trg_ensure_single_default_avatar
  AFTER INSERT OR UPDATE ON public.user_avatars
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.trg_fn_ensure_single_default_avatar();
