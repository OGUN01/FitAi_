# Phase 2: Database-First Barcode Scanner — Full OFF Global + On-Device SQLite

## TL;DR

> **Quick Summary**: Transform FitAI's barcode scanner from an API-dependent pipeline into a database-first system. Ship the full Open Food Facts global dataset (~4.35M products) as a pre-built SQLite database on-device (~200-400 MB), backed by self-hosted Supabase PostgreSQL. External APIs become a fallback for unknown products only, with automatic cache-back to grow the database over time.
> 
> **Deliverables**:
> - Global OFF extraction pipeline (DuckDB Parquet → PostgreSQL → SQLite)
> - On-device SQLite database with ~4.35M products (~1.2-1.8M with nutrition data)
> - SQLite-first lookup in the React Native barcode scanning flow
> - Download-on-first-launch flow with `FileSystem.createDownloadResumable()`
> - User contribution UI (simple macro entry for "barcode not found")
> - Delta sync pipeline for weekly database updates
> - Pre-built SQLite hosted on Supabase Storage (or equivalent)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Schema migration → Global ETL → SQLite generator → Download flow → SQLite-first lookup → QA

---

## Context

### Original Request
User wants a database-first barcode scanner modeled after HealthifyMe and MyFitnessPal. The core principle is: **most barcode lookups should resolve from an on-device database without any API calls**. The user explicitly stated "we don't want layered approach we want that most of the thing done in the layer 1" and "without api just from the database lookup we can get the details."

### Interview Summary
**Key Discussions**:
- **Hosting**: User will self-host Supabase on a VPS (not managed Supabase Pro)
- **Device SQLite size**: Full OFF global dataset (~200-400 MB) — no concerns ("everybody have 5g in india so no problem")
- **User contribution**: Simple macro entry for "barcode not found" flow
- **Resolve function location**: Supabase Edge Functions for external API fallback logic
- **Test strategy**: Agent QA only (no formal unit tests)
- **GS1 India DataKart**: Ruled out — not viable as bulk download, nutrition data incomplete

**Research Findings**:
- HealthifyMe: Proprietary 10K+ Indian + 6M+ global foods, manually curated over 10+ years
- MyFitnessPal: 20.5M+ crowdsourced entries, 25-30% error rate
- OFF: 4.35M products globally, ~20K India-tagged, ~30-40% have NULL nutrition
- IFCT 2017: 528 traditional Indian foods, no barcodes, name-based only
- No single Indian government barcode→nutrition API exists
- `expo-sqlite ^15.2.14` already installed but unused for food data
- Existing schema (`off_products`, `ifct_foods`, `barcode_lookup_cache`, `v_barcode_lookup`, `lookup_barcode()`) already deployed

### Metis Review
**Identified Gaps** (addressed):
- `off_source` CHECK constraint only allows `'off-parquet-india' | 'off-api-live' | 'off-delta'` — needs `'off-parquet-global'` added
- `v_barcode_lookup` VIEW and `lookup_barcode()` RPC don't need changes — they query `off_products` generically
- Existing ETL scripts are India-only — need parallel global versions (don't break working India scripts)
- `expo-sqlite` already installed but needs initialization, migration, and query layer code
- No existing Supabase Storage bucket for hosting the pre-built SQLite file
- Download flow needs resumable downloads (not `downloadAsync` which has Android 60s timeout bug)
- Delta sync in `sync-off-india.mjs` filters for India only — global delta sync needed
- User contribution UI doesn't exist yet — needs screen + Supabase RPC integration

---

## Work Objectives

### Core Objective
Make barcode scanning work primarily from an on-device SQLite database containing the full Open Food Facts global dataset, with PostgreSQL as a secondary source and external APIs as a last resort.

### Concrete Deliverables
- `scripts/extract-off-global.mjs` — DuckDB extraction of ALL OFF products from Parquet
- `scripts/sync-off-global.mjs` — Bulk import + delta sync for global OFF data to Supabase PostgreSQL
- `scripts/build-sqlite.mjs` — Generate pre-built SQLite file from PostgreSQL for device download
- New Supabase migration — `off_source` constraint update + any schema tweaks for global scale
- `src/services/sqliteFood.ts` — On-device SQLite initialization, download, query layer
- Modified `src/services/barcodeService.ts` — SQLite-first lookup, then Supabase RPC, then API fallback
- `src/screens/ContributeFood.tsx` (or equivalent) — Simple macro entry UI for user contribution
- SQLite file hosted on Supabase Storage (or R2/VPS equivalent)
- `scripts/upload-sqlite.mjs` — Upload pre-built SQLite to hosting

### Definition of Done
- [ ] Barcode scan of a known OFF product resolves from device SQLite in <50ms without network
- [ ] SQLite database contains 1M+ products with nutrition data
- [ ] App downloads SQLite on first launch with progress indicator and resumable download
- [ ] Unknown barcodes fall back to Supabase → API → Gemini AI cascade
- [ ] API-resolved products are cached back to Supabase `barcode_lookup_cache`
- [ ] User can contribute macros for "not found" products via simple form
- [ ] Weekly delta sync script updates PostgreSQL with OFF changes
- [ ] SQLite rebuild script generates fresh device database from PostgreSQL

### Must Have
- SQLite-first lookup for ALL barcode scans (Layer 1)
- Supabase PostgreSQL as Layer 2 (for products added via API cache-back or user contribution)
- Full OFF global dataset in SQLite (not India-only)
- Resumable download (not `downloadAsync`) for the ~200-400 MB SQLite file
- All existing Phase 1 API fallbacks preserved (OFF World → OFF India → UPCitemdb → USDA → Gemini)
- `upsert_barcode_cache()` still called for API-resolved products

### Must NOT Have (Guardrails)
- **No `as any`, `@ts-ignore`, `@ts-expect-error`** in any TypeScript code
- **No breaking changes** to existing `freeNutritionAPIs.ts` pipeline (it's the fallback)
- **No direct Gemini API calls** — all AI goes through Cloudflare Workers
- **No port 8081** usage in test scripts (reserved for user's terminal)
- **No AGPL-3.0 code bundled** in React Native app (ifct2017 npm stays server-side only)
- **No `downloadAsync()`** for the SQLite file (Android 60s timeout bug)
- **No deletion** of existing India-only ETL scripts (keep as reference/fallback)
- **No over-engineering** — simple flat SQLite schema, no FTS for barcode lookup (exact match only)
- **No admin moderation UI** (out of scope — is_approved stays false until service_role manually approves)
- **No food photo recognition** (out of scope)
- **No VPS migration** in this plan (separate infrastructure task)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no formal test framework for this project)
- **Automated tests**: None (user chose Agent QA only)
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Scripts/ETL**: Use Bash — Run script, check exit code, verify output files exist and have expected row counts
- **SQLite**: Use Bash (node REPL) — Open SQLite file, run COUNT queries, verify schema
- **React Native services**: Use Bash — Run TypeScript type-check (`npx tsc --noEmit`), verify no errors
- **UI screens**: Use Playwright skill — Navigate to contribution screen, fill form, submit, verify
- **API fallback**: Use Bash (curl) — Hit Supabase RPC, verify response shape

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — schema + ETL scripts, 4 parallel):
├── Task 1: Schema migration — add 'off-parquet-global' to off_source constraint [quick]
├── Task 2: extract-off-global.mjs — DuckDB full global extraction [unspecified-high]
├── Task 3: sqliteFood.ts — On-device SQLite service (init, download, query) [deep]
├── Task 4: ContributeFood screen — Simple macro entry UI [visual-engineering]

Wave 2 (Data pipeline — depends on Wave 1, 4 parallel):
├── Task 5: sync-off-global.mjs — Bulk import global CSV to Supabase (depends: T1, T2) [unspecified-high]
├── Task 6: build-sqlite.mjs — Generate pre-built SQLite from PostgreSQL (depends: T1) [unspecified-high]
├── Task 7: upload-sqlite.mjs — Upload SQLite to Supabase Storage (depends: T6) [quick]
├── Task 8: sync-off-global.mjs --delta — Global delta sync mode (depends: T5) [unspecified-high]

Wave 3 (Integration — wire everything together, 3 parallel):
├── Task 9: Modify barcodeService.ts — SQLite-first lookup flow (depends: T3) [deep]
├── Task 10: Download flow UI — First-launch SQLite download with progress (depends: T3) [visual-engineering]
├── Task 11: Wire ContributeFood to Supabase RPC (depends: T4) [quick]

Wave 4 (Verification — end-to-end QA, 4 parallel):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review — tsc --noEmit + lint [unspecified-high]
├── Task F3: End-to-end barcode scanning QA [unspecified-high]
├── Task F4: Scope fidelity check [deep]

Critical Path: T1 → T5 (import) → T6 (build SQLite) → T7 (upload) → T3 + T9 (SQLite service + integration) → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1   | —         | T5, T6 | 1    |
| T2   | —         | T5     | 1    |
| T3   | —         | T9, T10| 1    |
| T4   | —         | T11    | 1    |
| T5   | T1, T2    | T6, T8 | 2    |
| T6   | T1, T5    | T7     | 2    |
| T7   | T6        | T10    | 2    |
| T8   | T5        | —      | 2    |
| T9   | T3        | F1-F4  | 3    |
| T10  | T3, T7    | F1-F4  | 3    |
| T11  | T4        | F1-F4  | 3    |
| F1-4 | T9-T11    | —      | 4    |

### Agent Dispatch Summary

- **Wave 1 (4)**: T1 → `quick`, T2 → `unspecified-high`, T3 → `deep`, T4 → `visual-engineering`
- **Wave 2 (4)**: T5 → `unspecified-high`, T6 → `unspecified-high`, T7 → `quick`, T8 → `unspecified-high`
- **Wave 3 (3)**: T9 → `deep`, T10 → `visual-engineering`, T11 → `quick`
- **Wave FINAL (4)**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs


- [ ] 1. Schema Migration — Expand `off_source` Constraint for Global Import

  **What to do**:
  - Create a new Supabase migration file `supabase/migrations/YYYYMMDD_expand_off_source_global.sql`
  - ALTER the `off_source` CHECK constraint on `off_products` to add `'off-parquet-global'` as a valid value:
    ```sql
    ALTER TABLE off_products DROP CONSTRAINT IF EXISTS off_products_off_source_check;
    ALTER TABLE off_products ADD CONSTRAINT off_products_off_source_check
      CHECK (off_source IN ('off-parquet-india', 'off-parquet-global', 'off-api-live', 'off-delta', 'off-delta-global'));
    ```
  - Update the `COMMENT ON TABLE off_products` to reflect it now holds global products, not just India subset
  - Verify the migration applies cleanly against the existing schema (no data loss, no constraint violations on existing rows)

  **Must NOT do**:
  - Do NOT drop/recreate the `off_products` table (data preservation)
  - Do NOT modify `v_barcode_lookup` VIEW or `lookup_barcode()` RPC (they already work generically)
  - Do NOT change RLS policies (they're already correct for global data)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single SQL file creation, minimal logic
  - **Skills**: []
    - No special skills needed for a SQL migration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6 (import scripts need the new constraint value)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:47-49` — Existing `off_source` CHECK constraint and default value. Line 48 shows the current allowed values: `'off-parquet-india', 'off-api-live', 'off-delta'`

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:23-50` — Full `off_products` CREATE TABLE showing all columns and constraints

  **WHY Each Reference Matters**:
  - The existing constraint is the ONLY thing changing — executor must see the exact current syntax to write the ALTER correctly
  - The full table definition shows all existing constraints that must NOT be broken

  **Acceptance Criteria**:
  - [ ] Migration file exists at `supabase/migrations/YYYYMMDD_expand_off_source_global.sql`
  - [ ] SQL is syntactically valid (can be verified by running against a test DB or visual inspection)
  - [ ] Constraint allows both `'off-parquet-global'` AND `'off-delta-global'` as valid `off_source` values
  - [ ] Existing rows with `'off-parquet-india'` are unaffected

  **QA Scenarios:**

  ```
  Scenario: Migration SQL is syntactically valid
    Tool: Bash
    Preconditions: Migration file exists
    Steps:
      1. Run: node -e "const fs = require('fs'); const sql = fs.readFileSync('supabase/migrations/YYYYMMDD_expand_off_source_global.sql', 'utf8'); console.log('Lines:', sql.split('\n').length); console.log('Contains off-parquet-global:', sql.includes('off-parquet-global')); console.log('Contains ALTER:', sql.includes('ALTER'))"
      2. Assert output contains: `Contains off-parquet-global: true`
      3. Assert output contains: `Contains ALTER: true`
    Expected Result: All assertions pass
    Failure Indicators: `false` for any check
    Evidence: .sisyphus/evidence/task-1-migration-valid.txt

  Scenario: Migration preserves existing constraint values
    Tool: Bash
    Preconditions: Migration file exists
    Steps:
      1. Read migration SQL file
      2. Verify it contains ALL existing values: 'off-parquet-india', 'off-api-live', 'off-delta'
      3. Verify it adds BOTH 'off-parquet-global' AND 'off-delta-global'
    Expected Result: All 5 values present in the new CHECK constraint
    Failure Indicators: Any existing value missing from the new constraint
    Evidence: .sisyphus/evidence/task-1-constraint-values.txt
  ```

  **Commit**: YES
  - Message: `fix(db): expand off_source constraint for global parquet import`
  - Files: `supabase/migrations/YYYYMMDD_expand_off_source_global.sql`

---

- [ ] 2. Global OFF Extraction Script — `extract-off-global.mjs`

  **What to do**:
  - Create `scripts/extract-off-global.mjs` based on the existing `scripts/extract-off-india.mjs` (93 lines)
  - **Key change**: Remove the India-only WHERE clause (`WHERE list_contains(countries_tags, 'en:india') OR starts_with(code, '890')`)
  - Add an optional quality filter: `WHERE energy_kcal_100g IS NOT NULL` (controlled by `--with-nutrition` flag, default ON)
    - Without filter: ~4.35M rows, ~800 MB CSV
    - With filter: ~1.2-1.8M rows, ~300-500 MB CSV
  - Add `--all` flag to extract ALL products regardless of nutrition data
  - Keep the same DuckDB column selection as `extract-off-india.mjs` (same schema as `off_products` table)
  - Set `off_source` to `'off-parquet-global'` in the output (add as a literal column in SELECT)
  - Output to `data/off-global.csv` (or `data/off-global-nutrition.csv` for filtered)
  - Add progress logging: count total rows before extraction, log extraction time
  - Handle the large Parquet file (~1.5 GB) — DuckDB streams it, no memory issues

  **Must NOT do**:
  - Do NOT modify or delete `scripts/extract-off-india.mjs` (keep as reference)
  - Do NOT change the column names or types (must match `off_products` schema exactly)
  - Do NOT use `as any` or `@ts-ignore` (this is .mjs so no TypeScript, but keep clean)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Non-trivial DuckDB SQL with flag handling, large data processing
  - **Skills**: []
    - No special skills needed — it's a Node.js script using DuckDB API

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5 (bulk import needs the CSV output)
  - **Blocked By**: None (can start immediately — uses local Parquet file)

  **References**:

  **Pattern References**:
  - `scripts/extract-off-india.mjs:1-93` — COMPLETE reference. Copy this file's structure exactly. Key patterns: DuckDB `@duckdb/node-api` import (line 21), `DuckDBInstance.create(':memory:')` (line 40), `conn.runAndReadAll()` for count (line 52), `conn.run()` for COPY (line 88), path normalization with `replace(/\\/g, '/')` (lines 30-31)
  - `scripts/extract-off-india.mjs:58-84` — The exact SQL COPY statement to adapt. Lines 79-80 contain the WHERE clause to REMOVE for global extraction

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:24-50` — `off_products` column definitions. The CSV columns MUST match these exactly.

  **External References**:
  - OFF Parquet download URL: `https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true`
  - DuckDB Node API docs: `https://duckdb.org/docs/api/nodejs/overview`

  **WHY Each Reference Matters**:
  - `extract-off-india.mjs` is the TEMPLATE — copy its exact DuckDB usage pattern, connection setup, SQL quoting style. Only the WHERE clause and output path change.
  - The migration schema defines the exact columns the CSV must produce

  **Acceptance Criteria**:
  - [ ] `scripts/extract-off-global.mjs` exists and runs without error: `node scripts/extract-off-global.mjs`
  - [ ] Output CSV at `data/off-global.csv` (or `data/off-global-nutrition.csv`)
  - [ ] CSV header matches `off_products` column names
  - [ ] Default mode (--with-nutrition) outputs 1M+ rows
  - [ ] `--all` flag outputs 4M+ rows
  - [ ] Script completes in <10 minutes on a machine with the 1.5 GB Parquet file

  **QA Scenarios:**

  ```
  Scenario: Script runs and produces CSV with nutrition-filtered data
    Tool: Bash
    Preconditions: data/food.parquet exists (1.5 GB)
    Steps:
      1. Run: node scripts/extract-off-global.mjs
      2. Check file exists: ls -la data/off-global-nutrition.csv
      3. Count rows: node -e "const fs=require('fs'); const lines=fs.readFileSync('data/off-global-nutrition.csv','utf8').split('\n').length; console.log('Rows:', lines-1)"
      4. Check header: node -e "const fs=require('fs'); console.log(fs.readFileSync('data/off-global-nutrition.csv','utf8').split('\n')[0])"
    Expected Result: File exists, 1M+ rows, header contains 'code,product_name,...energy_kcal_100g...'
    Failure Indicators: File missing, 0 rows, header mismatch, script error
    Evidence: .sisyphus/evidence/task-2-extraction-output.txt

  Scenario: --all flag extracts full dataset
    Tool: Bash
    Preconditions: data/food.parquet exists
    Steps:
      1. Run: node scripts/extract-off-global.mjs --all
      2. Count rows in output CSV
    Expected Result: 4M+ rows (full OFF dataset)
    Failure Indicators: Fewer than 3M rows
    Evidence: .sisyphus/evidence/task-2-all-flag-output.txt
  ```

  **Commit**: YES
  - Message: `feat(etl): add global OFF extraction from Parquet via DuckDB`
  - Files: `scripts/extract-off-global.mjs`

---

- [ ] 3. On-Device SQLite Food Database Service — `sqliteFood.ts`

  **What to do**:
  - Create `src/services/sqliteFood.ts` — the core service for on-device food database
  - **Database initialization**:
    - Use `expo-sqlite` (already installed: `^15.2.14`)
    - On first launch: download pre-built SQLite from hosted URL using `FileSystem.createDownloadResumable()`
    - Store at `FileSystem.documentDirectory + 'fitai-foods.sqlite'`
    - Track download state: `not_downloaded | downloading | ready | error`
    - Track database version (stored in a `meta` table inside SQLite: `{key: 'version', value: 'YYYY-MM-DD'}`)
  - **Download flow**:
    - Use `expo-file-system` `createDownloadResumable()` (NOT `downloadAsync` — Android 60s timeout bug)
    - Support pause/resume — save `DownloadResumable` savable state to AsyncStorage
    - Report download progress via callback: `onProgress(downloaded: number, total: number)`
    - Verify file integrity after download (check file size > 100 MB as basic validation)
  - **Query interface**:
    - `lookupBarcode(barcode: string): Promise<SQLiteFoodResult | null>` — exact match on `code` column
    - `searchByName(query: string, limit?: number): Promise<SQLiteFoodResult[]>` — LIKE search on product_name
    - `getStats(): Promise<{totalProducts: number, withNutrition: number, version: string}>`
    - `isDatabaseReady(): boolean` — synchronous check
  - **SQLite schema** (matches `off_products` but simplified — no `imported_at`, no `off_source`):
    ```sql
    CREATE TABLE products (
      code TEXT PRIMARY KEY,
      product_name TEXT,
      brands TEXT,
      energy_kcal_100g REAL,
      proteins_100g REAL,
      carbohydrates_100g REAL,
      sugars_100g REAL,
      fat_100g REAL,
      saturated_fat_100g REAL,
      fiber_100g REAL,
      sodium_100g REAL,
      nutriscore_grade TEXT,
      nova_group INTEGER,
      image_url TEXT
    );
    CREATE INDEX idx_products_code ON products(code);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    ```
  - **Types** (export from this file):
    - `SQLiteFoodResult` interface matching the products table columns
    - `SQLiteDownloadState = 'not_downloaded' | 'downloading' | 'ready' | 'error'`

  **Must NOT do**:
  - Do NOT use `downloadAsync()` (Android 60s timeout bug for large files)
  - Do NOT use `as any` or `@ts-ignore`
  - Do NOT import `ifct2017` npm package (AGPL-3.0 — server-side only)
  - Do NOT add FTS index for barcode lookup (exact match is sufficient and faster)
  - Do NOT bundle a SQLite file with the app binary (download on first launch)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex service with download management, SQLite integration, state tracking, multiple public APIs
  - **Skills**: []
    - No special skills needed — expo-sqlite and expo-file-system are straightforward APIs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 9, 10 (barcode integration + download UI need this service)
  - **Blocked By**: None (can start immediately — doesn't need the actual SQLite file to build the service)

  **References**:

  **Pattern References**:
  - `src/services/barcodeService.ts:77-86` — Singleton service pattern with private constructor. Follow this exact pattern for `sqliteFood.ts`
  - `src/services/barcodeService.ts:143-312` — `lookupProduct()` method structure: cache check → DB query → fallback. The SQLite service follows a similar pattern but simpler.
  - `src/services/supabase.ts` — Supabase client initialization pattern. Reference for how other services are structured in this codebase.

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:24-50` — `off_products` column definitions. The SQLite `products` table is a subset of these columns.
  - `src/services/freeNutritionAPIs.ts:14-25` — `NutritionData` interface. The `SQLiteFoodResult` should map to this shape for easy integration.
  - `src/services/freeNutritionAPIs.ts:27-44` — `BarcodeSearchResult` interface. The SQLite lookup result needs to be convertible to this.
  - `src/services/barcodeService.ts:11-42` — `ScannedProduct` interface. This is the FINAL shape that barcodeService returns — SQLite results must map to it.

  **External References**:
  - expo-sqlite docs: `https://docs.expo.dev/versions/latest/sdk/sqlite/`
  - expo-file-system `createDownloadResumable`: `https://docs.expo.dev/versions/latest/sdk/filesystem/#filesystemcreatedownloadresumable`

  **WHY Each Reference Matters**:
  - `barcodeService.ts` singleton pattern ensures consistency across the codebase
  - The interfaces (`NutritionData`, `BarcodeSearchResult`, `ScannedProduct`) define the exact shape SQLite results must map to
  - `off_products` schema defines which columns the SQLite file will contain
  - expo-file-system `createDownloadResumable` is critical — `downloadAsync` will FAIL for 200+ MB files on Android

  **Acceptance Criteria**:
  - [ ] `src/services/sqliteFood.ts` exists with exported `sqliteFood` singleton
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] `SQLiteFoodResult` interface is exported
  - [ ] `lookupBarcode()`, `searchByName()`, `getStats()`, `isDatabaseReady()` methods exist
  - [ ] Download uses `createDownloadResumable` (NOT `downloadAsync`)
  - [ ] Download state tracking: `not_downloaded | downloading | ready | error`
  - [ ] No `as any`, `@ts-ignore`, or `@ts-expect-error`

  **QA Scenarios:**

  ```
  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: src/services/sqliteFood.ts exists
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep -i 'sqliteFood' || echo 'No errors for sqliteFood'
      2. Run: npx tsc --noEmit 2>&1 | tail -5
    Expected Result: Zero TypeScript errors related to sqliteFood.ts
    Failure Indicators: Any error mentioning sqliteFood.ts
    Evidence: .sisyphus/evidence/task-3-tsc-check.txt

  Scenario: Service exports required interface and methods
    Tool: Bash
    Preconditions: src/services/sqliteFood.ts exists
    Steps:
      1. Run: node -e "const fs=require('fs'); const src=fs.readFileSync('src/services/sqliteFood.ts','utf8'); ['lookupBarcode','searchByName','getStats','isDatabaseReady','SQLiteFoodResult','createDownloadResumable'].forEach(s => console.log(s+':', src.includes(s)))"
    Expected Result: All 6 symbols found (true)
    Failure Indicators: Any symbol shows false
    Evidence: .sisyphus/evidence/task-3-exports-check.txt

  Scenario: No forbidden patterns in source
    Tool: Bash
    Preconditions: src/services/sqliteFood.ts exists
    Steps:
      1. Run: node -e "const fs=require('fs'); const src=fs.readFileSync('src/services/sqliteFood.ts','utf8'); ['as any','@ts-ignore','@ts-expect-error','downloadAsync'].forEach(s => console.log(s+':', src.includes(s)))"
    Expected Result: All 4 patterns show false (not present)
    Failure Indicators: Any pattern shows true
    Evidence: .sisyphus/evidence/task-3-forbidden-patterns.txt
  ```

  **Commit**: YES
  - Message: `feat(barcode): add on-device SQLite food database service`
  - Files: `src/services/sqliteFood.ts`

---

- [ ] 4. User Food Contribution Screen — `ContributeFood.tsx`

  **What to do**:
  - Create `src/screens/ContributeFood.tsx` — a simple form for users to submit macros for unknown barcodes
  - **Form fields**:
    - Barcode (pre-filled, read-only — passed as route param)
    - Product Name (required, text input)
    - Brand (optional, text input)
    - Calories per 100g (required, numeric input)
    - Protein per 100g (required, numeric)
    - Carbs per 100g (required, numeric)
    - Fat per 100g (required, numeric)
    - Fiber per 100g (optional, numeric)
    - Sugar per 100g (optional, numeric)
    - Sodium per 100g (optional, numeric)
    - Photo of nutrition label (optional — use existing camera/image picker if available, or skip for MVP)
  - **Validation**: Require product_name + calories + protein + carbs + fat. Basic range checks (calories 0-900, macros 0-100).
  - **Submit**: Call Supabase `user_food_contributions` INSERT via the Supabase client (RLS allows authenticated users to insert where `user_id = auth.uid()`)
  - **Success state**: Show confirmation, offer to use the submitted data immediately for the current scan
  - **Design**: Follow existing app design patterns. Simple, clean form. No over-engineering.
  - This screen is navigated to from the barcode scan result when product is "not found"

  **Must NOT do**:
  - Do NOT build an admin moderation UI (out of scope)
  - Do NOT auto-approve submissions (`is_approved` defaults to `false`)
  - Do NOT use `as any` or `@ts-ignore`
  - Do NOT over-engineer — this is a simple form, not a complex multi-step wizard

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI screen with form inputs, validation, and visual feedback
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Form design, input validation UX, success/error states

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 11 (wiring form to Supabase)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - Find an existing screen in `src/screens/` that has a form with text inputs and submit button — follow its component structure, styling approach, and navigation pattern
  - `src/services/supabase.ts` — How to import and use the Supabase client for database operations

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:110-138` — `user_food_contributions` table schema. All form fields MUST match these column names and types exactly.
  - `supabase/migrations/20260228000001_add_off_products_table.sql:427-436` — RLS policy `ufc_insert_own`: `WITH CHECK (user_id = auth.uid())`. The INSERT must include `user_id` from the authenticated session.
  - `supabase/migrations/20260228000001_add_off_products_table.sql:125` — `contribution_type` defaults to `'new_product'` — use this for barcode-not-found submissions.

  **WHY Each Reference Matters**:
  - The `user_food_contributions` schema defines EXACTLY which columns to submit and their types/constraints
  - The RLS policy tells us the INSERT must include `user_id = auth.uid()` or it will be rejected
  - Existing screen patterns ensure visual consistency with the rest of the app

  **Acceptance Criteria**:
  - [ ] `src/screens/ContributeFood.tsx` exists
  - [ ] `npx tsc --noEmit` passes
  - [ ] Form has all required fields (product_name, calories, protein, carbs, fat)
  - [ ] Barcode is pre-filled and read-only
  - [ ] Basic validation (required fields, numeric ranges)
  - [ ] No `as any`, `@ts-ignore`, or `@ts-expect-error`

  **QA Scenarios:**

  ```
  Scenario: Screen renders with pre-filled barcode
    Tool: Playwright (playwright skill)
    Preconditions: App running, navigate to ContributeFood screen with barcode param '8901234567890'
    Steps:
      1. Navigate to the contribution screen via deep link or navigation
      2. Assert barcode input shows '8901234567890' and is read-only/disabled
      3. Assert Product Name, Calories, Protein, Carbs, Fat inputs are visible
      4. Take screenshot
    Expected Result: All form fields visible, barcode pre-filled
    Failure Indicators: Missing fields, barcode empty or editable
    Evidence: .sisyphus/evidence/task-4-form-render.png

  Scenario: Validation prevents submission without required fields
    Tool: Playwright (playwright skill)
    Preconditions: ContributeFood screen visible
    Steps:
      1. Leave Product Name empty
      2. Tap Submit button
      3. Assert error message appears (e.g., 'Product name is required')
      4. Fill Product Name but leave Calories empty
      5. Tap Submit
      6. Assert error for missing calories
    Expected Result: Form shows validation errors for missing required fields
    Failure Indicators: Form submits without validation, no error messages
    Evidence: .sisyphus/evidence/task-4-validation.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add simple food contribution screen for unknown barcodes`
  - Files: `src/screens/ContributeFood.tsx`

---

- [ ] 5. Global OFF Bulk Import to Supabase — `sync-off-global.mjs`

  **What to do**:
  - Create `scripts/sync-off-global.mjs` based on `scripts/sync-off-india.mjs` (150 lines)
  - **Bulk import mode** (`--import`):
    - Read `data/off-global-nutrition.csv` (or configurable via `CSV_PATH` env)
    - Same `clean()` function as `sync-off-india.mjs`, but set `off_source: 'off-parquet-global'`
    - Use batch upsert via Supabase client (`sb.from('off_products').upsert(rows, { onConflict: 'code' })`)
    - **Batch size**: 500 rows (same as India script)
    - **Progress**: Log every 10,000 rows (not every batch — would be too noisy for 1M+ rows)
    - **Error handling**: Count errors per batch, continue processing, report summary at end
    - Handle 1M+ rows efficiently — streaming CSV parsing via `csv-parse`
  - **Important**: This replaces existing India data in `off_products` for barcodes that overlap (upsert behavior). This is correct — global data is a superset.

  **Must NOT do**:
  - Do NOT modify or delete `scripts/sync-off-india.mjs` (keep as reference)
  - Do NOT use `as any` or TypeScript (this is .mjs)
  - Do NOT truncate the table before import (upsert preserves existing data)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large-scale data import with error handling and progress tracking
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: Tasks 6, 8 (SQLite build + delta sync need data in PostgreSQL)
  - **Blocked By**: Tasks 1 (constraint), 2 (CSV file)

  **References**:

  **Pattern References**:
  - `scripts/sync-off-india.mjs:1-150` — COMPLETE reference. Copy this file's structure. Key patterns: `createClient` setup (line 27), `clean()` function (lines 34-60), `upsertBatch()` (lines 62-65), streaming CSV with `csv-parse` (line 72), batch processing loop (lines 73-88)
  - `scripts/sync-off-india.mjs:58` — `off_source: 'off-parquet-india'` — change this to `'off-parquet-global'`

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:24-50` — `off_products` columns. The `clean()` function must produce objects matching ALL these columns.

  **WHY Each Reference Matters**:
  - `sync-off-india.mjs` is the exact template — only the `off_source` value, CSV path, and logging frequency change
  - The schema defines the target column names

  **Acceptance Criteria**:
  - [ ] `scripts/sync-off-global.mjs` exists
  - [ ] `node scripts/sync-off-global.mjs --import` completes without fatal errors
  - [ ] 1M+ rows inserted/updated in `off_products` table (verify via Supabase SQL: `SELECT COUNT(*) FROM off_products`)
  - [ ] `off_source` is `'off-parquet-global'` for imported rows
  - [ ] Script logs progress every 10K rows

  **QA Scenarios:**

  ```
  Scenario: Bulk import processes CSV and reports success
    Tool: Bash
    Preconditions: data/off-global-nutrition.csv exists, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set
    Steps:
      1. Run: node scripts/sync-off-global.mjs --import
      2. Capture final output line showing total rows and errors
      3. Query Supabase: node -e "const {createClient}=require('@supabase/supabase-js'); const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY); sb.from('off_products').select('count',{count:'exact',head:true}).then(r=>console.log('Total:',r.count))"
    Expected Result: Script completes, 1M+ rows in off_products, <1% error rate
    Failure Indicators: Script crashes, 0 rows imported, >5% error rate
    Evidence: .sisyphus/evidence/task-5-import-output.txt
  ```

  **Commit**: YES
  - Message: `feat(etl): add global OFF bulk import to Supabase PostgreSQL`
  - Files: `scripts/sync-off-global.mjs`

---

- [ ] 6. Pre-Built SQLite Generator — `build-sqlite.mjs`

  **What to do**:
  - Create `scripts/build-sqlite.mjs` — queries Supabase PostgreSQL and generates a pre-built SQLite file for device download
  - **Approach**: Use `better-sqlite3` (Node.js native SQLite, fast) to create the SQLite file locally
  - **Data source**: Query `off_products` from Supabase PostgreSQL (via Supabase REST API with pagination or direct PostgreSQL connection)
    - Since Supabase REST API has a 1000-row default limit, use pagination: `range(offset, offset+999)` in a loop
    - Alternative: If the dataset is too large for REST pagination, use `pg` npm package for direct PostgreSQL connection (connection string from Supabase dashboard)
  - **Filter**: Only include products where `energy_kcal_100g IS NOT NULL` (has nutrition data)
  - **SQLite schema** (slim — no metadata columns):
    ```sql
    CREATE TABLE products (
      code TEXT PRIMARY KEY,
      product_name TEXT,
      brands TEXT,
      energy_kcal_100g REAL,
      proteins_100g REAL,
      carbohydrates_100g REAL,
      sugars_100g REAL,
      fat_100g REAL,
      saturated_fat_100g REAL,
      fiber_100g REAL,
      sodium_100g REAL,
      nutriscore_grade TEXT,
      nova_group INTEGER,
      image_url TEXT
    );
    CREATE INDEX idx_products_code ON products(code);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO meta VALUES ('version', '{ISO date}');
    INSERT INTO meta VALUES ('source', 'off-global');
    INSERT INTO meta VALUES ('built_at', '{ISO timestamp}');
    ```
  - **Output**: `data/fitai-foods.sqlite`
  - **Optimization**: Use WAL mode during build, then `PRAGMA journal_mode=DELETE` before shipping (WAL not needed for read-only file)
  - **Compression**: After build, report file size. Optionally gzip for hosting (device will decompress).
  - **Progress**: Log every 100K rows inserted

  **Must NOT do**:
  - Do NOT include products without nutrition data (filter `WHERE energy_kcal_100g IS NOT NULL`)
  - Do NOT include `imported_at`, `off_source`, `countries_tags`, `ingredients_text`, `allergens_tags` in SQLite (save space)
  - Do NOT use `expo-sqlite` for this script (it's a Node.js build tool, use `better-sqlite3`)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Database engineering with pagination, bulk inserts, SQLite optimization
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T5 completes)
  - **Parallel Group**: Wave 2 (with Tasks 7, 8)
  - **Blocks**: Task 7 (upload needs the SQLite file)
  - **Blocked By**: Tasks 1 (schema), 5 (data must be in PostgreSQL first)

  **References**:

  **Pattern References**:
  - `scripts/sync-off-india.mjs:27` — Supabase client setup with `createClient(URL, KEY, { auth: { persistSession: false } })`. Use this same pattern for querying.
  - `scripts/extract-off-india.mjs` — General script structure (imports, path handling, progress logging)

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:24-50` — Source columns in `off_products`. Select only the columns needed for the slim SQLite schema.

  **External References**:
  - `better-sqlite3` npm: `https://github.com/WiseLibs/better-sqlite3` — Synchronous, fast SQLite for Node.js build scripts

  **WHY Each Reference Matters**:
  - Supabase client pattern ensures correct auth setup for service_role queries
  - `off_products` schema defines which columns to SELECT (and which to skip for space savings)
  - `better-sqlite3` is the right tool for offline SQLite file creation (not expo-sqlite which is mobile-only)

  **Acceptance Criteria**:
  - [ ] `scripts/build-sqlite.mjs` exists
  - [ ] `node scripts/build-sqlite.mjs` produces `data/fitai-foods.sqlite`
  - [ ] SQLite file contains 1M+ rows in `products` table
  - [ ] `meta` table has `version`, `source`, `built_at` keys
  - [ ] File size between 100 MB and 500 MB
  - [ ] `SELECT COUNT(*) FROM products` matches expected count

  **QA Scenarios:**

  ```
  Scenario: Build script generates valid SQLite with correct row count
    Tool: Bash
    Preconditions: off_products table has 1M+ rows in Supabase, better-sqlite3 installed
    Steps:
      1. Run: node scripts/build-sqlite.mjs
      2. Check file: ls -la data/fitai-foods.sqlite
      3. Query: node -e "const db=require('better-sqlite3')('data/fitai-foods.sqlite'); console.log('Products:', db.prepare('SELECT COUNT(*) AS n FROM products').get().n); console.log('Version:', db.prepare(\"SELECT value FROM meta WHERE key='version'\").get().value); db.close()"
    Expected Result: File exists (100-500 MB), 1M+ products, version set to today's date
    Failure Indicators: File missing, 0 products, no meta table
    Evidence: .sisyphus/evidence/task-6-sqlite-build.txt

  Scenario: SQLite lookup is fast (<5ms for exact barcode match)
    Tool: Bash
    Preconditions: data/fitai-foods.sqlite exists
    Steps:
      1. Run: node -e "const db=require('better-sqlite3')('data/fitai-foods.sqlite'); const t=Date.now(); const r=db.prepare('SELECT * FROM products WHERE code=?').get('8901234567890'); console.log('Time:', Date.now()-t, 'ms'); console.log('Found:', !!r); db.close()"
    Expected Result: Query completes in <5ms
    Failure Indicators: >50ms query time, missing index
    Evidence: .sisyphus/evidence/task-6-sqlite-speed.txt
  ```

  **Commit**: YES
  - Message: `feat(etl): add SQLite build script from PostgreSQL data`
  - Files: `scripts/build-sqlite.mjs`

---

- [ ] 7. SQLite Upload to Supabase Storage — `upload-sqlite.mjs`

  **What to do**:
  - Create `scripts/upload-sqlite.mjs` — uploads the pre-built `data/fitai-foods.sqlite` to Supabase Storage for device download
  - **Storage bucket**: `food-databases` (create via `sb.storage.createBucket('food-databases', { public: true })` if not exists — catch and ignore AlreadyExists error)
  - **Upload path (versioned)**: `fitai-foods-{YYYY-MM-DD}.sqlite` (date-stamped for rollback)
  - **Upload path (stable alias)**: `fitai-foods-latest.sqlite` — upsert/overwrite on every run; this is the URL baked into `sqliteFood.ts`
  - **Upload method**: `fs.readFileSync('data/fitai-foods.sqlite')` → upload as `application/octet-stream` with `{ upsert: true }`
  - **Public access**: Bucket created as `public: true` so device downloads without auth headers
  - **Output**: Print the public URL after upload — `https://{SUPABASE_URL}/storage/v1/object/public/food-databases/fitai-foods-latest.sqlite`
  - **Pre-flight check**: Assert file exists and is >50 MB before uploading; exit 1 with clear error if not
  - **Env vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

  **Must NOT do**:
  - Do NOT upload without verifying file exists and is >50 MB
  - Do NOT create a private/authenticated bucket (device downloads without auth)
  - Do NOT hardcode the Supabase URL — read from `process.env.SUPABASE_URL`
  - Do NOT use `@supabase/storage-js` directly — use the `@supabase/supabase-js` client's `.storage` property

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-purpose ~50-line Node.js script — Supabase Storage upload
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T6)
  - **Parallel Group**: Wave 2 (with Tasks 6, 8)
  - **Blocks**: Task 10 (download UI needs the confirmed public URL)
  - **Blocked By**: Task 6 (`data/fitai-foods.sqlite` must exist first)

  **References**:

  **Pattern References**:
  - `scripts/sync-off-india.mjs:27` — Supabase client setup: `createClient(URL_, KEY, { auth: { persistSession: false } })`. Use this exact pattern.
  - `scripts/build-sqlite.mjs` (Task 6 output) — File path convention: `resolve(ROOT, 'data', 'fitai-foods.sqlite')`

  **API/Type References**:
  - `sb.storage.createBucket(name, { public: true })` — idempotent bucket creation (catch `already exists` error)
  - `sb.storage.from('food-databases').upload(path, buffer, { contentType: 'application/octet-stream', upsert: true })`
  - `sb.storage.from('food-databases').getPublicUrl(path)` → `{ data: { publicUrl: string } }`

  **External References**:
  - Supabase Storage upload: `https://supabase.com/docs/reference/javascript/storage-from-upload`
  - Supabase Storage createBucket: `https://supabase.com/docs/reference/javascript/storage-createbucket`

  **WHY Each Reference Matters**:
  - `createClient` pattern ensures consistent service-role auth for storage writes
  - `getPublicUrl()` is the correct method — do NOT construct the URL manually as the format may change
  - Public bucket is non-negotiable: the RN app downloads this URL with no Authorization header

  **Acceptance Criteria**:
  - [ ] `scripts/upload-sqlite.mjs` exists
  - [ ] `node scripts/upload-sqlite.mjs` succeeds when `data/fitai-foods.sqlite` exists
  - [ ] Script prints a public HTTPS URL ending in `fitai-foods-latest.sqlite`
  - [ ] `curl -sI {printed-url}` returns HTTP 200
  - [ ] Script exits with code 1 and clear error message when SQLite file is missing

  **QA Scenarios:**

  ```
  Scenario: Upload succeeds and public URL is accessible
    Tool: Bash
    Preconditions: data/fitai-foods.sqlite exists (from T6), SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set
    Steps:
      1. Run: node scripts/upload-sqlite.mjs 2>&1 | tee .sisyphus/evidence/task-7-upload-result.txt
      2. Extract URL from output: grep -o 'https://[^ ]*fitai-foods-latest.sqlite' .sisyphus/evidence/task-7-upload-result.txt
      3. Run: curl -sI "{extracted-url}" | head -3
    Expected Result: HTTP/2 200, Content-Type: application/octet-stream
    Failure Indicators: 401 (bucket not public), 404 (upload failed), script throws
    Evidence: .sisyphus/evidence/task-7-upload-result.txt

  Scenario: Script errors gracefully when SQLite file missing
    Tool: Bash
    Preconditions: data/fitai-foods.sqlite does NOT exist
    Steps:
      1. Run: node scripts/upload-sqlite.mjs 2>&1; echo "Exit: $?"
    Expected Result: Error message containing "not found" or "missing", exit code 1
    Failure Indicators: Script hangs, crashes with unhandled exception, or exits 0
    Evidence: .sisyphus/evidence/task-7-missing-file-error.txt
  ```

  **Evidence to Capture:**
  - [ ] task-7-upload-result.txt — stdout + curl -I response
  - [ ] task-7-missing-file-error.txt — graceful error output

  **Commit**: YES
  - Message: `feat(etl): add SQLite upload to Supabase Storage`
  - Files: `scripts/upload-sqlite.mjs`

---

- [ ] 8. Global OFF Delta Sync — `sync-off-global.mjs --delta`

  **What to do**:
  - Add `--delta` mode to `scripts/sync-off-global.mjs` (the global bulk import script from Task 5)
  - **Delta index URL**: `https://static.openfoodfacts.org/data/delta/index.txt` — lists `.jsonl.gz` delta files (14-day rolling window)
  - **Scope**: ALL products in delta files — do NOT filter by `en:india` or `890` barcode prefix (unlike `sync-off-india.mjs:116`)
  - **Cutoff**: Only process files whose unix timestamp prefix is within the last 7 days: `ts >= Date.now()/1000 - 7*86400`
  - **Gzip**: Delta files are `.jsonl.gz` — stream-decompress using `https.get()` piped through `zlib.createGunzip()` then split on newlines for JSONL parsing
  - **JSONL parsing**: Each decompressed line is a JSON product. Map identically to `--import` mode. Use `off_source: 'off-delta-global'`.
  - **Upsert**: Reuse the `upsertBatch()` function already in `sync-off-global.mjs` — no new function needed
  - **State tracking** (optional): Write ISO timestamp to `data/.last-delta-sync` after each successful run; skip files older than that timestamp on next run
  - **Progress**: Log each delta file name being processed + running total rows
  - **CHECK constraint**: Verify Task 1's migration includes BOTH `'off-parquet-global'` AND `'off-delta-global'` in the `off_source` CHECK constraint

  **Must NOT do**:
  - Do NOT filter by `countries_tags` or barcode `890` prefix (this is global delta, all countries)
  - Do NOT use the `fetchText()` string approach for gzip files — must stream via `zlib.createGunzip()`
  - Do NOT load full gzip delta file into memory as a Buffer (10–50 MB per file)
  - Do NOT hardcode the delta index URL

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Node.js stream pipeline (HTTPS → gzip → JSONL), adds a new mode to an existing script, state tracking
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T5)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Nothing (standalone maintenance script)
  - **Blocked By**: Task 5 (`sync-off-global.mjs` must exist first), Task 1 (`'off-delta-global'` in CHECK constraint)

  **References**:

  **Pattern References**:
  - `scripts/sync-off-india.mjs:96-144` — **Exact template for `runDelta()`.** Copy this function, then: (1) remove the India-only filter at line 116, (2) change `off_source` to `'off-delta-global'`, (3) replace the `fetchText()` call with a streaming gzip approach.
  - `scripts/sync-off-india.mjs:90-94` — `fetchText()` helper pattern. For `.jsonl.gz`, replace with a `streamDecompress(url)` helper that returns an async iterator of lines via `https.get` + `zlib.createGunzip()` + readline.
  - `scripts/sync-off-global.mjs` (Task 5 output) — `upsertBatch()` and `clean()` already exist. Reuse directly.

  **API/Type References**:
  - OFF delta index: `https://static.openfoodfacts.org/data/delta/index.txt`
  - OFF delta files: `https://static.openfoodfacts.org/data/delta/{filename}` (`.jsonl.gz`)
  - Node.js `zlib.createGunzip()`: `https://nodejs.org/api/zlib.html#zlibcreategunzip`
  - Node.js `readline.createInterface({ input: gunzipStream })` — for line-by-line JSONL iteration

  **WHY Each Reference Matters**:
  - `sync-off-india.mjs:96-144` is the near-complete implementation — the only meaningful diff is: remove India filter + change `off_source` + add gzip streaming
  - Streaming gzip is mandatory: delta files are 10–50 MB compressed; loading as string will OOM on large files
  - `'off-delta-global'` must exactly match the CHECK constraint — one typo causes all upserts to fail silently via Supabase error

  **Acceptance Criteria**:
  - [ ] `node scripts/sync-off-global.mjs --delta` flag is handled (no "unknown flag" error)
  - [ ] Script fetches and logs `index.txt` delta files
  - [ ] At least 1 delta file processed without gzip/parse error
  - [ ] Rows upserted with `off_source = 'off-delta-global'` accepted by DB CHECK constraint
  - [ ] No India-only filter present in delta processing loop
  - [ ] `node scripts/sync-off-global.mjs --import` still works after adding `--delta` (regression check)

  **QA Scenarios:**

  ```
  Scenario: Delta sync starts, fetches index, processes at least 1 file
    Tool: Bash
    Preconditions: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set, internet access
    Steps:
      1. Run: timeout 120 node scripts/sync-off-global.mjs --delta 2>&1 | head -40
    Expected Result: Lines show "[delta] Fetching...", "[delta] Processing: {filename}.jsonl.gz", rows upserted >= 1
    Failure Indicators: "Error", "ECONNREFUSED", 0 rows, zlib errors, unhandled exception
    Evidence: .sisyphus/evidence/task-8-delta-sync.txt

  Scenario: Import mode unaffected by delta addition
    Tool: Bash
    Preconditions: data/off-global.csv exists (from T2), SUPABASE creds set
    Steps:
      1. Run: node scripts/sync-off-global.mjs --import 2>&1 | tail -5
    Expected Result: Completes successfully, total rows > 0, no delta-related output
    Failure Indicators: Script crashes, 0 rows, any error in import mode
    Evidence: .sisyphus/evidence/task-8-import-regression.txt
  ```

  **Evidence to Capture:**
  - [ ] task-8-delta-sync.txt — first 40 lines of delta run output
  - [ ] task-8-import-regression.txt — import mode regression check

  **Commit**: YES
  - Message: `feat(etl): add global OFF delta sync mode`
  - Files: `scripts/sync-off-global.mjs`
  - Pre-commit: Verify `--import` mode still works


---

- [ ] 9. SQLite-First Lookup — modify `barcodeService.ts`

  **What to do**:
  - Modify `src/services/barcodeService.ts` to insert SQLite lookup as the FIRST step in `lookupProduct()` (before the existing Supabase RPC)
  - **Add import** at top of file: `import { sqliteFood } from './sqliteFood';`
  - **Insertion point**: After the memory-cache check (line ~164, after the `if (this.scanCache.has(...))` block exits) and BEFORE the `// Step 0: Query Supabase DB` try block (line ~172)
  - **New step** to insert:
    ```
    // Step 0a: On-device SQLite (zero-latency, offline-first)
    if (sqliteFood.isDatabaseReady()) {
      try {
        const sqliteRow = await sqliteFood.lookupBarcode(normalizedBarcode);
        if (sqliteRow && sqliteRow.energy_kcal_100g !== null) {
          const sqliteProduct: ScannedProduct = {
            barcode: normalizedBarcode,
            name: sqliteRow.product_name ?? ('Product ' + normalizedBarcode),
            brand: sqliteRow.brands ?? undefined,
            nutrition: {
              calories: sqliteRow.energy_kcal_100g ?? 0,
              protein:  sqliteRow.proteins_100g    ?? 0,
              carbs:    sqliteRow.carbohydrates_100g ?? 0,
              fat:      sqliteRow.fat_100g          ?? 0,
              fiber:    sqliteRow.fiber_100g        ?? 0,
              sugar:    sqliteRow.sugars_100g       ?? undefined,
              sodium:   sqliteRow.sodium_100g       ?? undefined,
              servingSize: 100,
              servingUnit: 'g',
            },
            additionalInfo: { imageUrl: sqliteRow.image_url ?? undefined },
            healthScore: this.calculateHealthScore({
              calories: sqliteRow.energy_kcal_100g ?? 0,
              protein:  sqliteRow.proteins_100g    ?? undefined,
              fat:      sqliteRow.fat_100g         ?? undefined,
              sugar:    sqliteRow.sugars_100g      ?? undefined,
              sodium:   sqliteRow.sodium_100g      ?? undefined,
              fiber:    sqliteRow.fiber_100g       ?? undefined,
            }),
            confidence: 92,
            source: 'sqlite-local',
            lastScanned: new Date().toISOString(),
            nutriScore:  sqliteRow.nutriscore_grade ?? undefined,
            novaGroup:   sqliteRow.nova_group       ?? undefined,
            isAIEstimated: false,
          };
          this.cacheProduct(normalizedBarcode, sqliteProduct);
          this.updateRecentScans(normalizedBarcode);
          return { success: true, product: sqliteProduct, confidence: 92 };
        }
      } catch (sqliteErr) {
        console.warn('⚠️ SQLite lookup failed, falling through:', sqliteErr);
      }
    }
    ```
  - **Nothing else changes**: existing Supabase RPC (Step 0), API fallback chain, and `upsert_barcode_cache` call are untouched

  **Must NOT do**:
  - Do NOT remove or modify the existing Supabase RPC step (Step 0) — SQLite is prepended, not a replacement
  - Do NOT use `as any` or `@ts-ignore`
  - Do NOT let SQLite errors surface as lookup failures — wrap in try/catch and fall through
  - Do NOT change the `upsert_barcode_cache` call (cache-back to Supabase still runs for API results)
  - Do NOT import `sqliteFood` conditionally — always import at the top, guard with `isDatabaseReady()` inside the method

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Surgical modification to a critical 443-line service file; precise type mapping between `SQLiteFoodResult` and `ScannedProduct`; must preserve all existing behaviour
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (serial after Wave 2 completes)
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: Nothing (final integration)
  - **Blocked By**: Task 3 (`sqliteFood.ts` must exist with correct types and exports)

  **References**:

  **Pattern References**:
  - `src/services/barcodeService.ts:155–220` — **Insertion context.** The SQLite step goes after line 164 (cache miss falls through) and before line 172 (Supabase RPC try block). Study this range carefully before editing.
  - `src/services/barcodeService.ts:179–214` — **Mapping template.** The `LookupBarcodeRow → ScannedProduct` mapping here is the exact pattern to replicate for `SQLiteFoodResult → ScannedProduct`. Column names are identical.
  - `src/services/barcodeService.ts:276–297` — **Do NOT touch** — this is the `upsert_barcode_cache` call that only runs for API results.

  **API/Type References**:
  - `src/services/sqliteFood.ts` (Task 3 output) — `SQLiteFoodResult` interface, `sqliteFood.isDatabaseReady()`, `sqliteFood.lookupBarcode(barcode)`
  - `src/services/barcodeService.ts:11–42` — `ScannedProduct` interface — exact target shape
  - `src/services/barcodeService.ts:59–76` — `LookupBarcodeRow` interface — reference for how identical DB column names map to `ScannedProduct`

  **WHY Each Reference Matters**:
  - Lines 155–220 define the exact insertion point — getting this wrong breaks the entire lookup flow
  - `LookupBarcodeRow → ScannedProduct` mapping is the exact blueprint; `SQLiteFoodResult` has the same column names
  - `isDatabaseReady()` guard is CRITICAL — prevents blocking on a missing/downloading SQLite file

  **Acceptance Criteria**:
  - [ ] `import { sqliteFood } from './sqliteFood'` added to top of `barcodeService.ts`
  - [ ] SQLite lookup step exists before the Supabase RPC try block in `lookupProduct()`
  - [ ] `isDatabaseReady()` guard wraps the entire SQLite path
  - [ ] `SQLiteFoodResult` correctly maps to `ScannedProduct` with `source: 'sqlite-local'` and `confidence: 92`
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] No `as any`, `@ts-ignore`, `@ts-expect-error`
  - [ ] Existing Supabase RPC + API fallback chain + cache-back unchanged

  **QA Scenarios:**

  ```
  Scenario: TypeScript compiles cleanly after modification
    Tool: Bash
    Preconditions: barcodeService.ts modified, sqliteFood.ts exists
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | tail -10
    Expected Result: 0 errors (empty output or "Found 0 errors")
    Failure Indicators: Any error mentioning barcodeService.ts or sqliteFood.ts
    Evidence: .sisyphus/evidence/task-9-tsc-check.txt

  Scenario: SQLite step appears before Supabase RPC in source
    Tool: Bash
    Preconditions: barcodeService.ts modified
    Steps:
      1. Run: node -e "
          const fs=require('fs');
          const src=fs.readFileSync('src/services/barcodeService.ts','utf8');
          const sqliteIdx=src.indexOf('isDatabaseReady');
          const rpcIdx=src.indexOf(\"supabase.rpc('lookup_barcode'\");
          console.log('SQLite isDatabaseReady at char:', sqliteIdx);
          console.log('Supabase RPC at char:', rpcIdx);
          console.log('Correct order (SQLite before RPC):', sqliteIdx > 0 && rpcIdx > 0 && sqliteIdx < rpcIdx);"
    Expected Result: "Correct order (SQLite before RPC): true"
    Failure Indicators: false, or either index is -1
    Evidence: .sisyphus/evidence/task-9-insertion-order.txt

  Scenario: No forbidden patterns introduced
    Tool: Bash
    Preconditions: barcodeService.ts modified
    Steps:
      1. Run: node -e "
          const fs=require('fs');
          const src=fs.readFileSync('src/services/barcodeService.ts','utf8');
          ['as any','@ts-ignore','@ts-expect-error'].forEach(p=>console.log(p+':', src.includes(p)));"
    Expected Result: All three patterns show false
    Failure Indicators: Any pattern shows true
    Evidence: .sisyphus/evidence/task-9-forbidden-patterns.txt
  ```

  **Evidence to Capture:**
  - [ ] task-9-tsc-check.txt — TypeScript compiler output
  - [ ] task-9-insertion-order.txt — proof SQLite step precedes Supabase RPC
  - [ ] task-9-forbidden-patterns.txt — no forbidden patterns

  **Commit**: YES
  - Message: `feat(barcode): wire SQLite-first lookup into barcode scanning flow`
  - Files: `src/services/barcodeService.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 10. First-Launch SQLite Download UI — `DatabaseDownloadBanner.tsx`

  **What to do**:
  - Create `src/components/DatabaseDownloadBanner.tsx` — shows when on-device database is not yet downloaded, drives the download
  - **Component states** (driven by `sqliteFood.getDownloadState()`):
    - `not_downloaded`: Title "Offline Food Database", subtitle "Download once for instant barcode scanning", size hint "~350 MB", primary button "Download Now", ghost button "Skip for Now"
    - `downloading`: Progress bar (animated width), "X MB / ~350 MB" label, "Pause" and "Cancel" buttons (replaces Download/Skip)
    - `ready`: Green checkmark, "Database ready — instant scanning enabled", auto-dismiss after 3s (or tap to dismiss)
    - `error`: "Download failed. Tap to retry.", "Retry" button
  - **Progress callback**: Pass `(downloaded, total) => setProgress(downloaded / total)` to `sqliteFood.downloadDatabase()`
  - **Animated progress bar**: Use `Animated.timing()` on a width value tied to `progress` state (0.0 → 1.0)
  - **Service wiring**:
    - "Download Now" → `sqliteFood.downloadDatabase(onProgress)`
    - "Pause" → `sqliteFood.pauseDownload()`
    - "Cancel" → `sqliteFood.cancelDownload()` then reset state
    - "Retry" → `sqliteFood.downloadDatabase(onProgress)` again
  - **Rendering**: Export `DatabaseDownloadBanner` as default and named export. Can be embedded in barcode scanner screen when `!sqliteFood.isDatabaseReady()`.
  - **Style**: Match FitAI design system — use color tokens, border radius, and shadow patterns from existing `src/components/ui/` components

  **Must NOT do**:
  - Do NOT block barcode scanning entirely when database not ready — banner is informational, scanner still works via Supabase/API fallback
  - Do NOT call `downloadAsync()` — the service (T3) uses `createDownloadResumable`; this component just calls service methods
  - Do NOT hardcode color hex values — use existing design tokens or StyleSheet constants from `src/components/ui/`
  - Do NOT use `as any` or `@ts-ignore`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multi-state animated UI component with progress bar, React Native StyleSheet, design system adherence
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Animated progress bar design, multi-state component UX, React Native Animated API patterns
  - **Skills Evaluated but Omitted**:
    - `playwright`: MCP Playwright does NOT work on this machine; verification via Bash source analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with T9, T11)
  - **Parallel Group**: Wave 3 (with Tasks 9, 11)
  - **Blocks**: Nothing
  - **Blocked By**: Task 3 (`sqliteFood.ts` service must exist with download methods), Task 7 (hosted URL must be live)

  **References**:

  **Pattern References**:
  - `src/components/ui/` — Existing UI component directory. Study 2–3 components for: button styles, color constants, border-radius, shadow, typography scale. This component MUST visually match.
  - `src/screens/` — Existing screen layouts for spacing constants and overall layout rhythm.

  **API/Type References**:
  - `src/services/sqliteFood.ts` (Task 3 output):
    - `SQLiteDownloadState = 'not_downloaded' | 'downloading' | 'ready' | 'error'`
    - `sqliteFood.getDownloadState(): SQLiteDownloadState`
    - `sqliteFood.downloadDatabase(onProgress: (downloaded: number, total: number) => void): Promise<void>`
    - `sqliteFood.pauseDownload(): void`
    - `sqliteFood.resumeDownload(): void`
    - `sqliteFood.cancelDownload(): void`
    - `sqliteFood.isDatabaseReady(): boolean`

  **External References**:
  - React Native `Animated` API: `https://reactnative.dev/docs/animated` — `Animated.Value`, `Animated.timing()`, `useRef`
  - React Native `StyleSheet`: `https://reactnative.dev/docs/stylesheet`

  **WHY Each Reference Matters**:
  - `src/components/ui/` defines the visual language — this banner MUST look native to the app, not like a third-party widget
  - `SQLiteDownloadState` is the complete state machine — all 4 states (`not_downloaded`, `downloading`, `ready`, `error`) need distinct, clear UI
  - `Animated.timing()` is the right tool for smooth progress bar — not a static width update which would feel janky

  **Acceptance Criteria**:
  - [ ] `src/components/DatabaseDownloadBanner.tsx` exists
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] All 4 states handled: `not_downloaded`, `downloading`, `ready`, `error`
  - [ ] Animated progress bar present (uses React Native `Animated`)
  - [ ] "Download Now", "Pause", "Cancel", "Skip for Now", "Retry" strings present in source
  - [ ] No `as any`, `@ts-ignore`, `@ts-expect-error`, `downloadAsync`

  **QA Scenarios:**

  ```
  Scenario: Component handles all 4 states and exports correctly
    Tool: Bash
    Preconditions: src/components/DatabaseDownloadBanner.tsx exists
    Steps:
      1. Run: node -e "
          const fs=require('fs');
          const src=fs.readFileSync('src/components/DatabaseDownloadBanner.tsx','utf8');
          ['not_downloaded','downloading','ready','error','Download Now','Pause','Cancel','Skip for Now','Retry','Animated','DatabaseDownloadBanner'].forEach(s=>console.log(s+':', src.includes(s)));"
    Expected Result: All 11 strings show true
    Failure Indicators: Any string shows false
    Evidence: .sisyphus/evidence/task-10-component-check.txt

  Scenario: TypeScript compiles cleanly
    Tool: Bash
    Preconditions: src/components/DatabaseDownloadBanner.tsx exists, sqliteFood.ts exists
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep -i DatabaseDownload || echo 'No TS errors for DatabaseDownloadBanner'
    Expected Result: No TypeScript errors referencing DatabaseDownloadBanner.tsx
    Failure Indicators: Any error mentioning DatabaseDownloadBanner.tsx
    Evidence: .sisyphus/evidence/task-10-tsc-check.txt

  Scenario: No forbidden patterns
    Tool: Bash
    Preconditions: src/components/DatabaseDownloadBanner.tsx exists
    Steps:
      1. Run: node -e "
          const fs=require('fs');
          const src=fs.readFileSync('src/components/DatabaseDownloadBanner.tsx','utf8');
          ['as any','@ts-ignore','@ts-expect-error','downloadAsync'].forEach(s=>console.log(s+':', src.includes(s)));"
    Expected Result: All 4 patterns show false
    Failure Indicators: Any pattern shows true
    Evidence: .sisyphus/evidence/task-10-forbidden-patterns.txt
  ```

  **Evidence to Capture:**
  - [ ] task-10-component-check.txt — all state strings + Animated + export verified
  - [ ] task-10-tsc-check.txt — zero TS errors
  - [ ] task-10-forbidden-patterns.txt — no forbidden patterns

  **Commit**: YES
  - Message: `feat(ui): add first-launch SQLite database download with progress`
  - Files: `src/components/DatabaseDownloadBanner.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 11. Wire ContributeFood to Supabase — `user_food_contributions` insert

  **What to do**:
  - Modify `src/screens/ContributeFood.tsx` (created in Task 4) to wire the form submission to Supabase
  - **On form submit** (inside `handleSubmit` or equivalent submit handler):
    1. Set loading state: `setIsSubmitting(true)`
    2. Get current user: `const { data: { user } } = await supabase.auth.getUser()`
    3. Insert row:
       ```
       const { error } = await supabase.from('user_food_contributions').insert({
         user_id:               user?.id ?? null,
         barcode:               barcode ?? null,
         product_name:          productName,          // required
         brand:                 brand || null,
         quantity_description:  quantity || null,
         energy_kcal_100g:      calories ?? null,
         proteins_100g:         protein ?? null,
         carbohydrates_100g:    carbs ?? null,
         sugars_100g:           sugar ?? null,
         fat_100g:              fat ?? null,
         saturated_fat_100g:    saturatedFat ?? null,
         fiber_100g:            fiber ?? null,
         sodium_100g:           sodium ?? null,
         contribution_type:     'new_product',
         notes:                 notes || null,
         is_approved:           false,
       });
       ```
    4. On success (`!error`): show success message "Thank you! Your contribution is under review.", navigate back
    5. On error: show error message "Submission failed. Please try again.", keep form open
    6. Always: `setIsSubmitting(false)` in finally block
  - **Loading state**: Submit button shows spinner and is disabled while `isSubmitting === true`
  - **RLS**: The `user_food_contributions` table's RLS allows authenticated users to insert their own rows — works automatically with the `supabase` anon-key client

  **Must NOT do**:
  - Do NOT set `is_approved: true` on insert (always false — awaits moderation)
  - Do NOT use `as any` or `@ts-ignore`
  - Do NOT use the service_role key in the React Native app (anon key only)
  - Do NOT skip the `setIsSubmitting` loading state (prevents double-submit)
  - Do NOT use column aliases — use exact column names from the migration (`proteins_100g` not `protein`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused wiring of existing form state to a single Supabase insert call
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI already built in T4; this is purely Supabase wiring

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with T9, T10)
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: Nothing
  - **Blocked By**: Task 4 (`ContributeFood.tsx` screen must exist with form state variables)

  **References**:

  **Pattern References**:
  - `src/services/supabase.ts` — Supabase client import: `import { supabase } from '@/services/supabase'`
  - `src/services/barcodeService.ts:280–297` — Pattern for `supabase.rpc()` with `.catch()`. Use similar error-handling structure for the `.insert()` call.
  - `src/screens/ContributeFood.tsx` (Task 4 output) — The form field state variables (`productName`, `brand`, `calories`, etc.) — map these directly into the insert payload.

  **API/Type References**:
  - `supabase/migrations/20260228000001_add_off_products_table.sql:110–138` — **`user_food_contributions` exact column names and types.** Use these verbatim in the insert object.
  - `contribution_type` CHECK constraint (line 125–128): must be one of `'new_product'`, `'off_correction'`, `'ifct_correction'`, `'serving_size'` — use `'new_product'`
  - Supabase JS insert: `supabase.from('user_food_contributions').insert({...})` returns `{ data, error }`

  **WHY Each Reference Matters**:
  - Migration lines 110–138 define EXACT column names — `proteins_100g` not `protein`, `energy_kcal_100g` not `calories`
  - `contribution_type: 'new_product'` must exactly match the CHECK constraint or the insert will fail with a DB error
  - `is_approved: false` is hardcoded — NEVER let user input or app logic set this to true

  **Acceptance Criteria**:
  - [ ] `src/screens/ContributeFood.tsx` calls `supabase.from('user_food_contributions').insert({...})`
  - [ ] `is_approved: false` is hardcoded in the insert payload
  - [ ] `contribution_type: 'new_product'` is in the insert payload
  - [ ] Loading state disables submit button during insert
  - [ ] Success message shown on `!error`
  - [ ] Error message shown on `error`
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] No `as any`, `@ts-ignore`, `@ts-expect-error`, `service_role`

  **QA Scenarios:**

  ```
  Scenario: Supabase insert wiring is present and correct
    Tool: Bash
    Preconditions: src/screens/ContributeFood.tsx modified with Supabase wiring
    Steps:
      1. Run: node -e "
          const fs=require('fs');
          const src=fs.readFileSync('src/screens/ContributeFood.tsx','utf8');
          ['user_food_contributions','is_approved','contribution_type','new_product','isSubmitting','Thank you'].forEach(s=>console.log(s+':', src.includes(s)));"
    Expected Result: All 6 strings show true
    Failure Indicators: Any string shows false
    Evidence: .sisyphus/evidence/task-11-wiring-check.txt

  Scenario: TypeScript compiles cleanly after wiring
    Tool: Bash
    Preconditions: src/screens/ContributeFood.tsx modified
    Steps:
      1. Run: npx tsc --noEmit 2>&1 | grep -i ContributeFood || echo 'No TS errors for ContributeFood'
    Expected Result: No TypeScript errors referencing ContributeFood.tsx
    Failure Indicators: Any error mentioning ContributeFood.tsx
    Evidence: .sisyphus/evidence/task-11-tsc-check.txt

  Scenario: No forbidden patterns
    Tool: Bash
    Preconditions: src/screens/ContributeFood.tsx modified
    Steps:
      1. Run: node -e "
          const fs=require('fs');
          const src=fs.readFileSync('src/screens/ContributeFood.tsx','utf8');
          ['as any','@ts-ignore','@ts-expect-error','service_role'].forEach(s=>console.log(s+':', src.includes(s)));"
    Expected Result: All 4 patterns show false (service_role must NEVER appear in RN app)
    Failure Indicators: Any pattern shows true
    Evidence: .sisyphus/evidence/task-11-forbidden-patterns.txt
  ```

  **Evidence to Capture:**
  - [ ] task-11-wiring-check.txt — all key strings present
  - [ ] task-11-tsc-check.txt — TypeScript compiler clean
  - [ ] task-11-forbidden-patterns.txt — no forbidden patterns

  **Commit**: YES
  - Message: `feat(ui): wire food contribution form to Supabase user_food_contributions`
  - Files: `src/screens/ContributeFood.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run script, query SQLite). For each "Must NOT Have": search codebase for forbidden patterns (`as any`, `@ts-ignore`, `downloadAsync` for SQLite, AGPL code in RN app). Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` across the project. Review all changed/new files for: `as any`/`@ts-ignore`, empty catches, console.log in prod services, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify all new `.mjs` scripts run without syntax errors (`node --check`).
  Output: `Build [PASS/FAIL] | Scripts [N/N valid] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **End-to-End Barcode Scanning QA** — `unspecified-high`
  Start from clean state. Test: (1) SQLite query for a known OFF product returns nutrition in <50ms. (2) Supabase RPC `lookup_barcode` works for a cached product. (3) API fallback chain works for an unknown barcode. (4) User contribution form submits to Supabase. (5) Download flow initiates and can be paused/resumed. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code changes. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Task | Commit Message | Key Files |
|------------|---------------|-----------|
| T1 | `fix(db): expand off_source constraint for global parquet import` | `supabase/migrations/...` |
| T2 | `feat(etl): add global OFF extraction from Parquet via DuckDB` | `scripts/extract-off-global.mjs` |
| T3 | `feat(barcode): add on-device SQLite food database service` | `src/services/sqliteFood.ts` |
| T4 | `feat(ui): add simple food contribution screen for unknown barcodes` | `src/screens/ContributeFood.tsx` |
| T5 | `feat(etl): add global OFF bulk import to Supabase PostgreSQL` | `scripts/sync-off-global.mjs` |
| T6 | `feat(etl): add SQLite build script from PostgreSQL data` | `scripts/build-sqlite.mjs` |
| T7 | `feat(etl): add SQLite upload to Supabase Storage` | `scripts/upload-sqlite.mjs` |
| T8 | `feat(etl): add global OFF delta sync mode` | `scripts/sync-off-global.mjs` |
| T9 | `feat(barcode): wire SQLite-first lookup into barcode scanning flow` | `src/services/barcodeService.ts` |
| T10 | `feat(ui): add first-launch SQLite database download with progress` | `src/components/`, `src/services/sqliteFood.ts` |
| T11 | `feat(ui): wire food contribution form to Supabase user_food_contributions` | `src/screens/ContributeFood.tsx` |

---

## Success Criteria

### Verification Commands
```bash
# Schema migration applied
# (verify via Supabase SQL editor or psql)

# Global extraction produced CSV
node scripts/extract-off-global.mjs
# Expected: data/off-global.csv with 4M+ rows

# Bulk import to Supabase
node scripts/sync-off-global.mjs --import
# Expected: 4M+ rows in off_products table

# SQLite build
node scripts/build-sqlite.mjs
# Expected: data/fitai-foods.sqlite with 1M+ rows (nutrition-filtered)

# TypeScript compiles
npx tsc --noEmit
# Expected: 0 errors

# SQLite query speed
# (tested in QA scenario — <50ms for barcode lookup)
```

### Final Checklist
- [ ] All "Must Have" present (SQLite-first, Supabase L2, full global OFF, resumable download, API fallbacks preserved)
- [ ] All "Must NOT Have" absent (no `as any`, no breaking changes, no direct Gemini, no port 8081, no AGPL in RN)
- [ ] TypeScript compiles with zero errors
- [ ] SQLite database contains 1M+ products with nutrition data
- [ ] Barcode lookup from SQLite completes in <50ms
- [ ] Download flow works with progress indicator
- [ ] User contribution form submits successfully
- [ ] Delta sync script processes OFF daily deltas
