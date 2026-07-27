-- ============================================================================
-- Migration: 20260727000001_add_meal_logs_total_columns.sql
-- ============================================================================
-- Purpose: Add the total_* macro columns that nutritionData.ts writes.
--
-- Background: src/services/nutritionData.ts:498-501 (and :593-596, :755-758)
-- inserts/updates meal_logs with total_calories, total_protein,
-- total_carbohydrates, and total_fat. The table (created in
-- 20250129000002_add_session_log_tables.sql) only has per-nutrient columns
-- (calories, protein_g, carbs_g, fat_g), so these writes silently fail /
-- get dropped by Supabase. The generated types already include these
-- columns, confirming they exist in the live DB — this migration makes the
-- schema reproducible from migrations on a fresh deploy.
--
-- Safe to re-run: IF NOT EXISTS is a no-op when columns already exist.
-- ============================================================================

ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS total_calories NUMERIC;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS total_protein NUMERIC;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS total_carbohydrates NUMERIC;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS total_fat NUMERIC;
