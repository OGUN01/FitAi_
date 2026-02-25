import {
  PersonalInfo,
  FitnessGoals,
  BodyMetrics,
  DietPreferences,
} from "../types/user";
import { Meal, DailyMealPlan, AIResponse } from "../types/ai";
import { WeeklyMealPlan, AIServiceMetadata } from "./types";
import { handleError } from "./utils";
import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import { transformForDietRequest } from "../services/aiRequestTransformers";

import { transformDietResponseToWeeklyPlan } from "../services/aiRequestTransformers";

export async function generateMeal(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  preferences: {
    bodyMetrics?: BodyMetrics;
    dietPreferences?: DietPreferences;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<Meal>> {
  console.log("🍽️ [aiService] generateMeal called for:", mealType);

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      preferences.bodyMetrics,
      preferences.dietPreferences,
    );

    console.log("🍽️ [aiService] Calling backend /diet/generate");
    const response = await fitaiWorkersClient.generateDietPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
    }

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Failed to generate meal",
      };
    }

    const meal = response.data.meals?.find(
      (m: any) =>
        m.mealType?.toLowerCase() === mealType ||
        m.type?.toLowerCase() === mealType,
    );

    if (!meal) {
      return {
        success: false,
        error: `No ${mealType} found in generated plan`,
      };
    }

    console.log("✅ [aiService] Meal generated successfully");
    return {
      success: true,
      data: meal as Meal,
    };
  } catch (error) {
    return handleError(error, "generateMeal");
  }
}

export async function generateDailyMealPlan(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  preferences: {
    bodyMetrics?: BodyMetrics;
    dietPreferences?: DietPreferences;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<DailyMealPlan>> {
  console.log("🍽️ [aiService] generateDailyMealPlan called");

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      preferences.bodyMetrics,
      preferences.dietPreferences,
    );

    console.log("🍽️ [aiService] Calling backend /diet/generate");
    const response = await fitaiWorkersClient.generateDietPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
    }

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Failed to generate daily meal plan",
      };
    }

    const dailyPlan: DailyMealPlan = {
      date: new Date().toISOString().split("T")[0],
      meals: response.data.meals || [],
      totalCalories: response.data.dailyTotals?.calories || 0,
      totalMacros: {
        protein: response.data.dailyTotals?.protein || 0,
        carbohydrates: response.data.dailyTotals?.carbs || 0,
        fat: response.data.dailyTotals?.fat || 0,
        fiber: 0,
      },
      waterIntake: 0,
    };

    console.log("✅ [aiService] Daily meal plan generated successfully");
    return {
      success: true,
      data: dailyPlan,
    };
  } catch (error) {
    return handleError(error, "generateDailyMealPlan");
  }
}

export async function generateWeeklyMealPlan(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  weekNumber: number = 1,
  options: {
    bodyMetrics?: BodyMetrics;
    dietPreferences?: DietPreferences;
    calorieTarget?: number;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<WeeklyMealPlan>> {
  console.log(
    "🍽️ [aiService] generateWeeklyMealPlan called for week:",
    weekNumber,
  );
  console.log("🍽️ [aiService] calorieTarget:", options.calorieTarget);

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      options.bodyMetrics,
      options.dietPreferences,
      options.calorieTarget,
    );

    console.log("🍽️ [aiService] Calling backend /diet/generate");
    const response = await fitaiWorkersClient.generateDietPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
      console.log("📊 [aiService] Generation metadata:", {
        cached: response.metadata.cached,
        cacheSource: response.metadata.cacheSource,
        generationTime: response.metadata.generationTime,
        model: response.metadata.model,
        cuisineDetected: response.metadata.cuisineDetected,
      });
    }

    if (!response.success || !response.data) {
      console.error("❌ [aiService] Backend returned error:", response.error);
      return {
        success: false,
        error: response.error || "Failed to generate meal plan",
      };
    }

    const weeklyPlan = transformDietResponseToWeeklyPlan(response, weekNumber);

    if (!weeklyPlan) {
      return {
        success: false,
        error: "Failed to transform diet response",
      };
    }

    console.log("✅ [aiService] Weekly meal plan generated successfully:", {
      meals: weeklyPlan.meals.length,
      title: weeklyPlan.planTitle,
    });

    return {
      success: true,
      data: weeklyPlan,
    };
  } catch (error) {
    return handleError(error, "generateWeeklyMealPlan");
  }
}
