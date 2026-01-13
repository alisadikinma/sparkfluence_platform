-- ============================================================================
-- ADD RETRY TRACKING COLUMNS FOR VIDEO GENERATION
--
-- Auto retry mechanism for VEO 3.1 video generation:
-- - Max 3 automatic retries with 1 minute delay
-- - After 3 failures, user must manually retry
--
-- Related Changes:
-- - backend/webhook_handler.py: handles GeminiGen webhooks with auto retry
-- - generate-videos: handles is_retry and force_retry flags
-- ============================================================================

-- Add retry tracking columns to video_generation_jobs
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Index for retry scheduler
-- Only index jobs that are failed (status=3) and have retries remaining
CREATE INDEX IF NOT EXISTS idx_video_jobs_next_retry
  ON video_generation_jobs(next_retry_at)
  WHERE status = 3 AND retry_count < 3;

-- Add webhook tracking column
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE;

-- Comments for documentation
COMMENT ON COLUMN video_generation_jobs.retry_count IS 'Number of retry attempts (max 3)';
COMMENT ON COLUMN video_generation_jobs.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN video_generation_jobs.next_retry_at IS 'Scheduled time for next retry attempt';
COMMENT ON COLUMN video_generation_jobs.max_retries IS 'Maximum retry attempts (default 3)';
COMMENT ON COLUMN video_generation_jobs.webhook_received_at IS 'When GeminiGen webhook was received';

-- ============================================================================
-- Optional: Create webhook_events table for logging (can be useful for debugging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES video_generation_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookup by job_id
CREATE INDEX IF NOT EXISTS idx_webhook_events_job_id ON webhook_events(job_id);

-- RLS for webhook_events (service role only)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook_events
CREATE POLICY "Service role can manage webhook_events"
  ON webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');
