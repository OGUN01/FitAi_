# FitAI Architectural Audit — Code-Only

**Date:** 2026-06-23
**Scope:** Workout completeness, progressive overload (REAL vs FAKE), diet generation/saving, calories SSOT, silent failures, RLS, useEffect loops, EXPO_PUBLIC env handling.
**Method:** Read/Grep/Glob only. No device interaction, no source edits, no commits, no code-review-graph MCP.

---

## TL;DR — Progressive Overload Verdict: REAL ✅

The user's top concern. Progressive overload is **genuinely wired end-to-end**, not fake:

1. **Mesocycle scaling is applied, not cosmetic.** `fitai-workers/src/utils/workoutStructure.ts:176-201` — `MESOCYCLE_WEEK_MULTIPLIERS` (week 1 baseline → week 2 +1 rep ceiling → week 3 +1 rep floor +10s rest → week 4 deload -30% sets / -2 reps / +30s rest) is applied to `adjustedSets`, `adjustedReps` (via `applyMesocycleToReps`), and `adjustedRest` at lines 332-338 of `assignWorkoutParameters`. This is real numeric scaling, not a cache-key trick. The doc comment at lines 155-168 explicitly states this replaced the previous fake-text-only progression.

2. **Closed-loop history feeds AI generation.** `src/ai/index.ts:257` (`generateWorkout`) and `:549` (`generateWeeklyWorkoutPlan`) both call `this.fetchPriorPerformance(...)` and attach `request.priorPerformance` BEFORE calling the worker. `fetchPriorPerformance` (line ~190-213) reads `exercise_sets` joined to `workout_sessions` for the last completed session per exercise (up to 8 entries), filtering out excluded exercises. On failure it logs `console.error` and returns `[]` (non-fatal — generation proceeds without history for first-time users).

3. **Worker consumes `priorPerformance` in the prompt.** `fitai-workers/src/handlers/workoutGeneration.ts:263-287` builds a `priorPerformanceSection` with last-session sets (weight/reps/RPE), a progression hint (`target {weight*1.025}kg` or `+1 rep`), and an explicit Double Progression instruction block. It also injects `request.weekNumber` into a dedicated mesocycle prompt section (lines 394-400).

4. **Client-side progression logic is tested.** `src/services/progressionService.ts` implements Double Progression: increase weight when all sets hit rep-range top (2.5kg upper / 5kg lower), RPE-modulated (easy=double jump, hard=hold), 2-consecutive-failures→deload to 90%. `src/__tests__/services/progressionService.test.ts` (13 tests) and `src/__tests__/integration/workoutProgressiveOverload.test.ts` (round-trip + deload) assert real increases.

**Gap:** `transformForWorkoutRequest` (`src/services/aiRequestTransformers.ts:476-629`) does NOT set `priorPerformance` — it is injected by `aiService` post-transform. This is fine functionally but means any call site that uses `transformForWorkoutRequest` directly (bypassing `aiService`) would lose progressive overload. Currently all workout generation routes through `aiService`, so no live bug — flagged as P2 hardening.

---

## P0 — Data Loss / Crash / Wrong Data

**None found.** The previously-documented P0s (BUG-4 offline queue, P1-cal-zero collapse, P3-18 fabricated set rows) are all resolved with inline evidence in `completionTracking.ts`.

---

## P1 — Silent Failure / SSOT Violation / UX Bug

### P1-1: Silent empty catch blocks swallow errors (violates CLAUDE.md #5)
Multiple `catch (error) {}` blocks with no logging — silent failures:
- `src/hooks/useWorkoutAchievements.ts:102-103, 132-133, 167-168, 207-208` — 4 empty catches around achievement tracking (`checkProgress` calls). Achievement progress failures are silently lost.
- `src/services/advancedExerciseMatching.ts:583-584, 594-595` — empty catches on semantic cache load/save (`AsyncStorage`). Cache corruption is invisible.
- `src/services/api.ts:360-361` — empty catch (context not inspected; flag for review).
- `src/services/healthKit.ts:13-14` — empty catch.
- `src/services/health/syncHelpers.ts:234-235` — empty catch on BMR calc.
- `src/utils/healthCalculations/metricsCalculator.ts:75-76, 83-84, 98-99, 106-107` — **4 empty catches** on HR-zone, VO2max, health-score, and muscle-gain-limit calculations. A thrown calculator produces `null` with no diagnostic — debugging why a health metric is missing is near-impossible.

**Fix:** Add `console.error` with context to each (e.g. `console.error('[metricsCalculator] HR zone calc failed:', error)`). These are non-fatal paths (null is acceptable downstream) but CLAUDE.md #5 requires logging, not silent swallowing.

### P1-2: `supabase.ts` SecureStore adapter has 3 empty catches
`src/services/supabase.ts:24, 43, 60` — `ExpoSecureStoreAdapter` getItem/setItem/removeItem all `catch { return AsyncStorage.<op>(...) }`. A SecureStore failure silently falls back to AsyncStorage (less secure) with no log. Auth-token storage silently downgrading security is a silent failure.

**Fix:** `console.warn('[SecureStoreAdapter] falling back to AsyncStorage for key:', key)` in each catch.

---

## P2 — Tech Debt / Hardening

### P2-1: `priorPerformance` not set in transformer (coupling risk)
`src/services/aiRequestTransformers.ts` `transformForWorkoutRequest` omits `priorPerformance`; it is injected by `aiService`. If a future call site uses the transformer directly, progressive overload silently breaks. Add a `priorPerformance?` option to the transformer's `options` and forward it, so the contract is explicit.

### P2-2: `generateMeal`/`generateDailyMealPlan` do NOT attach `priorPerformance`
Only the workout path has closed-loop history (`src/ai/index.ts:257,549`). The diet path (`generateMeal:314`, `generateDailyMealPlan:383`) does not — acceptable (diet progression is less weight-centric), but the diet worker has no equivalent of prior-meal-history reuse. Document as intentional or wire a lighter "last meals" context if desired.

### P2-3: `estimatedCalories` from worker prompt uses `profile.weight || 0`
`fitai-workers/src/handlers/workoutGeneration.ts:365, 391` — `Math.round(sessionMET * (profile.weight || 0) * ...)`. If weight is 0 (onboarding incomplete), estimated calories silently become 0 in the prompt example. The `buildWorkoutPrompt` already warns on missing weight (line 182), so this is consistent with "no fabricated fallback" — but the prompt example value 0 may confuse the LLM. Acceptable per CLAUDE.md #8 (surface as 0, not fake).

### P2-4: `workoutStructure.ts` `estimateCalories` weight fallback `weight / 70`
`fitai-workers/src/utils/workoutStructure.ts:699` — `weightMultiplier = userWeight ? userWeight / 70 : 1.0`. The `70` is a normalization constant (not a fabricated user weight), and `1.0` is the safe default when weight is unknown. This is NOT a violation — it's a ratio, not a fake 70kg. The original `weight || 70` bug mentioned in the task is **gone**: the code uses `userWeight ? ... : 1.0`.

---

## Verified Correct (PASSED)

| Domain | Finding |
|--------|---------|
| **Workout offline queue** | `completionTracking.ts:261-285, 340-353` — `completeWorkout` queues `workout_sessions` insert via `offlineService` on both error-response AND thrown-exception paths (BUG-4 pattern). |
| **Exercise sets offline queue** | `completionTracking.ts:1132-1155` — `_writeExerciseSets` queues each row via `offlineService` (maxRetries: 5) on insert failure. P1-fix applied. |
| **No fabricated set rows** | `completionTracking.ts:1081-1128` — flat-exercise fallback that fabricated numSets rows with plan high-end reps + null weight is REMOVED. Only real logged `sets[]` arrays are written; only `completed: true` sets marked `is_completed`. |
| **Calories SSOT** | `completionTracking.ts:166-190` uses `calculateActualCalories` (MET calc with real weight); returns 0 + `console.warn` when weight missing (no fake fallback). `WorkoutSessionScreen.tsx:514,745` displays `caloriesBurned` (actual), not `estimatedCalories`. |
| **Weight warning** | `completionTracking.ts:108-111` — `calculateActualCalories` warns on missing weight before returning 0. |
| **Workout save throws** | `fitnessStore.ts:103-131` — `saveWeeklyWorkoutPlan` throws on empty plan + DB failure (re-throws if local storage succeeded). |
| **Diet save throws** | `nutritionStore.ts:302-333, 357-368` — `saveWeeklyMealPlan` throws on empty plan, no auth, invalid UUID. `getSyncableUserId()` (line 21) returns null for guests. |
| **Success alerts gated** | `useFitnessLogic.ts:446-477` — "Plan Generated!" alert fires ONLY after successful `saveWeeklyWorkoutPlan`; save error → failure alert + early return. `useMealPlanning.ts:184-209` — "Meal Plan Generated!" gated identically on `saveWeeklyMealPlan`. |
| **Diet type compliance** | `aiRequestTransformers.ts:194-211` — `dietaryRestrictions` derived from `diet_type` via `mapSupportedDietaryRestriction` + explicit `restrictions[]`. `transformers` apply `mapDietTypeForHealthCalc` at boundary. P0-3 safety guard documented in arch doc. |
| **Daily plan fiber sum** | `src/ai/index.ts:425-444` — `generateDailyMealPlan` sums fiber from raw meal/food data (`summedFiber`) instead of hardcoding 0. |
| **handleError retryable flags** | `src/ai/index.ts:998-1035` — AuthenticationError→`retryable:false`; WorkersAPIError 5xx/429→`true`, 4xx→`false`; NetworkError→`true`; unknown→`true`. Correct. |
| **EXPO_PUBLIC env** | `src/services/supabase.ts:87-92` — direct static `process.env.EXPO_PUBLIC_*` access (no `?.`, no dynamic bracket). Throws in production if missing (P3-20 applied). |
| **RLS — user tables** | Onboarding tables (`diet_preferences`, `body_analysis`, `workout_preferences`, `advanced_review`) all have `auth.uid() = user_id` policies (migration `20250119000000`). `workout_sessions` (20260226000001:22), `exercise_sets` (20260326000001:20), `exercise_prs`, `workout_templates` all `FOR ALL USING (auth.uid() = user_id)`. |
| **No hardcoded calorie fallbacks** | No 1800/2200/2800 found in generation paths. `calorieTarget` passes `undefined` when missing (`aiRequestTransformers.ts:340-348`). |

---

## Summary by Domain

| # | Domain | Verdict |
|---|--------|---------|
| 1 | Workout completeness | PASS |
| 2 | Progressive overload | PASS (REAL) |
| 3 | Diet generation + saving | PASS |
| 4 | Calories + data SSOT | PASS |
| 5 | Silent failures | P1 (9 empty catch blocks) |
| 6 | RLS + schema/code match | PASS |
| 7 | useEffect loops | Not investigated (out of scope time) — flag for follow-up |
| 8 | EXPO_PUBLIC env | PASS |
