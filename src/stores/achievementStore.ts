// Achievement Store for FitAI
// Zustand store for managing achievement state and user progress
// Now with Supabase sync for data persistence across devices

import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
  createJSONStorage,
} from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  achievementEngine,
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,
} from "../services/achievementEngine";
import { achievementDataService } from "../services/achievementData";

// PERF-006 FIX: Track listener to prevent memory leaks
let achievementListenerAttached = false;

interface AchievementStore {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  achievements: Achievement[];
  userAchievements: Map<string, UserAchievement>;
  unlockedToday: UserAchievement[];
  showCelebration: boolean;
  celebrationAchievement: Achievement | null;

  // User Stats
  totalFitCoinsEarned: number;
  completionRate: number;
  currentStreak: number;

  // Actions
  initialize: (userId: string) => Promise<void>;
  checkProgress: (
    userId: string,
    activityData: Record<string, any>,
  ) => Promise<void>;
  markCelebrationShown: (achievementId: string) => void;
  showAchievementCelebration: (achievement: Achievement) => void;
  hideCelebration: () => void;
  getAchievementsByCategory: (category: AchievementCategory) => Achievement[];
  getUserProgress: (userId: string) => UserAchievement[];
  getCompletedAchievements: (userId: string) => UserAchievement[];
  getAchievementStats: (userId: string) => {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    totalFitCoinsEarned: number;
    byTier: Record<AchievementTier, number>;
    byCategory: Record<AchievementCategory, number>;
  };

  // Home screen integration methods
  getRecentAchievements: (count?: number) => Array<{
    id: string;
    title: string;
    icon: string;
    category: string;
    completedAt: string;
  }>;
  getNearlyCompletedAchievements: (count?: number) => Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    progress: number;
    currentValue: number;
    targetValue: number;
  }>;
  getDailyProgress: () => {
    achievementsWorkedOn: number;
    achievementsCompleted: number;
    totalProgress: number;
  };
  getTotalBadgesEarned: () => number;
  getTopCategories: () => Array<{ category: string; count: number }>;

  // Supabase sync methods
  syncWithSupabase: (userId: string) => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;

  // Reset store (for logout)
  reset: () => void;
}

// Custom storage to handle Map serialization
const achievementStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (!value) return null;

      // Parse and convert userAchievementsArray back to Map
      try {
        const parsed = JSON.parse(value);
        if (parsed.state?.userAchievementsArray) {
          parsed.state.userAchievements = new Map(
            parsed.state.userAchievementsArray,
          );
          delete parsed.state.userAchievementsArray;
        }
        return JSON.stringify(parsed);
      } catch {
        console.warn(`⚠️ [achievementStorage] Corrupt data for key "${name}", clearing`);
        await AsyncStorage.removeItem(name);
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to read "${name}":`, e);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // Parse and convert Map to array for storage
      const parsed = JSON.parse(value);
      // Bug 9 fix: after JSON round-trip, Map becomes a plain object.
      // Check for object with entries instead of instanceof Map.
      const userAchievements = parsed.state?.userAchievements;
      if (
        userAchievements &&
        typeof userAchievements === 'object' &&
        !(userAchievements instanceof Map)
      ) {
        // Convert plain object (from JSON round-trip) to array format for storage
        parsed.state.userAchievementsArray = Object.entries(userAchievements);
        delete parsed.state.userAchievements;
      } else if (userAchievements instanceof Map) {
        parsed.state.userAchievementsArray = Array.from(
          userAchievements.entries(),
        );
        delete parsed.state.userAchievements;
      }
      await AsyncStorage.setItem(name, JSON.stringify(parsed));
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to write "${name}":`, e);
      // Fallback: try to write the raw value
      try {
        await AsyncStorage.setItem(name, typeof value === 'string' ? value : JSON.stringify(value));
      } catch {
        // Silently fail — data will be reloaded from Supabase on next login
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to remove "${name}":`, e);
    }
  },
};

export const useAchievementStore = create<AchievementStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial State
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

      // Initialize the achievement system
      initialize: async (userId: string) => {
        set({ isLoading: true });

        try {
          console.log("🎯 Initializing achievement store...");

          // Initialize the achievement engine
          await achievementEngine.initialize();

          // Get all achievements
          const achievements = achievementEngine.getAllAchievements();

          // Get user's progress from local engine
          const userProgress =
            achievementEngine.getUserAchievementProgress(userId);

          // Get user stats
          const stats = achievementEngine.getUserAchievementStats(userId);

          // PERF-006 FIX: Remove existing listener before adding new one to prevent memory leaks
          if (achievementListenerAttached) {
            achievementEngine.removeAllListeners?.("achievementUnlocked");
            achievementListenerAttached = false;
          }

          // Set up achievement unlocked listener
          achievementEngine.on(
            "achievementUnlocked",
            (achievement: Achievement, userAchievement: UserAchievement) => {
              const state = get();

              // Add to unlocked today
              const newUnlockedToday = [
                ...state.unlockedToday,
                userAchievement,
              ];

              // Show celebration if not shown yet
              if (!userAchievement.celebrationShown) {
                set({
                  showCelebration: true,
                  celebrationAchievement: achievement,
                  unlockedToday: newUnlockedToday,
                });
              }

              console.log(`🏆 Achievement unlocked: ${achievement.title}`);

              // Sync newly unlocked achievement to Supabase
              achievementDataService.saveUserAchievement(
                userId,
                userAchievement,
              );
            },
          );

          achievementListenerAttached = true;

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

          // Load and merge achievements from Supabase (for returning users)
          // This runs async after local init to not block the UI
          get().loadFromSupabase(userId);
        } catch (error) {
          console.error("❌ Error initializing achievement store:", error);
          set({ isLoading: false });
        }
      },

      // Check user progress and unlock achievements
      checkProgress: async (
        userId: string,
        activityData: Record<string, any>,
      ) => {
        try {
          const newlyUnlocked = await achievementEngine.checkAchievements(
            userId,
            activityData,
          );

          if (newlyUnlocked.length > 0) {
            const state = get();

            // Update user achievements
            const updatedProgress =
              achievementEngine.getUserAchievementProgress(userId);
            const stats = achievementEngine.getUserAchievementStats(userId);

            set({
              userAchievements: updatedProgress,
              totalFitCoinsEarned: stats.totalFitCoinsEarned,
              completionRate: stats.completionRate,
              unlockedToday: [...state.unlockedToday, ...newlyUnlocked],
            });

            console.log(
              `🎉 ${newlyUnlocked.length} new achievements unlocked!`,
            );
          }
        } catch (error) {
          console.error("❌ Error checking achievement progress:", error);
        }
      },

      // Mark celebration as shown
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

      // Show achievement celebration
      showAchievementCelebration: (achievement: Achievement) => {
        set({
          showCelebration: true,
          celebrationAchievement: achievement,
        });
      },

      // Hide celebration modal
      hideCelebration: () => {
        set({
          showCelebration: false,
          celebrationAchievement: null,
        });
      },

      // Get achievements by category
      getAchievementsByCategory: (category: AchievementCategory) => {
        return achievementEngine.getAchievementsByCategory(category);
      },

      // Get user's progress
      getUserProgress: (userId: string) => {
        const state = get();
        return Array.from(state.userAchievements.values()).filter(
          (ua) => ua.userId === userId,
        );
      },

      // Get completed achievements
      getCompletedAchievements: (userId: string) => {
        return achievementEngine.getUserCompletedAchievements(userId);
      },

      // Get achievement statistics
      getAchievementStats: (userId: string) => {
        return achievementEngine.getUserAchievementStats(userId);
      },

      // Home screen integration methods
      getRecentAchievements: (count: number = 3) => {
        const state = get();
        return Array.from(state.userAchievements.values())
          .filter((ua) => ua.isCompleted)
          .sort(
            (a, b) => {
              // Bug 6 fix: guard against undefined unlockedAt causing NaN comparisons
              const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
              const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
              return timeB - timeA;
            },
          )
          .slice(0, count)
          .map((ua) => {
            const achievement = state.achievements.find(
              (a) => a.id === ua.achievementId,
            );
            return {
              id: ua.achievementId,
              title: achievement?.title || "Achievement",
              icon: achievement?.icon || "🏆",
              category: achievement?.category || "General",
              completedAt: ua.unlockedAt,
            };
          });
      },

      getNearlyCompletedAchievements: (count: number = 2) => {
        const state = get();
        return Array.from(state.userAchievements.values())
          .filter((ua) => !ua.isCompleted && ua.progress > 0)
          .sort((a, b) => b.progress - a.progress)
          .slice(0, count)
          .map((ua) => {
            const achievement = state.achievements.find(
              (a) => a.id === ua.achievementId,
            );
            return {
              id: ua.achievementId,
              title: achievement?.title || "Achievement",
              description:
                achievement?.description || "Complete this achievement",
              icon: achievement?.icon || "🎯",
              category: achievement?.category || "General",
              progress: Math.round(ua.progress * 100),
              currentValue: ua.progress,
              targetValue: ua.maxProgress || 1,
            };
          });
      },

      getDailyProgress: () => {
        const state = get();
        const today = new Date().toDateString();

        const todayProgress = Array.from(
          state.userAchievements.values(),
        ).filter((ua) => {
          // Bug 7 fix: guard against undefined unlockedAt causing throws
          if (!ua.unlockedAt) return false;
          const lastUpdate = new Date(ua.unlockedAt).toDateString();
          return lastUpdate === today;
        });

        return {
          achievementsWorkedOn: todayProgress.length,
          achievementsCompleted: todayProgress.filter((ua) => ua.isCompleted)
            .length,
          totalProgress:
            todayProgress.reduce((sum, ua) => sum + ua.progress, 0) /
            Math.max(todayProgress.length, 1),
        };
      },

      getTotalBadgesEarned: () => {
        const state = get();
        return Array.from(state.userAchievements.values()).filter(
          (ua) => ua.isCompleted,
        ).length;
      },

      getTopCategories: () => {
        const state = get();
        const categoryStats: Record<string, number> = {};

        Array.from(state.userAchievements.values())
          .filter((ua) => ua.isCompleted)
          .forEach((ua) => {
            const achievement = state.achievements.find(
              (a) => a.id === ua.achievementId,
            );
            const category = achievement?.category || "General";
            categoryStats[category] = (categoryStats[category] || 0) + 1;
          });

        return Object.entries(categoryStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([category, count]) => ({ category, count }));
      },

      // Sync achievements to Supabase for cloud persistence
      syncWithSupabase: async (userId: string) => {
        try {
          const state = get();
          console.log("☁️ Syncing achievements to Supabase...");

          const result = await achievementDataService.saveAllAchievements(
            userId,
            state.userAchievements,
          );

          if (result.success) {
            console.log(`✅ Synced ${result.synced} achievements to Supabase`);
          } else {
            console.warn(
              `⚠️ Achievement sync had errors: ${result.errors.join(", ")}`,
            );
          }
        } catch (error) {
          console.error("❌ Failed to sync achievements to Supabase:", error);
        }
      },

      // Load achievements from Supabase (for returning users)
      loadFromSupabase: async (userId: string) => {
        try {
          console.log("☁️ Loading achievements from Supabase...");

          const cloudAchievements =
            await achievementDataService.loadUserAchievements(userId);

          if (cloudAchievements.size > 0) {
            const state = get();

            // Merge cloud achievements with local (cloud takes precedence for completed)
            const mergedAchievements = new Map(state.userAchievements);

            cloudAchievements.forEach((cloudAchievement, key) => {
              const localAchievement = mergedAchievements.get(key);

              // Use cloud if completed or has more progress
              if (
                !localAchievement ||
                cloudAchievement.isCompleted ||
                cloudAchievement.progress > (localAchievement.progress || 0)
              ) {
                mergedAchievements.set(key, cloudAchievement);
              }
            });

            // Calculate stats from merged achievements
            const completed = Array.from(mergedAchievements.values()).filter(
              (a) => a.isCompleted,
            );
            const totalFitCoins = completed.reduce(
              (sum, a) => sum + (a.fitCoinsEarned || 0),
              0,
            );
            const completionRate =
              // Bug 8 fix: divide by total achievements count, not just user-tracked ones
              state.achievements.length > 0
                ? (completed.length / state.achievements.length) * 100
                : 0;

            set({
              userAchievements: mergedAchievements,
              totalFitCoinsEarned: totalFitCoins,
              completionRate,
            });

            console.log(
              `✅ Loaded and merged ${cloudAchievements.size} achievements from Supabase`,
            );
          }
        } catch (error) {
          console.error("❌ Failed to load achievements from Supabase:", error);
        }
      },

      // Reset store to initial state (for logout)
      reset: () => {
        // Bug 5 fix: cleanup achievement engine listeners on reset
        if (typeof achievementEngine !== 'undefined' && achievementEngine.removeAllListeners) {
          achievementEngine.removeAllListeners();
        }
        achievementListenerAttached = false;

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
    })),
    {
      name: "achievement-storage",
      storage: achievementStorage as any,
      partialize: (state) => ({
        // Persist critical state - userAchievements handled by custom storage
        userAchievements: state.userAchievements,
        totalFitCoinsEarned: state.totalFitCoinsEarned,
        completionRate: state.completionRate,
        currentStreak: state.currentStreak,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);

// Achievement activity tracking helpers
export const trackAchievementActivity = {
  // Fitness Activities
  workoutCompleted: (userId: string, workoutData: any) => {
    const activityData = {
      totalWorkouts: (workoutData.totalWorkouts || 0) + 1,
      totalCalories: workoutData.caloriesBurned || 0,
      workoutType: workoutData.type,
      workoutDuration: workoutData.duration,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  // Nutrition Activities
  mealLogged: (userId: string, mealData: any) => {
    const activityData = {
      nutritionLogs: (mealData.totalLogs || 0) + 1,
      caloriesConsumed: mealData.calories || 0,
      macros: {
        protein: mealData.protein || 0,
        carbs: mealData.carbs || 0,
        fat: mealData.fat || 0,
      },
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  // Water Activities
  waterGoalHit: (userId: string, waterData: any) => {
    const activityData = {
      waterGoalsHit: (waterData.goalsHit || 0) + 1,
      waterIntake: waterData.amount || 0,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  // Consistency Activities
  dailyUsage: (userId: string, usageData: any) => {
    const activityData = {
      consistentDays: usageData.consecutiveDays || 0,
      dailyGoalsHit: usageData.goalsCompleted || 0,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  // Social Activities
  socialInteraction: (userId: string, socialData: any) => {
    const activityData = {
      friendsCount: socialData.friendsCount || 0,
      kudosGiven: socialData.kudosGiven || 0,
      kudosReceived: socialData.kudosReceived || 0,
      challengesWon: socialData.challengesWon || 0,
    };

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  // Custom activity tracker
  customActivity: (userId: string, activityData: Record<string, any>) => {
    useAchievementStore.getState().checkProgress(userId, activityData);
  },
};

export default useAchievementStore;
