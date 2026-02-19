import { Food } from "./food";
import { Macronutrients } from "./nutrition";

export interface MealItem {
  id?: string;
  foodId: string;
  food: Food;
  name?: string;
  quantity: number | string;
  amount?: number;
  unit?: string;
  calories: number;
  macros: Macronutrients;
  notes?: string;
  category?: string;
  preparationTime?: number;
  instructions?: string[];
  preparation?: { time?: number; instructions?: string[] };
  isLogged?: boolean;
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  items: MealItem[];
  totalCalories: number;
  totalMacros: Macronutrients;
  prepTime?: number;
  cookTime?: number;
  difficulty?: MealDifficulty;
  recipe?: Recipe;
  imageUrl?: string;
  tags: string[];
  isPersonalized: boolean;
  aiGenerated: boolean;
  scheduledTime?: string;
  createdAt: string;
  updatedAt: string;
  ingredients?: string[];
  instructions?: string[];
  preparationTime?: number;
  total_carbohydrates?: number;
  timing?: string;
}

export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_workout"
  | "post_workout";

export type MealDifficulty = "easy" | "medium" | "hard";

export interface Recipe {
  instructions: string[];
  ingredients: RecipeIngredient[];
  cookingMethods: CookingMethod[];
  nutritionTips?: string[];
  substitutions?: Substitution[];
}

export interface RecipeIngredient {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  preparation?: string;
  optional?: boolean;
}

export type CookingMethod =
  | "baking"
  | "grilling"
  | "frying"
  | "steaming"
  | "boiling"
  | "sauteing"
  | "roasting"
  | "raw"
  | "blending"
  | "microwaving";

export interface Substitution {
  originalIngredient: string;
  substitute: string;
  ratio: number;
  notes?: string;
}
