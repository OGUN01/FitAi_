-- Add portion_multiplier column to meal_logs
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS portion_multiplier numeric DEFAULT 1;
