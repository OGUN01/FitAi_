import { LocalWorkoutSession, MealLog } from "../../types/localData";
import { BatchResult } from "./types";
import { createWorkoutSession } from "./workoutOperations";
import { createMealLog } from "./mealOperations";

export async function batchCreateWorkoutSessions(
  sessions: LocalWorkoutSession[],
  initialize: () => Promise<void>,
): Promise<BatchResult> {
  const result: BatchResult = { success: 0, failed: 0, errors: [] };

  for (const session of sessions) {
    try {
      await createWorkoutSession(session, initialize);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to create session ${session.id}: ${error}`);
    }
  }

  return result;
}

export async function batchCreateMealLogs(
  logs: MealLog[],
  initialize: () => Promise<void>,
): Promise<BatchResult> {
  const result: BatchResult = { success: 0, failed: 0, errors: [] };

  for (const log of logs) {
    try {
      await createMealLog(log, initialize);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to create meal log ${log.id}: ${error}`);
    }
  }

  return result;
}
