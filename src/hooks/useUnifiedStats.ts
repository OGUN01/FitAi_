import { useMemo } from "react";
import {
  useHealthDataStore,
  useAchievementStore,
  useFitnessStore,
} from "../stores";

export interface UnifiedStats {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  currentStreak: number;
  longestStreak: number;
  achievements: number;
  steps: number;
}

export const useUnifiedStats = (): UnifiedStats => {
  const healthMetrics = useHealthDataStore((state) => state.metrics);
  const currentStreak = useAchievementStore((state) => state.currentStreak);
  const userAchievements = useAchievementStore(
    (state) => state.userAchievements,
  );
  const getCompletedWorkoutStats = useFitnessStore(
    (state) => state.getCompletedWorkoutStats,
  );

  return useMemo(() => {
    const totalCaloriesBurned =
      (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0
        ? healthMetrics.totalCalories
        : healthMetrics?.activeCalories) || 0;

    const steps = healthMetrics?.steps || 0;

    const workoutStats = getCompletedWorkoutStats?.() || { count: 0 };
    const totalWorkouts = workoutStats.count || 0;

    const streak = currentStreak || 0;
    const longestStreak = streak;
    const achievementCount = userAchievements?.size || 0;

    return {
      totalWorkouts,
      totalCaloriesBurned,
      currentStreak: streak,
      longestStreak,
      achievements: achievementCount,
      steps,
    };
  }, [
    healthMetrics?.totalCalories,
    healthMetrics?.activeCalories,
    healthMetrics?.steps,
    currentStreak,
    userAchievements,
    getCompletedWorkoutStats,
  ]);
};

export default useUnifiedStats;
