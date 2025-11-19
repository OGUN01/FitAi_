-- ============================================
-- AI GENERATION CACHE TABLES
-- ============================================
-- Migration: Add cache tables for workout and meal plans
-- Created: 2025-11-14
-- Description: Stores cached AI-generated workout and meal plans to reduce API costs

-- Cached workout plans
CREATE TABLE IF NOT EXISTS workout_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  workout_data JSONB NOT NULL,

  -- Metadata
  model_used TEXT,
  generation_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),

  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cached meal/diet plans
CREATE TABLE IF NOT EXISTS meal_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  meal_data JSONB NOT NULL,

  -- Metadata
  model_used TEXT,
  generation_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),

  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_cache_key ON workout_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_workout_last_accessed ON workout_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_meal_cache_key ON meal_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_meal_last_accessed ON meal_cache(last_accessed);

-- Comments
COMMENT ON TABLE workout_cache IS 'Cached AI-generated workout plans for cost optimization';
COMMENT ON TABLE meal_cache IS 'Cached AI-generated meal plans for cost optimization';
COMMENT ON COLUMN workout_cache.cache_key IS 'Deterministic hash of request parameters';
COMMENT ON COLUMN meal_cache.cache_key IS 'Deterministic hash of request parameters';
COMMENT ON COLUMN workout_cache.hit_count IS 'Number of times this cache entry was served';
COMMENT ON COLUMN meal_cache.hit_count IS 'Number of times this cache entry was served';
-- ============================================
-- MEDIA REGISTRY TABLES
-- ============================================
-- Migration: Add media tables for exercise and diet content
-- Created: 2025-11-14
-- Description: Tracks exercise animations/videos and diet images stored in R2

-- Exercise media (animations + human demos)
CREATE TABLE IF NOT EXISTS exercise_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_name TEXT NOT NULL,
  exercise_id TEXT,

  -- Media URLs
  animation_url TEXT,
  human_video_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  duration_seconds INTEGER,
  file_size_kb INTEGER,
  source TEXT,
  source_url TEXT,

  -- Quality metrics
  video_quality TEXT,
  fps INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(exercise_name, source)
);

-- Diet/food media
CREATE TABLE IF NOT EXISTS diet_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_name TEXT NOT NULL,
  food_id TEXT,

  -- Media URLs
  image_url TEXT,
  video_url TEXT,
  recipe_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  source TEXT,
  cuisine_type TEXT,
  meal_type TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(food_name, source)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_exercise_media_name ON exercise_media(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_media_source ON exercise_media(source);
CREATE INDEX IF NOT EXISTS idx_diet_media_name ON diet_media(food_name);
CREATE INDEX IF NOT EXISTS idx_diet_media_source ON diet_media(source);
CREATE INDEX IF NOT EXISTS idx_diet_media_meal_type ON diet_media USING GIN(meal_type);

-- Comments
COMMENT ON TABLE exercise_media IS 'Registry of exercise media (animations and human demonstrations)';
COMMENT ON TABLE diet_media IS 'Registry of diet/food media (images and recipe videos)';
COMMENT ON COLUMN exercise_media.source IS 'Media source: r2, pexels, pixabay, youtube';
COMMENT ON COLUMN diet_media.source IS 'Media source: spoonacular, edamam, unsplash, youtube';
COMMENT ON COLUMN diet_media.meal_type IS 'Array of meal types: breakfast, lunch, dinner, snack';
-- ============================================
-- LOGGING & ANALYTICS TABLES
-- ============================================
-- Migration: Add logging and analytics tables
-- Created: 2025-11-14
-- Description: Tracks API usage, performance metrics, and AI generation history

-- API usage logs
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Request info
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,

  -- Response info
  status_code INTEGER,
  response_time_ms INTEGER,

  -- Cache info
  cache_hit BOOLEAN DEFAULT false,
  cache_source TEXT,

  -- AI info (if applicable)
  model_used TEXT,
  tokens_used INTEGER,
  credits_used DECIMAL(10, 6),

  -- Error info
  error_message TEXT,
  error_code TEXT,

  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  request_id TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Generation history (track all AI generations)
CREATE TABLE IF NOT EXISTS generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User info
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Generation info
  generation_type TEXT NOT NULL,
  input_params JSONB NOT NULL,
  output_data JSONB NOT NULL,

  -- AI info
  model_used TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd DECIMAL(10, 6),

  -- Quality metrics
  generation_time_ms INTEGER,
  user_rating INTEGER,
  user_feedback TEXT,

  -- Cache info
  cache_key TEXT,
  was_cached BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_cache_hit ON api_logs(cache_hit);
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_type ON generation_history(generation_type);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at);

-- Comments
COMMENT ON TABLE api_logs IS 'API request and response logging for monitoring and debugging';
COMMENT ON TABLE generation_history IS 'Complete history of all AI generations with cost tracking';
COMMENT ON COLUMN api_logs.cache_source IS 'Cache layer that served the request: kv, database, client, or null';
COMMENT ON COLUMN generation_history.generation_type IS 'Type of generation: workout, meal, or chat';
COMMENT ON COLUMN generation_history.user_rating IS '1-5 star rating provided by user (optional)';
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
