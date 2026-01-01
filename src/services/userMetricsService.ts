/**
 * USER METRICS SERVICE
 *
 * Centralized service for loading and providing user's calculated health metrics
 * to main app screens, AI generation, and other features.
 *
 * This service loads data from:
 * - profiles (personal info)
 * - body_analysis (BMI, BMR, ideal weight range)
 * - advanced_review (TDEE, daily calories, macros, water target, etc.)
 * - diet_preferences (diet type, allergies, meal preferences)
 * - workout_preferences (goals, activity level, fitness assessment)
 */

import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
} from './onboardingService';
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from '../types/onboarding';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete user metrics loaded from database
 * Includes all calculated health metrics from onboarding
 */
export interface UserMetrics {
  // Personal Information
  personalInfo: PersonalInfoData | null;

  // Diet Preferences
  dietPreferences: DietPreferencesData | null;

  // Body Analysis (includes BMI, BMR, ideal weight range)
  bodyAnalysis: BodyAnalysisData | null;

  // Workout Preferences
  workoutPreferences: WorkoutPreferencesData | null;

  // Advanced Review (all calculated metrics)
  advancedReview: AdvancedReviewData | null;

  // Convenience flags
  hasCompletedOnboarding: boolean;
  hasCalculatedMetrics: boolean;
}

/**
 * Quick access to most commonly used metrics
 */
export interface QuickMetrics {
  // Basic Info
  age: number | null;
  gender: string | null;

  // Body Metrics
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  bmi: number | null;
  bmr: number | null;

  // Daily Targets (from advanced_review)
  daily_calories: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  daily_water_ml: number | null;

  // Goals
  weekly_weight_loss_rate: number | null;
  estimated_timeline_weeks: number | null;
  primary_goals: string[] | null;

  // Calculated
  tdee: number | null;
  ideal_weight_min: number | null;
  ideal_weight_max: number | null;

  // NEW: Universal Health System metrics
  bmi_category: string | null;
  bmi_health_risk: string | null;
  detected_climate: string | null;
  detected_ethnicity: string | null;
  bmr_formula_used: string | null;
  health_score: number | null;
  health_grade: string | null;
  vo2_max_estimate: number | null;
  vo2_max_classification: string | null;
  heart_rate_zones: any | null;
}

// ============================================================================
// USER METRICS SERVICE
// ============================================================================

export class UserMetricsService {
  private static instance: UserMetricsService;
  private cachedMetrics: UserMetrics | null = null;
  private lastLoadTime: number = 0;
  private CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): UserMetricsService {
    if (!UserMetricsService.instance) {
      UserMetricsService.instance = new UserMetricsService();
    }
    return UserMetricsService.instance;
  }

  /**
   * Load all user metrics from database
   * Uses caching to avoid excessive database calls
   */
  async loadUserMetrics(userId: string, forceRefresh: boolean = false): Promise<UserMetrics> {
    console.log('📊 [USER-METRICS] Loading user metrics for:', userId, { forceRefresh });

    // Check cache
    const now = Date.now();
    if (!forceRefresh && this.cachedMetrics && (now - this.lastLoadTime) < this.CACHE_DURATION_MS) {
      console.log('📊 [USER-METRICS] Returning cached metrics');
      return this.cachedMetrics;
    }

    try {
      console.log('📊 [USER-METRICS] Loading from database...');

      // Load all data in parallel for performance
      const [
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences,
        advancedReview,
      ] = await Promise.all([
        PersonalInfoService.load(userId),
        DietPreferencesService.load(userId),
        BodyAnalysisService.load(userId),
        WorkoutPreferencesService.load(userId),
        AdvancedReviewService.load(userId),
      ]);

      console.log('📊 [USER-METRICS] Data loaded:', {
        hasPersonalInfo: !!personalInfo,
        hasDietPreferences: !!dietPreferences,
        hasBodyAnalysis: !!bodyAnalysis,
        hasWorkoutPreferences: !!workoutPreferences,
        hasAdvancedReview: !!advancedReview,
      });

      const metrics: UserMetrics = {
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences,
        advancedReview,
        hasCompletedOnboarding: !!(personalInfo && dietPreferences && bodyAnalysis && workoutPreferences),
        hasCalculatedMetrics: !!advancedReview,
      };

      // Cache the results
      this.cachedMetrics = metrics;
      this.lastLoadTime = now;

      console.log('✅ [USER-METRICS] User metrics loaded successfully');
      return metrics;
    } catch (error) {
      console.error('❌ [USER-METRICS] Failed to load user metrics:', error);
      throw error;
    }
  }

  /**
   * Get quick access to most commonly used metrics
   * This is a convenience method that extracts the most frequently accessed values
   */
  getQuickMetrics(userMetrics: UserMetrics): QuickMetrics {
    const { personalInfo, bodyAnalysis, workoutPreferences, advancedReview } = userMetrics;

    return {
      // Basic Info
      age: personalInfo?.age || null,
      gender: personalInfo?.gender || null,

      // Body Metrics
      height_cm: bodyAnalysis?.height_cm || null,
      current_weight_kg: bodyAnalysis?.current_weight_kg || null,
      target_weight_kg: bodyAnalysis?.target_weight_kg || null,
      bmi: bodyAnalysis?.bmi || advancedReview?.calculated_bmi || null,
      bmr: bodyAnalysis?.bmr || advancedReview?.calculated_bmr || null,

      // Daily Targets (PRIMARY SOURCE: advanced_review)
      daily_calories: advancedReview?.daily_calories || null,
      daily_protein_g: advancedReview?.daily_protein_g || null,
      daily_carbs_g: advancedReview?.daily_carbs_g || null,
      daily_fat_g: advancedReview?.daily_fat_g || null,
      daily_water_ml: advancedReview?.daily_water_ml || null,

      // Goals
      weekly_weight_loss_rate: advancedReview?.weekly_weight_loss_rate || null,
      estimated_timeline_weeks: advancedReview?.estimated_timeline_weeks || null,
      primary_goals: workoutPreferences?.primary_goals || null,

      // Calculated
      tdee: advancedReview?.calculated_tdee || null,
      ideal_weight_min: bodyAnalysis?.ideal_weight_min || advancedReview?.healthy_weight_min || null,
      ideal_weight_max: bodyAnalysis?.ideal_weight_max || advancedReview?.healthy_weight_max || null,

      // NEW: Universal Health System metrics
      bmi_category: advancedReview?.bmi_category || null,
      bmi_health_risk: advancedReview?.bmi_health_risk || null,
      detected_climate: advancedReview?.detected_climate || null,
      detected_ethnicity: advancedReview?.detected_ethnicity || null,
      bmr_formula_used: advancedReview?.bmr_formula_used || null,
      health_score: advancedReview?.health_score || null,
      health_grade: advancedReview?.health_grade || null,
      vo2_max_estimate: advancedReview?.vo2_max_estimate || null,
      vo2_max_classification: advancedReview?.vo2_max_classification || null,
      heart_rate_zones: advancedReview?.heart_rate_zones || null,
    };
  }

  /**
   * Get diet generation parameters from user metrics
   * Use this when generating meal plans
   */
  getDietGenerationParams(userMetrics: UserMetrics): {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
    dietType: string;
    allergies: string[];
    restrictions: string[];
    mealsEnabled: {
      breakfast: boolean;
      lunch: boolean;
      dinner: boolean;
      snacks: boolean;
    };
  } | null {
    const { advancedReview, dietPreferences } = userMetrics;

    if (!advancedReview || !dietPreferences) {
      console.warn('⚠️ [USER-METRICS] Cannot get diet generation params - missing data');
      return null;
    }

    // CRITICAL: Use ACTUAL calculated values from database, NO FALLBACKS
    if (!advancedReview.daily_calories) {
      console.error('❌ [USER-METRICS] Missing daily_calories in advanced_review');
      throw new Error('User metrics incomplete - daily calorie target not calculated. Please complete onboarding.');
    }

    return {
      dailyCalories: advancedReview.daily_calories,
      protein: advancedReview.daily_protein_g || 0,
      carbs: advancedReview.daily_carbs_g || 0,
      fat: advancedReview.daily_fat_g || 0,
      dietType: dietPreferences.diet_type,
      allergies: dietPreferences.allergies || [],
      restrictions: dietPreferences.restrictions || [],
      mealsEnabled: {
        breakfast: dietPreferences.breakfast_enabled ?? true,
        lunch: dietPreferences.lunch_enabled ?? true,
        dinner: dietPreferences.dinner_enabled ?? true,
        snacks: dietPreferences.snacks_enabled ?? true,
      },
    };
  }

  /**
   * Get workout generation parameters from user metrics
   * Use this when generating workout plans
   */
  getWorkoutGenerationParams(userMetrics: UserMetrics): {
    tdee: number;
    bmr: number;
    currentWeight: number;
    targetWeight: number;
    weeklyWeightChangeRate: number;
    primaryGoals: string[];
    intensity: string;
    location: string;
    equipment: string[];
    activityLevel: string;
    fitnessLevel: {
      experienceYears: number;
      canDoPushups: number;
      canRunMinutes: number;
    };
  } | null {
    const { advancedReview, bodyAnalysis, workoutPreferences } = userMetrics;

    if (!advancedReview || !bodyAnalysis || !workoutPreferences) {
      console.warn('⚠️ [USER-METRICS] Cannot get workout generation params - missing data');
      return null;
    }

    // CRITICAL: Use ACTUAL calculated values from database
    if (!advancedReview.calculated_tdee) {
      console.error('❌ [USER-METRICS] Missing calculated_tdee in advanced_review');
      throw new Error('User metrics incomplete - TDEE not calculated. Please complete onboarding.');
    }

    return {
      tdee: advancedReview.calculated_tdee,
      bmr: advancedReview.calculated_bmr || 0,
      currentWeight: bodyAnalysis.current_weight_kg,
      targetWeight: bodyAnalysis.target_weight_kg || bodyAnalysis.current_weight_kg,
      weeklyWeightChangeRate: advancedReview.weekly_weight_loss_rate || 0,
      primaryGoals: workoutPreferences.primary_goals || [],
      intensity: workoutPreferences.intensity,
      location: workoutPreferences.location,
      equipment: workoutPreferences.equipment || [],
      activityLevel: workoutPreferences.activity_level,
      fitnessLevel: {
        experienceYears: workoutPreferences.workout_experience_years,
        canDoPushups: workoutPreferences.can_do_pushups,
        canRunMinutes: workoutPreferences.can_run_minutes,
      },
    };
  }

  /**
   * Clear cached metrics
   * Call this after user updates their profile/goals
   */
  clearCache(): void {
    console.log('📊 [USER-METRICS] Clearing cache');
    this.cachedMetrics = null;
    this.lastLoadTime = 0;
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const metrics = await this.loadUserMetrics(userId);
    return metrics.hasCompletedOnboarding;
  }

  /**
   * Check if user has calculated metrics (completed advanced review)
   */
  async hasCalculatedMetrics(userId: string): Promise<boolean> {
    const metrics = await this.loadUserMetrics(userId);
    return metrics.hasCalculatedMetrics;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const userMetricsService = UserMetricsService.getInstance();
