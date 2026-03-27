import { dataBridge } from "../DataBridge";
import { MealLog, SyncStatus } from "../../types/localData";

export async function createMealLog(
  mealLog: MealLog,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await initialize();
    const existing = await readMealLog(mealLog.id, initialize);
    if (existing) {
      console.warn(
        `[createMealLog] Skipping duplicate — id ${mealLog.id} already exists`,
      );
      return;
    }
    await dataBridge.storeMealLog(mealLog);
  } catch (error) {
    console.error("❌ Failed to create meal log:", error, "| id:", mealLog?.id, "type:", mealLog?.mealType);
    throw error;
  }
}

export async function readMealLogs(
  date: string | undefined,
  limit: number | undefined,
  initialize: () => Promise<void>,
): Promise<MealLog[]> {
  try {
    await initialize();
    return await dataBridge.getMealLogs(date, limit);
  } catch (error) {
    console.error("Failed to read meal logs:", error);
    return [];
  }
}

export async function readMealLog(
  logId: string,
  initialize: () => Promise<void>,
): Promise<MealLog | null> {
  try {
    await initialize();
    const logs = await dataBridge.getMealLogs();
    return logs.find((log) => log.id === logId) || null;
  } catch (error) {
    console.error("Failed to read meal log:", error);
    return null;
  }
}

export async function updateMealLog(
  logId: string,
  updates: Partial<MealLog>,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await initialize();
    const existing = await readMealLog(logId, initialize);
    if (!existing) {
      throw new Error(`Meal log ${logId} not found`);
    }

    const updated: MealLog = {
      ...existing,
      ...updates,
      syncStatus: SyncStatus.PENDING,
    };

    const stored = await dataBridge.updateMealLog(logId, updated);
    if (!stored) {
      throw new Error(`Meal log ${logId} could not be updated in local storage`);
    }
  } catch (error) {
    console.error("Failed to update meal log:", error);
    throw error;
  }
}

export async function deleteMealLog(
  logId: string,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await updateMealLog(
      logId,
      {
        notes:
          (await readMealLog(logId, initialize))?.notes + " [DELETED]" ||
          "[DELETED]",
      },
      initialize,
    );
  } catch (error) {
    console.error("Failed to delete meal log:", error);
    throw error;
  }
}
