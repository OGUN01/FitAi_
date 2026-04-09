import { useState, useCallback, useRef } from "react";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import {
  ValidationEngine,
  ValidationResults,
  SmartAlternativesResult,
} from "../../services/validationEngine";
import { HealthCalculationEngine } from "../../utils/healthCalculations/master-engine";
import { CALORIE_PER_KG, DEFAULT_EXERCISE_SESSIONS_PER_WEEK } from "../../services/validation/constants";
import {
  MetabolicCalculations,
  MetabolicCalculations as NewMetabolicCalc,
} from "../../utils/healthCalculations/metabolic";
import {
  detectClimate,
  waterCalculator,
  type ActivityLevel,
  type ClimateType,
} from "../../utils/healthCalculations";
import { calculateCompletionMetrics } from "../../utils/onboardingMetrics";
import { mapActivityLevelForHealthCalc } from "../../utils/typeTransformers";

interface UseReviewValidationProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
  onUpdateWorkoutPreferences?: (data: Partial<WorkoutPreferencesData>) => void;
}

interface UseReviewValidationReturn {
  validationResults: ValidationResults | null;
  calculatedData: AdvancedReviewData | null;
  isCalculating: boolean;
  calculationError: string | null;
  smartAlternatives: SmartAlternativesResult | null;
  performCalculations: (opts?: { bypassDeficitLimit?: boolean }) => Promise<void>;
  setCalculatedData: (data: AdvancedReviewData | null) => void;
  setSmartAlternatives: (data: SmartAlternativesResult | null) => void;
}

export const useReviewValidation = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  onUpdate,
  onUpdateWorkoutPreferences,
}: UseReviewValidationProps): UseReviewValidationReturn => {
  const [validationResults, setValidationResults] =
    useState<ValidationResults | null>(null);
  const [calculatedData, setCalculatedData] =
    useState<AdvancedReviewData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [smartAlternatives, setSmartAlternatives] =
    useState<SmartAlternativesResult | null>(null);

  // D2-FIX: Freeze the user's original requested rate on first calculation.
  // This ensures the "KEEP MY GOAL" card always reflects the user's actual
  // original desire, not a rate re-derived from a subsequently-selected timeline.
  // Reset when core body fields change (user edits tab 3 and returns).
  const originalRateRef = useRef<number | null>(null);
  const weightSignatureRef = useRef<string | null>(null);

  const performCalculations = useCallback(async (opts?: { bypassDeficitLimit?: boolean }) => {
    if (
      !personalInfo ||
      !dietPreferences ||
      !workoutPreferences
    ) {
      setCalculationError("Missing required data for calculations");
      return;
    }

    // Body analysis is optional — check if the user actually entered valid weight/height.
    // IMPORTANT: Use >= 30 (not just > 0) to match the valid range of calculateBMR/calculateBMI.
    // Partial values typed mid-input (e.g. "9" before completing "93") would otherwise
    // pass the > 0 check and cause calculateBMR to throw an error (it requires weight >= 30 kg).
    const hasBodyData =
      !!bodyAnalysis &&
      bodyAnalysis.current_weight_kg >= 30 &&
      bodyAnalysis.current_weight_kg <= 300 &&
      bodyAnalysis.height_cm >= 100 &&
      bodyAnalysis.height_cm <= 250;

    // 🔍 ONBOARDING DEBUG — RAW INPUTS entering the calculation engine
    if (__DEV__) {
      console.warn(
        '\n========== ⚙️  REVIEW CALC — RAW INPUTS TO ENGINE ==========',
        '\nhasBodyData             :', hasBodyData,
        '\nbypassDeficitLimit      :', opts?.bypassDeficitLimit,
        '\n--- Personal Info (going in) ---',
        '\nage                     :', personalInfo.age,
        '\ngender                  :', personalInfo.gender,
        '\ncountry                 :', personalInfo.country,
        '\nstate                   :', personalInfo.state,
        '\nwake_time               :', personalInfo.wake_time,
        '\nsleep_time              :', personalInfo.sleep_time,
        '\n--- Body Analysis (going in) ---',
        '\nheight_cm               :', bodyAnalysis?.height_cm,
        '\ncurrent_weight_kg       :', bodyAnalysis?.current_weight_kg,
        '\ntarget_weight_kg        :', bodyAnalysis?.target_weight_kg,
        '\ntarget_timeline_weeks   :', bodyAnalysis?.target_timeline_weeks,
        '\nbody_fat_percentage     :', bodyAnalysis?.body_fat_percentage,
        '\nstress_level            :', bodyAnalysis?.stress_level,
        '\npregnancy_status        :', bodyAnalysis?.pregnancy_status,
        '\nbreastfeeding_status    :', bodyAnalysis?.breastfeeding_status,
        '\nmedical_conditions      :', bodyAnalysis?.medical_conditions,
        '\nphysical_limitations    :', bodyAnalysis?.physical_limitations,
        '\n--- Workout Preferences (going in) ---',
        '\nactivity_level          :', workoutPreferences.activity_level,
        '\nintensity               :', workoutPreferences.intensity,
        '\nprimary_goals           :', workoutPreferences.primary_goals,
        '\nworkout_frequency/week  :', workoutPreferences.workout_frequency_per_week,
        '\ntime_preference (min)   :', workoutPreferences.time_preference,
        '\nweekly_weight_loss_goal :', workoutPreferences.weekly_weight_loss_goal,
        '\n--- Diet Preferences (going in) ---',
        '\ndiet_type               :', dietPreferences.diet_type,
        '\nketo_ready              :', dietPreferences.keto_ready,
        '\nhigh_protein_ready      :', dietPreferences.high_protein_ready,
        '\nmediterranean_ready     :', dietPreferences.mediterranean_ready,
        '\ndrinks_enough_water     :', dietPreferences.drinks_enough_water,
        '\ncooking_skill_level     :', dietPreferences.cooking_skill_level,
        '\nbudget_level            :', dietPreferences.budget_level,
        '\n=============================================================\n'
      );
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {

      // Use ValidationEngine for comprehensive validation
      // Skip body-dependent validation when body data was not entered (it is optional)
      let validationResultsData: ValidationResults;
      if (hasBodyData && bodyAnalysis) {
        try {
          validationResultsData = ValidationEngine.validateUserPlan(
            personalInfo,
            dietPreferences,
            bodyAnalysis,
            workoutPreferences,
            opts,
          );
          setValidationResults(validationResultsData);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to validate user plan";
          console.error("[ERROR] useReviewValidation: Validation error:", error);
          setCalculationError(`Validation failed: ${message}`);
          return;
        }
      } else {
        // Body data not entered — use a neutral pass-through result
        validationResultsData = {
          errors: [],
          warnings: [],
          hasErrors: false,
          hasWarnings: false,
          canProceed: true,
          calculatedMetrics: {
            bmr: 0,
            tdee: 0,
            targetCalories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            weeklyRate: 0,
            originalWeeklyRate: 0,
            wasRateCapped: false,
            timeline: 0,
          },
          adjustments: undefined,
        } as ValidationResults;
        setValidationResults(validationResultsData);
      }

      // Run legacy calculations for additional metrics (body-dependent, skip if no body data)
      let calculations;
      if (hasBodyData && bodyAnalysis) {
        try {
          calculations = HealthCalculationEngine.calculateAllMetrics(
            personalInfo,
            dietPreferences,
            bodyAnalysis,
            workoutPreferences,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to calculate health metrics";
          console.error(
            "[ERROR] useReviewValidation: Legacy calculations error:",
            error,
          );
          setCalculationError(`Calculation failed: ${message}`);
          return;
        }
      } else {
        calculations = {};
      }

      // Merge validation metrics with legacy calculations
      let completionMetrics;
      try {
        completionMetrics = calculateCompletionMetrics(
          personalInfo,
          dietPreferences,
          bodyAnalysis,
          workoutPreferences,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to calculate completion metrics";
        console.error(
          "[ERROR] useReviewValidation: Completion metrics error:",
          error,
        );
        // Use defaults if completion metrics fail
        completionMetrics = {
          data_completeness_percentage: 0,
          reliability_score: 0,
          personalization_level: 0,
        };
      }

      // Calculate additional metrics using climate-adaptive calculations
      let waterIntake, fiberIntake, dietReadinessScore;
      let detectedClimate: ClimateType = "temperate";
      try {
        // CRITICAL: Use climate-adaptive water calculation based on user's location
        if (!personalInfo.country) {
          if (__DEV__) console.warn('Climate detection: country not set in profile, defaulting to temperate');
        }
        const climateResult = detectClimate(
          personalInfo.country || "",
          personalInfo.state,
        );
        detectedClimate = climateResult.climate;

        // Map activity level to the expected type — must go through mapActivityLevelForHealthCalc
        // so onboarding-only values like 'extreme' are normalised before use in health calc.
        const activityLevel: ActivityLevel =
          (mapActivityLevelForHealthCalc(workoutPreferences.activity_level as string) as ActivityLevel) ?? "sedentary";

        // Calculate climate-adjusted water intake
        const waterWeightKg = bodyAnalysis && hasBodyData ? bodyAnalysis.current_weight_kg : null;
        if (waterWeightKg == null) {
          console.warn('Water calculation skipped: no weight data available');
        }
        waterIntake = waterWeightKg != null
          ? waterCalculator.calculate(waterWeightKg, activityLevel, detectedClimate)
          : 0;


        fiberIntake = MetabolicCalculations.calculateFiber(
          validationResultsData.calculatedMetrics.targetCalories,
        );
        dietReadinessScore =
          MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to calculate metabolic metrics";
        console.error(
          "[ERROR] useReviewValidation: Metabolic calculations error:",
          error,
        );
        throw new Error(
          `Water/fiber calculation failed: ${message}. Please ensure all required data is provided.`,
        );
      }

      // BUG-01/02/03: Strip metabolic fields from legacy calculations before spreading.
      // ValidationEngine is SSOT for all calorie/macro/rate values.
      // Legacy engine (calculations) is only used for body-composition fields it exclusively provides.
      const {
        calculated_bmr: _legacyBmr,
        calculated_tdee: _legacyTdee,
        daily_calories: _legacyCalories,
        daily_protein_g: _legacyProtein,
        daily_carbs_g: _legacyCarbs,
        daily_fat_g: _legacyFat,
        daily_water_ml: _legacyWater,
        daily_fiber_g: _legacyFiber,
        weekly_weight_loss_rate: _legacyWeeklyRate,
        estimated_timeline_weeks: _legacyTimeline,
        total_calorie_deficit: _legacyDeficit,
        // BUG-17: Strip legacy metabolic_age — old formula uses absolute (calPerYear=10) which
        // clamps heavy-but-healthy users to floor=18. New formula uses percentage-based comparison.
        metabolic_age: _legacyMetabolicAge,
        ...legacyNonMetabolicFields
      } = calculations as Partial<AdvancedReviewData>;

      // BUG-03: Derive total_calorie_deficit from ValidationEngine's actual capped weekly rate
      const vEngineWeeklyRate = validationResultsData.calculatedMetrics.weeklyRate;
      const vEngineDailyDeficit = (vEngineWeeklyRate * CALORIE_PER_KG) / 7;
      const vEngineTimeline = validationResultsData.calculatedMetrics.timeline;
      const totalCalorieDeficit = Math.round(vEngineDailyDeficit * vEngineTimeline * 7);

      const finalCalculations: AdvancedReviewData = {
        ...legacyNonMetabolicFields,  // body comp, HR zones, VO2 max — from legacy only
        ...completionMetrics,
        // ValidationEngine is SSOT for all metabolic values (BUG-01/02)
        calculated_bmr: validationResultsData.calculatedMetrics.bmr,
        // BUG-17: Use new percentage-based formula (from healthCalculations/metabolic.ts).
        // Old formula (calPerYear=10) produces floor=18 for large-framed users.
        metabolic_age: hasBodyData && bodyAnalysis
          ? NewMetabolicCalc.calculateMetabolicAge(
              validationResultsData.calculatedMetrics.bmr,
              personalInfo.age,
              personalInfo.gender,
            )
          : undefined,
        calculated_tdee: validationResultsData.calculatedMetrics.tdee,
        daily_calories: validationResultsData.calculatedMetrics.targetCalories,
        daily_protein_g: validationResultsData.calculatedMetrics.protein,
        daily_carbs_g: validationResultsData.calculatedMetrics.carbs,
        daily_fat_g: validationResultsData.calculatedMetrics.fat,
        daily_water_ml: waterIntake,
        daily_fiber_g: fiberIntake,
        // BUG-03: Use ValidationEngine's capped rate (not legacy engine's rate)
        weekly_weight_loss_rate: vEngineWeeklyRate,
        estimated_timeline_weeks: vEngineTimeline,
        // BUG-03: total_calorie_deficit from ValidationEngine values
        total_calorie_deficit: totalCalorieDeficit,
        diet_readiness_score: dietReadinessScore,
        detected_climate: detectedClimate,
        validation_status: validationResultsData.hasErrors
          ? "blocked"
          : validationResultsData.hasWarnings
            ? "warnings"
            : "passed",
        validation_errors:
          validationResultsData.errors.length > 0
            ? validationResultsData.errors
            : undefined,
        validation_warnings:
          validationResultsData.warnings.length > 0
            ? validationResultsData.warnings
            : undefined,
        refeed_schedule: validationResultsData.adjustments?.refeedSchedule,
        medical_adjustments: validationResultsData.adjustments?.medicalNotes,
        // BUG-35: expose rate cap flag so UI can warn the user
        was_rate_capped: validationResultsData.calculatedMetrics.wasRateCapped,
      } as AdvancedReviewData;

      setCalculatedData(finalCalculations);
      onUpdate(finalCalculations);

      // 🔍 ONBOARDING DEBUG — Tab 5: Review Calculated Data
      if (__DEV__) {
        console.warn(
          '\n========== 📊 TAB 5: REVIEW — CALCULATED DATA ==========',
          '\n--- Metabolic Core ---',
          '\ncalculated_bmi              :', finalCalculations.calculated_bmi,
          '\ncalculated_bmr              :', finalCalculations.calculated_bmr,
          '\ncalculated_tdee             :', finalCalculations.calculated_tdee,
          '\nmetabolic_age               :', finalCalculations.metabolic_age,
          '\n--- Daily Nutrition ---',
          '\ndaily_calories              :', finalCalculations.daily_calories,
          '\ndaily_protein_g             :', finalCalculations.daily_protein_g,
          '\ndaily_carbs_g               :', finalCalculations.daily_carbs_g,
          '\ndaily_fat_g                 :', finalCalculations.daily_fat_g,
          '\ndaily_water_ml              :', finalCalculations.daily_water_ml,
          '\ndaily_fiber_g               :', finalCalculations.daily_fiber_g,
          '\n--- Weight Management ---',
          '\nhealthy_weight_min          :', finalCalculations.healthy_weight_min,
          '\nhealthy_weight_max          :', finalCalculations.healthy_weight_max,
          '\nweekly_weight_loss_rate     :', finalCalculations.weekly_weight_loss_rate,
          '\nestimated_timeline_weeks    :', finalCalculations.estimated_timeline_weeks,
          '\ntotal_calorie_deficit       :', finalCalculations.total_calorie_deficit,
          '\nwas_rate_capped             :', finalCalculations.was_rate_capped,
          '\n--- Body Composition ---',
          '\nideal_body_fat_min          :', finalCalculations.ideal_body_fat_min,
          '\nideal_body_fat_max          :', finalCalculations.ideal_body_fat_max,
          '\nlean_body_mass              :', finalCalculations.lean_body_mass,
          '\nfat_mass                    :', finalCalculations.fat_mass,
          '\n--- Fitness Metrics ---',
          '\nestimated_vo2_max           :', finalCalculations.estimated_vo2_max,
          '\nmax_heart_rate              :', finalCalculations.max_heart_rate,
          '\ntarget_hr_fat_burn_min      :', finalCalculations.target_hr_fat_burn_min,
          '\ntarget_hr_fat_burn_max      :', finalCalculations.target_hr_fat_burn_max,
          '\ntarget_hr_cardio_min        :', finalCalculations.target_hr_cardio_min,
          '\ntarget_hr_cardio_max        :', finalCalculations.target_hr_cardio_max,
          '\ntarget_hr_peak_min          :', finalCalculations.target_hr_peak_min,
          '\ntarget_hr_peak_max          :', finalCalculations.target_hr_peak_max,
          '\nrecommended_workout_frequency:', finalCalculations.recommended_workout_frequency,
          '\nrecommended_cardio_minutes  :', finalCalculations.recommended_cardio_minutes,
          '\nrecommended_strength_sessions:', finalCalculations.recommended_strength_sessions,
          '\n--- Health Scores (0-100) ---',
          '\noverall_health_score        :', finalCalculations.overall_health_score,
          '\ndiet_readiness_score        :', finalCalculations.diet_readiness_score,
          '\nfitness_readiness_score     :', finalCalculations.fitness_readiness_score,
          '\ngoal_realistic_score        :', finalCalculations.goal_realistic_score,
          '\n--- Sleep ---',
          '\nrecommended_sleep_hours     :', finalCalculations.recommended_sleep_hours,
          '\ncurrent_sleep_duration      :', finalCalculations.current_sleep_duration,
          '\nsleep_efficiency_score      :', finalCalculations.sleep_efficiency_score,
          '\n--- Completion Metrics ---',
          '\ndata_completeness_percentage:', finalCalculations.data_completeness_percentage,
          '\nreliability_score           :', finalCalculations.reliability_score,
          '\npersonalization_level       :', finalCalculations.personalization_level,
          '\n--- Validation ---',
          '\nvalidation_status           :', finalCalculations.validation_status,
          '\nvalidation_errors           :', finalCalculations.validation_errors,
          '\nvalidation_warnings         :', finalCalculations.validation_warnings,
          '\ndetected_climate            :', finalCalculations.detected_climate,
          '\n--- Extended Calculated Fields ---',
          '\ncalculated_bmi              :', finalCalculations.calculated_bmi,
          '\nbmi_category                :', finalCalculations.bmi_category,
          '\nbmi_health_risk             :', finalCalculations.bmi_health_risk,
          '\nbmr_formula_used            :', finalCalculations.bmr_formula_used,
          '\nhealth_grade                :', finalCalculations.health_grade,
          '\nvo2_max_estimate            :', finalCalculations.vo2_max_estimate,
          '\nvo2_max_classification      :', finalCalculations.vo2_max_classification,
          '\nheart_rate_zones            :', JSON.stringify(finalCalculations.heart_rate_zones),
          '\nrefeed_schedule             :', finalCalculations.refeed_schedule,
          '\nmedical_adjustments         :', finalCalculations.medical_adjustments,
          '\nusedFallbackDefaults        :', finalCalculations.usedFallbackDefaults,
          '\n--- Validation Engine Raw Metrics ---',
          '\nvEngine.bmr                 :', validationResultsData.calculatedMetrics.bmr,
          '\nvEngine.tdee                :', validationResultsData.calculatedMetrics.tdee,
          '\nvEngine.targetCalories      :', validationResultsData.calculatedMetrics.targetCalories,
          '\nvEngine.protein             :', validationResultsData.calculatedMetrics.protein,
          '\nvEngine.carbs               :', validationResultsData.calculatedMetrics.carbs,
          '\nvEngine.fat                 :', validationResultsData.calculatedMetrics.fat,
          '\nvEngine.weeklyRate          :', validationResultsData.calculatedMetrics.weeklyRate,
          '\nvEngine.originalWeeklyRate  :', validationResultsData.calculatedMetrics.originalWeeklyRate,
          '\nvEngine.wasRateCapped       :', validationResultsData.calculatedMetrics.wasRateCapped,
          '\nvEngine.timeline            :', validationResultsData.calculatedMetrics.timeline,
          '\n==========================================================\n'
        );
      }

      // Calculate smart alternatives only when body data was entered
      // Calculate smart alternatives when body data was entered and there is a weight difference
      if (hasBodyData && bodyAnalysis && bodyAnalysis.target_weight_kg > 0) {
        const isRecomp = bodyAnalysis.current_weight_kg === bodyAnalysis.target_weight_kg;
        const weightDifference = Math.abs(
          bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg,
        );

        // Safeguard against division by zero - use 12 weeks as default; recomp = rate 0
        const timelineWeeks =
          bodyAnalysis.target_timeline_weeks &&
          bodyAnalysis.target_timeline_weeks > 0
            ? bodyAnalysis.target_timeline_weeks
            : 12;
        // Prefer weekly_weight_loss_goal (SSOT set by pace card selection) over the
        // timeline-derived rate. The timeline is ceiling-rounded so 17/22 = 0.77 ≠ 0.8.
        // Using the stored goal keeps KEEP MY GOAL card, originalRateRef, and the
        // fallback matcher all anchored to the rate the user actually chose.
        const storedGoal = workoutPreferences?.weekly_weight_loss_goal;
        const userRequestedRate = isRecomp ? 0
          : (storedGoal && storedGoal > 0) ? storedGoal
          : weightDifference / timelineWeeks;

        // D2-FIX: Manage the frozen original-rate ref.
        // The weight signature tracks whether the user changed current/target weight.
        // If they did, the original rate is stale and must reset so the new goal
        // first-loads with the fresh KEEP MY GOAL card.
        const weightSignature = `${bodyAnalysis.current_weight_kg}:${bodyAnalysis.target_weight_kg}`;
        if (
          weightSignatureRef.current !== null &&
          weightSignatureRef.current !== weightSignature
        ) {
          originalRateRef.current = null; // user changed target/current weight — reset
          // Also clear the persisted original so it gets re-derived from the new weights.
          if (onUpdateWorkoutPreferences) {
            onUpdateWorkoutPreferences({ original_weekly_rate: undefined });
          }
        }
        weightSignatureRef.current = weightSignature;
        if (originalRateRef.current === null && userRequestedRate > 0) {
          // Prefer a previously-persisted original rate (survives tab remounts)
          // over the live derived rate which may already reflect a pace-card selection.
          const persistedOriginal = workoutPreferences?.original_weekly_rate;
          originalRateRef.current = (persistedOriginal && persistedOriginal > 0)
            ? persistedOriginal
            : userRequestedRate;
          // Write-once: only persist when we derived it for the first time (no stored value yet).
          if (!persistedOriginal && onUpdateWorkoutPreferences) {
            onUpdateWorkoutPreferences({ original_weekly_rate: userRequestedRate });
          }
        }
        // Use frozen rate for KEEP MY GOAL card; fall back to live rate if not yet set.
        const frozenRate = originalRateRef.current ?? userRequestedRate;

        try {
          const alternativesResult =
            ValidationEngine.calculateSmartAlternatives(
              frozenRate,  // D2: always use frozen original goal; not the derived rate
              validationResultsData.calculatedMetrics.bmr,
              validationResultsData.calculatedMetrics.tdee,
              bodyAnalysis.current_weight_kg,
              bodyAnalysis.target_weight_kg,
              personalInfo.gender as "male" | "female",
              workoutPreferences?.workout_frequency_per_week ?? DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
              workoutPreferences?.intensity ?? "beginner",
              workoutPreferences?.time_preference ?? 60,
            );

          setSmartAlternatives(alternativesResult);
        } catch (altError) {
          console.error(
            "[ERROR] Failed to calculate smart alternatives:",
            altError,
          );
          setSmartAlternatives(null);
        }
      } else {
        setSmartAlternatives(null);
      }

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during calculations";
      console.error(
        "[ERROR] useReviewValidation: Critical calculation error:",
        error,
      );
      setCalculationError(
        `Failed to calculate health metrics: ${message}. Please try again.`,
      );
    } finally {
      setIsCalculating(false);
    }
  }, [
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    onUpdate,
  ]);

  return {
    validationResults,
    calculatedData,
    isCalculating,
    calculationError,
    smartAlternatives,
    performCalculations,
    setCalculatedData,
    setSmartAlternatives,
  };
};
