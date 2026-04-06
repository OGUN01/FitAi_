/**
 * FitAI Workers API Client
 *
 * Provides HTTP client for communicating with Cloudflare Workers backend.
 * Handles authentication, request formatting, response parsing, and error handling.
 *
 * Base URL: https://fitai-workers.sharmaharsh9887.workers.dev
 *
 * Features:
 * - JWT authentication via Supabase
 * - Automatic retry with exponential backoff
 * - Request/response transformation
 * - Cache metadata parsing
 * - Comprehensive error handling
 */

import { supabase } from "./supabase";

// ============================================================================
// TYPES
// ============================================================================

// API Metadata (alias for WorkersResponseMetadata for backwards compatibility)
export type APIMetadata = WorkersResponseMetadata;

// Validation types from Workers API
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
    | "high_sodium"
    | "low_fiber"
    | "exercise_replacement"
    | "filtering_info"
    | "gif_coverage";
  suggestions?: string[];
  [key: string]: any;
}

// Workers API response types for diet and workout
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

export interface WorkersClientConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

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

export interface WorkersResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: WorkersResponseMetadata;
}

export interface DietGenerationRequest {
  profile: {
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
    activity_level?: string;
    fitness_goal?: string;
    country?: string;
    state?: string;
    occupation_type?: string;
    wake_time?: string;
    sleep_time?: string;
  };
  country?: string;
  dietPreferences?: {
    diet_type?: string;
    allergies?: string[];
    restrictions?: string[];
    cuisine_preferences?: string[];
    dislikes?: string[];
    breakfast_enabled?: boolean;
    lunch_enabled?: boolean;
    dinner_enabled?: boolean;
    snacks_enabled?: boolean;
    snacks_count?: number;
    cooking_skill_level?: string;
    max_prep_time_minutes?: number | null;
    budget_level?: string;
    keto_ready?: boolean;
    intermittent_fasting_ready?: boolean;
    paleo_ready?: boolean;
    mediterranean_ready?: boolean;
    low_carb_ready?: boolean;
    high_protein_ready?: boolean;
    drinks_enough_water?: boolean;
    limits_sugary_drinks?: boolean;
    eats_regular_meals?: boolean;
    avoids_late_night_eating?: boolean;
    controls_portion_sizes?: boolean;
    reads_nutrition_labels?: boolean;
    eats_processed_foods?: boolean;
    eats_5_servings_fruits_veggies?: boolean;
    limits_refined_sugar?: boolean;
    includes_healthy_fats?: boolean;
    drinks_alcohol?: boolean;
    smokes_tobacco?: boolean;
    drinks_coffee?: boolean;
    takes_supplements?: boolean;
  };
  bodyMetrics?: {
    height_cm?: number;
    current_weight_kg?: number;
    target_weight_kg?: number;
    body_fat_percentage?: number;
    medical_conditions?: string[];
    medications?: string[];
    physical_limitations?: string[];
    pregnancy_status?: boolean;
    pregnancy_trimester?: 1 | 2 | 3;
    breastfeeding_status?: boolean;
    stress_level?: string;
  };
  advancedReview?: {
    daily_calories?: number;
    daily_protein_g?: number;
    daily_carbs_g?: number;
    daily_fat_g?: number;
    daily_water_ml?: number;
    daily_fiber_g?: number;
    calculated_bmi?: number;
    bmi_category?: string;
    overall_health_score?: number;
  };
  calorieTarget?: number;
  mealsPerDay?: number;
  daysCount?: number;
  weeklyWeightLossGoal?: number;
  targetTimelineWeeks?: number;
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

// Async job response types
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

export interface WorkoutGenerationRequest {
  profile: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    fitnessGoal: string;
    experienceLevel: string;
    availableEquipment: string[];
    workoutDuration?: number;
    injuries?: string[];
    medications?: string[];
    medicalConditions?: string[];      // GAP-04: added — Worker safety filter needs this
    stressLevel?: 'low' | 'moderate' | 'high'; // GAP-04: added — for volume reduction under high stress
    pregnancyStatus?: boolean;
    pregnancyTrimester?: number;
    breastfeedingStatus?: boolean;
  };
  weeklyPlan: {
    workoutsPerWeek: number;
    preferredDays?: string[];
    workoutTypes?: string[];
    prefersVariety?: boolean;
    activityLevel?: string;
    preferredWorkoutTime?: string;
  };
  // H13: Fitness assessment (concrete ability indicators from onboarding)
  fitnessAssessment?: {
    pushupCount?: number;
    runningMinutes?: number;
    flexibilityLevel?: string;
    experienceYears?: number;
  };
  // H13: Workout location preference
  workoutLocation?: string;
  // H13: Cardio/strength preference booleans
  enjoysCardio?: boolean;
  enjoysStrength?: boolean;
  // H13: Health-based recommendations from advanced review
  recommendations?: {
    frequency?: number | null;
    cardioMinutes?: number | null;
    strengthSessions?: number | null;
  };
  focusMuscles?: string[];
  excludeExercises?: string[];
  weekNumber?: number;
  regenerationSeed?: number; // Varies exercise selection on regeneration
  model?: string;
  temperature?: number;
}

export class WorkersAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "WorkersAPIError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// ============================================================================
// FITAI WORKERS CLIENT
// ============================================================================

export class FitAIWorkersClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: WorkersClientConfig = {}) {
    this.baseUrl =
      config.baseUrl || "https://fitai-workers.sharmaharsh9887.workers.dev";
    // Cloudflare Workers Free plan has 30s hard limit; 35s gives a small buffer
    this.timeout = config.timeout || 35000; // 35 seconds
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
  }

  /**
   * Get authentication token from Supabase, refreshing if within 5 minutes of expiry.
   */
  private async getAuthToken(): Promise<string> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw new AuthenticationError(
          `Failed to get session: ${error.message}`,
        );
      }

      if (!session?.access_token) {
        throw new AuthenticationError("No active session found");
      }

      // Refresh proactively if the token expires within 5 minutes.
      const expiresAt = session.expires_at ?? 0;
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (expiresAt > 0 && expiresAt < nowSeconds + 300) {
        try {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session?.access_token) {
            return refreshData.session.access_token;
          }
          // Refresh failed — check whether the fallback token is also expired.
          const nowSec = Math.floor(Date.now() / 1000);
          if (refreshError && session.expires_at && session.expires_at < nowSec) {
            console.error(
              "[WorkersClient] Token refresh failed and access token is expired — signing out:",
              refreshError?.message,
            );
            await supabase.auth.signOut();
            throw new AuthenticationError("Session expired. Please sign in again.");
          }
          console.warn(
            "[WorkersClient] Token refresh failed but access token still valid, continuing:",
            refreshError?.message,
          );
        } catch (refreshErr) {
          if (refreshErr instanceof AuthenticationError) {
            throw refreshErr;
          }
          console.error(
            "[WorkersClient] Token refresh threw, using current token:",
            refreshErr,
          );
        }
      }

      return session.access_token;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    retryCount = 0,
    retryOnAuthFailure = true,
  ): Promise<WorkersResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await response.json();

      // Log response for debugging
      if (!response.ok) {
        console.error(`[WorkersClient] API Error Response:`, {
          status: response.status,
          statusText: response.statusText,
          error: responseData.error,
          errorType: typeof responseData.error,
          fullResponse: JSON.stringify(responseData).substring(0, 500),
        });
      }

      // Handle HTTP errors
      if (!response.ok) {
        // On 401, attempt a single token refresh then retry the request once.
        if (response.status === 401 && retryOnAuthFailure) {
          try {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session?.access_token) {
              const newToken = refreshData.session.access_token;
              const refreshedOptions: RequestInit = {
                ...options,
                headers: {
                  ...(options.headers as Record<string, string>),
                  Authorization: `Bearer ${newToken}`,
                },
              };
              // retryOnAuthFailure=false prevents an infinite 401 loop.
              return this.makeRequest<T>(endpoint, refreshedOptions, retryCount, false);
            }
          } catch {
            // Refresh threw — fall through to throw AuthenticationError below.
          }
          throw new AuthenticationError("Session expired. Please sign in again.");
        }

        // Check if we should retry
        if (this.shouldRetry(response.status) && retryCount < this.maxRetries) {
          let delay = this.retryDelay * Math.pow(2, retryCount);
          // Parse Retry-After header for 429 responses
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              const retryAfterSeconds = Number(retryAfter);
              if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
                delay = retryAfterSeconds * 1000;
              }
            }
          }
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }

        // Handle error message - could be string or object
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (responseData.error) {
          if (typeof responseData.error === "string") {
            errorMessage = responseData.error;
          } else if (typeof responseData.error === "object") {
            // Error is an object - extract message or stringify
            errorMessage =
              responseData.error.message ||
              responseData.error.error ||
              JSON.stringify(responseData.error);
          }
        }

        throw new WorkersAPIError(
          errorMessage,
          response.status,
          responseData.errorCode,
          responseData.details || responseData.error,
        );
      }

      return responseData;
    } catch (error) {
      // Network errors (timeout, no connection, etc.)
      if (error instanceof TypeError || (error as any).name === "AbortError") {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        throw new NetworkError("Network request failed", error);
      }

      // Re-throw API errors
      if (
        error instanceof WorkersAPIError ||
        error instanceof AuthenticationError
      ) {
        throw error;
      }

      // Unknown error
      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * Determine if request should be retried based on status code
   */
  private shouldRetry(statusCode: number): boolean {
    // Retry on server errors (5xx) and rate limiting (429)
    return statusCode >= 500 || statusCode === 429;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate personalized diet plan (synchronous mode)
   */
  async generateDietPlan(
    request: DietGenerationRequest,
  ): Promise<WorkersResponse<DietPlan>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: "Sign up to generate AI diet plans" };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<DietPlan>("/diet/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, async: false }),
    });
  }

  /**
   * Generate personalized diet plan (async mode)
   * Returns either cached DietPlan (cache hit) or AsyncJobCreatedResponse (new job)
   */
  async generateDietPlanAsync(
    request: Omit<DietGenerationRequest, "async">,
  ): Promise<WorkersResponse<AsyncDietGenerationResponse>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: "Sign up to generate AI diet plans" };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<AsyncDietGenerationResponse>("/diet/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, async: true }),
    });
  }

  /**
   * Generate personalized workout plan
   */
  async generateWorkoutPlan(
    request: WorkoutGenerationRequest,
  ): Promise<WorkersResponse<WorkoutPlan>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: "Sign up to generate AI workout plans" };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<WorkoutPlan>("/workout/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<
    WorkersResponse<{ status: string; timestamp: string }>
  > {
    return this.makeRequest("/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Check if user is authenticated (has valid Supabase session)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return !!session?.access_token;
    } catch {
      return false;
    }
  }

  /**
   * Get current user ID from Supabase session
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Recognize food from image using Gemini Vision API
   * @param request - Image data and meal context
   * @returns Recognized foods with nutrition information
   */
  async recognizeFood(request: {
    imageBase64: string;
    mealType: "breakfast" | "lunch" | "dinner" | "snack";
    userContext?: {
      region?: string;
      dietaryRestrictions?: string[];
    };
  }): Promise<
    WorkersResponse<{
      foods: Array<{
        id: string;
        name: string;
        localName?: string;
        category: string;
        cuisine: string;
        estimatedGrams: number;
        servingDescription: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sugar?: number;
        sodium?: number;
        confidence: number;
        /** Per-100g values computed by the Worker (per-serving / estimatedGrams * 100) */
        nutritionPer100g: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
        };
      }>;
      overallConfidence: number;
      totalCalories: number;
      mealType: string;
    }>
  > {
    const token = await this.getAuthToken();

    return this.makeRequest("/food/recognize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /**
   * Check async job status
   * @param jobId - Job ID returned from async diet generation
   */
  async getJobStatus(jobId: string): Promise<
    WorkersResponse<{
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
    }>
  > {
    const token = await this.getAuthToken();

    return this.makeRequest(`/diet/jobs/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * List user's recent jobs
   */
  async listJobs(): Promise<
    WorkersResponse<{
      jobs: Array<{
        id: string;
        status: string;
        created_at: string;
        completed_at?: string;
        generation_time_ms?: number;
      }>;
    }>
  > {
    const token = await this.getAuthToken();

    return this.makeRequest("/diet/jobs", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Test backend connection with authentication
   * Returns connection status and any errors
   */
  async testConnection(): Promise<{
    connected: boolean;
    authenticated: boolean;
    error?: string;
    backendVersion?: string;
  }> {
    try {
      // First check if backend is reachable (no auth required)
      const healthResponse = await this.healthCheck();

      if (!healthResponse.success) {
        return {
          connected: false,
          authenticated: false,
          error: "Backend health check failed",
        };
      }

      // Now check authentication
      const isAuth = await this.isAuthenticated();

      if (!isAuth) {
        return {
          connected: true,
          authenticated: false,
          error: "User not authenticated - sign up required for AI features",
          backendVersion: "v2.0",
        };
      }

      // Test authenticated endpoint
      try {
        const token = await this.getAuthToken();
        const authTestResponse = await fetch(`${this.baseUrl}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const authData = await authTestResponse.json();

        return {
          connected: true,
          authenticated: authData.success === true,
          error: authData.success
            ? undefined
            : "Authentication verification failed",
          backendVersion: "v2.0",
        };
      } catch (authError) {
        return {
          connected: true,
          authenticated: false,
          error: `Auth test failed: ${authError instanceof Error ? authError.message : String(authError)}`,
          backendVersion: "v2.0",
        };
      }
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  /**
   * Estimate nutrition for a named product via AI (Gemini via AI Gateway).
   * Called by the barcode pipeline when OFF/UPCitemdb return a product name
   * but no nutrition data. The raw barcode number is NEVER passed here.
   *
   * @param productName - Human-readable product name (e.g. "Maggi Masala Noodles")
   * @param brand       - Brand name, empty string if unknown
   * @param country     - Country of origin derived from GS1 barcode prefix
   */
  async estimateNutrition(
    productName: string,
    brand: string,
    country: string,
  ): Promise<
    WorkersResponse<{
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
      confidence: number;
      isAIEstimated: boolean;
    }>
  > {
    const token = await this.getAuthToken();
    return this.makeRequest('/nutrition/barcode-estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productName, brand, country }),
    });
  }
  /**
   * Scan a nutrition label photo using Gemini Vision.
   * Sends a base64 image of the nutrition facts table; the Worker extracts
   * all values verbatim and returns them shaped for ScannedProduct use.
   *
   * @param imageBase64  - Base64 data URL (data:image/jpeg;base64,...)
   * @param productName  - Optional hint shown on the packaging to improve accuracy
   */
  async scanNutritionLabel(
    imageBase64: string,
    productName?: string,
  ): Promise<
    WorkersResponse<{
      productName: string;
      brand?: string;
      servingSize: number;
      servingUnit: string;
      perServing: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
      };
      per100g: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
      };
      ingredients?: string;
      allergens?: string[];
      confidence: number;
      extractionNotes?: string;
      source: 'vision-label';
    }>
  > {
    const token = await this.getAuthToken();
    return this.makeRequest('/food/label-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64, productName }),
    });
  }

}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const fitaiWorkersClient = new FitAIWorkersClient();
export default fitaiWorkersClient;
