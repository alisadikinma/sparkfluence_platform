-- ============================================================================
-- FIX WEBHOOK_EVENTS RLS POLICY
--
-- The original policy was too permissive - authenticated users could access
-- ALL webhook events. This migration fixes it to:
-- 1. Service role: full access (for backend operations)
-- 2. Authenticated users: can only view their own job's events
-- ============================================================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Service role can manage webhook_events" ON webhook_events;

-- Create proper policies
-- 1. Service role has full access
CREATE POLICY "service_role_full_access_webhook_events"
  ON webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Authenticated users can only view their own job's events
CREATE POLICY "users_view_own_webhook_events"
  ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM video_generation_jobs
      WHERE user_id = auth.uid()
    )
  );

-- Note: Authenticated users cannot INSERT/UPDATE/DELETE webhook_events
-- Only the backend (service role) can create/modify webhook events

-- ============================================================================
-- Add version column for optimistic locking (race condition fix)
-- ============================================================================
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;

COMMENT ON COLUMN video_generation_jobs.version IS 'Optimistic locking version for concurrent update detection';
