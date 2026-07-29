# Draft: Phase 2 — Self-Hosted Barcode-to-Nutrition Database

## Requirements (confirmed)
- Database-first barcode scanner — no runtime API calls for known products
- Excellent Indian product coverage (GS1 890 prefix)
- Self-hosted in Supabase (already using `mqfrwtmkokivoxgukgsz.supabase.co`)
- Fallback to external APIs (OFF, UPCitemdb, USDA) for unknown products, then cache results
- Gemini AI (via Cloudflare Workers) as last resort — only with product name, never raw barcode
- User contribution to grow the database over time
- Modeled after HealthifyMe / MyFitnessPal approach

## Research Findings — Complete Synthesis (6 Librarian Agents)

### 1. HealthifyMe Architecture (Agent: bg_92a3dd8a ✅)
- **Database**: Fully proprietary, 10K+ Indian foods, 6M+ global foods
- **Origin**: Started as Excel sheet (2013), seeded from NIN/ICMR data + US FDA
- **IFCT integration**: India's authoritative 528-food table is their foundation
- **Architecture**: Cloud-first API lookup (PostgreSQL/RDS on AWS), no confirmed local DB
- **Not-found cascade**: Text search → HealthifySnap (photo AI on SageMaker) → Manual entry → Ria chatbot (OpenAI)
- **User contributions**: Siloed per user (NOT crowd-sourced like OFF/MFP)
- **Does NOT use**: Open Food Facts, GS1 India DataKart
- **Key insight**: Their moat is the curated Indian food database — manually built over 10+ years
- **No open-source code or APIs**: Zero GitHub repos, no reverse-engineered wrappers

### 2. MyFitnessPal Architecture (Agent: earlier ✅)
- **Database**: 20.5M+ entries, primarily crowdsourced (MySQL + MongoDB + Redis on AWS)
- **Barcode scanning**: Premium-only since Oct 2022
- **Indian coverage**: POOR — no dedicated Indian dietitian review, conflicting entries
- **Data accuracy**: Up to 25-30% error on user-submitted entries
- **API**: CLOSED as of 2026
- **Key insight**: Crowdsourcing without quality control leads to unreliable data

### 3. Indian Government Databases (Agent: bg_81d2edac ✅)
- **IFCT 2017**: 528 raw foods × 151 nutrients. NO barcodes. Digital via `nodef/ifct2017` npm (AGPL-3.0). Legal caveat for commercial use.
- **FSSAI**: NO barcode→nutrition database exists publicly. Only company license verification.
- **NIN**: IFCT 2017 is their only published work. "NutriPro" is unrelated commercial software.
- **GS1 India DataKart**: THE authoritative Indian barcode registry — but subscription-only, not public.
- **Bottom line**: No single Indian government barcode→nutrition API exists.

### 4. Open Food Facts Data Exports (Agent: bg_24a5b079 ✅)
- **Formats**: CSV (~0.9GB compressed), JSONL (~7GB), Parquet (~1.5GB on HuggingFace), MongoDB dump
- **Update frequency**: Nightly full dumps + daily deltas (14-day rolling window)
- **Total products**: ~4.35M globally
- **India-tagged**: ~20,289 products; GS1 890-prefix: ~8,000-12,000
- **Indian brand coverage**: ~15-25% of shelf SKUs (sparse)
- **Completeness**: ~30-40% of listed Indian products have full nutrition data
- **Data quality**: Crowdsourced — photos transcribed by volunteers. ~30-40% of rows have NULL nutrition.
- **Import path**: DuckDB → filter India subset → CSV → PostgreSQL COPY
- **India-only size in PostgreSQL**: ~5-50 MB (trivially small)
- **Key tool**: `guenthermi/open-food-facts-postgresql-import` on GitHub

### 5. Self-Hosted Supabase Approach (Agent: bg_a17dffc2 ✅)
- **Recommended 3-layer architecture**:
  1. Device: Expo SQLite cache (~55 MB for 50K products)
  2. Supabase: 150K-500K products (Pro tier $25/mo needed for 8GB)
  3. API fallback: OFF → UPCitemdb → USDA → cache back to Supabase
- **Schema**: Flat denormalized `products` table with HASH + B-tree indexes on barcode
- **Per-100g canonical**: Store nutrition per 100g, compute per-serving on the fly
- **Confidence scoring**: 95-100 (verified) → 80-94 (OFF full data) → 60-79 (OFF partial) → 40-59 (user) → 20-39 (AI)
- **User contributions**: `product_edits` table with moderation queue
- **Duplicate prevention**: `pg_trgm` similarity matching + barcode UNIQUE constraint
- **Mobile cache**: Pre-built SQLite file hosted on Supabase Storage, downloaded on install (~55 MB)
- **Delta sync**: OFF provides daily deltas for 14 days; nightly ETL via pg_cron or GitHub Actions
- **Supabase Free tier INSUFFICIENT**: Even India-only with indexes = ~150-250 MB, but will grow rapidly with caching

### 6. GitHub/Kaggle Datasets (Agent: bg_8d7e762b ✅)
- **WITH barcodes** (only option): Open Food Facts — ~20K India products, ODbL license
- **Without barcodes (raw Indian foods)**:
  - `nodef/ifct2017`: 542 foods × 151 nutrients (AGPL-3.0)
  - `lindsayjaacks/Indian-Nutrient-Databank`: 1,000+ Indian recipes (Open Access)
  - `kanishk307/IndianFoodDatasetGeneration`: 6,000+ Indian recipes (no nutrition values)
  - Various Kaggle CSV datasets (INDB-derived, 250-1000 rows)
- **Commercial APIs (for reference)**:
  - Bon Happetee: 15K+ Indian foods, 5K packaged, RapidAPI pricing ($49-199/mo)
  - Fitterfly: 40K+ Indian+global foods, KLIK API, enterprise pricing
  - FatSecret: 2.3M+ foods, Premier Free tier for startups <$1M revenue

## Technical Decisions
- **Primary data source**: Open Food Facts Parquet dump → filtered for India + global popular brands
- **Secondary data source**: IFCT 2017 via nodef/ifct2017 for generic Indian food items (non-barcoded)
- **Storage**: Supabase PostgreSQL (Pro tier likely needed long-term)
- **Mobile cache**: Expo SQLite with pre-built DB file download
- **Schema style**: Flat denormalized (avoid joins on hot path)
- **Index strategy**: HASH primary on barcode + B-tree secondary
- **Sync**: OFF daily deltas + full re-import monthly
- **User contributions**: product_edits table with auto-approve heuristics + manual moderation queue

## User Decisions (from interview)
1. **Hosting**: Will migrate Supabase to a VPS with good configuration (NOT Supabase Pro tier — self-hosted PostgreSQL)
2. **Mobile cache**: Pre-built download preferred, but wants MOST resolution at Layer 1 (device) — minimize layered approach
3. **User contribution**: Simple macro entry for 'barcode not found' flow
4. **Resolve function**: Supabase Edge Functions (recommended — closest to DB)
5. **Test strategy**: Agent QA only (no formal unit tests)
6. **GS1 India DataKart**: User interested in buying access for one-time download, then resolving locally

## GS1 India DataKart Research (CRITICAL)
- **What it is**: Cloud-based product data repository where brand owners upload their product data
- **Products**: Millions of Indian products registered with barcodes
- **Data fields**: Product name, brand, images, pack size, category, MRP. Some brand owners upload nutritional info, but it is NOT mandatory.
- **Pricing**: Membership-based, fees vary by annual turnover. MSME plans start ~₹3,000 + GST. Retailer subscriptions for data access have separate pricing.
- **Bulk download**: NOT explicitly offered as 'download all'. DataKart is designed for query-based access or real-time data exchange, not bulk dump.
- **Nutrition data**: PARTIAL — only available if brand owners uploaded it. NOT guaranteed for all products.
- **Terms**: Designed for retailers/solution providers. Using data in a mobile app would require a commercial agreement with GS1 India.
- **⚠️ VERDICT**: DataKart is NOT a 'buy once, download all nutrition data' solution. It's a B2B platform for product data exchange. Nutrition data is incomplete. Would need to contact GS1 India sales team directly for a custom arrangement.

## Revised Strategy Based on User Preferences

### User wants: Most resolution at Layer 1 (device), minimal layering

**Practical reality check**: There is NO single database that has 'all Indian barcodes + nutrition'. Even HealthifyMe built theirs over 10+ years with 100+ employees.

**Best achievable approach for Layer 1 dominance:**
1. **Import ALL of OFF global** (4.35M products) into PostgreSQL → generate SQLite for device
   - This gives ~20K Indian + millions of global products on-device
   - Size: ~200-400 MB SQLite with slim schema (still viable for mobile)
2. **Supplement with USDA FoodData Central** (downloadable CSV, ~500K branded items)
3. **IFCT 2017** for generic Indian food lookups (542 items, no barcodes)
4. **Cache-back**: Any API-resolved product gets written to both PostgreSQL AND the next SQLite build
5. **User contributions**: Grow the database from user scans

### Why this beats GS1 DataKart:
- GS1 DataKart doesn't guarantee nutrition data
- OFF + USDA already have nutrition for their entries
- Growing via API cache-back is automatic and free
- No commercial agreements needed (OFF is ODbL, USDA is public domain)

## Scope Boundaries
- **INCLUDE**: PostgreSQL schema on VPS, OFF data import pipeline, USDA import, barcode lookup flow modification, Supabase Edge Function for resolve, user contribution, pre-built SQLite for device
- **EXCLUDE**: Food photo recognition, recipe nutrition calculation, diet plan integration, admin moderation UI, GS1 India DataKart integration (not viable as bulk download)
