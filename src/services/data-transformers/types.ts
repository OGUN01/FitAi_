/**
 * Type Definitions for Data Transformers
 *
 * Contains all interfaces and type aliases used in data transformation
 */

// ============================================================================
// WORKERS API RESPONSE TYPES
// ============================================================================

/**
 * Workers Diet API Response Structure
 */
export interface WorkersDietResponse {
  success: boolean;
  data: {
    title: string;
    meals: WorkersMeal[];
    dailyTotals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  metadata: {
    cuisine?: string;
    model?: string;
    aiGenerationTime?: number;
    tokensUsed?: number;
    costUsd?: number;
    validationPassed?: boolean;
    warningsCount?: number;
    warnings?: ValidationWarning[];
    adjustmentApplied?: boolean;
    nutritionalAccuracy?: {
      targetCalories: number;
      actualCalories: number;
      difference: number;
      targetProtein: number;
      actualProtein: number;
      targetCarbs: number;
      actualCarbs: number;
      targetFat: number;
      actualFat: number;
    };
  };
}

export interface WorkersMeal {
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  foods: WorkersFood[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  cookingMethod?: string;
  preparationTime?: number;
  cookingInstructions?: string[];
  tips?: string[];
}

export interface WorkersFood {
  name: string;
  quantity: number;
  unit: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface ValidationWarning {
  severity: "WARNING" | "INFO";
  code: string;
  message: string;
  action?: string;
}

/**
 * Workers Workout API Response Structure
 */
export interface WorkersWorkoutResponse {
  success: boolean;
  data: {
    title: string;
    warmup: WorkersExercise[];
    exercises: WorkersExercise[];
    cooldown: WorkersExercise[];
    totalDuration: number;
  };
  metadata: {
    model?: string;
    aiGenerationTime?: number;
    tokensUsed?: number;
    costUsd?: number;
    filterStats?: {
      initial: number;
      afterEquipment: number;
      afterExperience: number;
      afterInjuries: number;
      final: number;
    };
    usedCalculatedMetrics?: boolean;
    calculatedMetricsSummary?: {
      bmr?: number;
      tdee?: number;
      vo2max?: number;
      hasHeartRateZones?: boolean;
    };
    validation?: {
      exercisesValidated: boolean;
      invalidExercisesFound: number;
      replacementsMade: number;
      gifCoverageVerified: boolean;
      warnings: string[];
    };
  };
}

export interface WorkersExercise {
  exerciseId: string;
  sets?: number;
  reps?: number | string;
  duration?: number;
  restTime?: number;
  notes?: string;
  exerciseData?: {
    exerciseId: string;
    name: string;
    bodyParts: string[];
    targetMuscles: string[];
    equipments: string[];
    gifUrl: string;
    instructions?: string[];
  };
}

/**
 * User-friendly error format for validation failures
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  severity: "error" | "warning" | "info";
  code?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// TYPE ALIASES FOR API COMPATIBILITY
// ============================================================================

export type ValidationError = UserFriendlyError;
