-- Fix: snacks_count DEFAULT was 2 but UI only has 1 snack toggle
ALTER TABLE public.diet_preferences ALTER COLUMN snacks_count SET DEFAULT 1;

-- Fix existing rows that were set to 2 by the bad default
UPDATE public.diet_preferences SET snacks_count = 1 WHERE snacks_count = 2;
