// AI generation API types

import { MacronutrientDetails } from "./nutrition";
import { WorkoutDetails } from "./workout";

export interface GenerateWorkoutRequest {
  userProfile: UserProfileSummary;
  preferences: WorkoutGenerationApiPreferences;
  goals: string[];
  equipment: string[];
  duration: number;
  difficulty: string;
  previousWorkouts?: string[];
}

export interface UserProfileSummary {
  age: number;
  gender: string;
  fitnessLevel: string;
  experience: string;
  goals: string[];
  restrictions: string[];
}

// NOTE: Renamed to avoid conflict with WorkoutPreferences from user.ts (database type)
// This type is for AI API workout generation requests only
export interface WorkoutGenerationApiPreferences {
  types: string[];
  intensity: string;
  focusAreas: string[];
  avoidExercises: string[];
}

export interface GenerateWorkoutResponse {
  workout: WorkoutDetails;
  reasoning: string;
  alternatives: WorkoutDetails[];
  progressionTips: string[];
  safetyNotes: string[];
}

export interface GenerateMealRequest {
  userProfile: UserProfileSummary;
  nutritionGoals: NutritionGoals;
  preferences: MealPreferences;
  mealType: string;
  calorieTarget?: number;
  previousMeals?: string[];
}

export interface NutritionGoals {
  calorieTarget: number;
  macroTargets: MacronutrientDetails;
  dietaryRestrictions: string[];
  allergens: string[];
  // Additional properties used in DietScreen
  daily_protein?: number;
  daily_carbs?: number;
  daily_fat?: number;
}

export interface MealPreferences {
  cuisines: string[];
  cookingSkill: string;
  prepTimeLimit: number;
  budgetLevel: string;
  ingredients: string[];
  avoidIngredients: string[];
}

export interface GenerateMealResponse {
  meal: MealDetails;
  reasoning: string;
  alternatives: MealDetails[];
  nutritionAnalysis: string;
  cookingTips: string[];
  shoppingList: ShoppingListItem[];
}

export interface MealDetails {
  id: string;
  name: string;
  type: string;
  items: MealItemDetails[];
  totalCalories: number;
  totalMacros: MacronutrientDetails;
  recipe?: RecipeDetails;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  tags: string[];
}

export interface MealItemDetails {
  food: import("./nutrition").FoodDetails;
  quantity: number;
  unit: string;
  calories: number;
  macros: MacronutrientDetails;
}

export interface RecipeDetails {
  instructions: string[];
  ingredients: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  tips: string[];
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedCost?: number;
  notes?: string;
}
