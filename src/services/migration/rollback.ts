import { MigrationContext } from "./types";
import { deleteFromSupabase } from "./helpers";

export async function rollbackUserProfileStep(
  context: MigrationContext,
): Promise<void> {
  if (context.uploadedData.user) {
    try {
      await deleteFromSupabase("profiles", context.userId, context);
      await deleteFromSupabase("fitness_goals", context.userId, context);
      await deleteFromSupabase("diet_preferences", context.userId, context);
      await deleteFromSupabase("workout_preferences", context.userId, context);
      await deleteFromSupabase("body_analysis", context.userId, context);
      delete context.uploadedData.user;
    } catch (error) {
      context.warnings.push(
        `Failed to rollback user profile: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function rollbackFitnessDataStep(
  context: MigrationContext,
): Promise<void> {
  if (context.uploadedData.fitness) {
    try {
      const query = `DELETE FROM workouts WHERE user_id = '${context.userId}'`;
      const query2 = `DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = '${context.userId}')`;
      delete context.uploadedData.fitness;
    } catch (error) {
      context.warnings.push(
        `Failed to rollback fitness data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function rollbackNutritionDataStep(
  context: MigrationContext,
): Promise<void> {
  if (context.uploadedData.nutrition) {
    try {
      const query = `DELETE FROM meals WHERE user_id = '${context.userId}'`;
      const query2 = `DELETE FROM meal_foods WHERE meal_id IN (SELECT id FROM meals WHERE user_id = '${context.userId}')`;
      delete context.uploadedData.nutrition;
    } catch (error) {
      context.warnings.push(
        `Failed to rollback nutrition data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function rollbackProgressDataStep(
  context: MigrationContext,
): Promise<void> {
  if (context.uploadedData.progress) {
    try {
      const query = `DELETE FROM progress_entries WHERE user_id = '${context.userId}'`;
      const query2 = `DELETE FROM achievements WHERE user_id = '${context.userId}'`;
      delete context.uploadedData.progress;
    } catch (error) {
      context.warnings.push(
        `Failed to rollback progress data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
