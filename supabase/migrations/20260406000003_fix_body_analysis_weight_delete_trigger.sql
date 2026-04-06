-- When a progress_entries row is deleted, recalculate body_analysis.current_weight_kg
-- from the most recent remaining entry for that user.
-- If no weight entries remain, set current_weight_kg to NULL.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_body_analysis_current_weight_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  latest_weight NUMERIC;
BEGIN
  SELECT pe.weight_kg
  INTO latest_weight
  FROM public.progress_entries pe
  WHERE pe.user_id = OLD.user_id
    AND pe.weight_kg IS NOT NULL
  ORDER BY pe.entry_date DESC, pe.updated_at DESC, pe.created_at DESC
  LIMIT 1;

  UPDATE public.body_analysis
  SET
    current_weight_kg = latest_weight,
    updated_at = NOW()
  WHERE user_id = OLD.user_id
    AND current_weight_kg IS DISTINCT FROM latest_weight;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS progress_entries_sync_body_analysis_current_weight_delete
  ON public.progress_entries;

CREATE TRIGGER progress_entries_sync_body_analysis_current_weight_delete
AFTER DELETE ON public.progress_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_body_analysis_current_weight_on_delete();

COMMIT;
