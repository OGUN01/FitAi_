import { generateUUID } from "../../utils/uuid";
import { ExerciseInstruction, DayWorkout } from "../../types/ai";
import { WorkoutSet } from "../../types/workout";
import { WorkersWorkoutResponse, WorkersExercise } from "./types";
import { getDayOfWeek } from "./helpers";

export function transformWorkoutResponse(
  workersResponse: WorkersWorkoutResponse,
  userId: string,
  date: string = new Date().toISOString(),
): DayWorkout {
  if (!workersResponse.success) {
    throw new Error("Workers API returned unsuccessful response");
  }

  const { data, metadata } = workersResponse;

  const warmUp: ExerciseInstruction[] = (data.warmup || []).map((ex) => ({
    name: ex.exerciseData?.name || "Unknown Exercise",
    duration: ex.duration,
    instructions: ex.exerciseData?.instructions?.join("\n") || ex.notes || "",
  }));

  const coolDown: ExerciseInstruction[] = (data.cooldown || []).map((ex) => ({
    name: ex.exerciseData?.name || "Unknown Exercise",
    duration: ex.duration,
    instructions: ex.exerciseData?.instructions?.join("\n") || ex.notes || "",
  }));

  const exercises: WorkoutSet[] = (data.exercises || []).map((workersEx) => {
    return transformWorkersExerciseToWorkoutSet(workersEx);
  });

  const workoutDifficulty = determineWorkoutDifficulty(metadata);

  const dayWorkout: DayWorkout = {
    id: generateUUID(),
    title: data.title || "AI-Generated Workout",
    description: buildWorkoutDescription(data, metadata),
    category: "strength",
    difficulty: workoutDifficulty,
    duration: data.totalDuration || 60,
    estimatedCalories: estimateCaloriesBurned(
      data.totalDuration || 60,
      metadata,
      data.exercises,
      workoutDifficulty,
    ),
    exercises,
    warmup: exercises.slice(0, 2),
    cooldown: exercises.slice(-2),
    equipment: extractEquipmentList(data),
    targetMuscleGroups: extractTargetMuscles(data),
    icon: "💪",
    tags: buildWorkoutTags(data, metadata),
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),
    dayOfWeek: getDayOfWeek(date),
    subCategory: determineWorkoutSubCategory(data),
    intensityLevel: determineIntensityLevel(metadata),
    warmUp,
    coolDown,
    progressionNotes: buildProgressionNotes(metadata),
    safetyConsiderations: buildSafetyConsiderations(data),
    expectedBenefits: buildExpectedBenefits(data, metadata),
  };

  return dayWorkout;
}

function transformWorkersExerciseToWorkoutSet(
  workersEx: WorkersExercise,
): WorkoutSet {
  return {
    exerciseId: workersEx.exerciseId,
    name: workersEx.exerciseData?.name,
    exerciseData: workersEx.exerciseData,
    sets: workersEx.sets || 3,
    reps: workersEx.reps || 12,
    duration: workersEx.duration,
    restTime: workersEx.restTime || 60,
    notes: workersEx.notes,
  };
}

function buildWorkoutDescription(
  data: WorkersWorkoutResponse["data"],
  metadata: WorkersWorkoutResponse["metadata"],
): string {
  const parts: string[] = [];

  parts.push(`${data.totalDuration}-minute workout`);

  if (metadata.usedCalculatedMetrics && metadata.calculatedMetricsSummary) {
    if (metadata.calculatedMetricsSummary.vo2max) {
      parts.push(
        `VO2 Max: ${metadata.calculatedMetricsSummary.vo2max.toFixed(1)}`,
      );
    }
  }

  if (data.exercises?.length) {
    parts.push(`${data.exercises.length} exercises`);
  }

  return parts.join(" • ");
}

function estimateCaloriesBurned(
  duration: number,
  metadata: WorkersWorkoutResponse["metadata"],
  exercises?: WorkersExercise[],
  difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
): number {
  if (metadata.calculatedMetricsSummary?.tdee && duration > 0) {
    const caloriesPerMinute =
      (metadata.calculatedMetricsSummary.tdee / 1440) * 3;
    const calories = Math.round(duration * caloriesPerMinute);
    console.log(
      `[dataTransformers] TDEE-based calorie estimate: ${calories} kcal`,
    );
    return calories;
  }

  console.log(
    "[dataTransformers] Cannot estimate calories: no TDEE available, will calculate at completion",
  );
  return 0;
}

function extractEquipmentList(data: WorkersWorkoutResponse["data"]): string[] {
  const equipment = new Set<string>();

  const allExercises = [
    ...(data.warmup || []),
    ...(data.exercises || []),
    ...(data.cooldown || []),
  ];

  allExercises.forEach((ex) => {
    if (ex.exerciseData?.equipments) {
      ex.exerciseData.equipments.forEach((eq) => equipment.add(eq));
    }
  });

  return Array.from(equipment);
}

function extractTargetMuscles(data: WorkersWorkoutResponse["data"]): string[] {
  const muscles = new Set<string>();

  const allExercises = [
    ...(data.warmup || []),
    ...(data.exercises || []),
    ...(data.cooldown || []),
  ];

  allExercises.forEach((ex) => {
    if (ex.exerciseData?.targetMuscles) {
      ex.exerciseData.targetMuscles.forEach((muscle) => muscles.add(muscle));
    }
  });

  return Array.from(muscles);
}

function buildWorkoutTags(
  data: WorkersWorkoutResponse["data"],
  metadata: WorkersWorkoutResponse["metadata"],
): string[] {
  const tags: string[] = ["ai-generated", "personalized"];

  if (metadata.usedCalculatedMetrics) {
    tags.push("metrics-optimized");
  }

  if (metadata.validation?.gifCoverageVerified) {
    tags.push("visual-guide");
  }

  if (data.totalDuration < 30) {
    tags.push("quick");
  } else if (data.totalDuration > 60) {
    tags.push("extended");
  }

  return tags;
}

function determineWorkoutSubCategory(
  data: WorkersWorkoutResponse["data"],
): string {
  const muscles = extractTargetMuscles(data);

  if (muscles.some((m) => m.toLowerCase().includes("chest"))) return "chest";
  if (muscles.some((m) => m.toLowerCase().includes("back"))) return "back";
  if (muscles.some((m) => m.toLowerCase().includes("leg"))) return "legs";
  if (muscles.some((m) => m.toLowerCase().includes("shoulder")))
    return "shoulders";
  if (muscles.some((m) => m.toLowerCase().includes("arm"))) return "arms";

  return "full-body";
}

function determineWorkoutDifficulty(
  metadata: WorkersWorkoutResponse["metadata"],
): "beginner" | "intermediate" | "advanced" {
  if (metadata.calculatedMetricsSummary?.vo2max) {
    if (metadata.calculatedMetricsSummary.vo2max > 50) return "advanced";
    if (metadata.calculatedMetricsSummary.vo2max > 35) return "intermediate";
    return "beginner";
  }

  return "intermediate";
}

function determineIntensityLevel(
  metadata: WorkersWorkoutResponse["metadata"],
): string {
  if (
    metadata.validation?.replacementsMade &&
    metadata.validation.replacementsMade > 3
  ) {
    return "moderate";
  }

  if (metadata.calculatedMetricsSummary?.vo2max) {
    if (metadata.calculatedMetricsSummary.vo2max > 50) return "high";
    if (metadata.calculatedMetricsSummary.vo2max > 35) return "moderate";
  }

  return "moderate";
}

function buildProgressionNotes(
  metadata: WorkersWorkoutResponse["metadata"],
): string[] {
  const notes: string[] = [];

  if (metadata.usedCalculatedMetrics) {
    notes.push("Workout optimized based on your current fitness metrics");
  }

  if (metadata.calculatedMetricsSummary?.hasHeartRateZones) {
    notes.push("Use heart rate zones for optimal intensity");
  }

  if (metadata.validation?.replacementsMade) {
    notes.push(
      `${metadata.validation.replacementsMade} exercises adjusted to match your equipment and experience`,
    );
  }

  return notes.length > 0
    ? notes
    : ["Increase weight or reps as you get stronger"];
}

function buildSafetyConsiderations(
  data: WorkersWorkoutResponse["data"],
): string[] {
  const safety: string[] = [
    "Warm up properly before starting",
    "Use proper form to prevent injury",
    "Stay hydrated throughout the workout",
  ];

  if (data.totalDuration > 60) {
    safety.push("Take breaks as needed for longer workouts");
  }

  return safety;
}

function buildExpectedBenefits(
  data: WorkersWorkoutResponse["data"],
  metadata: WorkersWorkoutResponse["metadata"],
): string[] {
  const benefits: string[] = [];

  const muscles = extractTargetMuscles(data);

  if (muscles.length > 0) {
    benefits.push(`Strengthens ${muscles.slice(0, 3).join(", ")}`);
  }

  benefits.push("Improves overall fitness");
  benefits.push("Increases muscle endurance");

  if (metadata.calculatedMetricsSummary?.hasHeartRateZones) {
    benefits.push("Optimizes cardiovascular health");
  }

  return benefits;
}

export function isValidWorkoutResponse(
  response: any,
): response is WorkersWorkoutResponse {
  return (
    response !== null &&
    response !== undefined &&
    typeof response === "object" &&
    "success" in response &&
    "data" in response &&
    response.data &&
    typeof response.data === "object" &&
    "exercises" in response.data &&
    Array.isArray(response.data.exercises)
  );
}

export function generateExerciseId(): string {
  return `exercise_${generateUUID()}`;
}
