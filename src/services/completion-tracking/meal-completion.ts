import { useNutritionStore } from "../../stores/nutritionStore";
import crudOperations from "../crudOperations";
import { MealLog, SyncStatus } from "../../types/localData";
import { supabase } from "../supabase";
import { nutritionRefreshService } from "../nutritionRefreshService";
import { analyticsDataService } from "../analyticsData";
import { EventEmitter } from "./event-emitter";
import { CompletionEvent } from "./types";
import { MealLogProvenance } from "../../types/nutritionLogging";

export async function completeMeal(
  emitter: EventEmitter,
  mealId: string,
  logData?: any,
  userId?: string,
): Promise<boolean> {
  try {
    const nutritionStore = useNutritionStore.getState();

    await nutritionStore.completeMeal(mealId, logData?.logId);

    const meal = nutritionStore.weeklyMealPlan?.meals.find(
      (m) => m.id === mealId,
    );

    if (meal) {
      try {
        const currentUserId = userId;
        const provenance: MealLogProvenance =
          logData?.provenance ||
          (meal as any).sourceMetadata || {
            mode: "manual",
            truthLevel: "curated",
            confidence: null,
            countryContext: "IN",
            requiresReview: false,
            source: "manual-log",
          };

        if (currentUserId) {
          const mealLog: MealLog = {
            id: `weekly_meal_log_${mealId}_${Date.now()}`,
            mealType: meal.type as "breakfast" | "lunch" | "dinner" | "snack",
            foods: [],
            totalCalories: meal.totalCalories || 0,
            totalMacros: {
              protein: meal.totalMacros?.protein ?? 0,
              carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
              fat: meal.totalMacros?.fat ?? 0,
              fiber: meal.totalMacros?.fiber ?? 0,
              sugar: meal.totalMacros?.sugar ?? 0,
              sodium: meal.totalMacros?.sodium ?? 0,
            },
            loggedAt: new Date().toISOString(),
            notes: `Weekly meal plan: ${meal.name}`,
            provenance,
            syncStatus: SyncStatus.PENDING,
            syncMetadata: {
              lastModifiedAt: new Date().toISOString(),
              syncVersion: 1,
              deviceId: "local",
            },
          };

          await crudOperations.createMealLog(mealLog);

          try {
            const supabaseResult = await supabase.from("meal_logs").insert({
              user_id: currentUserId,
              meal_type: meal.type,
              meal_name: meal.name,
              food_items: meal.items || [],
              total_calories: meal.totalCalories || 0,
              total_protein: meal.totalMacros?.protein ?? 0,
              total_carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
              total_fat: meal.totalMacros?.fat ?? 0,
              logging_mode: provenance.mode,
              truth_level: provenance.truthLevel,
              confidence: provenance.confidence ?? null,
              country_context: provenance.countryContext ?? null,
              requires_review: provenance.requiresReview,
              source_metadata: {
                source: provenance.source ?? null,
                productIdentity: provenance.productIdentity ?? null,
                conflict: provenance.conflict ?? null,
              },
              notes: logData?.reviewNote || null,
              logged_at: new Date().toISOString(),
            });

            if (supabaseResult.error) {
              console.error(
                `⚠️ Supabase meal_logs insert error:`,
                supabaseResult.error,
              );
            } else {
              try {
                await analyticsDataService.updateTodaysMetrics(currentUserId, {
                  mealsLogged: 1,
                  caloriesConsumed: meal.totalCalories || 0,
                });
              } catch (analyticsError) {
                console.error(
                  "⚠️ Failed to update analytics after meal completion:",
                  analyticsError,
                );
              }

              try {
                await nutritionRefreshService.triggerRefresh();
              } catch (refreshError) {
                console.error(
                  "⚠️ Failed to refresh nutrition data after meal completion:",
                  refreshError,
                );
              }
            }
          } catch (supabaseError) {
            console.error(
              `❌ Failed to sync to Supabase meal_logs:`,
              supabaseError,
            );
          }
        } else {
        }
      } catch (mealLogError) {
        console.error(`❌ Error creating meal log:`, mealLogError);
      }

      const event: CompletionEvent = {
        id: `meal_completion_${mealId}_${Date.now()}`,
        type: "meal",
        itemId: mealId,
        completedAt: new Date().toISOString(),
        progress: 100,
        data: {
          meal,
          logData,
          calories: meal.totalCalories,
          ingredients: meal.items?.length || 0,
        },
      };

      emitter.emit(event);

      const savedProgress = nutritionStore.getMealProgress(mealId);

      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Failed to complete meal:", error);
    return false;
  }
}
