import { dataBridge } from "../DataBridge";
import { MealLog, SyncStatus } from "../../types/localData";

export async function createMealLog(
  mealLog: MealLog,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    console.log("🍽️ Creating meal log:", {
      id: mealLog.id,
      userId: mealLog.userId || "local-user",
      mealType: mealLog.mealType,
      foodCount: mealLog.foods?.length || 0,
      calories: mealLog.totalCalories,
    });

    await initialize();
    await dataBridge.storeMealLog(mealLog);
    console.log(`✅ Meal log ${mealLog.id} created successfully`);

    const stored = await readMealLog(mealLog.id, initialize);
    if (!stored) {
      console.warn("⚠️ Meal log was not found after creation");
    } else {
      console.log("✅ Meal log verified in storage");
    }
  } catch (error) {
    console.error("❌ Failed to create meal log:", error);
    console.error("Meal data:", JSON.stringify(mealLog, null, 2));
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

    await dataBridge.storeMealLog(updated);
    console.log(`Meal log ${logId} updated successfully`);
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
    console.log(`Meal log ${logId} marked as deleted`);
  } catch (error) {
    console.error("Failed to delete meal log:", error);
    throw error;
  }
}
