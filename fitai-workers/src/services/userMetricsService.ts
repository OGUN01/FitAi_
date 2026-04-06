/**
 * FitAI Workers - User Metrics Service
 *
 * Loads calculated health metrics from the database.
 * NEVER recalculates - always uses values from advanced_review table.
 */

import { getSupabaseClient } from '../utils/supabase';
import { Env } from '../utils/types';
import { APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

interface CanonicalCurrentWeight {
  weight_kg: number;
  entry_date: string;
  recorded_at?: string | null;
}

/**
 * User health metrics from advanced_review table
 * These are pre-calculated during onboarding using HealthCalculatorFacade
 */
export interface UserHealthMetrics {
  // Core metabolic calculations
  calculated_bmr: number;
  calculated_bmi: number;
  calculated_tdee: number;

  // BMI classification
  bmi_category: string;

  // Daily nutritional needs (EXACT values - NEVER recalculate)
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_water_ml: number;
  daily_fiber_g?: number;

  // Advanced metrics
  estimated_vo2_max?: number;
  overall_health_score?: number;
  health_grade?: string;

  // Context information
  detected_climate?: string;
  detected_ethnicity?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

/**
 * Load user's calculated health metrics from database
 *
 * @param env - Cloudflare Worker environment
 * @param userId - User ID to load metrics for
 * @returns User health metrics or throws error
 *
 * @throws {APIError} If metrics not found or database error
 *
 * @example
 * ```typescript
 * const metrics = await loadUserMetrics(c.env, userId);
 * console.log('Daily calories:', metrics.daily_calories);
 * console.log('BMR:', metrics.calculated_bmr);
 * ```
 */
export async function loadUserMetrics(
  env: Env,
  userId: string
): Promise<UserHealthMetrics> {
  try {
    console.log(`[UserMetrics] Loading metrics for user: ${userId}`);

    const supabase = getSupabaseClient(env);

    const { data, error } = await supabase
      .from('advanced_review')
      .select(`
        calculated_bmr,
        calculated_bmi,
        bmi_category,
        calculated_tdee,
        daily_calories,
        daily_water_ml,
        daily_protein_g,
        daily_carbs_g,
        daily_fat_g,
        daily_fiber_g,
        estimated_vo2_max,
        overall_health_score,
        health_grade,
        detected_climate,
        detected_ethnicity,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[UserMetrics] Database error:', error);
      throw new APIError(
        'Failed to load user metrics from database',
        500,
        ErrorCode.DATABASE_ERROR,
        { error: error.message }
      );
    }

    if (!data) {
      console.error('[UserMetrics] No metrics found for user:', userId);
      throw new APIError(
        'User metrics not found. Please complete onboarding first.',
        404,
        ErrorCode.NOT_FOUND,
        { userId }
      );
    }

    // Validate critical fields — enforce clinical minimum floor
    if (!data.daily_calories || data.daily_calories === 0) {
      throw new APIError(
        'Invalid daily calorie calculation. Please recomplete onboarding.',
        400,
        ErrorCode.INVALID_PARAMETER,
        { field: 'daily_calories' }
      );
    }
    if (data.daily_calories < 1000) {
      console.error('[UserMetrics] daily_calories below clinical minimum:', data.daily_calories, '— clamping to 1200');
      data.daily_calories = 1200;
    }

    if (!data.calculated_bmr || data.calculated_bmr === 0) {
      throw new APIError(
        'Invalid BMR calculation. Please recomplete onboarding.',
        400,
        ErrorCode.INVALID_PARAMETER,
        { field: 'calculated_bmr' }
      );
    }

    if (!data.calculated_tdee || data.calculated_tdee === 0) {
      throw new APIError(
        'Invalid TDEE calculation. Please recomplete onboarding.',
        400,
        ErrorCode.INVALID_PARAMETER,
        { field: 'calculated_tdee' }
      );
    }

    console.log('[UserMetrics] Metrics loaded successfully:', {
      bmr: data.calculated_bmr,
      tdee: data.calculated_tdee,
      daily_calories: data.daily_calories,
      protein: data.daily_protein_g,
      carbs: data.daily_carbs_g,
      fat: data.daily_fat_g,
    });

    return data as UserHealthMetrics;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    console.error('[UserMetrics] Unexpected error:', error);
    throw new APIError(
      'Failed to load user metrics',
      500,
      ErrorCode.INTERNAL_ERROR,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Load basic user profile information
 * Used for context in AI prompts
 */
export async function loadUserProfile(env: Env, userId: string) {
  try {
    console.log(`[UserMetrics] Loading profile for user: ${userId}`);

    const supabase = getSupabaseClient(env);

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        age,
        gender,
        country,
        state,
        occupation_type,
        wake_time,
        sleep_time
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.warn('[UserMetrics] Could not load user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[UserMetrics] Error loading profile:', error);
    return null;
  }
}

async function loadCanonicalCurrentWeight(
  env: Env,
  userId: string,
): Promise<CanonicalCurrentWeight | null> {
  const supabase = getSupabaseClient(env);

  const { data: canonicalWeight, error: canonicalWeightError } = await supabase
    .from('user_current_weight')
    .select('weight_kg, entry_date, recorded_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (canonicalWeightError && canonicalWeightError.code !== 'PGRST116') {
    console.warn(
      '[UserMetrics] Canonical current-weight lookup failed, falling back to progress_entries:',
      canonicalWeightError,
    );
  }

  if (canonicalWeight?.weight_kg) {
    return canonicalWeight as CanonicalCurrentWeight;
  }

  const { data: latestManualWeight, error: latestManualWeightError } =
    await supabase
      .from('progress_entries')
      .select('weight_kg, entry_date, created_at')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestManualWeightError) {
    console.warn(
      '[UserMetrics] Fallback current-weight lookup failed:',
      latestManualWeightError,
    );
    return null;
  }

  if (!latestManualWeight?.weight_kg) {
    return null;
  }

  return {
    weight_kg: latestManualWeight.weight_kg,
    entry_date: latestManualWeight.entry_date,
    recorded_at: latestManualWeight.created_at ?? latestManualWeight.entry_date,
  };
}

/**
 * Load user's body measurements
 * Used for workout customization
 */
export async function loadBodyMeasurements(env: Env, userId: string) {
  try {
    console.log(`[UserMetrics] Loading body measurements for user: ${userId}`);

    const supabase = getSupabaseClient(env);

    const [{ data, error }, canonicalCurrentWeight] = await Promise.all([
      supabase
        .from('body_analysis')
        .select(`
          height_cm,
          current_weight_kg,
          target_weight_kg,
          body_fat_percentage,
          medical_conditions,
          medications,
          physical_limitations,
          pregnancy_status,
          pregnancy_trimester,
          breastfeeding_status,
          stress_level
        `)
        .eq('user_id', userId)
        .maybeSingle(),
      loadCanonicalCurrentWeight(env, userId),
    ]);

    if (error && error.code !== 'PGRST116') {
      console.warn('[UserMetrics] Could not load body measurements:', error);
      return null;
    }

    if (!data && !canonicalCurrentWeight) {
      return null;
    }

    return {
      ...(data || {}),
      ...(canonicalCurrentWeight
        ? { current_weight_kg: canonicalCurrentWeight.weight_kg }
        : {}),
    };
  } catch (error) {
    console.error('[UserMetrics] Error loading body measurements:', error);
    return null;
  }
}

/**
 * Load user's preferences for AI context
 * Now loads ALL onboarding data for truly personalized AI generation
 */
export async function loadUserPreferences(env: Env, userId: string) {
  try {
    console.log(`[UserMetrics] Loading preferences for user: ${userId}`);

    const supabase = getSupabaseClient(env);

    // Load both diet and workout preferences in parallel
    const [dietResult, workoutResult] = await Promise.all([
      supabase
        .from('diet_preferences')
        .select(`
          diet_type,
          allergies,
          restrictions,
          cuisine_preferences,
          snacks_count,
          breakfast_enabled,
          lunch_enabled,
          dinner_enabled,
          snacks_enabled,
          
          cooking_skill_level,
          max_prep_time_minutes,
          budget_level,
          
          keto_ready,
          intermittent_fasting_ready,
          paleo_ready,
          mediterranean_ready,
          low_carb_ready,
          high_protein_ready,
          
          drinks_enough_water,
          limits_sugary_drinks,
          eats_regular_meals,
          avoids_late_night_eating,
          controls_portion_sizes,
          reads_nutrition_labels,
          eats_processed_foods,
          eats_5_servings_fruits_veggies,
          limits_refined_sugar,
          includes_healthy_fats,
          
          drinks_alcohol,
          smokes_tobacco,
          drinks_coffee,
          takes_supplements
        `)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('workout_preferences')
        .select(`
          location,
          equipment,
          intensity,
          primary_goals,
          activity_level,
          workout_experience_years,
          can_do_pushups,
          can_run_minutes,
          flexibility_level,
          workout_frequency_per_week,
          physical_limitations: body_analysis!inner(physical_limitations)
        `)
        .eq('user_id', userId)
        .single(),
    ]);

    return {
      diet: dietResult.data,
      workout: workoutResult.data,
    };
  } catch (error) {
    console.error('[UserMetrics] Error loading preferences:', error);
    return { diet: null, workout: null };
  }
}
