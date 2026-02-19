// Type definitions for data transformation service
import { Database } from "../supabase";

export type SupabaseProfile =
  Database["public"]["Tables"]["profiles"]["Insert"];
export type SupabaseWorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Insert"];
export type SupabaseMealLog =
  Database["public"]["Tables"]["meal_logs"]["Insert"];
export type SupabaseProgressEntry =
  Database["public"]["Tables"]["progress_entries"]["Insert"];

export type TransformationType = "profile" | "workout" | "meal" | "progress";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflictFields: string[];
  recommendations: string[];
}

export type ConflictResolution = "local" | "remote" | "merge";
