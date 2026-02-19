import { MealLog, SyncStatus } from "../../types/localData";
import { SupabaseMealLog } from "./types";

export function transformMealLogToSupabase(
  mealLog: MealLog,
  userId: string,
): SupabaseMealLog {
  return {
    user_id: userId,
    meal_type: mealLog.mealType,
    meal_name:
      mealLog.foods?.[0]?.food?.name || mealLog.foods?.[0]?.foodId || "Meal",
    food_items: mealLog.foods || [],
    total_calories: mealLog.totalCalories || 0,
    total_protein: mealLog.totalMacros?.protein || 0,
    total_carbohydrates: mealLog.totalMacros?.carbohydrates || 0,
    total_fat: mealLog.totalMacros?.fat || 0,
    notes: mealLog.notes || null,
    logged_at: mealLog.loggedAt || new Date().toISOString(),
  };
}

export function transformSupabaseToMealLog(supabaseMealLog: any): MealLog {
  let foods = [];
  if (supabaseMealLog.food_items) {
    if (typeof supabaseMealLog.food_items === "string") {
      try {
        foods = JSON.parse(supabaseMealLog.food_items);
      } catch {
        foods = [];
      }
    } else if (Array.isArray(supabaseMealLog.food_items)) {
      foods = supabaseMealLog.food_items;
    } else {
      foods = [supabaseMealLog.food_items];
    }
  }

  return {
    id: supabaseMealLog.id,
    mealType: supabaseMealLog.meal_type,
    foods: foods,
    totalCalories: supabaseMealLog.total_calories || 0,
    totalMacros: {
      protein: supabaseMealLog.total_protein || 0,
      carbohydrates: supabaseMealLog.total_carbohydrates || 0,
      fat: supabaseMealLog.total_fat || 0,
      fiber: 0,
    },
    loggedAt: supabaseMealLog.logged_at || new Date().toISOString(),
    notes: supabaseMealLog.notes || "",
    photos: [],
    syncStatus: SyncStatus.SYNCED,
    syncMetadata: {
      lastSyncedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      syncVersion: 1,
      deviceId: "local",
    },
  };
}
