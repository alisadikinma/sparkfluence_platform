-- Add country column to user_profiles
-- Auto-detected from browser timezone (no permission needed)

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'ID';

-- Add index for country-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);

-- Comment
COMMENT ON COLUMN user_profiles.country IS 'User country code (ISO 3166-1 alpha-2), auto-detected from browser timezone';
