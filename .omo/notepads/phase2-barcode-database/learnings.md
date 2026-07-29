# Learnings — phase2-barcode-database

## [2026-02-28] Session Init

### Architecture
- Vercel AI SDK v5 in fitai-workers only — NOT in RN app
- All AI calls go through `fitaiWorkersClient` → `https://fitai-workers.sharmaharsh9887.workers.dev`
- `EXPO_PUBLIC_GEMINI_API_KEY` does NOT exist — never reference it
- Model: `'google/gemini-2.0-flash'`

### Key File Paths
- Migration already deployed: `supabase/migrations/20260228000001_add_off_products_table.sql`
- India ETL template: `scripts/extract-off-india.mjs` (93 lines)
- India sync template: `scripts/sync-off-india.mjs` (150 lines)
- Barcode service: `src/services/barcodeService.ts` (443 lines)
- Supabase client: `src/services/supabase.ts`
- Workers nutrition handler: `fitai-workers/src/handlers/nutritionEstimate.ts`

### DuckDB Pattern
- Import: `@duckdb/node-api`
- Init: `DuckDBInstance.create(':memory:')`
- Count: `conn.runAndReadAll()`
- Copy/Extract: `conn.run()`
- Path normalization: `replace(/\\/g, '/')` on Windows

### Supabase
- URL: `https://mqfrwtmkokivoxgukgsz.supabase.co`
- Storage bucket: `food-databases` (public)
- Stable alias: `fitai-foods-latest.sqlite`
- RPC: `lookup_barcode(p_barcode)` — returns best match by tier
- RPC: `upsert_barcode_cache(...)` — cache-back for API results

### Critical Constraints
- NO `as any`, `@ts-ignore`, `@ts-expect-error`
- NO `downloadAsync()` — use `createDownloadResumable()` (Android 60s bug)
- NO port 8081
- NO AGPL `ifct2017` in RN app
- NO breaking changes to existing fallback pipeline
- SQLite confidence level: 92 (above Supabase tier-1 at 90)
- off_source values (5 total): 'off-parquet-india', 'off-parquet-global', 'off-api-live', 'off-delta', 'off-delta-global'

### OFF Data
- Global parquet: https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true
- ~4.35M total products, ~1.2-1.8M with nutrition data
- ~20K India-tagged rows in existing off_products table
- Delta index: https://static.openfoodfacts.org/data/delta/index.txt

## [2026-02-28] Task 5 — sync-off-global.mjs

### Script Pattern
- Global sync script mirrors India sync exactly (same clean(), upsertBatch(), CSV streaming)
- 4 differences: off_source='off-parquet-global', CSV='off-global-nutrition.csv', progress every 10K rows (not every batch), runDelta() is stub
- Progress logging for large datasets: only log when `total % 10000 === 0` to avoid console spam for 1M+ rows
- `node --check <file>` validates ESM syntax without executing (no env vars needed)
- runDelta() stub returns immediately — real global delta implementation deferred to Task 8
- Global script: `scripts/sync-off-global.mjs` (151 lines)

## [2026-02-28] Task 8 — Global Delta Mode

### Implementation
- Replaced `runDelta()` stub with full streaming implementation (206 lines total)
- Added `streamLines(url)` helper: `https.get` → `zlib.createGunzip()` → `readline.createInterface()` → returns AsyncIterable
- Delta files (.jsonl.gz) are 10-50 MB compressed — MUST stream-decompress, never buffer in memory
- `fetchText()` kept for index.txt (small plaintext file) — only `.jsonl.gz` files need gzip streaming
- No India filter (`en:india` / `890` prefix) — global mode processes ALL products
- `off_source: "off-delta-global"` — must match exactly (Supabase CHECK constraint)
- 7-day cutoff logic preserved from India template (only process recent delta files)
- Empty lines skipped with `if (!line.trim()) continue` before JSON.parse
- Products without `code` skipped with `if (!code) continue`

### Smoke Test Notes
- `node --check` validates ESM syntax without needing runtime deps or env vars
- `csv-parse` not installed in local env — script fails at import before reaching delta code
- All 7 required symbols verified present: off-delta-global, zlib, readline, createGunzip, streamLines, runImport, off-parquet-global


## [2026-02-28] Task 6 — build-sqlite.mjs

### Script Pattern
- `better-sqlite3` for synchronous SQLite creation in Node.js — fast, no async overhead
- Supabase REST API with `range()` pagination (page size 1000) to read off_products
- Filter `.not('energy_kcal_100g', 'is', null)` removes products without nutrition data
- Slim 14-column schema (drops imported_at, off_source, countries_tags, ingredients_text, allergens_tags, etc.)
- WAL mode during build for faster inserts → DELETE mode before close for single-file shipping
- `db.transaction()` wraps batch inserts for 10-50x speedup vs individual inserts
- Progress log every 100K rows (check: `total % 100000 < PAGE_SIZE`)
- meta table stores version (YYYY-MM-DD), source ('off-global'), built_at (ISO timestamp)
- Output: `data/fitai-foods.sqlite` — `data/` dir created if missing
- `better-sqlite3` needed `npm install` — was not previously in project dependencies
- Script: `scripts/build-sqlite.mjs` (170 lines)
## [2026-02-28] Task 7 — upload-sqlite.mjs

### Script Pattern
- Reads `data/fitai-foods.sqlite` with `fs.readFileSync()` (Buffer, not stream) for Supabase Storage upload
- Pre-flight: `existsSync()` + `statSync().size >= 50 * 1024 * 1024` — exits 1 if either fails
- `createBucket('food-databases', { public: true })` — ignores "already exists" error via `bucketErr.message.includes()`
- Versioned copy: `fitai-foods-{YYYY-MM-DD}.sqlite` with `upsert: true` (idempotent re-runs)
- Stable alias: `fitai-foods-latest.sqlite` with `upsert: true`
- Both uploads use `contentType: 'application/octet-stream'`
- Public URL via `sb.storage.from('food-databases').getPublicUrl('fitai-foods-latest.sqlite')`
- Script: `scripts/upload-sqlite.mjs` (98 lines)


## [2026-03-01] Seed + Build via Management API

### Execution Results
- `scripts/seed-off-via-management-api.mjs`: ✅ Ran successfully — 31 products fetched (53 failed/not-found on OFF), 49 total in off_products (includes prior rows), 26 with nutrition data
- `scripts/build-sqlite-via-api.mjs`: ✅ Ran successfully — 43 rows (products with energy_kcal_100g IS NOT NULL), built in 2.2s
- Output: `data/fitai-foods.sqlite` — 43 rows, meta: version=2026-03-01, source=off-api-live-via-mgmt

### OFF API Hit Rate
- ~37% hit rate on barcode lookups (many Indian barcodes not in OFF database)
- Nutrition data: 26 out of 31 found products have energy_kcal_100g
- SQLite only includes products with energy_kcal_100g IS NOT NULL → 43 rows out of 49 total

### Next Blocking Step: Upload SQLite
- `upload-sqlite.mjs` uses `@supabase/supabase-js` → project DNS blocked → cannot run
- Manual upload required: Supabase Dashboard → Storage → food-databases → upload `data/fitai-foods.sqlite` as `fitai-foods-latest.sqlite`
- OR: When DNS is resolved, run `node --env-file=.env scripts/upload-sqlite.mjs --force`

### Full Production Pipeline (when user downloads Parquet)
1. `node scripts/extract-off-global.mjs` (needs data/food.parquet, ~1.5GB download)
2. `node --env-file=.env scripts/sync-off-global.mjs --import` (seeds 1M+ rows into off_products)
3. `node --env-file=.env scripts/build-sqlite-via-api.mjs` (rebuilds fitai-foods.sqlite with 1M+ rows)
4. Upload `data/fitai-foods.sqlite` to Storage as `fitai-foods-latest.sqlite`


## [2026-03-01] sync-off-india-via-api.mjs
- Created `scripts/sync-off-india-via-api.mjs` to bulk-upsert ~27K India OFF products via Supabase Management API
- First run failed on ALL 140 batches due to two DB constraint issues:
  1. `nutriscore_grade` CHECK constraint only allows `a,b,c,d,e` or NULL — CSV had `unknown` and `not-applicable` values
  2. Numeric column overflow — columns are `NUMERIC(6,3)` and `NUMERIC(6,4)` but OFF data has wild outlier values (e.g. fat_100g=5666, sodium_100g=142377)
- Fix: Added `cleanNutri()` to map invalid grades to NULL, and `clampNum(v, maxAbs)` to NULL-out values exceeding column precision
- Column precision limits discovered: energy_kcal_100g NUMERIC(8,2), proteins/carbs/sugars/fat/sat_fat/fiber NUMERIC(6,3), sodium NUMERIC(6,4)
- Second run: 27,821 rows upserted in 217s (0 errors), final count 27,822 rows
- Batch size 200 with 50ms delay between batches works well for Management API rate limits
- Management API endpoint: `https://api.supabase.com/v1/projects/{ref}/database/query` — accepts raw SQL via POST
## [2026-03-01] Full India Pipeline — COMPLETED

### Results
- `scripts/extract-off-india.mjs`: Fully rewritten with correct DuckDB schema
  - Nutriment names: use base names WITHOUT `_100g` suffix (e.g., `energy-kcal`, `proteins`, `fat`)
  - `struct_extract(list_filter(nutriments, x -> x.name = 'energy-kcal')[1], '100g')` — confirmed working
  - product_name/ingredients_text: STRUCT(lang,text)[] — use list_filter(...lang='en')[1].text
  - Output: `data/off-india.csv` — 27,821 rows, 9.5MB, 21 columns
- `scripts/sync-off-india-via-api.mjs`: Created, 27,821 rows upserted in 214.8s (0 errors)
- `data/fitai-foods.sqlite`: Rebuilt with 10,962 rows (products with energy_kcal_100g NOT NULL), 2.4MB

### Storage Upload — PENDING MANUAL ACTION
- `fitai-foods.sqlite` is at `D:\FitAi\FitAI\data\fitai-foods.sqlite` (2.4MB)
- DNS blocked — cannot use Supabase JS SDK or direct project URL
- Management API doesn't support Storage file uploads
- **User must manually upload via Supabase Dashboard:**
  1. Go to https://supabase.com/dashboard/project/mqfrwtmkokivoxgukgsz/storage/buckets/food-databases
  2. Upload `data/fitai-foods.sqlite` as `fitai-foods-latest.sqlite`
  3. Also upload as `fitai-foods-2026-03-01.sqlite` (versioned backup)



## [2026-03-01] Phase 2 UI Wiring — COMPLETED

### What was wired
- `DatabaseDownloadBanner` (default export, no props) rendered in `DietScreen.tsx` above `NutritionSummaryCard`.
- `ContributeFood` (named export, props: `route.params.barcode` + `navigation.goBack`) wired into `MainNavigation.tsx` via `contributeFoodSession` state.
- `onBarcodeNotFound` callback chain: `barcode-handlers.ts` → `useAIMealGeneration` → `DietScreen`.

### Key findings
- `useAIMealGeneration` has its **own inline** `handleBarcodeScanned` that does NOT delegate to `createBarcodeHandlers`. Both needed `onBarcodeNotFound` added independently.
- Hook signature changed from `()` to `(options?: { onBarcodeNotFound?: (barcode: string) => void })`. Optional object keeps all existing callers without args working.
- Alert preserved in not-found branch — `onBarcodeNotFound` fires AFTER the alert so UX still shows "Product Not Found" before navigating.
- `DietScreen` passes `(barcode) => navigation?.navigate('ContributeFood', { barcode })` — optional chain handles cases where `navigation` is undefined.
- Pre-existing `npx tsc --noEmit` errors (missing `react` typings, `--jsx` not set, ES5 target) are project-wide and unrelated to our changes.