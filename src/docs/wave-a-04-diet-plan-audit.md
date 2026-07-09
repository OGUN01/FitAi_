# Wave A-04 — Diet / Meal-Plan Data-Integrity Audit

**Agent:** code-only (flat). **Wave:** A (AUDIT ONLY — no source edits).
**Date:** 2026-06-23.
**Scope:** Diet/meal-plan data integrity — nutrition store, meal planning hook, meal logging UI, diet plan generation, macro calculations, type transformers.
**Method:** Per `src/docs/UIUX-DATA-INTEGRITY-GOAL.md` lines 74/99, code-review-graph MCP is DISABLED for this goal; used Read/Grep/Glob + the auto-generated `supabase-types.generated.ts` (the live-DB source of truth per architecture doc §G) to verify schema/code match. No emulator, no commits.

## Files traced (full reads)
- `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`, `src/docs/FITAI_DATA_ARCHITECTURE.md` (both IN FULL)
- `src/stores/nutritionStore.ts` (1401 lines, full)
- `src/hooks/useMealPlanning.ts` (654 lines, full)
- `src/hooks/useNutritionData.ts` (partial — the SSOT-relevant sections)
- `src/components/diet/LogMealModal.tsx` (1341 lines, full)
- `src/services/nutritionData.ts` (735 lines, full)
- `src/services/nutritionRefreshService.ts` (274 lines, full)
- `src/services/completionTracking.ts` (completeMeal section, lines 461–692)
- `src/services/crudOperations.ts` (meal-log ops, lines 295–385)
- `src/services/DataBridge.ts` (storeMealLog/updateMealLog/getMealLogs, lines 1274–1353)
- `src/utils/mealLogNutrition.ts` (full)
- `src/services/aiRequestTransformers.ts` (diet_type boundary)
- All `supabase/migrations/*meal_logs*` + `weekly_meal_plans` + `20250129000002_add_session_log_tables.sql`
- `src/services/supabase-types.generated.ts` (`meal_logs` + `weekly_meal_plans` Row/Insert shapes)

## Findings

### P0-1 — `LogMealModal` corrupts `weeklyMealPlan` by injecting manual meal logs as planned meals
**File:** `src/components/diet/LogMealModal.tsx:425-449`
**What's wrong:** `handleSave` builds `newMeal` (a logged meal) then does:
```ts
const updatedPlan = { ...currentPlan, meals: [...currentPlan.meals, newMeal] };
setWeeklyMealPlan(updatedPlan);
await saveWeeklyMealPlan(updatedPlan);
```
A manually-logged meal is appended into `weeklyMealPlan.meals` (the AI PLANNING array) and the whole plan is re-saved to `weekly_meal_plans`. This conflates two distinct data classes: planned meals (SSOT for "what to eat") vs logged meals (SSOT for "what was eaten"). The comment at `nutritionStore.ts:639-640` explicitly states "weeklyMealPlan remains planning UI and must never contribute to consumed totals" — this injection violates that invariant.
**Root cause:** No separation between the plan array and the consumed-meals array. The component uses `weeklyMealPlan` as a carrier for both.
**Severity:** P0 — corrupts the AI plan; persisted to Supabase so survives reload; the manual meal also lacks a `loggedAt` so `getConsumedMealsFromState` (`isLoggedMeal` = `typeof meal.loggedAt === "string"`) SKIPS it, meaning the just-logged meal does NOT roll up into today's consumed totals until `completionTrackingService.completeMeal` separately inserts a `meal_logs` row and the realtime handler (or `addDailyMeal` call at completionTracking.ts:589) picks it up. Window of stale UI + permanent plan pollution.
**Recommended fix:** Do NOT mutate `weeklyMealPlan`. Call `useNutritionStore.getState().addDailyMeal(newMeal)` (with `loggedAt: completedAt`) directly, then call `completionTrackingService.completeMeal`. Drop the `setWeeklyMealPlan`/`saveWeeklyMealPlan` calls entirely from the manual-log path.

### P0-2 — Manual meal log lacks `loggedAt` → silently dropped from consumed totals
**File:** `src/components/diet/LogMealModal.tsx:397-423`
**What's wrong:** `newMeal` sets `isCompleted: true`, `completedAt`, `createdAt`, `sourceMetadata` — but NO `loggedAt`. The SSOT consumed-nutrition selector `getConsumedMealsFromState` (`nutritionStore.ts:189-191`) filters by `isLoggedMeal(meal)` = `Boolean(meal && typeof meal.loggedAt === "string")`. Without `loggedAt`, the meal is invisible to `getTodaysConsumedNutrition()`/`getConsumedNutrition()`.
**Root cause:** Field-name confusion — the plan-meal type uses `completedAt`, the logged-meal SSOT uses `loggedAt`. The component set the former, not the latter.
**Severity:** P0 — the logged meal does not appear in the calorie/macro rings until the realtime round-trip from the separate `meal_logs` insert completes. Silent data-loss window + depends on realtime being healthy.
**Recommended fix:** Set `loggedAt: today.toISOString()` on `newMeal`. Better: route entirely through `addDailyMeal` (see P0-1).

### P0-3 — `completionTracking.completeMeal` partial revert leaves store inconsistent on DB failure
**File:** `src/services/completionTracking.ts:639-656`
**What's wrong:** On Supabase `meal_logs` insert failure, the catch reverts `mealProgress[mealId]` to `{progress:0, completedAt:undefined, logId:undefined}` — but `nutritionStore.completeMeal(mealId, logData?.logId)` was already called at line 470, which set `progress:100, completedAt, logId` directly in the store. The revert overwrites `progress` to 0 but the earlier `completeMeal` call also created the `mealProgress[mealId]` entry; the revert does not delete it, and `addDailyMeal` (line 589) only runs in the success branch so it is NOT called on failure — yet the optimistic `completeMeal` store action already ran. Net state after failure: `mealProgress[mealId] = {progress:0, completedAt:undefined, logId:undefined}` (good) but the earlier `set((state) => ({ mealProgress: { ...state.mealProgress, [mealId]: { ...progress:100, completedAt, logId } } }))` from `nutritionStore.completeMeal` (line 580-596) already overwrote the entry once; the revert's spread `...state.mealProgress[mealId]` reads the post-optimistic entry. Result: state is partially reverted but the `crudOperations.createMealLog` AsyncStorage write at line 529 already happened → local AsyncStorage now has a meal log with NO matching Supabase row.
**Root cause:** Two writers (`nutritionStore.completeMeal` and `completionTracking`'s inline Supabase insert) both mutate `mealProgress` without a transaction; the revert only touches one writer's fields.
**Severity:** P0 — local/Supabase divergence on every offline meal completion; the meal shows as not-completed in UI but AsyncStorage has a completed log row that `persistData` will re-write on next persist.
**Recommended fix:** Single ownership: `completionTracking.completeMeal` should call `nutritionStore.completeMeal` AFTER the Supabase insert succeeds (optimistic-then-confirm), or the Supabase insert should move INTO `nutritionStore.completeMeal` (the store is the runtime source per Principle 6). On failure, call a single `revertMealCompletion(mealId)` store action that removes both the `mealProgress` entry AND the matching `dailyMeals` entry, and rolls back the AsyncStorage `createMealLog`.

### P1-4 — Sugar & sodium totals are ALWAYS 0 for Supabase-hydrated meals (schema gap)
**File:** `src/stores/nutritionStore.ts:1110-1148` (hydrate path) vs `src/utils/mealLogNutrition.ts` (derive functions)
**What's wrong:** `meal_logs` live schema (`supabase-types.generated.ts:1777-1801`) has columns: `total_calories, total_protein, total_carbohydrates, total_fat` — but NO `total_fiber`, `total_sugar`, `total_sodium` columns. The store's hydrate path derives `fiber` via `deriveMealLogFiber(foodItems)` (reads `food_items.macros.fiber` or `food_items.fiber`) but does NOT call `deriveMealLogSugar` for sugar, and does not derive sodium at all — `sugar` and `sodium` are left undefined → `sumMealNutrition` (line 182-183) reads `meal.totalMacros?.sugar || 0` and `meal.totalMacros?.sodium || 0` → both always 0.
**Root cause:** `deriveMealLogSugar` exists (`mealLogNutrition.ts:97`) but is only used in the realtime handler (`nutritionStore.ts:1271`), NOT in the `loadData` hydrate path (line 1124 only sets `fiber`). And there is no `deriveMealLogSodium` at all. The `logMeal` insert (`nutritionData.ts:496-522`) and `completionTracking` insert (line 536-562) also never persist sugar/sodium even as derived columns.
**Severity:** P1 — sugar/sodium tracking is silently broken for any meal that was not logged in the current session (i.e. after reload). The UI rings/charts for sugar & sodium undercount. Calorie/protein/carbs/fat are correct (top-level columns); fiber is correct (derived).
**Recommended fix:** (a) In `loadData` hydrate path, set `sugar: deriveMealLogSugar(foodItems)` alongside the existing `fiber: deriveMealLogFiber(foodItems)` — symmetric. (b) Add `deriveMealLogSodium(foodItems)` to `mealLogNutrition.ts` (read `food_items.macros.sodium` || `food_items.sodium`, like `getMealLogItemFiber`) and use it in both hydrate + realtime paths. (c) Optionally add `total_sugar`/`total_sodium` columns to `meal_logs` for queryable top-level totals (mirrors the fiber-in-food_items pattern).

### P1-5 — Triple-source diet preferences (Principle 1 violation)
**File:** `src/hooks/useMealPlanning.ts:71-73, 92-95, 102, 348, 391-394`
**What's wrong:** `useMealPlanning` reads diet preferences from THREE places:
1. `profileDietPreferences = useProfileStore((state) => state.dietPreferences)` (SSOT per architecture doc §E.3)
2. `mergedDietPreferences = useMemo(() => buildLegacyDietPreferences(profileDietPreferences), ...)` (legacy adapter from SSOT — a transform, not a separate source, OK-ish)
3. `dietPreferences` destructured from `useNutritionData()` (line 102) — this calls `nutritionDataService.getUserDietPreferences(userId)` which queries Supabase `diet_preferences` directly (independent of profileStore)

Line 348 (`!mergedDietPreferences && !dietPreferences`) and line 391-394 (`profileDietPreferences || mergedDietPreferences || dietPreferences || undefined`) treat all three as interchangeable. They are NOT: the Supabase fetch is async and can lag the profileStore (which is hydrated from AsyncStorage instantly). On cold start the Supabase `dietPreferences` may be stale/missing while `profileDietPreferences` is fresh — and vice versa after an edit that hasn't synced yet.
**Root cause:** `useNutritionData` was left in place after the profileStore became SSOT; its `dietPreferences`/`loadDietPreferences` are vestigial.
**Severity:** P1 — generation can occasionally use stale diet prefs (e.g. just-edited allergy not yet synced → allergen appears in generated plan). Not silent data loss, but integrity drift.
**Recommended fix:** Remove `dietPreferences` from `useNutritionData`'s return + delete `getUserDietPreferences`/`loadDietPreferences`. `useMealPlanning` should read ONLY `profileDietPreferences` (and the legacy transform if the AI client still needs the legacy shape). The architecture doc §E.3 already states `profileStore.dietPreferences` is the source.

### P1-6 — `logMeal` (nutritionDataService) writes Supabase directly without updating the Zustand store
**File:** `src/services/nutritionData.ts:441-576`
**What's wrong:** `logMeal` calls `crudOperations.createMealLog` (AsyncStorage) then `supabase.from("meal_logs").insert(...)` directly — but does NOT call `useNutritionStore.getState().addDailyMeal(...)`. So after `logMeal` returns success, `getTodaysConsumedNutrition()` is stale until the realtime `meal_logs` channel fires `handleMealLogRealtimeChange` (which can take seconds, or never if realtime is disconnected).
**Root cause:** Bypasses the store (Principle 6: "After any DB write, update the store immediately so UI reflects reality without a full reload"). The `completionTracking.completeMeal` path correctly calls `addDailyMeal` (line 589), but `nutritionDataService.logMeal` does not.
**Severity:** P1 — silent stale UI after any caller using `nutritionDataService.logMeal` (e.g. barcode/label scan flows). Relies on realtime being healthy.
**Recommended fix:** After the successful Supabase insert (line 522), call `useNutritionStore.getState().addDailyMeal({ id: mealId, type: mealData.type, name: mealData.name, items: resolvedFoods, totalCalories: nutritionTotals.calories, totalMacros: {...}, loggedAt, ... })` so the store SSOT reflects the write immediately.

### P1-7 — `logMeal` diverges AsyncStorage vs Supabase on partial failure
**File:** `src/services/nutritionData.ts:493-530`
**What's wrong:** `crudOperations.createMealLog(mealLog)` (AsyncStorage) runs at line 493. Then Supabase insert at 496-522. If Supabase insert errors (line 524), the function returns `{success:false}` — but the AsyncStorage row was already written and is NOT rolled back. The two stores now disagree.
**Root cause:** No transaction / rollback; AsyncStorage write is not conditional on Supabase success.
**Severity:** P1 — local-only phantom meal that inflates local totals but never reaches Supabase; on next `loadData` (authed) the AsyncStorage meal is replaced by Supabase rows, so it self-heals on reload, but within a session the UI is wrong and the offline queue is NOT engaged (the queue is only used by `offlineService.queueAction`, not by this direct insert path).
**Recommended fix:** Either (a) write Supabase first, AsyncStorage only on success (matches the "DB-first" pattern in `nutritionStore.completeMeal`), or (b) on Supabase failure, queue via `offlineService.queueAction` AND keep the AsyncStorage row (so offline users still see it) — but mark `syncStatus: PENDING` and ensure `loadData` reconciles.

### P2-8 — `convertMealLogToMeal` uses hardcoded `"local-user"` user_id (Principle 8)
**File:** `src/services/nutritionData.ts:707-731` (specifically line 711)
**What's wrong:** `convertMealLogToMeal` returns `user_id: mealLog.userId || "local-user"`. The `"local-user"` sentinel is a hardcoded fallback for user data — directly forbidden by Principle 8 ("No Hardcoded Fallbacks for User Data... If the real value is unavailable, surface that as `null`/`0` and log a warning"). The architecture doc notes P2-15 fixed this exact pattern in `progressData.ts`; this instance was missed.
**Root cause:** Copy-paste from the legacy local-first era; not swept during the P2-15 fix.
**Severity:** P2 — `convertMealLogToMeal` appears unused in the active UI path (the `getUserMeals` path builds Meals inline at line 250-268 without this helper), so impact is latent. But it is exported on the singleton and any future caller inherits the bug.
**Recommended fix:** Replace `"local-user"` with `null` + a `console.warn` when `mealLog.userId` is missing. Mirror the P2-15 fix.

### P2-9 — `deleteMealLog` is a soft-delete that appends `"[DELETED]"` to notes (P2-11 pattern regression)
**File:** `src/services/crudOperations.ts:375-384`
**What's wrong:** `deleteMealLog` does NOT delete — it calls `updateMealLog(logId, { notes: existing.notes + " [DELETED]" || "[DELETED]" })`. This is the SAME spoofable string-append pattern that P2-11 (architecture doc) explicitly replaced with the `is_completed` boolean for completion. The delete marker relies on a notes string that users can type themselves.
**Root cause:** `deleteMealLog` was not swept when P2-11 added the explicit-boolean pattern. There is no `is_deleted` column.
**Severity:** P2 — "deleted" meals remain in `meal_logs` and continue to be summed by `getTodaysConsumedNutrition` (which does not filter on a delete marker). The realtime handler's DELETE branch (`nutritionStore.ts:1231-1253`) only fires on an actual SQL DELETE, which never happens here. Net: soft-deleted meals STILL COUNT toward daily totals.
**Recommended fix:** Either (a) make `deleteMealLog` issue a real `supabase.from("meal_logs").delete().eq("id", logId)` (matches the realtime DELETE handler expectation), or (b) add an `is_deleted BOOLEAN` column + filter it in `MEAL_LOG_SELECT`/`loadData`/`sumMealNutrition` (mirrors the P2-11 `is_completed` fix). Prefer (a) — simpler, matches the realtime contract.

### P2-10 — Dead `get_daily_nutrition_totals` SQL function references non-existent columns
**File:** `supabase/migrations/20250129000002_add_session_log_tables.sql:189-214`
**What's wrong:** The function `get_daily_nutrition_totals(p_user_id, p_date)` does `SUM(calories), SUM(protein_g), SUM(carbs_g), SUM(fat_g), SUM(fiber_g)` — but the live `meal_logs` schema (`supabase-types.generated.ts:1777-1801`) has columns `total_calories, total_protein, total_carbohydrates, total_fat` (NO `calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`). The table was migrated to new column names but this function was never updated.
**Root cause:** Schema migration renamed columns; the helper function was missed. Grep confirms it is NEVER called from TS/TSX code (only its own definition matches) — so it is dead code today.
**Severity:** P2 — currently inert (no callers), but a landmine: any future developer or DB tool that calls it gets a column-does-not-exist error, and its presence implies a server-side totals path that does not exist.
**Recommended fix:** Drop the function (`DROP FUNCTION IF EXISTS get_daily_nutrition_totals(UUID, DATE);`) in a new append-only migration. Do NOT update it — the SSOT for totals is `nutritionStore.getTodaysConsumedNutrition()` (client-side), and a server-side aggregate should be a new RPC if ever needed, not this stale skeleton.

### P2-11 — `nutritionRefreshService.getCurrentDailyNutrition` is a parallel totals computation (dormant SSOT split)
**File:** `src/services/nutritionRefreshService.ts:119-188`
**What's wrong:** `getCurrentDailyNutrition` independently queries `getUserMeals` (Supabase `meal_logs`) and reduces `total_calories`/`total_protein`/`total_carbs`/`total_fat`/`total_fiber` into a totals object — a SECOND computation of the same thing `nutritionStore.getTodaysConsumedNutrition()` computes. This is the exact pattern P0-2 deleted (`nutrition/selectors.ts`). Grep confirms it is only called from `src/utils/testFoodRecognitionE2E.ts` (test utilities), NOT from UI.
**Root cause:** Vestigial diagnostic helper from before the store-SSOT consolidation.
**Severity:** P2 — no UI impact today (test-only callers), but a maintenance trap: any future caller gets a divergent total (this path omits sugar/sodium entirely, derives fiber from `meal.total_fiber` which is itself derived from `food_items` — a derivation-of-a-derivation).
**Recommended fix:** Delete `getCurrentDailyNutrition` and `validateNutritionConsistency` (also a parallel fetch). If diagnostics are needed, read from `nutritionStore.getTodaysConsumedNutrition()` directly. Update `testFoodRecognitionE2E.ts` accordingly.

### P2-12 — `useEffect` in `useMealPlanning` over-broad deps risk re-fetch loops
**File:** `src/hooks/useMealPlanning.ts:108-162`
**What's wrong:** The hydration `useEffect` lists deps `[dailyMeals.length, loadNutritionStoreData, Object.keys(mealProgress).length, user?.id, weeklyMealPlan?.id]`. `Object.keys(mealProgress).length` as a dep is fragile: it changes whenever ANY meal progress entry is added/removed, which happens on every `updateMealProgress` call (ingredient tick during a cooking session). The guard `lastRemoteHydratedUserIdRef` prevents re-fetch for the same user, but for a GUEST (no `authenticatedUserId`), the branch at line 144-153 checks `hasHydratedDietData` and may call `loadNutritionStoreData()` repeatedly as `mealProgress` keys grow during a session.
**Root cause:** Dep array uses a derived length instead of a stable reference; no `useRef` guard on the guest branch (only the authed branch is guarded).
**Severity:** P2 — potential extra Supabase calls during active cooking sessions for guest users; not an infinite loop (the `hasHydratedDietData` becomes true after first fetch) but wasteful and can race with in-flight progress.
**Recommended fix:** Replace `Object.keys(mealProgress).length` with a stable `useRef` flag set after first hydration (mirror the `lastRemoteHydratedUserIdRef` pattern for the guest branch). Or early-return if `lastRemoteHydratedUserIdRef.current === "guest"` after the first guest fetch.

### P3-13 — `saveWeeklyMealPlan` optimistic `set` then throw leaves store with plan but error surfaced
**File:** `src/stores/nutritionStore.ts:318-457`
**What's wrong:** On empty-plan, the function `set({ planError })` then throws (line 314-316) BEFORE the local `set({ weeklyMealPlan: plan })` at line 323 — good. But in the second try (DB save), line 408 does `set({ weeklyMealPlan: planDataWithDbId })` BEFORE `offlineService.queueAction`. If `queueAction` throws, the catch (line 439) `set({ planError })` and re-throws — but the store already has `weeklyMealPlan` set to `planDataWithDbId`. The caller (`useMealPlanning.handleMealPlanResult` line 184-201) catches and shows an error alert, but `weeklyMealPlan` in the store now holds a plan whose DB persistence FAILED (queued for retry, but if the queue itself is corrupt the plan is local-only).
**Root cause:** Optimistic store write before queue confirmation; no rollback on queue failure.
**Severity:** P3 — the offline queue normally recovers this, and the user sees an error. But if the user force-kills the app before the queue retries, the plan vanishes on next load (loadData reads from Supabase, which has no row). Self-healing on success, lossy on persistent queue failure.
**Recommended fix:** Acceptable per architecture doc (B.6: "Supabase writes are fire-and-forget with retry"). Document explicitly that `weeklyMealPlan` may be optimistic during queue retry. No code change required unless queue-failure rate is high.

## Enum-boundary audit (diet_type non-veg/balanced↔omnivore)
**Status:** CLEAN. `src/services/aiRequestTransformers.ts:108-109` maps `"non-veg"` and `"balanced"` to `null` in the `supportedRestrictions` table (correct — neither is a restriction, both are base diets). Line 264 sends the raw `diet_type` to the worker; the worker (per architecture doc §F.1.2) routes `non-veg`→`nonVeg.ts` template and treats `balanced` as the omnivore label. `mapDietTypeForHealthCalc`/`mapDietTypeForOnboarding` (P0-3) exist and are used by `resolveDietType` with the safety guard. No boundary errors found in the diet path.

## Macro total correctness audit
**Status:** MOSTLY CORRECT with the P1-4 exception. `sumMealNutrition` (`nutritionStore.ts:174-187`) rolls up from `getConsumedMealsFromState` (logged meals only) — single source. `useNutritionData.ts:114-140` correctly derives `dailyNutrition` from `getTodaysConsumedNutrition()` (store SSOT), NOT a parallel fetch. The only parallel computation is the dormant `nutritionRefreshService.getCurrentDailyNutrition` (P2-11, test-only). Calories/protein/carbs/fat roll up correctly. Fiber rolls up correctly (derived from `food_items`). Sugar/sodium are broken per P1-4.

## Wave mapping
Diet/meal-plan fixes are scoped to **Wave C** of the dispatch plan (`src/docs/UIUX-DATA-INTEGRITY-GOAL.md:80`):
> Wave C — device: diet flow (all modals). code: diet-save integrity, water-log offline, meal/macro compliance.

- **P0-1, P0-2, P0-3** (LogMealModal corruption, missing loggedAt, partial revert) → Wave C "diet-save integrity" code agent.
- **P1-4** (sugar/sodium always 0) → Wave C "meal/macro compliance" code agent.
- **P1-5** (triple-source diet prefs) → Wave C "diet-save integrity" (touches `useMealPlanning` + `useNutritionData`).
- **P1-6, P1-7** (`logMeal` store bypass + AsyncStorage/Supabase divergence) → Wave C "diet-save integrity".
- **P2-8, P2-9, P2-10, P2-11** (hardcoded user, soft-delete, dead SQL fn, dormant parallel totals) → Wave C cleanup batch.
- **P2-12** (useEffect deps) → Wave C "diet-save integrity".
- **P3-13** (optimistic plan write) → Wave C documentation only.

Wave C's device agent should verify (a) a logged meal appears in the calorie ring within ~2s, (b) sugar/sodium rings show non-zero after logging a meal with sugar/sodium ingredients, (c) deleting a meal removes it from totals, (d) editing diet prefs (allergy) then generating a plan excludes the allergen.
