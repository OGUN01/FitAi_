import { useMemo } from "react";
import { useFitnessStore } from "../stores/fitnessStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { useAchievementStore } from "../stores/achievementStore";
import { useHealthDataStore } from "../stores/healthDataStore";
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
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const mealProgress = useNutritionStore((state) => state.mealProgress);
  const userAchievements = useAchievementStore((state) => state.userAchievements);
  const healthSteps = useHealthDataStore((state) => state.metrics.steps);

  return useMemo(() => {
    const streak = DataRetrievalService.getWeeklyProgress().streak;

    const totalWorkouts = completedSessions.length;

    const totalCaloriesBurned = completedSessions.reduce((sum, s) => sum + s.caloriesBurned, 0);

    const completionDates = new Set<string>();
    completedSessions
      .filter((s) => s.completedAt)
      .forEach((s) => completionDates.add(new Date(s.completedAt).toDateString()));
    Object.values(mealProgress)
      .filter((p) => p.completedAt)
      .forEach((p) => completionDates.add(new Date(p.completedAt!).toDateString()));

    let longestStreak = streak;
    if (completionDates.size > 1) {
      const sortedDates = Array.from(completionDates)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());

      let currentRun = 1;
      let best = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.round(
          (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diff === 1) {
          currentRun++;
          if (currentRun > best) best = currentRun;
        } else {
          currentRun = 1;
        }
      }
      longestStreak = Math.max(streak, best);
    }

    const achievementCount = userAchievements?.size || 0;
    const steps = healthSteps || 0;

    return { totalWorkouts, totalCaloriesBurned, currentStreak: streak, longestStreak, achievements: achievementCount, steps };
  }, [completedSessions, mealProgress, userAchievements, healthSteps]);
};

export default useUnifiedStats;
