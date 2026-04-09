import { MealLog, SyncStatus } from "../../types/localData";
import { SupabaseMealLog } from "./types";
import {
  deriveMealLogFiber,
  normalizeMealLogFoodItems,
} from "../../utils/mealLogNutrition";
import type { Json } from "../supabase-types.generated";

export function transformMealLogToSupabase(
  mealLog: MealLog,
  userId: string,
): SupabaseMealLog {
  return {
    user_id: userId,
    meal_type: mealLog.mealType,
    meal_name: mealLog.notes || mealLog.foods?.[0]?.name || "Meal",
    food_items: (mealLog.foods || []) as unknown as Json,
    total_calories: mealLog.totalCalories || 0,
    total_protein: mealLog.totalMacros?.protein || 0,
    total_carbohydrates: mealLog.totalMacros?.carbohydrates || 0,
    total_fat: mealLog.totalMacros?.fat || 0,
    logging_mode: mealLog.provenance?.mode || "manual",
    truth_level: mealLog.provenance?.truthLevel || "curated",
    confidence: mealLog.provenance?.confidence || null,
    country_context: mealLog.provenance?.countryContext || null,
    requires_review: mealLog.provenance?.requiresReview || false,
    source_metadata: {
      source: mealLog.provenance?.source || null,
      productIdentity: mealLog.provenance?.productIdentity || null,
      conflict: mealLog.provenance?.conflict || null,
    } as unknown as Json,
    notes: mealLog.notes || null,
    logged_at: mealLog.loggedAt || new Date().toISOString(),
  };
}

export function transformSupabaseToMealLog(supabaseMealLog: any): MealLog {
  const foods = normalizeMealLogFoodItems(supabaseMealLog.food_items);

  return {
    id: supabaseMealLog.id,
    mealType: supabaseMealLog.meal_type,
    foods: foods as unknown as MealLog["foods"],
    totalCalories: supabaseMealLog.total_calories || 0,
    totalMacros: {
      protein: supabaseMealLog.total_protein || 0,
      carbohydrates: supabaseMealLog.total_carbohydrates || 0,
      fat: supabaseMealLog.total_fat || 0,
      fiber: deriveMealLogFiber(foods),
    },
    loggedAt: supabaseMealLog.logged_at || new Date().toISOString(),
    notes: supabaseMealLog.notes || "",
    provenance: {
      mode: supabaseMealLog.logging_mode || "manual",
      truthLevel: supabaseMealLog.truth_level || "curated",
      confidence: supabaseMealLog.confidence || null,
      countryContext: supabaseMealLog.country_context || null,
      requiresReview: supabaseMealLog.requires_review || false,
      source: supabaseMealLog.source_metadata?.source || null,
      productIdentity: supabaseMealLog.source_metadata?.productIdentity || null,
      conflict: supabaseMealLog.source_metadata?.conflict || null,
    },
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
