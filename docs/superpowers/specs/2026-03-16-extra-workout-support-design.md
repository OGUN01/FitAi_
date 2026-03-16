# Extra Workout Support — Design Spec
**Date:** 2026-03-16
**Status:** Approved for implementation

---

## Problem

The FitAI app has no mechanism to track workouts done outside the weekly plan. When a user completes today's planned workout and then does additional work ("Quick Workouts"), that extra activity is invisible to all stats, calorie totals, and analytics. The root cause is architectural: `workoutProgress` conflates in-progress tracking with completion history, and all stat selectors hard-filter to current plan IDs only.

There is also a pre-existing bug: `fitnessStore.completeWorkout(workoutId, sessionId)` (line 288) does not persist `caloriesBurned` to `workoutProgress` — the third argument passed by `completionTracking.ts` is silently ignored because the function signature only accepts two parameters.

---

## Goals

1. Let users start extra (bonus) workouts from the Fitness screen after completing today's plan workout.
2. Track extra workouts as first-class sessions with accurate calorie accounting.
3. Show plan progress (e.g. 1/5) cleanly, separate from extra workouts.
4. Show honest total daily calories in analytics (plan + extra combined), with drill-down breakdown.
5. Establish a unified session model that scales without further architectural rework.
6. Fix the pre-existing `caloriesBurned` persistence bug as part of this work.

---

## Non-Goals

- Extra workouts from the Home screen.
- Repeating the same planned workout twice.
- Custom exercise selection UI (WorkoutEngine handles generation).
- Offline-first sync for extra workouts (Supabase insert on completion; guest mode stores locally only).

---

## Architecture: Two-Role State Split

```
workoutProgress    →  in-progress / resume ONLY
                      (exerciseIndex, partial %, partial caloriesBurned)

completedSessions  →  ALL finished workouts — plan and extra — immutable records
                      SINGLE SOURCE OF TRUTH for every stat
```

---

## Data Model

### `CompletedSession` — new type in `src/stores/fitness/types.ts`

```typescript
interface CompletedSession {
  sessionId: string;           // UUID, unique per completion
  type: 'planned' | 'extra';   // enum — extensible (e.g. 'recovery' later)
  workoutId: string;           // plan workout ID ('planned') or generated UUID ('extra')
  workoutSnapshot: {
    title: string;
    category: string;
    duration: number;          // planned/estimated minutes
    exercises: Array<{
      name: string;
      sets: number;
      reps: number;
      exerciseId?: string;     // preserved for future MET recalculation
      duration?: number;       // seconds, for time-based exercises
      restTime?: number;       // seconds between sets
    }>;
  };
  caloriesBurned: number;      // MET-calculated at completion; 0 if weight unavailable (Rule 8)
  durationMinutes: number;     // actual elapsed time
  completedAt: string;         // ISO timestamp
  weekStart: string;           // ISO date of Monday of that week (YYYY-MM-DD)
}
```

### `ExtraWorkoutTemplate` — new type in `src/stores/fitness/types.ts`

```typescript
interface ExtraWorkoutTemplate {
  id: string;
  title: string;
  category: string;            // 'hiit' | 'cardio' | 'strength' | 'flexibility'
  duration: number;            // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCalories: number;   // display-only — never used in calculations (Rule 9)
}
```

---

## Database

### `supabase/migrations/20260316000002_add_extra_workout_support.sql` — new file

```sql
-- Append-only, safe to re-run (Rule 7)
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_extra
  ON workout_sessions(user_id, completed_at DESC)
  WHERE is_extra = TRUE;
```

Column name `is_extra` matches the service insert exactly (Rule 4).

---

## Utility: `src/utils/weekUtils.ts` — new file

```typescript
/**
 * ISO date string (YYYY-MM-DD) of the Monday of the current week.
 * Monday is week-start throughout the app.
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();            // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Sunday → -6; others → distance to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * True when two ISO timestamp strings fall on the same calendar day.
 * String-prefix comparison — no external library needed.
 */
export function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.split('T')[0] === isoB.split('T')[0];
}

/**
 * Lowercase day-of-week name for today, matching DayWorkout.dayOfWeek convention.
 */
export function getCurrentDayName(): string {
  const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return names[new Date().getDay()];
}
```

All functions are pure and zero-dependency.

---

## Store: `src/stores/fitnessStore.ts`

### Pre-existing bug fix — `completeWorkout` signature

Current (broken): `completeWorkout: async (workoutId, sessionId) => { ... }`
The third argument `caloriesBurned` passed by `completionTracking.ts` line 122 is silently ignored.

Updated signature:
```typescript
completeWorkout: (workoutId: string, sessionId?: string, caloriesBurned?: number) => Promise<void>
```

The store implementation sets `workoutProgress[workoutId]` to include `caloriesBurned` when provided:
```typescript
[workoutId]: {
  workoutId,
  progress: 100,
  completedAt,
  sessionId,
  ...(caloriesBurned !== undefined && { caloriesBurned }),
}
```

This fix is required for the backfill to find real calorie values in existing `workoutProgress` entries.

### New state fields

```typescript
completedSessions: CompletedSession[];     // persisted — source of truth for all stats
completedSessionsHydrated: boolean;        // NOT persisted — resets false on cold start
_hasHydrated: boolean;                     // NOT persisted — set true by onRehydrateStorage
```

### Hydration signal — `onRehydrateStorage` (synchronous flag only)

In Zustand v5 (`^5.0.6`, the version used in this project), direct property mutation on the `state` argument in `onRehydrateStorage` does not call `set()` and therefore does not notify reactive subscribers. The flag must be set through a store action.

Define a store action:
```typescript
setHasHydrated: () => set({ _hasHydrated: true }),
```

Then in the `persist` config:
```typescript
onRehydrateStorage: () => (state) => {
  if (state) state.setHasHydrated();
},
```

This is synchronous and safe — `setHasHydrated` calls `set()` which correctly notifies all subscribers including the backfill `useEffect`.

### Updated `partialize`

```typescript
partialize: (state) => ({
  weeklyWorkoutPlan: state.weeklyWorkoutPlan,
  workoutProgress: state.workoutProgress,
  completedSessions: state.completedSessions,  // new — persisted
  // completedSessionsHydrated: intentionally excluded — resets on cold start
  // _hasHydrated: intentionally excluded — set by onRehydrateStorage
}),
```

### New store actions

```typescript
addCompletedSession(session: CompletedSession): void
  // Idempotent append: skips if a session with the same sessionId already exists.
  // Implementation: if (completedSessions.some(s => s.sessionId === session.sessionId)) return;
  // This makes the backfill safe to re-run on every cold start without duplicating records.

markCompletedSessionsHydrated(): void
  // Sets completedSessionsHydrated = true. Called once by the backfill effect.

setHasHydrated(): void
  // Called by onRehydrateStorage callback. Sets _hasHydrated = true via set().
  // Must use set() — direct state mutation in onRehydrateStorage does not notify subscribers in Zustand v5.

getPlannedSessionStats(weekStart: string): { count: number; totalCalories: number; totalDuration: number }
  // Filters: type === 'planned' && weekStart === weekStart

getExtraSessionStats(weekStart: string): { count: number; totalCalories: number; totalDuration: number }
  // Filters: type === 'extra' && weekStart === weekStart

getAllSessionCalories(dateStr: string): number
  // Sum of caloriesBurned for ALL sessions whose completedAt starts with dateStr (YYYY-MM-DD).
  // Rule 9: single aggregation point for daily calorie totals.
```

### Updated `getCompletedWorkoutStats()` selector

Reads from `completedSessions` (type='planned', current weekStart) instead of `workoutProgress`.
The "1/5 workouts" counter and progress % remain plan-only and unambiguous.

### Updated `reset()`

Clears `completedSessions: []` alongside existing fields.

---

## Backfill: one-time `useEffect` in `src/hooks/useFitnessLogic.ts`

The backfill converts existing `workoutProgress` entries (progress === 100) into `CompletedSession` records. It must NOT run until Zustand has finished rehydrating from AsyncStorage.

```typescript
// Guard: wait for store hydration AND skip if already done
useEffect(() => {
  if (!_hasHydrated || completedSessionsHydrated) return;

  const weekStart = getCurrentWeekStart();

  const sessions: CompletedSession[] = Object.values(workoutProgress)
    .filter(p => p.progress === 100)
    .map(p => {
      const w = weeklyWorkoutPlan?.workouts.find(wk => wk.id === p.workoutId);
      // completedAt: use stored value if valid ISO; warn and fall back to now
      const completedAt = (() => {
        if (p.completedAt && !isNaN(new Date(p.completedAt).getTime())) {
          return p.completedAt;
        }
        console.warn(`[backfill] workoutProgress ${p.workoutId} missing completedAt — using now`);
        return new Date().toISOString();
      })();

      return {
        sessionId: p.sessionId || generateUUID(),
        type: 'planned' as const,
        workoutId: p.workoutId,
        workoutSnapshot: {
          title: w?.title || 'Unknown Workout',
          category: w?.category || 'general',
          duration: w?.duration || 0,
          exercises: (w?.exercises || []).map(ex => ({
            name: ex.exerciseName || ex.name || '',
            sets: typeof ex.sets === 'number' ? ex.sets : 0,
            reps: typeof ex.reps === 'number' ? ex.reps : 0,
            exerciseId: ex.exerciseId || ex.id,
            duration: ex.duration,
            restTime: ex.restTime,
          })),
        },
        caloriesBurned: p.caloriesBurned || 0,
        durationMinutes: 0,    // not stored in old workoutProgress
        completedAt,
        weekStart,
      };
    });

  sessions.forEach(s => addCompletedSession(s));
  markCompletedSessionsHydrated();
}, [_hasHydrated, completedSessionsHydrated]);
```

**Loop safety (Rule 10):** The effect reads `_hasHydrated` and `completedSessionsHydrated`. It writes `completedSessionsHydrated` (via `markCompletedSessionsHydrated()`), which causes one re-run. On that re-run, `if (completedSessionsHydrated) return` fires immediately. One write, then permanently a no-op.

---

## Type Updates

### `src/types/ai.ts` — `DayWorkout` interface

```typescript
isExtra?: boolean;  // true when workout generated outside weekly plan
```

### `src/navigation/types.ts` — `WorkoutSession` params

```typescript
WorkoutSession: {
  workout: DayWorkout;
  sessionId?: string;
  resumeExerciseIndex?: number;
  isExtra?: boolean;  // routes completion to extraWorkoutService
};
```

---

## Service Layer

### `src/services/completionTracking.ts` — two updates

#### 1. `completeWorkout()` — append `CompletedSession` after Supabase insert succeeds

```typescript
fitnessStore.addCompletedSession({
  sessionId: sessionData?.sessionId || generateUUID(),
  type: 'planned',
  workoutId: workoutId,
  workoutSnapshot: {
    title: workout.title,
    category: workout.category || 'general',
    duration: workout.duration || 0,
    exercises: (workout.exercises || []).map(ex => ({
      name: ex.exerciseName || ex.name || '',
      sets: typeof ex.sets === 'number' ? ex.sets : 0,
      reps: typeof ex.reps === 'number' ? ex.reps : 0,
      exerciseId: ex.exerciseId || ex.id,
      duration: ex.duration,
      restTime: ex.restTime,
    })),
  },
  caloriesBurned: actualCaloriesBurned,
  durationMinutes: sessionData?.duration || workout.duration || 0,
  completedAt: new Date().toISOString(),
  weekStart: getCurrentWeekStart(),
});
```

#### 2. `getCompletionStats()` — read from `completedSessions`

Replace the current inline `workoutProgress` + `currentPlanIds` filtering (lines 460-465) with:
```typescript
const weekStart = getCurrentWeekStart();
const planned = fitnessStore.getPlannedSessionStats(weekStart);
const extra = fitnessStore.getExtraSessionStats(weekStart);
const completedWorkouts = planned.count;
const caloriesBurned = planned.totalCalories + extra.totalCalories;
```

This closes the stale second source that would otherwise diverge from the updated store selector.

### `src/services/extraWorkoutService.ts` — new file

#### `getSuggestions(profile, goals): ExtraWorkoutTemplate[]`

Returns 2–3 templates instantly (no AI call). Titles, categories, and difficulties derived from `fitnessGoals.primaryGoal` and `experience`. `estimatedCalories` = MET coefficient for category × duration × (65 kg bracket if no weight available — this is an estimate displayed on a card, not used in any calculation; Rule 9 is not violated).

#### `generateWorkout(template, profile, goals): Promise<DayWorkout>`

Called only on START tap:
```typescript
const result = await workoutEngine.generateQuickWorkout(profile, goals, template.duration);
if (!result.success || !result.data) {
  console.error('[extraWorkoutService] generateWorkout failed:', result.error);
  return null;
}
return {
  id: generateUUID(),
  title: result.data.title,
  category: template.category,
  duration: template.duration,
  estimatedCalories: template.estimatedCalories,  // display only (Rule 9)
  exercises: result.data.exercises || [],
  dayOfWeek: getCurrentDayName(),
  isExtra: true,
};
```

Returns `null` on failure — caller shows `crossPlatformAlert` (Rule: no `Alert.alert` directly).

#### `completeExtraWorkout(workout, sessionData, userId): Promise<boolean>`

1. Calculate `actualCaloriesBurned` via MET calculator — 0 with no fallback if weight unavailable (Rule 8)
2. **Guest mode guard:** if `!userId || userId.startsWith('guest')`, skip steps 3–4; proceed to step 5 (store always updated)
3. Insert to `workout_sessions` with `is_extra: true`; log with `console.error` on failure (Rule 5); continue regardless
4. Call `analyticsDataService.updateTodaysMetrics({ workoutsCompleted: 1, caloriesBurned: actualCaloriesBurned })` — wrapped in its own try/catch with `console.error`; failure here is an accepted eventual-consistency gap (same pattern as existing plan completion flow)
5. `fitnessStore.addCompletedSession(...)` with `type: 'extra'` — always runs; store is the runtime source (Rule 6)
6. Trigger `fitnessRefreshService`
7. Return `true` if store update succeeded; `false` only if store update itself threw

### `src/services/dataRetrieval.ts` — update `getTotalCaloriesBurned()`

Current: queries `workoutProgress` independently, filtered by plan IDs.
Updated: delegates to `fitnessStore.getAllSessionCalories()` for a given date, or sums all `completedSessions` for all-time totals.

The old implementation is removed entirely — not wrapped. Rule 1: one source.

---

## Hook Layer

### `src/hooks/useQuickWorkouts.ts` — new file

```typescript
function useQuickWorkouts(): {
  isVisible: boolean;
  suggestions: ExtraWorkoutTemplate[];
  isGenerating: boolean;
  startQuickWorkout: (template: ExtraWorkoutTemplate) => Promise<void>;
}
```

**Visibility:**
```typescript
const todayISO = new Date().toISOString();
const todayCompletedInSessions = completedSessions.some(
  s => s.type === 'planned'
    && s.weekStart === getCurrentWeekStart()
    && isSameDay(s.completedAt, todayISO)
);
const isVisible = isSelectedDayToday && todayCompletedInSessions;
// Guest mode: todayCompletedInSessions will be false (no plan) — no special guard needed
```

Reads from store only. No writes to state it reads (Rule 10).

**`startQuickWorkout`:**
```typescript
async (template) => {
  try {
    setIsGenerating(true);
    const workout = await extraWorkoutService.generateWorkout(template, profile, goals);
    if (!workout) {
      crossPlatformAlert('Error', 'Could not generate workout. Please try again.');
      return;
    }
    navigation.navigate('WorkoutSession', { workout, isExtra: true });
  } catch (err) {
    console.error('[useQuickWorkouts] startQuickWorkout failed:', err);
    crossPlatformAlert('Error', 'Could not generate workout. Please try again.');
  } finally {
    setIsGenerating(false);
  }
}
```

### `src/hooks/useFitnessLogic.ts` — three updates

1. **Remove** `suggestedWorkouts` derived state (lines ~245-280). Wire `useQuickWorkouts` output instead.
2. **Add** the backfill `useEffect` (described in Store section above). Include in `useFitnessLogic` because it already contains the identical `caloriesBurned` backfill pattern (lines 104-153).
3. **Update** `completedWorkouts` history array (lines 197-235): build from `completedSessions.filter(s => s.type === 'planned' && s.weekStart === getCurrentWeekStart())` instead of `workoutProgress`. History list and "1/5" counter now share one source.

### `src/hooks/useUnifiedStats.ts` — updated

**Note on first-upgrade flash:** On the very first cold start after this feature ships, `completedSessions` will be `[]` until the backfill `useEffect` runs (one render cycle after `_hasHydrated` becomes true). During that single render, `totalWorkouts` and `totalCaloriesBurned` will briefly show `0`. The existing progress screen already renders skeleton/loading states when data is loading, so no additional UI guard is required. If this proves visible in practice, the fix is a `!_hasHydrated` guard that returns the previous `workoutProgress`-based values as a transition.

```typescript
// Subscribe to completedSessions (new)
const completedSessions = useFitnessStore(state => state.completedSessions);

// totalWorkouts: all-time, both types
const totalWorkouts = completedSessions.length;

// totalCaloriesBurned: all-time, both types
const totalCaloriesBurned = completedSessions.reduce(
  (sum, s) => sum + s.caloriesBurned, 0
);
// Remove: DataRetrievalService.getTotalCaloriesBurned() delegation — replaced above (Rule 1)
```

Streak calculation remains as-is (reads `workoutProgress.completedAt` for historical dates — this is safe because `completedAt` in `workoutProgress` is not the stat source, just a date input for streak logic).

---

## UI Layer

### `src/components/fitness/SuggestedWorkouts.tsx` — interface update

```typescript
interface SuggestedWorkoutsProps {
  workouts: ExtraWorkoutTemplate[];                              // was: SuggestedWorkout[]
  onStartWorkout: (workout: ExtraWorkoutTemplate) => void | Promise<void>;  // was: synchronous SuggestedWorkout
  isGenerating?: boolean;                                        // new
}
```

When `isGenerating` is true, show `ActivityIndicator` overlay on the tapped card. The local `SuggestedWorkout` interface in the component file is removed — `ExtraWorkoutTemplate` from `types.ts` is the canonical type.

### `src/screens/main/FitnessScreen.tsx`

```typescript
// Replace current condition:
{quickWorkouts.isVisible && (
  <SuggestedWorkouts
    workouts={quickWorkouts.suggestions}
    onStartWorkout={quickWorkouts.startQuickWorkout}
    isGenerating={quickWorkouts.isGenerating}
  />
)}
```

### `src/screens/workout/WorkoutSessionScreen.tsx`

Two explicit changes required:

**1. Screen-level props interface** (lines 37–46) — add `isExtra` to route params:
```typescript
interface WorkoutSessionScreenProps {
  route: {
    params: {
      workout: DayWorkout;
      sessionId?: string;
      resumeExerciseIndex?: number;
      isExtra?: boolean;        // new
    };
  };
  navigation: any;
}
```

**2. `completeWorkout` callback** — destructure and route on `isExtra`:
```typescript
const { workout, sessionId, resumeExerciseIndex, isExtra } = route.params;

// In completeWorkout():
const success = isExtra
  ? await extraWorkoutService.completeExtraWorkout(workout, sessionData, userId)
  : await completionTrackingService.completeWorkout(workout.id, sessionData, userId);
```

No other changes to session flow.

---

## Analytics Layer

### `src/screens/main/AnalyticsScreen.tsx`

Daily calories card — top number is `getAllSessionCalories(dateStr)` (honest total, Rule 9).

Breakdown row, shown only when `extraSessionsForDay.length > 0`:
```
🏋 Plan workout    182 cal
⚡ Extra workouts +143 cal
──────────────────────────
Total             325 cal
```

### `src/services/analyticsData.ts` — add `getSessionCaloriesByType()`

```typescript
async getSessionCaloriesByType(
  userId: string,
  dateStr: string   // 'YYYY-MM-DD'
): Promise<{ planned: number; extra: number }>
```

Queries `workout_sessions` where `user_id = userId` and `date(completed_at) = dateStr`, returns grouped by `is_extra`. On error: logs `console.error`, returns `{ planned: 0, extra: 0 }` (Rule 5).

---

## Rules Compliance

| Rule | How it's met |
|---|---|
| 1. Single Source of Truth | `completedSessions[]` is the only stat source. `DataRetrievalService.getTotalCaloriesBurned()` retired. `getCompletionStats()` updated. No second source. |
| 2. Root Cause First | Root causes identified: (a) `workoutProgress` conflates resume + history; (b) `completeWorkout` drops `caloriesBurned`. Both fixed at source. |
| 3. Search Before Building | `SuggestedWorkouts`, `WorkoutEngine.generateQuickWorkout()`, `WorkoutSessionScreen`, `fitnessRefreshService`, `analyticsDataService` all reused. New files only where no equivalent exists. |
| 4. Schema + Code Must Match | `is_extra` in migration matches `is_extra` in `completeExtraWorkout` insert exactly. |
| 5. No Silent Failures | All Supabase and WorkoutEngine errors logged with `console.error`. Guest-mode skips are expected paths, not errors. |
| 6. Store is Runtime Source | `addCompletedSession()` always runs in step 5 of `completeExtraWorkout`, before function returns, regardless of Supabase success. |
| 7. Migrations Append-Only | New migration file. `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` throughout. |
| 8. No Hardcoded Fallbacks | `caloriesBurned = 0` with no fake value when weight unavailable. `estimatedCalories` on templates is display-only and explicitly annotated. |
| 9. Calories Single Source | `caloriesBurned` in `CompletedSession` set once via MET at completion. `estimatedCalories` never enters any calculation anywhere. `getAllSessionCalories()` is the single aggregation point. |
| 10. No useEffect Loops | Backfill effect writes `completedSessionsHydrated` once; on next render, guard fires and effect is permanently a no-op. `useQuickWorkouts` reads store, never writes to what it reads. |

---

## Complete File Map

| File | Action |
|---|---|
| `supabase/migrations/20260316000002_add_extra_workout_support.sql` | **New** |
| `src/utils/weekUtils.ts` | **New** — `getCurrentWeekStart()`, `isSameDay()`, `getCurrentDayName()` |
| `src/stores/fitness/types.ts` | **Add** `CompletedSession`, `ExtraWorkoutTemplate` |
| `src/stores/fitnessStore.ts` | **Update** — fix `completeWorkout` signature + `caloriesBurned` persistence; add `completedSessions`, `completedSessionsHydrated`, `_hasHydrated`; add new actions; update `getCompletedWorkoutStats`; update `partialize`; update `reset` |
| `src/types/ai.ts` | **Add** `isExtra?: boolean` to `DayWorkout` |
| `src/navigation/types.ts` | **Add** `isExtra?: boolean` to `WorkoutSession` params |
| `src/services/extraWorkoutService.ts` | **New** |
| `src/services/completionTracking.ts` | **Extend** `completeWorkout()` + update `getCompletionStats()` |
| `src/services/dataRetrieval.ts` | **Update** `getTotalCaloriesBurned()` — delegate to store, remove old implementation |
| `src/hooks/useQuickWorkouts.ts` | **New** |
| `src/hooks/useFitnessLogic.ts` | **Update** — remove old `suggestedWorkouts`; add backfill `useEffect`; update `completedWorkouts` history source |
| `src/hooks/useUnifiedStats.ts` | **Update** — subscribe to `completedSessions`; remove `DataRetrievalService` delegation |
| `src/components/fitness/SuggestedWorkouts.tsx` | **Update** — replace `SuggestedWorkout` interface with `ExtraWorkoutTemplate`; add `isGenerating` prop |
| `src/screens/main/FitnessScreen.tsx` | **Update** — new visibility condition |
| `src/screens/workout/WorkoutSessionScreen.tsx` | **Add** `isExtra` route param handling + completion routing |
| `src/screens/main/AnalyticsScreen.tsx` | **Add** calories breakdown row |
| `src/services/analyticsData.ts` | **Add** `getSessionCaloriesByType()` |
