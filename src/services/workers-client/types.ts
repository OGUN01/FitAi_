/**
 * Type definitions for FitAI Workers API Client
 *
 * Contains all type definitions, interfaces, and type guards used by the Workers API client.
 */

// ============================================================================
// METADATA TYPES
// ============================================================================

export interface WorkersRequestMetadata {
  requestId: string;
  timestamp: string;
  userId?: string;
}

export interface WorkersResponseMetadata {
  cached: boolean;
  cacheSource?: "kv" | "database" | "fresh";
  cacheKey?: string;
  generationTime: number;
  model?: string;
  tokensUsed?: number;
  costUsd?: number;
  deduplicated?: boolean;
  waitTime?: number;
  validationPassed?: boolean;
  warningsCount?: number;
  warnings?: any[];
  cuisineDetected?: string;
}

// API Metadata (alias for WorkersResponseMetadata for backwards compatibility)
export type APIMetadata = WorkersResponseMetadata;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  severity: "CRITICAL";
  code: string;
  message: string;
  meal?: string;
  food?: string;
  allergen?: string;
  dietType?: string;
  current?: number;
  target?: number;
  drift?: number;
  type?: "allergen" | "diet_violation" | "calorie_drift" | "macro_imbalance";
  affectedItems?: string[];
  suggestion?: string;
  [key: string]: any;
}

export interface ValidationWarning {
  severity: "WARNING" | "INFO";
  code: string;
  message: string;
  action?: string;
  type?:
    | "low_protein"
    | "low_variety"
    | "low_sodium"
    | "low_fiber"
    | "exercise_replacement"
    | "filtering_info"
    | "gif_coverage";
  suggestions?: string[];
  [key: string]: any;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface WorkersResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: WorkersResponseMetadata;
}

// ============================================================================
// DIET PLAN TYPES
// ============================================================================

export interface DietPlan {
  id: string;
  title: string;
  meals: any[];
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DietGenerationRequest {
  profile: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    activityLevel: string;
    fitnessGoal: string;
  };
  dietPreferences?: {
    dietType?: string;
    allergies?: string[];
    cuisinePreferences?: string[];
    restrictions?: string[];
    dislikes?: string[];
  };
  calorieTarget?: number;
  mealsPerDay?: number;
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
  };
  dietaryRestrictions?: string[];
  excludeIngredients?: string[];
  model?: string;
  temperature?: number;
  async?: boolean; // Enable async job-based generation
}

// ============================================================================
// ASYNC JOB TYPES
// ============================================================================

export type AsyncJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AsyncJobCreatedResponse {
  jobId: string;
  status: AsyncJobStatus;
  message: string;
  estimatedTimeMinutes: number;
}

export interface AsyncJobStatusResponse {
  jobId: string;
  status: AsyncJobStatus;
  result?: DietPlan;
  error?: string;
  estimatedTime?: number;
  metadata?: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    generationTimeMs?: number;
  };
}

// Union type for async diet generation response
export type AsyncDietGenerationResponse = DietPlan | AsyncJobCreatedResponse;

// Type guard to check if response is a cache hit (immediate result)
export function isDietPlanResponse(
  data: AsyncDietGenerationResponse | undefined,
): data is DietPlan {
  return !!data && "meals" in data && Array.isArray((data as DietPlan).meals);
}

// Type guard to check if response is an async job
export function isAsyncJobResponse(
  data: AsyncDietGenerationResponse | undefined,
): data is AsyncJobCreatedResponse {
  return !!data && "jobId" in data && "status" in data;
}

// ============================================================================
// WORKOUT PLAN TYPES
// ============================================================================

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  warmup: any[];
  exercises: any[];
  cooldown: any[];
  totalDuration: number;
}

export interface WorkoutGenerationRequest {
  profile: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    fitnessGoal: string;
    experienceLevel: string;
    availableEquipment: string[];
    injuries?: string[];
  };
  workoutType: string;
  duration: number;
  difficultyOverride?: string;
  focusMuscles?: string[];
  model?: string;
  temperature?: number;
}

// ============================================================================
// FOOD RECOGNITION TYPES
// ============================================================================

export interface FoodRecognitionRequest {
  imageBase64: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  userContext?: {
    region?: string;
    dietaryRestrictions?: string[];
  };
}

export interface FoodRecognitionResponse {
  foods: Array<{
    id: string;
    name: string;
    hindiName?: string;
    category: string;
    cuisine: string;
    region?: string;
    spiceLevel?: string;
    cookingMethod?: string;
    estimatedGrams: number;
    portionConfidence: number;
    servingType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
    ingredients?: string[];
    confidence: number;
    enhancementSource: string;
  }>;
  overallConfidence: number;
  totalCalories: number;
  analysisNotes?: string;
  mealType: string;
}

// ============================================================================
// JOB STATUS TYPES
// ============================================================================

export interface JobStatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  result?: any;
  error?: string;
  estimatedTime?: number;
  metadata?: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    generationTimeMs?: number;
  };
}

export interface JobListResponse {
  jobs: Array<{
    id: string;
    status: string;
    created_at: string;
    completed_at?: string;
    generation_time_ms?: number;
  }>;
}

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

export interface WorkersClientConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}
