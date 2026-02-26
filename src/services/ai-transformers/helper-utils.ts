import type { WorkoutPreferences } from "../../types/user";
import type { WorkoutPlan } from "../fitaiWorkersClient";
import { WORKOUT_TYPE_MAP } from "./mapping-constants";

export function getWorkoutDaysFromPreferences(
  workoutPreferences?: WorkoutPreferences,
  workoutsPerWeek: number = 3,
): string[] {
  if (
    workoutPreferences?.preferred_workout_times &&
    workoutPreferences.preferred_workout_times.length > 0
  ) {
    return workoutPreferences.preferred_workout_times.slice(0, workoutsPerWeek);
  }

  const allDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  if (workoutsPerWeek === 1) return ["wednesday"];
  if (workoutsPerWeek === 2) return ["tuesday", "friday"];
  if (workoutsPerWeek === 3) return ["monday", "wednesday", "friday"];
  if (workoutsPerWeek === 4) return ["monday", "tuesday", "thursday", "friday"];
  if (workoutsPerWeek === 5)
    return ["monday", "tuesday", "wednesday", "thursday", "friday"];
  if (workoutsPerWeek === 6)
    return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (workoutsPerWeek === 7) return allDays;

  return ["monday", "wednesday", "friday"];
}

export function mapMealType(
  type: string,
): "breakfast" | "lunch" | "dinner" | "snack" {
  const typeMap: Record<string, "breakfast" | "lunch" | "dinner" | "snack"> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snack",
    snack1: "snack",
    snack2: "snack",
    morning_snack: "snack",
    afternoon_snack: "snack",
    evening_snack: "snack",
  };
  return typeMap[type?.toLowerCase()] || "lunch";
}

export function mapDifficultyLevel(
  difficulty?: string,
): "easy" | "medium" | "hard" {
  const diffMap: Record<string, "easy" | "medium" | "hard"> = {
    easy: "easy",
    simple: "easy",
    beginner: "easy",
    medium: "medium",
    moderate: "medium",
    intermediate: "medium",
    hard: "hard",
    difficult: "hard",
    advanced: "hard",
  };
  return diffMap[difficulty?.toLowerCase() || ""] || "easy";
}

export function mapWorkoutCategory(workout: WorkoutPlan): string {
  if (workout.title?.toLowerCase().includes("cardio")) return "cardio";
  if (workout.title?.toLowerCase().includes("hiit")) return "hiit";
  if (workout.title?.toLowerCase().includes("strength")) return "strength";
  if (workout.title?.toLowerCase().includes("yoga")) return "flexibility";
  return "strength";
}

export function mapDifficulty(
  difficulty?: string,
): "beginner" | "intermediate" | "advanced" {
  const diffMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
    beginner: "beginner",
    easy: "beginner",
    intermediate: "intermediate",
    moderate: "intermediate",
    advanced: "advanced",
    hard: "advanced",
    expert: "advanced",
  };
  return diffMap[difficulty?.toLowerCase() || ""] || "intermediate";
}

export function calculateEstimatedCalories(_workout: WorkoutPlan): number {
  return 0;
}

export function transformExercises(workout: WorkoutPlan): any[] {
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  return allExercises.map((ex, index) => ({
    exerciseId: ex.exerciseId || `ex_${index}`,
    sets: ex.sets || 3,
    reps: ex.reps || ex.targetReps || "10-12",
    restTime: ex.restSeconds || ex.restTime || 60,
    weight: undefined,
    exerciseData: ex.exerciseData,
  }));
}

export function transformExerciseItem(ex: any) {
  return {
    exerciseId: ex.exerciseId,
    sets: ex.sets || 1,
    reps: ex.reps || ex.targetReps || "30 seconds",
    restTime: ex.restSeconds || 30,
    exerciseData: ex.exerciseData,
  };
}

export function extractEquipment(workout: WorkoutPlan): string[] {
  const equipment = new Set<string>();
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  for (const ex of allExercises) {
    if (ex.exerciseData?.equipments) {
      ex.exerciseData.equipments.forEach((eq: string) => equipment.add(eq));
    }
  }

  return equipment.size > 0 ? Array.from(equipment) : ["bodyweight"];
}

export function extractTargetMuscles(workout: WorkoutPlan): string[] {
  const muscles = new Set<string>();
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  for (const ex of allExercises) {
    if (ex.exerciseData?.targetMuscles) {
      ex.exerciseData.targetMuscles.forEach((m: string) => muscles.add(m));
    }
    if (ex.exerciseData?.bodyParts) {
      ex.exerciseData.bodyParts.forEach((bp: string) => muscles.add(bp));
    }
  }

  return muscles.size > 0 ? Array.from(muscles) : ["full body"];
}

export function getWorkoutIcon(workout: WorkoutPlan): string {
  const category = mapWorkoutCategory(workout);
  const icons: Record<string, string> = {
    strength: "barbell-outline",
    cardio: "bicycle-outline",
    hiit: "flash-outline",
    flexibility: "body-outline",
  };
  return icons[category] || "fitness-outline";
}
