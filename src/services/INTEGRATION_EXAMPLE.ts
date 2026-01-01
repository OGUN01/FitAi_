/**
 * Data Transformers Integration Examples
 *
 * Real-world examples of using data transformers to convert
 * Cloudflare Workers API responses to mobile app format.
 */

import {
  transformDietResponse,
  transformWorkoutResponse,
  transformValidationErrors,
  isValidDietResponse,
  isValidWorkoutResponse,
  extractErrorMessage,
  WorkersDietResponse,
  WorkersWorkoutResponse,
} from './dataTransformers';
import { DayMeal } from '../types/ai';
import { DayWorkout } from '../types/workout';

// ============================================================================
// EXAMPLE 1: FETCH AND TRANSFORM DIET PLAN
// ============================================================================

/**
 * Example: Generate personalized diet plan from Workers API
 */
export async function generateDietPlan(
  userId: string,
  calorieTarget: number,
  dietaryRestrictions: string[] = []
): Promise<DayMeal> {
  try {
    // 1. Call Workers API
    const response = await fetch('https://your-workers.dev/diet/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        calorieTarget,
        dietaryRestrictions,
        mealsPerDay: 4,
      }),
    });

    const data = await response.json();

    // 2. Validate response
    if (!isValidDietResponse(data)) {
      const errorMsg = extractErrorMessage(data);
      throw new Error(`Invalid diet response: ${errorMsg}`);
    }

    // 3. Transform to app format
    const dayMeal = transformDietResponse(data, userId, new Date().toISOString());

    // 4. Handle validation warnings
    if (data.metadata.warnings && data.metadata.warnings.length > 0) {
      const userErrors = transformValidationErrors(data.metadata.warnings);

      // Log warnings for user
      userErrors.forEach(error => {
        if (error.severity === 'warning') {
          console.warn(`⚠️ ${error.title}: ${error.message}`);
        }
      });
    }

    // 5. Log success metrics
    console.log('✅ Diet plan generated:', {
      calories: dayMeal.totalCalories,
      protein: dayMeal.totalMacros.protein,
      meals: data.data.meals.length,
      cuisine: data.metadata.cuisine,
      accuracy: data.metadata.nutritionalAccuracy?.difference,
    });

    return dayMeal;
  } catch (error) {
    console.error('❌ Failed to generate diet plan:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: FETCH AND TRANSFORM WORKOUT PLAN
// ============================================================================

/**
 * Example: Generate personalized workout from Workers API
 */
export async function generateWorkoutPlan(
  userId: string,
  workoutType: 'strength' | 'cardio' | 'hiit',
  duration: number,
  equipment: string[] = ['bodyweight']
): Promise<DayWorkout> {
  try {
    // 1. Call Workers API
    const response = await fetch('https://your-workers.dev/workout/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        workoutType,
        duration,
        profile: {
          availableEquipment: equipment,
          experienceLevel: 'intermediate',
          fitnessGoal: 'muscle_gain',
        },
      }),
    });

    const data = await response.json();

    // 2. Validate response
    if (!isValidWorkoutResponse(data)) {
      const errorMsg = extractErrorMessage(data);
      throw new Error(`Invalid workout response: ${errorMsg}`);
    }

    // 3. Transform to app format
    const dayWorkout = transformWorkoutResponse(data, userId, new Date().toISOString());

    // 4. Handle validation warnings
    if (data.metadata.validation?.warnings && data.metadata.validation.warnings.length > 0) {
      console.warn('⚠️ Workout validation warnings:', data.metadata.validation.warnings);
    }

    // 5. Log success metrics
    console.log('✅ Workout plan generated:', {
      duration: dayWorkout.duration,
      calories: dayWorkout.estimatedCalories,
      exercises: dayWorkout.exercises.length,
      equipment: dayWorkout.equipment,
      usedMetrics: data.metadata.usedCalculatedMetrics,
      vo2max: data.metadata.calculatedMetricsSummary?.vo2max,
    });

    return dayWorkout;
  } catch (error) {
    console.error('❌ Failed to generate workout plan:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: BATCH TRANSFORMATION
// ============================================================================

/**
 * Example: Generate and transform weekly meal plan
 */
export async function generateWeeklyMealPlan(
  userId: string,
  calorieTarget: number
): Promise<DayMeal[]> {
  const weekDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const mealPlans = await Promise.all(
    weekDays.map(async (day, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);

      try {
        // Generate diet for each day
        const response = await fetch('https://your-workers.dev/diet/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify({
            calorieTarget,
            mealsPerDay: 4,
          }),
        });

        const data = await response.json();

        if (!isValidDietResponse(data)) {
          throw new Error(`Invalid response for ${day}`);
        }

        return transformDietResponse(data, userId, date.toISOString());
      } catch (error) {
        console.error(`❌ Failed to generate ${day} meal plan:`, error);
        throw error;
      }
    })
  );

  console.log('✅ Weekly meal plan generated:', {
    totalPlans: mealPlans.length,
    avgCalories: mealPlans.reduce((sum, m) => sum + m.totalCalories, 0) / mealPlans.length,
    avgProtein: mealPlans.reduce((sum, m) => sum + m.totalMacros.protein, 0) / mealPlans.length,
  });

  return mealPlans;
}

// ============================================================================
// EXAMPLE 4: ERROR HANDLING WITH RETRIES
// ============================================================================

/**
 * Example: Robust diet generation with retry logic
 */
export async function generateDietWithRetry(
  userId: string,
  calorieTarget: number,
  maxRetries: number = 3
): Promise<DayMeal> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} to generate diet plan...`);

      const response = await fetch('https://your-workers.dev/diet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          calorieTarget,
          mealsPerDay: 4,
          temperature: 0.7 + (attempt - 1) * 0.1, // Increase randomness on retries
        }),
      });

      const data = await response.json();

      // Check for critical errors
      if (!isValidDietResponse(data)) {
        throw new Error(extractErrorMessage(data));
      }

      // Check for validation errors in metadata
      if (data.metadata.warnings) {
        const errors = transformValidationErrors(data.metadata.warnings);
        const criticalErrors = errors.filter(e => e.severity === 'error');

        if (criticalErrors.length > 0) {
          console.warn(`⚠️ Critical validation errors on attempt ${attempt}:`, criticalErrors);
          throw new Error(criticalErrors[0].message);
        }
      }

      // Success!
      const dayMeal = transformDietResponse(data, userId, new Date().toISOString());

      console.log(`✅ Diet plan generated successfully on attempt ${attempt}`);

      return dayMeal;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Failed to generate diet plan after ${maxRetries} attempts: ${lastError?.message}`);
}

// ============================================================================
// EXAMPLE 5: CACHING TRANSFORMED RESPONSES
// ============================================================================

// Simple in-memory cache
const transformedCache = new Map<string, { data: DayMeal | DayWorkout; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Example: Cache transformed diet responses
 */
export async function getCachedDietPlan(
  userId: string,
  calorieTarget: number
): Promise<DayMeal> {
  const cacheKey = `diet-${userId}-${calorieTarget}`;

  // Check cache
  const cached = transformedCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('✅ Returning cached diet plan');
    return cached.data as DayMeal;
  }

  // Generate fresh
  console.log('🔄 Generating fresh diet plan...');
  const dayMeal = await generateDietPlan(userId, calorieTarget);

  // Cache the transformed result
  transformedCache.set(cacheKey, {
    data: dayMeal,
    timestamp: Date.now(),
  });

  return dayMeal;
}

// ============================================================================
// EXAMPLE 6: DISPLAYING VALIDATION ERRORS TO USER
// ============================================================================

/**
 * Example: Show user-friendly errors in UI
 */
export async function generateDietWithUserFeedback(
  userId: string,
  calorieTarget: number,
  showToast: (message: string, type: 'success' | 'warning' | 'error') => void
): Promise<DayMeal | null> {
  try {
    const response = await fetch('https://your-workers.dev/diet/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        calorieTarget,
        mealsPerDay: 4,
      }),
    });

    const data = await response.json();

    if (!isValidDietResponse(data)) {
      const errorMsg = extractErrorMessage(data);
      showToast(errorMsg, 'error');
      return null;
    }

    // Transform response
    const dayMeal = transformDietResponse(data, userId, new Date().toISOString());

    // Show validation warnings to user
    if (data.metadata.warnings && data.metadata.warnings.length > 0) {
      const userErrors = transformValidationErrors(data.metadata.warnings);

      userErrors.forEach(error => {
        if (error.severity === 'error') {
          showToast(`❌ ${error.title}: ${error.message}`, 'error');
        } else if (error.severity === 'warning') {
          showToast(`⚠️ ${error.message}`, 'warning');
        } else {
          console.log(`ℹ️ ${error.message}`);
        }
      });
    }

    // Show success
    showToast(
      `✅ Meal plan generated! ${dayMeal.totalCalories} calories, ${dayMeal.totalMacros.protein}g protein`,
      'success'
    );

    return dayMeal;
  } catch (error) {
    showToast(`❌ Failed to generate meal plan: ${(error as Error).message}`, 'error');
    return null;
  }
}

// ============================================================================
// EXAMPLE 7: INTEGRATION WITH REACT HOOKS
// ============================================================================

/**
 * Example React Hook: useDietGeneration
 */
/*
import { useState, useCallback } from 'react';

export function useDietGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayMeal, setDayMeal] = useState<DayMeal | null>(null);

  const generate = useCallback(async (userId: string, calorieTarget: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://your-workers.dev/diet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ calorieTarget, mealsPerDay: 4 }),
      });

      const data = await response.json();

      if (!isValidDietResponse(data)) {
        throw new Error(extractErrorMessage(data));
      }

      const transformed = transformDietResponse(data, userId, new Date().toISOString());

      // Handle warnings
      if (data.metadata.warnings) {
        const userErrors = transformValidationErrors(data.metadata.warnings);
        const criticalErrors = userErrors.filter(e => e.severity === 'error');

        if (criticalErrors.length > 0) {
          throw new Error(criticalErrors[0].message);
        }
      }

      setDayMeal(transformed);
      return transformed;
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, dayMeal, generate };
}
*/

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Mock function - Replace with your actual auth implementation
 */
async function getAuthToken(): Promise<string> {
  // TODO: Implement actual auth token retrieval
  return 'your-auth-token';
}

/**
 * Example: Type-safe response processing
 */
export function processDietResponse(
  response: unknown,
  userId: string
): DayMeal | { error: string } {
  if (isValidDietResponse(response)) {
    // TypeScript knows response is WorkersDietResponse here
    try {
      return transformDietResponse(response, userId);
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  return { error: extractErrorMessage(response) };
}

/**
 * Example: Logging transformation metrics
 */
export function logTransformationMetrics(
  response: WorkersDietResponse | WorkersWorkoutResponse,
  transformedData: DayMeal | DayWorkout
): void {
  if ('data' in response && 'meals' in response.data) {
    // Diet response
    const dietResponse = response as WorkersDietResponse;
    console.log('📊 Diet Transformation Metrics:', {
      apiTime: dietResponse.metadata.aiGenerationTime,
      tokens: dietResponse.metadata.tokensUsed,
      cost: dietResponse.metadata.costUsd,
      accuracy: dietResponse.metadata.nutritionalAccuracy?.difference,
      transformedId: transformedData.id,
    });
  } else if ('data' in response && 'exercises' in response.data) {
    // Workout response
    const workoutResponse = response as WorkersWorkoutResponse;
    console.log('📊 Workout Transformation Metrics:', {
      apiTime: workoutResponse.metadata.aiGenerationTime,
      tokens: workoutResponse.metadata.tokensUsed,
      cost: workoutResponse.metadata.costUsd,
      usedMetrics: workoutResponse.metadata.usedCalculatedMetrics,
      transformedId: transformedData.id,
    });
  }
}
