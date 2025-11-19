-- FitAI Workers - Analytics Summary Table
-- Provides aggregated metrics for data-driven optimization

-- Create analytics_summary table
CREATE TABLE IF NOT EXISTS public.analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),

  -- Request metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  cached_requests INTEGER NOT NULL DEFAULT 0,
  deduplicated_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,

  -- Cache performance
  kv_cache_hits INTEGER NOT NULL DEFAULT 0,
  db_cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_hit_rate DECIMAL(5,2), -- Percentage (0-100)

  -- Model usage
  model_usage JSONB NOT NULL DEFAULT '{}', -- { "model_name": count }

  -- Cost tracking
  total_tokens_used BIGINT NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  avg_cost_per_request_usd DECIMAL(10,4),

  -- Generation performance
  avg_generation_time_ms INTEGER,
  p95_generation_time_ms INTEGER,
  p99_generation_time_ms INTEGER,

  -- Popular filters/requests
  popular_workout_types JSONB DEFAULT '[]',
  popular_diet_preferences JSONB DEFAULT '[]',

  -- Deduplication savings
  deduplication_savings_usd DECIMAL(10,4) DEFAULT 0,

  UNIQUE (period_start, period_end, period_type)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_period ON public.analytics_summary(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_period_type ON public.analytics_summary(period_type, period_start DESC);

-- Create a view for real-time analytics (last 24 hours)
CREATE OR REPLACE VIEW public.analytics_realtime AS
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE metadata->>'cached' = 'true') as cached_requests,
  COUNT(*) FILTER (WHERE metadata->>'deduplicated' = 'true') as deduplicated_requests,

  -- Cache hit rate
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE metadata->>'cached' = 'true') /
    NULLIF(COUNT(*), 0),
    2
  ) as cache_hit_rate,

  -- Model usage distribution
  jsonb_object_agg(
    COALESCE(metadata->>'model', 'unknown'),
    COUNT(*)
  ) FILTER (WHERE metadata->>'model' IS NOT NULL) as model_usage,

  -- Cost metrics
  SUM((metadata->>'tokensUsed')::BIGINT) FILTER (WHERE metadata->>'tokensUsed' IS NOT NULL) as total_tokens,
  SUM((metadata->>'costUsd')::DECIMAL) FILTER (WHERE metadata->>'costUsd' IS NOT NULL) as total_cost_usd,

  -- Performance metrics
  ROUND(AVG((metadata->>'generationTime')::INTEGER)) as avg_generation_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'generationTime')::INTEGER) as p95_generation_time_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (metadata->>'generationTime')::INTEGER) as p99_generation_time_ms
FROM public.workout_cache
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND metadata IS NOT NULL;

-- Grant permissions
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;

-- Allow service role to access everything
CREATE POLICY "Service role can access all analytics"
  ON public.analytics_summary
  FOR ALL
  TO service_role
  USING (true);

-- Allow authenticated users to read analytics (for admin dashboard)
CREATE POLICY "Authenticated users can read analytics"
  ON public.analytics_summary
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a function to aggregate analytics data
CREATE OR REPLACE FUNCTION public.aggregate_analytics(
  p_period_type TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
  v_total_requests INTEGER;
  v_cached_requests INTEGER;
  v_deduplicated_requests INTEGER;
  v_total_tokens BIGINT;
  v_total_cost DECIMAL;
BEGIN
  -- Aggregate data from workout_cache and meal_cache
  WITH combined_data AS (
    SELECT
      metadata,
      created_at
    FROM public.workout_cache
    WHERE created_at >= p_period_start
      AND created_at < p_period_end
      AND metadata IS NOT NULL

    UNION ALL

    SELECT
      metadata,
      created_at
    FROM public.meal_cache
    WHERE created_at >= p_period_start
      AND created_at < p_period_end
      AND metadata IS NOT NULL
  ),
  aggregated AS (
    SELECT
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE metadata->>'cached' = 'true') as cached_requests,
      COUNT(*) FILTER (WHERE metadata->>'deduplicated' = 'true') as deduplicated_requests,

      jsonb_object_agg(
        COALESCE(metadata->>'model', 'unknown'),
        COUNT(*)
      ) FILTER (WHERE metadata->>'model' IS NOT NULL) as model_usage,

      SUM((metadata->>'tokensUsed')::BIGINT) FILTER (WHERE metadata->>'tokensUsed' IS NOT NULL) as total_tokens,
      SUM((metadata->>'costUsd')::DECIMAL) FILTER (WHERE metadata->>'costUsd' IS NOT NULL) as total_cost_usd,

      ROUND(AVG((metadata->>'generationTime')::INTEGER)) as avg_generation_time_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'generationTime')::INTEGER) as p95_generation_time_ms,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (metadata->>'generationTime')::INTEGER) as p99_generation_time_ms
    FROM combined_data
  )
  INSERT INTO public.analytics_summary (
    period_start,
    period_end,
    period_type,
    total_requests,
    cached_requests,
    deduplicated_requests,
    cache_hit_rate,
    model_usage,
    total_tokens_used,
    total_cost_usd,
    avg_cost_per_request_usd,
    avg_generation_time_ms,
    p95_generation_time_ms,
    p99_generation_time_ms
  )
  SELECT
    p_period_start,
    p_period_end,
    p_period_type,
    total_requests,
    cached_requests,
    deduplicated_requests,
    ROUND(100.0 * cached_requests / NULLIF(total_requests, 0), 2),
    model_usage,
    total_tokens,
    total_cost_usd,
    ROUND(total_cost_usd / NULLIF(total_requests, 0), 4),
    avg_generation_time_ms,
    p95_generation_time_ms,
    p99_generation_time_ms
  FROM aggregated
  ON CONFLICT (period_start, period_end, period_type)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    cached_requests = EXCLUDED.cached_requests,
    deduplicated_requests = EXCLUDED.deduplicated_requests,
    cache_hit_rate = EXCLUDED.cache_hit_rate,
    model_usage = EXCLUDED.model_usage,
    total_tokens_used = EXCLUDED.total_tokens_used,
    total_cost_usd = EXCLUDED.total_cost_usd,
    avg_cost_per_request_usd = EXCLUDED.avg_cost_per_request_usd,
    avg_generation_time_ms = EXCLUDED.avg_generation_time_ms,
    p95_generation_time_ms = EXCLUDED.p95_generation_time_ms,
    p99_generation_time_ms = EXCLUDED.p99_generation_time_ms
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table and columns
COMMENT ON TABLE public.analytics_summary IS 'Aggregated analytics for FitAI Workers API usage, costs, and performance';
COMMENT ON COLUMN public.analytics_summary.cache_hit_rate IS 'Percentage of requests served from cache (0-100)';
COMMENT ON COLUMN public.analytics_summary.model_usage IS 'JSON object mapping model names to request counts';
COMMENT ON COLUMN public.analytics_summary.deduplication_savings_usd IS 'Estimated cost savings from request deduplication';
