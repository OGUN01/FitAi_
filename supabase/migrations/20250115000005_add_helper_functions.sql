-- ============================================
-- HELPER FUNCTIONS
-- ============================================
-- Migration: Add database helper functions
-- Created: 2025-11-14
-- Description: Utility functions for cache management and cleanup

-- ============================================
-- CACHE HIT COUNTER
-- ============================================
-- Increment cache hit count when serving cached content
CREATE OR REPLACE FUNCTION increment_cache_hit(
  p_cache_key TEXT,
  p_table_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_table_name = 'workout_cache' THEN
    UPDATE workout_cache
    SET hit_count = hit_count + 1,
        last_accessed = NOW()
    WHERE cache_key = p_cache_key;
  ELSIF p_table_name = 'meal_cache' THEN
    UPDATE meal_cache
    SET hit_count = hit_count + 1,
        last_accessed = NOW()
    WHERE cache_key = p_cache_key;
  END IF;
END;
$$;

COMMENT ON FUNCTION increment_cache_hit IS 'Atomically increment cache hit counter and update last_accessed timestamp';

-- ============================================
-- CACHE CLEANUP
-- ============================================
-- Clean up old, unused cache entries (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete workout cache entries not accessed in 90 days with low hit count
  DELETE FROM workout_cache
  WHERE last_accessed < NOW() - INTERVAL '90 days'
    AND hit_count < 5;

  -- Delete meal cache entries not accessed in 90 days with low hit count
  DELETE FROM meal_cache
  WHERE last_accessed < NOW() - INTERVAL '90 days'
    AND hit_count < 5;

  RAISE NOTICE 'Cache cleanup completed';
END;
$$;

COMMENT ON FUNCTION cleanup_old_cache IS 'Remove stale cache entries older than 90 days with <5 hits';

-- ============================================
-- CACHE STATISTICS
-- ============================================
-- Get cache performance statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  table_name TEXT,
  total_entries BIGINT,
  total_hits BIGINT,
  avg_hits_per_entry NUMERIC,
  oldest_entry TIMESTAMP,
  newest_entry TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'workout_cache'::TEXT,
    COUNT(*)::BIGINT,
    SUM(hit_count)::BIGINT,
    AVG(hit_count)::NUMERIC,
    MIN(created_at),
    MAX(created_at)
  FROM workout_cache
  UNION ALL
  SELECT
    'meal_cache'::TEXT,
    COUNT(*)::BIGINT,
    SUM(hit_count)::BIGINT,
    AVG(hit_count)::NUMERIC,
    MIN(created_at),
    MAX(created_at)
  FROM meal_cache;
END;
$$;

COMMENT ON FUNCTION get_cache_stats IS 'Return performance statistics for both cache tables';

-- ============================================
-- GENERATION COST TRACKING
-- ============================================
-- Get AI generation cost summary
CREATE OR REPLACE FUNCTION get_generation_costs(
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
  generation_type TEXT,
  model_used TEXT,
  total_generations BIGINT,
  total_cost_usd NUMERIC,
  avg_cost_usd NUMERIC,
  total_tokens BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gh.generation_type,
    gh.model_used,
    COUNT(*)::BIGINT,
    SUM(gh.cost_usd)::NUMERIC,
    AVG(gh.cost_usd)::NUMERIC,
    SUM(gh.total_tokens)::BIGINT
  FROM generation_history gh
  WHERE gh.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY gh.generation_type, gh.model_used
  ORDER BY SUM(gh.cost_usd) DESC;
END;
$$;

COMMENT ON FUNCTION get_generation_costs IS 'Summarize AI generation costs by type and model for specified date range';

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply auto-update trigger to media tables
CREATE TRIGGER update_exercise_media_updated_at
  BEFORE UPDATE ON exercise_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diet_media_updated_at
  BEFORE UPDATE ON diet_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to automatically set updated_at timestamp on row updates';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant execute permissions on functions to service_role
GRANT EXECUTE ON FUNCTION increment_cache_hit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_cache_stats TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_generation_costs TO service_role, authenticated;
