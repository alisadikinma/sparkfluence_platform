-- ============================================================================
-- Migration: Add B-ROLL Creator Face Multi-Ref Support
-- Date: 2026-01-17
-- Description: 
--   Adds columns for "Include Creator Face" checkbox feature in B-ROLL segments.
--   When enabled, uses FLUX Kontext Multi model with multiple reference images
--   (creator avatar + scene reference) for consistent creator appearance in B-ROLL.
-- ============================================================================

-- Add include_creator_face column (boolean)
-- Indicates if user wants creator face in B-ROLL segment
ALTER TABLE image_generation_jobs 
ADD COLUMN IF NOT EXISTS include_creator_face BOOLEAN DEFAULT FALSE;

-- Add creator_ref_for_broll column (text/URL)
-- Stores creator avatar URL for multi-ref B-ROLL generation
ALTER TABLE image_generation_jobs 
ADD COLUMN IF NOT EXISTS creator_ref_for_broll TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN image_generation_jobs.include_creator_face IS 'B-ROLL segments only: when true, uses FLUX Kontext Multi with creator face + scene reference';
COMMENT ON COLUMN image_generation_jobs.creator_ref_for_broll IS 'Creator avatar URL for multi-ref B-ROLL generation (used with include_creator_face=true)';

-- Index for queries filtering by include_creator_face
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_include_creator_face 
ON image_generation_jobs(include_creator_face) 
WHERE include_creator_face = TRUE;
