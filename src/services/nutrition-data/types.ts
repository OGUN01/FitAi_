// Types for nutrition data

export interface Food {
  id: string;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  image_url?: string;
  barcode?: string;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber?: number;
  consumed_at: string;
  created_at: string;
  foods?: MealFood[];
}

export interface MealFood {
  id: string;
  meal_id: string;
  food_id: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food?: Food;
}

export interface UserDietPreferences {
  id: string;
  user_id: string;
  diet_type: string[];
  allergies: string[];
  dislikes: string[];
  daily_calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  created_at: string;
  updated_at: string;
}

export interface NutritionGoals {
  id: string;
  user_id: string;
  daily_calories: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  // Alternative field names used by some screens
  daily_protein?: number;
  daily_carbs?: number;
  daily_fat?: number;
  daily_water_ml?: number;
  macroTargets?: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface NutritionDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
