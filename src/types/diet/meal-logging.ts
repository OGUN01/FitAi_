import { MealType } from "./meal";
import { Macronutrients } from "./nutrition";

export interface MealLog {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  foods: LoggedFood[];
  totalCalories: number;
  totalMacros: Macronutrients;
  notes: string;
  photos: string[];
  timestamp: string;
  mood?: MoodRating;
  hungerBefore?: HungerLevel;
  hungerAfter?: HungerLevel;
  satisfaction?: SatisfactionLevel;
}

export interface LoggedFood {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: Macronutrients;
  mealItemId?: string;
}

export type MoodRating = 1 | 2 | 3 | 4 | 5;
export type HungerLevel = 1 | 2 | 3 | 4 | 5;
export type SatisfactionLevel = 1 | 2 | 3 | 4 | 5;
