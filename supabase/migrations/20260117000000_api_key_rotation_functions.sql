-- ============================================================================
-- API Key Rotation Functions
-- Required for apiKeyRotation.ts in Edge Functions
-- ============================================================================

-- Function: Get available API key from pool (round-robin, skip exhausted)
CREATE OR REPLACE FUNCTION public.get_available_api_key(p_provider TEXT)
RETURNS TABLE (
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
  RETURN QUERY
  SELECT 
    akp.id AS key_id,
    akp.api_key,
    akp.key_name,
    COALESCE(akp.usage_count, 0) AS usage_count,
    akp.usage_limit
  FROM api_keys_pool akp
  WHERE akp.provider = p_provider
    AND COALESCE(akp.is_active, true) = true
    AND COALESCE(akp.is_exhausted, false) = false
    AND (akp.usage_limit IS NULL OR COALESCE(akp.usage_count, 0) < akp.usage_limit)
  ORDER BY 
    COALESCE(akp.priority, 0) DESC,  -- Higher priority first
    COALESCE(akp.usage_count, 0) ASC  -- Least used first (round-robin)
  LIMIT 1;
END;
$$;

-- Function: Increment API key usage count
CREATE OR REPLACE FUNCTION public.increment_api_key_usage(
  p_key_id UUID,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_keys_pool
  SET 
    usage_count = COALESCE(usage_count, 0) + p_increment,
    updated_at = NOW()
  WHERE id = p_key_id;
END;
$$;

-- Function: Mark API key as exhausted (rate limited)
CREATE OR REPLACE FUNCTION public.mark_api_key_exhausted(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_keys_pool
  SET 
    is_exhausted = true,
    updated_at = NOW()
  WHERE id = p_key_id;
END;
$$;

-- Function: Get API keys statistics by provider
CREATE OR REPLACE FUNCTION public.get_api_keys_stats(p_provider TEXT DEFAULT NULL)
RETURNS TABLE (
  provider TEXT,
  total_keys BIGINT,
  active_keys BIGINT,
  exhausted_keys BIGINT,
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
    akp.provider,
    COUNT(*)::BIGINT AS total_keys,
    COUNT(*) FILTER (WHERE COALESCE(akp.is_active, true) AND NOT COALESCE(akp.is_exhausted, false))::BIGINT AS active_keys,
    COUNT(*) FILTER (WHERE COALESCE(akp.is_exhausted, false))::BIGINT AS exhausted_keys,
    COALESCE(SUM(COALESCE(akp.usage_count, 0)), 0)::BIGINT AS total_usage,
    COALESCE(SUM(akp.usage_limit), 0)::BIGINT AS total_limit,
    CASE 
      WHEN COALESCE(SUM(akp.usage_limit), 0) > 0 
      THEN ROUND((COALESCE(SUM(COALESCE(akp.usage_count, 0)), 0)::NUMERIC / SUM(akp.usage_limit)::NUMERIC) * 100, 2)
      ELSE 0
    END AS usage_percentage
  FROM api_keys_pool akp
  WHERE p_provider IS NULL OR akp.provider = p_provider
  GROUP BY akp.provider
  ORDER BY akp.provider;
END;
$$;

-- Function: Reset exhausted keys (for daily reset cron job)
CREATE OR REPLACE FUNCTION public.reset_exhausted_api_keys(p_provider TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE api_keys_pool
  SET 
    is_exhausted = false,
    usage_count = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE COALESCE(is_exhausted, false) = true
    AND (p_provider IS NULL OR provider = p_provider);
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.get_available_api_key(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_api_key_usage(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_api_key_exhausted(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_api_keys_stats(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_exhausted_api_keys(TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_available_api_key IS 'Get least-used active API key from pool for a provider';
COMMENT ON FUNCTION public.increment_api_key_usage IS 'Increment usage count for an API key';
COMMENT ON FUNCTION public.mark_api_key_exhausted IS 'Mark API key as rate-limited/exhausted';
COMMENT ON FUNCTION public.get_api_keys_stats IS 'Get usage statistics for API keys by provider';
COMMENT ON FUNCTION public.reset_exhausted_api_keys IS 'Reset exhausted flags for daily quota reset';
