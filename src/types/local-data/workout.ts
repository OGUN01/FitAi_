import { Workout, Exercise, WorkoutPlan, WorkoutSession } from "../workout";
import { SyncStatus, SyncMetadata } from "./sync";

export interface LocalWorkout extends Workout {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  isCustom: boolean;
  isFavorite: boolean;
  lastPerformed?: string;
  performanceHistory?: WorkoutPerformance[];
}

export interface WorkoutPerformance {
  sessionId: string;
  performedAt: string;
  duration: number;
  caloriesBurned: number;
  completionRate: number;
  notes?: string;
  modifications?: string[];
  difficulty: "too_easy" | "just_right" | "too_hard";
  mood: "energetic" | "normal" | "tired";
}

export interface LocalWorkoutPlan extends WorkoutPlan {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  progress: {
    startedAt: string;
    currentWeek: number;
    currentDay: number;
    completedWorkouts: string[];
    skippedWorkouts: string[];
    completionRate: number;
  };
}

export interface LocalWorkoutSession extends WorkoutSession {
  localId: string;
  syncStatus: SyncStatus | "local";
  syncMetadata: SyncMetadata;
  mediaFiles?: {
    photos: string[];
    videos: string[];
  };
}

export interface LocalFitnessData {
  workouts?: Workout[];
  exercises?: Exercise[];
  sessions: WorkoutSession[];
  plans?: WorkoutPlan[];
  customExercises?: Exercise[];
}

export { WorkoutSession } from "../workout";
