/**
 * Type definitions for Indian Food Database
 * Curated from ICMR, NIN, and traditional nutrition sources
 * All nutrition values are per 100g serving
 */

export interface IndianFoodData {
  name: string;
  hindiName?: string;
  regionalName?: string;
  region: "north" | "south" | "east" | "west" | "pan-indian";
  category: "main" | "side" | "snack" | "sweet" | "beverage";
  spiceLevel: "mild" | "medium" | "hot" | "extra_hot";
  cookingMethod:
    | "fried"
    | "steamed"
    | "baked"
    | "curry"
    | "grilled"
    | "raw"
    | "boiled";
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
  };
  commonIngredients: string[];
  traditionalServing: number; // in grams
  tags: string[];
}
