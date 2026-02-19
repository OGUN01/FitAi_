import { ConsumedNutrition, MealProgress, NutritionState } from "./types";

let consumedNutritionCache: ConsumedNutrition | null = null;
let consumedNutritionCacheKey: string = "";
let todaysConsumedNutritionCache: ConsumedNutrition | null = null;
let todaysConsumedNutritionCacheKey: string = "";

export function getConsumedNutrition(state: NutritionState): ConsumedNutrition {
  const cacheKey = JSON.stringify(state.mealProgress);

  if (consumedNutritionCache && consumedNutritionCacheKey === cacheKey) {
    return consumedNutritionCache;
  }

  const completedMealIds = Object.entries(state.mealProgress)
    .filter(([_, progress]) => progress.progress === 100)
    .map(([id]) => id);

  const completedMealIdSet = new Set(completedMealIds);

  const completedMeals =
    state.weeklyMealPlan?.meals.filter((meal) =>
      completedMealIdSet.has(meal.id),
    ) || [];

  const result = completedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  consumedNutritionCache = result;
  consumedNutritionCacheKey = cacheKey;

  return result;
}

export function getTodaysConsumedNutrition(
  state: NutritionState,
): ConsumedNutrition {
  const today = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const todayName = dayNames[today.getDay()];

  const cacheKey = JSON.stringify(state.mealProgress) + "_" + todayName;

  if (
    todaysConsumedNutritionCache &&
    todaysConsumedNutritionCacheKey === cacheKey
  ) {
    return todaysConsumedNutritionCache;
  }

  const completedMealIds = Object.entries(state.mealProgress)
    .filter(([_, progress]) => progress.progress === 100)
    .map(([id]) => id);

  const completedMealIdSet = new Set(completedMealIds);

  const todaysCompletedMeals =
    state.weeklyMealPlan?.meals.filter(
      (meal) => completedMealIdSet.has(meal.id) && meal.dayOfWeek === todayName,
    ) || [];

  const result = todaysCompletedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  todaysConsumedNutritionCache = result;
  todaysConsumedNutritionCacheKey = cacheKey;

  return result;
}
