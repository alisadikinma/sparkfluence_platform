-- =====================================================
-- Niche Recommendations Cache Table
-- Cache key: MD5(interest + profession) = max 195 combinations
-- Uses FREE Google Trends RSS + Curated 2025 Trends
-- =====================================================

-- Drop existing table if exists
DROP TABLE IF EXISTS niche_recommendations_cache;

-- Create cache table
CREATE TABLE niche_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache key: MD5 hash of (interest|profession)
  input_hash TEXT NOT NULL UNIQUE,
  
  -- Original inputs for analytics
  interest TEXT NOT NULL,
  profession TEXT NOT NULL,
  
  -- Cached results (12 niches with images)
  niches JSONB NOT NULL,
  
  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_niche_cache_hash ON niche_recommendations_cache(input_hash);
CREATE INDEX idx_niche_cache_hits ON niche_recommendations_cache(hit_count DESC);
CREATE INDEX idx_niche_cache_interest ON niche_recommendations_cache(interest);
CREATE INDEX idx_niche_cache_profession ON niche_recommendations_cache(profession);

-- RLS (service role access for edge functions)
ALTER TABLE niche_recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON niche_recommendations_cache
  FOR ALL USING (true) WITH CHECK (true);

-- Documentation
COMMENT ON TABLE niche_recommendations_cache IS 
  'Cache for AI-generated niche recommendations. Max ~195 combinations (13 interests × 15 professions). Uses Google Trends RSS (FREE) + curated 2025 trends.';
