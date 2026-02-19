import { Meal } from "./meal";
import { Macronutrients } from "./nutrition";
import { Allergen } from "./food";

export interface DailyMealPlan {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalMacros: Macronutrients;
  waterIntake: number;
  adherence?: number;
  notes?: string;
}

export interface NutritionPlan {
  id: string;
  title: string;
  description: string;
  duration: number;
  dailyPlans: DailyMealPlan[];
  calorieTarget: number;
  macroTargets: Macronutrients;
  dietaryRestrictions: DietaryRestriction[];
  goals: NutritionGoal[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "keto"
  | "paleo"
  | "mediterranean"
  | "low_carb"
  | "low_fat"
  | "high_protein"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "halal"
  | "kosher";

export type NutritionGoal =
  | "weight_loss"
  | "weight_gain"
  | "muscle_gain"
  | "maintenance"
  | "performance"
  | "health"
  | "energy"
  | "recovery";
