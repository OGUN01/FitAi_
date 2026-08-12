import { RecognizedFood, MealType } from "./foodRecognitionService";
import { nutritionDataService, Food, MealLogFoodInput } from "./nutritionData";
import { supabase } from "./supabase";
import { nutritionRefreshService } from "./nutritionRefreshService";
import { MealLogProvenance } from "../types/nutritionLogging";
import { normalizeMealLogFiberValue } from "../utils/mealLogNutrition";
import { useProfileStore } from "../stores/profileStore";

export interface RecognizedFoodLoggingOptions {
  provenance?: MealLogProvenance;
  /**
   * When true, foods with no existing catalog match are submitted to the
   * moderated `user_food_contributions` queue (Tier-4 crowd-source path).
   * They are NOT immediately usable/reusable — they only join the shared
   * `foods` catalog once approved (or cross-user verified). Callers must
   * not tell users the food is "saved for future logging" yet; it is
   * pending review.
   */
  persistCatalogFoods?: boolean;
  notes?: string;
}

type FoodMapping = {
  recognizedFood: RecognizedFood;
  // Only set for an existing `foods` catalog match (findExistingFood). A
  // brand-new food goes through the moderated `user_food_contributions`
  // queue instead (see createFoodFromRecognized) and has no `foods.id` yet
  // — its `food_id` is intentionally left unset so the meal log falls back
  // to the embedded nutrition values rather than pointing at a non-catalog
  // row.
  databaseFoodId?: string;
  isNewFood: boolean;
};

/**
 * Service to handle logging recognized foods as meals
 * Bridges the gap between food recognition and meal logging
 */
export class RecognizedFoodLogger {
  private static instance: RecognizedFoodLogger;

  private constructor() {}

  static getInstance(): RecognizedFoodLogger {
    if (!RecognizedFoodLogger.instance) {
      RecognizedFoodLogger.instance = new RecognizedFoodLogger();
    }
    return RecognizedFoodLogger.instance;
  }

  /**
   * Log recognized foods as a meal with proper database integration
   */
  async logRecognizedFoods(
    userId: string,
    recognizedFoods: RecognizedFood[],
    mealType: MealType,
    customMealName?: string,
    options?: RecognizedFoodLoggingOptions,
  ): Promise<{
    success: boolean;
    mealId?: string;
    totalCalories?: number;
    error?: string;
  }> {
    try {
      if (!recognizedFoods.length) {
        throw new Error("No recognized foods to log");
      }

      const provenance = this.normalizeProvenance(
        options?.provenance ?? this.buildDefaultProvenance(recognizedFoods),
      );
      const shouldPersistCatalogFoods = options?.persistCatalogFoods ?? false;
      const foodMappings = shouldPersistCatalogFoods
        ? await this.createOrFindFoods(userId, recognizedFoods)
        : [];

      const mealName =
        customMealName || this.generateMealName(recognizedFoods, mealType);
      const totalCalories = recognizedFoods.reduce(
        (sum, food) => sum + food.nutrition.calories,
        0,
      );

      const logResult = await nutritionDataService.logMeal(userId, {
        name: mealName,
        type: mealType,
        foods: this.buildMealFoods(recognizedFoods, foodMappings, provenance),
        provenance,
        notes: options?.notes,
      });

      if (!logResult.success || !logResult.data) {
        throw new Error(logResult.error || "Failed to log meal");
      }

      await this.storeRecognitionMetadata(
        logResult.data.id,
        recognizedFoods,
        foodMappings,
        provenance,
      );
      await nutritionRefreshService.refreshAfterMealLogged(
        userId,
        logResult.data,
      );

      return {
        success: true,
        mealId: logResult.data.id,
        totalCalories: Math.round(totalCalories),
      };
    } catch (error) {
      console.error("Failed to log recognized foods:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Create or find foods in the database from recognized foods
   */
  private async createOrFindFoods(
    userId: string,
    recognizedFoods: RecognizedFood[],
  ): Promise<FoodMapping[]> {
    const foodMappings: FoodMapping[] = [];

    for (const recognizedFood of recognizedFoods) {
      try {
        const existingFood = await this.findExistingFood(
          recognizedFood.name,
          (recognizedFood as RecognizedFood & { barcode?: string }).barcode,
        );

        if (existingFood) {
          foodMappings.push({
            recognizedFood,
            databaseFoodId: existingFood.id,
            isNewFood: false,
          });
          continue;
        }

        const submitted = await this.createFoodFromRecognized(
          userId,
          recognizedFood,
        );

        if (submitted) {
          // Intentionally no databaseFoodId: the contribution is pending
          // moderation and is not yet a row in `foods`. See FoodMapping.
          foodMappings.push({
            recognizedFood,
            isNewFood: true,
          });
        }
      } catch (error) {
        console.error(`Error processing food ${recognizedFood.name}:`, error);
      }
    }

    return foodMappings;
  }

  /**
   * Find existing food in database by barcode or name
   */
  private async findExistingFood(
    foodName: string,
    barcode?: string,
  ): Promise<Food | null> {
    try {
      if (barcode) {
        const { data: barcodeMatches, error: barcodeError } = await supabase
          .from("foods")
          .select("*")
          .eq("barcode", barcode)
          .limit(1);

        if (!barcodeError && barcodeMatches && barcodeMatches.length > 0) {
          return barcodeMatches[0];
        }
      }

      let { data, error } = await supabase
        .from("foods")
        .select("*")
        .ilike("name", foodName)
        .limit(1);

      if (error) {
        console.error("Error searching for existing food:", error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0];
      }

      const cleanedName = foodName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
      const searchTerms = cleanedName
        .split(" ")
        .filter((term) => term.length > 2);

      if (searchTerms.length > 0) {
        const searchQuery = searchTerms
          .map((term) => `name.ilike.%${term}%`)
          .join(",");

        ({ data, error } = await supabase
          .from("foods")
          .select("*")
          .or(searchQuery)
          .limit(1));

        if (!error && data && data.length > 0) {
          return data[0];
        }
      }

      return null;
    } catch (error) {
      console.error("Error in findExistingFood:", error);
      return null;
    }
  }

  /**
   * Submit a brand-new recognized food to the moderated
   * `user_food_contributions` queue (Tier-4 crowd-sourced path — see
   * crowdFoodDb.ts's submitContribution for the barcode-scan counterpart).
   *
   * The shared `foods` catalog table has no client INSERT policy as of
   * migration 20260731000002_restrict_foods_insert_to_moderated_path.sql —
   * writing to it directly from here always failed with a permission error.
   * `user_food_contributions` is the real moderated path: it gates catalog
   * visibility behind `is_approved` (or the cross-user `verified` trigger),
   * matching the rest of the 4-tier food system. Contributions submitted
   * here are name-based (no barcode), which the table supports natively.
   *
   * Returns the created contribution row, or null on failure (never throws
   * — the caller treats a failed submission the same as "food not saved").
   */
  private async createFoodFromRecognized(
    userId: string,
    recognizedFood: RecognizedFood,
  ): Promise<{ id: string } | null> {
    try {
      const safeGrams = Math.max(recognizedFood.estimatedGrams, 1);
      const per100g = recognizedFood.nutritionPer100g ?? {
        calories: Math.round(
          (recognizedFood.nutrition.calories / safeGrams) * 100,
        ),
        protein:
          Math.round(
            (recognizedFood.nutrition.protein / safeGrams) * 100 * 10,
          ) / 10,
        carbs:
          Math.round((recognizedFood.nutrition.carbs / safeGrams) * 100 * 10) /
          10,
        fat:
          Math.round((recognizedFood.nutrition.fat / safeGrams) * 100 * 10) /
          10,
        fiber:
          Math.round((recognizedFood.nutrition.fiber / safeGrams) * 100 * 10) /
          10,
      };

      for (const key of Object.keys(per100g) as Array<keyof typeof per100g>) {
        const val = per100g[key];
        if (val === undefined || !isFinite(val)) {
          per100g[key] = 0;
        }
      }

      const contributionData = {
        user_id: userId,
        barcode: (recognizedFood as RecognizedFood & { barcode?: string }).barcode ?? null,
        product_name: recognizedFood.name,
        energy_kcal_100g: per100g.calories,
        proteins_100g: per100g.protein,
        carbohydrates_100g: per100g.carbs,
        fat_100g: per100g.fat,
        fiber_100g: per100g.fiber || null,
        sugars_100g: recognizedFood.nutritionPer100g?.sugar ?? null,
        sodium_100g: recognizedFood.nutritionPer100g?.sodium ?? null,
        contribution_type: "new_product" as const,
        notes: "Submitted via AI meal-photo recognition — pending moderation.",
      };

      const { data, error } = await supabase
        .from("user_food_contributions")
        .insert(contributionData)
        .select("id")
        .single();

      if (error) {
        console.error("Error submitting food contribution:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createFoodFromRecognized:", error);
      return null;
    }
  }

  /**
   * Generate a descriptive meal name from recognized foods
   */
  private generateMealName(
    recognizedFoods: RecognizedFood[],
    mealType: MealType,
  ): string {
    if (recognizedFoods.length === 1) {
      return recognizedFoods[0].name;
    }

    if (recognizedFoods.length === 2) {
      return `${recognizedFoods[0].name} & ${recognizedFoods[1].name}`;
    }

    const mainFoods = recognizedFoods.slice(0, 2);
    const remainingCount = recognizedFoods.length - 2;

    let mealName = mainFoods.map((food) => food.name).join(", ");

    if (remainingCount > 0) {
      mealName += ` & ${remainingCount} more item${remainingCount !== 1 ? "s" : ""}`;
    }

    const cuisineTypes = [
      ...new Set(recognizedFoods.map((food) => food.cuisine)),
    ];
    if (cuisineTypes.length === 1 && cuisineTypes[0] === "indian") {
      mealName = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} - ${mealName}`;
    }

    return mealName;
  }

  /**
   * Store additional metadata for food recognition tracking and accuracy improvement
   */
  private async storeRecognitionMetadata(
    mealLogId: string,
    recognizedFoods: RecognizedFood[],
    foodMappings: FoodMapping[],
    provenance: MealLogProvenance,
  ): Promise<void> {
    try {
      const metadata = {
        meal_log_id: mealLogId,
        recognition_data: {
          totalFoods: recognizedFoods.length,
          averageConfidence:
            recognizedFoods.reduce((sum, food) => sum + food.confidence, 0) /
            recognizedFoods.length,
          cuisineTypes: [
            ...new Set(recognizedFoods.map((food) => food.cuisine)),
          ],
          newFoodsCreated: foodMappings.filter((mapping) => mapping.isNewFood)
            .length,
          provenance,
          recognizedAt: new Date().toISOString(),
          foods: recognizedFoods.map((food) => {
            const mapping = foodMappings.find(
              (item) => item.recognizedFood.id === food.id,
            );
            return {
              id: food.id,
              name: food.name,
              confidence: food.confidence,
              cuisine: food.cuisine,
              estimatedGrams: food.estimatedGrams,
              userGrams: food.userGrams,
              databaseFoodId: mapping?.databaseFoodId,
              isNewFood: mapping?.isNewFood,
            };
          }),
        },
        created_at: new Date().toISOString(),
      };

      const { error: metaError } = await supabase
        .from("meal_recognition_metadata")
        .insert(metadata)
        .select()
        .single();

      if (metaError) {
        // Non-fatal: metadata is supplementary. Still log per rule 5 (no silent failures).
        console.error("Failed to store meal recognition metadata:", metaError);
      }
    } catch (error) {
      console.error("Warning: Failed to store recognition metadata:", error);
    }
  }

  /**
   * Get recognition statistics for improvement insights
   */
  async getRecognitionStats(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalRecognitions: number;
    averageConfidence: number;
    cuisineBreakdown: Record<string, number>;
    accuracyTrends: Array<{ date: string; confidence: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("meal_recognition_metadata")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching recognition stats:", error);
        return {
          totalRecognitions: 0,
          averageConfidence: 0,
          cuisineBreakdown: {},
          accuracyTrends: [],
        };
      }

      const stats = {
        totalRecognitions: data?.length || 0,
        averageConfidence: 0,
        cuisineBreakdown: {} as Record<string, number>,
        accuracyTrends: [] as Array<{ date: string; confidence: number }>,
      };

      if (data && data.length > 0) {
        const totalConfidence = data.reduce((sum, record) => {
          return sum + (record.recognition_data?.averageConfidence || 0);
        }, 0);
        stats.averageConfidence = totalConfidence / data.length;

        data.forEach((record) => {
          const cuisines = record.recognition_data?.cuisineTypes || [];
          cuisines.forEach((cuisine: string) => {
            stats.cuisineBreakdown[cuisine] =
              (stats.cuisineBreakdown[cuisine] || 0) + 1;
          });
        });

        stats.accuracyTrends = data.map((record) => ({
          date: record.created_at.split("T")[0],
          confidence: record.recognition_data?.averageConfidence || 0,
        }));
      }

      return stats;
    } catch (error) {
      console.error("Error in getRecognitionStats:", error);
      return {
        totalRecognitions: 0,
        averageConfidence: 0,
        cuisineBreakdown: {},
        accuracyTrends: [],
      };
    }
  }

  private buildDefaultProvenance(
    recognizedFoods: RecognizedFood[],
  ): MealLogProvenance {
    const avgConfidence =
      recognizedFoods.length > 0
        ? recognizedFoods.reduce((sum, food) => sum + food.confidence, 0) /
          recognizedFoods.length
        : null;

    return {
      mode: "meal_photo",
      truthLevel: "estimated",
      confidence: avgConfidence,
      countryContext: (() => {
        const country = useProfileStore.getState().personalInfo?.country || null;
        if (!country) console.warn('recognizedFoodLogger: country not set in profile');
        return country;
      })(),
      requiresReview: true,
      source: "food-recognition",
    };
  }

  private normalizeProvenance(
    provenance: MealLogProvenance,
  ): MealLogProvenance {
    if (
      provenance.mode === "meal_photo" &&
      provenance.truthLevel === "estimated" &&
      !provenance.requiresReview
    ) {
      return {
        ...provenance,
        requiresReview: true,
      };
    }

    return provenance;
  }

  private buildMealFoods(
    recognizedFoods: RecognizedFood[],
    foodMappings: FoodMapping[],
    provenance: MealLogProvenance,
  ): MealLogFoodInput[] {
    const mappingByFoodId = new Map(
      foodMappings.map((mapping) => [mapping.recognizedFood.id, mapping]),
    );
    const omitEstimatedSecondaryMicronutrients =
      provenance.mode === "meal_photo" && provenance.truthLevel === "estimated";

    return recognizedFoods.flatMap((food) => {
      if (food.nutrition.calories <= 0) {
        console.warn('[recognizedFoodLogger] Skipping food with zero/invalid calories:', food.name);
        return [];
      }
      const mapping = mappingByFoodId.get(food.id);
      const normalizedFiber = normalizeMealLogFiberValue(food.nutrition.fiber);
      return [{
        food_id: mapping?.databaseFoodId,
        quantity_grams: food.userGrams ?? food.estimatedGrams,
        name: food.name,
        category: food.category,
        barcode: (food as RecognizedFood & { barcode?: string }).barcode,
        serving_unit: "grams",
        calories: food.nutrition.calories,
        protein: food.nutrition.protein,
        carbs: food.nutrition.carbs,
        fat: food.nutrition.fat,
        fiber: normalizedFiber ?? 0,
        sugar: omitEstimatedSecondaryMicronutrients
          ? undefined
          : food.nutrition.sugar,
        sodium: omitEstimatedSecondaryMicronutrients
          ? undefined
          : food.nutrition.sodium,
      }];
    });
  }
}

// Export singleton instance
export const recognizedFoodLogger = RecognizedFoodLogger.getInstance();
export default recognizedFoodLogger;
