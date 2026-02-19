import { FitnessMetrics, WorkoutAnalytics } from "./types";
import { calculateConsistencyScore } from "./helpers";
import { calculateWorkoutStreaks } from "./streakAnalytics";

export function analyzeWorkouts(metrics: FitnessMetrics[]): WorkoutAnalytics {
  const totalWorkouts = metrics.reduce((sum, m) => sum + m.workoutCount, 0);
  const totalWorkoutTime = metrics.reduce(
    (sum, m) => sum + m.totalWorkoutTime,
    0,
  );
  const totalCalories = metrics.reduce((sum, m) => sum + m.caloriesBurned, 0);

  const averageWorkoutsPerWeek =
    metrics.length > 0 ? (totalWorkouts / metrics.length) * 7 : 0;
  const averageWorkoutDuration =
    totalWorkouts > 0 ? totalWorkoutTime / totalWorkouts : 0;

  const workoutDays = metrics.map((m) => (m.workoutCount > 0 ? 1 : 0));
  const consistencyScore = calculateConsistencyScore(workoutDays);

  const recentWorkouts = metrics.slice(0, Math.floor(metrics.length / 3));
  const olderWorkouts = metrics.slice(Math.floor((metrics.length * 2) / 3));
  const recentAvg =
    recentWorkouts.length > 0
      ? recentWorkouts.reduce((sum, m) => sum + m.workoutCount, 0) /
        recentWorkouts.length
      : 0;
  const olderAvg =
    olderWorkouts.length > 0
      ? olderWorkouts.reduce((sum, m) => sum + m.workoutCount, 0) /
        olderWorkouts.length
      : 0;

  let progressTrend: "improving" | "maintaining" | "declining" = "maintaining";
  if (olderAvg > 0) {
    if (recentAvg > olderAvg * 1.1) progressTrend = "improving";
    else if (recentAvg < olderAvg * 0.9) progressTrend = "declining";
  }

  const { currentStreak, longestStreak } = calculateWorkoutStreaks(metrics);

  const workoutTypeDistribution = calculateWorkoutTypeDistribution(metrics);
  const favoriteWorkoutType = determineFavoriteWorkoutType(
    workoutTypeDistribution,
  );
  const strongestMuscleGroup = determineStrongestMuscleGroup(metrics);
  const improvementAreas = identifyImprovementAreas(
    metrics,
    workoutTypeDistribution,
  );

  return {
    totalWorkouts,
    averageWorkoutsPerWeek,
    totalWorkoutTime,
    averageWorkoutDuration,
    favoriteWorkoutType,
    strongestMuscleGroup,
    improvementAreas,
    consistencyScore,
    progressTrend,
    weeklyGoalCompletion:
      averageWorkoutsPerWeek > 0
        ? Math.min(100, (averageWorkoutsPerWeek / 3) * 100)
        : 0,
    streakCurrent: currentStreak,
    streakLongest: longestStreak,
    caloriesBurnedTotal: totalCalories,
    caloriesBurnedAverage:
      metrics.length > 0 ? totalCalories / metrics.length : 0,
    workoutTypeDistribution,
  };
}

export function calculateWorkoutTypeDistribution(
  metrics: FitnessMetrics[],
): Record<string, number> {
  const typeCounts: Record<string, number> = {};
  let totalWorkoutCount = 0;

  for (const metric of metrics) {
    if ((metric as any).recentWorkouts) {
      for (const workout of (metric as any).recentWorkouts) {
        const type = workout.type || "Unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        totalWorkoutCount++;
      }
    } else if (metric.workoutCount > 0) {
      typeCounts["General"] =
        (typeCounts["General"] || 0) + metric.workoutCount;
      totalWorkoutCount += metric.workoutCount;
    }
  }

  const distribution: Record<string, number> = {};
  if (totalWorkoutCount > 0) {
    for (const [type, count] of Object.entries(typeCounts)) {
      distribution[type] = Math.round((count / totalWorkoutCount) * 100);
    }
  }

  return distribution;
}

export function determineFavoriteWorkoutType(
  distribution: Record<string, number>,
): string {
  if (Object.keys(distribution).length === 0) {
    return "Not enough data";
  }

  let maxType = "Unknown";
  let maxPercent = 0;

  for (const [type, percent] of Object.entries(distribution)) {
    if (percent > maxPercent) {
      maxPercent = percent;
      maxType = type;
    }
  }

  return maxType;
}

export function determineStrongestMuscleGroup(
  metrics: FitnessMetrics[],
): string {
  const muscleGroupCounts: Record<string, number> = {};

  for (const metric of metrics) {
    if ((metric as any).recentWorkouts) {
      for (const workout of (metric as any).recentWorkouts) {
        const muscleGroup = workoutTypeToMuscleGroup(workout.type);
        if (muscleGroup) {
          muscleGroupCounts[muscleGroup] =
            (muscleGroupCounts[muscleGroup] || 0) + 1;
        }
      }
    }
  }

  if (Object.keys(muscleGroupCounts).length === 0) {
    return "Not enough data";
  }

  let maxGroup = "Full Body";
  let maxCount = 0;
  for (const [group, count] of Object.entries(muscleGroupCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxGroup = group;
    }
  }

  return maxGroup;
}

export function workoutTypeToMuscleGroup(workoutType: string): string | null {
  const typeMap: Record<string, string> = {
    strength: "Full Body",
    "upper body": "Upper Body",
    "lower body": "Lower Body",
    cardio: "Cardiovascular",
    running: "Legs",
    walking: "Legs",
    cycling: "Legs",
    swimming: "Full Body",
    hiit: "Full Body",
    yoga: "Core",
    pilates: "Core",
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    arms: "Arms",
    legs: "Legs",
    core: "Core",
    abs: "Core",
  };

  const normalizedType = workoutType?.toLowerCase() || "";

  for (const [key, group] of Object.entries(typeMap)) {
    if (normalizedType.includes(key)) {
      return group;
    }
  }

  return "Full Body";
}

export function identifyImprovementAreas(
  metrics: FitnessMetrics[],
  distribution: Record<string, number>,
): string[] {
  const improvements: string[] = [];

  const hasCardio = Object.keys(distribution).some(
    (k) =>
      k.toLowerCase().includes("cardio") ||
      k.toLowerCase().includes("running") ||
      k.toLowerCase().includes("cycling"),
  );
  const hasStrength = Object.keys(distribution).some(
    (k) =>
      k.toLowerCase().includes("strength") ||
      k.toLowerCase().includes("weight"),
  );
  const hasFlexibility = Object.keys(distribution).some(
    (k) =>
      k.toLowerCase().includes("yoga") ||
      k.toLowerCase().includes("stretch") ||
      k.toLowerCase().includes("flexibility"),
  );

  if (!hasCardio && Object.keys(distribution).length > 0) {
    improvements.push("Cardio/Aerobic Training");
  }
  if (!hasStrength && Object.keys(distribution).length > 0) {
    improvements.push("Strength Training");
  }
  if (!hasFlexibility && Object.keys(distribution).length > 0) {
    improvements.push("Flexibility/Mobility");
  }

  const avgWorkoutsPerWeek =
    metrics.length > 0
      ? (metrics.reduce((sum, m) => sum + m.workoutCount, 0) / metrics.length) *
        7
      : 0;

  if (avgWorkoutsPerWeek < 2) {
    improvements.push("Workout Frequency");
  }

  const avgDuration =
    metrics.reduce((sum, m) => sum + m.totalWorkoutTime, 0) /
    Math.max(1, metrics.filter((m) => m.workoutCount > 0).length);
  if (avgDuration < 20) {
    improvements.push("Workout Duration");
  }

  return improvements.length > 0
    ? improvements.slice(0, 3)
    : ["Keep up the good work!"];
}
