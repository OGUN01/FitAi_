-- Add sugar_grams target to nutrition_goals
-- Sugar is tracked as a 5th macro alongside protein, carbs, fat, fiber
ALTER TABLE nutrition_goals ADD COLUMN IF NOT EXISTS sugar_grams INTEGER;
