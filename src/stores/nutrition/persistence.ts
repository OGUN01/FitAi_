import { Platform } from "react-native";
import { SyncStatus } from "../../types/localData";
import { crudOperations } from "../../services/crudOperations";
import { supabase } from "../../services/supabase";
import { getCurrentUserId } from "../../services/authUtils";
import { NutritionState } from "./types";
import { toMealType, createLoggedFood } from "./helpers";

export const createPersistenceActions = (
  set: any,
  get: () => NutritionState,
) => ({
  loadWeeklyMealPlan: async () => {
    try {
      // Do NOT return early if a plan already exists in the store.
      // A guest-generated plan must not block loading the real Supabase plan after login.
      try {
        const userId = getCurrentUserId();
        if (userId) {
          console.log("🔄 Loading weekly meal plan from database...");
          const { data: weeklyMealPlans, error } = await supabase
            .from("weekly_meal_plans")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!error && weeklyMealPlans && weeklyMealPlans.length > 0) {
            const latestPlan = weeklyMealPlans[0];

            const planData = latestPlan.plan_data;
            if (planData && planData.meals) {
              set({
                weeklyMealPlan: {
                  ...planData,
                  databaseId: latestPlan.id,
                },
              });
            }
          } else {
            console.log("📋 No weekly meal plan found in database");
          }
        }
      } catch (dbError) {
        console.warn(
          "⚠️ Failed to load from database, trying individual meal logs:",
          dbError,
        );
      }

      const mealLogs = await crudOperations.readMealLogs();
      if (mealLogs.length > 0) {
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to load meal plan:", error);
      return null;
    }
  },

  persistData: async () => {
    try {
      const state = get();

      if (state.weeklyMealPlan) {
        await get().saveWeeklyMealPlan(state.weeklyMealPlan);
      }

      for (const meal of state.dailyMeals) {
        const mealId = meal.id || String(Date.now());
        const mealItems = meal.items || [];
        const mealLog: import("../../types/localData").MealLog = {
          id: `daily_meal_${mealId}`,
          mealType: toMealType(meal.type),
          foods: mealItems.map((item, index) =>
            createLoggedFood(item, mealId, index),
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
      }
    } catch (error) {
      console.error("❌ Failed to persist nutrition data:", error);
    }
  },

  loadData: async () => {
    try {
      const currentMealProgress = get().mealProgress;

      const plan = await get().loadWeeklyMealPlan();
      if (plan) {
        set((state: NutritionState) => ({
          weeklyMealPlan: plan,
          mealProgress: { ...currentMealProgress },
        }));
      }

      const mealLogs = await crudOperations.readMealLogs(
        new Date().toISOString().split("T")[0],
      );
    } catch (error) {
      console.error("❌ Failed to load nutrition data:", error);
    }
  },

  clearData: () => {
    set({
      weeklyMealPlan: null,
      mealProgress: {},
      dailyMeals: [],
      currentMealSession: null,
      planError: null,
      mealError: null,
    });
  },
});
