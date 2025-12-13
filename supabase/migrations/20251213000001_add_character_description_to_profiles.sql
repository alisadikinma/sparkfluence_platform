-- Add character_description column to user_profiles table
-- This stores AI-generated facial description for consistent image generation

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS character_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.character_description IS 'AI-generated physical/facial description for consistent character in generated images';
