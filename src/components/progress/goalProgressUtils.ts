interface WeightHistoryPoint {
  date: string;
  weight: number;
}

interface WeightGoalProgressInput {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weightHistory?: WeightHistoryPoint[];
  fallbackStartWeightKg?: number | null;
  weeklyRateKg?: number | null;
  targetTimelineWeeks?: number | null;
}

interface WeightGoalProgressResult {
  startWeightKg: number | null;
  weightProgress: number | null;
  weeklyRateKg: number | null;
  weeksLeft: number | null;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function getWeightGoalProgress({
  currentWeightKg,
  targetWeightKg,
  weightHistory = [],
  fallbackStartWeightKg = null,
  weeklyRateKg = null,
  targetTimelineWeeks = null,
}: WeightGoalProgressInput): WeightGoalProgressResult {
  if (currentWeightKg == null || targetWeightKg == null) {
    return {
      startWeightKg: null,
      weightProgress: null,
      weeklyRateKg: null,
      weeksLeft: null,
    };
  }

  const sortedHistory = [...weightHistory]
    .filter((entry) => Number.isFinite(entry.weight))
    .sort((a, b) => a.date.localeCompare(b.date));

  const startWeightKg = sortedHistory[0]?.weight ?? fallbackStartWeightKg ?? currentWeightKg;

  const totalToTarget = Math.abs(startWeightKg - targetWeightKg);
  const progressToDate = Math.abs(startWeightKg - currentWeightKg);
  const weightProgress = totalToTarget > 0 ? Math.min(1, progressToDate / totalToTarget) : 1;

  const derivedWeeklyRate =
    targetTimelineWeeks && targetTimelineWeeks > 0
      ? round2(Math.abs(startWeightKg - targetWeightKg) / targetTimelineWeeks)
      : weeklyRateKg;

  const weeksLeft =
    derivedWeeklyRate && derivedWeeklyRate > 0
      ? Math.ceil(Math.abs(currentWeightKg - targetWeightKg) / derivedWeeklyRate)
      : null;

  return {
    startWeightKg,
    weightProgress,
    weeklyRateKg: derivedWeeklyRate,
    weeksLeft,
  };
}
