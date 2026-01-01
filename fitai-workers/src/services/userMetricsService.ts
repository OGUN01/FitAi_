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
  bmi_health_risk?: string;

  // Daily nutritional needs (EXACT values - NEVER recalculate)
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_water_ml: number;

  // Advanced metrics
  heart_rate_zones?: {
    zone1_min: number;
    zone1_max: number;
    zone2_min: number;
    zone2_max: number;
    zone3_min: number;
    zone3_max: number;
    zone4_min: number;
    zone4_max: number;
    zone5_min: number;
    zone5_max: number;
  };
  vo2_max_estimate?: number;
  vo2_max_classification?: string;
  health_score?: number;
  health_grade?: string;

  // Context information
  detected_climate?: string;
  detected_ethnicity?: string;
  bmr_formula_used?: string;
  bmr_formula_accuracy?: string;
  bmr_formula_confidence?: number;

  // Metadata
  calculations_version?: string;
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
        bmi_health_risk,
        calculated_tdee,
        daily_calories,
        daily_water_ml,
        daily_protein_g,
        daily_carbs_g,
        daily_fat_g,
        heart_rate_zones,
        vo2_max_estimate,
        vo2_max_classification,
        health_score,
        health_grade,
        detected_climate,
        detected_ethnicity,
        bmr_formula_used,
        bmr_formula_accuracy,
        bmr_formula_confidence,
        calculations_version,
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

    // Validate critical fields
    if (!data.daily_calories || data.daily_calories === 0) {
      throw new APIError(
        'Invalid daily calorie calculation. Please recomplete onboarding.',
        400,
        ErrorCode.INVALID_PARAMETER,
        { field: 'daily_calories' }
      );
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
        occupation_type
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

/**
 * Load user's body measurements
 * Used for workout customization
 */
export async function loadBodyMeasurements(env: Env, userId: string) {
  try {
    console.log(`[UserMetrics] Loading body measurements for user: ${userId}`);

    const supabase = getSupabaseClient(env);

    const { data, error } = await supabase
      .from('body_analysis')
      .select(`
        height_cm,
        current_weight_kg,
        target_weight_kg,
        body_fat_percentage,
        medical_conditions,
        physical_limitations
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.warn('[UserMetrics] Could not load body measurements:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[UserMetrics] Error loading body measurements:', error);
    return null;
  }
}

/**
 * Load user's preferences for AI context
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
          breakfast_enabled,
          lunch_enabled,
          dinner_enabled,
          snacks_enabled
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
