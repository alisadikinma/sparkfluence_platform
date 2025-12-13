-- ============================================================================
-- API Keys Pool - Unified rotation system for all external API providers
-- ============================================================================
-- Supports: Tavily, OpenRouter, HuggingFace, and future providers
-- Features: Auto-rotation, usage tracking, monthly reset, priority ordering
-- ============================================================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS api_keys_pool;

-- Create main table
CREATE TABLE api_keys_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identification
  provider TEXT NOT NULL,  -- 'tavily', 'openrouter', 'huggingface', etc.
  key_name TEXT NOT NULL,  -- Human-readable name: 'Account A', 'Account B'
  api_key TEXT NOT NULL,   -- The actual API key (encrypted in production)
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,           -- Current usage (requests or tokens)
  usage_limit INTEGER NOT NULL,            -- Max limit before rotation
  limit_type TEXT DEFAULT 'requests',      -- 'requests' or 'tokens'
  
  -- Status & Priority
  is_active BOOLEAN DEFAULT true,          -- Can be used?
  is_exhausted BOOLEAN DEFAULT false,      -- Hit limit this period?
  priority INTEGER DEFAULT 1,              -- Lower = used first
  
  -- Reset configuration
  reset_period TEXT DEFAULT 'monthly',     -- 'daily', 'weekly', 'monthly'
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  next_reset_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,                              -- Optional notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(provider, api_key),
  UNIQUE(provider, key_name)
);

-- Indexes for fast lookup
CREATE INDEX idx_api_keys_provider ON api_keys_pool(provider);
CREATE INDEX idx_api_keys_active ON api_keys_pool(provider, is_active, is_exhausted, priority);
CREATE INDEX idx_api_keys_reset ON api_keys_pool(next_reset_at);

-- Enable RLS
ALTER TABLE api_keys_pool ENABLE ROW LEVEL SECURITY;

-- Only service role can access (API keys are sensitive!)
CREATE POLICY "Service role full access" 
  ON api_keys_pool 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Helper function: Get next available API key for a provider
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_api_key(p_provider TEXT)
RETURNS TABLE(
  key_id UUID,
  api_key TEXT,
  key_name TEXT,
  usage_count INTEGER,
  usage_limit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, reset any exhausted keys if their reset period has passed
  UPDATE api_keys_pool
  SET 
    is_exhausted = false,
    usage_count = 0,
    last_reset_at = NOW(),
    next_reset_at = CASE reset_period
      WHEN 'daily' THEN NOW() + INTERVAL '1 day'
      WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
      WHEN 'monthly' THEN NOW() + INTERVAL '30 days'
      ELSE NOW() + INTERVAL '30 days'
    END,
    updated_at = NOW()
  WHERE provider = p_provider
    AND is_exhausted = true
    AND next_reset_at <= NOW();

  -- Return the best available key
  RETURN QUERY
  SELECT 
    k.id,
    k.api_key,
    k.key_name,
    k.usage_count,
    k.usage_limit
  FROM api_keys_pool k
  WHERE k.provider = p_provider
    AND k.is_active = true
    AND k.is_exhausted = false
    AND k.usage_count < k.usage_limit
  ORDER BY k.priority ASC, k.usage_count ASC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- Helper function: Increment usage count for a key
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  p_key_id UUID, 
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
  v_limit INTEGER;
BEGIN
  UPDATE api_keys_pool
  SET 
    usage_count = usage_count + p_increment,
    updated_at = NOW()
  WHERE id = p_key_id
  RETURNING usage_count, usage_limit INTO v_new_count, v_limit;
  
  -- Auto-mark as exhausted if limit reached
  IF v_new_count >= v_limit THEN
    UPDATE api_keys_pool
    SET 
      is_exhausted = true,
      next_reset_at = CASE reset_period
        WHEN 'daily' THEN NOW() + INTERVAL '1 day'
        WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
        WHEN 'monthly' THEN NOW() + INTERVAL '30 days'
        ELSE NOW() + INTERVAL '30 days'
      END,
      updated_at = NOW()
    WHERE id = p_key_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- Helper function: Mark key as exhausted (for rate limit errors)
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_api_key_exhausted(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_keys_pool
  SET 
    is_exhausted = true,
    next_reset_at = CASE reset_period
      WHEN 'daily' THEN NOW() + INTERVAL '1 day'
      WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
      WHEN 'monthly' THEN NOW() + INTERVAL '30 days'
      ELSE NOW() + INTERVAL '30 days'
    END,
    updated_at = NOW()
  WHERE id = p_key_id;
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- Helper function: Get usage stats for a provider
-- ============================================================================
CREATE OR REPLACE FUNCTION get_api_keys_stats(p_provider TEXT DEFAULT NULL)
RETURNS TABLE(
  provider TEXT,
  total_keys INTEGER,
  active_keys INTEGER,
  exhausted_keys INTEGER,
  total_usage BIGINT,
  total_limit BIGINT,
  usage_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.provider,
    COUNT(*)::INTEGER as total_keys,
    COUNT(*) FILTER (WHERE k.is_active AND NOT k.is_exhausted)::INTEGER as active_keys,
    COUNT(*) FILTER (WHERE k.is_exhausted)::INTEGER as exhausted_keys,
    COALESCE(SUM(k.usage_count), 0)::BIGINT as total_usage,
    COALESCE(SUM(k.usage_limit), 0)::BIGINT as total_limit,
    CASE 
      WHEN SUM(k.usage_limit) > 0 
      THEN ROUND((SUM(k.usage_count)::NUMERIC / SUM(k.usage_limit)::NUMERIC) * 100, 2)
      ELSE 0
    END as usage_percentage
  FROM api_keys_pool k
  WHERE (p_provider IS NULL OR k.provider = p_provider)
  GROUP BY k.provider
  ORDER BY k.provider;
END;
$$;

-- ============================================================================
-- Insert sample structure (you'll add real keys via Supabase Dashboard)
-- ============================================================================
-- IMPORTANT: Do NOT commit real API keys to git!
-- Add keys manually via Supabase Dashboard or secure deployment

COMMENT ON TABLE api_keys_pool IS 'Unified API key rotation pool for external services';
COMMENT ON COLUMN api_keys_pool.provider IS 'Service provider: tavily, openrouter, huggingface';
COMMENT ON COLUMN api_keys_pool.limit_type IS 'Type of limit: requests (Tavily) or tokens (OpenRouter)';
COMMENT ON COLUMN api_keys_pool.reset_period IS 'How often the usage resets: daily, weekly, monthly';

-- ============================================================================
-- Example queries (for reference, do not run):
-- ============================================================================
-- 
-- Get available Tavily key:
-- SELECT * FROM get_available_api_key('tavily');
--
-- Increment usage after successful call:
-- SELECT increment_api_key_usage('key-uuid-here', 1);
--
-- Mark exhausted after 429 error:
-- SELECT mark_api_key_exhausted('key-uuid-here');
--
-- Check stats:
-- SELECT * FROM get_api_keys_stats();
-- SELECT * FROM get_api_keys_stats('openrouter');
--
-- ============================================================================
