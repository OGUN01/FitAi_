CREATE TABLE IF NOT EXISTS public.meal_recognition_metadata (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id          uuid REFERENCES public.meals(id) ON DELETE CASCADE,
  recognition_data jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_recognition_metadata_meal_id
  ON public.meal_recognition_metadata(meal_id);

CREATE INDEX IF NOT EXISTS idx_meal_recognition_metadata_created_at
  ON public.meal_recognition_metadata(created_at DESC);

ALTER TABLE public.meal_recognition_metadata ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_recognition_metadata'
      AND policyname = 'users_own_recognition_metadata'
  ) THEN
    CREATE POLICY "users_own_recognition_metadata"
      ON public.meal_recognition_metadata FOR ALL
      USING (
        meal_id IN (SELECT id FROM public.meals WHERE user_id = auth.uid())
      );
  END IF;
END
$$;
