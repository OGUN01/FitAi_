import { validationService } from "../../utils/validation";
import { dataTransformation } from "../dataTransformation";
import { MigrationStep, MigrationContext, LocalStorageSchema } from "./types";
import { uploadToSupabase } from "./helpers";

export async function validateDataStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  const validation = validationService.validateLocalStorageSchema(data);

  if (!validation.isValid) {
    throw new Error(
      `Data validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
    );
  }

  context.warnings.push(...validation.warnings.map((w) => w.message));
}

export async function transformDataStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  try {
    if (data.user) {
      console.warn('[Migration] transform step skipped: method not implemented (transformUserData)');
    }

    if (data.fitness) {
      console.warn('[Migration] transform step skipped: method not implemented (transformFitnessData)');
    }

    if (data.nutrition) {
      console.warn('[Migration] transform step skipped: method not implemented (transformNutritionData)');
    }

    if (data.progress) {
      console.warn('[Migration] transform step skipped: method not implemented (transformProgressData)');
    }
  } catch (error) {
    throw new Error(
      `Data transformation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function uploadUserProfileStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  if (!context.transformedData?.user) {
    context.warnings.push("No user data to upload");
    return;
  }

  try {
    const userData = context.transformedData.user;

    if (userData.profile) {
      await uploadToSupabase("profiles", userData.profile, context);
    }

    if (userData.fitnessGoals) {
      await uploadToSupabase("fitness_goals", userData.fitnessGoals, context);
    }

    if (userData.dietPreferences) {
      await uploadToSupabase(
        "diet_preferences",
        userData.dietPreferences,
        context,
      );
    }

    if (userData.workoutPreferences) {
      await uploadToSupabase(
        "workout_preferences",
        userData.workoutPreferences,
        context,
      );
    }

    if (userData.bodyAnalysis) {
      await uploadToSupabase("body_analysis", userData.bodyAnalysis, context);
    }

    context.uploadedData.user = userData;
  } catch (error) {
    throw new Error(
      `Failed to upload user profile: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function uploadFitnessDataStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  if (!context.transformedData?.fitness) {
    context.warnings.push("No fitness data to upload");
    return;
  }

  try {
    const fitnessData = context.transformedData.fitness;

    if (fitnessData.workouts?.length > 0) {
      for (const workout of fitnessData.workouts) {
        await uploadToSupabase("workouts", workout, context);
      }
    }

    if (fitnessData.workoutExercises?.length > 0) {
      for (const workoutExercise of fitnessData.workoutExercises) {
        await uploadToSupabase("workout_exercises", workoutExercise, context);
      }
    }

    context.uploadedData.fitness = fitnessData;
  } catch (error) {
    throw new Error(
      `Failed to upload fitness data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function uploadNutritionDataStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  if (!context.transformedData?.nutrition) {
    context.warnings.push("No nutrition data to upload");
    return;
  }

  try {
    const nutritionData = context.transformedData.nutrition;

    if (nutritionData.meals?.length > 0) {
      for (const meal of nutritionData.meals) {
        await uploadToSupabase("meals", meal, context);
      }
    }

    if (nutritionData.mealFoods?.length > 0) {
      for (const mealFood of nutritionData.mealFoods) {
        await uploadToSupabase("meal_foods", mealFood, context);
      }
    }

    context.uploadedData.nutrition = nutritionData;
  } catch (error) {
    throw new Error(
      `Failed to upload nutrition data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function uploadProgressDataStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  if (!context.transformedData?.progress) {
    context.warnings.push("No progress data to upload");
    return;
  }

  try {
    const progressData = context.transformedData.progress;

    if (progressData.progressEntries?.length > 0) {
      for (const entry of progressData.progressEntries) {
        await uploadToSupabase("progress_entries", entry, context);
      }
    }

    if (progressData.achievements?.length > 0) {
      for (const achievement of progressData.achievements) {
        await uploadToSupabase("achievements", achievement, context);
      }
    }

    context.uploadedData.progress = progressData;
  } catch (error) {
    throw new Error(
      `Failed to upload progress data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function verifyMigrationStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  try {
    const { verifyDataInSupabase } = await import("./helpers");
    await verifyDataInSupabase(context);
  } catch (error) {
    throw new Error(
      `Migration verification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function cleanupLocalStep(
  data: LocalStorageSchema,
  context: MigrationContext,
): Promise<void> {
  try {
    const { enhancedLocalStorage } = await import("../localStorage");
    await enhancedLocalStorage.clearAll();
    context.warnings.push("Local storage cleared after successful migration");
  } catch (error) {
    context.warnings.push(
      `Failed to cleanup local storage: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function createMigrationSteps(): MigrationStep[] {
  return [
    {
      name: "validateData",
      description: "Validate local data integrity",
      weight: 0.1,
      handler: validateDataStep,
      retryable: false,
      critical: true,
    },
    {
      name: "transformData",
      description: "Transform data to Supabase format",
      weight: 0.15,
      handler: transformDataStep,
      retryable: true,
      critical: true,
    },
    {
      name: "uploadUserProfile",
      description: "Upload user profile and preferences",
      weight: 0.15,
      handler: uploadUserProfileStep,
      rollbackHandler: async (context) => {
        const { rollbackUserProfileStep } = await import("./rollback");
        return rollbackUserProfileStep(context);
      },
      retryable: true,
      critical: true,
    },
    {
      name: "uploadFitnessData",
      description: "Upload workout sessions and fitness data",
      weight: 0.2,
      handler: uploadFitnessDataStep,
      rollbackHandler: async (context) => {
        const { rollbackFitnessDataStep } = await import("./rollback");
        return rollbackFitnessDataStep(context);
      },
      retryable: true,
      critical: false,
    },
    {
      name: "uploadNutritionData",
      description: "Upload meal logs and nutrition data",
      weight: 0.2,
      handler: uploadNutritionDataStep,
      rollbackHandler: async (context) => {
        const { rollbackNutritionDataStep } = await import("./rollback");
        return rollbackNutritionDataStep(context);
      },
      retryable: true,
      critical: false,
    },
    {
      name: "uploadProgressData",
      description: "Upload progress measurements and achievements",
      weight: 0.1,
      handler: uploadProgressDataStep,
      rollbackHandler: async (context) => {
        const { rollbackProgressDataStep } = await import("./rollback");
        return rollbackProgressDataStep(context);
      },
      retryable: true,
      critical: false,
    },
    {
      name: "verifyMigration",
      description: "Verify all data was uploaded correctly",
      weight: 0.05,
      handler: verifyMigrationStep,
      retryable: true,
      critical: true,
    },
    {
      name: "cleanupLocal",
      description: "Clean up local storage after successful migration",
      weight: 0.05,
      handler: cleanupLocalStep,
      retryable: false,
      critical: false,
    },
  ];
}
