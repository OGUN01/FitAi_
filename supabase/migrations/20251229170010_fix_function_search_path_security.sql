-- Fix search_path mutable security issues for all affected functions in public schema
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- This addresses security warnings where functions don't have search_path set, which can lead to
-- privilege escalation attacks through search_path manipulation

-- 1. Fix update_chat_message_updated_at
CREATE OR REPLACE FUNCTION public.update_chat_message_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2. Fix get_conversation_context
CREATE OR REPLACE FUNCTION public.get_conversation_context(
  p_conversation_id uuid,
  p_max_messages integer DEFAULT 20,
  p_max_tokens integer DEFAULT 4000
)
RETURNS TABLE(
  id uuid,
  role text,
  content text,
  message_index integer,
  tokens_used integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.role,
    cm.content,
    cm.message_index,
    cm.tokens_used,
    cm.created_at
  FROM public.chat_messages cm
  WHERE cm.conversation_id = p_conversation_id
  ORDER BY cm.message_index DESC
  LIMIT p_max_messages;
END;
$function$;

-- 3. Fix cleanup_old_conversations
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations(p_days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.chat_messages
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$function$;

-- 4. Fix cleanup_old_cache
CREATE OR REPLACE FUNCTION public.cleanup_old_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 5. Fix get_cache_stats
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE(
  table_name text,
  total_entries bigint,
  total_hits bigint,
  avg_hits_per_entry numeric,
  oldest_entry timestamp without time zone,
  newest_entry timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 6. Fix get_generation_costs
CREATE OR REPLACE FUNCTION public.get_generation_costs(
  p_start_date timestamp without time zone DEFAULT (now() - '30 days'::interval),
  p_end_date timestamp without time zone DEFAULT now()
)
RETURNS TABLE(
  generation_type text,
  model_used text,
  total_generations bigint,
  total_cost_usd numeric,
  avg_cost_usd numeric,
  total_tokens bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 7. Fix update_updated_at_column (public schema)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Add comments documenting the security fix
COMMENT ON FUNCTION public.update_chat_message_updated_at() IS 'Trigger function to update updated_at timestamp. search_path set to public for security (prevents search_path manipulation attacks).';
COMMENT ON FUNCTION public.get_conversation_context(uuid, integer, integer) IS 'Retrieves conversation context with message history. search_path set to public for security.';
COMMENT ON FUNCTION public.cleanup_old_conversations(integer) IS 'Removes old conversation messages. search_path set to public for security.';
COMMENT ON FUNCTION public.cleanup_old_cache() IS 'Cleans up old cache entries. search_path set to public for security.';
COMMENT ON FUNCTION public.get_cache_stats() IS 'Returns cache statistics. search_path set to public for security.';
COMMENT ON FUNCTION public.get_generation_costs(timestamp without time zone, timestamp without time zone) IS 'Returns generation cost analytics. search_path set to public for security.';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function to update updated_at timestamp. search_path set to public for security.';
