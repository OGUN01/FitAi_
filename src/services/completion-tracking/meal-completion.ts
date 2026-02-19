import { useNutritionStore } from "../../stores/nutritionStore";
import crudOperations from "../crudOperations";
import { MealLog, SyncStatus } from "../../types/localData";
import { supabase } from "../supabase";
import { nutritionRefreshService } from "../nutritionRefreshService";
import { analyticsDataService } from "../analyticsData";
import { EventEmitter } from "./event-emitter";
import { CompletionEvent } from "./types";

export async function completeMeal(
  emitter: EventEmitter,
  mealId: string,
  logData?: any,
  userId?: string,
): Promise<boolean> {
  try {
    const nutritionStore = useNutritionStore.getState();

    console.log(`🍽️ Completing meal: ${mealId}`);

    await nutritionStore.completeMeal(mealId, logData?.logId);

    const meal = nutritionStore.weeklyMealPlan?.meals.find(
      (m) => m.id === mealId,
    );

    console.log(`🍽️ Found meal for completion:`, {
      found: !!meal,
      mealName: meal?.name,
      mealCalories: meal?.totalCalories,
      mealType: meal?.type,
      dayOfWeek: meal?.dayOfWeek,
    });

    if (meal) {
      try {
        console.log(`🍽️ Creating meal log for completed meal: ${meal.name}`);

        const currentUserId = userId;

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
            syncStatus: SyncStatus.PENDING,
            syncMetadata: {
              lastModifiedAt: new Date().toISOString(),
              syncVersion: 1,
              deviceId: "local",
            },
          };

          await crudOperations.createMealLog(mealLog);
          console.log(
            `✅ Local meal log created for: ${meal.name} (${meal.totalCalories} calories)`,
          );

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
              logged_at: new Date().toISOString(),
            });

            if (supabaseResult.error) {
              console.error(
                `⚠️ Supabase meal_logs insert error:`,
                supabaseResult.error,
              );
            } else {
              console.log(
                `✅ Supabase meal_logs synced for: ${meal.name} (${meal.totalCalories} cal, P:${meal.totalMacros?.protein}g, C:${meal.totalMacros?.carbohydrates}g, F:${meal.totalMacros?.fat}g)`,
              );

              try {
                await analyticsDataService.updateTodaysMetrics(currentUserId, {
                  mealsLogged: 1,
                  caloriesConsumed: meal.totalCalories || 0,
                });
                console.log("📊 Analytics metrics updated for meal completion");
              } catch (analyticsError) {
                console.warn(
                  "⚠️ Failed to update analytics metrics:",
                  analyticsError,
                );
              }

              try {
                await nutritionRefreshService.triggerRefresh();
                console.log(
                  "🔄 Nutrition refresh triggered after meal completion",
                );
              } catch (refreshError) {
                console.warn(
                  "⚠️ Failed to trigger nutrition refresh:",
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
          console.warn(`⚠️ No user ID available, skipping meal log creation`);
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
      console.log(
        `✅ Meal completed: ${meal.name} (${meal.totalCalories} calories)`,
      );

      const savedProgress = nutritionStore.getMealProgress(mealId);
      console.log(`🍽️ Saved meal progress:`, savedProgress);

      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Failed to complete meal:", error);
    return false;
  }
}
