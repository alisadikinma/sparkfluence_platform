-- ============================================================================
-- Migration: Add fallback_provider + Update providers to Nano Banana primary
-- Date: 2026-01-09
-- Purpose: Nano Banana PRIMARY for all, with proper fallbacks
-- ============================================================================

-- Add fallback_provider column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'image_generation_jobs' 
        AND column_name = 'fallback_provider'
    ) THEN
        ALTER TABLE image_generation_jobs 
        ADD COLUMN fallback_provider TEXT DEFAULT 'flux-schnell';
        
        COMMENT ON COLUMN image_generation_jobs.fallback_provider IS 
            'Fallback image provider if primary fails. CREATOR: gpt-image-1, B-ROLL: flux-schnell';
    END IF;
END $$;

-- ============================================================================
-- Update existing PENDING/PROCESSING jobs to use Nano Banana as PRIMARY
-- ============================================================================
UPDATE image_generation_jobs
SET 
    -- PRIMARY: Nano Banana for ALL segments
    provider = 'nano-banana-pro',
    -- FALLBACK: GPT-Image-1 for CREATOR, FLUX for B-ROLL
    fallback_provider = CASE 
        WHEN shot_type = 'CREATOR' THEN 'gpt-image-1'
        WHEN UPPER(segment_type) IN ('HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA') THEN 'gpt-image-1'
        ELSE 'flux-schnell'
    END
WHERE status IN (0, 1); -- Only pending/processing jobs, don't touch completed

-- Log the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % image_generation_jobs to Nano Banana primary', updated_count;
END $$;
