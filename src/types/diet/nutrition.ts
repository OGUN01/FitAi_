// Nutrition-related TypeScript type definitions

export interface Macronutrients {
  protein: number; // in grams
  carbohydrates: number; // in grams
  fat: number; // in grams
  fiber: number; // in grams
  sugar?: number; // in grams
  sodium?: number; // in mg
}

export interface Micronutrients {
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}

export interface NutritionInfo {
  calories: number; // per serving
  macros: Macronutrients;
  micros?: Micronutrients;
  servingSize: number; // in grams
  servingUnit: string; // 'g', 'ml', 'piece', 'cup', etc.
}
