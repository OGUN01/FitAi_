-- Allow authenticated users to insert new foods (shared catalog for AI-recognized foods)
-- Idempotent: drop first since CREATE POLICY has no IF NOT EXISTS
DROP POLICY IF EXISTS "Authenticated users can insert foods" ON public.foods;
CREATE POLICY "Authenticated users can insert foods"
  ON public.foods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
