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
import { resolveCurrentWeightFromStores } from "../services/currentWeight";
import { CompletedSession } from "./fitness/types";
import { getLocalDateString } from "../utils/weekUtils";

// PERF-006 FIX: Track listener to prevent memory leaks
let achievementListenerAttached = false;
let achievementInitializationPromise: Promise<void> | null = null;
let initializedAchievementUserId: string | null = null;

const normalizeWorkoutType = (value?: string | null): string => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("strength")) return "strength";
  if (normalized.includes("cardio")) return "cardio";
  if (normalized.includes("hiit")) return "hiit";
  if (
    normalized.includes("flex") ||
    normalized.includes("yoga") ||
    normalized.includes("mobility")
  ) {
    return "flexibility";
  }

  return normalized || "mixed";
};

const isWeightGoalAchieved = (
  currentWeight?: number | null,
  targetWeight?: number | null,
): boolean => {
  if (!currentWeight || !targetWeight) {
    return false;
  }

  if (currentWeight === targetWeight) {
    return true;
  }

  return targetWeight < currentWeight
    ? currentWeight <= targetWeight
    : currentWeight >= targetWeight;
};

const buildAchievementActivityData = ({
  completedSessions,
  mealProgress,
  dailyMeals,
  hydrationState,
  healthMetrics,
  currentStreak,
  bodyAnalysis,
}: {
  completedSessions: CompletedSession[];
  mealProgress: Record<string, any>;
  dailyMeals: any[];
  hydrationState: {
    dailyGoalML: number | null;
    waterIntakeML: number;
  };
  healthMetrics?: {
    steps?: number;
    sleepHours?: number;
  };
  currentStreak: number;
  bodyAnalysis?: {
    current_weight_kg?: number | null;
    target_weight_kg?: number | null;
  } | null;
}) => {
  const workoutTypeCounts: Record<string, number> = {};
  const completedWorkoutDays = new Set<string>();
  const uniqueWorkoutTypes = new Set<string>();

  let totalCalories = 0;
  let workoutsBefore8am = 0;
  let workoutsBefore6am = 0;
  let workoutsAfter10pm = 0;
  let weekendWorkouts = 0;
  let quickWorkouts = 0;
  let longWorkouts = 0;

  completedSessions.forEach((session) => {
    totalCalories += session.caloriesBurned || 0;

    const workoutType = normalizeWorkoutType(session.workoutSnapshot?.category);
    workoutTypeCounts[workoutType] = (workoutTypeCounts[workoutType] || 0) + 1;
    uniqueWorkoutTypes.add(workoutType);

    const completedAt = new Date(session.completedAt);
    const hour = completedAt.getHours();
    const day = completedAt.getDay();

    completedWorkoutDays.add(getLocalDateString(session.completedAt));

    if (hour < 8) workoutsBefore8am++;
    if (hour < 6) workoutsBefore6am++;
    if (hour >= 22) workoutsAfter10pm++;
    if (day === 0 || day === 6) weekendWorkouts++;
    if ((session.durationMinutes || 0) < 20) quickWorkouts++;
    if ((session.durationMinutes || 0) > 60) longWorkouts++;
  });

  const completedMealDates = new Set<string>();
  const completedMealProgress = Object.values(mealProgress || {}).filter(
    (progress: any) => progress?.progress === 100,
  );

  completedMealProgress.forEach((progress: any) => {
    if (progress?.completedAt) {
      completedMealDates.add(getLocalDateString(progress.completedAt));
    }
  });

  const nutritionLogs = Math.max(
    completedMealProgress.length,
    dailyMeals.length,
  );
  const activeDays = new Set([...completedWorkoutDays, ...completedMealDates])
    .size;
  const waterGoalsHit =
    hydrationState.dailyGoalML &&
    hydrationState.waterIntakeML >= hydrationState.dailyGoalML
      ? 1
      : 0;

  return {
    totalWorkouts: completedSessions.length,
    totalCalories,
    nutritionLogs,
    waterGoalsHit,
    consistentDays: currentStreak,
    workoutStreak: currentStreak,
    currentStreak,
    workoutTypeCounts,
    workoutsBefore8am,
    workoutsBefore6am,
    workoutsAfter10pm,
    weekendWorkouts,
    quickWorkouts,
    longWorkouts,
    perfectWorkouts: completedSessions.length,
    uniqueWorkoutTypes: uniqueWorkoutTypes.size,
    activeDays,
    steps: healthMetrics?.steps || 0,
    sleepHours: healthMetrics?.sleepHours || 0,
    weightGoalAchieved: isWeightGoalAchieved(
      resolveCurrentWeightFromStores({
        bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
      }).value,
      bodyAnalysis?.target_weight_kg,
    ),
  };
};

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
  reconcileWithCurrentData: (userId: string) => Promise<void>;

  // SSOT Fix 19: streak updater — called after every session completion
  // and on hydration so currentStreak is always the real live value.
  updateCurrentStreak: () => void;
  updateCurrentStreakFromCount: (count: number) => void;

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
        console.warn(
          `⚠️ [achievementStorage] Corrupt data for key "${name}", clearing`,
        );
        await AsyncStorage.removeItem(name);
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ [achievementStorage] Failed to read "${name}":`, e);
      return null;
    }
  },
  setItem: async (name: string, value: string | any): Promise<void> => {
    try {
      // Zustand persist may call setItem with the state object directly (not a string)
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      // Bug 9 fix: after JSON round-trip, Map becomes a plain object.
      // Check for object with entries instead of instanceof Map.
      const userAchievements = parsed.state?.userAchievements;
      if (
        userAchievements &&
        typeof userAchievements === "object" &&
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
        await AsyncStorage.setItem(
          name,
          typeof value === "string" ? value : JSON.stringify(value),
        );
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
        const state = get();
        if (
          state.isInitialized &&
          initializedAchievementUserId === userId &&
          state.achievements.length > 0
        ) {
          return;
        }

        if (
          achievementInitializationPromise &&
          initializedAchievementUserId === userId
        ) {
          return achievementInitializationPromise;
        }

        set({ isLoading: true });
        initializedAchievementUserId = userId;

        achievementInitializationPromise = (async () => {
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

            // SSOT Fix 19: seed currentStreak immediately from live completedSessions
            get().updateCurrentStreak();
            await get().reconcileWithCurrentData(userId);

            console.log(
              `✅ Achievement store initialized with ${achievements.length} achievements`,
            );

            // Load and merge achievements from Supabase (for returning users)
            // This runs async after local init to not block the UI
            get().loadFromSupabase(userId);
          } catch (error) {
            console.error("❌ Error initializing achievement store:", error);
            set({ isLoading: false });
          } finally {
            achievementInitializationPromise = null;
          }
        })();

        return achievementInitializationPromise;
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

          {
            const state = get();

            // Update user achievements
            const updatedProgress =
              achievementEngine.getUserAchievementProgress(userId);
            const stats = achievementEngine.getUserAchievementStats(userId);

            set({
              userAchievements: updatedProgress,
              totalFitCoinsEarned: stats.totalFitCoinsEarned,
              completionRate: stats.completionRate,
              unlockedToday:
                newlyUnlocked.length > 0
                  ? [...state.unlockedToday, ...newlyUnlocked]
                  : state.unlockedToday,
            });

            if (newlyUnlocked.length > 0)
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
          .sort((a, b) => {
            // Bug 6 fix: guard against undefined unlockedAt causing NaN comparisons
            const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
            const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
            return timeB - timeA;
          })
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
              progress: Math.round(
                (ua.progress / Math.max(ua.maxProgress || 1, 1)) * 100,
              ),
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

      // SSOT Fix 19: compute currentStreak reactively from fitnessStore.completedSessions.
      // This is the ONLY place streak is written so there is exactly one source of truth.
      // The streak counts consecutive calendar days (from today backward) that have at
      // least one completed session (planned OR extra).
      updateCurrentStreak: () => {
        // Lazy import avoids circular dependency (achievementStore ↔ fitnessStore)
        const fitnessModule = require("./fitnessStore");
        const sessions: CompletedSession[] =
          fitnessModule.useFitnessStore.getState().completedSessions;

        if (!sessions || sessions.length === 0) {
          set({ currentStreak: 0 });
          return;
        }

        // Build a set of unique LOCAL date strings (YYYY-MM-DD) for all completed sessions.
        // Must use getLocalDateString (not toISOString) to avoid timezone mismatches
        // where UTC date differs from the user's local date.
        const completedDates = new Set<string>();
        sessions
          .filter((s) => s.completedAt)
          .forEach((s) => {
            completedDates.add(getLocalDateString(s.completedAt!));
          });

        // Walk backward from today counting consecutive days
        let streak = 0;
        const checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        while (true) {
          const dateStr = getLocalDateString(checkDate);
          if (completedDates.has(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        set({ currentStreak: streak });
      },

      // Convenience setter — used to bootstrap from analyticsStore summary on first launch
      updateCurrentStreakFromCount: (count: number) => {
        // Only apply if our computed streak is still 0 (not yet computed from sessions)
        const current = useAchievementStore.getState().currentStreak;
        if (current === 0 && count > 0) {
          set({ currentStreak: count });
        }
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

      reconcileWithCurrentData: async (userId: string) => {
        if (!userId) {
          return;
        }

        try {
          const fitnessModule = require("./fitnessStore");
          const nutritionModule = require("./nutritionStore");
          const hydrationModule = require("./hydrationStore");
          const healthModule = require("./healthDataStore");
          const profileModule = require("./profileStore");
          const analyticsModule = require("./analyticsStore");

          const completedSessions: CompletedSession[] =
            fitnessModule.useFitnessStore.getState().completedSessions || [];
          const nutritionState = nutritionModule.useNutritionStore.getState();
          const hydrationState = hydrationModule.useHydrationStore.getState();
          const healthState = healthModule.useHealthDataStore.getState();
          const bodyAnalysis =
            profileModule.useProfileStore.getState().bodyAnalysis;
          const weightHistory =
            analyticsModule.useAnalyticsStore.getState().weightHistory || [];
          const completedMeals = Object.values(
            nutritionState.mealProgress || {},
          ).filter((progress: any) => progress?.completedAt);

          // Derive as much progress as possible from persisted workout + meal history
          // so the achievement engine reflects real user data instead of only live events.
          const activeDays = new Set<string>();
          completedSessions
            .filter((session) => session.completedAt)
            .forEach((session) => {
              activeDays.add(getLocalDateString(session.completedAt));
            });
          completedMeals.forEach((progress: any) => {
            activeDays.add(getLocalDateString(progress.completedAt));
          });

          const workoutTypeCounts = completedSessions.reduce(
            (counts: Record<string, number>, session) => {
              const category = session.workoutSnapshot?.category?.toLowerCase();
              if (category) {
                counts[category] = (counts[category] || 0) + 1;
              }
              return counts;
            },
            {},
          );
          const weekendWorkouts = completedSessions.filter((session) => {
            const day = new Date(session.completedAt).getDay();
            return day === 0 || day === 6;
          }).length;
          const workoutsBefore8am = completedSessions.filter(
            (session) => new Date(session.completedAt).getHours() < 8,
          ).length;
          const workoutsBefore6am = completedSessions.filter(
            (session) => new Date(session.completedAt).getHours() < 6,
          ).length;
          const workoutsAfter10pm = completedSessions.filter(
            (session) => new Date(session.completedAt).getHours() >= 22,
          ).length;
          const quickWorkouts = completedSessions.filter((session) => {
            const duration =
              session.durationMinutes || session.workoutSnapshot?.duration || 0;
            return duration > 0 && duration < 20;
          }).length;
          const longWorkouts = completedSessions.filter((session) => {
            const duration =
              session.durationMinutes || session.workoutSnapshot?.duration || 0;
            return duration > 60;
          }).length;

          const totalWorkouts = completedSessions.length;
          const totalCalories = completedSessions.reduce(
            (sum, session) => sum + (session.caloriesBurned || 0),
            0,
          );
          const nutritionLogs = Math.max(
            Object.values(nutritionState.mealProgress || {}).filter(
              (progress: any) => progress?.progress === 100,
            ).length,
            (nutritionState.dailyMeals || []).length,
          );
          const waterGoalsHit =
            hydrationState.dailyGoalML &&
            hydrationState.waterIntakeML >= hydrationState.dailyGoalML
              ? 1
              : 0;
          const consistentDays = useAchievementStore.getState().currentStreak;
          const currentWeight = resolveCurrentWeightFromStores({
            bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
          }).value;
          const targetWeight = bodyAnalysis?.target_weight_kg;
          const baselineWeight = weightHistory[0]?.weight ?? currentWeight;
          const weightGoalAchieved =
            typeof currentWeight === "number" &&
            typeof targetWeight === "number" &&
            typeof baselineWeight === "number"
              ? Math.abs(currentWeight - targetWeight) <= 0.25 ||
                (baselineWeight > targetWeight
                  ? currentWeight <= targetWeight
                  : baselineWeight < targetWeight
                    ? currentWeight >= targetWeight
                    : false)
              : false;

          await achievementEngine.checkAchievements(userId, {
            totalWorkouts,
            totalCalories,
            nutritionLogs,
            waterGoalsHit,
            consistentDays,
            currentStreak: consistentDays,
            activeDays: activeDays.size,
            completedWorkouts: totalWorkouts,
            workoutTypeCounts,
            weekendWorkouts,
            workoutsBefore8am,
            workoutsBefore6am,
            workoutsAfter10pm,
            quickWorkouts,
            longWorkouts,
            perfectWorkouts: totalWorkouts,
            uniqueWorkoutTypes: Object.keys(workoutTypeCounts).length,
            weightGoalAchieved,
            steps: healthState.metrics?.steps || 0,
            sleepHours: healthState.metrics?.sleepHours || 0,
          });

          const updatedProgress =
            achievementEngine.getUserAchievementProgress(userId);
          const stats = achievementEngine.getUserAchievementStats(userId);

          set({
            userAchievements: updatedProgress,
            totalFitCoinsEarned: stats.totalFitCoinsEarned,
            completionRate: stats.completionRate,
          });
        } catch (error) {
          console.error("❌ Failed to reconcile achievement data:", error);
        }
      },

      // Reset store to initial state (for logout)
      reset: () => {
        // Bug 5 fix: cleanup achievement engine listeners on reset
        if (
          typeof achievementEngine !== "undefined" &&
          achievementEngine.removeAllListeners
        ) {
          achievementEngine.removeAllListeners();
        }
        achievementListenerAttached = false;
        achievementInitializationPromise = null;
        initializedAchievementUserId = null;

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
    const fitnessModule = require("./fitnessStore");
    const nutritionModule = require("./nutritionStore");
    const hydrationModule = require("./hydrationStore");
    const healthModule = require("./healthDataStore");
    const profileModule = require("./profileStore");
    const completedSessions: CompletedSession[] =
      fitnessModule.useFitnessStore.getState().completedSessions || [];
    const nutritionState = nutritionModule.useNutritionStore.getState();
    const hydrationState = hydrationModule.useHydrationStore.getState();
    const healthState = healthModule.useHealthDataStore.getState();
    const bodyAnalysis = profileModule.useProfileStore.getState().bodyAnalysis;
    const now = new Date();
    const projectedDuration = workoutData.duration || 0;
    const projectedSession: CompletedSession = {
      sessionId: "pending-achievement-check",
      type: "planned",
      workoutId: workoutData.workoutId || "pending-workout",
      workoutSnapshot: {
        title: workoutData.workoutTitle || "Workout",
        category: workoutData.workoutType || workoutData.type || "mixed",
        duration: projectedDuration,
        exercises: [],
      },
      caloriesBurned: workoutData.caloriesBurned || 0,
      durationMinutes: projectedDuration,
      completedAt: now.toISOString(),
      weekStart: "",
    };
    const activityData = buildAchievementActivityData({
      completedSessions: [...completedSessions, projectedSession],
      mealProgress: nutritionState.mealProgress || {},
      dailyMeals: nutritionState.dailyMeals || [],
      hydrationState,
      healthMetrics: healthState.metrics,
      currentStreak: useAchievementStore.getState().currentStreak,
      bodyAnalysis,
    });

    useAchievementStore.getState().checkProgress(userId, activityData);
  },

  // Nutrition Activities
  mealLogged: (userId: string, mealData: any) => {
    const nutritionModule = require("./nutritionStore");
    const nutritionState = nutritionModule.useNutritionStore.getState();
    const completedMeals = Object.values(
      nutritionState.mealProgress || {},
    ).filter((progress: any) => progress?.progress === 100).length;
    const activityData = {
      nutritionLogs: Math.max(
        (mealData.totalLogs || 0) + 1,
        completedMeals + 1,
      ),
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
