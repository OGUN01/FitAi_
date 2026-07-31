interface WeightHistoryPoint {
  date: string;
  weight: number;
}

/** Local YYYY-MM-DD key so entries from different sources dedupe per day. */
const toDayKey = (dateValue: string): string => {
  // Plain date strings (YYYY-MM-DD) pass through; ISO datetimes convert to local day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return dateValue;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Merges the two weight sources into one ascending per-day series:
 *  - progressEntries: guest local history (AsyncStorage) / Supabase progress_entries
 *  - weightHistory: analytics_metrics series (canonical for authed users; also
 *    receives same-day writes from WeightEntryModal)
 * weightHistory wins on duplicate days. Without the merge, a guest who logs
 * their first weight sees the journey chart collapse from full history to a
 * single point (weightHistory non-empty → progressEntries ignored).
 */
export function mergeWeightSeries(
  weightHistory: WeightHistoryPoint[] | undefined,
  progressEntries: Array<{ entry_date: string; weight_kg: number | null }>,
): WeightHistoryPoint[] {
  const byDay = new Map<string, number>();
  for (const entry of progressEntries) {
    if (entry.weight_kg != null && Number.isFinite(entry.weight_kg)) {
      byDay.set(toDayKey(entry.entry_date), entry.weight_kg);
    }
  }
  for (const entry of weightHistory ?? []) {
    if (Number.isFinite(entry.weight)) {
      byDay.set(toDayKey(entry.date), entry.weight);
    }
  }
  return [...byDay.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
