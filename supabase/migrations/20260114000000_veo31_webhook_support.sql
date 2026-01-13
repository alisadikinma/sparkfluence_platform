-- ============================================================================
-- VEO 3.1 HD WEBHOOK SUPPORT MIGRATION
-- Adds columns and table for webhook-based video generation
-- ============================================================================

-- 1. Add webhook tracking columns to video_generation_jobs
ALTER TABLE video_generation_jobs
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'fal.ai';

-- 2. Index for webhook lookups via veo_uuid
CREATE INDEX IF NOT EXISTS idx_video_jobs_veo_uuid 
  ON video_generation_jobs(veo_uuid);

-- 3. Create webhook_events table for logging callbacks
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES video_generation_jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_job_id ON webhook_events(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON webhook_events(received_at DESC);

-- 4. RLS for webhook_events (service role only - webhooks are server-to-server)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access webhook_events"
    ON webhook_events FOR ALL
    TO service_role
    USING (true);

-- 5. Grant permissions
GRANT ALL ON TABLE webhook_events TO anon;
GRANT ALL ON TABLE webhook_events TO authenticated;
GRANT ALL ON TABLE webhook_events TO service_role;

-- 6. Comment
COMMENT ON TABLE webhook_events IS 'Logs webhook callbacks from geminigen.ai for debugging and retry logic';
COMMENT ON COLUMN video_generation_jobs.provider IS 'Video provider: fal.ai or geminigen';
COMMENT ON COLUMN video_generation_jobs.webhook_received_at IS 'Timestamp when webhook callback was received';
