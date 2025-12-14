-- Add character_ref_png column to image_generation_jobs table
-- This enables GPT-Image-1 to use Image Edit API with reference for face consistency

DO $do_block$
BEGIN
    -- Add character_ref_png column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generation_jobs' AND column_name = 'character_ref_png'
    ) THEN
        ALTER TABLE image_generation_jobs 
        ADD COLUMN character_ref_png TEXT;
        
        COMMENT ON COLUMN image_generation_jobs.character_ref_png IS 
            'Avatar/reference image URL for face consistency with GPT-Image-1 Edit API';
    END IF;
    
    -- Add character_description column if not exists (for text fallback)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generation_jobs' AND column_name = 'character_description'
    ) THEN
        ALTER TABLE image_generation_jobs 
        ADD COLUMN character_description TEXT;
        
        COMMENT ON COLUMN image_generation_jobs.character_description IS 
            'Text description of character for prompt enhancement';
    END IF;
    
    -- Add shot_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generation_jobs' AND column_name = 'shot_type'
    ) THEN
        ALTER TABLE image_generation_jobs 
        ADD COLUMN shot_type TEXT DEFAULT 'B-ROLL';
        
        COMMENT ON COLUMN image_generation_jobs.shot_type IS 
            'Shot type: CREATOR or B-ROLL';
    END IF;
    
    -- Add emotion column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generation_jobs' AND column_name = 'emotion'
    ) THEN
        ALTER TABLE image_generation_jobs 
        ADD COLUMN emotion TEXT DEFAULT 'authority';
        
        COMMENT ON COLUMN image_generation_jobs.emotion IS 
            'Emotion/expression for creator shots';
    END IF;
END $do_block$;
