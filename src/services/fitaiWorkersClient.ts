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

import { supabase } from './supabase';

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
  type?: 'low_protein' | 'low_variety' | 'high_sodium' | 'low_fiber' | 'exercise_replacement' | 'filtering_info' | 'gif_coverage';
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
  constructor(message: string, public originalError?: any) {
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

  constructor(config: WorkersClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://fitai-workers.sharmaharsh9887.workers.dev';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
  }

  /**
   * Get authentication token from Supabase
   */
  private async getAuthToken(): Promise<string> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw new AuthenticationError(`Failed to get session: ${error.message}`);
      }

      if (!session?.access_token) {
        throw new AuthenticationError('No active session found');
      }

      return session.access_token;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    retryCount = 0
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

      // Handle HTTP errors
      if (!response.ok) {
        // Check if we should retry
        if (this.shouldRetry(response.status) && retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.log(`[WorkersClient] Retrying request (${retryCount + 1}/${this.maxRetries}) after ${delay}ms`);
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }

        throw new WorkersAPIError(
          responseData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          responseData.errorCode,
          responseData.details
        );
      }

      return responseData;
    } catch (error) {
      // Network errors (timeout, no connection, etc.)
      if (error instanceof TypeError || (error as any).name === 'AbortError') {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.log(`[WorkersClient] Network error, retrying (${retryCount + 1}/${this.maxRetries}) after ${delay}ms`);
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        throw new NetworkError('Network request failed', error);
      }

      // Re-throw API errors
      if (error instanceof WorkersAPIError || error instanceof AuthenticationError) {
        throw error;
      }

      // Unknown error
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate personalized diet plan
   */
  async generateDietPlan(request: DietGenerationRequest): Promise<WorkersResponse<DietPlan>> {
    const token = await this.getAuthToken();

    return this.makeRequest<DietPlan>('/diet/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate personalized workout plan
   */
  async generateWorkoutPlan(request: WorkoutGenerationRequest): Promise<WorkersResponse<WorkoutPlan>> {
    const token = await this.getAuthToken();

    return this.makeRequest<WorkoutPlan>('/workout/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
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
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const fitaiWorkersClient = new FitAIWorkersClient();
export default fitaiWorkersClient;
