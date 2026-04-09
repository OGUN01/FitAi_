/**
 * AI Module - Main Entry Point
 *
 * CONNECTED TO CLOUDFLARE WORKERS BACKEND
 * Base URL: https://fitai-workers.sharmaharsh9887.workers.dev
 *
 * Endpoints:
 * - Workout Generation: POST /workout/generate
 * - Diet Generation: POST /diet/generate
 *
 * Authentication: JWT token from Supabase Auth (required)
 * Features: Caching, deduplication, cuisine detection, allergen validation
 */

// ============================================================================
// EXPORTS
// ============================================================================

export { MOTIVATIONAL_CONTENT_SCHEMA } from "./schemas";

// Feature Engines - Keep these (they use demo data for UI)
export { workoutEngine } from "../features/workouts/WorkoutEngine";
export { nutritionEngine } from "../features/nutrition/NutritionEngine";

// AI Types
export * from "../types/ai";

// Data (static data - not AI-related)
export * from "../data/exercises";
export * from "../data/achievements";

// ============================================================================
// IMPORTS
// ============================================================================

import { MOTIVATIONAL_CONTENT_SCHEMA } from "./schemas";
import { workoutEngine } from "../features/workouts/WorkoutEngine";
import { nutritionEngine } from "../features/nutrition/NutritionEngine";
import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  BodyMetrics,
} from "../types/user";
import { AdvancedReviewData } from "../types/onboarding";
import {
  Workout,
  Meal,
  DayMeal,
  DailyMealPlan,
  MotivationalContent,
  AIResponse,
  WorkoutSet,
  WeeklyWorkoutPlan,
  WeeklyMealPlan,
} from "../types/ai";

// Backend client and transformers
import {
  fitaiWorkersClient,
  AuthenticationError,
  WorkersAPIError,
  NetworkError,
  AsyncJobStatusResponse,
  isDietPlanResponse,
  isAsyncJobResponse,
} from "../services/fitaiWorkersClient";
import {
  transformForDietRequest,
  transformForWorkoutRequest,
  transformDietResponseToWeeklyPlan,
  transformWorkoutResponseToWeeklyPlan,
} from "../services/aiRequestTransformers";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";
import { getLocalDateString } from "../utils/weekUtils";

// ============================================================================
// TYPES
// ============================================================================


export interface AIServiceMetadata {
  cached: boolean;
  cacheSource?: "kv" | "database" | "fresh";
  generationTime: number;
  model?: string;
  tokensUsed?: number;
  costUsd?: number;
  cuisineDetected?: string;
}

// ============================================================================
// UNIFIED AI SERVICE (Connected to Cloudflare Workers)
// ============================================================================

// MAX_POLL_ATTEMPTS = 30 (at 6s interval = 3 minutes max)
const MAX_POLL_ATTEMPTS = 30;

class UnifiedAIService {
  private lastMetadata: AIServiceMetadata | null = null;

  /**
   * Check if backend is reachable and user is authenticated
   */
  async isRealAIAvailable(): Promise<boolean> {
    try {
      const status = await fitaiWorkersClient.testConnection();
      return status.connected && status.authenticated;
    } catch {
      return false;
    }
  }

  /**
   * Get last generation metadata (caching info, cost, etc.)
   */
  getLastMetadata(): AIServiceMetadata | null {
    return this.lastMetadata;
  }

  /**
   * Generate a single workout using backend API
   */
  async generateWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      workoutType?: string;
      duration?: number;
      focusMuscles?: string[];
      bodyMetrics?: BodyMetrics;
      workoutPreferences?: WorkoutPreferences;
    },
  ): Promise<AIResponse<Workout>> {

    try {
      // Transform request for backend
      const request = transformForWorkoutRequest(
        personalInfo,
        fitnessGoals,
        preferences?.bodyMetrics,
        preferences?.workoutPreferences,
        {
          workoutType: preferences?.workoutType,
          duration: preferences?.duration,
          focusMuscles: preferences?.focusMuscles,
          currentWeightKg: resolveCurrentWeightFromStores({
            bodyAnalysisWeight: preferences?.bodyMetrics?.current_weight_kg,
          }).value,
        },
      );

      const response = await fitaiWorkersClient.generateWorkoutPlan(request);

      // NOTE: Schemas in src/ai/schemas.ts are JSON Schema format (not Zod).
      // Full response validation against WORKOUT_SCHEMA is not yet implemented here.
      // Unknown or extra fields from the AI backend are passed through as-is.

      // Store metadata
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error('[AIService] Workout generation failed — no fallback available:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate workout. Please try again.',
          retryable: true,
        };
      }

      // Transform to single workout
      const userWeight = resolveCurrentWeightFromStores({
        bodyAnalysisWeight: preferences?.bodyMetrics?.current_weight_kg,
      }).value;
      const weeklyPlan = transformWorkoutResponseToWeeklyPlan(
        response,
        1,
        preferences?.workoutPreferences,
        userWeight ?? undefined,
      );
      const workout = weeklyPlan?.workouts[0];

      if (!workout) {
        return {
          success: false,
          error: 'No workout generated. Please try again.',
          retryable: true,
        };
      }

      return {
        success: true,
        data: workout,
      };
    } catch (error) {
      return this.handleError(error, "generateWorkout");
    }
  }

  /**
   * Generate a single meal using backend API
   */
  async generateMeal(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: "breakfast" | "lunch" | "dinner" | "snack",
    preferences?: {
      bodyMetrics?: BodyMetrics;
      dietPreferences?: DietPreferences;
      calorieTarget?: number;
    },
  ): Promise<AIResponse<DayMeal>> {
    try {
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        preferences?.bodyMetrics,
        preferences?.dietPreferences,
        preferences?.calorieTarget,
        {
          currentWeightKg: resolveCurrentWeightFromStores({
            bodyAnalysisWeight: preferences?.bodyMetrics?.current_weight_kg,
          }).value,
        },
      );
      const response = await fitaiWorkersClient.generateDietPlan(request);
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }
      if (!response.success || !response.data) {
        console.error('[AIService] Meal generation failed — no fallback available:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate meal. Please try again.',
          retryable: true,
        };
      }

      // Transform backend response to frontend-compatible WeeklyMealPlan
      const weekNumber = Math.ceil(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      const weeklyPlan = transformDietResponseToWeeklyPlan(
        response,
        weekNumber,
      );

      if (!weeklyPlan || !weeklyPlan.meals || weeklyPlan.meals.length === 0) {
        return {
          success: false,
          error: "No meals found in generated plan",
        };
      }
      // Find the meal of requested type, fall back to first available meal
      const meal =
        weeklyPlan.meals.find(
          (m) => m.type?.toLowerCase() === mealType,
        ) ?? weeklyPlan.meals[0];
      return {
        success: true,
        data: meal,
      };
    } catch (error) {
      return this.handleError(error, "generateMeal");
    }
  }

  /**
   * Generate daily meal plan using backend API
   */
  async generateDailyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      bodyMetrics?: BodyMetrics;
      dietPreferences?: DietPreferences;
      calorieTarget?: number;
    },
  ): Promise<AIResponse<DailyMealPlan>> {

    try {
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        preferences?.bodyMetrics,
        preferences?.dietPreferences,
        preferences?.calorieTarget,
        {
          currentWeightKg: resolveCurrentWeightFromStores({
            bodyAnalysisWeight: preferences?.bodyMetrics?.current_weight_kg,
          }).value,
        },
      );

      const response = await fitaiWorkersClient.generateDietPlan(request);

      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error('[AIService] Daily meal plan generation failed — no fallback available:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate daily meal plan. Please try again.',
          retryable: true,
        };
      }

      const weeklyPlan = transformDietResponseToWeeklyPlan(response, 1);
      const transformedMeals = weeklyPlan?.meals || [];

      const dailyPlan: DailyMealPlan = {
        date: getLocalDateString(),
        meals: transformedMeals as unknown as Meal[],
        totalCalories: response.data.dailyTotals?.calories || 0,
        totalMacros: {
          protein: response.data.dailyTotals?.protein || 0,
          carbohydrates: response.data.dailyTotals?.carbs || 0,
          fat: response.data.dailyTotals?.fat || 0,
          fiber: 0,
        },
        waterIntake: 0, // Default to 0, will be tracked separately
      };

      return {
        success: true,
        data: dailyPlan,
      };
    } catch (error) {
      return this.handleError(error, "generateDailyMealPlan");
    }
  }

  /**
   * Generate motivational content (placeholder - not critical feature)
   */
  async generateMotivationalContent(
    personalInfo: PersonalInfo,
    currentStreak: number = 0,
  ): Promise<AIResponse<MotivationalContent>> {
    // This is a non-critical feature - return placeholder content
    console.warn(
      "⚠️ [aiService] Motivational content uses placeholder (not yet migrated)",
    );
    return {
      success: true,
      data: {
        dailyTip: {
          icon: "💡",
          title: "Daily Fitness Tip",
          content: "Stay hydrated and remember to warm up before your workout.",
          category: "exercise" as const,
        },
        encouragement: {
          message:
            currentStreak > 0
              ? `Amazing! You're on a ${currentStreak}-day streak!`
              : "Today is a great day to start your fitness journey!",
          emoji: "💪",
          tone: "energetic" as const,
        },
        challenge: {
          title: "Weekly Consistency Challenge",
          description: "Complete all planned workouts this week",
          reward: "Achievement unlocked!",
          duration: "7 days",
          difficulty: "medium" as const,
        },
        quote: {
          text: "Every rep counts! Keep pushing toward your goals.",
          author: "FitAI",
          context: "fitness motivation",
        },
        factOfTheDay: {
          fact: "Regular exercise can boost your mood and energy levels throughout the day.",
          source: "Health Research",
        },
        personalizedMessage: {
          content:
            currentStreak > 0
              ? `You're making great progress! Keep up the ${currentStreak}-day streak!`
              : "Start today and build momentum towards your fitness goals!",
          basedOn: "current_streak",
        },
      },
    };
  }

  /**
   * Generate weekly workout plan using backend API
   *
   * IMPORTANT: Requires authenticated user (Supabase login)
   */
  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1,
    options?: {
      bodyMetrics?: BodyMetrics;
      workoutPreferences?: WorkoutPreferences;
      regenerationSeed?: number;
      advancedReview?: AdvancedReviewData | null; // H13: Wire health-based recommendations
    },
  ): Promise<AIResponse<WeeklyWorkoutPlan>> {

    try {
      // ✅ NEW: Transform request with weekly plan (NO FALLBACK)
      const request = transformForWorkoutRequest(
        personalInfo,
        fitnessGoals,
        options?.bodyMetrics,
        options?.workoutPreferences,
        {
          requestWeeklyPlan: true, // ✅ Always request weekly plan
          duration: options?.workoutPreferences?.time_preference ?? 0,
          currentWeightKg: resolveCurrentWeightFromStores({
            bodyAnalysisWeight: options?.bodyMetrics?.current_weight_kg,
          }).value,
          weekNumber,
          regenerationSeed: options?.regenerationSeed,
          advancedReview: options?.advancedReview, // H13: Pass to transformer
        },
      );

      const response = await fitaiWorkersClient.generateWorkoutPlan(request);

      // Store metadata for UI display
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error("❌ [aiService] Backend returned error:", response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate workout plan. Please try again.',
          retryable: true,
        };
      }

      // ✅ Backend ALWAYS returns weekly plan (NO FALLBACK)
      const weeklyPlanData = response.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

      // Transform each workout in the weekly plan
      const daySlotCounts = new Map<string, number>();
      const workouts = (weeklyPlanData.workouts || []).map((w: any) => {
        const currentSlot = daySlotCounts.get(w.dayOfWeek) ?? 0;
        daySlotCounts.set(w.dayOfWeek, currentSlot + 1);
        return transformWorkoutData(w.workout, w.dayOfWeek, currentSlot);
      });

      const weeklyPlan: WeeklyWorkoutPlan = {
        id: weeklyPlanData.id || `weekly_workout_week_${weekNumber}`,
        weekNumber,
        workouts: workouts,
        planTitle: weeklyPlanData.planTitle || "Your Personalized Workout Plan",
        planDescription: weeklyPlanData.planDescription,
        restDays: weeklyPlanData.restDays || [],
        totalEstimatedCalories: weeklyPlanData.totalEstimatedCalories || 0,
      };


      return {
        success: true,
        data: weeklyPlan,
      };
    } catch (error) {
      return this.handleError(error, "generateWeeklyWorkoutPlan");
    }
  }

  /**
   * Generate weekly meal plan using backend API
   *
   * IMPORTANT: calorieTarget must be passed from frontend (from useCalculatedMetrics)
   * This ensures both guest and authenticated users have the calorie target.
   */
  async generateWeeklyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1,
    options?: {
      bodyMetrics?: BodyMetrics;
      dietPreferences?: DietPreferences;
      calorieTarget?: number;
      advancedReview?: AdvancedReviewData | null;
    },
  ): Promise<AIResponse<WeeklyMealPlan>> {

    try {
      // Transform request for backend - include calorieTarget from frontend
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        options?.bodyMetrics,
        options?.dietPreferences,
        options?.calorieTarget,
        {
          daysCount: 7,
          advancedReview: options?.advancedReview,
          currentWeightKg: resolveCurrentWeightFromStores({
            bodyAnalysisWeight: options?.bodyMetrics?.current_weight_kg,
          }).value,
        },
      );

      const response = await fitaiWorkersClient.generateDietPlan(request);

      // Store metadata for UI display
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error("❌ [aiService] Backend returned error:", response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate meal plan. Please try again.',
          retryable: true,
        };
      }

      // Transform backend response to frontend format
      const weeklyPlan = transformDietResponseToWeeklyPlan(
        response,
        weekNumber,
        { requestedDaysCount: 7 },
      );

      if (!weeklyPlan) {
        return {
          success: false,
          error: 'Received meal plan data could not be processed. Please try regenerating.',
          retryable: true,
        };
      }


      return {
        success: true,
        data: weeklyPlan,
      };
    } catch (error) {
      return this.handleError(error, "generateWeeklyMealPlan");
    }
  }

  /**
   * Generate weekly meal plan using ASYNC mode
   * This is designed for long-running generation (60-120 seconds)
   * Returns either a cached result or a job ID for polling
   *
   * @returns { jobId: string } if async job was started, or { plan: WeeklyMealPlan } if cache hit
   */
  async generateWeeklyMealPlanAsync(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1,
    options?: {
      bodyMetrics?: BodyMetrics;
      dietPreferences?: DietPreferences;
      calorieTarget?: number;
      advancedReview?: AdvancedReviewData | null;
    },
  ): Promise<
    AIResponse<
      | { type: "cache_hit"; plan: WeeklyMealPlan }
      | { type: "job_started"; jobId: string; estimatedTimeMinutes: number }
    >
  > {

    try {
      // Transform request for backend - include calorieTarget from frontend
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        options?.bodyMetrics,
        options?.dietPreferences,
        options?.calorieTarget,
        {
          daysCount: 7,
          advancedReview: options?.advancedReview,
          currentWeightKg: resolveCurrentWeightFromStores({
            bodyAnalysisWeight: options?.bodyMetrics?.current_weight_kg,
          }).value,
        },
      );

      const response = await fitaiWorkersClient.generateDietPlanAsync(request);

      if (!response.success || !response.data) {
        console.error("Backend returned error:", response.error);
        return {
          success: false,
          error: response.error || "Failed to generate meal plan",
        };
      }

      // Check if we got a cache hit (immediate result)
      if (isDietPlanResponse(response.data)) {

        // Store metadata for UI display
        if (response.metadata) {
          this.lastMetadata = response.metadata as AIServiceMetadata;
        }

        // Transform backend response to frontend format
        const weeklyPlan = transformDietResponseToWeeklyPlan(
          { ...response, data: response.data },
          weekNumber,
          { requestedDaysCount: 7 },
        );

        if (!weeklyPlan) {
          return {
            success: false,
            error: "Failed to transform diet response",
          };
        }

        return {
          success: true,
          data: { type: "cache_hit", plan: weeklyPlan },
        };
      }

      // Async job was created
      if (isAsyncJobResponse(response.data)) {
        return {
          success: true,
          data: {
            type: "job_started",
            jobId: response.data.jobId,
            estimatedTimeMinutes: response.data.estimatedTimeMinutes || 2,
          },
        };
      }

      return {
        success: false,
        error: "Unexpected response format",
      };
    } catch (error) {
      return this.handleError(error, "generateWeeklyMealPlanAsync");
    }
  }

  /**
   * Check async job status and get result when completed.
   * Callers should pass a monotonically incrementing `attempts` counter.
   * When attempts >= MAX_POLL_ATTEMPTS (30 × 6s = 3 min) this returns a timeout error.
   */
  async checkMealPlanJobStatus(
    jobId: string,
    weekNumber: number = 1,
    attempts: number = 0,
  ): Promise<
    AIResponse<{
      status: "pending" | "processing" | "completed" | "failed" | "cancelled";
      plan?: WeeklyMealPlan;
      error?: string;
      generationTimeMs?: number;
    }>
  > {
    try {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        return { success: false, error: 'Meal plan generation timed out. Please try again.', timedOut: true };
      }

      const response = await fitaiWorkersClient.getJobStatus(jobId);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || "Failed to check job status",
        };
      }

      const jobData = response.data;

      // If completed, transform the result
      if (jobData.status === "completed" && jobData.result) {
        const weeklyPlan = transformDietResponseToWeeklyPlan(
          { success: true, data: jobData.result },
          weekNumber,
          { requestedDaysCount: 7 },
        );

        return {
          success: true,
          data: {
            status: "completed",
            plan: weeklyPlan ?? undefined,
            generationTimeMs: jobData.metadata?.generationTimeMs,
          },
        };
      }

      // Return current status
      return {
        success: true,
        data: {
          status: jobData.status,
          error: jobData.error,
        },
      };
    } catch (error) {
      return this.handleError(error, "checkMealPlanJobStatus");
    }
  }

  /**
   * Test backend connection
   */
  async testConnection(): Promise<AIResponse<string>> {

    try {
      const status = await fitaiWorkersClient.testConnection();

      if (!status.connected) {
        return {
          success: false,
          error: status.error || "Backend not reachable",
          data: "Connection failed",
        };
      }

      if (!status.authenticated) {
        return {
          success: false,
          error: status.error || "User not authenticated",
          data: "Authentication required",
        };
      }

      return {
        success: true,
        data: `Connected to FitAI Workers ${status.backendVersion}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
        data: "Error during connection test",
      };
    }
  }

  /**
   * Get AI service status
   */
  getAIStatus(): {
    isAvailable: boolean;
    mode: "real" | "demo";
    message: string;
    modelVersion?: string;
  } {
    return {
      isAvailable: true,
      mode: "real",
      modelVersion: "google/gemini-2.0-flash-exp",
      message:
        "✅ Connected to FitAI Workers backend (https://fitai-workers.sharmaharsh9887.workers.dev)",
    };
  }

  /**
   * Handle errors from API calls
   */
  private handleError(error: unknown, context: string): AIResponse<any> {
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
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * ✅ NEW: Transform workout data from backend to frontend Workout format
 */
function transformWorkoutData(
  workoutPlan: any,
  dayOfWeek: string,
  slotIndex: number = 0,
): Workout {
  // Map difficulty
  const difficultyMap: Record<
    string,
    "beginner" | "intermediate" | "advanced"
  > = {
    beginner: "beginner",
    intermediate: "intermediate",
    advanced: "advanced",
  };
  const difficulty = difficultyMap[workoutPlan.difficulty] || "intermediate";

  // Transform exercises
  const exercises: WorkoutSet[] = (workoutPlan.exercises || []).map(
    (ex: any, idx: number) => ({
      id: `${dayOfWeek}_ex_${idx}`,
      exerciseId: ex.exerciseId,
      sets: ex.sets || 3,
      reps: typeof ex.reps === "number" ? ex.reps : (ex.reps || "8-12"),
      duration: ex.duration,
      restTime: ex.restSeconds || ex.restTime || 60,
      notes: ex.notes,
    }),
  );

  // Transform warmup
  const warmup: WorkoutSet[] = (workoutPlan.warmup || []).map(
    (ex: any, idx: number) => ({
      id: `${dayOfWeek}_warmup_${idx}`,
      exerciseId: ex.exerciseId,
      sets: ex.sets || 1,
      reps: typeof ex.reps === "number" ? ex.reps : (ex.reps || "10"),
      duration: ex.duration,
      restTime: ex.restSeconds || ex.restTime || 30,
      notes: ex.notes,
    }),
  );

  // Transform cooldown
  const cooldown: WorkoutSet[] = (workoutPlan.cooldown || []).map(
    (ex: any, idx: number) => ({
      id: `${dayOfWeek}_cooldown_${idx}`,
      exerciseId: ex.exerciseId,
      sets: ex.sets || 1,
      reps: typeof ex.reps === "number" ? ex.reps : (ex.reps || "10"),
      duration: ex.duration,
      restTime: ex.restSeconds || ex.restTime || 30,
      notes: ex.notes,
    }),
  );

  return {
    id: `${dayOfWeek}_workout_${slotIndex}`,
    title: workoutPlan.title || "AI Generated Workout",
    description: workoutPlan.description || "",
    category: "strength", // Default category
    difficulty: difficulty,
    duration: workoutPlan.totalDuration ?? 0,
    estimatedCalories: workoutPlan.estimatedCalories || 0, // 0 = will be calculated at completion with user's real weight
    exercises: exercises,
    warmup: warmup,
    cooldown: cooldown,
    equipment: [], // Will be populated by exercise data
    targetMuscleGroups: [], // Will be populated by exercise data
    icon: "fitness",
    tags: ["ai-generated", difficulty],
    isPersonalized: true,
    aiGenerated: true,
    dayOfWeek: dayOfWeek,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new UnifiedAIService();
export default aiService;
