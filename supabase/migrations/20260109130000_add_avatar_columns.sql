ALTER TABLE video_generation_jobs 
ADD COLUMN IF NOT EXISTS avatar_selection TEXT DEFAULT 'no_avatar',
ADD COLUMN IF NOT EXISTS has_profile_image BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS creator_gender TEXT DEFAULT 'male',
ADD COLUMN IF NOT EXISTS character_description TEXT,
ADD COLUMN IF NOT EXISTS face_anchor_url TEXT,
ADD COLUMN IF NOT EXISTS voice_anchor JSONB;

-- Add comments
COMMENT ON COLUMN video_generation_jobs.avatar_selection IS 'Avatar mode: no_avatar, use_profile, upload_new';
COMMENT ON COLUMN video_generation_jobs.creator_gender IS 'Gender for voice: male or female';