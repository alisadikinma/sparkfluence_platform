-- Create video_generation_jobs table for background video processing
CREATE TABLE IF NOT EXISTS video_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    segment_number INTEGER NOT NULL DEFAULT 1,
    segment_type TEXT,
    shot_type TEXT DEFAULT 'B-ROLL',
    emotion TEXT,
    script_text TEXT,
    image_url TEXT,
    duration_seconds INTEGER DEFAULT 8,
    language TEXT DEFAULT 'indonesian',
    aspect_ratio TEXT DEFAULT '9:16',
    resolution TEXT DEFAULT '1080p',
    environment TEXT DEFAULT 'studio',
    topic TEXT,
    platform TEXT,
    prompt TEXT,
    veo_uuid TEXT,
    video_url TEXT,
    status INTEGER NOT NULL DEFAULT 0, -- 0=pending, 1=processing, 2=completed, 3=failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for session + segment combination
    CONSTRAINT video_generation_jobs_session_segment_unique UNIQUE (session_id, segment_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_user_id ON video_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_session_id ON video_generation_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_status ON video_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_veo_uuid ON video_generation_jobs(veo_uuid);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_user_session ON video_generation_jobs(user_id, session_id);

-- Enable RLS
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own video jobs"
    ON video_generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video jobs"
    ON video_generation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video jobs"
    ON video_generation_jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video jobs"
    ON video_generation_jobs FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to video jobs"
    ON video_generation_jobs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Add data column to notifications table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'data'
    ) THEN
        ALTER TABLE notifications ADD COLUMN data JSONB;
    END IF;
END $$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_video_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_video_generation_jobs_updated_at ON video_generation_jobs;
CREATE TRIGGER trigger_update_video_generation_jobs_updated_at
    BEFORE UPDATE ON video_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_video_generation_jobs_updated_at();
