/**
 * Types and interfaces for exercise visual service
 */

export interface ExerciseData {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseAPIResponse {
  success: boolean;
  metadata: {
    totalPages: number;
    totalExercises: number;
    currentPage: number;
    previousPage: string | null;
    nextPage: string | null;
  };
  data: ExerciseData[];
}

export interface ExerciseMatchResult {
  exercise: ExerciseData;
  confidence: number;
  matchType: "exact" | "fuzzy" | "partial";
}

export interface CacheStats {
  size: number;
  exercises: number;
}
