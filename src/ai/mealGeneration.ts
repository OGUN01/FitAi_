import {
  PersonalInfo,
  FitnessGoals,
  BodyMetrics,
  DietPreferences,
} from "../types/user";
import { AdvancedReviewData } from "../types/onboarding";
import { Meal, DailyMealPlan, AIResponse } from "../types/ai";
import { WeeklyMealPlan, AIServiceMetadata } from "./types";
import { handleError } from "./utils";
import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import { transformForDietRequest } from "../services/aiRequestTransformers";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";
import { getLocalDateString } from "../utils/weekUtils";

import { transformDietResponseToWeeklyPlan } from "../services/aiRequestTransformers";

export async function generateMeal(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  preferences: {
    bodyMetrics?: BodyMetrics;
    dietPreferences?: DietPreferences;
    calorieTarget?: number;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<Meal>> {

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      preferences.bodyMetrics,
      preferences.dietPreferences,
      preferences.calorieTarget,
      {
        currentWeightKg: resolveCurrentWeightFromStores({
          bodyAnalysisWeight: preferences.bodyMetrics?.current_weight_kg,
        }).value,
      },
    );

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
    calorieTarget?: number;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<DailyMealPlan>> {

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      preferences.bodyMetrics,
      preferences.dietPreferences,
      preferences.calorieTarget,
      {
        currentWeightKg: resolveCurrentWeightFromStores({
          bodyAnalysisWeight: preferences.bodyMetrics?.current_weight_kg,
        }).value,
      },
    );

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
      date: getLocalDateString(),
      meals: response.data.meals || [],
      totalCalories: response.data.dailyTotals?.calories || 0,
      totalMacros: {
        protein: response.data.dailyTotals?.protein || 0,
        carbohydrates: response.data.dailyTotals?.carbs || 0,
        fat: response.data.dailyTotals?.fat || 0,
        fiber: (response.data.dailyTotals as any)?.fiber ?? 0,
        sugar: (response.data.dailyTotals as any)?.sugar ?? 0,
      },
      waterIntake: (response.data.dailyTotals as any)?.water ?? 0,
    };

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
    advancedReview?: AdvancedReviewData | null;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<WeeklyMealPlan>> {

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      options.bodyMetrics,
      options.dietPreferences,
      options.calorieTarget,
      {
        daysCount: 7,
        advancedReview: options.advancedReview,
        currentWeightKg: resolveCurrentWeightFromStores({
          bodyAnalysisWeight: options.bodyMetrics?.current_weight_kg,
        }).value,
      },
    );

    const response = await fitaiWorkersClient.generateDietPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
    }

    if (!response.success || !response.data) {
      console.error("❌ [aiService] Backend returned error:", response.error);
      return {
        success: false,
        error: response.error || "Failed to generate meal plan",
      };
    }

    const weeklyPlan = transformDietResponseToWeeklyPlan(response, weekNumber, {
      requestedDaysCount: 7,
    });

    if (!weeklyPlan) {
      return {
        success: false,
        error: "Failed to transform diet response",
      };
    }

    return {
      success: true,
      data: weeklyPlan,
    };
  } catch (error) {
    return handleError(error, "generateWeeklyMealPlan");
  }
}
