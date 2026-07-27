-- ============================================================================
-- Migration: 20260727000005_add_with_check_to_all_policies.sql
-- ============================================================================
-- Purpose: Add WITH CHECK clauses to user-scoped FOR ALL policies that
-- currently only have USING. Without WITH CHECK, a user can INSERT or
-- UPDATE a row with a spoofed user_id (e.g. another user's id) and the
-- policy will not block it — the row becomes readable by the wrong user.
-- Per Supabase best practice, FOR ALL policies should specify BOTH
-- USING (filters rows visible on SELECT/UPDATE/DELETE) and WITH CHECK
-- (validates rows on INSERT/UPDATE).
--
-- Pattern: DROP existing policy by exact name, recreate with same name and
-- same USING plus WITH CHECK. DROP IF EXISTS makes this safe to re-run.
--
-- Policy names confirmed by reading the originating migrations:
--   20260124000001_add_missing_data_tables.sql  (most tables)
--   20260226000001_add_workout_sessions_table.sql (workout_sessions)
--   20260326000001_create_exercise_sets.sql       (exercise_sets)
--   20260326000002_create_exercise_prs.sql        (exercise_prs)
--   20260326000003_create_workout_templates.sql   (workout_templates)
--
-- NOTE: 3 policy names differ from the original audit brief. The brief
-- listed hypothetical "Users can manage their own <table>" names for
-- user_achievements / weekly_workout_plans / weekly_meal_plans, but the
-- actual created policy names are:
--   user_achievements    -> "Users can manage their own achievements"
--   weekly_workout_plans -> "Users can manage their own workout_plans"
--   weekly_meal_plans    -> "Users can manage their own meal_plans"
-- We DROP/CREATE using the ACTUAL names so the migration applies correctly.
-- ============================================================================

-- workout_sessions (policy from 20260226000001)
DROP POLICY IF EXISTS "Users can manage their own workout_sessions" ON workout_sessions;
CREATE POLICY "Users can manage their own workout_sessions"
  ON workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- exercise_sets (policy from 20260326000001)
DROP POLICY IF EXISTS "Users can manage own exercise sets" ON exercise_sets;
CREATE POLICY "Users can manage own exercise sets"
  ON exercise_sets FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- exercise_prs (policy from 20260326000002)
DROP POLICY IF EXISTS "Users can manage own PRs" ON exercise_prs;
CREATE POLICY "Users can manage own PRs"
  ON exercise_prs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_templates (policy from 20260326000003)
DROP POLICY IF EXISTS "Users can manage own templates" ON workout_templates;
CREATE POLICY "Users can manage own templates"
  ON workout_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- fitness_goals (policy from 20260124000001)
DROP POLICY IF EXISTS "Users can manage their own fitness_goals" ON fitness_goals;
CREATE POLICY "Users can manage their own fitness_goals"
  ON fitness_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- water_logs
DROP POLICY IF EXISTS "Users can manage their own water_logs" ON water_logs;
CREATE POLICY "Users can manage their own water_logs"
  ON water_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- progress_entries
DROP POLICY IF EXISTS "Users can manage their own progress_entries" ON progress_entries;
CREATE POLICY "Users can manage their own progress_entries"
  ON progress_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- progress_goals
DROP POLICY IF EXISTS "Users can manage their own progress_goals" ON progress_goals;
CREATE POLICY "Users can manage their own progress_goals"
  ON progress_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- nutrition_goals
DROP POLICY IF EXISTS "Users can manage their own nutrition_goals" ON nutrition_goals;
CREATE POLICY "Users can manage their own nutrition_goals"
  ON nutrition_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_achievements (ACTUAL policy name is "Users can manage their own achievements")
DROP POLICY IF EXISTS "Users can manage their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can manage their own user_achievements" ON user_achievements;
CREATE POLICY "Users can manage their own achievements"
  ON user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- weekly_workout_plans (ACTUAL policy name is "Users can manage their own workout_plans")
DROP POLICY IF EXISTS "Users can manage their own workout_plans" ON weekly_workout_plans;
DROP POLICY IF EXISTS "Users can manage their own weekly_workout_plans" ON weekly_workout_plans;
CREATE POLICY "Users can manage their own workout_plans"
  ON weekly_workout_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- weekly_meal_plans (ACTUAL policy name is "Users can manage their own meal_plans")
DROP POLICY IF EXISTS "Users can manage their own meal_plans" ON weekly_meal_plans;
DROP POLICY IF EXISTS "Users can manage their own weekly_meal_plans" ON weekly_meal_plans;
CREATE POLICY "Users can manage their own meal_plans"
  ON weekly_meal_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- food_recognition_feedback
DROP POLICY IF EXISTS "Users can manage their own food_recognition_feedback" ON food_recognition_feedback;
CREATE POLICY "Users can manage their own food_recognition_feedback"
  ON food_recognition_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- app_events
DROP POLICY IF EXISTS "Users can manage their own app_events" ON app_events;
CREATE POLICY "Users can manage their own app_events"
  ON app_events FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- meal_foods (policy uses an EXISTS subquery against meals — kept in BOTH
-- USING and WITH CHECK so an inserted meal_food must belong to a meal the
-- user owns)
DROP POLICY IF EXISTS "Users can manage meal_foods for their meals" ON meal_foods;
CREATE POLICY "Users can manage meal_foods for their meals"
  ON meal_foods FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_foods.meal_id AND meals.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_foods.meal_id AND meals.user_id = auth.uid())
  );
