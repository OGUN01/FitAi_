import type { Meal } from "./nutritionData";
import { getLocalDateString } from "../utils/weekUtils";

// Lazy import to break require cycle: nutritionRefreshService ↔ nutritionData
function getNutritionDataService() {
  return (
    require("./nutritionData") as {
      nutritionDataService: {
        getUserMeals: (userId: string, date: string) => Promise<any>;
      };
    }
  ).nutritionDataService;
}

/**
 * Service to handle nutrition data refresh after meal operations
 * Ensures UI consistency and proper state management
 */
export class NutritionRefreshService {
  private static instance: NutritionRefreshService;
  private refreshCallbacks: Array<() => Promise<void>> = [];
  private isRefreshing = false;

  private constructor() {}

  static getInstance(): NutritionRefreshService {
    if (!NutritionRefreshService.instance) {
      NutritionRefreshService.instance = new NutritionRefreshService();
    }
    return NutritionRefreshService.instance;
  }

  /**
   * Register a callback to be called when nutrition data should be refreshed
   */
  onRefreshNeeded(callback: () => Promise<void>): () => void {
    this.refreshCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.refreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Trigger refresh of all registered nutrition data hooks
   */
  async triggerRefresh(): Promise<void> {
    if (this.isRefreshing) {
      console.log("🔄 Nutrition refresh already in progress, skipping...");
      return;
    }

    this.isRefreshing = true;

    try {
      console.log("🔄 Triggering nutrition data refresh...");

      const errors: Error[] = [];
      await Promise.all(
        this.refreshCallbacks.map(async (callback) => {
          try {
            await callback();
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            console.error(
              "❌ Failed to execute nutrition refresh callback:",
              err.message,
            );
            errors.push(err);
          }
        }),
      );

      if (errors.length > 0) {
        console.error(
          `❌ ${errors.length}/${this.refreshCallbacks.length} nutrition refresh callbacks failed`,
        );
      }

      console.log("✅ Nutrition data refresh completed");
    } catch (error) {
      console.error("❌ Error during nutrition refresh:", error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Refresh nutrition data after a meal has been logged
   * Optimized refresh that focuses on the data that changed
   */
  async refreshAfterMealLogged(
    userId: string,
    loggedMeal: Meal,
  ): Promise<void> {
    try {
      // Wait a small delay to ensure database consistency
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Trigger the general refresh
      await this.triggerRefresh();

      console.log("✅ Post-meal nutrition refresh completed");
    } catch (error) {
      console.error("❌ Error refreshing nutrition after meal logging:", error);
      // Still try to trigger the general refresh even if optimized refresh fails
      await this.triggerRefresh();
    }
  }

  /**
   * Get current daily nutrition totals (cached calculation)
   */
  async getCurrentDailyNutrition(
    userId: string,
    date?: string,
  ): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    mealsCount: number;
  }> {
    try {
      const targetDate = date || getLocalDateString();
      const response = await getNutritionDataService().getUserMeals(
        userId,
        targetDate,
      );

      if (response.success && response.data) {
        const meals = response.data as Meal[];
        const stats = meals.reduce<{
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          mealsCount: number;
        }>(
          (acc, meal) => ({
            calories: acc.calories + meal.total_calories,
            protein: acc.protein + meal.total_protein,
            carbs: acc.carbs + meal.total_carbs,
            fat: acc.fat + meal.total_fat,
            fiber: acc.fiber + (meal.total_fiber || 0),
            mealsCount: acc.mealsCount + 1,
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            mealsCount: 0,
          },
        );

        return stats;
      } else {
        console.warn("⚠️ Failed to get daily nutrition:", response.error);
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          mealsCount: 0,
        };
      }
    } catch (error) {
      console.error("❌ Error calculating daily nutrition:", error);
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        mealsCount: 0,
      };
    }
  }

  /**
   * Validate nutrition data consistency
   * Useful for debugging and ensuring data integrity
   */
  async validateNutritionConsistency(userId: string): Promise<{
    isConsistent: boolean;
    issues: string[];
    stats: {
      totalMeals: number;
      totalCalories: number;
      averageConfidence: number;
    };
  }> {
    try {
      const issues: string[] = [];

      // Get today's meals
      const todayDate = getLocalDateString();
      const mealsResponse = await getNutritionDataService().getUserMeals(
        userId,
        todayDate,
      );

      if (!mealsResponse.success) {
        issues.push("Failed to load user meals");
        return {
          isConsistent: false,
          issues,
          stats: { totalMeals: 0, totalCalories: 0, averageConfidence: 0 },
        };
      }

      const meals = mealsResponse.data || [];
      let totalCalories = 0;
      let mealIssues = 0;

      // Validate each meal
      for (const meal of meals) {
        if (meal.total_calories <= 0) {
          issues.push(`Meal "${meal.name}" has zero or negative calories`);
          mealIssues++;
        }

        if (
          meal.total_protein < 0 ||
          meal.total_carbs < 0 ||
          meal.total_fat < 0
        ) {
          issues.push(`Meal "${meal.name}" has negative macronutrients`);
          mealIssues++;
        }

        totalCalories += meal.total_calories;
      }

      // Calculate stats
      const stats = {
        totalMeals: meals.length,
        totalCalories: Math.round(totalCalories),
        averageConfidence: 85, // Placeholder - would come from recognition metadata
      };

      const isConsistent = issues.length === 0;


      return {
        isConsistent,
        issues,
        stats,
      };
    } catch (error) {
      console.error("❌ Error validating nutrition consistency:", error);
      return {
        isConsistent: false,
        issues: ["Validation process failed"],
        stats: { totalMeals: 0, totalCalories: 0, averageConfidence: 0 },
      };
    }
  }
}

// Export singleton instance
export const nutritionRefreshService = NutritionRefreshService.getInstance();
export default nutritionRefreshService;
