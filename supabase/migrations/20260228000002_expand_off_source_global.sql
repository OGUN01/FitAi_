-- Migration: Expand off_source CHECK constraint to include global values
-- Adds 'off-parquet-global' and 'off-delta-global' as valid off_source values
-- Required by Task 5 (bulk import) and Task 8 (delta sync)

ALTER TABLE off_products DROP CONSTRAINT IF EXISTS off_products_off_source_check;
ALTER TABLE off_products ADD CONSTRAINT off_products_off_source_check
  CHECK (off_source IN ('off-parquet-india', 'off-parquet-global', 'off-api-live', 'off-delta', 'off-delta-global'));

COMMENT ON TABLE off_products IS 'Open Food Facts global product catalogue — sourced from parquet snapshots (India + global), live API lookups, and incremental delta syncs.';
