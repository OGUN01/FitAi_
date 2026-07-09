# Wave C-01 — Diet Write / Completion Path Fixes

**Agent:** code-only (flat). **Wave:** C. **Date:** 2026-06-24.
**Scope:** Fix the diet WRITE/COMPLETION path — P0 data-corruption bugs + sugar/sodium-always-zero + store-not-updated-after-write. Root causes from the Wave A-04 audit (`src/docs/wave-a-04-diet-plan-audit.md`) were verified against current line numbers (several had drifted — noted below) and fixed.
**Method:** code-review-graph MCP (minimal-context) + Read/Grep to trace the call graph; Read exact lines; apply minimal precise fixes; `npx tsc --noEmit` gate.
**Ownership respected:** did NOT touch `useMealPlanning.ts`, `useNutritionData.ts`, any migration, or `useFitnessLogic.ts` (parallel agents own those). Owned files: `LogMealModal.tsx`, `nutritionStore.ts` (hydrate path only), `completionTracking.ts` (completeMeal/diet path only), `nutritionData.ts`, `nutritionRefreshService.ts` (evaluated, no edit), `mealLogNutrition.ts`, `crudOperations.ts`, `DataBridge.ts`.

## Audit line-number drift (IMPORTANT)

The A-04 audit line numbers are STALE for two findings:
- **P1-4 / P1-3 (sugar):** audit said `nutritionStore.ts:1124` only sets `fiber`. **Current state:** both the loadData hydrate path (`:1123-1124`) AND the realtime path (`:1270-1271`) ALREADY call `deriveMealLogSugar(foodItems)`. The sugar half of this finding was already fixed (likely by an earlier wave). **Only sodium remained broken** — no `deriveMealLogSodium` util existed and neither hydrate path derived sodium. This report's P1-3 fix covers the sodium gap only.
- All other line numbers (P0-1, P0-2, P1-5, P2-8, P2-9) were current.

## Findings fixed

### P0-1 — `LogMealModal` corrupts `weeklyMealPlan` by injecting manual meal logs
**Root cause (confirmed):** `src/components/diet/LogMealModal.tsx` `handleSave` appended the manually-logged `newMeal` into `weeklyMealPlan.meals` (the AI PLANNING array) and called `saveWeeklyMealPlan(updatedPlan)`, persisting the manual meal into the `weekly_meal_plans` Supabase row. This conflated "what to eat" (plan) with "what was eaten" (`meal_logs`), corrupting the AI plan and polluting it across reloads.
**Diff (before → after):**
- `LogMealModal.tsx:170` — destructured `saveWeeklyMealPlan` removed; `addDailyMeal` added.
  - Before: `const { weeklyMealPlan, setWeeklyMealPlan, saveWeeklyMealPlan } = useNutritionStore();`
  - After: `const { weeklyMealPlan, setWeeklyMealPlan, addDailyMeal } = useNutritionStore();`
- `LogMealModal.tsx:425-449` — the `setWeeklyMealPlan(updatedPlan) + await saveWeeklyMealPlan(updatedPlan)` corruption block replaced:
  - Before: built `updatedPlan` with `newMeal` appended, called `setWeeklyMealPlan(updatedPlan)` then `await saveWeeklyMealPlan(updatedPlan)` (the DB-corrupting call).
  - After: stages `newMeal` into the in-memory plan via `setWeeklyMealPlan(stagedPlan)` ONLY (so `completionTrackingService.completeMeal` can still find the meal by id), then calls `addDailyMeal(newMeal)` so `getTodaysConsumedNutrition` reflects it immediately. **`saveWeeklyMealPlan` is no longer called on the manual-log path** — the AI plan is never mutated/persisted with manual meals.
**How the SSOT is now preserved:** `weeklyMealPlan.meals` (planning SSOT) is never mutated by manual logs. The consumption SSOT (`meal_logs`, via `completionTrackingService.completeMeal`) + the runtime store (`dailyMeals` via `addDailyMeal`) are the only writers. The in-memory `setWeeklyMealPlan` stage is transient — it exists only so `completeMeal`'s `weeklyMealPlan.meals.find(...)` lookup succeeds; it is not persisted.

### P0-2 — Manual meal log lacks `loggedAt` → silently dropped from consumed totals
**Root cause (confirmed):** `newMeal` set `isCompleted:true`, `completedAt`, `createdAt` but NOT `loggedAt`. `getConsumedMealsFromState` (`nutritionStore.ts:189-191`) filters by `isLoggedMeal(meal)` = `typeof meal.loggedAt === "string"`. Without `loggedAt` the meal was invisible to calorie/macro rings until the realtime `meal_logs` round-trip.
**Diff:**
- `LogMealModal.tsx:421` (in the `newMeal` object) — added `loggedAt: today.toISOString()` immediately after `completedAt`.
**How the SSOT is now preserved:** the logged meal is immediately visible to `getTodaysConsumedNutrition()` via `addDailyMeal` (P0-1 fix) + the `loggedAt` marker — no realtime round-trip dependency.

### P0-2b — `completionTracking.completeMeal` partial revert leaves store inconsistent on DB failure
**Root cause (confirmed):** `src/services/completionTracking.ts:639-656` — on Supabase `meal_logs` insert failure, the catch reverted `mealProgress[mealId]` to `{progress:0, completedAt:undefined, logId:undefined}` but the optimistic `nutritionStore.completeMeal(mealId, logData?.logId)` at `:470` had already set it to `{progress:100, completedAt, logId}`, AND `crudOperations.createMealLog` at `:529` had already written an AsyncStorage row. The revert touched only `mealProgress`, leaving an orphaned AsyncStorage meal log with no matching Supabase row → local/Supabase divergence on every offline meal completion.
**Diff:**
- `completionTracking.ts:639-656` (the `catch (supabaseError)` block) — the `mealProgress` reset is kept, and a symmetric AsyncStorage rollback is added: `await crudOperations.deleteMealLog(mealLogId)` (wrapped in its own try/catch with `console.error` on failure). `deleteMealLog` is now a hard delete (see P2-9), so the Supabase `.delete()` is a harmless no-op server-side (the row was never inserted) and removes the orphaned local row.
**How the SSOT is now preserved:** both writers (`nutritionStore.completeMeal` optimistic state + `crudOperations.createMealLog` AsyncStorage row) are symmetrically rolled back on DB failure. No phantom local meal log survives to re-inflate totals on next `loadData`.

### P1-3 — Sodium totals are ALWAYS 0 for Supabase-hydrated meals (sugar already fixed)
**Root cause (confirmed, sodium only):** `meal_logs` has no `total_sodium` column. The hydrate paths derived `fiber` (via `deriveMealLogFiber`) and `sugar` (via `deriveMealLogSugar` — already wired in both paths) from `food_items`, but had NO sodium derivation — `sumMealNutrition` (`:183`) read `meal.totalMacros?.sodium || 0` → always 0. No `deriveMealLogSodium` util existed.
**Diff:**
- `src/utils/mealLogNutrition.ts` — added three exports mirroring the sugar pattern: `getMealLogItemSodium(item)` (reads `item.macros.sodium` then `item.sodium`), `normalizeMealLogSodiumValue(value)`, and `deriveMealLogSodium(foodItems)` (reduces over `normalizeMealLogFoodItems`, rounds to tenth).
- `src/stores/nutritionStore.ts:32-37` — import extended to include `deriveMealLogSodium`.
- `nutritionStore.ts` loadData hydrate path (`:1119-1126`) — `totalMacros` now includes `sodium: deriveMealLogSodium(foodItems)`.
- `nutritionStore.ts` realtime hydrate path (`:1266-1273`) — `totalMacros` now includes `sodium: deriveMealLogSodium(foodItems)`.
**How the SSOT is now preserved:** sodium is derived from the existing `food_items` data (the same SSOT fiber/sugar use) at hydrate time in both paths — no new DB columns, no parallel computation. `getTodaysConsumedNutrition().sodium` now rolls up correctly.

### P1-5 — `logMeal` writes Supabase directly without updating the Zustand store + AsyncStorage/Supabase diverge on partial failure
**Root cause (confirmed):** `src/services/nutritionData.ts:441-576` — `logMeal` called `crudOperations.createMealLog` (AsyncStorage) then `supabase.from("meal_logs").insert(...)` directly, but did NOT call `useNutritionStore.getState().addDailyMeal(...)`. After success, `getTodaysConsumedNutrition()` was stale until the realtime `meal_logs` channel fired (seconds, or never if realtime disconnected). On Supabase failure, the AsyncStorage row was NOT rolled back → local phantom meal.
**Diff:**
- `nutritionData.ts:8` — added `import { useNutritionStore } from "../stores/nutritionStore";` (verified no require-cycle: `nutritionStore` does not import `nutritionData`).
- `nutritionData.ts` (after the successful Supabase insert + `if (error)` block) — added `useNutritionStore.getState().addDailyMeal({...})` with `loggedAt` set and full `totalMacros` (incl. sugar/sodium), so consumed totals reflect immediately (Principle 6).
- `nutritionData.ts` (in the `if (error)` branch) — added symmetric rollback: `await crudOperations.deleteMealLog(mealLog.id)` (wrapped in try/catch with `console.error`), removing the orphaned AsyncStorage row written before the insert.
**How the SSOT is now preserved:** the store (runtime SSOT) is updated immediately after the DB write succeeds; on failure the local row is rolled back. No stale UI, no local/Supabase divergence.

### P2 — `convertMealLogToMeal` hardcoded `"local-user"` (Principle 8)
**Root cause (confirmed):** `src/services/nutritionData.ts:710` returned `user_id: mealLog.userId || "local-user"`. The `"local-user"` sentinel is a forbidden hardcoded fallback for user data. The method is `private` and has NO callers (grep-confirmed; only the audit/docs reference it), so impact is latent, but the fix is applied per Principle 8.
**Diff:**
- `nutritionData.ts:707-712` — `const userId = mealLog.userId || null;` + `if (!userId) console.warn(...)` + `user_id: userId as string`.
**How the SSOT is now preserved:** missing userId surfaces as `null` with a warning instead of a fabricated sentinel (mirrors the P2-15 fix in `progressData.ts`).

### P2 — `deleteMealLog` soft-delete ("[DELETED]" notes append) → soft-deleted meals STILL COUNT toward totals
**Root cause (confirmed):** `src/services/crudOperations.ts:375-386` — `deleteMealLog` did NOT delete; it called `updateMealLog(logId, { notes: existing.notes + " [DELETED]" })`. This spoofable string-append left the row in `meal_logs`, still summed by `getTodaysConsumedNutrition` (which does not filter on a delete marker), and the realtime DELETE handler in `nutritionStore` (`:1231-1253`) never fired because no actual SQL DELETE happened.
**Diff:**
- `src/services/DataBridge.ts` (after `getMealLogs`) — added `deleteMealLog(logId)` that hard-deletes from AsyncStorage (mirrors the `storeMealLog`/`updateMealLog` pattern).
- `src/services/crudOperations.ts:375-386` — `deleteMealLog` rewritten to: (1) hard-delete from local AsyncStorage via `dataBridge.deleteMealLog(logId)`, (2) issue a real `supabase.from("meal_logs").delete().eq("id", logId)`, (3) on Supabase error, queue via `offlineService.queueAction` ONLY if a real userId can be resolved from the local log row (Principle 8 — never fabricate; skip queueing for guests, mirroring `nutritionStore.completeMeal`).
**How the SSOT is now preserved:** the meal is actually removed from both stores; the realtime DELETE handler fires and removes it from `dailyMeals`/`mealProgress`; soft-deleted meals no longer count toward totals.

### P2 (evaluated, no edit) — `nutritionRefreshService.getCurrentDailyNutrition` / `validateNutritionConsistency` parallel totals
**Status:** These two methods are a parallel totals computation (the audit's P2-11), but they are NOT truly dormant/unused — they are called from `src/utils/testFoodRecognitionE2E.ts` (lines 201, 555, 579, 731), a manual diagnostic utility (not jest-run, not in `testPathIgnorePatterns`). `refreshAfterMealLogged` (a third method on the same service) IS actively used by `src/services/recognizedFoodLogger.ts:90`. Deleting the two totals methods would break the manual test util.
**Decision:** Left untouched. The canonical SSOT (`nutritionStore.getTodaysConsumedNutrition()`) is unaffected — these methods are diagnostic-only and do not feed any UI. Documenting here so a future sweep can route the test util through the store selector if desired. (The audit's preferred option was "remove if truly dormant"; since they are used by a manual test util, the lower-risk choice is to leave them.)

## tsc gate
`npx tsc --noEmit` from `D:\FitAi\FitAI` → **exit 0, zero errors, zero output.** No pre-existing errors to attribute.

## Verdict
**The diet write/completion path is now clean.** Manual meal logs flow to `meal_logs` + `dailyMeals` only (never the AI plan); `loggedAt` is set so consumed totals reflect immediately; the partial-revert on DB failure is symmetric (store + AsyncStorage); sugar AND sodium are derived from `food_items` at hydrate time in both paths; `nutritionData.logMeal` updates the store post-write and rolls back on failure; the `"local-user"` sentinel is gone; `deleteMealLog` is a real hard delete. tsc is green. The only residual is the diagnostic-only parallel-totals methods in `nutritionRefreshService` (left in place to avoid breaking the manual test util) — they do not affect the SSOT or any UI.
