# Wave A — Code-Only Audit: Workout-Plan Data Integrity

**Agent:** Wave A code-only audit (workout domain). **Date:** 2026-06-24.
**Scope:** Workout-plan generation, completion, calories SSOT, schema/code match, MET formula correctness.
**Method:** Read/Grep/Glob only (code-review-graph MCP disabled per `UIUX-DATA-INTEGRITY-GOAL.md` line 99). AUDIT ONLY — no source edits this wave.
**Inputs:** Spec `UIUX-DATA-INTEGRITY-GOAL.md`, master `FITAI_DATA_ARCHITECTURE.md`, memory `uiux-data-integrity-goal.md` all read IN FULL. Device P0-1 input ("profile.weight: Too small") traced and confirmed.

---

## P0-1 (CONFIRMED — root cause traced) — Missing body weight crashes workout generation

**Symptom (device):** AI workout generation fails with raw Zod error `profile.weight: Too small`. Missing body_analysis row.

**Root cause chain (high confidence):**

1. `src/services/aiRequestTransformers.ts:577`
   ```ts
   weight: resolvedCurrentWeight.value ?? personalInfo.weight ?? 0,
   height: bodyMetrics?.height_cm ?? personalInfo.height ?? 0,
   ```
   When the user has no `body_analysis` row (fresh onboarding not yet saved to that table) AND `resolveCurrentWeightFromStores()` returns `null`, the `?? 0` fallback **fabricates `weight: 0`** instead of letting `undefined`/`null` flow through. Same for `height: 0` and `age: 0` (line 575, 578).

2. `fitai-workers/src/utils/validation.ts:143`
   ```ts
   weight: z.number().min(30).max(300).nullable().optional(),
   height: z.number().min(100).max(250).nullable().optional(),
   ```
   `0` is a defined number, so it bypasses `.nullable().optional()` and fails `.min(30)` → "Too small". The schema explicitly permits missing weight (`nullable().optional()`) — the bug is the client converting missing → `0`.

3. `supabase/migrations/20250119000000_create_onboarding_tables.sql:125`
   ```sql
   current_weight_kg DECIMAL(5,2) CHECK (current_weight_kg IS NULL OR (current_weight_kg >= 30 AND current_weight_kg <= 300)),
   ```
   Same `>= 30` floor as the worker Zod schema. Confirms the "missing body_analysis row" is the upstream cause: with no row, `resolveCurrentWeightFromStores` → `bodyAnalysisWeight: undefined` → `value: null` → `?? 0` → worker rejects.

4. The worker's rule-based path (`fitai-workers/src/handlers/workoutGeneration.ts:733-741`) is the ONLY active generation path — LLM is disabled and throws `503 AI_GENERATION_FAILED`. The rule-based engine reads `profile.weight` from the request (no Supabase fallback for weight inside the rule engine). So a bad weight value fails Zod before generation even begins.

**Graceful handling? NO.** The app surfaces the raw Zod error string to the user instead of a friendly "complete your body analysis first" message. `useFitnessLogic` → `generateWeeklyWorkoutPlan` (`src/ai/workoutGeneration.ts:125-131`) returns `response.error` verbatim; `fitnessStore.saveWeeklyWorkoutPlan` surfaces it via `planError`. No domain-specific handling for the "missing weight" case.

**Severity:** P0 (blocks primary workout-generation flow for any user who hasn't completed body_analysis).

**Recommended precise fix (Wave B):**
- In `aiRequestTransformers.ts:577-578`, change `?? 0` → `?? undefined` so missing weight/height becomes `undefined` (passes Zod `optional()`). Do the same for `age: personalInfo.age ?? 0` → `?? undefined` (line 575), since `age: z.number().int().min(13)` would reject `0` as well.
- Pre-flight guard in `useFitnessLogic` before calling generation: if `resolveCurrentWeightFromStores().value` is null, surface a friendly `crossPlatformAlert` ("Please complete your body analysis in onboarding to generate a workout") and abort — never call the worker with a fabricated `0`.
- Ensure onboarding writes the `body_analysis` row before the user can navigate to the Fitness tab (verify `useOnboardingLogic` completion flow inserts a row even when weight is the only field filled).

---

## Calories Single-Source-of-Truth (Principle 9) — COMPLIANT, no violations found

Traced the full chain. `WorkoutProgress.caloriesBurned` (set at completion via MET calc) is correctly the SSOT for actual calories; `estimatedCalories` is correctly display-only.

**Compliant sites (verified):**
- `src/services/calorieCalculator.ts:147-150, 176-184` — returns `0` + `console.warn` when weight unavailable. No fake fallback. MET × real weight × duration.
- `src/services/completionTracking.ts:78-141` (`calculateActualCalories`) — uses `resolveCurrentWeightForUser` (manual log → body_analysis → null). Returns `0` + warn if no weight. Seeds nothing from `estimatedCalories`.
- `src/stores/fitnessStore.ts:664-672` (`startWorkoutSession`) — `caloriesBurned: null` seeded; comment explicitly documents P1-11 fix (do NOT seed from `estimatedCalories`).
- `src/stores/fitnessStore.ts:1088-1099` (hydration) — P0-6 fix: does NOT re-derive calories client-side from planned reps; reads `calories_burned` from the server row as authoritative.
- `src/stores/fitnessStore.ts:1310-1336` (realtime) — P0-6 fix: targeted `refreshSingleSession` instead of full `loadData()`, avoids calorie-clobbering.
- `src/components/fitness/SuggestedWorkouts.tsx:120-128`, `src/hooks/useQuickWorkouts.ts:35-37, 157` — explicitly documented: `estimatedCalories` is pre-generation display-only; actuals (`caloriesBurned`) override when available.
- `src/screens/main/home/TodaysFocus.tsx:82-83`, `src/hooks/useWorkoutDetailLogic.ts:59` — read `estimatedCalories` only for **pre-completion preview** subtitle; compliant (no completed-workout calorie is shown from `estimatedCalories`).

**Borderline (NOT a violation, documented for transparency):**
- `src/screens/main/FitnessScreen.tsx:441-452` — workout-details preview `calories` falls back to `estimatedCalories` only when neither `workoutProgress.caloriesBurned` nor a matching `completedSession.caloriesBurned` exists (i.e. not-yet-completed workout). Compliant.
- `src/hooks/useFitnessLogic.ts:759` — `estimatedCalories: workout.caloriesBurned` maps a **completed workout's actual calories** onto the `estimatedCalories` field of a synthetic "repeat-from-history" card. The *value* is the SSOT actual; the field name is a display-shape conflation. Re-completion recalculates via MET. Acceptable (display-only), but worth renaming in Wave B for clarity.

---

## Store-not-updated-after-DB-write (Principle 6) — COMPLIANT

`src/services/completionTracking.ts:358-391` — `addCompletedSession` runs AFTER the Supabase insert (uses `supabaseSessionId` for dedup). `fitnessStore.completeWorkout` (line 186) updates `workoutProgress[id]` to 100 + `caloriesBurned` BEFORE the DB call (optimistic for the progress badge, then the actual-calorie value is carried through). No stale-UI gap found.

**Note (intentional, documented):** `completeWorkout` store action (`fitnessStore.ts:493-526`) does NOT write to Supabase (P0-2 fix — DB write owned by `completionTrackingService`). This is correct: avoids non-atomic double-write.

---

## Silent failures (Principle 5) — no remaining violations in workout path

Grep for `catch (\w*) { }` across `src/services,hooks,stores/*orkout*itness*ompletion*alorie*` → no matches. The uncommitted git diffs in this session added `console.error` to:
- `useWorkoutAchievements.ts` (4 catch blocks — lines ~100, 131, 168, 209)
- `advancedExerciseMatching.ts` (2 catch blocks — ~581, 594)
- `metricsCalculator.ts` (4 catch blocks — ~76, 85, 101, 110)

All workout-domain catch blocks now log. No regression found in `completionTracking.ts` (all its catch blocks already had `console.error`).

---

## Hardcoded fallbacks for user data (Principle 8) — ONE violation (the P0-1 above)

- `aiRequestTransformers.ts:575, 577, 578` — `?? 0` for `age`/`weight`/`height` (see P0-1). These are user-data placeholders rejected by the worker schema.
- `aiRequestTransformers.ts:946-949` (`calculateEstimatedCalories`) — correctly returns `0` + `console.warn` when `userWeightKg` unavailable. Compliant.
- `fitai-workers/src/handlers/workoutGeneration.ts:116` — `sessionMET = estimatedMET[profile.experienceLevel] ?? 6.0` — MET default for unknown experience level. This is a *prompt-generation* estimate (not a user-data fallback) and is overridden by the real MET calc at completion. Acceptable.
- `extraWorkoutService.ts:40,48,56` — hardcoded `estimatedCalories: 180/220/200` for the three "extra workout" templates. These are display-only estimates for unplanned quick workouts; actual calories are recomputed via MET at completion. Borderline — could be weight-scaled in Wave B, but not a data-integrity violation (no fake user data).

---

## useEffect infinite-loop risks (Principle 10) — NONE found in workout hooks

`src/hooks/useWorkoutAchievements.ts:72-82` — `useEffect` deps `[showCelebration, celebrationAchievement, showAchievementNotification]`. `showAchievementNotification` is `useCallback` with dep `[achievementToastAnim]` (a `useState`-initialized `Animated.Value`, stable). The effect writes to `recentAchievements` (local state it doesn't read in deps) and calls `showAchievementNotification`. No loop risk — `setRecentAchievements` is not in deps, and the animated value is stable.

No `useEffect` in `completionTracking.ts` (it's a class service). `fitnessStore` uses Zustand `set` (no React effects). `ExerciseSessionModal.tsx` (per git diff) adds `containerStyle` + `flexShrink: 0` — no new effects introduced.

---

## Schema/code match (Principle 7) — COMPLIANT

| Code write | Migration column | Match |
|---|---|---|
| `completionTracking.ts:225` `calories_burned` | `20260226000001` `calories_burned INTEGER DEFAULT 0` (nullable per `20260327000001`) | ✅ |
| `completionTracking.ts:224` `total_duration_minutes` | `20260316000001` `total_duration_minutes INTEGER` | ✅ |
| `completionTracking.ts:226` `exercises_completed` | `20260316000001` `exercises_completed JSONB` | ✅ |
| `completionTracking.ts:210-213` `planned_day_key`/`plan_slot_key` | `20260319000002` both `TEXT` | ✅ |
| `completionTracking.ts:217` `is_extra` | `20260316000002` `is_extra` | ✅ |
| `completionTracking.ts:230` `rating` | `20260226000001` `rating INTEGER CHECK 0-5` | ✅ |
| `_writeExerciseSets` (1112-1120) `weight_kg`/`reps`/`duration_seconds`/`set_type`/`is_completed`/`rpe`/`is_calibration` | `20260326000001` + `20260329000001` (rpe/calibration) + `20260329000003` (exercise_name) | ✅ |
| `loadData` select (993-1001) reads `exercises` legacy col | `20260226000001` `exercises JSONB` | ✅ (fallback only, documented P1-9) |

**RLS:** All workout tables (`workout_sessions`, `exercise_sets`, `exercise_prs`, `weekly_workout_plans`, `workout_templates`) have `auth.uid() = user_id` policies. ✅

**Note (cosmetic, not a bug):** `workout_sessions.duration` is documented as "seconds" in the original migration but the code stopped writing it (P0-5) and now writes `total_duration_minutes`. Read path prefers `total_duration_minutes`, falls back to `duration` for old rows only. No units mix-up in current code; the stale comment in the migration is historical.

---

## MET/calorie formula correctness — COMPLIANT

- `calorieCalculator.ts:159` — `calories = met * userWeightKg * durationHours`. Standard MET formula.
- Weight source: `completionTracking.ts:91-102` — `weightTrackingService.getCurrentWeight()` → `profileStore.bodyAnalysis.current_weight_kg` → `resolveCurrentWeightForUser` (manual log > body_analysis > null). Real user weight, no hardcoded value.
- `calorieCalculator.ts:88-131` (`estimateExerciseDuration`) — per-category seconds-per-rep (BUG-67 fix): cardio 1.5s, lower/upper-body compounds 4s, default 3s. Sound.
- `completionTracking.ts:729-748` (partial calories) — P1-8 fix: uses the SAME `calculateWorkoutCalories` prorated by progress, so the partial ramps smoothly to the final MET-based number at 100%. No discontinuity.
- Completion flow persists `caloriesBurned` correctly: `completeWorkout` store action (line 518) writes `caloriesBurned` into `workoutProgress[id]`; `completionTracking` writes `calories_burned` to `workout_sessions` (line 225) and `analytics_metrics` (line 306). SSOT preserved across store + DB + analytics.

---

## Summary table

| ID | Severity | Issue | File:line | Wave |
|---|---|---|---|---|
| P0-1 | P0 | Missing body weight → fabricated `0` → Zod "Too small" → workout gen fails; raw error surfaced | `aiRequestTransformers.ts:575,577,578` + `validation.ts:143` | B |
| (none other) | — | Calories SSOT, store-update, silent-catch, schema, MET all compliant | — | — |

---

## Wave mapping

- **Wave B** covers the workout fixes: the spec's Wave B = "device: workout session (all nested modals) + code: progressive-overload deep audit, **calories SSOT deep audit**, offline-queue audit, schema/RLS audit." P0-1 (the only finding) is a generation-path bug, so it slots into Wave B's code work (calories SSOT deep audit / generation path). The device work in Wave B (workout session modals) is the natural place to verify the fix end-to-end with the hot-reload loop after onboarding creates the `body_analysis` row.
- No workout-domain findings belong to Waves C–F. The workout data path is otherwise clean — the prior 11 waves of fixes (H18–H24, P0-2/P0-5/P0-6/P1-7/P1-9/P1-11) hold.
