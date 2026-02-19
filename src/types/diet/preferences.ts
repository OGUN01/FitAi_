import { DietaryRestriction } from "./meal-planning";
import { Allergen } from "./food";

export interface NutritionPreferences {
  dietaryRestrictions: DietaryRestriction[];
  allergens: Allergen[];
  dislikedFoods: string[];
  preferredCuisines: Cuisine[];
  mealFrequency: number;
  snackFrequency: number;
  cookingSkill: CookingSkill;
  prepTimeLimit: number;
  budgetLevel: BudgetLevel;
  organicPreference: boolean;
  localPreference: boolean;
}

export type Cuisine =
  | "american"
  | "italian"
  | "mexican"
  | "chinese"
  | "japanese"
  | "indian"
  | "thai"
  | "mediterranean"
  | "french"
  | "greek"
  | "middle_eastern"
  | "korean"
  | "vietnamese"
  | "spanish"
  | "german"
  | "british"
  | "african"
  | "caribbean";

export type CookingSkill = "beginner" | "intermediate" | "advanced" | "expert";

export type BudgetLevel = "low" | "moderate" | "high" | "unlimited";
