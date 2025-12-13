-- Create image_generation_jobs table for background image processing
CREATE TABLE IF NOT EXISTS image_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    segment_number INTEGER NOT NULL DEFAULT 1,
    segment_type TEXT,
    shot_type TEXT DEFAULT 'B-ROLL',
    emotion TEXT,
    visual_prompt TEXT,
    visual_direction TEXT,
    character_description TEXT,
    character_ref_png TEXT,
    topic TEXT,
    style TEXT DEFAULT 'cinematic',
    aspect_ratio TEXT DEFAULT '9:16',
    provider TEXT DEFAULT 'huggingface',
    image_url TEXT,
    status INTEGER NOT NULL DEFAULT 0, -- 0=pending, 1=processing, 2=completed, 3=failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for session + segment combination
    CONSTRAINT image_generation_jobs_session_segment_unique UNIQUE (session_id, segment_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_user_id ON image_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_session_id ON image_generation_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_status ON image_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_user_session ON image_generation_jobs(user_id, session_id);

-- Enable RLS
ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own image jobs"
    ON image_generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image jobs"
    ON image_generation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image jobs"
    ON image_generation_jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image jobs"
    ON image_generation_jobs FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to image jobs"
    ON image_generation_jobs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_image_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_image_generation_jobs_updated_at ON image_generation_jobs;
CREATE TRIGGER trigger_update_image_generation_jobs_updated_at
    BEFORE UPDATE ON image_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_image_generation_jobs_updated_at();
