/**
 * FitAI Workers API Client
 *
 * Provides HTTP client for communicating with Cloudflare Workers backend.
 * Handles authentication, request formatting, response parsing, and error handling.
 *
 * Base URL: https://fitai-workers.fitai-prod.workers.dev
 *
 * Features:
 * - JWT authentication via Supabase
 * - Automatic retry with exponential backoff
 * - Request/response transformation
 * - Cache metadata parsing
 * - Comprehensive error handling
 */

import { supabase } from './supabase';
import { isNetworkError } from '../utils/networkErrorDetection';

// ============================================================================
// TYPES
// ============================================================================

// API Metadata (alias for WorkersResponseMetadata for backwards compatibility)
export type APIMetadata = WorkersResponseMetadata;

// Validation types from Workers API
export interface ValidationError {
  severity: 'CRITICAL';
  code: string;
  message: string;
  meal?: string;
  food?: string;
  allergen?: string;
  dietType?: string;
  current?: number;
  target?: number;
  drift?: number;
  type?: 'allergen' | 'diet_violation' | 'calorie_drift' | 'macro_imbalance';
  affectedItems?: string[];
  suggestion?: string;
  [key: string]: any;
}

export interface ValidationWarning {
  severity: 'WARNING' | 'INFO';
  code: string;
  message: string;
  action?: string;
  type?:
    | 'low_protein'
    | 'low_variety'
    | 'high_sodium'
    | 'low_fiber'
    | 'exercise_replacement'
    | 'filtering_info'
    | 'gif_coverage';
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
  /**
   * Hard cap (ms) on the total wall-clock time spent across retry attempts for
   * a single logical request (initial attempt + all retries). Without this, a
   * slow/degraded worker can compound retryCount * timeout + backoff delays
   * into ~150s of hung UI with no way for the caller to know when to give up.
   */
  maxRetryWallClockMs?: number;
}

export interface WorkersRequestMetadata {
  requestId: string;
  timestamp: string;
  userId?: string;
}

export interface WorkersResponseMetadata {
  cached: boolean;
  cacheSource?: 'kv' | 'database' | 'fresh';
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
  /**
   * Set to `true` when the request failed due to a transient network/transport
   * fault (fetch threw before a response, AbortError/timeout, or the 401
   * token-refresh path threw a network-classified error) rather than a real
   * auth or server failure.
   *
   * Additive — callers that only check `success` keep working unchanged.
   * Callers that want to surface a "You appear to be offline — tap to retry"
   * affordance instead of a hard error can read this flag.
   *
   * Mirrors the `isNetworkError` field added to the AuthService result
   * shape (`src/services/auth.ts`), so the two services classify transport
   * faults consistently.
   */
  isOffline?: boolean;
  /**
   * Human-readable reason for the offline result (e.g. "Network unavailable",
   * "Token refresh unreachable"). Only meaningful when `isOffline === true`.
   */
  offlineReason?: string;
}

export interface MealSwapRequest {
  meal: {
    name: string;
    type: string;
    dayOfWeek: string;
    totalCalories: number;
    totalMacros: {
      protein: number;
      carbohydrates: number;
      fat: number;
      fiber: number;
    };
  };
  dietType: string;
  allergies: string[];
  restrictions: string[];
  excludeIngredients: string[];
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
    cooking_methods?: string[];
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
  skipCache?: boolean;
}

// Async job response types
export type AsyncJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

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
  data: AsyncDietGenerationResponse | undefined
): data is DietPlan {
  return !!data && 'meals' in data && Array.isArray((data as DietPlan).meals);
}

// Type guard to check if response is an async job
export function isAsyncJobResponse(
  data: AsyncDietGenerationResponse | undefined
): data is AsyncJobCreatedResponse {
  return !!data && 'jobId' in data && 'status' in data;
}

export interface WorkoutGenerationRequest {
  profile: {
    // P0-1: Align with the worker Zod schema (fitai-workers/src/utils/validation.ts
    // UserProfileSchema). `weight`/`height` are `.nullable().optional()` there, and
    // `age` is `.min(13)` (required) but may be absent at the transformer layer
    // before a pre-flight guard runs. Making these optional here stops callers
    // from fabricating `0` to satisfy a stale required-`number` type (the original
    // P0-1 root cause). The worker still rejects a truly missing `age`; the
    // useFitnessLogic pre-flight guard prevents that call (see wave-a-03 audit).
    age: number | undefined;
    gender: string;
    weight: number | null | undefined;
    height: number | null | undefined;
    fitnessGoal: string;
    experienceLevel: string;
    availableEquipment: string[];
    workoutDuration?: number;
    injuries?: string[];
    medications?: string[];
    medicalConditions?: string[]; // GAP-04: added — Worker safety filter needs this
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
  enjoysGroupClasses?: boolean;
  prefersOutdoor?: boolean;
  needsMotivation?: boolean;
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
  skipCache?: boolean;
  boostExtraCardioMinutes?: number;
  /**
   * P1-4 — Closed-loop progressive overload. The user's last-completed sets per
   * exercise (from exercise_sets via exerciseHistoryService), so generation
   * can build the next plan on ACTUAL lifted weights rather than guessing.
   * Optional: absent for first-time users / guest mode. See
   * src/docs/VERIFIED-FINDINGS.md "P1-4".
   */
  priorPerformance?: PriorPerformanceEntry[];
}

/**
 * One exercise's last-session performance, fed into generation so the AI/rule
 * engine can prescribe a progression (e.g. "Last: 60kg×8,8,8 → target 62.5kg
 * or 60kg×10"). Mirrors the shape progressionService already consumes.
 */
export interface PriorPerformanceEntry {
  exerciseId: string;
  exerciseName?: string;
  lastSession?: {
    completedAt: string; // ISO timestamp
    sets: Array<{
      setNumber: number;
      weightKg: number | null;
      reps: number | null;
      rpe?: 1 | 2 | 3 | null;
    }>;
  };
}

export class WorkersAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WorkersAPIError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
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
  private maxRetryWallClockMs: number;

  constructor(config: WorkersClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://fitai-workers.fitai-prod.workers.dev';
    // Cloudflare Workers Free plan has 30s hard limit; 35s gives a small buffer
    // `??` (not `||`) below: an explicit 0 (e.g. tests disabling retries via
    // `maxRetries: 0`) is a valid config value and must not be coerced back to
    // the default just because 0 is falsy.
    this.timeout = config.timeout ?? 35000; // 35 seconds
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000; // 1 second
    // Cap total retry wall-clock so a degraded worker can't compound
    // retries into ~150s of hung UI (initial 35s + up to 3 more 35s
    // attempts + backoff). 90s gives one full retry's worth of headroom
    // beyond the initial attempt before we give up.
    this.maxRetryWallClockMs = config.maxRetryWallClockMs ?? 90000;
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
        throw new AuthenticationError(`Failed to get session: ${error.message}`);
      }

      if (!session?.access_token) {
        throw new AuthenticationError('No active session found');
      }

      // Refresh proactively if the token expires within 5 minutes.
      const expiresAt = session.expires_at ?? 0;
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (expiresAt > 0 && expiresAt < nowSeconds + 300) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session?.access_token) {
            return refreshData.session.access_token;
          }
          // Refresh failed — check whether the fallback token is also expired.
          const nowSec = Math.floor(Date.now() / 1000);
          if (refreshError && session.expires_at && session.expires_at < nowSec) {
            console.error(
              '[WorkersClient] Token refresh failed and access token is expired — signing out:',
              refreshError?.message
            );
            await supabase.auth.signOut();
            throw new AuthenticationError('Session expired. Please sign in again.');
          }
          console.warn(
            '[WorkersClient] Token refresh failed but access token still valid, continuing:',
            refreshError?.message
          );
        } catch (refreshErr) {
          if (refreshErr instanceof AuthenticationError) {
            throw refreshErr;
          }
          console.error('[WorkersClient] Token refresh threw, using current token:', refreshErr);
        }
      }

      return session.access_token;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
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
    attemptStartedAt?: number
  ): Promise<WorkersResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    // Wall-clock anchor for the whole logical request (initial attempt +
    // retries). Set once on the first call and threaded through every
    // recursive retry so the cap below applies cumulatively, not per-attempt.
    const startedAt = attemptStartedAt ?? Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      // Let the caller cancel mid-flight (e.g. a "Cancel" button) by passing
      // an AbortSignal via options.signal — combine it with the internal
      // per-attempt timeout controller rather than letting fetch's own signal
      // handling silently drop the timeout behavior.
      const externalSignal = options.signal;
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort();
        } else {
          externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }
      }

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
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
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
              return this.makeRequest<T>(endpoint, refreshedOptions, retryCount, false, startedAt);
            }
          } catch (refreshErr) {
            // Refresh threw — classify before falling through so a transient
            // network blip is distinguishable from a genuinely invalid session.
            // Reuses the shared classifier (handles Supabase AuthRetryableError,
            // AuthSessionMissingError, TypeError, AbortError, message patterns)
            // so auth.ts and the workers client stay in sync.
            const networkFailure = isNetworkError(refreshErr);
            if (networkFailure) {
              console.error(
                '[WorkersClient] Token refresh failed due to NETWORK error (retryable):',
                refreshErr
              );
              // Transient transport fault during the 401-refresh path. The
              // original request was authenticated fine (the backend returned
              // 401 only because the access token was stale), and the refresh
              // failed solely because we couldn't reach Supabase. Returning a
              // typed offline result here (rather than throwing
              // AuthenticationError) lets callers surface "You appear to be
              // offline — tap to retry" instead of a misleading auth error.
              // The session itself is still valid; a future request on a
              // restored connection will refresh normally.
              return {
                success: false,
                isOffline: true,
                offlineReason: 'Network unavailable',
                error:
                  refreshErr instanceof Error
                    ? refreshErr.message
                    : 'Network error during token refresh',
              };
            } else {
              console.error(
                '[WorkersClient] Token refresh failed (likely auth/session issue):',
                refreshErr
              );
            }
            // Genuine auth failure (invalid/expired refresh token,
            // AuthSessionMissingError). Fall through and throw so the outer
            // NetworkError retry loop does not mask a real session death.
          }
          throw new AuthenticationError('Session expired. Please sign in again.');
        }

        // Check if we should retry — also bail out once the cumulative
        // wall-clock budget is spent, even if retryCount hasn't hit the cap
        // yet (a slow worker can otherwise compound retries to ~150s).
        if (
          this.shouldRetry(response.status) &&
          retryCount < this.maxRetries &&
          Date.now() - startedAt < this.maxRetryWallClockMs
        ) {
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
          return this.makeRequest(endpoint, options, retryCount + 1, retryOnAuthFailure, startedAt);
        }

        // Handle error message - could be string or object
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (responseData.error) {
          if (typeof responseData.error === 'string') {
            errorMessage = responseData.error;
          } else if (typeof responseData.error === 'object') {
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
          responseData.details || responseData.error
        );
      }

      return responseData;
    } catch (error) {
      // Network errors (timeout, no connection, etc.)
      if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) {
        if (retryCount < this.maxRetries && Date.now() - startedAt < this.maxRetryWallClockMs) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1, retryOnAuthFailure, startedAt);
        }
        // Retry budget exhausted — don't surface a raw thrown NetworkError
        // (callers like the diet/workout AI wrappers would translate it to a
        // generic "Network error" string, losing the structured signal and
        // surfacing a cryptic failure to the user). Return a typed offline
        // result so callers can check `result.isOffline` and render a
        // "You appear to be offline — tap to retry" affordance. The original
        // error message is preserved in `error` for diagnostics.
        // P3: log the swallowed transport error so offline failures aren't
        // invisible in dev (CLAUDE.md #5 — no silent failures).
        console.error('[WorkersClient] returning offline result after retry exhaustion:', error);
        return {
          success: false,
          isOffline: true,
          offlineReason: 'Network unavailable',
          error: error instanceof Error ? error.message : 'Network request failed',
        };
      }

      // Re-throw API errors
      if (error instanceof WorkersAPIError || error instanceof AuthenticationError) {
        throw error;
      }

      // Unknown error — classify before deciding. If the shared classifier
      // recognizes this as a network/transport fault, return the typed offline
      // result (consistent with the TypeError/AbortError branch above) so the
      // user sees "offline" rather than a cryptic throw. Otherwise throw a
      // NetworkError to preserve the prior behavior for genuinely unknown
      // failures.
      if (isNetworkError(error)) {
        console.error(
          '[WorkersClient] returning offline result (classified network fault):',
          error
        );
        return {
          success: false,
          isOffline: true,
          offlineReason: 'Network unavailable',
          error: error instanceof Error ? error.message : 'Network request failed',
        };
      }
      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        error
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
    options?: { signal?: AbortSignal }
  ): Promise<WorkersResponse<DietPlan>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to generate AI diet plans' };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<DietPlan>('/diet/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, async: false }),
      signal: options?.signal,
    });
  }

  async swapMeal<T>(request: MealSwapRequest): Promise<WorkersResponse<T>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to swap meals' };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<T>('/diet/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate personalized diet plan (async mode)
   * Returns either cached DietPlan (cache hit) or AsyncJobCreatedResponse (new job)
   */
  async generateDietPlanAsync(
    request: Omit<DietGenerationRequest, 'async'>,
    options?: { signal?: AbortSignal }
  ): Promise<WorkersResponse<AsyncDietGenerationResponse>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to generate AI diet plans' };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<AsyncDietGenerationResponse>('/diet/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, async: true }),
      signal: options?.signal,
    });
  }

  /**
   * Generate personalized workout plan
   */
  async generateWorkoutPlan(
    request: WorkoutGenerationRequest,
    options?: { signal?: AbortSignal }
  ): Promise<WorkersResponse<WorkoutPlan>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to generate AI workout plans' };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<WorkoutPlan>('/workout/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<WorkersResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest('/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
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

    return this.makeRequest('/food/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Resolve real food photos for meal-suggestion dish names (from the static
   * regional cuisine DB, which has no imageUrl). Server-side Wikimedia lookup
   * cached in MEAL_CACHE KV — keeps the device off third-party APIs.
   * Returns a map of dish name → image URL (or null if none found).
   */
  async resolveSuggestionImages(
    names: string[]
  ): Promise<WorkersResponse<{ images: Record<string, string | null> }>> {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to load meal suggestion images' };
    }
    const token = await this.getAuthToken();

    return this.makeRequest<{ images: Record<string, string | null> }>('/diet/suggestion-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ names }),
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

    return this.makeRequest('/diet/jobs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
          error: 'Backend health check failed',
        };
      }

      // Now check authentication
      const isAuth = await this.isAuthenticated();

      if (!isAuth) {
        return {
          connected: true,
          authenticated: false,
          error: 'User not authenticated - sign up required for AI features',
          backendVersion: 'v2.0',
        };
      }

      // Test authenticated endpoint
      try {
        const token = await this.getAuthToken();
        const authTestResponse = await fetch(`${this.baseUrl}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const authData = await authTestResponse.json();

        return {
          connected: true,
          authenticated: authData.success === true,
          error: authData.success ? undefined : 'Authentication verification failed',
          backendVersion: 'v2.0',
        };
      } catch (authError) {
        return {
          connected: true,
          authenticated: false,
          error: `Auth test failed: ${authError instanceof Error ? authError.message : String(authError)}`,
          backendVersion: 'v2.0',
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
   * Scan a nutrition label photo using Gemini Vision.
   * Sends a base64 image of the nutrition facts table; the Worker extracts
   * all values verbatim and returns them shaped for ScannedProduct use.
   *
   * @param imageBase64  - Base64 data URL (data:image/jpeg;base64,...)
   * @param productName  - Optional hint shown on the packaging to improve accuracy
   */
  async scanNutritionLabel(
    imageBase64: string,
    productName?: string
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

  // ==========================================================================
  // PHASE 9 — WORKOUT BUILDER AI ENDPOINTS
  // Each method POSTs to the corresponding builder-AI route. Auth + rate limit
  // are enforced server-side. Returns the standard WorkersResponse<T> shape.
  // ==========================================================================

  /** POST /workout/suggest-day — complementary exercise suggestions for a day. */
  async suggestDay(request: {
    dayIndex: number;
    currentExercises: unknown[];
    profile: unknown;
    goals?: string[];
    weekNumber?: number;
    skipCache?: boolean;
  }): Promise<
    WorkersResponse<{
      suggestedExercises: Array<{
        exerciseId: string;
        name: string;
        reason: string;
        confidence: number;
        muscleGroup: string;
        sets: number;
        reps: number | string;
        restSeconds: number;
      }>;
      confidence: number;
      reasoning: string;
    }>
  > {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to use AI workout features' };
    }
    const token = await this.getAuthToken();
    return this.makeRequest('/workout/suggest-day', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /** POST /workout/validate — muscle-balance + safety warnings + fixActions. */
  async validateWorkoutPlan(request: {
    plan: unknown;
    profile?: unknown;
    skipCache?: boolean;
  }): Promise<
    WorkersResponse<{
      warnings: unknown[];
      fixActions: unknown[];
    }>
  > {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to use AI workout features' };
    }
    const token = await this.getAuthToken();
    return this.makeRequest('/workout/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /** POST /workout/edit-natural-language — NL instruction → updated plan. */
  async editWorkoutNaturalLanguage(request: {
    plan: unknown;
    instruction: string;
    profile?: unknown;
    skipCache?: boolean;
  }): Promise<
    WorkersResponse<{
      updatedPlan: unknown;
      summary: string;
    }>
  > {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to use AI workout features' };
    }
    const token = await this.getAuthToken();
    return this.makeRequest('/workout/edit-natural-language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /** POST /workout/generate-full-week — fill missing days from a partial plan. */
  async generateFullWeek(request: {
    partialPlan: unknown;
    profile: unknown;
    skipCache?: boolean;
  }): Promise<
    WorkersResponse<{
      completePlan: unknown;
      daysGenerated: number;
    }>
  > {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to use AI workout features' };
    }
    const token = await this.getAuthToken();
    return this.makeRequest('/workout/generate-full-week', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /** POST /workout/apply-progression — Double Progression on prior performance. */
  async applyProgression(request: {
    plan: unknown;
    priorPerformance: unknown[];
    skipCache?: boolean;
  }): Promise<
    WorkersResponse<{
      updatedPlan: unknown;
      changes: Array<{
        exerciseId: string;
        dayIndex: number;
        action: 'increase' | 'hold' | 'deload';
        reason: string;
      }>;
    }>
  > {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to use AI workout features' };
    }
    const token = await this.getAuthToken();
    return this.makeRequest('/workout/apply-progression', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /** POST /workout/deload — 40% volume reduction deload week. */
  async deloadWorkoutPlan(request: { plan: unknown; skipCache?: boolean }): Promise<
    WorkersResponse<{
      deloadPlan: unknown;
      volumeReductionPercent: number;
    }>
  > {
    if (!(await this.isAuthenticated())) {
      return { success: false, error: 'Sign up to use AI workout features' };
    }
    const token = await this.getAuthToken();
    return this.makeRequest('/workout/deload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const fitaiWorkersClient = new FitAIWorkersClient();
export default fitaiWorkersClient;
