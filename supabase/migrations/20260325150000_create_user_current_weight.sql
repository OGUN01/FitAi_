BEGIN;

CREATE TABLE IF NOT EXISTS public.user_current_weight (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 30 AND weight_kg <= 300),
  source TEXT NOT NULL DEFAULT 'manual_log' CHECK (source = 'manual_log'),
  entry_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_current_weight_entry_date
  ON public.user_current_weight(entry_date DESC);

ALTER TABLE public.user_current_weight ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own user_current_weight"
  ON public.user_current_weight;

CREATE POLICY "Users can manage their own user_current_weight"
  ON public.user_current_weight
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_current_weight_updated_at
  ON public.user_current_weight;

CREATE TRIGGER update_user_current_weight_updated_at
  BEFORE UPDATE ON public.user_current_weight
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_user_current_weight(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  latest_entry RECORD;
BEGIN
  SELECT
    pe.entry_date,
    pe.weight_kg,
    COALESCE(pe.updated_at, pe.created_at, NOW()) AS recorded_at
  INTO latest_entry
  FROM public.progress_entries pe
  WHERE pe.user_id = p_user_id
    AND pe.weight_kg IS NOT NULL
  ORDER BY pe.entry_date DESC, pe.updated_at DESC, pe.created_at DESC
  LIMIT 1;

  IF latest_entry IS NULL THEN
    DELETE FROM public.user_current_weight
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  INSERT INTO public.user_current_weight (
    user_id,
    weight_kg,
    source,
    entry_date,
    recorded_at
  )
  VALUES (
    p_user_id,
    latest_entry.weight_kg,
    'manual_log',
    latest_entry.entry_date,
    latest_entry.recorded_at
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    weight_kg = EXCLUDED.weight_kg,
    source = EXCLUDED.source,
    entry_date = EXCLUDED.entry_date,
    recorded_at = EXCLUDED.recorded_at,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_current_weight_from_progress_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_user_current_weight(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS progress_entries_sync_user_current_weight
  ON public.progress_entries;

CREATE TRIGGER progress_entries_sync_user_current_weight
  AFTER INSERT OR UPDATE OR DELETE
  ON public.progress_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_current_weight_from_progress_entries();

INSERT INTO public.user_current_weight (
  user_id,
  weight_kg,
  source,
  entry_date,
  recorded_at
)
SELECT DISTINCT ON (pe.user_id)
  pe.user_id,
  pe.weight_kg,
  'manual_log',
  pe.entry_date,
  COALESCE(pe.updated_at, pe.created_at, NOW()) AS recorded_at
FROM public.progress_entries pe
WHERE pe.weight_kg IS NOT NULL
ORDER BY pe.user_id, pe.entry_date DESC, pe.updated_at DESC, pe.created_at DESC
ON CONFLICT (user_id) DO UPDATE
SET
  weight_kg = EXCLUDED.weight_kg,
  source = EXCLUDED.source,
  entry_date = EXCLUDED.entry_date,
  recorded_at = EXCLUDED.recorded_at,
  updated_at = NOW();

COMMIT;
