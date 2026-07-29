-- Second diet_type check constraint (legacy auto-named
-- diet_preferences_diet_type_check) lags by one value: 'mediterranean'.
-- Found during cold-user E2E after enabling 'balanced' — two parallel CHECKs
-- exist on the column; the older one rejected 'mediterranean' inserts.
--
-- Align both to the same enum. Append-only / idempotent / widening-safe.

ALTER TABLE diet_preferences DROP CONSTRAINT IF EXISTS diet_preferences_diet_type_check;

ALTER TABLE diet_preferences ADD CONSTRAINT diet_preferences_diet_type_check
  CHECK (diet_type IN (
    'vegetarian',
    'vegan',
    'non-veg',
    'non_veg',
    'pescatarian',
    'keto',
    'omnivore',
    'balanced',
    'mediterranean',
    'paleo'
  ));
