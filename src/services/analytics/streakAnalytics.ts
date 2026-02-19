import { FitnessMetrics } from "./types";

export function calculateWorkoutStreaks(metrics: FitnessMetrics[]): {
  currentStreak: number;
  longestStreak: number;
} {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const sortedMetrics = [...metrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (let i = sortedMetrics.length - 1; i >= 0; i--) {
    const metric = sortedMetrics[i];

    if (metric.workoutCount > 0) {
      tempStreak++;
      if (i === sortedMetrics.length - 1) {
        currentStreak = tempStreak;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
      if (i === sortedMetrics.length - 1) {
        currentStreak = 0;
      }
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

export function identifyAchievements(metrics: FitnessMetrics[]): string[] {
  const achievements: string[] = [];

  const { currentStreak } = calculateWorkoutStreaks(metrics);
  if (currentStreak >= 7) {
    achievements.push(`🔥 ${currentStreak}-day workout streak!`);
  }

  const weights = metrics.filter((m) => m.weight).map((m) => m.weight!);
  if (weights.length >= 2) {
    const weightChange = weights[0] - weights[weights.length - 1];
    if (Math.abs(weightChange) >= 1) {
      achievements.push(
        `📉 ${Math.abs(weightChange).toFixed(1)}kg ${weightChange < 0 ? "lost" : "gained"}!`,
      );
    }
  }

  const workoutDays = metrics.map((m) => (m.workoutCount > 0 ? 1 : 0));
  const consistencyScore = calculateAchievementConsistency(workoutDays);
  if (consistencyScore >= 90) {
    achievements.push("⭐ Exceptional workout consistency!");
  }

  return achievements;
}

function calculateAchievementConsistency(binaryData: number[]): number {
  if (binaryData.length === 0) return 0;

  const totalDays = binaryData.length;
  const activeDays = binaryData.reduce((sum, day) => sum + day, 0);
  const basicScore = (activeDays / totalDays) * 100;

  let currentStreak = 0;
  let maxStreak = 0;
  for (const day of binaryData) {
    if (day === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const streakBonus = Math.min(20, maxStreak * 2);
  return Math.min(100, basicScore + streakBonus);
}
