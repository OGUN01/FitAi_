-- Migration: Remove cuisine_preferences column from diet_preferences table
-- Date: 2025-10-06
-- Description: Remove redundant cuisine_preferences field since cuisine can be inferred from location data

-- Step 1: Remove the column from the diet_preferences table
ALTER TABLE diet_preferences DROP COLUMN IF EXISTS cuisine_preferences;

-- Step 2: Remove any constraints related to cuisine_preferences (if they exist)
-- Note: Check if there are any specific constraints on this column first
-- You can run this query to check: 
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
-- WHERE table_name = 'diet_preferences' AND constraint_name LIKE '%cuisine%';

-- Step 3: Update any indexes that might reference this column (if they exist)
-- Note: Check for indexes first with:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'diet_preferences' AND indexdef LIKE '%cuisine_preferences%';

-- Step 4: Clean up any existing data references (this step is optional since we're dropping the column)
-- The column drop will automatically remove all data

-- Verification queries to run after migration:
-- 1. Verify column is removed:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'diet_preferences';
-- 
-- 2. Verify no constraints reference the old column:
-- SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'diet_preferences';

COMMIT;
