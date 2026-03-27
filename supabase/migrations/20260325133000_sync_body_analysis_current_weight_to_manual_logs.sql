-- Keep body_analysis.current_weight_kg aligned with the latest manual log.
-- Manual weight logs in progress_entries are the canonical source of truth.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_latest_manual_weight_kg(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT pe.weight_kg
  FROM public.progress_entries pe
  WHERE pe.user_id = p_user_id
    AND pe.weight_kg IS NOT NULL
  ORDER BY pe.entry_date DESC, pe.updated_at DESC, pe.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_manual_weight_on_body_analysis()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  latest_manual_weight NUMERIC;
BEGIN
  latest_manual_weight := public.get_latest_manual_weight_kg(NEW.user_id);

  IF latest_manual_weight IS NOT NULL THEN
    NEW.current_weight_kg := latest_manual_weight;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS body_analysis_enforce_manual_weight ON public.body_analysis;

CREATE TRIGGER body_analysis_enforce_manual_weight
BEFORE INSERT OR UPDATE OF current_weight_kg
ON public.body_analysis
FOR EACH ROW
EXECUTE FUNCTION public.enforce_manual_weight_on_body_analysis();

CREATE OR REPLACE FUNCTION public.sync_body_analysis_current_weight_from_progress_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.weight_kg IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.body_analysis
  SET
    current_weight_kg = NEW.weight_kg,
    updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND current_weight_kg IS DISTINCT FROM NEW.weight_kg;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS progress_entries_sync_body_analysis_current_weight
ON public.progress_entries;

CREATE TRIGGER progress_entries_sync_body_analysis_current_weight
AFTER INSERT OR UPDATE OF weight_kg
ON public.progress_entries
FOR EACH ROW
WHEN (NEW.weight_kg IS NOT NULL)
EXECUTE FUNCTION public.sync_body_analysis_current_weight_from_progress_entries();

UPDATE public.body_analysis ba
SET
  current_weight_kg = latest.weight_kg,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    weight_kg
  FROM public.progress_entries
  WHERE weight_kg IS NOT NULL
  ORDER BY user_id, entry_date DESC, updated_at DESC, created_at DESC
) latest
WHERE ba.user_id = latest.user_id
  AND ba.current_weight_kg IS DISTINCT FROM latest.weight_kg;

COMMIT;
