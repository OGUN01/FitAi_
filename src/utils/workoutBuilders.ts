/**
 * Shared utility for building DayWorkout objects from workout templates.
 * Single source of truth — replaces duplicated functions in
 * CreateWorkoutScreen, TemplateLibraryScreen, and ScheduleBuilderScreen.
 */
import type { DayWorkout } from "../types/ai";
import type { WorkoutTemplate, TemplateExercise } from "../services/workoutTemplateService";
import { CURATED_EXERCISES } from "../data/curatedExercises";

interface BuildDayWorkoutOptions {
  /** Day of week for the workout (e.g. 'monday'). Defaults to current day. */
  dayOfWeek?: string;
  /** Whether this is an extra/bonus workout (not part of a weekly plan). Defaults to true. */
  isExtra?: boolean;
}

/**
 * Converts a WorkoutTemplate into a DayWorkout that can be used in
 * workout sessions or assigned to weekly plan slots.
 */
export function buildDayWorkoutFromTemplate(
  template: WorkoutTemplate,
  options: BuildDayWorkoutOptions = {},
): DayWorkout {
  const dayOfWeek =
    options.dayOfWeek ??
    new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const isExtra = options.isExtra ?? true;

  return {
    id: isExtra
      ? `template_${template.id}`
      : `custom_${dayOfWeek}_${template.id}`,
    title: template.name,
    description: template.description || `Custom workout: ${template.name}`,
    category: "strength",
    difficulty: "intermediate",
    duration: template.estimatedDurationMinutes || 45,
    estimatedCalories: 0,
    exercises: template.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets,
      reps:
        ex.repRange[0] === ex.repRange[1]
          ? ex.repRange[0]
          : `${ex.repRange[0]}-${ex.repRange[1]}`,
      restTime: ex.restSeconds,
      weight: ex.targetWeightKg,
    })),
    equipment: [],
    targetMuscleGroups: template.targetMuscleGroups,
    icon: "dumbbell",
    tags: template.targetMuscleGroups,
    isPersonalized: true,
    aiGenerated: false,
    createdAt: template.createdAt,
    dayOfWeek,
    subCategory: "custom",
    intensityLevel: "moderate",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    isExtra,
  };
}

/**
 * Builds a DayWorkout directly from a list of exercises (no template needed).
 * Used by ScheduleBuilder's exercise-to-day mode.
 */
export function buildDayWorkoutFromExercises(
  exercises: TemplateExercise[],
  dayOfWeek: string,
  workoutName: string = "Custom Workout",
): DayWorkout {
  const muscleGroups = [
    ...new Set(exercises.flatMap((ex) => {
      const curated = CURATED_EXERCISES.find((c) => c.id === ex.exerciseId);
      return curated ? curated.muscleGroups : [];
    })),
  ];

  // Deterministic ID: stable across re-saves as long as exercise list is unchanged.
  // Changing/adding/removing exercises produces a new hash (correct — different workout).
  const exerciseFingerprint = exercises.map(e => e.exerciseId).sort().join(':');
  const simpleHash = exerciseFingerprint
    .split('')
    .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    .toString(36);

  return {
    id: `custom_${dayOfWeek}_${simpleHash}`,
    title: workoutName,
    description: `${exercises.length} exercises`,
    category: "strength",
    difficulty: "intermediate",
    duration: Math.round(exercises.reduce((sum, ex) => sum + ex.sets * 2, 0)), // rough estimate: 2 min per set
    estimatedCalories: 0,
    exercises: exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets,
      reps:
        ex.repRange[0] === ex.repRange[1]
          ? ex.repRange[0]
          : `${ex.repRange[0]}-${ex.repRange[1]}`,
      restTime: ex.restSeconds,
      weight: ex.targetWeightKg,
    })),
    equipment: [],
    targetMuscleGroups: muscleGroups,
    icon: "dumbbell",
    tags: [],
    isPersonalized: true,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    dayOfWeek,
    subCategory: "custom",
    intensityLevel: "moderate",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    isExtra: false,
  };
}
