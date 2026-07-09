# Wave B-03 — Workout Completion / Calories / Progressive-Overload / Offline-Queue Audit

**Agent:** Wave B code-only agent (completion/overload/offline path). **Date:** 2026-06-24.
**Scope:** Verify the two Wave B code categories A-03 under-covered: (1) progressive-overload logic correctness, (2) offline-queue handling for workout completion. Re-verify A-03's clean claims (calories SSOT, store-after-write, useEffect loops, silent catches).
**Method:** Read/Grep/Glob only (code-review-graph MCP disabled per `UIUX-DATA-INTEGRITY-GOAL.md` line 99). FLAT agent, no sub-agents. Owned files: `src/services/completionTracking.ts`, `src/services/calorieCalculator.ts`, `src/hooks/useWorkoutAchievements.ts`, `src/services/progressionService.ts`, `src/ai/index.ts` (fetchPriorPerformance only).
**Inputs read IN FULL:** `UIUX-DATA-INTEGRITY-GOAL.md`, `wave-a-03-workout-plan-audit.md`, `FITAI_DATA_ARCHITECTURE.md` (§F.2/F.3 Progressive Overload + §G Resolved Issues).

---

## Audit Item 1 — Progressive overload logic correctness — CONFIRMED CLEAN

**Finding:** Progressive overload is genuinely wired end-to-end from a single source of truth, and the math is correct. No divergence found.

**Sources traced:**

1. **SSOT for input data = `exercise_sets` table.** `src/ai/index.ts:154-213` `fetchPriorPerformance()` queries `exercise_sets` filtered by `user_id`, `is_completed=true`, `is_calibration=false`, ordered by `completed_at desc`, limit 200, grouped by `exercise_id` (top 8 distinct). This is the SAME table `_writeExerciseSets` (completionTracking.ts:1081-1205) writes per-set weight/reps/rpe to at completion. Closed loop confirmed: completion writes → next generation reads. Calibration sets are correctly excluded at BOTH the read side (fetchPriorPerformance `.eq('is_calibration', false)`) and the write side (progressionService docstring + `is_calibration` flag persisted in exercise_sets). No stale/duplicate source.

2. **`priorPerformance` is attached to the request AFTER transform** (ai/index.ts:257, 549 — both single + weekly generation paths). The worker schema accepts it (`fitai-workers/src/utils/validation.ts` — optional `priorPerformance` array, per VERIFIED-FINDINGS P1-4). The worker prompt (`fitai-workers/src/handlers/workoutGeneration.ts`) injects a "Prior Performance" section with last-session sets + a computed progression target + Double Progression instructions tied to the mesocycle week. Non-fatal: returns `[]` for guests/first-time users (ai/index.ts:160, 176, 211).

3. **Client-side Double Progression math is correct** (`src/services/progressionService.ts`):
   - Rep range `[min, max]`. Increments: upper 2.5kg, lower 5.0kg (lines 67-68, 124).
   - Case 1: all sets at top + RPE 1 (easy) → double jump (increment × 2). Correct (line 153-159).
   - Case 2: all sets at top + RPE 2/neutral → standard increment. Correct (line 163-169).
   - Case 3: any set exceeded maxReps+1 → increment (weight was too light). Correct (line 142-148).
   - Case 7: all sets at top BUT RPE 3 (hard) → hold (consolidate before increasing). Correct (line 132-138).
   - Cases 4-6: not at top → hold. Correct (line 173-188).
   - Deload: 2 consecutive failures (>50% sets below floor) → 90% of last weight. Correct (line 195-244).
   - Bodyweight + time-based exercises correctly short-circuit (no weight increase). Correct (line 99-117).

4. **Live consumers (not dead code):** `progressionService.suggestNextWeight` is consumed by `src/features/workouts/components/ExerciseCard.tsx:162` and `src/components/workout/SetLogModal.tsx:225`. `progressionService.isBodyweightExercise` consumed by SetLogModal:178.

5. **No hardcoded progression step ignoring performance.** The only hardcoded values are the standard barbell plate increments (2.5/5.0kg), which is the correct science-based Double Progression convention.

**Note (P4, not a fix this wave):** `progressionService.evaluateFailure` has no runtime caller (only comments + the service itself). The deload-via-failures path is driven by the separate `deloadService.checkProactiveDeload` (consumed by useFitnessLogic + WorkoutSessionScreen). `evaluateFailure` is effectively dead code — flag for Wave F cleanup, not a data-integrity divergence (the worker's `priorPerformance` prompt + `suggestNextWeight` cover the live progression path).

---

## Audit Item 2 — Offline-queue for workout completion — CONFIRMED CLEAN

**Finding:** Offline-queued workout completion correctly persists calories, updates the store exactly once (no double-counting on retry), and deduplicates via the server row ID + `weekStart:planSlotKey`. No divergence found.

**Path traced (offline completion):**

1. **Queueing (completionTracking.ts:261-285, 331-353):** When the Supabase insert/update returns an error OR throws (network failure), the same `completionPayload` (snake_case, includes `calories_burned: actualCaloriesBurned`) is queued via `offlineService.queueAction({ type: "CREATE", table: "workout_sessions", data: completionPayload, userId, maxRetries: 3 })`. Both the error-response branch (line 272) and the thrown-exception branch (line 341) queue. The local `addCompletedSession` (line 364) still runs so the UI shows completion immediately. No silent loss.

2. **(a) caloriesBurned persists on retry — YES.** `offlineService.executeAction` CREATE branch (offline.ts:533-538) upserts with `onConflict: "id"`. The payload's `calories_burned` field (completionTracking.ts:225) is written to the server row on retry. Confirmed.

3. **(b) store updated exactly once on retry — YES.** The store's local session uses `supabaseSessionId || sessionData?.sessionId || generateUUID()` (completionTracking.ts:365-366). When offline, `supabaseSessionId` is null, so the store gets a client-generated UUID. On retry, the upsert inserts a NEW server row (the payload has no `id` field — server generates one). The store's `addCompletedSession` (fitnessStore.ts:567-584) is idempotent by `sessionId` — it is NOT called again on retry (retry only calls `executeAction`, not `completeWorkout`). So no double-add to the store from the retry itself.

4. **(c) idempotency/dedup via server ID — YES.** The critical dedup happens at hydration (`loadData`, fitnessStore.ts:1134-1167):
   - `hydratedById` = set of server sessionIds from the SELECT.
   - `hydratedPlannedKeys` = set of `${weekStart}:${planSlotKey}` for planned sessions.
   - `preservedLocalSessions` filters OUT any local session whose `sessionId` is in `hydratedById` OR whose `weekStart:planSlotKey` matches a hydrated planned session.
   - A retried offline row has a NEW server UUID but the SAME `weekStart` + `planSlotKey` (both derived from the workout, not the session id). So the local client-UUID session is correctly dropped in favor of the server row. **No double-count.**
   - The realtime path (fitnessStore.ts:1419-1427) also dedups by `s.sessionId === data.id` (skips if already tracked).

**Conclusion:** The offline path is sound. The only subtlety — that the retried row gets a fresh server UUID rather than reusing the client UUID — is handled by the `weekStart:planSlotKey` secondary dedup key. No fix needed.

---

## Audit Item 3 — Re-verify A-03 calories SSOT + store-after-write — CONFIRMED CLEAN

**Finding:** A-03's clean claims hold. No divergence A-03 missed.

**Spot-checks:**
- `src/stores/fitnessStore.ts:672` — `startWorkoutSession` seeds `caloriesBurned: null` with explicit P1-11 comment ("do NOT seed from estimatedCalories"). Confirmed: no estimatedCalories seeding.
- `src/stores/fitnessStore.ts:493-526` — `completeWorkout` store action does NOT write to Supabase (P0-2 fix; DB write owned by completionTracking). Confirmed.
- `src/services/completionTracking.ts:166-190` — `actualCaloriesBurned` from `calculateActualCalories` (MET × real weight) is passed directly to `fitnessStore.completeWorkout` (line 189) AND to the Supabase payload (line 225). Single value, both sinks. Confirmed.
- `src/services/completionTracking.ts:108-111` — returns `0` + `console.warn` when weight unavailable (no fake fallback). Confirmed.
- `src/services/calorieCalculator.ts:147-150, 176-184` — `calculateExerciseCalories` / `calculateWorkoutCalories` return `0` + `console.warn` when weight missing. Confirmed.
- `src/services/calorieCalculator.ts:159` — `calories = met * userWeightKg * durationHours`. Standard MET formula. Confirmed.
- Weight resolution (completionTracking.ts:91-102): `weightTrackingService.getCurrentWeight()` → `profileStore.bodyAnalysis.current_weight_kg` → `resolveCurrentWeightForUser` (manual log > body_analysis > null). Real user weight, no hardcoded value. Confirmed.
- Hydration read path (fitnessStore.ts:1382-1385): authoritative `calories_burned` from server, NO client-side re-derive (P0-6 fix). Confirmed.
- `addCompletedSession` (fitnessStore.ts:567-584) runs AFTER the DB write (completionTracking.ts:364), using `supabaseSessionId` for dedup. Store updated after write. Confirmed.

---

## Audit Item 4 — useEffect infinite-loop risks in useWorkoutAchievements — CONFIRMED CLEAN

**Finding:** A-03's analysis holds. No loop risk.

**Trace (`src/hooks/useWorkoutAchievements.ts:72-82`):**
- `useEffect` deps: `[showCelebration, celebrationAchievement, showAchievementNotification]`.
- `showAchievementNotification` is `useCallback` with dep `[achievementToastAnim]` (line 69). `achievementToastAnim` is `useState(new Animated.Value(0))` (line 19) — initialized once, stable reference across renders. So `showAchievementNotification` is stable.
- The effect writes to `recentAchievements` via `setRecentAchievements` (line 76). `setRecentAchievements` is NOT in the deps array, and the effect does not READ `recentAchievements`. No feedback loop.
- `showCelebration` / `celebrationAchievement` come from `useAchievementStore` (Zustand) — they only change when the store changes them, not as a side effect of this effect.
- No other `useEffect` in the file. `completionTracking.ts` is a class service (no React effects). `calorieCalculator.ts` and `progressionService.ts` are pure functions/classes (no effects).

**Conclusion:** Principle 10 satisfied. No fix needed.

---

## Audit Item 5 — Silent failures (Principle 5) in owned files — CONFIRMED CLEAN

**Finding:** No empty catch blocks remain in owned files.

**Grep:** `catch\s*\([^)]*\)\s*\{\s*\}` across `{completionTracking,calorieCalculator,useWorkoutAchievements,progressionService}.ts` → **no matches**.

**Catch-block inventory in completionTracking.ts (all log via `console.error`):**
- Line 280-285 (offline queue on insert error) — logs.
- Line 308-313 (analytics metrics) — logs.
- Line 324-329 (fitness refresh) — logs.
- Line 348-353 (offline queue on thrown exception) — logs.
- Line 440-447 (Health Connect write-back) — logs.
- Line 454-457 (top-level completeWorkout) — logs.
- Line 660-663 (meal log) — logs.
- Line 760-764 (updateWorkoutProgress) — logs.
- Line 1019-1021 (savePartialExit _writeExerciseSets) — logs.
- Line 1046-1051 (savePartialExit workout_sessions update) — logs.
- Line 1064-1066 (savePartialExit top-level) — logs.
- Line 1150-1152 (exercise_set queue) — logs.
- Line 1202-1204 (PR detection) — logs.

**Catch-block inventory in useWorkoutAchievements.ts (all log):**
- Line 102-104 (trackSetCompletion), 133-135 (trackExerciseCompletion), 169-171 (trackMilestone), 210-212 (trackWorkoutCompletion) — all `console.error`.

**calorieCalculator.ts / progressionService.ts:** pure functions, no try/catch needed (errors propagate to callers which log).

**Conclusion:** Principle 5 satisfied. A-03's silent-catch fixes hold; no regression.

---

## tsc gate

`npx tsc --noEmit` from `D:\FitAi\FitAI` → **EXIT 0** (no errors). No source edits were made (all audit items clean), so no type impact.

---

## Verdict

**The workout completion / calories / progressive-overload / offline-queue path is CLEAN.** No real divergences found across all 5 audit items. A-03's "compliant" verdict on calories-SSOT, store-update-after-write, MET formula, useEffect loops, and silent catches is confirmed. The two under-covered categories A-03 flagged — progressive-overload correctness and offline-queue handling — are also clean upon deep trace:

- **Progressive overload:** closed-loop (exercise_sets SSOT → fetchPriorPerformance → worker prompt), mathematically correct Double Progression (RPE-modulated, 2.5/5.0kg increments, deload at 90% after 2 failures), live consumers in ExerciseCard + SetLogModal. Only P4 note: `evaluateFailure` is dead code (deload driven by separate deloadService) — flag for Wave F, not a data-integrity bug.
- **Offline-queue:** queued completions persist `calories_burned` via upsert on retry; store gets exactly one local session (idempotent `addCompletedSession` by sessionId, not re-called on retry); hydration dedups the local client-UUID session against the retried server row via the `weekStart:planSlotKey` secondary key — no double-count.

**No fixes applied.** Path is production-sound. The prior 11 waves of fixes (H18-H24, P0-2/P0-5/P0-6/P1-7/P1-9/P1-11, BUG-4) hold.
