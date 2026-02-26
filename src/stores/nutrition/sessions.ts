import { storeLogger } from '../../utils/logger';
import { DayMeal } from "../../ai";
import { SyncStatus } from "../../types/localData";
import { crudOperations } from "../../services/crudOperations";
import { toMealType, createLoggedFood } from "./helpers";
import { CurrentMealSession } from "./types";

export async function startMealSession(
  meal: DayMeal,
  updateMealProgress: (mealId: string, progress: number) => void,
  setCurrentMealSession: (session: CurrentMealSession | null) => void,
): Promise<string> {
  const logId = `log_${meal.id}_${Date.now()}`;

  try {
    const mealLog: import("../../types/localData").MealLog = {
      id: logId,
      mealType: toMealType(meal.type),
      foods: meal.items.map((item, index) =>
        createLoggedFood(item, meal.id, index),
      ),
      totalCalories: meal.totalCalories || 0,
      totalMacros: {
        protein: meal.totalMacros?.protein ?? 0,
        carbohydrates: meal.totalMacros?.carbohydrates ?? 0,
        fat: meal.totalMacros?.fat ?? 0,
        fiber: meal.totalMacros?.fiber ?? 0,
      },
      loggedAt: new Date().toISOString(),
      photos: [],
      syncStatus: SyncStatus.PENDING,
      syncMetadata: {
        lastSyncedAt: undefined,
        lastModifiedAt: new Date().toISOString(),
        syncVersion: 1,
        deviceId: "dev-device",
      },
    };

    await crudOperations.createMealLog(mealLog);

    setCurrentMealSession({
      mealId: meal.id,
      logId,
      startedAt: new Date().toISOString(),
      ingredients: meal.items.map((item, index) => ({
        ingredientId: `${meal.id}_${index}`,
        completed: false,
        quantity: typeof item.quantity === "number" ? item.quantity : 100,
      })),
    });

    updateMealProgress(meal.id, 0);

    return logId;
  } catch (error) {
    storeLogger.error('Failed to start meal session', { error: String(error) });
    throw error;
  }
}

export async function endMealSession(
  logId: string,
  currentSession: CurrentMealSession | null,
  completeMeal: (mealId: string, logId?: string) => Promise<void>,
  setCurrentMealSession: (session: CurrentMealSession | null) => void,
): Promise<void> {
  try {
    if (!currentSession) {
      throw new Error("No active meal session");
    }

    await crudOperations.updateMealLog(logId, {
      notes:
        ((await crudOperations.readMealLog(logId))?.notes || "") +
        " [COMPLETED]",
    });

    await completeMeal(currentSession.mealId, logId);

    setCurrentMealSession(null);

  } catch (error) {
    storeLogger.error('Failed to end meal session', { error: String(error) });
    throw error;
  }
}

export function updateIngredientProgress(
  ingredientId: string,
  quantity: number,
  currentSession: CurrentMealSession | null,
  updateMealProgress: (mealId: string, progress: number) => void,
  setCurrentMealSession: (session: CurrentMealSession | null) => void,
): CurrentMealSession | null {
  if (!currentSession) return null;

  const updatedIngredients = currentSession.ingredients.map((ingredient) => {
    if (ingredient.ingredientId === ingredientId) {
      return {
        ...ingredient,
        quantity,
        completed: quantity > 0,
      };
    }
    return ingredient;
  });

  const totalIngredients = updatedIngredients.length;
  const completedIngredients = updatedIngredients.filter(
    (ing) => ing.completed,
  ).length;
  const progressPercent = Math.round(
    (completedIngredients / totalIngredients) * 100,
  );

  updateMealProgress(currentSession.mealId, progressPercent);

  const updatedSession = {
    ...currentSession,
    ingredients: updatedIngredients,
  };

  setCurrentMealSession(updatedSession);

  return updatedSession;
}
