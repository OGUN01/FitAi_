# FitAI Improvements Catalog

> Read-only audit produced 2026-06-21. Prioritized across 9 areas.
> Format per item: `- [max|med|min] (S|M|L) <area>: <description with file:line if known>`
> severity = user impact · effort = dev hours (S<2h, M=2–8h, L>8h)

## 1. Architecture / SSOT

- [max] (M) Architecture: Two parallel EditContext implementations — legacy `src/contexts/EditContext.tsx` (618 lines, the one actually imported by `EditOverlay.tsx` + `ProfileScreen.tsx`) vs newer `src/contexts/edit/EditProvider.tsx` (372 lines + hooks/ + types/, orphaned/parallel). Pick one, delete the other. Tech-debt root cause for edit-mode bugs.
- [max] (L) Architecture: `src/services/DataBridge.ts` is 1733 lines with 11 inline TODOs and an overbroad offline-guard (line ~424) that skips ALL hydration if ANY offline action is pending, even unrelated tables — documented to "cause empty profile screens if only non-profile tables are queued." Refactor into per-table hydration with a mutex; scope the guard to profile tables only.
- [max] (M) Architecture: `fitnessStore.ts` (1518 lines), `healthDataStore.ts` (1465 lines), `nutritionStore.ts` (1385 lines), `achievementStore.ts` (1126 lines) are god-stores. Split by domain slice (e.g. fitnessStore → planStore + sessionStore + progressStore) so subscriptions are scoped and re-renders shrink.
- [med] (M) Architecture: `DietScreen.tsx` (1425 lines) + `WorkoutSessionScreen.tsx` (1190 lines) + `ScheduleBuilderScreen.tsx` (999 lines) are mega-screens. Extract feature subcomponents + hooks (pattern already used in `useWorkoutDetailLogic` / `useFitnessLogic`) so each is <400 lines.
- [med] (M) Architecture: `ai/index.ts` (1019 lines) is a monolith exporting workout + meal + async-job + motivational logic. Split into `ai/workoutService.ts`, `ai/mealService.ts`, `ai/asyncJobClient.ts` mirroring the `workoutGeneration.ts`/`mealGeneration.ts` split already started.
- [med] (S) Architecture: `aurora-tokens.ts` is the authoritative token SSOT but `constants.ts` still re-exports `THEME`/`ResponsiveTheme` and `useResponsiveTheme` wraps it — two API surfaces. Delete the re-exports once the hook migrates to `rp()/rf()` against aurora directly (memory notes Wave 7 left this as P2).
- [med] (S) Architecture: `src/types/onboarding.ts` is a deprecated barrel (`@deprecated Import directly from './onboarding/'`) still re-exported widely. Finish the cut-over so only `types/onboarding/` exists.
- [min] (S) Architecture: `OnboardingReviewData` is documented as a "Legacy camelCase wrapper for completion flow" (architecture doc A.1). Replace with direct `AdvancedReviewData` + transformer to retire the legacy shape.

## 2. Data Integrity

- [max] (M) Data: `userMetricsService.ts:227` reads deprecated `health_score` (dead-write removed per H3, but read remains) while `aiRequestTransformers.ts:328` correctly sends `overall_health_score`. The metrics service can return null/0 for health score for users whose data was saved under the old column — reconcile reads to `overall_health_score` and backfill any rows.
- [max] (M) Data: `advanced-review.ts:82,151` keeps deprecated `health_score?` field on both `AdvancedReviewData` and `AdvancedReviewRow` ("not a DB column"). Remove the field + `DATA_CATEGORY_SUPABASE_MAP.md:138` reference to stop shadowing the canonical `overall_health_score`.
- [med] (M) Data: `DataBridge.ts` overbroad offline guard (line ~424) can leave profile screens empty when only non-profile offline actions (meal_logs/workout_sessions) are queued. Filter the guard to profile-related tables only as the TODO itself prescribes.
- [med] (S) Data: `useWorkoutDetailLogic.ts:36` TODO — `isFavorited` is local-only state, not persisted, so favorites reset on every navigation away+back. Persist to `workout_templates` or a `favorites` table.
- [med] (S) Data: `useAsyncMealGeneration.ts:72,116` TODO — recentJobs tracking not implemented + a `.catch(() => {})` swallows AsyncStorage cleanup errors (only silent-catch found in src). Implement tracking and surface the cleanup error via `console.error`.
- [med] (S) Data: `EditProvider.tsx:197` comment notes `restrictions` is "hardcoded []" in one SectionData path while the validator populates it — verify all 5 edit sections load every field from the SSOT profile store rather than seeding defaults that overwrite real data on save.
- [min] (S) Data: `workout_sessions` still writes the legacy `duration` column for back-compat while reads use `total_duration_minutes` (H18). Confirm no code path still reads `duration`, then drop the dead write + add a migration to drop the column.

## 3. Performance

- [max] (L) Performance: God-stores (`fitnessStore` 1518, `healthDataStore` 1465, `nutritionStore` 1385, `analyticsStore` 972) cause broad re-renders — any selector change re-renders all subscribers. Introduce `useStore` with shallow selectors / `createSelector` slices per domain (Zustand `createWithEqualityFn` + `shallow`).
- [max] (M) Performance: `DietScreen.tsx` (1425 lines) renders large lists inline — confirm it uses `FlatList`/`SectionList` with `getItemType`/`keyExtractor` + `React.memo` rows rather than `ScrollView.map()`. Audit all 1400+ line screens for un-virtualized long lists.
- [med] (M) Performance: `ExerciseGifPlayer` + `GifPlayerContent` load full videos/gifs eagerly — verify lazy loading + caching across the workout list (one gif per visible card, not all). Heavy list with N exercise gifs will jank.
- [med] (S) Performance: `useEffect` loops are flagged in CLAUDE.md #10 — audit the god-stores for `useEffect`s that write to state they read without a `useRef` guard (graph shows low cohesion in `stores-when` 0.065, `stores-meals` 0.203, `stores-scan` 0.386 communities — re-render hotspots).
- [med] (S) Performance: `healthDataStore.loadHealthMetricsHistory` fetches ALL metric_types for N days; charts subscribe to the whole blob. Add per-metric selector + lazy load (only fetch a metric when its chart mounts).
- [min] (S) Performance: `code-review-graph` has 0 embedded nodes — run `embed_graph_tool` once so `semantic_search_nodes` uses vector search instead of keyword fallback (faster future exploration).

## 4. UX / UI (Aurora modernization completeness)

- [max] (M) UX: `features/workouts/components/ExerciseCard.tsx` still has ~30 raw hex colors (`#1A1A2E`, `#6C63FF`, `#4CAF50`, `#888`, `#333`, set-type colors `#E0E0E0`/`#FF9800`/`#F44336`/`#9C27B0` at lines 31-34). This is the single biggest Aurora-migration gap — the file even has a comment "ActivityIndicator → AuroraSpinner" (line 12) showing the migration was started but the color tokens weren't finished.
- [max] (S) UX: Multiple non-Aurora `ActivityIndicator` usages remain in production paths: `ConnectionCard.tsx`, `ExerciseGifPlayer.tsx`, `Camera.tsx`, `FoodRecognitionFeedback.tsx`, `CreateRecipeModal.tsx`, `PaywallModal.tsx`, `AuthWrapper.tsx`, `AsyncInitializer.tsx`, `LoadingSpinner.tsx`, `FoodRecognitionTest.tsx`, `GeminiTestComponent.tsx`. Replace with `AuroraSpinner` (Wave 6.5 only did 4 screens).
- [med] (S) UX: `DietScreen.tsx:1255,1274` + `DeloadModal.tsx:73` use `rgba(0,0,0,0.5)`/`rgba(0,0,0,0.6)` overlays with a TODO "use theme overlay color when added". Add an `overlay` token to `aurora-tokens.ts` and apply.
- [med] (S) UX: `screens/workouts/PlanModificationPlaceholder.tsx` is a placeholder screen (TODO 5.5 "Plan modification deferred"). Either implement plan modification or remove the dead placeholder route.
- [med] (S) UX: `hooks/useResponsiveTheme.ts:14` keeps a `console.warn('ResponsiveTheme calculation failed')` fallback — legacy debug noise; once ResponsiveTheme is retired this fallback path goes too.
- [min] (S) UX: `geminiTestComponent.tsx`, `FoodRecognitionTest.tsx`, `MigrationTestComponent.tsx`, `debug/` components ship in the app bundle — gate behind `__DEV__` or move to a dev-only entry to shrink bundle + avoid debug UI leaking to prod.

## 5. AI Generation Quality

- [max] (M) AI: `ai/index.ts:364-372` `generateMotivationalContent` returns hardcoded placeholder strings ("⚠️ [aiService] Motivational content uses placeholder") — users see fake content. Wire to a worker handler + prompt or remove the feature + its UI entrypoints.
- [max] (M) AI: `ai/constrainedWorkoutGeneration.ts` is a 460+ line deprecated module (`@deprecated This entire module is deprecated and should not be used`) with 0 production callers. Delete it (graph confirms no callers) — risk of accidental re-use + maintenance cost.
- [med] (M) AI: `100_PERCENT_WORKING_REPORT.md` + `ARCHITECTURE_AND_STATUS.md` in `fitai-workers/` document that early tests used wrong Zod schemas (workout schema copied for meal gen) and invalid enum values. Add a schema-fuzz test that generates requests across the full enum space (activity_level, diet_type, intensity, fitnessGoal, availableEquipment) to catch the documented schema/transformer mismatches statically.
- [med] (S) AI: `ai/index.ts` logs `cache_hit` / `job_started` / `job_status` via `console.warn` with emoji (lines 654, 676, 759) — these are debug logs in a prod path. Gate behind `__DEV__` or remove per CLAUDE.md (no console.log in prod paths).
- [med] (S) AI: `aiRequestTransformers.ts` keeps hardcoded calorie fallbacks 1800/2200/2800 (marked ACCEPTABLE in arch doc for guest users). Confirm the `console.warn` fires for every fallback so guest-flow calorie leaks are visible, and ensure the UI surfaces "estimated" not "target" for guests.
- [min] (S) AI: `WorkoutEngine.ts:306` computes `estimatedCalories` from weight + MET; verify this pre-generation estimate is clearly labeled "estimated" in the UI and never overrides `WorkoutProgress.caloriesBurned` (CLAUDE.md #9) at completion.

## 6. Error Handling

- [max] (S) Errors: `useAsyncMealGeneration.ts:116` has the only silent `.catch(() => {})` in src (AsyncStorage.removeItem). Replace with `.catch(e => console.error('AsyncStorage cleanup failed', e))` per CLAUDE.md #5.
- [med] (S) Errors: `useResponsiveTheme.ts:14` and multiple `EditContext`/`EditProvider` paths use `console.warn` for validation/control errors (e.g. `EditContext.tsx:380 "Validation error"`). Promote genuine failures to `console.error`; keep `warn` for recoverable degradation only.
- [med] (S) Errors: `ai/asyncJobHandling.ts:80,154` logs `transformDietResponseToWeeklyPlan returned null` with a 500-char JSON dump via `console.error` — useful but verify the worker returns a structured error instead of the client having to JSON-parse-truncate. Add a typed error field to the job-status response.
- [med] (S) Errors: `features/workouts/WorkoutEngine.ts:133,301` warns when `personalInfo.age` is missing — confirm these surface to the user as a "profile incomplete" state rather than silently generating a degraded workout.
- [min] (S) Errors: `backupRecoveryService.cleanup.test.ts:79` TODO — AppState handling not implemented in BackupRecoveryService. Without it, backups can be interrupted by backgrounding with no resume/recovery.

## 7. Testing / CI (including .maestro flows + automated builds)

- [max] (M) Testing: No CI gate runs `tsc --noEmit` or `jest`. `.github/workflows/` only contains `ios-prebuild.yml` (macOS prebuild verification). Add a `ci.yml` that runs type-check + jest + `expo export --platform android` on every PR — the memory file treats these as the non-regression gates but they're not enforced remotely.
- [max] (M) Testing: `.maestro/` is untracked (`?? .maestro/` in git status) — the new E2E flows (01-authenticated-full-screens, 02-guest-onboarding-screens) + visual-regression screenshots are not committed. Commit them and wire a `maestro test` step into CI (needs an Android emulator job).
- [max] (S) Testing: `offline.rollback.test.ts:64` notes "Alert.alert notification not implemented" and there's no rollback-notification test. Add coverage for the offline-rollback user-facing alert path (using `crossPlatformAlert`).
- [med] (M) Testing: `code-review-graph` shows 5441 functions / 1375 test nodes — test:code ratio is low for the data-heavy health-calculation + store layer. Prioritize tests for `healthCalculations/` (BMR/TDEE/macros), `DataBridge` hydration branches, and `aiRequestTransformers` enum mapping.
- [med] (S) Testing: `backupRecoveryService.cleanup.test.ts` has a skipped TODO block — either implement AppState handling + the test or delete the skip to keep the suite honest.
- [med] (S) Testing: `build-both-apks.sh` hardcodes absolute Windows paths (`PROJECT_DIR="D:/FitAi/FitAI"`, ADB path). Make it portable (use `$(git rev-parse --show-toplevel)` + `$ANDROID_HOME`) so CI/other devs can run it.
- [min] (S) Testing: Maestro flows use `.*[Ee]mail.*`/`.*[Pp]assword.*` text matchers — fragile to placeholder copy changes. Add `testID`s to the login inputs and match on those.

## 8. Tech Debt (dead code, TODO/FIXME, ResponsiveTheme retirement)

- [max] (S) Debt: Delete `ai/constrainedWorkoutGeneration.ts` — fully `@deprecated`, 0 callers (verified via grep). 460+ lines of dead code.
- [max] (S) Debt: Delete `screens/workouts/PlanModificationPlaceholder.tsx` — TODO 5.5 "Plan modification deferred", 0 callers/importers. Dead placeholder route.
- [max] (M) Debt: Consolidate the duplicate EditContext — delete the orphaned `src/contexts/edit/` directory (EditProvider + hooks + types + validation, 372+ lines) OR migrate `EditOverlay.tsx` + `ProfileScreen.tsx` to it and delete the legacy `contexts/EditContext.tsx` (618 lines). One must go.
- [med] (S) Debt: `stores/userStore.ts:477,499,528` keeps 3 deprecated methods (`updatePersonalInfo`, `updateWorkoutPreferences`, `updateFitnessGoalsLocal`) that console.error on call. Grep shows no remaining callers — delete them.
- [med] (S) Debt: `services/fitnessData.ts:242` deprecated `fitness_goals` path retained "but unused" per arch doc H-item. Confirm 0 callers of the deprecated table methods, then delete the dead service branch.
- [med] (S) Debt: `utils/constants.ts` — `ResponsiveTheme`/`THEME` deprecated re-exports (memory Wave 7/8 left these as back-compat shim). With 0 live `ResponsiveTheme.X` usages in src (only the `useResponsiveTheme` hook + tests), retire the hook then delete the shim for a single token SSOT.
- [med] (S) Debt: `utils/healthCalculations/metabolic.ts:309` `@deprecated` water calc superseded by `calculators/waterCalculator.ts`. Confirm callers migrated, delete the old function.
- [med] (S) Debt: `DataBridge.ts` has 10 `TODO: syncMutex.withLock() should wrap queue operations` comments (lines 548-755) — double-sync races are documented but unguarded. Wrap queue ops in the mutex.
- [min] (S) Debt: `types/onboarding.ts` deprecated barrel still re-exported. Finish cut-over to `types/onboarding/` (see Architecture section).
- [min] (S) Debt: `docs/DATA_CATEGORY_SUPABASE_MAP.md:138` lists deprecated `health_score` column — update the map to `overall_health_score` only.

## 9. Security / RLS

> **Orchestrator correction (2026-06-21):** The original 3 `[max]` items below
> OVERCLAIMED "no RLS." Verified against `supabase/migrations/`: `api_logs`,
> `generation_history` DO have RLS (`20250115000004` — SELECT `auth.uid()=user_id`,
> INSERT service-role-only). `workout_cache`/`meal_cache` DO have RLS + `user_id`
> (`20250129000003`). `exercise_media`/`diet_media` DO have RLS (`20250115000004`).
> The real residual weakness is the cache SELECT policy's `OR user_id IS NULL`
> clause — see VERIFIED-FINDINGS.md "Security-1".

- [med] (S) Security: `workout_cache`/`meal_cache` SELECT policy is `auth.uid() = user_id OR user_id IS NULL` (`20250129000003`). The NULL branch makes any shared/legacy/guest cache entry readable by ANY authenticated user. Since `cache_key` is a deterministic hash of request params (not secret), this is cross-user readable of cached plans containing personal health data. Tighten: drop the NULL branch, or migrate NULL rows to a per-user scope, or gate shared reads behind a deliberate flag. **Needs product decision** (shared caching is a cost optimization).
- [med] (S) Security: `webhook_events` table uses `USING (true)` for `service_role_all_webhook_events` (migration `20260220000001:137`) — acceptable for service_role, but verify there's NO authenticated/anon policy so regular users can't read webhook payloads (subscription events, user_ids).
- [med] (S) Security: `app_config` public-read policy allows `authenticated` to read categories `('features','app','maintenance')` and explicitly excludes `'ai'` (model secrets). Audit that no secret has been miscategorized into a readable category; add a CHECK constraint or a test asserting `ai` rows never match the public predicate.
- [med] (S) Security: `admin_users`/`app_config` admin policies rely on `auth.jwt()->'app_metadata'->>'role' = 'admin'`. Confirm the role can only be set via the service_role key (not client-updatable user_metadata) — otherwise privilege escalation.
- [min] (S) Security: `fitnessStore` + `healthDataStore` fire-and-forget Supabase writes (`.catch(console.error)`) are correct for UX but mean a failed write is invisible to the user. Add a lightweight retry/toast for persistent write failures so users don't lose data silently.
- [min] (S) Security: `api_logs`/`generation_history` may log full request bodies (PII: health conditions, diet preferences). Verify retention + that the RLS fix above is sufficient; consider a retention job + column redaction for sensitive fields.
- [med] (S) Security: `webhook_events` table uses `USING (true)` for `service_role_all_webhook_events` (migration `20260220000001:137`) — acceptable for service_role, but verify there's NO authenticated/anon policy so regular users can't read webhook payloads (subscription events, user_ids).
- [med] (S) Security: `app_config` public-read policy allows `authenticated` to read categories `('features','app','maintenance')` and explicitly excludes `'ai'` (model secrets). Audit that no secret has been miscategorized into a readable category; add a CHECK constraint or a test asserting `ai` rows never match the public predicate.
- [med] (S) Security: `admin_users`/`app_config` admin policies rely on `auth.jwt()->'app_metadata'->>'role' = 'admin'`. Confirm the role can only be set via the service_role key (not client-updatable user_metadata) — otherwise privilege escalation.
- [min] (S) Security: `fitnessStore` + `healthDataStore` fire-and-forget Supabase writes (`.catch(console.error)`) are correct for UX but mean a failed write is invisible to the user. Add a lightweight retry/toast for persistent write failures so users don't lose data silently.
- [min] (S) Security: `api_logs`/`generation_history` may log full request bodies (PII: health conditions, diet preferences). Verify retention + that the RLS fix above is sufficient; consider a retention job + column redaction for sensitive fields.

## Priority order (top 15 across all areas)

1. - [max] (M) Security: `api_logs` + `generation_history` have `user_id` but NO RLS — cross-user data exposure (migration `20250115000003`). Fix immediately.
2. - [max] (M) Security: `workout_cache` + `meal_cache` global tables, NO RLS, NO user_id — cached plans readable by any user (migration `20250115000001`).
3. - [max] (S) Errors: `useAsyncMealGeneration.ts:116` only silent `.catch(() => {})` in src — replace with `console.error` (CLAUDE.md #5).
4. - [max] (M) Testing: No CI gate runs `tsc --noEmit`/`jest`/`expo export` — add `ci.yml`; the memory's non-regression gates aren't enforced remotely.
5. - [max] (M) Testing: `.maestro/` untracked — commit the new E2E flows + wire into CI.
6. - [max] (S) Debt: Delete `ai/constrainedWorkoutGeneration.ts` (460 lines, `@deprecated`, 0 callers).
7. - [max] (S) Debt: Delete `screens/workouts/PlanModificationPlaceholder.tsx` (0 callers, deferred TODO 5.5).
8. - [max] (M) Architecture: Resolve duplicate EditContext — legacy `contexts/EditContext.tsx` (618 lines, imported) vs orphaned `contexts/edit/` (372+ lines). Delete one.
9. - [max] (L) Architecture: `DataBridge.ts` (1733 lines, 11 TODOs) overbroad offline-guard causes empty profile screens — refactor + scope guard to profile tables.
10. - [max] (M) Data: `userMetricsService.ts:227` reads deprecated `health_score` while `aiRequestTransformers` writes `overall_health_score` — reconcile + backfill.
11. - [max] (M) UX: `ExerciseCard.tsx` ~30 raw hex colors — biggest remaining Aurora-migration gap (migration started, colors unfinished).
12. - [max] (M) AI: `generateMotivationalContent` returns hardcoded placeholder strings to users — wire to worker or remove feature.
13. - [max] (M) Performance: God-stores (fitness 1518, health 1465, nutrition 1385 lines) cause broad re-renders — introduce shallow selectors + split by domain.
14. - [max] (M) Security: `exercise_media` table NO RLS — confirm no client write path + add SELECT-authenticated / service_role-write policies.
15. - [max] (S) UX: ~11 production components still use raw `ActivityIndicator` instead of `AuroraSpinner` (Wave 6.5 only did 4) — finish the migration.
