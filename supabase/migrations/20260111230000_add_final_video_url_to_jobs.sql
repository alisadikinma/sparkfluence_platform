-- Add final_video_url and has_subtitles columns to video_generation_jobs
-- This allows storing the combined final video URL per session

ALTER TABLE video_generation_jobs 
ADD COLUMN IF NOT EXISTS final_video_url TEXT;

ALTER TABLE video_generation_jobs 
ADD COLUMN IF NOT EXISTS has_subtitles BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN video_generation_jobs.final_video_url IS 'URL of the final combined video for this session';
COMMENT ON COLUMN video_generation_jobs.has_subtitles IS 'Whether the final video has subtitles burned in';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_final_video 
ON video_generation_jobs(session_id) 
WHERE final_video_url IS NOT NULL;
