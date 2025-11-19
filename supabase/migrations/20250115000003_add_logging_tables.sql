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
