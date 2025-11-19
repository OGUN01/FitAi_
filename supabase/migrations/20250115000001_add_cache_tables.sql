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
