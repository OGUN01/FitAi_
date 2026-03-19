import { Platform } from "react-native";
import * as crypto from "expo-crypto";
import { WeeklyMealPlan, DayMeal } from "../../ai";
import { SyncStatus } from "../../types/localData";
import { crudOperations } from "../../services/crudOperations";
import { offlineService } from "../../services/offline";
import { generateUUID, isValidUUID } from "../../utils/uuid";
import { getCurrentUserId, getUserIdOrGuest } from "../../services/authUtils";
import { NutritionState } from "./types";
import { toMealType, createLoggedFood } from "./helpers";

export const createMealPlanActions = (set: any, get: () => NutritionState) => ({
  setWeeklyMealPlan: (plan: WeeklyMealPlan | null) => {
    set({ weeklyMealPlan: plan });
  },

  saveWeeklyMealPlan: async (plan: WeeklyMealPlan) => {
    try {
      const planTitle = plan.planTitle || `Week ${plan.weekNumber} Meal Plan`;

      set({ weeklyMealPlan: plan });

      if (!plan.meals || plan.meals.length === 0) {
        return;
      }

      const timestamp = Date.now();
      const mealLogPromises = plan.meals
        .filter((meal) => meal.id && meal.name)
        .map(async (meal) => {
          try {
            const mealLog: import("../../types/localData").MealLog = {
              id: `meal_${meal.id}_${timestamp}_${crypto.randomUUID().replace(/-/g, "").substring(0, 5)}`,
              mealType: toMealType(meal.type),
              foods: (meal.items || []).map(
                (item: import("../../ai").MealItem, index: number) =>
                  createLoggedFood(item, meal.id, index),
              ),
              totalCalories: meal.totalCalories || 0,
              totalMacros: {
                protein: meal.totalMacros?.protein ?? 0,
                carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
                fat: meal.totalMacros?.fat ?? 0,
                fiber: meal.totalMacros?.fiber ?? 0,
              },
              loggedAt: new Date().toISOString(),
              photos: [],
              syncStatus: SyncStatus.PENDING,
              syncMetadata: {
                lastSyncedAt: undefined,
                lastModifiedAt: new Date().toISOString(),
                syncVersion: 1,
                deviceId: Platform.OS ?? "unknown",
              },
            };

            await crudOperations.createMealLog(mealLog);
            return { success: true, meal: meal.name };
          } catch (mealError) {
            console.error(`❌ Failed to save meal ${meal.name}:`, mealError);
            return { success: false, meal: meal.name, error: mealError };
          }
        });

      const results = await Promise.all(mealLogPromises);
      const savedCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (errorCount > 0 && savedCount === 0) {
        throw new Error(`Failed to save any meals (${errorCount} errors)`);
      }
    } catch (error) {
      console.error("❌ Failed to save meal plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save meal plan";
      set({ planError: errorMessage });

      if (!get().weeklyMealPlan) {
        throw error;
      }
    }

    try {
      await offlineService.clearFailedActionsForTable("weekly_meal_plans");

      const userId = getCurrentUserId();
      const planId = generateUUID();

      if (!userId) {
        console.error("❌ No authenticated user - cannot save to database");
        throw new Error("User must be authenticated to save meal plans");
      }

      if (!isValidUUID(userId)) {
        console.error("❌ Invalid user UUID format:", userId);
        throw new Error("Invalid user UUID format");
      }
      if (!isValidUUID(planId)) {
        console.error("❌ Invalid plan UUID format:", planId);
        throw new Error("Invalid plan UUID format");
      }

      const weeklyMealPlanData = {
        id: planId,
        user_id: userId,
        plan_title: plan.planTitle || `Week ${plan.weekNumber} Plan`,
        plan_description:
          plan.planDescription || `${plan.meals.length} meals planned`,
        week_number: plan.weekNumber || 1,
        total_meals: plan.meals.length,
        total_calories:
          plan.totalEstimatedCalories ||
          plan.meals.reduce(
            (sum: number, meal: DayMeal) => sum + (meal.totalCalories || 0),
            0,
          ),
        plan_data: plan,
        is_active: true,
      };

      await offlineService.queueAction({
        type: "CREATE",
        table: "weekly_meal_plans",
        data: weeklyMealPlanData,
        userId: getUserIdOrGuest(),
        maxRetries: 3,
      });
    } catch (weeklyMealPlanError) {
      console.error(
        "❌ Failed to save weekly meal plan to database:",
        weeklyMealPlanError,
      );
      const errorMessage =
        weeklyMealPlanError instanceof Error
          ? weeklyMealPlanError.message
          : "Failed to save meal plan to database";
      set({ planError: errorMessage });
    }
  },

  setGeneratingPlan: (isGenerating: boolean) => {
    set({ isGeneratingPlan: isGenerating });
  },

  setPlanError: (error: string | null) => {
    set({ planError: error });
  },

  addDailyMeal: (meal: import("../../ai").Meal) => {
    set((state: NutritionState) => ({
      dailyMeals: [meal, ...state.dailyMeals],
    }));
  },

  setDailyMeals: (meals: import("../../ai").Meal[]) => {
    set({ dailyMeals: meals });
  },

  setGeneratingMeal: (isGenerating: boolean) => {
    set({ isGeneratingMeal: isGenerating });
  },

  setMealError: (error: string | null) => {
    set({ mealError: error });
  },
});

export const createMealProgressActions = (
  set: any,
  get: () => NutritionState,
) => ({
  updateMealProgress: (mealId: string, progress: number) => {
    set((state: NutritionState) => ({
      mealProgress: {
        ...state.mealProgress,
        [mealId]: {
          ...state.mealProgress[mealId],
          mealId,
          progress,
        },
      },
    }));
  },

  completeMeal: async (mealId: string, logId?: string) => {
    const completedAt = new Date().toISOString();

    try {
      if (logId) {
        const existingLog = await crudOperations.readMealLog(logId);
        const updatedNotes = (existingLog?.notes || "") + " [COMPLETED]";

        await crudOperations.updateMealLog(logId, {
          notes: updatedNotes,
          syncMetadata: {
            lastModifiedAt: completedAt,
            syncVersion: (existingLog?.syncMetadata?.syncVersion || 0) + 1,
            deviceId: Platform.OS ?? "unknown",
          },
        });
      }

      set((state: NutritionState) => {
        const newProgress = {
          ...state.mealProgress,
          [mealId]: {
            ...state.mealProgress[mealId],
            mealId,
            progress: 100,
            completedAt,
            logId,
          },
        };

        return {
          mealProgress: newProgress,
        };
      });
    } catch (error) {
      console.error(`❌ Failed to complete meal ${mealId}:`, error);

      await offlineService.queueAction({
        type: "UPDATE",
        table: "meal_logs",
        data: {
          id: logId,
          notes: "[COMPLETED]",
        },
        userId: getUserIdOrGuest(),
        maxRetries: 3,
      });

      set((state: NutritionState) => ({
        mealProgress: {
          ...state.mealProgress,
          [mealId]: {
            ...state.mealProgress[mealId],
            mealId,
            progress: 100,
            completedAt,
            logId,
          },
        },
      }));
    }
  },

  getMealProgress: (mealId: string) => {
    return get().mealProgress[mealId] || null;
  },
});
