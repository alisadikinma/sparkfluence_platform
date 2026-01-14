-- ============================================================================
-- Migration: Fix Multi-Image Gallery Data Consistency
-- Date: 2026-01-14
-- Description: 
--   Ensures only ONE image per segment has is_selected=true
--   Required because unique constraint idx_image_jobs_selected_unique exists
-- ============================================================================

-- STEP 1: Reset ALL is_selected to FALSE first (avoid unique constraint violation)
UPDATE image_generation_jobs 
SET is_selected = FALSE 
WHERE is_selected = TRUE;

-- STEP 2: For each segment, set is_selected=true for the FIRST completed image only
-- Using subquery to get the earliest completed image per (session_id, segment_id)
UPDATE image_generation_jobs t
SET is_selected = TRUE
FROM (
  SELECT DISTINCT ON (session_id, segment_id) id
  FROM image_generation_jobs
  WHERE status = 2
  ORDER BY session_id, segment_id, generation_number ASC, created_at ASC
) first_img
WHERE t.id = first_img.id;

-- STEP 3: Add index for multi-image queries if not exists
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_multi_image 
ON image_generation_jobs(session_id, segment_number, generation_number);
