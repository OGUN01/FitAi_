// Type definitions for cooking flow generator

import { DayMeal } from "../../ai";

export interface CookingStep {
  step: number;
  instruction: string;
  timeRequired?: number;
  tips?: string;
  icon?: string;
}

export interface CookingFlow {
  steps: CookingStep[];
  totalTime: number;
  difficulty: "easy" | "medium" | "hard";
  equipmentNeeded: string[];
  proTips: string[];
}

export type CookingMethod =
  | "scrambled"
  | "grilled"
  | "stir-fry"
  | "curry"
  | "salad"
  | "smoothie"
  | "soup"
  | "roasted"
  | "steamed"
  | "boiled"
  | "baked"
  | "fried"
  | "sauteed"
  | "general";

export { DayMeal };
