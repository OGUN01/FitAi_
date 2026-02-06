import {
  achievementEngine,
  Achievement,
  UserAchievement,
} from "../../services/achievementEngine";
import { achievementDataService } from "../../services/achievementData";
import {
  achievementListenerAttached,
  setAchievementListenerAttached,
} from "./state";
import { useFitnessStore } from "@/stores/fitness";
import { useNutritionStore } from "@/stores/nutritionStore";

export const createActions = (set: any, get: any) => ({
  initialize: async (userId: string) => {
    set({ isLoading: true });

    try {
      console.log("🎯 Initializing achievement store...");

      await achievementEngine.initialize();

      const achievements = achievementEngine.getAllAchievements();

      const userProgress = achievementEngine.getUserAchievementProgress(userId);

      const stats = achievementEngine.getUserAchievementStats(userId);

      if (achievementListenerAttached) {
        achievementEngine.removeAllListeners?.("achievementUnlocked");
        setAchievementListenerAttached(false);
      }

      achievementEngine.on(
        "achievementUnlocked",
        (achievement: Achievement, userAchievement: UserAchievement) => {
          const state = get();

          const newUnlockedToday = [...state.unlockedToday, userAchievement];

          if (!userAchievement.celebrationShown) {
            set({
              showCelebration: true,
              celebrationAchievement: achievement,
              unlockedToday: newUnlockedToday,
            });
          }

          console.log(`🏆 Achievement unlocked: ${achievement.title}`);

          achievementDataService.saveUserAchievement(userId, userAchievement);
        },
      );

      setAchievementListenerAttached(true);

      set({
        isInitialized: true,
        achievements,
        userAchievements: userProgress,
        totalFitCoinsEarned: stats.totalFitCoinsEarned,
        completionRate: stats.completionRate,
        isLoading: false,
      });

      console.log(
        `✅ Achievement store initialized with ${achievements.length} achievements`,
      );

      get().updateCurrentStreak();
      get().loadFromSupabase(userId);
    } catch (error) {
      console.error("❌ Error initializing achievement store:", error);
      set({ isLoading: false });
    }
  },

  checkProgress: async (userId: string, activityData: Record<string, any>) => {
    try {
      const newlyUnlocked = await achievementEngine.checkAchievements(
        userId,
        activityData,
      );

      if (newlyUnlocked.length > 0) {
        const state = get();

        const updatedProgress =
          achievementEngine.getUserAchievementProgress(userId);
        const stats = achievementEngine.getUserAchievementStats(userId);

        set({
          userAchievements: updatedProgress,
          totalFitCoinsEarned: stats.totalFitCoinsEarned,
          completionRate: stats.completionRate,
          unlockedToday: [...state.unlockedToday, ...newlyUnlocked],
        });

        console.log(`🎉 ${newlyUnlocked.length} new achievements unlocked!`);
      }
    } catch (error) {
      console.error("❌ Error checking achievement progress:", error);
    }
  },

  markCelebrationShown: (achievementId: string) => {
    const state = get();
    const achievement = state.userAchievements.get(achievementId);

    if (achievement) {
      achievement.celebrationShown = true;

      set({
        userAchievements: new Map(
          state.userAchievements.set(achievementId, achievement),
        ),
      });
    }
  },

  showAchievementCelebration: (achievement: Achievement) => {
    set({
      showCelebration: true,
      celebrationAchievement: achievement,
    });
  },

  hideCelebration: () => {
    set({
      showCelebration: false,
      celebrationAchievement: null,
    });
  },

  reset: () => {
    set({
      isLoading: false,
      isInitialized: false,
      achievements: [],
      userAchievements: new Map(),
      unlockedToday: [],
      showCelebration: false,
      celebrationAchievement: null,
      totalFitCoinsEarned: 0,
      completionRate: 0,
      currentStreak: 0,
    });
  },

  updateCurrentStreak: () => {
    const fitnessStore = useFitnessStore.getState();
    const nutritionStore = useNutritionStore.getState();

    const completionDates = new Set<string>();

    Object.values(fitnessStore.workoutProgress).forEach((progress) => {
      if (progress.completedAt) {
        const date = new Date(progress.completedAt).toISOString().split("T")[0];
        completionDates.add(date);
      }
    });

    Object.values(nutritionStore.mealProgress).forEach((progress) => {
      if (progress.completedAt) {
        const date = new Date(progress.completedAt).toISOString().split("T")[0];
        completionDates.add(date);
      }
    });

    const sortedDates = Array.from(completionDates).sort().reverse();
    const today = new Date().toISOString().split("T")[0];

    let streak = 0;
    let expectedDate = today;

    for (const date of sortedDates) {
      if (date === expectedDate) {
        streak++;
        const prevDate = new Date(expectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        expectedDate = prevDate.toISOString().split("T")[0];
      } else if (date < expectedDate) {
        break;
      }
    }

    set({ currentStreak: streak });
  },
});
