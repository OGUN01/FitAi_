import { ExerciseData, ExerciseMatchResult } from "./types";
import { ExerciseCacheService } from "./cacheService";
import { fetchExercisePage } from "./apiService";

export async function preloadPopularExercises(
  cacheService: ExerciseCacheService,
): Promise<void> {
  try {
    console.log("🏋️ Preloading popular exercises...");
    const exercises: ExerciseData[] = [];

    for (let page = 1; page <= 30; page++) {
      const response = await fetchExercisePage(page, 10);
      if (response.success) {
        exercises.push(...response.data);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await cacheService.saveExercises(exercises);
    console.log(`🏋️ Preloaded ${exercises.length} exercises successfully`);
  } catch (error) {
    console.error("Failed to preload exercises:", error);
  }
}

export async function preloadWorkoutVisuals(
  exerciseNames: string[],
  findExercise: (
    name: string,
    useAdvanced: boolean,
  ) => Promise<ExerciseMatchResult | null>,
): Promise<Map<string, ExerciseMatchResult | null>> {
  console.log(`🚀 Preloading visuals for ${exerciseNames.length} exercises...`);
  const results = new Map<string, ExerciseMatchResult | null>();
  const startTime = Date.now();

  const promises = exerciseNames.map(async (exerciseName) => {
    try {
      const result = await findExercise(exerciseName, true);
      results.set(exerciseName, result);
      return { exerciseName, success: !!result };
    } catch (error) {
      console.error(`Failed to preload visual for ${exerciseName}:`, error);
      results.set(exerciseName, null);
      return { exerciseName, success: false };
    }
  });

  const loadResults = await Promise.all(promises);
  const successCount = loadResults.filter((r) => r.success).length;
  const loadTime = Date.now() - startTime;

  console.log(
    `✅ Preloaded ${successCount}/${exerciseNames.length} exercise visuals in ${loadTime}ms`,
  );
  console.log(
    `📊 Success rate: ${Math.round((successCount / exerciseNames.length) * 100)}%`,
  );

  return results;
}

export async function preloadWorkoutPlanVisuals(
  workoutPlan: { exercises: string[] }[],
  findExercise: (
    name: string,
    useAdvanced: boolean,
  ) => Promise<ExerciseMatchResult | null>,
): Promise<void> {
  const allExercises = workoutPlan
    .flatMap((workout) => workout.exercises)
    .filter((exercise, index, array) => array.indexOf(exercise) === index);

  console.log(
    `🎯 Preloading entire workout plan: ${allExercises.length} unique exercises`,
  );
  await preloadWorkoutVisuals(allExercises, findExercise);
}
