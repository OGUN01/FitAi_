export interface RecentSessionForDeload {
  sets: Array<{ reps: number; weight: number; completed: boolean }>;
  repRange: [number, number];
}

export interface DeloadSuggestion {
  type: "proactive" | "reactive";
  reason: string;
  exerciseId?: string;
  volumeReductionPercent?: number;
  weightReductionPercent?: number;
  isEarlyMesocycle?: boolean;
}

export interface DeloadPlan {
  deloadSets: number;
  keepExercises: boolean;
  keepWeight: boolean;
  volumeReductionPercent: number;
}

/**
 * Weeks of rising-volume accumulation before a deload (weeks 1..ACCUMULATION_WEEKS
 * within a block), immediately followed by 1 deload week. periodizationService.ts
 * imports this rather than declaring its own copy — SINGLE SOURCE for the
 * accumulation-phase length, since periodizationService already treats
 * checkProactiveDeload as an input rather than reimplementing it (see that
 * file's own header comment).
 */
export const ACCUMULATION_WEEKS = 4;
/** Full repeating cycle: ACCUMULATION_WEEKS of accumulation + 1 deload week. */
export const DELOAD_CYCLE_WEEKS = ACCUMULATION_WEEKS + 1;

export function checkProactiveDeload(
  mesocycleWeek: number,
): DeloadSuggestion | null {
  if (mesocycleWeek < 1) return null;

  // BUG FIX (was a plain `mesocycleWeek < 5` guard with NO upper bound):
  // fitnessStore.getMesocycleWeek() is pure calendar time from
  // mesocycleStartDate, and that start date is only ever set ONCE — the
  // first time a plan is generated (see useFitnessLogic.ts,
  // ScheduleBuilderScreen.tsx, both guarded by `if (!mesocycleStartDate)`).
  // Nothing rolls it forward afterward. So the old `>= 5` guard stayed true
  // FOREVER past week 5 — useFitnessLogic.ts's mount effect called this on
  // every app open and nagged "time for a recovery week!" indefinitely,
  // for the rest of the user's time in the app, not just in week 5.
  //
  // Fixed by treating the mesocycle as a repeating DELOAD_CYCLE_WEEKS-week
  // block (4 accumulation weeks + 1 deload week) rather than one linear
  // countdown — week 5, 10, 15, ... deload; every other week accumulates.
  // Deliberately NOT fixed by resetting mesocycleStartDate itself: that
  // would require deciding WHEN a deload week is "done" (does finishing
  // one workout count? all planned sessions that week? the calendar week
  // elapsing regardless of adherence?) — a product/UX question outside
  // this function's scope — and would break the two other call sites that
  // already correctly clamp the raw week to [1,4] for AI plan generation
  // (useFitnessLogic.ts, ScheduleBuilderScreen.tsx: `Math.max(1, Math.min(4,
  // getMesocycleWeek() || 1))`), both of which need mesocycleStartDate to
  // stay a stable, ever-increasing anchor.
  const weekInCycle = ((mesocycleWeek - 1) % DELOAD_CYCLE_WEEKS) + 1;
  if (weekInCycle <= ACCUMULATION_WEEKS) return null;

  return {
    type: "proactive",
    reason: `Week ${mesocycleWeek} — time for a recovery week! Reduce volume by 40%?`,
    volumeReductionPercent: 40,
  };
}

export function checkReactiveDeload(
  exerciseId: string,
  recentSessions: RecentSessionForDeload[],
  mesocycleWeek?: number,
): DeloadSuggestion | null {
  if (recentSessions.length < 2) return null;

  let consecutiveFailures = 0;

  for (const session of recentSessions) {
    const completedSets = session.sets.filter((s) => s.completed);
    if (completedSets.length === 0) break;

    const floor = session.repRange[0];
    const failedSets = completedSets.filter((s) => s.reps < floor);
    const isFailed = failedSets.length > completedSets.length / 2;

    if (isFailed) {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  if (consecutiveFailures < 2) return null;

  const isEarlyMesocycle = mesocycleWeek !== undefined && mesocycleWeek <= 2;

  return {
    type: "reactive",
    reason: isEarlyMesocycle
      ? `${exerciseId} struggling for ${consecutiveFailures} sessions — consider reducing weight by 10%`
      : `${exerciseId} struggling for ${consecutiveFailures} sessions — consider reducing by 10%`,
    exerciseId,
    weightReductionPercent: 10,
    isEarlyMesocycle,
  };
}

export function generateDeloadPlan(currentSets: number): DeloadPlan {
  // 40% reduction (0.6 = keep 60% of sets) to match checkProactiveDeload's
  // advisory banner and the Worker's deloadWorkoutPlan endpoint — was 0.5
  // (50% reduction), silently disagreeing with both.
  const reductionFactor = 0.6;
  const deloadSets = Math.max(1, Math.round(currentSets * reductionFactor));
  const actualReduction = Math.round(
    ((currentSets - deloadSets) / currentSets) * 100,
  );

  return {
    deloadSets,
    keepExercises: true,
    keepWeight: true,
    volumeReductionPercent: actualReduction,
  };
}
