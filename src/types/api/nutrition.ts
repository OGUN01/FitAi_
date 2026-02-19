// Nutrition API types

export interface CreateMealRequest {
  name: string;
  type: string;
  items: MealItemRequest[];
  recipe?: RecipeRequest;
  tags?: string[];
}

export interface MealItemRequest {
  foodId: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface RecipeRequest {
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  servings?: number;
}

export interface LogMealRequest {
  mealId?: string;
  mealType: string;
  foods: LoggedFoodRequest[];
  timestamp?: string;
  notes?: string;
  photos?: string[];
}

export interface LoggedFoodRequest {
  foodId: string;
  quantity: number;
  unit: string;
}

export interface FoodSearchRequest {
  query: string;
  category?: string;
  barcode?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface FoodSearchResponse {
  foods: FoodDetails[];
  suggestions: string[];
  totalCount: number;
}

export interface FoodDetails {
  id: string;
  name: string;
  brand?: string;
  category: string;
  calories: number;
  macros: MacronutrientDetails;
  servingSize: number;
  servingUnit: string;
  allergens: string[];
  dietaryLabels: string[];
  imageUrl?: string;
  verified: boolean;
}

export interface MacronutrientDetails {
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

export interface CreateFoodRequest {
  name: string;
  brand?: string;
  category: string;
  calories: number;
  macros: MacronutrientDetails;
  servingSize: number;
  servingUnit: string;
  allergens?: string[];
  dietaryLabels?: string[];
  barcode?: string;
  imageUrl?: string;
}
