# Wave A-02: Profile + Onboarding Data-Integrity Audit

**Agent:** code-only audit (no device access)
**Scope:** Profile + onboarding data path — types → service → transformers → store → DataBridge → AI pipeline → DB migrations
**Date:** 2026-06-23
**Method:** Per spec `UIUX-DATA-INTEGRITY-GOAL.md` line 99 (code-review-graph MCP disabled for this round), used Read/Grep/Glob directly. Traced the full round-trip for each of the 5 onboarding tabs.

## Summary

The profile/onboarding data path is **mostly sound** — the 11-wave hardening (H1–H24) plus the 2026-06-20 nutrition/auth P0–P3 pass closed the major schema gaps. profileStore is the runtime SSOT, DataBridge updates the store before Supabase, and the enum mappers in `typeTransformers.ts` exist and are wired. **11 remaining issues** were found: 1 P0 (silent loss of validation/calculated fields), 5 P1 (hardcoded deprecated fallbacks, type-lying cast, store-not-updated-after-DB-write, snacks_count divergence, offline-queue overbroad guard), and 5 P2 (SSOT duplication, missing load flags, legacy duplicates).

All findings are AUDIT ONLY — no source was modified.

---

## Findings

### P0-1 — AdvancedReview: 9 calculated/validation fields NEVER computed at save time → silently NULL

**File:** `src/services/onboardingService.ts:622-676` (`calculateAndSave`), `:702-756` (`save`)
**What's wrong:** `calculateAndSave` builds `advancedReviewData` from `ValidationEngine` + `HealthCalculationEngine` output, but OMITS these 9 fields that `save()` then writes to the DB:
- `total_calorie_deficit`
- `data_completeness_percentage`
- `reliability_score`
- `personalization_level`
- `validation_status`
- `validation_errors`
- `validation_warnings`
- `refeed_schedule`
- `medical_adjustments`

Because `calculateAndSave` does not set them, `save()` receives `undefined` and writes `NULL` every time onboarding completes. The `load()` path (lines 841-848) reads them back as `undefined`. So these columns are **permanently empty for every user** — the validation/quality/completeness layer that the architecture doc (§A.6 rows 39-44, 52-53) describes as persisted is a dead schema.
**Root cause:** `calculateAndSave` was written before the validation/completeness layer existed; the `extended` (master-engine) result carries some of these but they were never wired into the `advancedReviewData` object.
**Severity:** P0 (silent data loss — entire columns never populated; architecture doc is wrong about persistence).
**Fix:** In `calculateAndSave`, populate from `extended.*` where the master-engine computes them (it does compute `data_completeness_percentage`, `reliability_score`, `personalization_level`, `medical_adjustments`), and set `validation_status`/`validation_errors`/`validation_warnings` from `validationResult` (which `ValidationEngine.validateUserPlan` returns). `total_calorie_deficit` and `refeed_schedule` need a small derivation or should be dropped from the type + save if unused.

---

### P1-1 — `dietType` type-lying cast drops `"balanced"` from the union

**File:** `src/hooks/useOnboardingLogic.ts:597-601`
**What's wrong:** 
```ts
dietType: (dp?.diet_type || "balanced") as
  | "vegetarian" | "vegan" | "non-veg" | "pescatarian",
```
The runtime value can be `"balanced"` (it's the fallback AND a valid onboarding enum per `DietPreferencesData.diet_type`), but the cast narrows the type to exclude `"balanced"`. This is a silent type-safety violation: downstream code that pattern-matches on `dietType` will never handle `"balanced"` without a TS error, and the worker `diet_type` routing may not pick the right template. The DB CHECK was widened (`20260331000000`) to accept `balanced`, so the data layer is fine — only this cast is wrong.
**Root cause:** Legacy cast predates the `balanced` enum addition; never updated when the constraint widened.
**Severity:** P1 (type-safety hole + potential wrong diet-template routing).
**Fix:** Remove the cast: `dietType: dp?.diet_type ?? "balanced"`. Or better, pass `diet_type` through directly (the snake_case alias is already set at line 643) and delete the camelCase `dietType` field entirely since the architecture doc (D.1) says snake_case is canonical.

---

### P1-2 — Hardcoded `"desk_job"` fallback for deprecated `occupation_type` (4 locations)

**Files:**
- `src/contexts/edit/data-loaders.ts:80` — `occupation_type: profileStorePI?.occupation_type || "desk_job"`
- `src/utils/validation.ts:708` — `occupation_type: info.occupation_type || "desk_job"`
- `src/utils/validation/utils.ts:79` — `occupation_type: info.occupation_type || "desk_job"`
- `src/services/SyncEngine.ts:585-586` — `data.occupation_type || data.occupationType || "desk_job"`
- `src/services/userProfile.ts:648-649` — `get('occupation_type', 'occupationType', 'desk_job')`

**What's wrong:** `occupation_type` is DEPRECATED (architecture doc §A.2 row 11: "DEPRECATED — still saved to DB"; `personal-info.ts:27` comment: "activity_level lives in WorkoutPreferences (SSOT)"). Yet 5 sites fabricate `"desk_job"` when the field is missing — which it always is for new users (onboarding no longer collects it). This injects a false occupation value into TDEE calculations and worker requests. The `userStore.checkProfileComplete` (line 549) correctly excludes it, but the calc/worker paths still consume it.
**Root cause:** Deprecation was incomplete — the field was removed from onboarding collection but the fallbacks were never replaced with `null`.
**Severity:** P1 (violates CLAUDE.md #8 — no hardcoded fallbacks for user data; silently skews TDEE occupation multiplier).
**Fix:** Replace all `|| "desk_job"` with `?? null` (or `?? undefined`). The DB column is nullable; the worker `DietProfileOverrideSchema` (`validation.ts:432`) marks it optional. Then remove `occupation_type` from the TDEE occupation-multiplier path entirely (activity_level from workout_preferences is the SSOT).

---

### P1-3 — Store NOT updated after DB write in profile-edit save path (units + profile edit)

**File:** `src/hooks/useProfileLogic.ts:189-200` (`handleUnitsSelect`), `src/services/userProfile.ts` (updateProfile)
**What's wrong:** The units-save flow: `updatePersonalInfo({ units })` (updates profileStore ✓) → `userProfileService.updateProfile(currentUserId, { units })` (writes Supabase `profiles.units`). But `userProfileService.updateProfile` writes to the `profiles` table via the legacy `userProfile` service, NOT through `onboardingService.PersonalInfoService.save`. So after the DB write, `profileStore.personalInfo` is NOT re-loaded from the DB (correct, store is SSOT), BUT `userStore.profile` is separately updated at lines 181-187 with a hand-rolled spread — a second, divergent copy of the same units value. This duplicates the SSOT: `profileStore.personalInfo.units` and `userStore.profile.personalInfo.units` can drift if either write fails independently.
**Root cause:** Legacy dual-store pattern (userStore + profileStore) not fully retired for the units path.
**Severity:** P1 (CLAUDE.md #1 SSOT violation + #6 store-not-updated-after-DB-write; units can desync across stores).
**Fix:** Route units edits through `dataBridge.savePersonalInfo` (which updates profileStore + queues on failure) and delete the `userStore.setProfile` spread at lines 181-187. `userStore.profile` should be auth-only per its own header comment.

---

### P1-4 — `snacks_count` default divergence (DB=1, type implies optional, onboarding passes undefined)

**Files:**
- DB: `20260413064102_fix_snacks_count_default_to_1.sql` sets DEFAULT 1
- `src/services/onboardingService.ts:176,268` — `data.snacks_count ?? 1`
- `src/hooks/useOnboardingLogic.ts:606` — `snacks_count: dp?.snacks_count` (no fallback → `undefined`)
- `src/types/onboarding/diet-preferences.ts:17` — `snacks_count?: number` (optional)

**What's wrong:** When onboarding completes, `useOnboardingLogic` passes `snacks_count: dp?.snacks_count` with no `?? 1`, so for a user who never touched the snack toggle the value is `undefined`. `DietPreferencesService.save` then falls back to `?? 1`. The DB default is also 1. So the value is consistent — BUT the `DietPreferencesData` type marks it optional, so any downstream consumer (e.g. `aiRequestTransformers.ts:79` `dietPreferences.snacks_count ?? 1`) must repeat the fallback. Three separate fallback sites for one value = divergence waiting to happen.
**Root cause:** The "optional" type annotation conflicts with the NOT-required-but-defaulted DB semantics.
**Severity:** P1 (fragile — any new consumer that forgets the `?? 1` gets `undefined` and meal-count math breaks).
**Fix:** Make `snacks_count: number` (required) in `DietPreferencesData` and `DietPreferencesRow`; set it to `1` at the form/default level so there is exactly one source of truth.

---

### P1-5 — DataBridge offline-queue guard overbroadly skips ALL profile hydration

**File:** `src/services/DataBridge.ts:427-433`
**What's wrong:** 
```ts
if (offlineService.hasPendingActions()) {
  console.error('[DataBridge] Skipping hydration: offline queue has pending actions ...');
  profileStore.setSyncStatus("synced");
} else {
  profileStore.hydrateFromLegacy(batchUpdate);
  ...
}
```
If ANY offline action is queued (even an unrelated meal_log or workout_session), the ENTIRE profile hydration is skipped. A user who edits their profile offline, then logs a meal offline, then reconnects will see an **empty profile screen** until the queue drains — even though the profile data was successfully fetched from Supabase. The code itself flags this via `console.error` + a TODO comment (line 424-426).
**Root cause:** Guard was added to avoid overwriting in-flight profile edits, but `hasPendingActions()` is global, not filtered to profile tables.
**Severity:** P1 (data-integrity: fresh server profile data is fetched then discarded → UI shows stale/empty profile).
**Fix:** Filter `offlineService.hasPendingActions()` to only profile-related tables (`personalInfo`, `dietPreferences`, `bodyAnalysis`, `workoutPreferences`, `advancedReview`) before skipping hydration. Or, since `hydrateFromLegacy` merges with a batch update object that only sets loaded sections, partial hydration is safe — drop the guard and let the merge semantics handle it.

---

### P2-1 — `userStore.profile` duplicates profileStore onboarding data (SSOT violation)

**File:** `src/stores/userStore.ts` (entire file), `src/hooks/useProfileLogic.ts:78-97`
**What's wrong:** `userStore.profile.personalInfo` / `.fitnessGoals` / `.bodyMetrics` hold the SAME onboarding data that `profileStore` holds. `useProfileLogic` merges both via `buildLegacyProfileAdapter` (line 82) into a composite `profile` object. The store's own header (lines 8-31) admits it should be auth-only, but `checkProfileComplete` (line 531) still reads `profile.workoutPreferences`, `updatePersonalInfo`/`updateFitnessGoalsLocal` still exist (deprecated, lines 481, 503), and the units path writes to both (P1-3).
**Root cause:** Incomplete migration from the old userStore-centric model to the profileStore SSOT model.
**Severity:** P2 (two sources of truth for the same data; divergence possible on partial writes).
**Fix:** Remove `personalInfo`, `fitnessGoals`, `bodyMetrics` from `UserProfile`; have `checkProfileComplete` read from `profileStore` directly. Delete the deprecated `updatePersonalInfo`/`updateFitnessGoalsLocal` methods. This is a larger refactor — map to Wave E (profile/settings).

---

### P2-2 — `AdvancedReviewRow` type missing 8 columns that exist in the DB

**File:** `src/types/onboarding/advanced-review.ts:98-156` (`AdvancedReviewRow`)
**What's wrong:** The `AdvancedReviewRow` interface (the nullable DB row type) omits these columns that migrations added to `advanced_review`:
- `detected_climate` — added `20260331000000:21` (but IS in `AdvancedReviewData` line 78; just missing from `Row`)
- `climate_used`, `climate_tdee_modifier`, `climate_water_modifier` (`20260331000000:23-25`)
- `ethnicity_used`, `calculations_version` (`20260331000000:26-27`)
- `bmr_formula_accuracy`, `bmr_formula_confidence` (`20260331000000:28-29`)

Since `load()` uses `select("*")` and spreads `data.*`, these columns return from the DB but are silently dropped because the type doesn't declare them and `load()` builds the object field-by-field (lines 803-856) without them.
**Root cause:** Type not regenerated after the `20260331000000` migration (the architecture doc G-log notes a `supabase gen types` run for `supabase.ts`, but the hand-written `AdvancedReviewRow` wasn't updated).
**Severity:** P2 (silent field drop on load — climate/ethnicity debug columns never round-trip).
**Fix:** Either regenerate `AdvancedReviewRow` from the DB schema, or add the 8 missing columns to the interface. Then add them to the `load()` return object.

---

### P2-3 — `nutritionData.convertMealLogToMeal` hardcodes `user_id: "local-user"`

**File:** `src/services/nutritionData.ts:710`
**What's wrong:** `user_id: mealLog.userId || "local-user"` — fabricates the `"local-user"` sentinel that other services (`analyticsData`, `achievementData`, `crudOperations`, `currentWeight`) explicitly treat as a skip-sync signal. So a meal log converted here with a missing `userId` will be written to Supabase with `user_id="local-user"`, then RLS rejects it (auth.uid() != "local-user"), then it retries forever — exactly the P1-6 class of bug that was fixed for `saveWeeklyMealPlan`/`completeMeal` but not here.
**Root cause:** Pre-P1-6 code; the `getSyncableUserId()` guard wasn't applied to this conversion path.
**Severity:** P2 (queue pollution + infinite retry for guest meal logs that reach this converter; same root cause as P1-6 which is already fixed elsewhere).
**Fix:** Use `getSyncableUserId()` (or leave `user_id` empty + `console.warn`) instead of fabricating `"local-user"`.

---

### P2-4 — `AdvancedReviewData` retains deprecated/non-DB fields that invite dead writes

**File:** `src/types/onboarding/advanced-review.ts:83-91`
**What's wrong:** The type still declares `health_score?` (deprecated, line 83), `vo2_max_estimate?` (UI-only, line 85), `heart_rate_zones?` (UI-only, line 87), `usedFallbackDefaults?` (UI-only, line 91). The `AdvancedReviewRow` (line 152) still declares `health_score` as `@deprecated` — but H3 (architecture doc G-log) says the dead write was removed. Keeping these in the data type risks a future dev re-introducing the dead write, and `health_score` on the Row type is misleading (it IS a real DB column per H3's note "actual column is `overall_health_score`" — so `health_score` is NOT a column; the Row type is wrong).
**Root cause:** Cleanup after H3 was incomplete — type comments added but fields retained.
**Severity:** P2 (type/schema confusion; `health_score` Row field does not exist in DB).
**Fix:** Remove `health_score` from `AdvancedReviewRow` (it's not a DB column). Mark `vo2_max_estimate`, `heart_rate_zones`, `usedFallbackDefaults` as `@ui-only` and move them to a separate UI-only type if needed.

---

### P2-5 — `loadAllData` returns stale store snapshot when `isHydrated` even if DB has newer data

**File:** `src/services/DataBridge.ts:247-257`
**What's wrong:** 
```ts
if (profileStoreState.isHydrated && !options?.forceRefresh) {
  return { ...profileStoreState..., source: "local" };
}
```
Once `isHydrated` is true (set on first load), ALL subsequent `loadAllData` calls without `forceRefresh` return the cached store state and skip the DB entirely. This is intentional for performance, but means: if another device updates the profile, this device never sees it until an explicit `forceRefresh` (pull-to-refresh). Not a bug per se, but the architecture doc §B.3 implies load-from-DB on app start, which doesn't happen for returning hydrated users.
**Root cause:** Performance optimization that sacrifices cross-device freshness.
**Severity:** P2 (stale profile across devices; acceptable for single-device use but breaks multi-device).
**Fix:** Document this as intentional (accept), OR add a lightweight `updated_at` check: fetch `profiles.updated_at` and if newer than `lastSyncedAt`, proceed with full load. Out of scope for this wave — flag for Wave E.

---

## Enum boundary verification (CLEAN)

- `mapActivityLevelForHealthCalc` (`typeTransformers.ts:296-301`): `extreme → very_active`, others pass-through. ✓ Correct.
- `mapActivityLevelForOnboarding` (`:310-329`): inverse, unknown → `moderate` + warn. ✓ Correct.
- `mapDietTypeForHealthCalc` (`:346-363`): `non-veg → omnivore`, `balanced → omnivore`. ✓ Correct.
- `mapDietTypeForOnboarding` (`:373-396`): specialized → `balanced`, unknown → `balanced` + warn. ✓ Correct.
- Diet path (`aiRequestTransformers.ts:178-183`) maps `extreme → very_active`. ✓
- Workout path (`aiRequestTransformers.ts:551`) intentionally passes `activity_level` unmapped (worker Zod accepts `extreme`). ✓ Documented + correct.
- `diet_type` DB CHECK (`20260331000000:39`) accepts all 9 values incl `balanced`/`omnivore`/`keto`/`paleo`. ✓
- Readiness-override safety guard (`resolveDietType` in `nutritional.ts`) only overrides compatible base diets. ✓ (per P0-3)

## Schema/code match verification

Columns written by service `save()` methods vs live migrations:
- `profiles`: all columns match (incl `units`, `occupation_type`, `region`). ✓
- `diet_preferences`: `cuisine_preferences` (H4 ✓), `snacks_count` (H5 ✓), `cooking_methods` (Wave 10 ✓, converted JSONB→TEXT[] by `20260406000000`). ✓
- `body_analysis`: all columns match; `target_weight_kg` NOT NULL dropped (`20260331000000:46`). ✓
- `workout_preferences`: `original_weekly_rate` (`20260406000001` ✓), `boost_extra_cardio_minutes` (`20260410000000` ✓). ✓
- `advanced_review`: `bmi_category`/`health_grade` (H1/H2 ✓), `max_heart_rate`/`bmi_health_risk`/`bmr_formula_used` (`20260406000000` ✓), `was_rate_capped` (`20260331000000:30` ✓), `detected_climate`/`detected_ethnicity` (`20260331000000:21-22` ✓). ✓
- RLS: all 6 onboarding tables have `auth.uid() = user_id` policies (`20250119000000:346-406`). ✓

## Silent-catch verification (profile path)

- `onboardingService.ts`: all 5 service classes `console.error` on DB error + catch. ✓ No empty catches.
- `DataBridge.ts`: all catch blocks `console.error`. ✓
- `profileStore.ts`: no try/catch (Zustand set is sync). ✓
- `useProfileLogic.ts`: catches log errors. ✓
- (Out of profile scope: `haptics.ts` + `accessibility.ts` have intentional silent catches for non-critical UX — acceptable, not profile data.)

## Hardcoded-fallback verification (profile path)

- `aiRequestTransformers.ts:340-348`: calorieTarget now returns `undefined` (not 1800/2200/2800) when missing — P1-1 fixed. ✓
- `onboardingService.ts:366-368`: BMI computed from measurements when missing (BUG-49 fix) — acceptable derivation, not a fake value. ✓
- `useOnboardingLogic.ts:639-640`: `ar?.daily_calories || 0` + `console.warn` — surfaces missing state. ✓
- Remaining hardcoded: `"desk_job"` (P1-2 above), `"local-user"` (P2-3 above).

## useEffect loop verification (profile path)

- `useProfileLogic.ts:114-127`: reads `profileStorePersonalInfo?.units`, writes `setUnitsPreference` + AsyncStorage. No write back to `profileStorePersonalInfo` → no loop. ✓
- `useProfileLogic.ts:100-112`: mount-only load. ✓
- No `useRef` guards needed in the profile path — no self-feeding effects found.

---

## Wave mapping

Per `UIUX-DATA-INTEGRITY-GOAL.md` dispatch plan (lines 77-85):

- **P0-1** (AdvancedReview silent NULL fields) → **Wave B** (progressive-overload + calories deep audit) — fits the "calories SSOT deep audit" code agent since it's about calculated-metric persistence.
- **P1-1** (dietType type-lying cast) → **Wave C** (diet flow) — diet_template routing is diet-domain.
- **P1-2** (`"desk_job"` deprecated fallbacks) → **Wave E** (profile + settings) — occupation_type is a profile field.
- **P1-3** (units store-not-updated / dual-store) → **Wave E** (profile + settings) — units edit is a settings flow.
- **P1-4** (`snacks_count` divergence) → **Wave C** (diet flow) — snacks_count is diet-domain.
- **P1-5** (offline-queue overbroad guard) → **Wave B** (offline-queue audit) — explicitly listed as a Wave B code agent.
- **P2-1** (userStore/profileStore SSOT duplication) → **Wave E** (profile + settings) — profile store consolidation.
- **P2-2** (AdvancedReviewRow missing 8 columns) → **Wave B** (schema/RLS audit) — schema-type alignment.
- **P2-3** (`"local-user"` in nutritionData) → **Wave C** (diet-save integrity) — meal log conversion.
- **P2-4** (deprecated AdvancedReviewData fields) → **Wave B** (schema/RLS audit) — type cleanup.
- **P2-5** (stale hydrated snapshot) → **Wave E** (profile + settings) — pull-to-refresh is a profile UX concern; low priority, may be accepted.

**Recommendation:** Wave B and Wave E carry the bulk of profile/onboarding fixes. None are P0-blocking the onboarding→AI generation round-trip for the *happy path* (the test user will complete onboarding, fields will save, AI will generate). P0-1 only affects the advanced_review validation/completeness columns, which are non-blocking for generation. So the device agent's onboarding E2E (Wave A-01) can proceed in parallel with these code fixes.
