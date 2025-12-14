-- Add character_ref_png column to user_profiles for GPT-Image-1 reference
-- This stores the processed/optimized avatar for AI image generation

DO $do_block$
BEGIN
    -- Add character_ref_png column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'character_ref_png'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN character_ref_png TEXT;
        
        COMMENT ON COLUMN user_profiles.character_ref_png IS 
            'Optimized avatar PNG URL for AI image generation (GPT-Image-1 reference)';
    END IF;
END $do_block$;
