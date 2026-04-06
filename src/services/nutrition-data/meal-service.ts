import { Platform } from "react-native";
import { supabase } from "../supabase";
import { offlineService } from "../offline";
import { crudOperations } from "../crudOperations";
import { analyticsDataService } from "../analyticsData";
import { MealLog, SyncStatus } from "../../types/localData";
import { generateUUID } from "../../utils/uuid";
import { Meal, NutritionDataResponse } from "./types";
import { FoodService } from "./food-service";
import {
  deriveMealLogFiber,
  normalizeMealLogFoodItems,
} from "../../utils/mealLogNutrition";

export class MealService {
  private foodService: FoodService;

  constructor(foodService: FoodService) {
    this.foodService = foodService;
  }

  async getUserMeals(
    userId: string,
    date?: string,
    limit?: number,
  ): Promise<NutritionDataResponse<Meal[]>> {
    try {
      let query = supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false });

      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        query = query
          .gte("logged_at", startDate.toISOString())
          .lte("logged_at", endDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching meal_logs:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      const meals =
        data?.map((mealLog: any) => {
          const foodItems = normalizeMealLogFoodItems(mealLog.food_items);
          return {
            id: mealLog.id,
            type: mealLog.meal_type,
            name: mealLog.meal_name,
            total_calories: mealLog.total_calories || 0,
            total_protein: mealLog.total_protein || 0,
            total_carbohydrates: mealLog.total_carbohydrates || 0,
            total_carbs: mealLog.total_carbohydrates || 0,
            total_fat: mealLog.total_fat || 0,
            total_fiber: deriveMealLogFiber(foodItems),
            consumed_at: mealLog.logged_at,
            logged_at: mealLog.logged_at,
            food_items: foodItems,
            foods: [],
          };
        }) || [];

      return {
        success: true,
        data: meals as any,
      };
    } catch (error) {
      console.error("Error in getUserMeals:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch user meals",
      };
    }
  }

  async logMeal(
    userId: string,
    mealData: {
      name: string;
      type: "breakfast" | "lunch" | "dinner" | "snack";
      foods: {
        food_id: string;
        quantity_grams: number;
      }[];
    },
  ): Promise<NutritionDataResponse<Meal>> {
    try {
      const nutritionTotals = await this.foodService.calculateNutrition(
        mealData.foods,
      );

      const mealLog: MealLog = {
        id: generateUUID(),
        userId,
        mealType: mealData.type,
        foods: mealData.foods.map((f) => ({
          id: `${f.food_id}_${Date.now()}`,
          foodId: f.food_id,
          quantity: f.quantity_grams,
          unit: "grams",
          macros: undefined,
        })),
        totalCalories: nutritionTotals.calories,
        totalMacros: {
          protein: nutritionTotals.protein,
          carbohydrates: nutritionTotals.carbs,
          fat: nutritionTotals.fat,
          fiber: nutritionTotals.fiber,
        },
        loggedAt: new Date().toISOString(),
        notes: mealData.name,
        syncStatus: SyncStatus.PENDING,
        syncMetadata: {
          lastSyncedAt: undefined,
          lastModifiedAt: new Date().toISOString(),
          syncVersion: 1,
          deviceId: Platform.OS ?? "unknown",
        },
      };

      await crudOperations.createMealLog(mealLog);

      const mealLogInsert = {
        id: mealLog.id,
        user_id: userId,
        meal_name: mealData.name,
        meal_type: mealData.type,
        food_items: mealLog.foods,
        total_calories: nutritionTotals.calories,
        total_protein: nutritionTotals.protein,
        total_carbohydrates: nutritionTotals.carbs,
        total_fat: nutritionTotals.fat,
        logging_mode: "manual",
        truth_level: "curated",
        requires_review: false,
        source_metadata: {},
        notes: mealData.name,
        logged_at: mealLog.loggedAt,
      };

      let remoteCreatedAt: string | undefined;

      try {
        const { data, error } = await supabase
          .from("meal_logs")
          .insert(mealLogInsert)
          .select()
          .single();

        if (error) {
          throw error;
        }

        remoteCreatedAt = data.created_at;
      } catch (supabaseError) {
        console.error("Error creating meal in Supabase, queuing for retry:", supabaseError);
        await offlineService.queueAction({
          type: "CREATE",
          table: "meal_logs",
          data: mealLogInsert,
          userId,
          maxRetries: 3,
        });
      }

      // Populate analytics_metrics so the calorie chart always has data
      analyticsDataService
        .updateTodaysMetrics(userId, {
          caloriesConsumed: nutritionTotals.calories,
          mealsLogged: 1,
        })
        .catch((err) => console.error("[logMeal] analytics sync failed:", err));

      return {
        success: true,
        data: {
          id: mealLog.id,
          user_id: userId,
          name: mealData.name,
          type: mealData.type,
          total_calories: nutritionTotals.calories,
          total_protein: nutritionTotals.protein,
          total_carbs: nutritionTotals.carbs,
          total_fat: nutritionTotals.fat,
          total_fiber: nutritionTotals.fiber,
          consumed_at: mealLog.loggedAt,
          created_at: remoteCreatedAt ?? mealLog.loggedAt,
          foods: [],
        },
      };
    } catch (error) {
      console.error("Error in logMeal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to log meal",
      };
    }
  }

  convertMealLogToMeal(mealLog: MealLog): Meal {
    return {
      id: mealLog.id,
      user_id: mealLog.userId || "local-user",
      name: mealLog.notes || `${mealLog.mealType} meal`,
      type: mealLog.mealType,
      total_calories: mealLog.totalCalories,
      total_protein: mealLog.totalMacros?.protein ?? 0,
      total_carbs: mealLog.totalMacros?.carbohydrates ?? 0,
      total_fat: mealLog.totalMacros?.fat ?? 0,
      consumed_at: mealLog.loggedAt,
      created_at: mealLog.loggedAt,
      foods:
        mealLog.foods?.map((f) => ({
          id: `${mealLog.id}_${f.foodId}`,
          meal_id: mealLog.id,
          food_id: f.foodId,
          quantity_grams: f.quantity,
          calories: f.calories ?? 0,
          protein: f.macros?.protein ?? 0,
          carbs: f.macros?.carbohydrates ?? 0,
          fat: f.macros?.fat ?? 0,
        })) || [],
    };
  }
}
