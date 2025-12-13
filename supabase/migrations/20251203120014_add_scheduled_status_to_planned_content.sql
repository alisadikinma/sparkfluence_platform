/*
  # Add 'scheduled' status to planned_content

  1. Changes
    - Update the status check constraint to allow 'scheduled' in addition to 'planned', 'published', 'failed'
    - This provides more flexibility in tracking content states
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'planned_content_status_check'
  ) THEN
    ALTER TABLE planned_content DROP CONSTRAINT planned_content_status_check;
  END IF;
END $$;

ALTER TABLE planned_content 
ADD CONSTRAINT planned_content_status_check 
CHECK (status IN ('planned', 'scheduled', 'published', 'failed'));