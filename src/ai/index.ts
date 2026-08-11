/**
 * AI Module - Main Entry Point
 *
 * CONNECTED TO CLOUDFLARE WORKERS BACKEND
 * Base URL: https://fitai-workers.fitai-prod.workers.dev
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

// Feature Engines - wrap aiService (the real Cloudflare Workers backend) with
// exercise-DB enrichment. workoutEngine.generateSmartWorkout and
// nutritionEngine's meal-generation methods are AI-backed via aiService;
// only their "quick"/local-only variants use static data.
export { workoutEngine } from '../features/workouts/WorkoutEngine';
export { nutritionEngine } from '../features/nutrition/NutritionEngine';

// AI Types
export * from '../types/ai';

// Data (static data - not AI-related)
export * from '../data/exercises';
export * from '../data/achievements';

// ============================================================================
// IMPORTS
// ============================================================================

import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  BodyMetrics,
} from '../types/user';
import { AdvancedReviewData } from '../types/onboarding';
import {
  Workout,
  DayWorkout,
  Meal,
  DayMeal,
  DailyMealPlan,
  AIResponse,
  WorkoutSet,
  WeeklyWorkoutPlan,
  WeeklyMealPlan,
} from '../types/ai';

// Backend client and transformers
import {
  fitaiWorkersClient,
  AuthenticationError,
  WorkersAPIError,
  NetworkError,
  isDietPlanResponse,
  isAsyncJobResponse,
  type PriorPerformanceEntry,
} from '../services/fitaiWorkersClient';
import { supabase } from '../services/supabase';
import {
  transformForDietRequest,
  transformForWorkoutRequest,
  transformDietResponseToWeeklyPlan,
  transformWorkoutResponseToWeeklyPlan,
} from '../services/aiRequestTransformers';
import { resolveCurrentWeightFromStores } from '../services/currentWeight';
import { useProfileStore } from '../stores/profileStore';
import { getLocalDateString } from '../utils/weekUtils';
import { getCurrentUserId } from '../services/authUtils';

/**
 * Metadata about an AI service generation (caching, cost, model, timing).
 *
 * Populated by the backend response's `metadata` field on every generation
 * call and readable via aiService.getLastMetadata(), but currently unused —
 * no debug/QA view surfaces it yet. The previous duplicate definition in
 * src/ai/types.ts was removed when that dead file was deleted; this is now
 * the single source of truth.
 */
export interface AIServiceMetadata {
  cached: boolean;
  cacheSource?: 'kv' | 'database' | 'fresh';
  generationTime: number;
  model?: string;
  tokensUsed?: number;
  costUsd?: number;
  cuisineDetected?: string;
}

/**
 * Shape of the raw replacement meal returned by the /diet/swap worker
 * endpoint (fitai-workers MealSchema). Covers only the fields swapMealInPlan
 * reads/forwards — replaces the previous `swapMeal<any>()` call, which lost
 * compile-time safety on the response right at the point it feeds into
 * transformDietResponseToWeeklyPlan.
 */
interface SwapMealResponse {
  name?: string;
  mealType?: string;
  type?: string;
  foods?: Array<{
    name?: string;
    quantity?: number | string;
    unit?: string;
    nutrition?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      carbohydrates?: number;
      fats?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
    };
  }>;
  totalNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    sugar?: number;
  };
}

// ============================================================================
// UNIFIED AI SERVICE (Connected to Cloudflare Workers)
// ============================================================================

/**
 * Resolve the user's pace-tier selection for diet generation.
 *
 * SSOT: profileStore.workoutPreferences.weekly_weight_loss_goal — the same
 * value the Review tab's ValidationEngine reads (persisted on
 * workout_preferences.weekly_weight_loss_goal). Previously the pace signal
 * reached the diet worker only implicitly via advancedReview.daily_calories;
 * passing it explicitly surfaces the selected pace tier while daily_calories
 * stays the primary calorie source (no parallel math).
 *
 * Returns undefined when unset or non-positive: the worker Zod schema marks
 * weeklyWeightLossGoal .positive().optional(), and maintenance users
 * legitimately store 0 — forwarding 0 would fail request validation.
 */
function resolveWeeklyWeightLossGoalFromStore(): number | undefined {
  const goal = useProfileStore.getState().workoutPreferences?.weekly_weight_loss_goal;
  return typeof goal === 'number' && Number.isFinite(goal) && goal > 0 ? goal : undefined;
}

class UnifiedAIService {
  private lastMetadata: AIServiceMetadata | null = null;

  /**
   * Check if backend is reachable and user is authenticated.
   */
  async isRealAIAvailable(): Promise<boolean> {
    try {
      const status = await fitaiWorkersClient.testConnection();
      return status.connected && status.authenticated;
    } catch (error) {
      // Probe failed (network error, etc.) — backend is effectively unreachable.
      console.error('[AIService] isRealAIAvailable probe failed:', error);
      return false;
    }
  }

  /**
   * P1-4 — Closed-loop progressive overload. Fetches the user's last completed
   * session per exercise they've trained (from exercise_sets via
   * exerciseHistoryService) so the next generated plan builds on ACTUAL lifted
   * weights. Returns [] for guests / first-time users (no error). See
   * src/docs/VERIFIED-FINDINGS.md "P1-4".
   *
   * Strategy: pull the user's N most-recent distinct exercises (by exercise_id)
   * and their last session for each. This avoids needing to know the upcoming
   * exercise list (selection happens in the worker) — the AI matches by id/name.
   */
  private async fetchPriorPerformance(
    excludeExerciseIds?: string[]
  ): Promise<PriorPerformanceEntry[]> {
    try {
      const userId = getCurrentUserId();
      if (!userId) return []; // guest or unauthenticated — no history

      // Fetch the user's most recent exercise_sets grouped by exercise_id.
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('exercise_id, session_id, set_number, weight_kg, reps, rpe, set_type, completed_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .eq('is_calibration', false)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[AIService] fetchPriorPerformance query error:', error);
        return [];
      }
      if (!data || data.length === 0) return [];

      // Group by exercise_id, keep only the latest session per exercise (top 8).
      type ExerciseSetRow = {
        exercise_id: string;
        session_id: string;
        set_number: number;
        weight_kg: number | null;
        reps: number | null;
        rpe: 1 | 2 | 3 | null;
        set_type: string | null;
        completed_at: string;
      };
      const byExercise = new Map<string, ExerciseSetRow[]>();
      for (const row of data as ExerciseSetRow[]) {
        if (byExercise.size >= 8 && !byExercise.has(row.exercise_id)) continue;
        const arr = byExercise.get(row.exercise_id) ?? [];
        if (arr.length === 0 || arr[0].session_id === row.session_id) {
          arr.push(row);
        }
        if (!byExercise.has(row.exercise_id)) byExercise.set(row.exercise_id, arr);
      }

      const entries: PriorPerformanceEntry[] = [];
      for (const [exerciseId, rows] of byExercise) {
        if (excludeExerciseIds?.includes(exerciseId)) continue;
        const sets = rows
          .sort((a, b) => a.set_number - b.set_number)
          .map((r) => ({
            setNumber: r.set_number,
            weightKg: r.weight_kg ?? null,
            reps: r.reps ?? null,
            rpe: r.rpe ?? null,
          }));
        entries.push({
          exerciseId,
          lastSession: {
            completedAt: rows[0].completed_at,
            sets,
          },
        });
      }
      return entries.slice(0, 8);
    } catch (err) {
      console.error(
        '[AIService] fetchPriorPerformance failed (non-fatal — generation proceeds without history):',
        err
      );
      return [];
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
    }
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
        }
      );

      // P1-4 — Closed-loop progressive overload: attach the user's last completed
      // sets per exercise so the AI/rule engine prescribes progressions on actual
      // lifted weights. Non-fatal: [] for guests/first-time users.
      request.priorPerformance = await this.fetchPriorPerformance(request.excludeExercises);

      const response = await fitaiWorkersClient.generateWorkoutPlan(request);

      // Store metadata
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error(
          '[AIService] Workout generation failed — no fallback available:',
          response.error
        );
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
        userWeight ?? undefined
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
      return this.handleError(error, 'generateWorkout');
    }
  }

  /**
   * Generate a single meal using backend API
   */
  async generateMeal(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    preferences?: {
      bodyMetrics?: BodyMetrics;
      dietPreferences?: DietPreferences;
      calorieTarget?: number;
    }
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
        }
      );
      const response = await fitaiWorkersClient.generateDietPlan(request);
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }
      if (!response.success || !response.data) {
        console.error(
          '[AIService] Meal generation failed — no fallback available:',
          response.error
        );
        return {
          success: false,
          error: response.error || 'Failed to generate meal. Please try again.',
          retryable: true,
        };
      }

      // Transform backend response to frontend-compatible WeeklyMealPlan
      const weekNumber = Math.ceil(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      );
      const weeklyPlan = transformDietResponseToWeeklyPlan(response, weekNumber);

      if (!weeklyPlan || !weeklyPlan.meals || weeklyPlan.meals.length === 0) {
        return {
          success: false,
          error: 'No meals found in generated plan',
        };
      }
      // Find the meal of requested type, fall back to first available meal
      const meal =
        weeklyPlan.meals.find((m) => m.type?.toLowerCase() === mealType) ?? weeklyPlan.meals[0];
      return {
        success: true,
        data: meal,
      };
    } catch (error) {
      return this.handleError(error, 'generateMeal');
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
    }
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
        }
      );

      const response = await fitaiWorkersClient.generateDietPlan(request);

      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error(
          '[AIService] Daily meal plan generation failed — no fallback available:',
          response.error
        );
        return {
          success: false,
          error: response.error || 'Failed to generate daily meal plan. Please try again.',
          retryable: true,
        };
      }

      const weeklyPlan = transformDietResponseToWeeklyPlan(response, 1);
      const transformedMeals = weeklyPlan?.meals || [];

      // P2-fix: Sum fiber from the actual meal/food data instead of hardcoding
      // 0. Falls back to dailyTotals.fiber if the AI provided it, else sums per-
      // food fiber from the raw response meals. Per CLAUDE.md principle 8.
      //
      // The worker's DietPlan type (services/fitaiWorkersClient.ts) declares
      // dailyTotals as { calories, protein, carbs, fat } only, but the AI
      // backend frequently returns extra optional fields (fiber/sugar/water).
      // We type the raw shape here so the summing logic is type-safe without
      // `any`, and fall back to 0 when fields are absent — no hardcoded values.
      type RawFood = { nutrition?: { fiber?: number }; fiber?: number };
      type RawMeal = { foods?: RawFood[]; fiber?: number };
      type RawDailyTotals = {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        fiber?: number;
      };
      const rawData = response.data as
        | { meals?: RawMeal[]; dailyTotals?: RawDailyTotals }
        | undefined;
      const rawMeals: RawMeal[] = rawData?.meals ?? [];
      const summedFiber = rawMeals.reduce((sum: number, meal: RawMeal) => {
        const foods: RawFood[] = meal?.foods ?? [];
        const mealFiber = foods.reduce(
          (fs: number, f: RawFood) => fs + (f?.nutrition?.fiber ?? f?.fiber ?? 0),
          0
        );
        return sum + (mealFiber || 0);
      }, 0);

      const dailyPlan: DailyMealPlan = {
        date: getLocalDateString(),
        meals: transformedMeals as unknown as Meal[],
        totalCalories: rawData?.dailyTotals?.calories || 0,
        totalMacros: {
          protein: rawData?.dailyTotals?.protein || 0,
          carbohydrates: rawData?.dailyTotals?.carbs || 0,
          fat: rawData?.dailyTotals?.fat || 0,
          fiber: rawData?.dailyTotals?.fiber ?? summedFiber,
        },
        waterIntake: 0, // Tracked separately by the hydration store
      };

      return {
        success: true,
        data: dailyPlan,
      };
    } catch (error) {
      return this.handleError(error, 'generateDailyMealPlan');
    }
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
    }
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
        }
      );

      // P1-4 — Closed-loop progressive overload: attach last-completed history.
      request.priorPerformance = await this.fetchPriorPerformance(request.excludeExercises);

      const response = await fitaiWorkersClient.generateWorkoutPlan(request);

      // Store metadata for UI display
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error('[AIService] Backend returned error:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate workout plan. Please try again.',
          retryable: true,
        };
      }

      // ✅ Backend ALWAYS returns weekly plan (NO FALLBACK)
      const weeklyPlanData = response.data as unknown as RawWorkerWeeklyPlan;

      // Transform each workout in the weekly plan
      const daySlotCounts = new Map<string, number>();
      const workouts = (weeklyPlanData.workouts ?? []).map((w) => {
        const currentSlot = daySlotCounts.get(w.dayOfWeek) ?? 0;
        daySlotCounts.set(w.dayOfWeek, currentSlot + 1);
        return transformWorkoutData(w.workout, w.dayOfWeek, currentSlot);
      });

      const weeklyPlan: WeeklyWorkoutPlan = {
        id: weeklyPlanData.id || `weekly_workout_week_${weekNumber}`,
        weekNumber,
        workouts,
        planTitle: weeklyPlanData.planTitle || 'Your Personalized Workout Plan',
        planDescription: weeklyPlanData.planDescription,
        restDays: weeklyPlanData.restDays || [],
        totalEstimatedCalories: weeklyPlanData.totalEstimatedCalories || 0,
      };

      return {
        success: true,
        data: weeklyPlan,
      };
    } catch (error) {
      return this.handleError(error, 'generateWeeklyWorkoutPlan');
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
    }
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
          // Explicit pace tier (SSOT: workout_preferences.weekly_weight_loss_goal)
          weeklyWeightLossGoal: resolveWeeklyWeightLossGoalFromStore(),
        }
      );

      const response = await fitaiWorkersClient.generateDietPlan(request);

      // Store metadata for UI display
      if (response.metadata) {
        this.lastMetadata = response.metadata as AIServiceMetadata;
      }

      if (!response.success || !response.data) {
        console.error('[AIService] Backend returned error:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate meal plan. Please try again.',
          retryable: true,
        };
      }

      // Transform backend response to frontend format
      const weeklyPlan = transformDietResponseToWeeklyPlan(response, weekNumber, {
        requestedDaysCount: 7,
      });

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
      return this.handleError(error, 'generateWeeklyMealPlan');
    }
  }

  async swapMealInPlan(
    meal: DayMeal,
    options: {
      dietType?: string;
      allergies?: string[];
      restrictions?: string[];
      excludeIngredients?: string[];
    }
  ): Promise<AIResponse<DayMeal>> {
    try {
      const response = await fitaiWorkersClient.swapMeal<SwapMealResponse>({
        meal: {
          name: meal.name,
          type: meal.type,
          dayOfWeek: meal.dayOfWeek.toLowerCase(),
          totalCalories: meal.totalCalories,
          totalMacros: {
            protein: meal.totalMacros.protein,
            carbohydrates: meal.totalMacros.carbohydrates,
            fat: meal.totalMacros.fat,
            fiber: meal.totalMacros.fiber,
          },
        },
        dietType: options.dietType || 'balanced',
        allergies: options.allergies || [],
        restrictions: options.restrictions || [],
        excludeIngredients: options.excludeIngredients || [],
      });
      if (!response.success || !response.data) {
        console.error('[AIService] Meal swap failed:', response.error || 'Meal swap failed');
        return {
          success: false,
          error: response.error || 'Could not generate a replacement meal. Please try again.',
          // WorkersResponse carries no statusCode/errorCode on this success:false
          // shape — the only real retryability signal available is `isOffline`
          // (set by fitaiWorkersClient after a transient network/transport
          // fault). Everything else here is a definite non-retryable outcome
          // (e.g. "Sign up to swap meals", or a server-side validation/business
          // rejection returned on a 2xx body) — retrying without the user
          // changing anything would fail identically.
          retryable: response.isOffline === true,
        };
      }
      const plan = transformDietResponseToWeeklyPlan(
        {
          success: true,
          data: {
            id: `swap_${meal.id}`,
            title: 'Meal replacement',
            meals: [response.data],
            dailyTotals: {
              calories: response.data.totalNutrition?.calories || 0,
              protein: response.data.totalNutrition?.protein || 0,
              carbs: response.data.totalNutrition?.carbs || 0,
              fat: response.data.totalNutrition?.fats || 0,
            },
          },
        },
        1,
        { requestedDaysCount: 1 }
      );
      if (!plan?.meals[0]) {
        // Unlike the branch above, the server DID return success:true here — this
        // is a shape/transform failure on our side of an otherwise-valid AI
        // generation, not an auth/validation rejection. Re-swapping triggers a
        // fresh AI generation that is very unlikely to reproduce the same
        // malformed shape, so retryable:true is accurate for this specific case.
        return {
          success: false,
          error: 'Received replacement meal could not be processed. Please try regenerating.',
          retryable: true,
        };
      }
      return {
        success: true,
        data: plan.meals[0],
      };
    } catch (error) {
      return this.handleError(error, 'swapMealInPlan');
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
      skipCache?: boolean;
    }
  ): Promise<
    AIResponse<
      | { type: 'cache_hit'; plan: WeeklyMealPlan }
      | { type: 'job_started'; jobId: string; estimatedTimeMinutes: number }
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
          // Explicit pace tier (SSOT: workout_preferences.weekly_weight_loss_goal)
          weeklyWeightLossGoal: resolveWeeklyWeightLossGoalFromStore(),
          skipCache: options?.skipCache ?? false,
        }
      );

      const response = await fitaiWorkersClient.generateDietPlanAsync(request);

      if (!response.success || !response.data) {
        console.error('[AIService] Backend returned error:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to generate meal plan',
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
          { requestedDaysCount: 7 }
        );

        if (!weeklyPlan) {
          console.error('[AIService] cache_hit: transformDietResponseToWeeklyPlan returned null');
          return {
            success: false,
            error: 'Failed to transform diet response',
          };
        }

        return {
          success: true,
          data: { type: 'cache_hit', plan: weeklyPlan },
        };
      }

      // Async job was created
      if (isAsyncJobResponse(response.data)) {
        return {
          success: true,
          data: {
            type: 'job_started',
            jobId: response.data.jobId,
            estimatedTimeMinutes: response.data.estimatedTimeMinutes || 2,
          },
        };
      }

      return {
        success: false,
        error: 'Unexpected response format',
      };
    } catch (error) {
      return this.handleError(error, 'generateWeeklyMealPlanAsync');
    }
  }

  /**
   * Check async job status and get result when completed.
   *
   * Poll-count/wall-clock timeout enforcement lives entirely in the caller
   * (useMealPlanning.ts's startJobPolling: maxAttempts + exponential backoff
   * + wall-clock deadline) — this method makes a single status check and
   * reports whatever the worker returns, with no timeout logic of its own.
   */
  async checkMealPlanJobStatus(
    jobId: string,
    weekNumber: number = 1
  ): Promise<
    AIResponse<{
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
      plan?: WeeklyMealPlan;
      error?: string;
      generationTimeMs?: number;
    }>
  > {
    try {
      const response = await fitaiWorkersClient.getJobStatus(jobId);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to check job status',
        };
      }

      const jobData = response.data;

      // If completed, transform the result
      if (jobData.status === 'completed' && jobData.result) {
        const weeklyPlan = transformDietResponseToWeeklyPlan(
          { success: true, data: jobData.result },
          weekNumber,
          { requestedDaysCount: 7 }
        );

        return {
          success: true,
          data: {
            status: 'completed',
            plan: weeklyPlan ?? undefined,
            generationTimeMs: jobData.metadata?.generationTimeMs,
          },
        };
      }

      // Normalize error — worker stores APIError as {code, message, isRetryable}
      const rawError = jobData.error;
      const normalizedError: string | undefined =
        typeof rawError === 'string'
          ? rawError
          : rawError && typeof rawError === 'object'
            ? (((rawError as { message?: unknown }).message as string | undefined) ??
              JSON.stringify(rawError))
            : undefined;

      // Return current status
      return {
        success: true,
        data: {
          status: jobData.status,
          error: normalizedError,
        },
      };
    } catch (error) {
      return this.handleError(error, 'checkMealPlanJobStatus');
    }
  }

  /**
   * Test backend connection.
   */
  async testConnection(): Promise<AIResponse<string>> {
    try {
      const status = await fitaiWorkersClient.testConnection();

      if (!status.connected) {
        return {
          success: false,
          error: status.error || 'Backend not reachable',
          data: 'Connection failed',
        };
      }

      if (!status.authenticated) {
        return {
          success: false,
          error: status.error || 'User not authenticated',
          data: 'Authentication required',
        };
      }

      return {
        success: true,
        data: `Connected to FitAI Workers ${status.backendVersion}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        data: 'Error during connection test',
      };
    }
  }

  /**
   * Handle errors from API calls
   */
  private handleError(error: unknown, context: string): AIResponse<any> {
    console.error(`[AIService] Error in ${context}:`, error);

    if (error instanceof AuthenticationError) {
      return {
        success: false,
        error: 'Authentication required. Please sign in to use AI features.',
        retryable: false, // re-auth, not retry
      };
    }

    if (error instanceof WorkersAPIError) {
      // 5xx / 429 are transient → retryable; 4xx (bad request) is not.
      const retryable = error.statusCode >= 500 || error.statusCode === 429;
      // Map status ranges to curated, friendly copy — mirrors the copy style
      // used by every explicit `!response.success` branch in this class.
      // The raw backend/Zod message is kept in the console.error above
      // (for diagnostics) rather than shown to the user.
      let friendlyMessage: string;
      if (error.statusCode === 401 || error.statusCode === 403) {
        friendlyMessage = 'Authentication required. Please sign in again.';
      } else if (error.statusCode === 429) {
        friendlyMessage = "You're sending requests too quickly. Please wait a moment and try again.";
      } else if (error.statusCode >= 500) {
        friendlyMessage = 'Our servers are having trouble right now. Please try again shortly.';
      } else if (error.statusCode >= 400) {
        friendlyMessage = 'Something about that request was invalid. Please try again.';
      } else {
        friendlyMessage = 'Something went wrong. Please try again.';
      }
      return {
        success: false,
        error: friendlyMessage,
        retryable,
      };
    }

    if (error instanceof NetworkError) {
      // Network errors are the most retryable case — callers (e.g.
      // useFitnessLogic) check response.retryable for retry UX.
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
        retryable: true,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      retryable: true, // unknown errors are often transient; let the caller decide
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Shape of a single exercise as returned by the Cloudflare Workers backend
 * workout-generation endpoint. The worker emits `restSeconds` (canonical) and
 * sometimes a legacy `restTime` field; both are tolerated. `reps` may be a
 * number or a string range (e.g. "8-12") — preserved as-is per the
 * WorkoutSet.reps union.
 */
export interface RawWorkerExercise {
  exerciseId?: string;
  sets?: number;
  reps?: number | string;
  duration?: number;
  restSeconds?: number;
  restTime?: number;
  notes?: string;
}

/**
 * Shape of a single workout entry returned by the backend within a weekly plan.
 * `difficulty` may be any string; unknown values fall back to "intermediate".
 * `category` is not currently emitted by the worker's rule-based generator
 * (see fitai-workers SingleWorkoutSchema — no category field), but is read
 * here in case a future backend revision adds it directly.
 */
export interface RawWorkerWorkout {
  title?: string;
  description?: string;
  difficulty?: string;
  category?: string;
  totalDuration?: number;
  estimatedCalories?: number;
  exercises?: RawWorkerExercise[];
  warmup?: RawWorkerExercise[];
  cooldown?: RawWorkerExercise[];
}

// Workout-category resolution lives in ./workoutCategory so this file and
// services/aiRequestTransformers.ts's single-workout path share one
// implementation instead of two hand-written keyword lists that can drift.
export { resolveWorkoutCategory } from './workoutCategory';
import { resolveWorkoutCategory } from './workoutCategory';

/**
 * Validate + transform a raw exercise entry, or return null to drop it.
 *
 * Guards against silently corrupted AI output: an exercise with no
 * `exerciseId` can't be resolved to real exercise data downstream, and a
 * negative/zero `sets` value would otherwise slip through the old
 * `ex.sets || fallback` pattern (falsy-check only catches 0, not negatives —
 * `-1 || 3` evaluates to `-1`). Logs via console.error so corrupted AI
 * output is visible in dev/QA rather than silently reaching the UI.
 */
export function transformRawExercise(
  ex: RawWorkerExercise,
  idPrefix: string,
  idx: number,
  defaultSets: number,
  defaultReps: string,
  defaultRestTime: number
): WorkoutSet | null {
  const exerciseId = ex?.exerciseId?.trim();
  if (!exerciseId) {
    console.error(
      `[AIService] Dropping malformed exercise (missing exerciseId) at ${idPrefix}_${idx}:`,
      ex
    );
    return null;
  }
  const sets = typeof ex.sets === 'number' && ex.sets > 0 ? ex.sets : defaultSets;
  // Ternary (not `||`) so a deliberate 0s rest (circuit/superset programming —
  // see fitai-workers/src/handlers/workoutGenerationRuleBased.ts) survives
  // instead of being falsy-coerced into defaultRestTime. Mirrors `sets` above.
  const restTime =
    typeof ex.restSeconds === 'number' && ex.restSeconds >= 0
      ? ex.restSeconds
      : typeof ex.restTime === 'number' && ex.restTime >= 0
        ? ex.restTime
        : defaultRestTime;
  return {
    id: `${idPrefix}_${idx}`,
    exerciseId,
    sets,
    reps: typeof ex.reps === 'number' ? ex.reps : ex.reps || defaultReps,
    duration: typeof ex.duration === 'number' && ex.duration >= 0 ? ex.duration : undefined,
    restTime,
    notes: ex.notes,
  };
}

/**
 * Shape of a weekly workout plan response from the backend. The worker's
 * typed response (services/fitaiWorkersClient.ts) uses `any` for the workouts
 * array, so we type the shape we actually consume here.
 */
interface RawWorkerWeeklyPlan {
  id?: string;
  planTitle?: string;
  planDescription?: string;
  restDays?: string[];
  totalEstimatedCalories?: number;
  workouts: Array<{ dayOfWeek: string; workout: RawWorkerWorkout }>;
}

/**
 * Transform workout data from backend to frontend DayWorkout format.
 *
 * NOTE: The backend weekly-plan payload only includes the fields below; the
 * DayWorkout-specific fields (subCategory, intensityLevel, warmUp/coolDown as
 * ExerciseInstruction[], progressionNotes, etc.) are not emitted by the worker
 * for the weekly-plan flow. They are populated later by the workout-builder
 * pipeline when present. We cast to DayWorkout to satisfy the
 * WeeklyWorkoutPlan.workouts type — the runtime shape is identical to the
 * previous `any`-typed implementation.
 */
function transformWorkoutData(
  workoutPlan: RawWorkerWorkout,
  dayOfWeek: string,
  slotIndex: number = 0
): DayWorkout {
  // Map difficulty
  const difficultyMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced',
  };
  const difficulty = difficultyMap[workoutPlan.difficulty ?? ''] || 'intermediate';
  const category = resolveWorkoutCategory(workoutPlan);

  // Transform exercises — drop any entry that fails validation (missing
  // exerciseId) instead of silently passing corrupted data downstream.
  const exercises: WorkoutSet[] = (workoutPlan.exercises ?? [])
    .map((ex, idx) => transformRawExercise(ex, `${dayOfWeek}_ex`, idx, 3, '8-12', 60))
    .filter((ex): ex is WorkoutSet => ex !== null);

  // Transform warmup
  const warmup: WorkoutSet[] = (workoutPlan.warmup ?? [])
    .map((ex, idx) => transformRawExercise(ex, `${dayOfWeek}_warmup`, idx, 1, '10', 30))
    .filter((ex): ex is WorkoutSet => ex !== null);

  // Transform cooldown
  const cooldown: WorkoutSet[] = (workoutPlan.cooldown ?? [])
    .map((ex, idx) => transformRawExercise(ex, `${dayOfWeek}_cooldown`, idx, 1, '10', 30))
    .filter((ex): ex is WorkoutSet => ex !== null);

  if ((workoutPlan.exercises?.length ?? 0) > 0 && exercises.length === 0) {
    console.error(
      `[AIService] All exercises for ${dayOfWeek} were malformed and dropped — workout will render empty.`
    );
  }

  return {
    id: `${dayOfWeek}_workout_${slotIndex}`,
    title: workoutPlan.title || 'AI Generated Workout',
    description: workoutPlan.description || '',
    category,
    difficulty,
    duration: workoutPlan.totalDuration ?? 0,
    // 0 = will be calculated at completion with user's real weight. Guard
    // against a negative/implausible value reaching the UI as-is.
    estimatedCalories:
      typeof workoutPlan.estimatedCalories === 'number' && workoutPlan.estimatedCalories > 0
        ? workoutPlan.estimatedCalories
        : 0,
    exercises,
    warmup,
    cooldown,
    equipment: [], // Will be populated by exercise data
    targetMuscleGroups: [], // Will be populated by exercise data
    icon: 'fitness',
    tags: ['ai-generated', difficulty],
    isPersonalized: true,
    aiGenerated: true,
    dayOfWeek,
    createdAt: new Date().toISOString(),
  } as unknown as DayWorkout;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new UnifiedAIService();
export default aiService;
