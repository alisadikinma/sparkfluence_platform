-- Add preferred_platform column to video_generation_jobs table
-- This stores the user's explicit platform choice (veo-3.1-fast, sora-2-hd, or null for auto)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_generation_jobs' AND column_name = 'preferred_platform'
    ) THEN
        ALTER TABLE video_generation_jobs ADD COLUMN preferred_platform TEXT DEFAULT NULL;
        
        -- Add comment explaining the column
        COMMENT ON COLUMN video_generation_jobs.preferred_platform IS 
            'User-selected video platform. NULL = auto-select per segment. Values: veo-3.1-fast, sora-2-hd';
    END IF;
END $$;
