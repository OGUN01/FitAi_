/**
 * useCalculatedMetrics Hook
 *
 * Centralized hook for accessing ALL calculated health metrics from onboarding.
 * This is the SINGLE SOURCE OF TRUTH for nutrition targets, water goals, and body metrics.
 *
 * CRITICAL: This hook does NOT provide fallback values. If data is missing,
 * it returns null to make data flow issues immediately visible.
 *
 * SSOT: Reads from profileStore (Zustand) — the single runtime source for all
 * onboarding profile data. profileStore is kept in sync with Supabase via DataBridge.
 * This hook NO LONGER calls Supabase directly, eliminating:
 *   - 5-minute stale cache after profile edits
 *   - Race conditions on cold start (Supabase fetch vs profileStore hydration)
 *   - Redundant network requests (profileStore already has the data)
 *
 * Data sources (all via profileStore):
 * - advancedReview: calories, protein, carbs, fat, water, BMI category, climate, etc.
 * - bodyAnalysis: weight, height, target weight, body fat
 * - personalInfo: age, gender, country, state
 * - workoutPreferences: activity level, goals, duration, frequency
 * - dietPreferences: meal enables (breakfast, lunch, dinner, snacks)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProfileStore } from "../stores/profileStore";
import { useNutritionStore } from "../stores/nutritionStore";
import type { WeeklyMealPlan } from "../ai";
import type {
  AdvancedReviewData,
  BodyAnalysisData,
  PersonalInfoData,
  WorkoutPreferencesData,
  DietPreferencesData,
} from "../types/onboarding";
import { weightTrackingService } from "../services/WeightTrackingService";
import {
  resolveCurrentWeightFromStores,
  applyResolvedCurrentWeight,
} from "../services/currentWeight";
import { waterCalculator } from "../utils/healthCalculations/calculators/waterCalculator";
import type { ActivityLevel, ClimateType } from "../utils/healthCalculations/types";
import { mapActivityLevelForHealthCalc } from "../utils/typeTransformers";

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
  targetTimelineWeeks: number | null; // User's original chosen timeline (body_analysis)

  // === Body Metrics (from body_analysis) ===
  heightCm: number | null;
  bodyFatPercentage: number | null;
  idealWeightMin: number | null;
  idealWeightMax: number | null;
  ideal_body_fat_max: number | null; // From advanced_review.ideal_body_fat_max

  // === Personal Info (from profiles) ===
  age: number | null;
  gender: string | null;
  country: string | null;
  state: string | null;

  // === Activity (from workout_preferences) ===
  activityLevel: string | null;
  primaryGoals: string[] | null;

  // === Workout Preferences (from workout_preferences) ===
  workoutDurationMinutes: number | null; // User's preferred workout duration from onboarding
  workoutFrequencyPerWeek: number | null; // How many days per week user wants to workout

  // === Workout Recommendations (from advanced_review) ===
  recommendedCardioMinutes: number | null; // Daily recommended cardio minutes
  mealsPerDay: number | null; // Number of meals per day

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

  // === Goal Engine (Phase C) — which target source drove today's targets ===
  // 'goal'                    → onboarding-goal-derived target (the default,
  //                            and the only source when goal_targets_mode='goal').
  // 'plan'                    → today's target came from the active custom diet
  //                            plan (goal_targets_mode='plan' + custom plan's
  //                            day has meals).
  // 'goal_fallback_empty_day' → goal_targets_mode='plan' is active but today's
  //                            custom-plan day is empty (no meals); the goal
  //                            target is used AND labelled so the UI can explain
  //                            the fallback rather than silently reverting.
  targetsSource: 'goal' | 'plan' | 'goal_fallback_empty_day';
}

export interface UseCalculatedMetricsReturn {
  // Data
  metrics: CalculatedMetrics | null;
  dailyCalories: number | null; // Convenience getter

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
  getMacroTargets: () => {
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
}

// ============================================================================
// CACHE — DEPRECATED
// ============================================================================

/**
 * Invalidate the metrics cache globally.
 *
 * LEGACY: This function is kept for backward compatibility. With the profileStore
 * refactor, there is no longer an internal cache — data is derived reactively from
 * profileStore. Calling this now forces a profileStore re-read on next render cycle
 * by bumping a revision counter.
 *
 * @example
 * // After onboarding complete
 * import { invalidateMetricsCache } from '@/hooks/useCalculatedMetrics';
 * invalidateMetricsCache();
 */
let _metricsRevision = 0;
export function invalidateMetricsCache(): void {
  _metricsRevision++;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useCalculatedMetrics = (): UseCalculatedMetricsReturn => {
  const { user, isAuthenticated, isGuestMode } = useAuth();

  // SSOT: Read all data from profileStore (Zustand) instead of Supabase
  const advancedReview = useProfileStore((s) => s.advancedReview);
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);
  const dietPreferences = useProfileStore((s) => s.dietPreferences);
  const storeIsHydrated = useProfileStore((s) => s.isHydrated);

  // Dual AI/custom diet plan support (Decision 1: "custom plan drives
  // targets"). Subscribed reactively — NOT read via a getState() getter —
  // so this hook (and everything downstream: Home rings, Diet targets,
  // useNutritionTracking) re-renders the instant the user toggles source or
  // edits the active custom plan. See FullPlanScreen.tsx's documented fix
  // for the identical bug on the workout side.
  const activeDietSource = useNutritionStore((s) => s.activeDietSource);
  const customWeeklyMealPlan = useNutritionStore((s) => s.customWeeklyMealPlan);
  // Goal Engine Phase A.2/C: shared target-source toggle. 'goal' = targets
  // follow the onboarding-goal-derived number; 'plan' = follow the active
  // custom diet plan's per-day number (falling back to the goal target —
  // labelled — on empty plan days). Subscribed reactively so this hook
  // (and everything downstream: Home rings, Diet targets) re-renders the
  // instant the toggle flips.
  const goalTargetsMode = useNutritionStore((s) => s.goalTargetsMode);

  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCalculatedMetrics, setHasCalculatedMetrics] = useState(false);

  // Guest data loaded from AsyncStorage (one-time)
  const [guestData, setGuestData] = useState<{
    advancedReview: AdvancedReviewData | null;
    bodyAnalysis: BodyAnalysisData | null;
    personalInfo: PersonalInfoData | null;
    workoutPreferences: WorkoutPreferencesData | null;
    dietPreferences: DietPreferencesData | null;
  } | null>(null);
  const guestLoadedRef = useRef(false);

  // Load guest data from AsyncStorage (only for guest users, once)
  useEffect(() => {
    if (!isGuestMode || guestLoadedRef.current) return;
    guestLoadedRef.current = true;

    (async () => {
      try {
        const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");
        if (!onboardingDataStr) {
          setGuestData(null);
          return;
        }
        const onboardingData = JSON.parse(onboardingDataStr);
        setGuestData({
          advancedReview: onboardingData.advancedReview || onboardingData.advanced_review || null,
          bodyAnalysis: onboardingData.bodyAnalysis || onboardingData.body_analysis || null,
          personalInfo: onboardingData.personalInfo || onboardingData.personal_info || null,
          workoutPreferences: onboardingData.workoutPreferences || onboardingData.workout_preferences || null,
          dietPreferences: onboardingData.dietPreferences || onboardingData.diet_preferences || null,
        });
      } catch (err) {
        console.error("❌ [useCalculatedMetrics] AsyncStorage load error:", err);
        setGuestData(null);
      }
    })();
  }, [isGuestMode]);

  /**
   * Derive metrics from profileStore data (authenticated) or guestData.
   * This replaces the old loadFromDatabase / loadFromAsyncStorage approach.
   */
  useEffect(() => {
    try {
      // Determine data source: profileStore for authenticated, AsyncStorage for guest
      let ar: AdvancedReviewData | null;
      let ba: BodyAnalysisData | null;
      let pi: PersonalInfoData | null;
      let wp: WorkoutPreferencesData | null;
      let dp: DietPreferencesData | null;

      if (isGuestMode) {
        // Guest: wait until AsyncStorage data is loaded
        if (!guestLoadedRef.current) {
          return; // still loading
        }
        ar = guestData?.advancedReview ?? null;
        ba = guestData?.bodyAnalysis ?? null;
        pi = guestData?.personalInfo ?? null;
        wp = guestData?.workoutPreferences ?? null;
        dp = guestData?.dietPreferences ?? null;

        // Initialize weight tracking for guest
        const guestBodyWeight = ba?.current_weight_kg;
        if (guestBodyWeight) {
          weightTrackingService.initializeFromBodyAnalysis({
            current_weight_kg: guestBodyWeight,
          });
        }
      } else if (isAuthenticated && user?.id) {
        // Authenticated: read from profileStore (SSOT)
        if (!storeIsHydrated) {
          // Store not hydrated yet — stay in loading state
          return;
        }
        ar = advancedReview;
        ba = bodyAnalysis;
        pi = personalInfo;
        wp = workoutPreferences;
        dp = dietPreferences;

        // Merge latest logged weight into bodyAnalysis so currentWeightKg
        // reflects actual tracked weight rather than the static onboarding value.
        // SSOT: uses resolveCurrentWeightFromStores for store-backed resolution (no DB call)
        const resolvedCurrentWeight = resolveCurrentWeightFromStores({
          bodyAnalysisWeight: ba?.current_weight_kg,
        });
        if (ba) {
          ba = applyResolvedCurrentWeight(ba, resolvedCurrentWeight);
        }

        if (ba?.current_weight_kg) {
          weightTrackingService.initializeFromBodyAnalysis({
            current_weight_kg: ba.current_weight_kg,
          });
        }
      } else {
        // Not authenticated and not guest — no data
        setMetrics(null);
        setHasCalculatedMetrics(false);
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        return;
      }

      // If no advanced_review data, user hasn't completed onboarding calculations
      if (!ar) {
        setMetrics(null);
        setHasCalculatedMetrics(false);
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        return;
      }

      let computed = mapToCalculatedMetrics(ar, ba, pi, wp, dp);

      // Goal Engine Phase C: which target source drives today's targets.
      //
      // `goal_targets_mode` (Phase A.2, shared toggle on profiles) decides
      // whether the daily calorie/macro target follows the onboarding-goal-
      // derived number ('goal') or the active custom plan's per-day number
      // ('plan'). Previously this override was SILENT and unconditional
      // whenever activeDietSource === 'custom': an empty custom-plan day
      // returned null from deriveTodaysCustomPlanTargets and the code
      // silently reverted to the onboarding target with no explanation.
      //
      // Now the override is CONDITIONAL on goal_targets_mode === 'plan':
      //   - mode 'goal' → always use the goal-derived target (targetsSource
      //     'goal'), even when a custom plan is active. The user explicitly
      //     chose to keep their goal targets and just SEE the gap.
      //   - mode 'plan' + custom plan active + today has meals → use the
      //     plan's per-day target (targetsSource 'plan').
      //   - mode 'plan' + custom plan active + today is EMPTY → fall back to
      //     the goal target BUT set targetsSource 'goal_fallback_empty_day'
      //     so the UI can label it ("Goal target — no meals planned today")
      //     instead of silently reverting.
      //   - mode 'plan' + no custom plan active (activeDietSource 'ai') →
      //     goal target (targetsSource 'goal'); there is no custom plan to
      //     drive targets from.
      //
      // Computed at read time — never persisted over advanced_review — so
      // toggling back to 'ai'/goal mode instantly and losslessly restores
      // the original onboarding targets.
      let targetsSource: CalculatedMetrics["targetsSource"] = "goal";
      if (goalTargetsMode === "plan" && activeDietSource === "custom") {
        const todaysTargets = deriveTodaysCustomPlanTargets(customWeeklyMealPlan);
        if (todaysTargets) {
          computed = {
            ...computed,
            dailyCalories: todaysTargets.calories,
            dailyProteinG: todaysTargets.protein,
            dailyCarbsG: todaysTargets.carbs,
            dailyFatG: todaysTargets.fat,
            dailyFiberG: todaysTargets.fiber,
          };
          targetsSource = "plan";
        } else {
          // Empty custom-plan day: keep the goal-derived `computed` and
          // label the fallback so the UI can explain it.
          targetsSource = "goal_fallback_empty_day";
        }
      }
      computed = { ...computed, targetsSource };

      setMetrics(computed);
      setHasCalculatedMetrics(true);
      setHasCompletedOnboarding(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to compute metrics";
      console.error("❌ [useCalculatedMetrics] Compute error:", message);
      setError(message);
      setMetrics(null);
      setHasCalculatedMetrics(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    // profileStore fields (authenticated)
    advancedReview,
    bodyAnalysis,
    personalInfo,
    workoutPreferences,
    dietPreferences,
    storeIsHydrated,
    // Guest data
    guestData,
    // Auth state
    isAuthenticated,
    isGuestMode,
    user?.id,
    // Dual AI/custom diet plan support
    activeDietSource,
    customWeeklyMealPlan,
    // Goal Engine target-source toggle
    goalTargetsMode,
  ]);

  /**
   * Refresh metrics — triggers profileStore re-read.
   * For authenticated users, this is a no-op since profileStore is already reactive.
   * Kept for API compatibility; callers can still call refreshMetrics() after onboarding.
   */
  const refreshMetrics = useCallback(async () => {
    // Bump revision to force re-derive even if profileStore refs haven't changed
    invalidateMetricsCache();
    // For guest mode, re-read AsyncStorage
    if (isGuestMode) {
      guestLoadedRef.current = false;
      try {
        const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");
        if (onboardingDataStr) {
          const onboardingData = JSON.parse(onboardingDataStr);
          setGuestData({
            advancedReview: onboardingData.advancedReview || onboardingData.advanced_review || null,
            bodyAnalysis: onboardingData.bodyAnalysis || onboardingData.body_analysis || null,
            personalInfo: onboardingData.personalInfo || onboardingData.personal_info || null,
            workoutPreferences: onboardingData.workoutPreferences || onboardingData.workout_preferences || null,
            dietPreferences: onboardingData.dietPreferences || onboardingData.diet_preferences || null,
          });
        } else {
          setGuestData(null);
        }
        guestLoadedRef.current = true;
      } catch (err) {
        console.error("❌ [useCalculatedMetrics] AsyncStorage refresh error:", err);
      }
    }
    // For authenticated users, the useEffect will re-fire when profileStore updates.
    // No manual Supabase fetch needed — DataBridge syncs profileStore ↔ Supabase.
  }, [isGuestMode]);

  /**
   * Clear cache — resets metrics state. Kept for API compatibility.
   */
  const clearCache = useCallback(() => {
    setMetrics(null);
    setHasCalculatedMetrics(false);
    setHasCompletedOnboarding(false);
  }, []);

  // Convenience getters
  const getWaterGoalLiters = useCallback((): number | null => {
    if (!metrics?.dailyWaterML) return null;
    return Math.round((metrics.dailyWaterML / 1000) * 10) / 10; // Convert ml to L with 1 decimal
  }, [metrics?.dailyWaterML]);

  const getCalorieTarget = useCallback((): number | null => {
    return metrics?.dailyCalories ?? null;
  }, [metrics?.dailyCalories]);

  const getMacroTargets = useCallback(
    () => ({
      protein: metrics?.dailyProteinG ?? null,
      carbs: metrics?.dailyCarbsG ?? null,
      fat: metrics?.dailyFatG ?? null,
      fiber: metrics?.dailyFiberG ?? null,
    }),
    [metrics?.dailyProteinG, metrics?.dailyCarbsG, metrics?.dailyFatG, metrics?.dailyFiberG],
  );

  return {
    metrics,
    dailyCalories: metrics?.dailyCalories ?? null, // Convenience getter
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
 * Sum a custom weekly meal plan's TODAY-only meals into a single day's
 * calorie/macro targets, for Decision 1's "custom plan drives targets".
 *
 * Deliberately DAY-scoped, not week-scoped: `WeeklyMealPlan.meals` is a flat
 * array across all 7 days (each tagged with `dayOfWeek`), so summing the
 * whole array would produce a ~7x target. Uses the same lowercase
 * `dayOfWeek` weekday-name convention as
 * `src/hooks/progress-screen/data.ts` and `DietScreen.tsx`.
 *
 * Returns null when there's nothing to derive from (no plan, or today has
 * zero meals) so the caller can fall back to the onboarding-derived value
 * instead of showing a real-looking 0 target (see plan Edge Case 20).
 */
function deriveTodaysCustomPlanTargets(
  plan: WeeklyMealPlan | null,
): { calories: number; protein: number; carbs: number; fat: number; fiber: number } | null {
  if (!plan?.meals?.length) return null;

  const weekdayNames = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];
  const todayName = weekdayNames[new Date().getDay()];
  const todaysMeals = plan.meals.filter(
    (meal) => meal.dayOfWeek?.toLowerCase() === todayName,
  );
  if (todaysMeals.length === 0) return null;

  const totals = todaysMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalMacros?.protein || 0),
      carbs: acc.carbs + (meal.totalMacros?.carbohydrates || 0),
      fat: acc.fat + (meal.totalMacros?.fat || 0),
      fiber: acc.fiber + (meal.totalMacros?.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  // A day with meals but all-zero totals (e.g. placeholder meals mid-build)
  // is treated the same as "nothing to derive from" — fall back rather than
  // display a 0 target while the user is still filling in the day.
  if (totals.calories <= 0) return null;

  return totals;
}

/**
 * Map raw data to CalculatedMetrics interface
 * NO FALLBACKS - missing data stays null
 */
function mapToCalculatedMetrics(
  advancedReview: AdvancedReviewData | null,
  bodyAnalysis: BodyAnalysisData | null,
  personalInfo: PersonalInfoData | null,
  workoutPreferences: WorkoutPreferencesData | null,
  dietPreferences: DietPreferencesData | null,
): CalculatedMetrics {
  // Calculate meals per day from diet preferences (Tab 2)
  const calculateMealsPerDay = (): number | null => {
    if (!dietPreferences) return null;
    let count = 0;
    if (dietPreferences.breakfast_enabled) count++;
    if (dietPreferences.lunch_enabled) count++;
    if (dietPreferences.dinner_enabled) count++;
    if (dietPreferences.snacks_enabled) count++; // Count snacks as 1 meal slot
    return count > 0 ? count : null;
  };

  // Parse heart rate zones if available
  let heartRateZones: CalculatedMetrics["heartRateZones"] = null;
  if (
    advancedReview?.target_hr_fat_burn_min &&
    advancedReview?.target_hr_fat_burn_max
  ) {
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
  const hrZonesFromJson = advancedReview?.heart_rate_zones;
  if (hrZonesFromJson && typeof hrZonesFromJson === "object") {
    heartRateZones = {
      fatBurn: {
        min: hrZonesFromJson.fatBurn?.min ?? hrZonesFromJson.fat_burn?.min, // SINGLE SOURCE: advanced_review.heart_rate_zones
        max: hrZonesFromJson.fatBurn?.max ?? hrZonesFromJson.fat_burn?.max,
      },
      cardio: {
        min: hrZonesFromJson.cardio?.min,
        max: hrZonesFromJson.cardio?.max,
      },
      peak: {
        min: hrZonesFromJson.peak?.min,
        max: hrZonesFromJson.peak?.max,
      },
    };
  }

  return {
    // Daily Nutritional Targets - NO FALLBACKS
    dailyCalories: advancedReview?.daily_calories ?? null,
    dailyProteinG: advancedReview?.daily_protein_g ?? null,
    dailyCarbsG: advancedReview?.daily_carbs_g ?? null,
    dailyFatG: advancedReview?.daily_fat_g ?? null,
    dailyWaterML: (() => {
      // Recalculate at runtime so stale stored values (calculated with the old
      // multiplicative climate formula) are corrected immediately without re-onboarding.
      const weight = bodyAnalysis?.current_weight_kg;
      const activity = mapActivityLevelForHealthCalc(workoutPreferences?.activity_level ?? "sedentary") as ActivityLevel;
      const climate = (advancedReview?.detected_climate ?? "temperate") as ClimateType;
      if (weight && weight > 0) {
        return waterCalculator.calculate(weight, activity, climate);
      }
      return advancedReview?.daily_water_ml ?? null;
    })(),
    dailyFiberG: advancedReview?.daily_fiber_g ?? null,

    // Metabolic Calculations - NO FALLBACKS
    calculatedBMI: advancedReview?.calculated_bmi ?? null,
    calculatedBMR: advancedReview?.calculated_bmr ?? null,
    calculatedTDEE: advancedReview?.calculated_tdee ?? null,
    metabolicAge: advancedReview?.metabolic_age ?? null,

    // BMI Classification - NO FALLBACKS
    bmiCategory: advancedReview?.bmi_category ?? null,
    bmiHealthRisk: advancedReview?.bmi_health_risk ?? null,

    // Auto-Detected Context - NO FALLBACKS
    detectedClimate: advancedReview?.detected_climate ?? null,
    detectedEthnicity: advancedReview?.detected_ethnicity ?? null,
    bmrFormulaUsed: advancedReview?.bmr_formula_used ?? null,

    // Weight Goals - NO FALLBACKS
    currentWeightKg: bodyAnalysis?.current_weight_kg ?? null,
    targetWeightKg: bodyAnalysis?.target_weight_kg ?? null,
    healthyWeightMin: advancedReview?.healthy_weight_min ?? null,
    healthyWeightMax: advancedReview?.healthy_weight_max ?? null,
    weeklyWeightLossRate: advancedReview?.weekly_weight_loss_rate ?? null,
    estimatedTimelineWeeks: advancedReview?.estimated_timeline_weeks ?? null,
    targetTimelineWeeks: bodyAnalysis?.target_timeline_weeks ?? null,

    // Body Metrics - NO FALLBACKS
    heightCm: bodyAnalysis?.height_cm ?? null,
    bodyFatPercentage: bodyAnalysis?.body_fat_percentage ?? null,
    idealWeightMin: bodyAnalysis?.ideal_weight_min ?? null,
    idealWeightMax: bodyAnalysis?.ideal_weight_max ?? null,
    ideal_body_fat_max: advancedReview?.ideal_body_fat_max ?? null,

    // Personal Info - NO FALLBACKS
    age: personalInfo?.age ?? null,
    gender: personalInfo?.gender ?? null,
    country: personalInfo?.country ?? null,
    state: personalInfo?.state ?? null,

    // Activity - NO FALLBACKS
    activityLevel: workoutPreferences?.activity_level ?? null,
    primaryGoals: workoutPreferences?.primary_goals ?? null,

    // Workout Preferences - from workout_preferences (Tab 4)
    workoutDurationMinutes: workoutPreferences?.time_preference ?? null, // User's preferred workout duration
    workoutFrequencyPerWeek:
      workoutPreferences?.workout_frequency_per_week ?? null,

    // Workout Recommendations - from advanced_review
    recommendedCardioMinutes:
      advancedReview?.recommended_cardio_minutes ?? null,
    mealsPerDay: calculateMealsPerDay(), // Calculated from diet_preferences (Tab 2)

    // Health Scores - NO FALLBACKS
    healthScore:
      advancedReview?.health_score ??
      advancedReview?.overall_health_score ?? null, // DB has both columns
    healthGrade: advancedReview?.health_grade ?? null,
    fitnessReadinessScore: advancedReview?.fitness_readiness_score ?? null,
    dietReadinessScore: advancedReview?.diet_readiness_score ?? null,

    // Heart Rate Zones
    heartRateZones,

    // VO2 Max - NO FALLBACKS
    vo2MaxEstimate:
      advancedReview?.vo2_max_estimate ??
      advancedReview?.estimated_vo2_max ?? null, // DB has both columns
    vo2MaxClassification:
      advancedReview?.vo2_max_classification ?? null,

    // Goal Engine Phase C: default source is the goal-derived target. The
    // override block in the hook reassigns this to 'plan' or
    // 'goal_fallback_empty_day' when goal_targets_mode='plan' applies.
    targetsSource: "goal",
  };
}

export default useCalculatedMetrics;
