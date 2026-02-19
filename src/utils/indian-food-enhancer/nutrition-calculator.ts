import { TRADITIONAL_SERVING_SIZES } from "../../data/traditionalServingSizes";
import {
  NutritionCorrectionParams,
  EnhancedNutrition,
  GeminiFoodData,
} from "./types";

export class NutritionCalculator {
  calculateTraditionalServing(foodName: string, region: string): number {
    const servingSizes =
      (TRADITIONAL_SERVING_SIZES as any)[region] ||
      TRADITIONAL_SERVING_SIZES.general;

    for (const [pattern, size] of Object.entries(servingSizes)) {
      if (foodName.includes(pattern)) {
        return size as number;
      }
    }

    if (this.containsAny(foodName, ["rice", "biryani", "pulao"])) return 150;
    if (this.containsAny(foodName, ["dal", "curry", "sabji"])) return 100;
    if (this.containsAny(foodName, ["roti", "naan", "chapati"])) return 50;
    if (this.containsAny(foodName, ["sweet", "dessert", "halwa", "kheer"]))
      return 75;

    return 100;
  }

  applyCorrections(params: NutritionCorrectionParams): EnhancedNutrition {
    const { baseNutrition, region, cookingMethod, spiceLevel, portionSize } =
      params;

    const nutrition = {
      calories: baseNutrition.calories || 150,
      protein: baseNutrition.protein || 8,
      carbs: baseNutrition.carbs || 20,
      fat: baseNutrition.fat || 5,
      fiber: baseNutrition.fiber || 3,
      sugar: baseNutrition.sugar || 2,
      sodium: baseNutrition.sodium || 400,
    };

    const regionalMultipliers = {
      north: { calories: 1.15, fat: 1.25 },
      south: { calories: 1.05, fat: 1.1 },
      east: { calories: 1.0, fat: 1.0 },
      west: { calories: 1.08, fat: 1.15 },
    };

    const regionMultiplier = regionalMultipliers[
      region as keyof typeof regionalMultipliers
    ] || {
      calories: 1.0,
      fat: 1.0,
    };
    nutrition.calories *= regionMultiplier.calories;
    nutrition.fat *= regionMultiplier.fat;

    const cookingMultipliers = {
      fried: { calories: 1.3, fat: 1.5 },
      baked: { calories: 1.1, fat: 1.2 },
      grilled: { calories: 1.05, fat: 1.1 },
      steamed: { calories: 0.95, fat: 0.9 },
      curry: { calories: 1.1, fat: 1.15 },
      raw: { calories: 1.0, fat: 1.0 },
    };

    const cookingMultiplier = cookingMultipliers[
      cookingMethod as keyof typeof cookingMultipliers
    ] || { calories: 1.0, fat: 1.0 };
    nutrition.calories *= cookingMultiplier.calories;
    nutrition.fat *= cookingMultiplier.fat;

    const spiceMultipliers = {
      mild: 1.0,
      medium: 1.02,
      hot: 1.05,
      extra_hot: 1.08,
    };

    const spiceMultiplier =
      spiceMultipliers[spiceLevel as keyof typeof spiceMultipliers] || 1.0;
    nutrition.calories *= spiceMultiplier;

    const portionMultiplier = portionSize / 100;
    nutrition.calories *= portionMultiplier;
    nutrition.protein *= portionMultiplier;
    nutrition.carbs *= portionMultiplier;
    nutrition.fat *= portionMultiplier;
    nutrition.fiber *= portionMultiplier;
    nutrition.sugar *= portionMultiplier;
    nutrition.sodium *= portionMultiplier;

    return {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein * 10) / 10,
      carbs: Math.round(nutrition.carbs * 10) / 10,
      fat: Math.round(nutrition.fat * 10) / 10,
      fiber: Math.round(nutrition.fiber * 10) / 10,
    };
  }

  extractGeminiNutrition(geminiFood: GeminiFoodData): any {
    return {
      calories: geminiFood.calories || 150,
      protein: geminiFood.protein || 8,
      carbs: geminiFood.carbs || 20,
      fat: geminiFood.fat || 5,
      fiber: geminiFood.fiber || 3,
    };
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}

export const nutritionCalculator = new NutritionCalculator();
