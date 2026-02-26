import { ConsumedNutrition, MealProgress, NutritionState } from "./types";

let consumedNutritionCache: ConsumedNutrition | null = null;
let consumedNutritionCacheKey: string = "";
let todaysConsumedNutritionCache: ConsumedNutrition | null = null;
let todaysConsumedNutritionCacheKey: string = "";

/**
 * Clear nutrition selector caches. Must be called on logout to prevent
 * stale data from leaking between user sessions.
 */
export function clearNutritionCache(): void {
  consumedNutritionCache = null;
  consumedNutritionCacheKey = "";
  todaysConsumedNutritionCache = null;
  todaysConsumedNutritionCacheKey = "";
}

export function getConsumedNutrition(state: NutritionState): ConsumedNutrition {
  const cacheKey = JSON.stringify(state.mealProgress) + "_dm" + (state.dailyMeals?.length || 0);

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

  const weeklyResult = completedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Also include daily meals (added from suggestions)
  const dailyMealsTotal = (state.dailyMeals || []).reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const result = {
    calories: weeklyResult.calories + dailyMealsTotal.calories,
    protein: weeklyResult.protein + dailyMealsTotal.protein,
    carbs: weeklyResult.carbs + dailyMealsTotal.carbs,
    fat: weeklyResult.fat + dailyMealsTotal.fat,
  };

  consumedNutritionCache = result;
  consumedNutritionCacheKey = cacheKey;

  return result;
}

export function getTodaysConsumedNutrition(
  state: NutritionState,
): ConsumedNutrition {
  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD for date comparison
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

  const cacheKey = JSON.stringify(state.mealProgress) + "_" + todayDateStr + "_" + todayName + "_dm" + JSON.stringify((state.dailyMeals || []).map(m => `${m.id}:${m.totalCalories || 0}`));

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

  const weeklyResult = todaysCompletedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Only include daily meals created today (dailyMeals persist across days in storage)
  const todaysDailyMeals = (state.dailyMeals || []).filter((meal) => {
    if (!meal.createdAt) return false;
    const mealDate = meal.createdAt.split('T')[0];
    return mealDate === todayDateStr;
  });
  const dailyMealsTotal = todaysDailyMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const result = {
    calories: weeklyResult.calories + dailyMealsTotal.calories,
    protein: weeklyResult.protein + dailyMealsTotal.protein,
    carbs: weeklyResult.carbs + dailyMealsTotal.carbs,
    fat: weeklyResult.fat + dailyMealsTotal.fat,
  };

  todaysConsumedNutritionCache = result;
  todaysConsumedNutritionCacheKey = cacheKey;

  return result;
}
