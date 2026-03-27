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

export function checkProactiveDeload(
  mesocycleWeek: number,
): DeloadSuggestion | null {
  if (mesocycleWeek < 5) return null;

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
  const reductionFactor = 0.5;
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
