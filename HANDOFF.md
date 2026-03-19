# FitAI — Handoff Document

> Last updated: 2026-03-18 | App is production-ready — major features shipped post-baseline

---

## 🎯 Status: ACTIVE DEVELOPMENT ✅

**Baseline (2026-02-27):** 96/96 Playwright tests passing, 0 TS errors, 0 Supabase 400s (`32898fa`).

**Since baseline (18 commits):** Extra workouts, database-first barcode scanner, admin dashboard, progress/diet screen overhauls, nutrition label scan, Razorpay web checkout, app config system. Latest commit: `51b13b2`.

---

## ✅ Session History

### Sessions 1–3 (baseline, up to `32898fa` — 2026-02-27)

- Sessions 1–2: all 5 tabs working, 117-file code quality pass (shadow compat, theme tokens, `as any` removal, responsive helpers, accessibility), TypeScript strict mode, 0 circular deps, all 24 screens under 500 lines
- Session 3: 96/96 Playwright tests passing. Key fixes: loading loop, `analytics_metrics` 400 (need `id = "${userId}_${date}"`), `progress_entries` 400 (no `recorded_at`), fitness `.single()` → `.maybeSingle()`, AI counter divergence, Google OAuth localhost redirect, PersonalInfo now persists to Supabase, longestStreak calculated correctly

### Session 4 — Phase 2 Barcode Database (`~2026-03-01`)

Oracle-approved (F1 audit: 10/10 must-haves, 11/11 tasks). Barcode scanner is now database-first:

- **SQLite service** `src/services/sqliteFood.ts` — `lookupBarcode()`, resumable download (`createDownloadResumable`, NOT `downloadAsync`)
- **barcodeService.ts** — SQLite (confidence 92) → Supabase RPC → API cascade
- **ETL scripts**: `scripts/extract-off-global.mjs`, `scripts/sync-off-global.mjs` (`--import` + `--delta`), `scripts/build-sqlite.mjs`, `scripts/upload-sqlite.mjs`
- **ContributeFood screen** `src/screens/ContributeFood.tsx` — form for unknown barcodes → `user_food_contributions`
- **DatabaseDownloadBanner** `src/components/DatabaseDownloadBanner.tsx` — 4-state download UI
- **Migration** `20260228000002_expand_off_source_global.sql` — `off_source` now accepts 5 values
- ⚠️ SQLite file (`data/fitai-foods.sqlite`, ~10K India rows) needs manual upload to Supabase Storage

### Session 5 — Extra Workouts (`185fb5e` → `a8723dc`)

- `completed_sessions` DB table + `CompletedSession` type — SSOT for all workout stats
- `fitnessStore` gains `completedSessions` state
- `extraWorkoutService.ts` — `getSuggestions()`, `generateWorkout()`, `completeExtraWorkout()`
- `useQuickWorkouts` hook, `SuggestedWorkouts` updated, `WorkoutSessionScreen` forked for extra workouts
- Analytics migrated to `completedSessions`; `getSessionCaloriesByType()` added

### Session 6 — UI / Feature Overhaul (`51b13b2` — 2026-03-18)

- **Admin dashboard** `fitai-admin/` — full Next.js 15 panel (Users, Plans, Analytics, Config, Cache, Contributions, Webhooks)
- **Admin Workers API** `fitai-workers/src/handlers/admin.ts` (630 lines) + app config `fitai-workers/src/utils/appConfig.ts`
- **Nutrition label scan** `fitai-workers/src/handlers/nutritionLabelScan.ts` — new vision handler
- **Progress screen** — new `WeightJourneySection`, `WorkoutConsistencySection`, `GoalProgressSection`, `AchievementShowcase`
- **Diet screen** — `LogMealModal`, `DietScreenHeader`, `HydrationPanel` major rewrites; `NutritionSummaryCard` added
- **Auth** — Google auth reworked (`native-auth.ts`, `web-auth.ts`); `RazorpayWebCheckout.ts` added
- **Hooks** — `useAppConfig`, `usePaywall`, `useUser`
- **Migrations** — admin tables, food contributions, meal recognition metadata, workout sessions + meal logs schema fixes

---

## 🏗️ Architecture Quick Reference

```
App.tsx
  └── WelcomeScreen (if not authenticated)
  └── OnboardingContainer (5 steps for new user)
       └── PersonalInfoTab, DietPreferencesTab, BodyAnalysisTab, WorkoutPreferencesTab, AdvancedReviewTab
  └── MainNavigation  ← custom useState (NOT React Navigation)
       ├── HomeScreen          → useHomeLogic.ts
       ├── FitnessScreen       → useFitnessLogic.ts + useQuickWorkouts.ts
       ├── AnalyticsScreen     → analyticsStore.ts + analyticsData.ts
       ├── DietScreen          → useMealPlanning.ts + useNutritionTracking.ts + useAIMealGeneration.ts
       └── ProfileScreen       → useProfileLogic.ts
            └── Settings (SettingsScreenRenderer) → individual screen components
```

Session screens (full-screen overlays, hide tab bar): WorkoutSessionScreen, MealSession, CookingSessionScreen, ProgressScreen, ProgressTrendsScreen, AchievementsScreen, ContributeFood.

Admin panel: `fitai-admin/` (separate Next.js 15 app — not part of the RN build).

Note: `fitnessStore.completedSessions[]` is the SSOT for all completed workout data (plan + extra).

### Subscription Tiers

| Tier  | Price   | AI Gens   | Scans     |
| ----- | ------- | --------- | --------- |
| Free  | ₹0      | 1/month   | 10/day    |
| Basic | ₹299/mo | 10/day    | Unlimited |
| Pro   | ₹599/mo | Unlimited | Unlimited |

---

## 🔑 Credentials & Endpoints

| Resource          | Value                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dev account       | `sharmaharsh9887@gmail.com` / `Harsh@9887`                                                                                                                                                                         |
| Supabase URL      | `https://mqfrwtmkokivoxgukgsz.supabase.co`                                                                                                                                                                         |
| Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08` |
| AI Workers        | `https://fitai-workers.sharmaharsh9887.workers.dev`                                                                                                                                                                |

### Test Accounts (all password: `TestFitAI@2024!`)

| Tab       | Port | Email                    |
| --------- | ---- | ------------------------ |
| sessions  | 8082 | test.sessions@fitai.dev  |
| diet      | 8083 | test.diet@fitai.dev      |
| fitness   | 8084 | test.workout@fitai.dev   |
| analytics | 8085 | test.analytics@fitai.dev |
| home      | 8086 | test.home@fitai.dev      |
| profile   | 8087 | test.profile@fitai.dev   |

**Port 8081 is reserved — DO NOT USE.**

---

## 📊 Database Schema (verified — non-obvious columns)

- **profiles**: NO `height_cm` / `weight_kg` columns. `wake_time`/`sleep_time` format: `"07:00:00"` (not `"07:00"`)
- **fitness_goals**: `time_commitment` valid value: `"45-60"` (NOT `"45"`)
- **analytics_metrics**: `id` must be supplied as `"${userId}_${date}"`
- **progress_entries**: NO `recorded_at` column
- **workout_preferences**: NO `preferred_workout_duration` or `fitness_level` columns
- **off_products**: `off_source` CHECK allows exactly: `'off-parquet-india'`, `'off-parquet-global'`, `'off-api-live'`, `'off-delta'`, `'off-delta-global'`
- **completed_sessions**: SSOT for all completed workout data — stores `caloriesBurned`, session type, date
- **user_food_contributions**: `contribution_type` defaults to `'new_product'`; `is_approved` defaults to `false`
- **admin_users**, **app_configs**: created in `20260315000001_create_admin_tables.sql`
- **food_contributions**: created in `20260315000002_create_food_contributions_table.sql`
- **meal_recognition_metadata**: created in `20260314_create_meal_recognition_metadata.sql`

---

## 🗂️ Key File Map

- **Stores**: `src/stores/` — fitness, nutrition, user, profile, subscription, analytics, achievement, hydration
- **Fitness SSOT**: `src/stores/fitness/` — `completedSessions[]` is the runtime SSOT for all completed workouts
- **AI generation**: `src/ai/index.ts`, schemas in `src/ai/schemas.ts`
- **Completion logic**: `src/services/completionTracking.ts` + `src/services/completion-tracking/`
- **Calorie calc**: `src/services/calorieCalculator.ts`
- **Extra workouts**: `src/services/extraWorkoutService.ts`, `src/hooks/useQuickWorkouts.ts`
- **Barcode pipeline**: `src/services/barcodeService.ts` (SQLite-first) → `src/services/sqliteFood.ts` → Supabase RPC `lookup_barcode()` → `src/services/freeNutritionAPIs.ts`
- **DB migrations**: `supabase/migrations/` (timestamp-named `.sql` files)
- **Workers API**: `fitai-workers/src/handlers/`
- **Admin Workers**: `fitai-workers/src/handlers/admin.ts`
- **App config**: `src/hooks/useAppConfig.ts` ← `fitai-workers/src/utils/appConfig.ts`
- **Supabase client**: `src/services/supabase.ts`
- **ETL scripts**: `scripts/extract-off-global.mjs`, `scripts/sync-off-global.mjs`, `scripts/build-sqlite.mjs`, `scripts/upload-sqlite.mjs`
- **Local SQLite**: `data/fitai-foods.sqlite` (~10K India rows; full global needs Parquet download)
- **Admin panel**: `fitai-admin/` (Next.js 15, separate from RN app)

---

## 🧪 Playwright Setup

```bash
# MUST clear profile dirs before each run
rm -rf /tmp/fitai-playwright-sessions /tmp/fitai-playwright-diet \
       /tmp/fitai-playwright-fitness /tmp/fitai-playwright-analytics \
       /tmp/fitai-playwright-home /tmp/fitai-playwright-profile

# MUST use launchPersistentContext — NOT chromium.launch
const context = await chromium.launchPersistentContext(userDataDir, { ...options });

# Start all 6 Expo servers
npx expo start --web --port 8082 &  # sessions
npx expo start --web --port 8083 &  # diet
npx expo start --web --port 8084 &  # fitness
npx expo start --web --port 8085 &  # analytics
npx expo start --web --port 8086 &  # home
npx expo start --web --port 8087 &  # profile

# Run all test suites in parallel
node scripts/test-sessions-isolated.mjs &
node scripts/test-diet-isolated.mjs &
node scripts/test-fitness-isolated.mjs &
node scripts/test-analytics-isolated.mjs &
node scripts/test-home-isolated.mjs &
node scripts/test-profile-isolated.mjs &
```

**MCP Playwright does NOT work on this machine** — Chrome exits `0xC0000135` (missing DLL). Use Node.js scripts only.

---

## ⚙️ Hard Constraints

- DO NOT use port 8081 (reserved for user's terminal)
- DO NOT use `as any`, `@ts-ignore`, `@ts-expect-error`
- DO NOT use `FileSystem.downloadAsync()` for large files — use `createDownloadResumable()` (Android 60s timeout bug)
- DO NOT import `ifct2017` npm in the RN app (AGPL-3.0 — server-side only)
- DO NOT use `Alert.alert` directly — use `crossPlatformAlert` from `src/utils/crossPlatformAlert.ts`
- DO NOT commit unless explicitly asked
- DO NOT edit files outside `src/` unless strictly necessary (App.tsx is the only committed exception)
- Everything must be world-class quality — no shortcuts on UI/UX

---

## 🚀 What's Next

The app is production-ready. All planned features are shipped. Pending items are infrastructure/manual actions:

### ⚠️ Manual Actions Required (Blocked by DNS / credentials)

1. **Upload SQLite to Supabase Storage** ← most important
   - File: `data/fitai-foods.sqlite` (~2.4 MB, 10K India rows)
   - Destination: `food-databases` bucket → `fitai-foods-latest.sqlite` (and `fitai-foods-2026-03-01.sqlite`)
   - Dashboard: https://supabase.com/dashboard/project/mqfrwtmkokivoxgukgsz/storage/buckets/food-databases
   - Once uploaded, `DatabaseDownloadBanner` in the app will work end-to-end
   - Script `scripts/upload-sqlite.mjs` exists but can't run locally (DNS blocks Supabase SDK)

2. **Push Supabase migrations** — `npx supabase db push`
   - Covers: `off_source` global constraint, `completed_sessions`, `user_food_contributions`, admin tables, meal recognition metadata

3. **Deploy Cloudflare Workers** — `cd fitai-workers && npx wrangler deploy`
   - Covers: admin handler, nutrition label scan handler, app config

4. **Deploy admin panel** — `cd fitai-admin && vercel deploy`
   - Next.js 15 admin panel — not yet deployed to Vercel

### 🌍 Full Global SQLite (1M+ products)

Requires manual download of the 1.5 GB OFF Parquet file first:

```bash
# 1. Download Parquet (~1.5 GB)
curl -L "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true" -o data/food.parquet

# 2. Extract nutrition-filtered CSV (~1-1.8M rows)
node scripts/extract-off-global.mjs

# 3. Bulk import to Supabase PostgreSQL
node --env-file=.env scripts/sync-off-global.mjs --import

# 4. Build SQLite from PostgreSQL
node --env-file=.env scripts/build-sqlite.mjs

# 5. Upload to Storage (manually via Dashboard if DNS blocked)
node --env-file=.env scripts/upload-sqlite.mjs
```

### 🚢 Production Build

```bash
# Android APK (both variants)
bash build-both-apks.sh

# Android production (blocked — needs EAS credentials)
# eas credentials --platform android
```

### 🔮 Suggested Next Features

- Test coverage improvement (currently ~1.12% — `src/` has no test files)
- iOS wearable integration (HealthKit) — notepads exist at `.sisyphus/notepads/ios-wearable-integration/`
- Razorpay subscription flow end-to-end test (Playwright)
