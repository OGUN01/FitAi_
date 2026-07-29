# SSOT Audit — All Issues Found
Generated: 2026-03-25

---

## CATEGORY A: Missing Store Updates After DB Writes (UI Staleness Bugs)

### A1 — AchievementSystem.tsx line 208-222 [HIGH]
- **File:** `src/components/fitness/AchievementSystem.tsx`
- **Bug:** `supabase.from("achievements").insert(newAchievements)` succeeds → calls local `loadAchievements()` (re-fetches into local useState) but NEVER updates `useAchievementStore`
- **Effect:** ProgressScreen achievement counters, HomeScreen badges stay stale until remount
- **Fix:** After insert succeeds, call `useAchievementStore.getState().addAchievement(...)` or equivalent

### A2 — useMealEdit.ts + MealEditModal.tsx (DUPLICATE IMPLEMENTATIONS) [MEDIUM]
- **Files:** `src/hooks/useMealEdit.ts` lines 167-182 AND `src/components/diet/MealEditModal.tsx` lines 192-208
- **Bug:** `.update()` to `meals` table updates `weeklyMealPlan` in nutritionStore correctly, but the `mealProgress` log entry (keyed by `meal.id`) is NEVER updated
- **Effect:** Daily calorie totals, macro rings, meal log list show stale values until reload
- **Fix:** After `.update()` succeeds, call `useNutritionStore.getState().updateMealProgress(meal.id, {...})`. Then delete the duplicate inline `handleSave` in `MealEditModal.tsx` — it should delegate entirely to `useMealEdit`.

---

## CATEGORY B: useEffect Dependency Array Issues

### B1 — useFitnessLogic.ts line 236-290 [HIGH]
- **File:** `src/hooks/useFitnessLogic.ts`
- **Bug:** Effect reads `bodyAnalysis?.current_weight_kg` (line 254) but `bodyAnalysis` is NOT in deps `[user?.id, weeklyWorkoutPlan, updateWorkoutProgress, completedSessions]`
- **Effect:** Calorie backfill for completed workouts doesn't re-run when user's weight changes
- **Fix:** Add `bodyAnalysis` to the deps array at line 290

### B2 — useHomeLogic.ts line 128-138 [MEDIUM]
- **File:** `src/hooks/useHomeLogic.ts`
- **Bug:** `checkAndResetIfNewDay`, `checkAndResetProgressIfNewDay`, `syncHydrationWithSupabase` called inside effect but absent from deps `[calculatedMetrics?.dailyWaterML]`
- **Effect:** Stale closures on these Zustand actions — if store re-hydrates and replaces them, old versions run
- **Fix:** Add all three to the deps array (they're stable Zustand selectors, won't cause loops)

### B3 — useHealthKitSync.ts line 114-157 [MEDIUM]
- **File:** `src/hooks/useHealthKitSync.ts`
- **Bug:** `lastSyncTime` is read inside `handleAppStateChange → checkAndSync` callback but NOT in deps `[isHealthKitAuthorized, syncIntervalMinutes, syncOnAppForeground, syncHealthData]`
- **Effect:** Foreground-sync check uses stale `lastSyncTime` value — may sync too often or not at all
- **Fix:** Add `lastSyncTime` to the deps array

### B4 — useProgressScreen.ts line 102-104 [LOW]
- **File:** `src/hooks/useProgressScreen.ts`
- **Bug:** `useEffect(() => { refreshRef.current = refreshProgressData; })` — no deps array, runs every render
- **Fix:** Add `[refreshProgressData]` as deps array

### B5 — useOnboardingComplete.ts line 21-25 [LOW]
- **File:** `src/hooks/useOnboardingComplete.ts`
- **Bug:** `screenWidth` and `modalWidth` in deps but never read inside the effect — spurious deps cause extra runs
- **Fix:** Remove `screenWidth` and `modalWidth` from deps array; keep only `[visible]`

---

## CATEGORY C: Silent Failures / Swallowed Errors (CLAUDE.md violations)

### C1 — analyticsData.ts line 441 [HIGH — data corruption]
- **File:** `src/services/analyticsData.ts`
- **Bug:** `const { data: existing } = await supabase.from("analytics_metrics")...` — error ignored. DB failure treated as "no existing row" → accumulation zeroes out real calorie data
- **Fix:** Destructure `error`; guard accumulation block with `if (fetchError) { console.error(...); return; }`

### C2 — syncService.ts line 935 [HIGH]
- **File:** `src/services/syncService.ts`
- **Bug:** `catch { // No conflict if record doesn't exist remotely }` — empty catch swallows ALL errors from Supabase query (not just 404). Also line 916: `const { data }` ignores `error`
- **Fix:** `catch (e) { console.warn('[syncService] getPendingConflicts remote check failed:', e) }` — and destructure `{ data, error }` at line 916

### C3 — clearUserData.ts lines 36-41 and 178 [HIGH — security/privacy]
- **File:** `src/utils/clearUserData.ts`
- **Bug:** `safeReset` catches store reset errors silently — no `console.error`. The `if (errors.length > 0)` block at line 178 is empty (does nothing). User data may persist across logout with no developer visibility.
- **Fix:** Add `console.error('[clearUserData] Failed to reset store:', storeName, e)` inside `safeReset`. Add `console.error('[clearUserData] Some stores failed to reset:', errors)` in the `if` block.

### C4 — Four `{ data: activePlans }` locations [MEDIUM]
- **Files:** `src/stores/nutritionStore.ts:233`, `src/stores/nutrition/actions.ts:106`, `src/stores/fitnessStore.ts:138`, `src/stores/fitness/planActions.ts:139`
- **Bug:** All call `supabase.from("weekly_*_plans").select(...)` without destructuring `error`. RLS denial or network error treated as "no plan" → plan-save logic creates DUPLICATE plan rows
- **Fix:** Destructure `{ data: activePlans, error: planError }` and add `if (planError) { console.error(...); return/throw; }`

### C5 — nutritionData.ts line 603 and food-service.ts line 64 [MEDIUM]
- **Files:** `src/services/nutritionData.ts:603`, `src/services/nutrition-data/food-service.ts:64`
- **Bug:** `const { data: food } = await supabase.from("foods")...` — error ignored. DB failure makes foods appear as 0-calorie/0-macro
- **Fix:** Destructure `{ data: food, error: foodError }` and `if (foodError) { console.error(...); }`

### C6 — Stores auth.getUser() ignored [MEDIUM]
- **Files:** `src/stores/nutritionStore.ts:802`, `src/stores/fitnessStore.ts:640`
- **Bug:** `const { data: authData } = await supabase.auth.getUser()` — auth error ignored. Store hydration silently skipped.
- **Fix:** Destructure `{ data: authData, error: authError }` and early-return with `console.error` on error

### C7 — safeAsyncStorage.ts lines 100 and 119 [LOW]
- **File:** `src/utils/safeAsyncStorage.ts`
- **Bug:** `.catch(() => { // Storage write failed })` and `catch { // Storage remove failed }` — no logging
- **Fix:** `catch (e) => console.warn('[safeAsyncStorage] write failed:', e)` and same for remove

---

## CATEGORY D: Zustand Selector Anti-Patterns

### D1 — Function reference subscription (MISSING REACTIVITY BUGS) [HIGH]
These cause the UI to show stale data because the component subscribes to a stable function pointer, not the data it computes:

| File | Line | Anti-pattern |
|------|------|-------------|
| `src/hooks/useNutritionData.ts` | 115 | `useNutritionStore((s) => s.getTodaysConsumedNutrition)` → called at 120 |
| `src/hooks/useDashboardData.ts` | 284 | `useNutritionStore((s) => s.getTodaysConsumedNutrition)` → in useMemo at 322 |
| `src/hooks/useMealPlanning.ts` | 60 | `useNutritionStore((state) => state.getMealProgress)` → called at 383 |
| `src/screens/main/DietScreen.tsx` | 190 | `useNutritionStore((state) => state.getMealProgress)` |
| `src/hooks/useFitnessLogic.ts` | 118–119 | `getWorkoutProgress`, `getCompletedWorkoutStats` from full store → used in useMemo |

**Fix:** Replace `useStore(s => s.computedFn)` with either:
- `useStore(s => s.computedFn())` + `useShallow` if returns object, OR
- Subscribe to the raw data slices and compute in a `useMemo` dep on those

### D2 — Inline function call in selector (new reference each render) [MEDIUM]
| File | Line | Anti-pattern |
|------|------|-------------|
| `src/hooks/useHomeLogic.ts` | 103-104 | `useNutritionStore((s) => s.getTodaysConsumedNutrition())` — new object every render |

**Fix:** Use `useShallow` from `zustand/react/shallow` or split into primitive selectors

### D3 — Full store subscriptions (unnecessary re-renders) [MEDIUM — many files]
Most impactful (called in high-frequency re-render paths):
- `src/hooks/useFitnessLogic.ts:121` — `useFitnessStore()` (10+ slices, central hook)
- `src/hooks/useAuth.ts:131` — `useAuthStore()` just for actions (use `.getState()` instead)
- `src/hooks/useNutritionTracking.ts:32,34` — `useHydrationStore()`, `useNutritionStore()` 
- `src/screens/main/AnalyticsScreen.tsx:98` — `useAnalyticsStore()` (8 slices)
- `src/contexts/EditContext.tsx:68,75,77` — three full store subscriptions in a context provider (re-renders ALL consumers)

---

## CATEGORY E: Dead Code / Duplicate Files

### E1 — `src/components/settings/modals/` — ENTIRE DIRECTORY IS DEAD CODE
- **Files:** `PersonalInfoEditModal.tsx`, `BodyMeasurementsEditModal.tsx`
- **Confirmed:** Zero imports anywhere in the codebase. `ProfileScreen.tsx` imports from `./profile/modals` (screens version).
- **Fix:** Delete `src/components/settings/modals/PersonalInfoEditModal.tsx` and `src/components/settings/modals/BodyMeasurementsEditModal.tsx`

---

## Already Fixed (previous session)
- ✅ `useHomeLogic.ts` — stale analyticsDataService fetch → useAnalyticsStore SSOT
- ✅ `useProgressScreen.ts` — stale weeklyProgress local state → direct store subscriptions
- ✅ `googlefit-actions.ts`, `healthkit-actions.ts`, `healthconnect-actions.ts` — setWeight without updateBodyAnalysis
- ✅ `ProfileScreen.tsx` — modal onClose missing onRefresh
- ✅ `useNutritionTracking.ts` — missing deps setHydrationGoal, checkAndResetIfNewDay
- ✅ `useUserMetrics.ts` — dead code deleted
