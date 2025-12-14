-- Create image_generation_jobs table for background image processing
CREATE TABLE IF NOT EXISTS image_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    segment_number INTEGER NOT NULL DEFAULT 1,
    segment_type TEXT,
    
    -- Image generation specific fields
    visual_prompt TEXT NOT NULL,
    style TEXT DEFAULT 'cinematic',
    aspect_ratio TEXT DEFAULT '9:16',
    provider TEXT DEFAULT 'z-image', -- 'z-image', 'huggingface', 'openai', 'pollinations'
    model TEXT,
    
    -- Result fields
    image_url TEXT,
    thumbnail_url TEXT,
    
    -- Status tracking
    status INTEGER NOT NULL DEFAULT 0, -- 0=pending, 1=processing, 2=completed, 3=failed
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    topic TEXT,
    language TEXT DEFAULT 'indonesian',
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint for session + segment combination
    CONSTRAINT image_generation_jobs_session_segment_unique UNIQUE (session_id, segment_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_id ON image_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_session_id ON image_generation_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_status ON image_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_session ON image_generation_jobs(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_pending ON image_generation_jobs(status, created_at) WHERE status = 0;

-- Enable RLS
ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to avoid "already exists" error)
DROP POLICY IF EXISTS "Users can view their own image jobs" ON image_generation_jobs;
CREATE POLICY "Users can view their own image jobs"
    ON image_generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own image jobs" ON image_generation_jobs;
CREATE POLICY "Users can insert their own image jobs"
    ON image_generation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own image jobs" ON image_generation_jobs;
CREATE POLICY "Users can update their own image jobs"
    ON image_generation_jobs FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own image jobs" ON image_generation_jobs;
CREATE POLICY "Users can delete their own image jobs"
    ON image_generation_jobs FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to image jobs" ON image_generation_jobs;
CREATE POLICY "Service role has full access to image jobs"
    ON image_generation_jobs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger function: auto-update updated_at on image_generation_jobs
CREATE OR REPLACE FUNCTION trg_fn_image_jobs_set_updated_at()
RETURNS TRIGGER AS $trg_fn$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trg_fn$ LANGUAGE plpgsql;

-- Trigger: call function before update on image_generation_jobs
DROP TRIGGER IF EXISTS trg_image_jobs_set_updated_at ON image_generation_jobs;
CREATE TRIGGER trg_image_jobs_set_updated_at
    BEFORE UPDATE ON image_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_image_jobs_set_updated_at();

-- Add worker fields to video_generation_jobs if not exists
DO $do_block$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_generation_jobs' AND column_name = 'retry_count'
    ) THEN
        ALTER TABLE video_generation_jobs ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_generation_jobs' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE video_generation_jobs ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_generation_jobs' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE video_generation_jobs ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $do_block$;

-- Create pending jobs index for video_generation_jobs if not exists
CREATE INDEX IF NOT EXISTS idx_video_jobs_pending 
ON video_generation_jobs(status, created_at) WHERE status = 0;

-- Table comments
COMMENT ON TABLE image_generation_jobs IS 'Background image generation job queue - processed by Python worker';
COMMENT ON TABLE video_generation_jobs IS 'Background video generation job queue - processed by Python worker';
