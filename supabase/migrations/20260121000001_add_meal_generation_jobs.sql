-- ============================================================================
-- ASYNC MEAL GENERATION JOBS TABLE
-- ============================================================================
-- Purpose: Track async job lifecycle for meal plan generation
-- Author: AI Assistant
-- Date: 2026-01-21
-- ============================================================================

-- Create the job tracking table
CREATE TABLE IF NOT EXISTS meal_generation_jobs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference (required)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Job lifecycle status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  
  -- Request fingerprint (for deduplication & cache lookup)
  cache_key TEXT NOT NULL,
  
  -- Generation parameters (serialized request)
  generation_params JSONB NOT NULL,
  
  -- Result tracking
  meal_plan_id UUID REFERENCES user_meal_plans(id) ON DELETE SET NULL,
  result_data JSONB,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 1,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  
  -- Performance tracking
  generation_time_ms INTEGER,
  ai_model TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by user + status (most common query)
CREATE INDEX idx_meal_jobs_user_status 
  ON meal_generation_jobs(user_id, status);

-- Fast lookup by cache key (for deduplication check)
CREATE INDEX idx_meal_jobs_cache_key 
  ON meal_generation_jobs(cache_key);

-- Fast lookup for queue processing
CREATE INDEX idx_meal_jobs_status_created 
  ON meal_generation_jobs(status, created_at);

-- Cleanup expired jobs
CREATE INDEX idx_meal_jobs_expires 
  ON meal_generation_jobs(expires_at) 
  WHERE status IN ('pending', 'processing');

-- Prevent duplicate active jobs per user
CREATE UNIQUE INDEX idx_meal_jobs_user_active 
  ON meal_generation_jobs(user_id) 
  WHERE status IN ('pending', 'processing');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE meal_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON meal_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for worker operations)
CREATE POLICY "Service role full access"
  ON meal_generation_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_meal_jobs()
RETURNS void AS $$
BEGIN
  -- Delete expired jobs older than 24 hours
  DELETE FROM meal_generation_jobs
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  -- Mark stale processing jobs as failed (stuck > 10 minutes)
  UPDATE meal_generation_jobs
  SET 
    status = 'failed',
    error_code = 'JOB_TIMEOUT',
    error_message = 'Job timed out after 10 minutes',
    completed_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
