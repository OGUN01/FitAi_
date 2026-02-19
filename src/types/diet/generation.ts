import { Meal, MealType, MealDifficulty } from "./meal";
import { DietaryRestriction } from "./meal-planning";
import { Allergen, FoodCategory } from "./food";
import { Macronutrients } from "./nutrition";
import { Cuisine } from "./preferences";

export interface MealGenerationRequest {
  userId: string;
  mealType: MealType;
  calorieTarget?: number;
  macroTargets?: Partial<Macronutrients>;
  dietaryRestrictions: DietaryRestriction[];
  allergens: Allergen[];
  cuisinePreference?: Cuisine;
  prepTimeLimit?: number;
  difficulty?: MealDifficulty;
  ingredients?: string[];
  excludeIngredients?: string[];
  previousMeals?: string[];
}

export interface MealGenerationResponse {
  meal: Meal;
  alternatives?: Meal[];
  reasoning: string;
  nutritionAnalysis: string;
  cookingTips: string[];
  shoppingList: ShoppingListItem[];
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category: FoodCategory;
  estimated_cost?: number;
  notes?: string;
}
