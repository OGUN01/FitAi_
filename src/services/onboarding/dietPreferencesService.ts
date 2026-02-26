import { supabase } from "../supabase";
import {
  DietPreferencesData,
  TabValidationResult,
  DietPreferencesRow,
} from "../../types/onboarding";

export class DietPreferencesService {
  static async save(
    userId: string,
    data: DietPreferencesData,
  ): Promise<boolean> {
    try {
      const dietData: Partial<DietPreferencesRow> = {
        user_id: userId,
        diet_type: data.diet_type || "omnivore",
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],
        keto_ready: data.keto_ready,
        intermittent_fasting_ready: data.intermittent_fasting_ready,
        paleo_ready: data.paleo_ready,
        mediterranean_ready: data.mediterranean_ready,
        low_carb_ready: data.low_carb_ready,
        high_protein_ready: data.high_protein_ready,
        breakfast_enabled: data.breakfast_enabled,
        lunch_enabled: data.lunch_enabled,
        dinner_enabled: data.dinner_enabled,
        snacks_enabled: data.snacks_enabled,
        cooking_skill_level: data.cooking_skill_level,
        max_prep_time_minutes: data.max_prep_time_minutes,
        budget_level: data.budget_level,
        drinks_enough_water: data.drinks_enough_water,
        limits_sugary_drinks: data.limits_sugary_drinks,
        eats_regular_meals: data.eats_regular_meals,
        avoids_late_night_eating: data.avoids_late_night_eating,
        controls_portion_sizes: data.controls_portion_sizes,
        reads_nutrition_labels: data.reads_nutrition_labels,
        eats_processed_foods: data.eats_processed_foods,
        eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies,
        limits_refined_sugar: data.limits_refined_sugar,
        includes_healthy_fats: data.includes_healthy_fats,
        drinks_alcohol: data.drinks_alcohol,
        smokes_tobacco: data.smokes_tobacco,
        drinks_coffee: data.drinks_coffee,
        takes_supplements: data.takes_supplements,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("diet_preferences")
        .upsert(dietData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "[DB-SERVICE] DietPreferencesService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DB-SERVICE] DietPreferencesService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<DietPreferencesData | null> {
    try {
      const { data, error } = await supabase
        .from("diet_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error(
          "[DB-SERVICE] DietPreferencesService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      const dietPreferences: DietPreferencesData = {
        diet_type: data.diet_type || "non-veg",
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],
        keto_ready: data.keto_ready || false,
        intermittent_fasting_ready: data.intermittent_fasting_ready || false,
        paleo_ready: data.paleo_ready || false,
        mediterranean_ready: data.mediterranean_ready || false,
        low_carb_ready: data.low_carb_ready || false,
        high_protein_ready: data.high_protein_ready || false,
        breakfast_enabled: data.breakfast_enabled ?? true,
        lunch_enabled: data.lunch_enabled ?? true,
        dinner_enabled: data.dinner_enabled ?? true,
        snacks_enabled: data.snacks_enabled ?? true,
        cooking_skill_level: data.cooking_skill_level || "beginner",
        max_prep_time_minutes: data.max_prep_time_minutes || 30,
        budget_level: data.budget_level || "medium",
        drinks_enough_water: data.drinks_enough_water || false,
        limits_sugary_drinks: data.limits_sugary_drinks || false,
        eats_regular_meals: data.eats_regular_meals || false,
        avoids_late_night_eating: data.avoids_late_night_eating || false,
        controls_portion_sizes: data.controls_portion_sizes || false,
        reads_nutrition_labels: data.reads_nutrition_labels || false,
        eats_processed_foods: data.eats_processed_foods ?? true,
        eats_5_servings_fruits_veggies:
          data.eats_5_servings_fruits_veggies || false,
        limits_refined_sugar: data.limits_refined_sugar || false,
        includes_healthy_fats: data.includes_healthy_fats || false,
        drinks_alcohol: data.drinks_alcohol || false,
        smokes_tobacco: data.smokes_tobacco || false,
        drinks_coffee: data.drinks_coffee || false,
        takes_supplements: data.takes_supplements || false,
      };

      return dietPreferences;
    } catch (error) {
      console.error("DietPreferencesService: Unexpected error:", error);
      return null;
    }
  }

  static validate(data: DietPreferencesData | null): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return {
        is_valid: false,
        errors: ["Diet preferences data is missing"],
        warnings: [],
        completion_percentage: 0,
      };
    }

    if (!data.diet_type) errors.push("Diet type selection is required");

    const enabledMeals = [
      data.breakfast_enabled,
      data.lunch_enabled,
      data.dinner_enabled,
      data.snacks_enabled,
    ].filter(Boolean).length;

    if (enabledMeals === 0) {
      errors.push("At least one meal type must be enabled");
    }

    if (!data.breakfast_enabled) {
      warnings.push("Skipping breakfast may affect metabolism");
    }
    if (data.smokes_tobacco) {
      warnings.push("Smoking can significantly impact fitness goals");
    }
    if (data.drinks_alcohol && !data.limits_refined_sugar) {
      warnings.push("Consider limiting alcohol and sugar for better results");
    }
    if (!data.drinks_enough_water) {
      warnings.push("Proper hydration (3-4L daily) is crucial for fitness");
    }
    if (data.eats_processed_foods && !data.eats_5_servings_fruits_veggies) {
      warnings.push(
        "Consider reducing processed foods and increasing fruits/vegetables",
      );
    }

    const requiredFields = ["diet_type"];
    const optionalFields = [
      "allergies",
      "restrictions",
      "cooking_skill_level",
      "max_prep_time_minutes",
      "budget_level",
      "keto_ready",
      "intermittent_fasting_ready",
      "paleo_ready",
      "mediterranean_ready",
      "low_carb_ready",
      "high_protein_ready",
      "breakfast_enabled",
      "lunch_enabled",
      "dinner_enabled",
      "snacks_enabled",
      "drinks_enough_water",
      "limits_sugary_drinks",
      "eats_regular_meals",
      "avoids_late_night_eating",
      "controls_portion_sizes",
      "reads_nutrition_labels",
      "eats_processed_foods",
      "eats_5_servings_fruits_veggies",
      "limits_refined_sugar",
      "includes_healthy_fats",
      "drinks_alcohol",
      "smokes_tobacco",
      "drinks_coffee",
      "takes_supplements",
    ];

    const completedRequired = requiredFields.filter((field) => {
      const value = data[field as keyof DietPreferencesData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;

    const completedOptional = optionalFields.filter((field) => {
      const value = data[field as keyof DietPreferencesData];
      return value !== null && value !== undefined;
    }).length;

    const completionPercentage = Math.round(
      (completedRequired / requiredFields.length) * 70 +
        (completedOptional / optionalFields.length) * 30,
    );

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
  }
}
