import { supabase } from "../supabase";
import { toDb, fromDb } from "../../utils/transformers/fieldNameTransformers";
import { GenericResponse } from "./types";

export async function getDietPreferences(
  userId: string,
): Promise<GenericResponse> {
  try {
    const { data, error } = await supabase
      .from("diet_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return { success: true, data: null };
    }

    const transformedData = fromDb(data);

    return {
      success: true,
      data: {
        diet_type: transformedData.dietType || "non-veg",
        allergies: transformedData.allergies || [],
        restrictions: transformedData.restrictions || [],

        keto_ready: transformedData.ketoReady || false,
        intermittent_fasting_ready:
          transformedData.intermittentFastingReady || false,
        paleo_ready: transformedData.paleoReady || false,
        mediterranean_ready: transformedData.mediterraneanReady || false,
        low_carb_ready: transformedData.lowCarbReady || false,
        high_protein_ready: transformedData.highProteinReady || false,

        breakfast_enabled: transformedData.breakfastEnabled !== false,
        lunch_enabled: transformedData.lunchEnabled !== false,
        dinner_enabled: transformedData.dinnerEnabled !== false,
        snacks_enabled: transformedData.snacksEnabled !== false,

        cooking_skill_level: transformedData.cookingSkillLevel || "beginner",
        max_prep_time_minutes: transformedData.maxPrepTimeMinutes || null,
        budget_level: transformedData.budgetLevel || "medium",

        drinks_enough_water: transformedData.drinksEnoughWater || false,
        limits_sugary_drinks: transformedData.limitsSugaryDrinks || false,
        eats_regular_meals: transformedData.eatsRegularMeals || false,
        avoids_late_night_eating:
          transformedData.avoidsLateNightEating || false,
        controls_portion_sizes: transformedData.controlsPortionSizes || false,
        reads_nutrition_labels: transformedData.readsNutritionLabels || false,
        eats_processed_foods: transformedData.eatsProcessedFoods !== false,
        eats_5_servings_fruits_veggies:
          transformedData.eats5ServingsFruitsVeggies || false,
        limits_refined_sugar: transformedData.limitsRefinedSugar || false,
        includes_healthy_fats: transformedData.includesHealthyFats || false,
        drinks_alcohol: transformedData.drinksAlcohol || false,
        smokes_tobacco: transformedData.smokesTobacco || false,
        drinks_coffee: transformedData.drinksCoffee || false,
        takes_supplements: transformedData.takesSupplements || false,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get diet preferences",
    };
  }
}

export async function getWorkoutPreferences(
  userId: string,
): Promise<GenericResponse> {
  try {
    const { data, error } = await supabase
      .from("workout_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return { success: true, data: null };
    }

    const transformedData = fromDb(data);

    return {
      success: true,
      data: {
        workoutTypes: transformedData.workoutTypes || [],
        equipment: transformedData.equipment || [],
        location: transformedData.location || "home",
        timePreference: transformedData.timePreference || 30,
        intensity: transformedData.intensity || "intermediate",
        activity_level: transformedData.activityLevel || "sedentary",
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get workout preferences",
    };
  }
}

export async function updateWorkoutPreferences(
  userId: string,
  updates: {
    workout_types?: string[];
    equipment?: string[];
    location?: string;
    time_preference?: number;
    intensity?: string;
    activity_level?: string;
  },
): Promise<GenericResponse> {
  try {
    const dbUpdates = toDb(updates);

    const { data, error } = await supabase
      .from("workout_preferences")
      .upsert(
        {
          user_id: userId,
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: false,
        },
      )
      .select()
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const transformedData = fromDb(data);

    return {
      success: true,
      data: {
        workoutTypes: transformedData.workoutTypes || [],
        equipment: transformedData.equipment || [],
        location: transformedData.location || "home",
        timePreference: transformedData.timePreference || 30,
        intensity: transformedData.intensity || "intermediate",
        activity_level: transformedData.activityLevel || "sedentary",
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update workout preferences",
    };
  }
}
