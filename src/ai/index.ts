/**
 * AI Module - Main Entry Point
 *
 * TODO: MIGRATE TO CLOUDFLARE WORKERS BACKEND
 *
 * CURRENT STATE: This module is being migrated from client-side AI to server-side
 * TIMELINE: Migration in progress
 *
 * MIGRATION PLAN:
 * ================
 *
 * PHASE 1: Create HTTP Client for Cloudflare Workers ✅ (Workers are ready)
 * - Backend endpoints deployed at: https://fitai-workers.sharmaharsh9887.workers.dev
 * - Caching system with user_id support: COMPLETE
 * - RLS policies optimized: COMPLETE
 *
 * PHASE 2: Update Mobile App (IN PROGRESS)
 * ☐ 1. Create src/services/workersClient.ts for HTTP calls
 * ☐ 2. Replace aiService.generateWeeklyWorkoutPlan() with Workers API call
 * ☐ 3. Replace aiService.generateWeeklyMealPlan() with Workers API call
 * ☐ 4. Add authentication headers (JWT from Supabase Auth)
 * ☐ 5. Handle cache metadata from Workers response
 *
 * PHASE 3: Cleanup
 * ☐ 1. Remove @google/generative-ai from package.json
 * ☐ 2. Remove all EXPO_PUBLIC_GEMINI_KEY_* env vars
 * ☐ 3. Delete deprecated files:
 *      - src/ai/gemini.ts (stubbed)
 *      - src/ai/workoutGenerator.ts
 *      - src/ai/weeklyMealGenerator.ts
 *      - src/ai/weeklyContentGenerator.ts
 *      - src/ai/nutritionAnalyzer.ts
 *      - src/ai/constrainedWorkoutGeneration.ts
 *      - src/ai/exerciseValidationService.ts
 *
 * ENDPOINTS TO USE:
 * =================
 * - Workout Generation: POST /workout/generate
 * - Diet Generation: POST /diet/generate
 * - Base URL: https://fitai-workers.sharmaharsh9887.workers.dev
 *
 * REQUEST FORMAT:
 * {
 *   "profile": { personalInfo, fitnessGoals, workoutPreferences },
 *   "workoutType": "strength",
 *   "duration": 45,
 *   "model": "google/gemini-2.5-flash"
 * }
 *
 * RESPONSE FORMAT:
 * {
 *   "success": true,
 *   "data": { workout or meal plan },
 *   "metadata": {
 *     "cached": false,
 *     "cacheSource": "fresh",
 *     "generationTime": 1234,
 *     "model": "google/gemini-2.5-flash",
 *     "tokensUsed": 5000,
 *     "costUsd": 0.0005
 *   }
 * }
 */

// ============================================================================
// TEMPORARY EXPORTS (Keep for now to prevent breaking changes)
// ============================================================================

// ⚠️ ALL CLIENT-SIDE AI REMOVED - Use Cloudflare Workers Backend
// Migration Guide: See BACKEND_ARCHITECTURE_UPDATED.md

export { MOTIVATIONAL_CONTENT_SCHEMA } from './schemas';

// Feature Engines - Keep these (they use demo data for UI)
export { workoutEngine } from '../features/workouts/WorkoutEngine';
export { nutritionEngine } from '../features/nutrition/NutritionEngine';

// MIGRATION_STUB exports removed - All AI generation now handled by Workers backend
// Types are exported from '../types/ai' instead

// AI Types
export * from '../types/ai';

// Data (static data - not AI-related)
export * from '../data/exercises';
export * from '../data/achievements';

// ============================================================================
// UNIFIED AI SERVICE (Temporary - Will be replaced with Workers client)
// ============================================================================

import { MOTIVATIONAL_CONTENT_SCHEMA } from './schemas';
import { workoutEngine } from '../features/workouts/WorkoutEngine';
import { nutritionEngine } from '../features/nutrition/NutritionEngine';
import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout, Meal, DailyMealPlan, MotivationalContent, AIResponse } from '../types/ai';

// Temporary types until migration complete
export interface WeeklyWorkoutPlan {
  id: string;
  weekNumber: number;
  workouts: Workout[];
  // Additional properties used in FitnessScreen
  planTitle?: string;
  planDescription?: string;
  restDays?: number[];
  totalEstimatedCalories?: number;
}

export interface WeeklyMealPlan {
  id: string;
  weekNumber: number;
  meals: any[];
  // Additional properties used in DietScreen
  planTitle?: string;
}

/**
 * TODO: Replace this entire class with WorkersClient
 *
 * New implementation should:
 * 1. Make HTTP requests to fitai-workers
 * 2. Include user auth token in headers
 * 3. Handle caching metadata from response
 * 4. Show cache hit/miss status to user
 * 5. Track cost savings from caching
 */
class UnifiedAIService {
  isRealAIAvailable(): boolean {
    // TODO: Check if Workers endpoint is reachable
    // For now, always return false to force demo mode
    console.warn('⚠️ Client-side AI disabled. Migrate to Cloudflare Workers.');
    return false;
  }

  async generateWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: any
  ): Promise<AIResponse<Workout>> {
    // TODO: Call POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate
    console.error('❌ AI generation not connected to Cloudflare Workers backend');
    throw new Error(
      'AI generation is not configured. Please connect to Cloudflare Workers backend.\n' +
      'Endpoint: https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate'
    );
  }

  async generateMeal(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    preferences?: any
  ): Promise<AIResponse<Meal>> {
    // TODO: Call POST https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate
    console.error('❌ AI generation not connected to Cloudflare Workers backend');
    throw new Error(
      'AI generation is not configured. Please connect to Cloudflare Workers backend.\n' +
      'Endpoint: https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate'
    );
  }

  async generateDailyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: any
  ): Promise<AIResponse<DailyMealPlan>> {
    // TODO: Call Workers endpoint multiple times or create batch endpoint
    console.error('❌ AI generation not connected to Cloudflare Workers backend');
    throw new Error(
      'AI generation is not configured. Please connect to Cloudflare Workers backend.\n' +
      'Endpoint: https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate'
    );
  }

  async generateMotivationalContent(
    personalInfo: PersonalInfo,
    currentStreak: number = 0
  ): Promise<AIResponse<MotivationalContent>> {
    // TODO: Maybe create Workers endpoint for this or keep it as demo (not critical)
    console.warn('⚠️ Motivational content feature not yet migrated to Cloudflare Workers');
    return {
      success: false,
      error: 'Motivational content not yet available. Migration to Workers pending.',
    };
  }

  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyWorkoutPlan>> {
    // TODO: PRIORITY - Replace with Workers endpoint call
    // POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate
    console.error('❌ CRITICAL: Weekly workout generation not connected to Cloudflare Workers');
    throw new Error(
      'Workout generation is not configured.\n\n' +
      'Required: Connect to Cloudflare Workers backend\n' +
      'Endpoint: POST https://fitai-workers.sharmaharsh9887.workers.dev/workout/generate\n\n' +
      'This is the PRIMARY feature - must be implemented before app can be used.'
    );
  }

  async generateWeeklyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyMealPlan>> {
    // TODO: PRIORITY - Replace with Workers endpoint call
    // POST https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate
    console.error('❌ CRITICAL: Weekly meal generation not connected to Cloudflare Workers');
    throw new Error(
      'Meal plan generation is not configured.\n\n' +
      'Required: Connect to Cloudflare Workers backend\n' +
      'Endpoint: POST https://fitai-workers.sharmaharsh9887.workers.dev/diet/generate\n\n' +
      'This is the PRIMARY feature - must be implemented before app can be used.'
    );
  }

  async testConnection(): Promise<AIResponse<string>> {
    // TODO: Test Workers endpoint connectivity
    // For now, return failure to indicate migration is needed
    return {
      success: false,
      error: 'AI backend not connected. Cloudflare Workers integration required.',
      data: 'Migration to Cloudflare Workers pending',
    };
  }

  getAIStatus(): {
    isAvailable: boolean;
    mode: 'real' | 'demo';
    message: string;
    modelVersion?: string;
  } {
    return {
      isAvailable: false,
      mode: 'demo',
      modelVersion: undefined,
      message: '❌ NOT CONFIGURED - Connect to Cloudflare Workers backend to enable AI generation',
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new UnifiedAIService();
export default aiService;
