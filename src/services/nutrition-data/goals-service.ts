import { supabase } from "../supabase";
import {
  UserDietPreferences,
  NutritionGoals,
  NutritionDataResponse,
} from "./types";

export class GoalsService {
  async getUserDietPreferences(
    userId: string,
  ): Promise<NutritionDataResponse<UserDietPreferences>> {
    try {
      const { data, error } = await supabase
        .from("diet_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching diet preferences:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in getUserDietPreferences:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch diet preferences",
      };
    }
  }

  async getUserNutritionGoals(
    userId: string,
  ): Promise<NutritionDataResponse<NutritionGoals>> {
    try {
      console.log(
        "📊 [NutritionData] getUserNutritionGoals - Loading for user:",
        userId,
      );

      const { data: advancedReview, error: advancedError } = await supabase
        .from("advanced_review")
        .select(
          "daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, daily_water_ml",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (advancedReview && !advancedError) {
        console.log(
          "✅ [NutritionData] Found goals in advanced_review (onboarding):",
          advancedReview,
        );

        const goalsFromOnboarding: NutritionGoals = {
          id: `onboarding_${userId}`,
          user_id: userId,
          daily_calories: advancedReview.daily_calories,
          protein_grams: advancedReview.daily_protein_g,
          carb_grams: advancedReview.daily_carbs_g,
          fat_grams: advancedReview.daily_fat_g,
          macroTargets: {
            protein: advancedReview.daily_protein_g,
            carbohydrates: advancedReview.daily_carbs_g,
            fat: advancedReview.daily_fat_g,
          },
          daily_protein: advancedReview.daily_protein_g,
          daily_carbs: advancedReview.daily_carbs_g,
          daily_fat: advancedReview.daily_fat_g,
          daily_water_ml: advancedReview.daily_water_ml,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return {
          success: true,
          data: goalsFromOnboarding,
        };
      }

      const { data, error } = await supabase
        .from("nutrition_goals")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "❌ [NutritionData] Error fetching nutrition goals:",
          error,
        );
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data) {
        console.warn(
          "⚠️ [NutritionData] No nutrition goals found for user:",
          userId,
        );
        console.warn(
          "⚠️ [NutritionData] User needs to complete onboarding to calculate nutrition targets",
        );
        return {
          success: false,
          error:
            "No nutrition goals found. Please complete onboarding to calculate your personalized targets.",
        };
      }

      console.log(
        "✅ [NutritionData] Found goals in nutrition_goals table:",
        data,
      );
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(
        "❌ [NutritionData] Error in getUserNutritionGoals:",
        error,
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch nutrition goals",
      };
    }
  }
}
