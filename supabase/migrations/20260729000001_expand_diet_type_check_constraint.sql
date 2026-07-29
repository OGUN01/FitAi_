-- Fix schema/code divergence on diet_preferences.diet_type (CLAUDE.md rule #4)
--
-- Live check_diet_type accepted only: vegetarian | vegan | non-veg | pescatarian |
-- keto | omnivore. The onboarding Tab 2 form and downstream services legitimately
-- produce 'balanced' (UI enum), which the constraint rejected with 23514 — silently
-- dropping the entire cold-user onboarding save chain after profiles.
--
-- Verifier query used to probe the live constraint (service role):
--   insert 'omnivore' -> OK; insert 'balanced' -> REJECTED.
--
-- Append-only + idempotent: drop-and-recreate the check with the full enum.
-- Widening a CHECK never breaks existing rows (existing values already conform).

ALTER TABLE diet_preferences DROP CONSTRAINT IF EXISTS check_diet_type;

ALTER TABLE diet_preferences ADD CONSTRAINT check_diet_type
  CHECK (diet_type IN (
    'vegetarian',
    'vegan',
    'non-veg',
    'non_veg',      -- legacy alternate spelling kept from old SyncEngine default
    'pescatarian',
    'keto',
    'omnivore',
    'balanced',     -- onboarding Tab 2 form option (the 23514 row that failed cold-user E2E)
    'mediterranean',-- diet-readiness specialization can promote to diet_type later
    'paleo'         -- same future-proofing
  ));
