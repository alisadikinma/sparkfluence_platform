-- ============================================================================
-- Migration: Topic Outfit Cache
-- Created: 2026-01-15
-- Purpose: Cache LLM outfit category decisions to reduce API calls and improve consistency
-- ============================================================================

-- Create topic_outfit_cache table
CREATE TABLE IF NOT EXISTS topic_outfit_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_hash TEXT UNIQUE NOT NULL,      -- MD5 hash of normalized topic
  topic_original TEXT NOT NULL,          -- Original topic text for reference
  category TEXT NOT NULL,                -- Category key (e.g., 'FITNESS', 'GAMING')
  outfit TEXT NOT NULL,                  -- Full outfit description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_topic_outfit_cache_hash 
  ON topic_outfit_cache(topic_hash);

-- Index for category analysis
CREATE INDEX IF NOT EXISTS idx_topic_outfit_cache_category 
  ON topic_outfit_cache(category);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trg_fn_topic_outfit_cache_set_updated_at()
RETURNS TRIGGER AS $trg$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_topic_outfit_cache_set_updated_at ON topic_outfit_cache;
CREATE TRIGGER trg_topic_outfit_cache_set_updated_at
  BEFORE UPDATE ON topic_outfit_cache
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_topic_outfit_cache_set_updated_at();

-- RLS Policies (public read, service role write)
ALTER TABLE topic_outfit_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topic_outfit_cache_select" ON topic_outfit_cache;
CREATE POLICY "topic_outfit_cache_select" ON topic_outfit_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "topic_outfit_cache_insert" ON topic_outfit_cache;
CREATE POLICY "topic_outfit_cache_insert" ON topic_outfit_cache
  FOR INSERT WITH CHECK (true);

-- Comment
COMMENT ON TABLE topic_outfit_cache IS 'Cache for LLM-determined outfit categories based on video topics';
