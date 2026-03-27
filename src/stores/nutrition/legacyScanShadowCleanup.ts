type MealLike = {
  id?: string | null;
  tags?: string[] | null;
};

type MealProgressLike = {
  mealId?: string;
  planMealId?: string;
};

type CurrentMealSessionLike = {
  mealId: string;
};

interface LegacyScanShadowStateLike<
  TMeal extends MealLike,
  TWeeklyMealPlan extends { meals?: TMeal[] } | null,
  TMealProgress extends MealProgressLike,
  TCurrentMealSession extends CurrentMealSessionLike | null | undefined,
> {
  weeklyMealPlan: TWeeklyMealPlan;
  mealProgress: Record<string, TMealProgress>;
  currentMealSession?: TCurrentMealSession;
}

interface LegacyScanShadowPruneResult<
  TMeal extends MealLike,
  TWeeklyMealPlan extends { meals?: TMeal[] } | null,
  TMealProgress extends MealProgressLike,
  TCurrentMealSession extends CurrentMealSessionLike | null | undefined,
> {
  weeklyMealPlan: TWeeklyMealPlan;
  mealProgress: Record<string, TMealProgress>;
  currentMealSession?: TCurrentMealSession;
  removedMealIds: string[];
}

export function isLegacyScanShadowMeal(
  meal: MealLike | null | undefined,
): boolean {
  if (!meal || typeof meal.id !== "string" || !Array.isArray(meal.tags)) {
    return false;
  }

  return meal.id.startsWith("scanned_") && meal.tags.includes("scanned");
}

export function pruneLegacyScanShadowState(
  state: LegacyScanShadowStateLike<
    MealLike,
    { meals?: MealLike[] } | null,
    MealProgressLike,
    CurrentMealSessionLike | null | undefined
  >,
): LegacyScanShadowPruneResult<
  MealLike,
  { meals?: MealLike[] } | null,
  MealProgressLike,
  CurrentMealSessionLike | null | undefined
> | null {
  const existingMeals = state.weeklyMealPlan?.meals || [];
  const filteredMeals = existingMeals.filter(
    (meal) => !isLegacyScanShadowMeal(meal),
  );

  if (filteredMeals.length === existingMeals.length) {
    return null;
  }

  const removedMealIds = existingMeals
    .filter(isLegacyScanShadowMeal)
    .map((meal) => meal.id)
    .filter((mealId): mealId is string => typeof mealId === "string");
  const removedMealIdSet = new Set(removedMealIds);

  const mealProgress = Object.fromEntries(
    Object.entries(state.mealProgress || {}).filter(([key, progress]) => {
      if (removedMealIdSet.has(key)) {
        return false;
      }

      return !(
        (progress?.mealId && removedMealIdSet.has(progress.mealId)) ||
        (progress?.planMealId && removedMealIdSet.has(progress.planMealId))
      );
    }),
  );

  const currentMealSession =
    state.currentMealSession?.mealId &&
    removedMealIdSet.has(state.currentMealSession.mealId)
      ? null
      : state.currentMealSession;

  return {
    weeklyMealPlan:
      filteredMeals.length > 0 && state.weeklyMealPlan
        ? {
            ...state.weeklyMealPlan,
            meals: filteredMeals,
          }
        : null,
    mealProgress,
    currentMealSession,
    removedMealIds,
  };
}

export function filterLegacyScanShadowMeals<T extends MealLike>(
  meals: T[] | null | undefined,
): T[] {
  return (meals || []).filter((meal) => !isLegacyScanShadowMeal(meal));
}

export function sanitizeLegacyScanShadowPersistedState<T extends {
  weeklyMealPlan?: { meals?: MealLike[] } | null;
  mealProgress?: Record<string, MealProgressLike>;
} | null | undefined>(persistedState: T): T {
  if (!persistedState) {
    return persistedState;
  }

  const cleanedState = pruneLegacyScanShadowState({
    weeklyMealPlan: persistedState.weeklyMealPlan ?? null,
    mealProgress: persistedState.mealProgress ?? {},
    currentMealSession: null,
  });

  if (!cleanedState) {
    return persistedState;
  }

  return {
    ...persistedState,
    weeklyMealPlan: cleanedState.weeklyMealPlan,
    mealProgress: cleanedState.mealProgress,
  };
}
