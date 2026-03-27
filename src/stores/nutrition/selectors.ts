import { ConsumedNutrition, MealProgress, NutritionState } from "./types";
import { getLocalDateString } from "../../utils/weekUtils";

let consumedNutritionCache: ConsumedNutrition | null = null;
let lastConsumedMealProgressRef: Record<string, MealProgress> | null = null;
let lastConsumedDailyMealsRef: any[] | null = null;
let todaysConsumedNutritionCache: ConsumedNutrition | null = null;
let lastTodaysMealProgressRef: Record<string, MealProgress> | null = null;
let lastTodaysDailyMealsRef: any[] | null = null;
let lastTodaysDateStr: string = "";

/**
 * Clear nutrition selector caches. Must be called on logout to prevent
 * stale data from leaking between user sessions.
 */
export function clearNutritionCache(): void {
  consumedNutritionCache = null;
  lastConsumedMealProgressRef = null;
  lastConsumedDailyMealsRef = null;
  todaysConsumedNutritionCache = null;
  lastTodaysMealProgressRef = null;
  lastTodaysDailyMealsRef = null;
  lastTodaysDateStr = "";
}

export function getConsumedNutrition(state: NutritionState): ConsumedNutrition {
  // O(1) reference-equality check instead of JSON.stringify
  if (
    consumedNutritionCache &&
    state.mealProgress === lastConsumedMealProgressRef &&
    state.dailyMeals === lastConsumedDailyMealsRef
  ) {
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

  const weeklyResult = completedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
      fiber: acc.fiber + (meal.totalMacros?.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  // Also include daily meals (added from suggestions)
  const dailyMealsTotal = (state.dailyMeals || []).reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
      fiber: acc.fiber + (meal.totalMacros?.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const result = {
    calories: weeklyResult.calories + dailyMealsTotal.calories,
    protein: weeklyResult.protein + dailyMealsTotal.protein,
    carbs: weeklyResult.carbs + dailyMealsTotal.carbs,
    fat: weeklyResult.fat + dailyMealsTotal.fat,
    fiber: weeklyResult.fiber + dailyMealsTotal.fiber,
  };

  consumedNutritionCache = result;
  lastConsumedMealProgressRef = state.mealProgress;
  lastConsumedDailyMealsRef = state.dailyMeals;

  return result;
}

export function getTodaysConsumedNutrition(
  state: NutritionState,
): ConsumedNutrition {
  const today = new Date();
  const todayDateStr = getLocalDateString(today); // YYYY-MM-DD in local timezone for date comparison
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

  // O(1) reference-equality check + date check instead of JSON.stringify
  if (
    todaysConsumedNutritionCache &&
    state.mealProgress === lastTodaysMealProgressRef &&
    state.dailyMeals === lastTodaysDailyMealsRef &&
    todayDateStr === lastTodaysDateStr
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

  const weeklyResult = todaysCompletedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
      fiber: acc.fiber + (meal.totalMacros?.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  // Only include daily meals created today (dailyMeals persist across days in storage)
  const todaysDailyMeals = (state.dailyMeals || []).filter((meal) => {
    if (!meal.createdAt) return false;
    const mealDate = meal.createdAt.split("T")[0];
    return mealDate === todayDateStr;
  });
  const dailyMealsTotal = todaysDailyMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
      fiber: acc.fiber + (meal.totalMacros?.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const result = {
    calories: weeklyResult.calories + dailyMealsTotal.calories,
    protein: weeklyResult.protein + dailyMealsTotal.protein,
    carbs: weeklyResult.carbs + dailyMealsTotal.carbs,
    fat: weeklyResult.fat + dailyMealsTotal.fat,
    fiber: weeklyResult.fiber + dailyMealsTotal.fiber,
  };

  todaysConsumedNutritionCache = result;
  lastTodaysMealProgressRef = state.mealProgress;
  lastTodaysDailyMealsRef = state.dailyMeals;
  lastTodaysDateStr = todayDateStr;

  return result;
}
