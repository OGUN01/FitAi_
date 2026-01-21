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
import {
  Workout,
  Meal,
  DailyMealPlan,
  MotivationalContent,
  AIResponse,
  WorkoutSet,
} from "../types/ai";

// Backend client and transformers
import {
  fitaiWorkersClient,
  AuthenticationError,
  WorkersAPIError,
  NetworkError,
} from "../services/fitaiWorkersClient";
import {
  transformForDietRequest,
  transformForWorkoutRequest,
  // transformDietResponseToWeeklyPlan,  // Commented out - not exported
  transformWorkoutResponseToWeeklyPlan,
} from "../services/aiRequestTransformers";

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyWorkoutPlan {
  id: string;
  weekNumber: number;
  workouts: Workout[];
  planTitle?: string;
  planDescription?: string;
  restDays?: number[];
  totalEstimatedCalories?: number;
}

export interface WeeklyMealPlan {
  id: string;
  weekNumber: number;
  meals: any[];
  planTitle?: string;
}

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
    console.log("🏋️ [aiService] generateWorkout called");

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
        },
      );

      console.log("🏋️ [aiService] Calling backend /workout/generate");
      const response = await fitaiWorkersClient.generateWorkoutPlan(request);

      // Store metadata
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || "Failed to generate workout",
        };
      }

      // Transform to single workout
      const weeklyPlan = transformWorkoutResponseToWeeklyPlan(
        response,
        1,
        preferences?.workoutPreferences,
      );
      const workout = weeklyPlan?.workouts[0];

      if (!workout) {
        return {
          success: false,
          error: "No workout generated",
        };
      }

      console.log("✅ [aiService] Workout generated successfully");
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
    },
  ): Promise<AIResponse<Meal>> {
    console.log("🍽️ [aiService] generateMeal called for:", mealType);

    try {
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        preferences?.bodyMetrics,
        preferences?.dietPreferences,
      );

      console.log("🍽️ [aiService] Calling backend /diet/generate");
      const response = await fitaiWorkersClient.generateDietPlan(request);

      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || "Failed to generate meal",
        };
      }

      // Find the meal of requested type
      const meal = response.data.meals?.find(
        (m: any) =>
          m.mealType?.toLowerCase() === mealType ||
          m.type?.toLowerCase() === mealType,
      );

      if (!meal) {
        return {
          success: false,
          error: `No ${mealType} found in generated plan`,
        };
      }

      console.log("✅ [aiService] Meal generated successfully");
      return {
        success: true,
        data: meal as Meal,
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
    },
  ): Promise<AIResponse<DailyMealPlan>> {
    console.log("🍽️ [aiService] generateDailyMealPlan called");

    try {
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        preferences?.bodyMetrics,
        preferences?.dietPreferences,
      );

      console.log("🍽️ [aiService] Calling backend /diet/generate");
      const response = await fitaiWorkersClient.generateDietPlan(request);

      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || "Failed to generate daily meal plan",
        };
      }

      const dailyPlan: DailyMealPlan = {
        date: new Date().toISOString().split("T")[0],
        meals: response.data.meals || [],
        totalCalories: response.data.dailyTotals?.calories || 0,
        totalMacros: {
          protein: response.data.dailyTotals?.protein || 0,
          carbohydrates: response.data.dailyTotals?.carbs || 0,
          fat: response.data.dailyTotals?.fat || 0,
          fiber: 0,
        },
        waterIntake: 0, // Default to 0, will be tracked separately
      };

      console.log("✅ [aiService] Daily meal plan generated successfully");
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
    },
  ): Promise<AIResponse<WeeklyWorkoutPlan>> {
    console.log(
      "🏋️ [aiService] generateWeeklyWorkoutPlan called for week:",
      weekNumber,
    );

    try {
      // ✅ NEW: Transform request with weekly plan (NO FALLBACK)
      const request = transformForWorkoutRequest(
        personalInfo,
        fitnessGoals,
        options?.bodyMetrics,
        options?.workoutPreferences,
        {
          requestWeeklyPlan: true, // ✅ Always request weekly plan
          duration: options?.workoutPreferences?.time_preference || 30,
        },
      );

      console.log(
        "🏋️ [aiService] Calling backend /workout/generate with weekly plan request",
      );
      const response = await fitaiWorkersClient.generateWorkoutPlan(request);

      // Store metadata for UI display
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
        console.log("📊 [aiService] Generation metadata:", {
          cached: response.metadata.cached,
          cacheSource: response.metadata.cacheSource,
          generationTime: response.metadata.generationTime,
          model: response.metadata.model,
        });
      }

      if (!response.success || !response.data) {
        console.error("❌ [aiService] Backend returned error:", response.error);
        return {
          success: false,
          error: response.error || "Failed to generate workout plan",
        };
      }

      // ✅ Backend ALWAYS returns weekly plan (NO FALLBACK)
      const weeklyPlanData = response.data as any;
      console.log(
        "✅ [aiService] Received weekly plan with workouts:",
        weeklyPlanData.workouts?.length,
      );

      // Transform each workout in the weekly plan
      const workouts = weeklyPlanData.workouts.map((w: any) =>
        transformWorkoutData(w.workout, w.dayOfWeek),
      );

      const weeklyPlan: WeeklyWorkoutPlan = {
        id: weeklyPlanData.id || `weekly_workout_${Date.now()}`,
        weekNumber,
        workouts: workouts,
        planTitle: weeklyPlanData.planTitle || "Your Personalized Workout Plan",
        planDescription: weeklyPlanData.planDescription,
        restDays: weeklyPlanData.restDays || [],
        totalEstimatedCalories: weeklyPlanData.totalEstimatedCalories || 0,
      };

      console.log(
        "✅ [aiService] Weekly workout plan transformed successfully:",
        {
          workouts: weeklyPlan.workouts.length,
          title: weeklyPlan.planTitle,
        },
      );

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
    },
  ): Promise<AIResponse<WeeklyMealPlan>> {
    console.log(
      "🍽️ [aiService] generateWeeklyMealPlan called for week:",
      weekNumber,
    );
    console.log("🍽️ [aiService] calorieTarget:", options?.calorieTarget);

    try {
      // Transform request for backend - include calorieTarget from frontend
      const request = transformForDietRequest(
        personalInfo,
        fitnessGoals,
        options?.bodyMetrics,
        options?.dietPreferences,
        options?.calorieTarget,
      );

      console.log("🍽️ [aiService] Calling backend /diet/generate");
      const response = await fitaiWorkersClient.generateDietPlan(request);

      // Store metadata for UI display
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
        console.log("📊 [aiService] Generation metadata:", {
          cached: response.metadata.cached,
          cacheSource: response.metadata.cacheSource,
          generationTime: response.metadata.generationTime,
          model: response.metadata.model,
          cuisineDetected: response.metadata.cuisineDetected,
        });
      }

      if (!response.success || !response.data) {
        console.error("❌ [aiService] Backend returned error:", response.error);
        return {
          success: false,
          error: response.error || "Failed to generate meal plan",
        };
      }

      // Transform backend response to frontend format
      // @ts-ignore - transformDietResponseToWeeklyPlan is temporarily commented out
      const weeklyPlan = transformDietResponseToWeeklyPlan(
        response,
        weekNumber,
      );

      if (!weeklyPlan) {
        return {
          success: false,
          error: "Failed to transform diet response",
        };
      }

      console.log("✅ [aiService] Weekly meal plan generated successfully:", {
        meals: weeklyPlan.meals.length,
        title: weeklyPlan.planTitle,
      });

      return {
        success: true,
        data: weeklyPlan,
      };
    } catch (error) {
      return this.handleError(error, "generateWeeklyMealPlan");
    }
  }

  /**
   * Test backend connection
   */
  async testConnection(): Promise<AIResponse<string>> {
    console.log("🔗 [aiService] Testing backend connection...");

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

      console.log("✅ [aiService] Backend connection successful");
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
function transformWorkoutData(workoutPlan: any, dayOfWeek: string): Workout {
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
      reps: typeof ex.reps === "number" ? ex.reps : 12,
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
      reps: typeof ex.reps === "number" ? ex.reps : 10,
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
    category: "strength", // Default category
    difficulty: difficulty,
    duration: workoutPlan.totalDuration || 30,
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
