-- ============================================================================
-- FIX CACHE TABLES MIGRATION
-- ============================================================================
-- Migration: Fix workout_cache and meal_cache tables
-- Created: 2025-01-29
-- Description: Add user_id and expiration logic to cache tables
-- CRITICAL FIXES:
-- 1. Add user_id for privacy and rate limiting
-- 2. Add expires_at for automatic cleanup
-- 3. Add proper indexes and RLS policies

-- ============================================================================
-- FIX: WORKOUT_CACHE
-- ============================================================================

-- Add user_id column (nullable for backward compatibility with existing cache entries)
ALTER TABLE workout_cache
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add expiration column (30 days default for workouts)
ALTER TABLE workout_cache
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days');

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_cache_user_id ON workout_cache(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_cache_expires ON workout_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_cache_user_key ON workout_cache(user_id, cache_key) WHERE user_id IS NOT NULL;

-- Enable RLS (existing data won't be affected due to nullable user_id)
ALTER TABLE workout_cache ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own cache entries
CREATE POLICY "Users can view own workout cache"
  ON workout_cache FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL); -- NULL = legacy cache entries (readable by all)

-- Allow system/service to insert cache entries
CREATE POLICY "Service can insert workout cache"
  ON workout_cache FOR INSERT
  WITH CHECK (true); -- Backend service inserts cache

-- Allow system to delete expired entries
CREATE POLICY "Service can delete expired workout cache"
  ON workout_cache FOR DELETE
  USING (expires_at < NOW());

-- Update comment
COMMENT ON COLUMN workout_cache.user_id IS 'User who generated this plan (NULL for legacy shared cache)';
COMMENT ON COLUMN workout_cache.expires_at IS 'Cache entry expires after 30 days - auto-cleanup via cron';

-- ============================================================================
-- FIX: MEAL_CACHE
-- ============================================================================

-- Add user_id column
ALTER TABLE meal_cache
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add expiration column (7 days default for meals - shorter than workouts)
ALTER TABLE meal_cache
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days');

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meal_cache_user_id ON meal_cache(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_cache_expires ON meal_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_cache_user_key ON meal_cache(user_id, cache_key) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE meal_cache ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own meal cache"
  ON meal_cache FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service can insert meal cache"
  ON meal_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can delete expired meal cache"
  ON meal_cache FOR DELETE
  USING (expires_at < NOW());

-- Update comment
COMMENT ON COLUMN meal_cache.user_id IS 'User who generated this plan (NULL for legacy shared cache)';
COMMENT ON COLUMN meal_cache.expires_at IS 'Cache entry expires after 7 days (meals get stale faster)';

-- ============================================================================
-- AUTOMATIC CACHE CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE (
  deleted_workouts INTEGER,
  deleted_meals INTEGER,
  freed_space_mb DECIMAL
) AS $$
DECLARE
  v_deleted_workouts INTEGER;
  v_deleted_meals INTEGER;
  v_freed_space BIGINT;
BEGIN
  -- Delete expired workout cache
  WITH deleted AS (
    DELETE FROM workout_cache
    WHERE expires_at < NOW()
    RETURNING pg_column_size(workout_data) as size
  )
  SELECT COUNT(*), COALESCE(SUM(size), 0)
  INTO v_deleted_workouts, v_freed_space
  FROM deleted;

  -- Delete expired meal cache
  WITH deleted AS (
    DELETE FROM meal_cache
    WHERE expires_at < NOW()
    RETURNING pg_column_size(meal_data) as size
  )
  SELECT COUNT(*), COALESCE(SUM(size), 0) + v_freed_space
  INTO v_deleted_meals, v_freed_space
  FROM deleted;

  -- Return results
  RETURN QUERY SELECT
    v_deleted_workouts,
    v_deleted_meals,
    (v_freed_space / 1024.0 / 1024.0)::DECIMAL(10,2) as freed_space_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Delete expired cache entries - run daily via cron';

-- ============================================================================
-- CACHE HIT TRACKING UPDATE
-- ============================================================================

-- Update hit tracking to also update last_accessed timestamp
CREATE OR REPLACE FUNCTION increment_cache_hit(
  p_table TEXT,
  p_cache_key TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_table = 'workout_cache' THEN
    UPDATE workout_cache
    SET
      hit_count = hit_count + 1,
      last_accessed = NOW()
    WHERE cache_key = p_cache_key;
  ELSIF p_table = 'meal_cache' THEN
    UPDATE meal_cache
    SET
      hit_count = hit_count + 1,
      last_accessed = NOW()
    WHERE cache_key = p_cache_key;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_cache_hit IS 'Increment cache hit counter and update last_accessed timestamp';

-- ============================================================================
-- CACHE STATISTICS VIEW
-- ============================================================================

-- View for cache performance monitoring
CREATE OR REPLACE VIEW cache_statistics AS
SELECT
  'workout' as cache_type,
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count)::DECIMAL(10,2) as avg_hits_per_entry,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
  pg_size_pretty(pg_total_relation_size('workout_cache')) as total_size
FROM workout_cache
UNION ALL
SELECT
  'meal' as cache_type,
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count)::DECIMAL(10,2) as avg_hits_per_entry,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
  pg_size_pretty(pg_total_relation_size('meal_cache')) as total_size
FROM meal_cache;

COMMENT ON VIEW cache_statistics IS 'Real-time cache performance metrics for monitoring';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- NOTE: This migration is backward-compatible
-- - Existing cache entries will have user_id = NULL (shared cache)
-- - Existing cache entries will get expires_at = NOW() + 30/7 days
-- - New cache entries SHOULD include user_id for privacy and rate limiting

-- TODO: After deploying this migration, update app code to:
-- 1. Always pass user_id when creating cache entries
-- 2. Check cache expiration before serving
-- 3. Call increment_cache_hit() when serving from cache

-- DEPLOYMENT: Run this migration ASAP to prevent cache pollution
