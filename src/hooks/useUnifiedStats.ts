// SSOT Fix 18: useUnifiedStats now reads currentStreak from achievementStore
// instead of computing it inline from completedSessions.
//
// Previous: streak was counted via a while(true) loop over completedSessions
//   — only looked at workout sessions, ignored meal completions, and could
//   diverge from achievementStore.currentStreak (which updateCurrentStreak()
//   maintains as the canonical value after every completed activity).
//
// longestStreak: no canonical store tracks this yet, so we derive it from
// the combined workout+meal completion dates (same as before), but we use
// achievementStore.currentStreak as the floor to stay consistent.

import { useMemo } from 'react';
import { useFitnessStore } from '../stores/fitnessStore';
import { useNutritionStore } from '../stores/nutritionStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useHealthDataStore } from '../stores/healthDataStore';

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

  // SSOT: achievementStore.currentStreak is the authoritative streak value.
  const currentStreak = useAchievementStore((state) => state.currentStreak);

  return useMemo(() => {
    const totalWorkouts = completedSessions.length;
    const totalCaloriesBurned = completedSessions.reduce(
      (sum, s) => sum + (s.caloriesBurned ?? 0),
      0
    );

    // Longest streak: no single store owns this yet, so we derive it from the
    // full history of completion dates (workouts + meals), using currentStreak
    // as the minimum so they never contradict each other.
    const completionDates = new Set<string>();
    completedSessions
      .filter((s) => s.completedAt)
      .forEach((s) => completionDates.add(new Date(s.completedAt).toDateString()));
    Object.values(mealProgress)
      .filter((p) => p.completedAt)
      .forEach((p) => completionDates.add(new Date(p.completedAt!).toDateString()));

    let longestStreak = currentStreak; // never less than the live streak
    if (completionDates.size > 1) {
      const sortedDates = Array.from(completionDates)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());

      let currentRun = 1;
      let best = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.round(
          (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 1) {
          currentRun++;
          if (currentRun > best) best = currentRun;
        } else {
          currentRun = 1;
        }
      }
      longestStreak = Math.max(currentStreak, best);
    }

    const achievementCount = Array.from(userAchievements.values()).filter(
      (achievement) => achievement.isCompleted
    ).length;
    const steps = healthSteps || 0;

    return {
      totalWorkouts,
      totalCaloriesBurned,
      currentStreak, // from achievementStore — SSOT
      longestStreak,
      achievements: achievementCount,
      steps,
    };
  }, [completedSessions, mealProgress, userAchievements, healthSteps, currentStreak]);
};

export default useUnifiedStats;
