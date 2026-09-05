-- Supabase-backed persistence for savedMealsStore's reusable meal templates.
--
-- Decision: extend the existing AsyncStorage-only savedMealsStore
-- (src/stores/savedMealsStore.ts) rather than adding a parallel
-- `custom_meal_templates` concept — savedMealsStore already implements this
-- feature (name, mealType, ingredients, totals) and its own header names
-- Supabase sync as the deliberate next step ("When a table is added later,
-- wire it through a savedMealsDataService"). Column names mirror the
-- `SavedMeal` interface exactly (savedMealsStore.ts:35-46) so the sync layer
-- is a straight field-for-field mapping.
--
-- meal_type CHECK uses the 6-value MealType from src/types/diet.ts:149-157,
-- not the narrower 4-value local alias in nutritionStore.ts:151 — this is
-- the type diet builder templates should standardize on.

CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (
    meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')
  ),
  ingredients JSONB NOT NULL DEFAULT '[]',
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_carbs NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_fat NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_fiber NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON saved_meals(user_id, meal_type);

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

-- DROP IF EXISTS before CREATE so this migration is safe to re-run
-- (project pattern, see 20260727000005_add_with_check_to_all_policies.sql).
DROP POLICY IF EXISTS "Users can manage their own saved_meals" ON saved_meals;
CREATE POLICY "Users can manage their own saved_meals"
  ON saved_meals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
