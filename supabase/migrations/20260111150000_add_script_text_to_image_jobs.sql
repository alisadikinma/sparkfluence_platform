-- Migration: Add script_text column to image_generation_jobs
-- Purpose: Store actual spoken script text for accurate product detection in stock image search
-- Bug fix: Previously using visual_prompt (AI image prompt) which doesn't contain product names
-- Date: 2026-01-11

-- Add script_text column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generation_jobs' 
        AND column_name = 'script_text'
    ) THEN
        ALTER TABLE image_generation_jobs 
        ADD COLUMN script_text TEXT;
        
        COMMENT ON COLUMN image_generation_jobs.script_text IS 
            'Actual spoken script text for product detection in stock image search. Do NOT use visual_prompt for this purpose.';
    END IF;
END $$;

-- Create index for potential text search on script_text
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_script_text 
ON image_generation_jobs USING gin(to_tsvector('english', COALESCE(script_text, '')));
