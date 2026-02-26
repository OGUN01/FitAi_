import { useMemo } from "react";
import { useFitnessStore } from "../stores/fitnessStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { useAchievementStore } from "../stores/achievementStore";
import DataRetrievalService from "../services/dataRetrieval";

export interface UnifiedStats {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  currentStreak: number;
  longestStreak: number;
  achievements: number;
  steps: number;
}

export const useUnifiedStats = (): UnifiedStats => {
  // Subscribe to reactive store state so the hook re-computes when data changes
  const workoutProgress = useFitnessStore((state) => state.workoutProgress);
  const weeklyWorkoutPlan = useFitnessStore((state) => state.weeklyWorkoutPlan);
  const mealProgress = useNutritionStore((state) => state.mealProgress);
  const weeklyMealPlan = useNutritionStore((state) => state.weeklyMealPlan);
  const userAchievements = useAchievementStore(
    (state) => state.userAchievements,
  );

  return useMemo(() => {
    // Use DataRetrievalService — same source as Analytics screen
    const weeklyProgress = DataRetrievalService.getWeeklyProgress();
    const todaysData = DataRetrievalService.getTodaysData();

    // Streak from DataRetrievalService (consecutive days with activity)
    const streak = weeklyProgress.streak;

    // Completed workouts count
    const totalWorkouts = weeklyProgress.workoutsCompleted;

    // Calories: prefer consumed calories (what user ate today),
    // fall back to burned calories from completed workouts
    const caloriesConsumed = todaysData.progress.caloriesConsumed;
    const totalCaloriesBurned =
      weeklyWorkoutPlan?.workouts?.reduce((total, workout) => {
        const progress = workoutProgress[workout.id];
        if (progress && progress.progress === 100) {
          return total + (workout.estimatedCalories || 0);
        }
        return total;
      }, 0) || 0;
    const displayCalories =
      caloriesConsumed > 0 ? caloriesConsumed : totalCaloriesBurned;

    const longestStreak = streak; // best available approximation
    const achievementCount = userAchievements?.size || 0;

    return {
      totalWorkouts,
      totalCaloriesBurned: displayCalories,
      currentStreak: streak,
      longestStreak,
      achievements: achievementCount,
      steps: 0,
    };
  }, [
    workoutProgress,
    weeklyWorkoutPlan,
    mealProgress,
    weeklyMealPlan,
    userAchievements,
  ]);
};

export default useUnifiedStats;
