import { NutritionInfo } from "./nutrition";

export interface FoodScanResult {
  confidence?: number;
  recognizedFoods: RecognizedFood[];
  nutritionEstimate?: NutritionInfo;
  suggestions: string[];
  needsManualInput: boolean;
}

export interface FoodRecognitionResult extends FoodScanResult {
  foods?: RecognizedFood[];
  data?: RecognizedFood[];
  confidence?: number;
}

export interface RecognizedFood {
  name: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  estimatedQuantity?: {
    amount: number;
    unit: string;
  };
  portionSize?: {
    amount: number;
    unit: string;
  };
  enhancementSource?: "ai" | "manual" | "database";
  id?: string;
  localName?: string;
  category?: "main" | "side" | "snack" | "sweet" | "beverage";
  cuisine?: string;
  estimatedGrams?: number;
  servingDescription?: string;
  userGrams?: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
  };
  nutritionPer100g?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
  };
}
