ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS logging_mode TEXT
    CHECK (logging_mode IN ('barcode', 'label', 'meal_photo', 'manual')),
  ADD COLUMN IF NOT EXISTS truth_level TEXT
    CHECK (truth_level IN ('authoritative', 'curated', 'estimated')),
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS country_context TEXT,
  ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.meal_logs
SET
  logging_mode = COALESCE(logging_mode, 'manual'),
  truth_level = COALESCE(truth_level, 'curated'),
  requires_review = COALESCE(requires_review, FALSE)
WHERE logging_mode IS NULL
   OR truth_level IS NULL;

ALTER TABLE public.meal_recognition_metadata
  ADD COLUMN IF NOT EXISTS meal_log_id UUID REFERENCES public.meal_logs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_meal_logs_logging_mode
  ON public.meal_logs(logging_mode);

CREATE INDEX IF NOT EXISTS idx_meal_logs_requires_review
  ON public.meal_logs(user_id, requires_review);

CREATE INDEX IF NOT EXISTS idx_meal_recognition_metadata_meal_log_id
  ON public.meal_recognition_metadata(meal_log_id);

COMMENT ON COLUMN public.meal_logs.logging_mode IS 'Source of the logged meal: barcode, label, meal_photo, or manual';
COMMENT ON COLUMN public.meal_logs.truth_level IS 'How trustworthy the nutrition values are: authoritative, curated, or estimated';
COMMENT ON COLUMN public.meal_logs.source_metadata IS 'Structured provenance metadata including product identity and barcode-vs-label conflict details';
