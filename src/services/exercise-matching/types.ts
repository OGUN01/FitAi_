import { ExerciseMatchResult } from "../exerciseVisualService";

// Enhanced matching types
export interface AdvancedMatchResult extends ExerciseMatchResult {
  tier: "exact" | "fuzzy" | "semantic" | "classification" | "generated";
  processingTime: number;
  fallbackData?: GeneratedExerciseData;
}

export interface GeneratedExerciseData {
  name: string;
  description: string;
  instructions: string[];
  equipment: string[];
  targetMuscles: string[];
  safetyTips: string[];
  alternatives: string[];
  classification: ExerciseClassification;
}

export interface ExerciseClassification {
  primaryMovement:
    | "push"
    | "pull"
    | "squat"
    | "hinge"
    | "carry"
    | "rotation"
    | "isolation";
  muscleGroup: "upper" | "lower" | "core" | "full-body";
  equipment: "bodyweight" | "weights" | "cardio" | "flexibility";
  intensity: "low" | "moderate" | "high" | "explosive";
}

export interface ExercisePattern {
  keywords: string[];
  classification: ExerciseClassification;
  fallbackExercise: string;
  genericGifUrl?: string;
}

export interface PerformanceMetrics {
  totalRequests: number;
  tierUsage: {
    exact: number;
    fuzzy: number;
    semantic: number;
    classification: number;
    generated: number;
  };
  averageResponseTime: number;
}

// Exercise classification patterns for instant matching
export const EXERCISE_PATTERNS: ExercisePattern[] = [
  // Push movements
  {
    keywords: ["push", "press", "chest", "shoulder", "tricep"],
    classification: {
      primaryMovement: "push",
      muscleGroup: "upper",
      equipment: "weights",
      intensity: "moderate",
    },
    fallbackExercise: "push up",
  },

  // Pull movements
  {
    keywords: ["pull", "row", "lat", "back", "bicep", "chin"],
    classification: {
      primaryMovement: "pull",
      muscleGroup: "upper",
      equipment: "weights",
      intensity: "moderate",
    },
    fallbackExercise: "pull up",
  },

  // Squat patterns
  {
    keywords: ["squat", "quad", "glute", "leg", "thigh"],
    classification: {
      primaryMovement: "squat",
      muscleGroup: "lower",
      equipment: "weights",
      intensity: "moderate",
    },
    fallbackExercise: "squat",
  },

  // Hinge patterns
  {
    keywords: ["deadlift", "hinge", "hamstring", "hip", "posterior"],
    classification: {
      primaryMovement: "hinge",
      muscleGroup: "lower",
      equipment: "weights",
      intensity: "moderate",
    },
    fallbackExercise: "deadlift",
  },

  // Core/Rotation
  {
    keywords: ["plank", "core", "abs", "rotation", "twist", "crunch"],
    classification: {
      primaryMovement: "rotation",
      muscleGroup: "core",
      equipment: "bodyweight",
      intensity: "moderate",
    },
    fallbackExercise: "plank",
  },

  // Cardio movements
  {
    keywords: ["jump", "cardio", "hiit", "explosive", "plyometric", "burpee"],
    classification: {
      primaryMovement: "carry",
      muscleGroup: "full-body",
      equipment: "cardio",
      intensity: "explosive",
    },
    fallbackExercise: "jumping jacks",
  },
];
