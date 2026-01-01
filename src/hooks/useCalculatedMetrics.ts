/**
 * useCalculatedMetrics Hook
 * 
 * Centralized hook for accessing ALL calculated health metrics from onboarding.
 * This is the SINGLE SOURCE OF TRUTH for nutrition targets, water goals, and body metrics.
 * 
 * CRITICAL: This hook does NOT provide fallback values. If data is missing,
 * it returns null to make data flow issues immediately visible.
 * 
 * Data sources:
 * - advanced_review table: calories, protein, carbs, fat, water, BMI category, climate, etc.
 * - body_analysis table: weight, height, target weight, body fat
 * - profiles table: age, gender, country, state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdvancedReviewService,
  BodyAnalysisService,
  PersonalInfoService,
  WorkoutPreferencesService,
} from '../services/onboardingService';
import {
  AdvancedReviewData,
  BodyAnalysisData,
  PersonalInfoData,
  WorkoutPreferencesData,
} from '../types/onboarding';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Calculated metrics from onboarding - NO FALLBACKS
 * All values are nullable to indicate missing data clearly
 */
export interface CalculatedMetrics {
  // === Daily Nutritional Targets (from advanced_review) ===
  dailyCalories: number | null;
  dailyProteinG: number | null;
  dailyCarbsG: number | null;
  dailyFatG: number | null;
  dailyWaterML: number | null;
  dailyFiberG: number | null;
  
  // === Metabolic Calculations (from advanced_review) ===
  calculatedBMI: number | null;
  calculatedBMR: number | null;
  calculatedTDEE: number | null;
  metabolicAge: number | null;
  
  // === BMI Classification (from advanced_review) ===
  bmiCategory: string | null;
  bmiHealthRisk: string | null;
  
  // === Auto-Detected Context (from advanced_review) ===
  detectedClimate: string | null;
  detectedEthnicity: string | null;
  bmrFormulaUsed: string | null;
  
  // === Weight Goals (from advanced_review & body_analysis) ===
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  healthyWeightMin: number | null;
  healthyWeightMax: number | null;
  weeklyWeightLossRate: number | null;
  estimatedTimelineWeeks: number | null;
  
  // === Body Metrics (from body_analysis) ===
  heightCm: number | null;
  bodyFatPercentage: number | null;
  idealWeightMin: number | null;
  idealWeightMax: number | null;
  
  // === Personal Info (from profiles) ===
  age: number | null;
  gender: string | null;
  country: string | null;
  state: string | null;
  
  // === Activity (from workout_preferences) ===
  activityLevel: string | null;
  primaryGoals: string[] | null;
  
  // === Health Scores (from advanced_review) ===
  healthScore: number | null;
  healthGrade: string | null;
  fitnessReadinessScore: number | null;
  dietReadinessScore: number | null;
  
  // === Heart Rate Zones (from advanced_review) ===
  heartRateZones: {
    fatBurn: { min: number; max: number };
    cardio: { min: number; max: number };
    peak: { min: number; max: number };
  } | null;
  
  // === VO2 Max (from advanced_review) ===
  vo2MaxEstimate: number | null;
  vo2MaxClassification: string | null;
}

export interface UseCalculatedMetricsReturn {
  // Data
  metrics: CalculatedMetrics | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Data availability flags
  hasCompletedOnboarding: boolean;
  hasCalculatedMetrics: boolean;
  
  // Actions
  refreshMetrics: () => Promise<void>;
  clearCache: () => void;
  
  // Convenience getters (throw-free, for UI binding)
  // These return the raw nullable values - UI should handle null states
  getWaterGoalLiters: () => number | null;
  getCalorieTarget: () => number | null;
  getMacroTargets: () => { protein: number | null; carbs: number | null; fat: number | null };
}

// ============================================================================
// CACHE
// ============================================================================

// In-memory cache for performance
let metricsCache: {
  metrics: CalculatedMetrics | null;
  timestamp: number;
  userId: string | null;
} = {
  metrics: null,
  timestamp: 0,
  userId: null,
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the metrics cache globally.
 * Call this after onboarding completes to ensure fresh data is loaded.
 * 
 * @example
 * // After onboarding complete
 * import { invalidateMetricsCache } from '@/hooks/useCalculatedMetrics';
 * invalidateMetricsCache();
 */
export function invalidateMetricsCache(): void {
  console.log('📊 [useCalculatedMetrics] Global cache invalidation');
  metricsCache = {
    metrics: null,
    timestamp: 0,
    userId: null,
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useCalculatedMetrics = (): UseCalculatedMetricsReturn => {
  const { user, isAuthenticated, isGuestMode } = useAuth();
  
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCalculatedMetrics, setHasCalculatedMetrics] = useState(false);
  
  /**
   * Load metrics from database (authenticated users)
   */
  const loadFromDatabase = useCallback(async (userId: string): Promise<CalculatedMetrics | null> => {
    console.log('📊 [useCalculatedMetrics] Loading from database for user:', userId);
    
    try {
      // Load all data in parallel
      const [advancedReview, bodyAnalysis, personalInfo, workoutPreferences] = await Promise.all([
        AdvancedReviewService.load(userId),
        BodyAnalysisService.load(userId),
        PersonalInfoService.load(userId),
        WorkoutPreferencesService.load(userId),
      ]);
      
      console.log('📊 [useCalculatedMetrics] Data loaded:', {
        hasAdvancedReview: !!advancedReview,
        hasBodyAnalysis: !!bodyAnalysis,
        hasPersonalInfo: !!personalInfo,
        hasWorkoutPreferences: !!workoutPreferences,
      });
      
      // If no advanced_review data, user hasn't completed onboarding calculations
      if (!advancedReview) {
        console.log('⚠️ [useCalculatedMetrics] No advanced_review data found - onboarding incomplete');
        return null;
      }
      
      return mapToCalculatedMetrics(advancedReview, bodyAnalysis, personalInfo, workoutPreferences);
    } catch (err) {
      console.error('❌ [useCalculatedMetrics] Database load error:', err);
      throw err;
    }
  }, []);
  
  /**
   * Load metrics from AsyncStorage (guest users)
   */
  const loadFromAsyncStorage = useCallback(async (): Promise<CalculatedMetrics | null> => {
    console.log('📊 [useCalculatedMetrics] Loading from AsyncStorage (guest mode)');
    
    try {
      const onboardingDataStr = await AsyncStorage.getItem('onboarding_data');
      
      if (!onboardingDataStr) {
        console.log('⚠️ [useCalculatedMetrics] No onboarding_data in AsyncStorage');
        return null;
      }
      
      const onboardingData = JSON.parse(onboardingDataStr);
      console.log('📊 [useCalculatedMetrics] Parsed onboarding data from AsyncStorage');
      console.log('📊 [useCalculatedMetrics] Keys in stored data:', Object.keys(onboardingData));
      
      // Guest data structure may have advancedReview directly
      const advancedReview = onboardingData.advancedReview || onboardingData.advanced_review;
      const bodyAnalysis = onboardingData.bodyAnalysis || onboardingData.body_analysis;
      const personalInfo = onboardingData.personalInfo || onboardingData.personal_info;
      const workoutPreferences = onboardingData.workoutPreferences || onboardingData.workout_preferences;
      
      if (!advancedReview) {
        console.log('⚠️ [useCalculatedMetrics] No advancedReview in stored data');
        console.log('⚠️ [useCalculatedMetrics] Available keys:', Object.keys(onboardingData));
        return null;
      }
      
      console.log('✅ [useCalculatedMetrics] Found advancedReview with daily_water_ml:', advancedReview.daily_water_ml);
      
      return mapToCalculatedMetrics(advancedReview, bodyAnalysis, personalInfo, workoutPreferences);
    } catch (err) {
      console.error('❌ [useCalculatedMetrics] AsyncStorage load error:', err);
      throw err;
    }
  }, []);
  
  /**
   * Main load function with caching
   */
  const refreshMetrics = useCallback(async () => {
    const userId = user?.id || 'guest';
    
    // Check cache first
    const now = Date.now();
    if (
      metricsCache.userId === userId &&
      metricsCache.metrics &&
      (now - metricsCache.timestamp) < CACHE_DURATION_MS
    ) {
      console.log('📊 [useCalculatedMetrics] Returning cached metrics');
      setMetrics(metricsCache.metrics);
      setHasCalculatedMetrics(true);
      setHasCompletedOnboarding(true);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let loadedMetrics: CalculatedMetrics | null = null;
      
      if (isAuthenticated && user?.id) {
        loadedMetrics = await loadFromDatabase(user.id);
      } else if (isGuestMode) {
        loadedMetrics = await loadFromAsyncStorage();
      }
      
      if (loadedMetrics) {
        // Update cache
        metricsCache = {
          metrics: loadedMetrics,
          timestamp: now,
          userId,
        };
        
        setMetrics(loadedMetrics);
        setHasCalculatedMetrics(true);
        setHasCompletedOnboarding(true);
      } else {
        setMetrics(null);
        setHasCalculatedMetrics(false);
        setHasCompletedOnboarding(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load metrics';
      console.error('❌ [useCalculatedMetrics] Load error:', message);
      setError(message);
      setMetrics(null);
      setHasCalculatedMetrics(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated, isGuestMode, loadFromDatabase, loadFromAsyncStorage]);
  
  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    console.log('📊 [useCalculatedMetrics] Clearing cache');
    metricsCache = {
      metrics: null,
      timestamp: 0,
      userId: null,
    };
    setMetrics(null);
  }, []);
  
  // Load on mount and when auth changes
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);
  
  // Convenience getters
  const getWaterGoalLiters = useCallback((): number | null => {
    if (!metrics?.dailyWaterML) return null;
    return Math.round((metrics.dailyWaterML / 1000) * 10) / 10; // Convert ml to L with 1 decimal
  }, [metrics?.dailyWaterML]);
  
  const getCalorieTarget = useCallback((): number | null => {
    return metrics?.dailyCalories ?? null;
  }, [metrics?.dailyCalories]);
  
  const getMacroTargets = useCallback(() => ({
    protein: metrics?.dailyProteinG ?? null,
    carbs: metrics?.dailyCarbsG ?? null,
    fat: metrics?.dailyFatG ?? null,
  }), [metrics?.dailyProteinG, metrics?.dailyCarbsG, metrics?.dailyFatG]);
  
  return {
    metrics,
    isLoading,
    error,
    hasCompletedOnboarding,
    hasCalculatedMetrics,
    refreshMetrics,
    clearCache,
    getWaterGoalLiters,
    getCalorieTarget,
    getMacroTargets,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map raw data to CalculatedMetrics interface
 * NO FALLBACKS - missing data stays null
 */
function mapToCalculatedMetrics(
  advancedReview: AdvancedReviewData | null,
  bodyAnalysis: BodyAnalysisData | null,
  personalInfo: PersonalInfoData | null,
  workoutPreferences: WorkoutPreferencesData | null
): CalculatedMetrics {
  // Parse heart rate zones if available
  let heartRateZones: CalculatedMetrics['heartRateZones'] = null;
  if (advancedReview?.target_hr_fat_burn_min && advancedReview?.target_hr_fat_burn_max) {
    heartRateZones = {
      fatBurn: {
        min: advancedReview.target_hr_fat_burn_min,
        max: advancedReview.target_hr_fat_burn_max,
      },
      cardio: {
        min: advancedReview.target_hr_cardio_min || 0,
        max: advancedReview.target_hr_cardio_max || 0,
      },
      peak: {
        min: advancedReview.target_hr_peak_min || 0,
        max: advancedReview.target_hr_peak_max || 0,
      },
    };
  }
  
  // Handle heart_rate_zones stored as JSONB
  const hrZonesFromJson = (advancedReview as any)?.heart_rate_zones;
  if (hrZonesFromJson && typeof hrZonesFromJson === 'object') {
    heartRateZones = {
      fatBurn: {
        min: hrZonesFromJson.fatBurn?.min ?? hrZonesFromJson.fat_burn?.min ?? 0,
        max: hrZonesFromJson.fatBurn?.max ?? hrZonesFromJson.fat_burn?.max ?? 0,
      },
      cardio: {
        min: hrZonesFromJson.cardio?.min ?? 0,
        max: hrZonesFromJson.cardio?.max ?? 0,
      },
      peak: {
        min: hrZonesFromJson.peak?.min ?? 0,
        max: hrZonesFromJson.peak?.max ?? 0,
      },
    };
  }
  
  return {
    // Daily Nutritional Targets - NO FALLBACKS
    dailyCalories: advancedReview?.daily_calories ?? null,
    dailyProteinG: advancedReview?.daily_protein_g ?? null,
    dailyCarbsG: advancedReview?.daily_carbs_g ?? null,
    dailyFatG: advancedReview?.daily_fat_g ?? null,
    dailyWaterML: advancedReview?.daily_water_ml ?? null,
    dailyFiberG: advancedReview?.daily_fiber_g ?? null,
    
    // Metabolic Calculations - NO FALLBACKS
    calculatedBMI: advancedReview?.calculated_bmi ?? null,
    calculatedBMR: advancedReview?.calculated_bmr ?? null,
    calculatedTDEE: advancedReview?.calculated_tdee ?? null,
    metabolicAge: advancedReview?.metabolic_age ?? null,
    
    // BMI Classification - NO FALLBACKS
    bmiCategory: (advancedReview as any)?.bmi_category ?? null,
    bmiHealthRisk: (advancedReview as any)?.bmi_health_risk ?? null,
    
    // Auto-Detected Context - NO FALLBACKS
    detectedClimate: (advancedReview as any)?.detected_climate ?? null,
    detectedEthnicity: (advancedReview as any)?.detected_ethnicity ?? null,
    bmrFormulaUsed: (advancedReview as any)?.bmr_formula_used ?? null,
    
    // Weight Goals - NO FALLBACKS
    currentWeightKg: bodyAnalysis?.current_weight_kg ?? null,
    targetWeightKg: bodyAnalysis?.target_weight_kg ?? null,
    healthyWeightMin: advancedReview?.healthy_weight_min ?? null,
    healthyWeightMax: advancedReview?.healthy_weight_max ?? null,
    weeklyWeightLossRate: advancedReview?.weekly_weight_loss_rate ?? null,
    estimatedTimelineWeeks: advancedReview?.estimated_timeline_weeks ?? null,
    
    // Body Metrics - NO FALLBACKS
    heightCm: bodyAnalysis?.height_cm ?? null,
    bodyFatPercentage: bodyAnalysis?.body_fat_percentage ?? null,
    idealWeightMin: bodyAnalysis?.ideal_weight_min ?? null,
    idealWeightMax: bodyAnalysis?.ideal_weight_max ?? null,
    
    // Personal Info - NO FALLBACKS
    age: personalInfo?.age ?? null,
    gender: personalInfo?.gender ?? null,
    country: personalInfo?.country ?? null,
    state: personalInfo?.state ?? null,
    
    // Activity - NO FALLBACKS
    activityLevel: workoutPreferences?.activity_level ?? null,
    primaryGoals: workoutPreferences?.primary_goals ?? null,
    
    // Health Scores - NO FALLBACKS
    healthScore: (advancedReview as any)?.health_score ?? advancedReview?.overall_health_score ?? null,
    healthGrade: (advancedReview as any)?.health_grade ?? null,
    fitnessReadinessScore: advancedReview?.fitness_readiness_score ?? null,
    dietReadinessScore: advancedReview?.diet_readiness_score ?? null,
    
    // Heart Rate Zones
    heartRateZones,
    
    // VO2 Max - NO FALLBACKS
    vo2MaxEstimate: (advancedReview as any)?.vo2_max_estimate ?? advancedReview?.estimated_vo2_max ?? null,
    vo2MaxClassification: (advancedReview as any)?.vo2_max_classification ?? null,
  };
}

export default useCalculatedMetrics;

