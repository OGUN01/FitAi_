import { WorkoutSession } from "../../types/localData";
import { SupabaseWorkoutSession } from "./types";

export function transformWorkoutSessionToSupabase(
  session: WorkoutSession,
  userId: string,
): SupabaseWorkoutSession {
  return {
    id: session.id,
    user_id: userId,
    workout_id: session.workoutId,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    duration: session.duration ?? null,
    total_duration_minutes: session.duration ?? null,
    calories_burned: session.caloriesBurned ?? null,
    exercises: session.exercises ?? null,
    notes: session.notes || "",
    rating: session.rating,
    is_completed: session.isCompleted,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function transformSupabaseToWorkoutSession(
  supabaseSession: any,
): WorkoutSession {
  return {
    id: supabaseSession.id,
    workoutId: supabaseSession.workout_id,
    userId: supabaseSession.user_id,
    startedAt: supabaseSession.started_at,
    completedAt: supabaseSession.completed_at,
    duration:
      supabaseSession.total_duration_minutes ?? supabaseSession.duration,
    caloriesBurned: supabaseSession.calories_burned,
    exercises: supabaseSession.exercises ?? [],
    notes: supabaseSession.notes || "",
    rating: supabaseSession.rating || 0,
    isCompleted: supabaseSession.is_completed,
  };
}
