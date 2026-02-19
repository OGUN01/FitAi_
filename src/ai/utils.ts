import { Workout, WorkoutSet, AIResponse } from "../types/ai";
import {
  AuthenticationError,
  WorkersAPIError,
  NetworkError,
} from "../services/fitaiWorkersClient";

export function transformWorkoutData(
  workoutPlan: any,
  dayOfWeek: string,
): Workout {
  const difficultyMap: Record<
    string,
    "beginner" | "intermediate" | "advanced"
  > = {
    beginner: "beginner",
    intermediate: "intermediate",
    advanced: "advanced",
  };
  const difficulty = difficultyMap[workoutPlan.difficulty] || "intermediate";

  const exercises: WorkoutSet[] = (workoutPlan.exercises || []).map(
    (ex: any, idx: number) => ({
      id: `${dayOfWeek}_ex_${idx}`,
      exerciseId: ex.exerciseId,
      sets: ex.sets || 3,
      reps: typeof ex.reps === "number" ? ex.reps : 12,
      duration: ex.duration,
      restTime: ex.restSeconds || ex.restTime || 60,
      notes: ex.notes,
    }),
  );

  const warmup: WorkoutSet[] = (workoutPlan.warmup || []).map(
    (ex: any, idx: number) => ({
      id: `${dayOfWeek}_warmup_${idx}`,
      exerciseId: ex.exerciseId,
      sets: ex.sets || 1,
      reps: typeof ex.reps === "number" ? ex.reps : 10,
      duration: ex.duration,
      restTime: ex.restSeconds || ex.restTime || 30,
      notes: ex.notes,
    }),
  );

  const cooldown: WorkoutSet[] = (workoutPlan.cooldown || []).map(
    (ex: any, idx: number) => ({
      id: `${dayOfWeek}_cooldown_${idx}`,
      exerciseId: ex.exerciseId,
      sets: ex.sets || 1,
      reps: typeof ex.reps === "number" ? ex.reps : 10,
      duration: ex.duration,
      restTime: ex.restSeconds || ex.restTime || 30,
      notes: ex.notes,
    }),
  );

  return {
    id: `${dayOfWeek}_workout_${Date.now()}`,
    title: workoutPlan.title || "AI Generated Workout",
    description: workoutPlan.description || "",
    category: "strength",
    difficulty: difficulty,
    duration: workoutPlan.totalDuration || 30,
    estimatedCalories: workoutPlan.estimatedCalories || 0,
    exercises: exercises,
    warmup: warmup,
    cooldown: cooldown,
    equipment: [],
    targetMuscleGroups: [],
    icon: "fitness",
    tags: ["ai-generated", difficulty],
    isPersonalized: true,
    aiGenerated: true,
    dayOfWeek: dayOfWeek,
    createdAt: new Date().toISOString(),
  };
}

export function handleError(error: unknown, context: string): AIResponse<any> {
  console.error(`❌ [aiService] Error in ${context}:`, error);

  if (error instanceof AuthenticationError) {
    return {
      success: false,
      error: "Authentication required. Please sign in to use AI features.",
    };
  }

  if (error instanceof WorkersAPIError) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (error instanceof NetworkError) {
    return {
      success: false,
      error: "Network error. Please check your connection and try again.",
    };
  }

  return {
    success: false,
    error:
      error instanceof Error ? error.message : "An unexpected error occurred",
  };
}
