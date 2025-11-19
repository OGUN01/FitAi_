-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Migration: Enable RLS and create security policies
-- Created: 2025-11-14
-- Description: Secure database access with row-level security policies

-- Enable RLS on new tables
ALTER TABLE workout_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CACHE TABLES POLICIES
-- ============================================

-- Cache tables: Read-only for authenticated users
CREATE POLICY "Authenticated users can read workout cache"
  ON workout_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read meal cache"
  ON meal_cache FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write to cache tables
CREATE POLICY "Service role can write workout cache"
  ON workout_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can write meal cache"
  ON meal_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MEDIA TABLES POLICIES
-- ============================================

-- Media tables: Public read access
CREATE POLICY "Anyone can read exercise media"
  ON exercise_media FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read diet media"
  ON diet_media FOR SELECT
  USING (true);

-- Service role can write media
CREATE POLICY "Service role can write exercise media"
  ON exercise_media FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can write diet media"
  ON diet_media FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- LOGGING TABLES POLICIES
-- ============================================

-- Users can only view their own logs
CREATE POLICY "Users can view own api logs"
  ON api_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only view their own generation history
CREATE POLICY "Users can view own generation history"
  ON generation_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can write all logs
CREATE POLICY "Service role can write api logs"
  ON api_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can write generation history"
  ON generation_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- EXISTING TABLES UPDATES
-- ============================================

-- Add cache references to existing workout_sessions table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workout_sessions') THEN
    ALTER TABLE workout_sessions
      ADD COLUMN IF NOT EXISTS cache_id UUID REFERENCES workout_cache(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add cache references to existing meals table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meals') THEN
    ALTER TABLE meals
      ADD COLUMN IF NOT EXISTS cache_id UUID REFERENCES meal_cache(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES generation_history(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add media preferences to existing profiles table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS media_preference TEXT DEFAULT 'both' CHECK (media_preference IN ('animation', 'human', 'both')),
      ADD COLUMN IF NOT EXISTS data_usage_mode TEXT DEFAULT 'wifi_only' CHECK (data_usage_mode IN ('wifi_only', 'always')),
      ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('guest', 'free', 'premium', 'enterprise'));
  END IF;
END $$;

-- Comments
COMMENT ON POLICY "Authenticated users can read workout cache" ON workout_cache IS 'All authenticated users can read cached workouts to improve performance';
COMMENT ON POLICY "Service role can write workout cache" ON workout_cache IS 'Only backend Workers can write to cache (via service role key)';
