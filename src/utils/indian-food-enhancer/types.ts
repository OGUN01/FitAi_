import { RecognizedFood } from "../../services/foodRecognitionService";
import { IndianFoodData } from "../../data/indianFoodDatabase";

/**
 * Regional cuisine types
 */
export type RegionType = "north" | "south" | "east" | "west";

/**
 * Cooking method types
 */
export type CookingMethod =
  | "fried"
  | "steamed"
  | "baked"
  | "curry"
  | "grilled"
  | "raw";

/**
 * Spice level types
 */
export type SpiceLevel = "mild" | "medium" | "hot" | "extra_hot";

/**
 * Food category types
 */
export type FoodCategory = "main" | "side" | "snack" | "sweet" | "beverage";

/**
 * Serving description types
 */
export type ServingDescription = "small" | "medium" | "large" | "traditional";

/**
 * Parameters for applying nutrition corrections
 */
export interface NutritionCorrectionParams {
  baseNutrition: any;
  region: string;
  cookingMethod: string;
  spiceLevel: string;
  portionSize: number;
}

/**
 * Base nutrition interface
 */
export interface BaseNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
}

/**
 * Enhanced food nutrition with required fields
 */
export interface EnhancedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Gemini food data interface
 */
export interface GeminiFoodData {
  name: string;
  estimatedGrams?: number;
  analysisNotes?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  confidence?: number;
}

/**
 * Food type interface
 */
export interface FoodType {
  region?: RegionType;
}

/**
 * Re-export types from dependencies
 */
export type { RecognizedFood, IndianFoodData };
