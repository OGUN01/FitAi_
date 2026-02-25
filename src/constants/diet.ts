export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
] as const;

export type MealTypeId = (typeof MEAL_TYPES)[number]['id'];

export const MEAL_TYPE_IDS = MEAL_TYPES.map((m) => m.id) as [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

/**
 * Fallback daily calorie target used when no user profile data is available.
 * This is only for edge cases (new users, missing onboarding data).
 * Prefer useCalculatedMetrics().dailyCalories for personalized targets.
 */
export const FALLBACK_DAILY_CALORIES = 2000;
