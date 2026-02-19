import { MealType } from "./meal";
import { Macronutrients } from "./nutrition";

export interface NutritionAnalytics {
  averageDailyCalories: number;
  averageDailyMacros: Macronutrients;
  calorieGoalAdherence: number;
  macroGoalAdherence: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  mealConsistency: number;
  favoriteFood: string;
  mostLoggedMealType: MealType;
  nutritionScore: number;
  weeklyTrends: {
    week: string;
    calories: number;
    macros: Macronutrients;
    adherence: number;
  }[];
  monthlyTrends: {
    month: string;
    calories: number;
    macros: Macronutrients;
    adherence: number;
  }[];
}
