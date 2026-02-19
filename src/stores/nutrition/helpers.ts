import * as crypto from "expo-crypto";
import { MealItem } from "../../ai";
import { LoggedFood } from "../../types/localData";
import { MealType, VALID_MEAL_TYPES } from "./types";

export function toMealType(value: string | undefined): MealType {
  const normalized = (value || "snack").toLowerCase();
  if (VALID_MEAL_TYPES.includes(normalized as MealType)) {
    return normalized as MealType;
  }
  if (normalized.includes("break") || normalized.includes("morning"))
    return "breakfast";
  if (normalized.includes("lunch") || normalized.includes("noon"))
    return "lunch";
  if (normalized.includes("dinner") || normalized.includes("evening"))
    return "dinner";
  return "snack";
}

export function createLoggedFood(
  item: MealItem,
  mealId: string,
  index: number,
): LoggedFood {
  return {
    id: `food_${mealId}_${index}`,
    foodId: `food_${mealId}_${index}`,
    quantity: typeof item.quantity === "number" ? item.quantity : 100,
    unit: "grams",
    calories: item.calories || 0,
    macros: {
      protein: item.macros?.protein ?? 0,
      carbohydrates: item.macros?.carbohydrates ?? 0,
      fat: item.macros?.fat ?? 0,
      fiber: item.macros?.fiber ?? 0,
    },
  };
}
