/**
 * insightLine - single data-true coaching sentence for the home hero.
 * Returns null when nothing meaningful is true (no fabricated insight).
 */

export interface InsightLineInput {
  recoveryScore?: number;
  sleepHours?: number;
  sleepQuality?: "poor" | "fair" | "good" | "excellent";
  currentStreak?: number;
  hydrationBehind?: boolean;
  hasWorkoutToday?: boolean;
}

export const getInsightLine = ({
  recoveryScore,
  sleepHours,
  sleepQuality,
  currentStreak,
  hydrationBehind,
  hasWorkoutToday,
}: InsightLineInput): string | null => {
  if (recoveryScore !== undefined && recoveryScore >= 80) {
    return sleepHours !== undefined && sleepHours >= 7
      ? "Great sleep and full recovery — perfect day to push your training."
      : "Full recovery today — your body is ready for intensity.";
  }

  if (recoveryScore !== undefined && recoveryScore < 50) {
    return "Recovery is low — keep today light and prioritize rest tonight.";
  }

  if (sleepHours !== undefined && sleepHours > 0 && sleepHours < 6) {
    return `Only ${sleepHours.toFixed(1)}h sleep — take it steady and get to bed earlier tonight.`;
  }

  if (sleepQuality === "excellent" && sleepHours !== undefined && sleepHours >= 7) {
    return "Excellent sleep last night — capitalize on that energy today.";
  }

  if (hydrationBehind) {
    return "You're behind on water for this time of day — a glass now helps.";
  }

  if (currentStreak !== undefined && currentStreak >= 7 && hasWorkoutToday) {
    return `${currentStreak}-day streak and counting — today's session keeps it alive.`;
  }

  return null;
};

export default getInsightLine;
