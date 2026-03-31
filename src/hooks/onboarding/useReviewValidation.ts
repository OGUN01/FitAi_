import { useState, useCallback } from "react";
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

interface UseReviewValidationProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
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
}: UseReviewValidationProps): UseReviewValidationReturn => {
  const [validationResults, setValidationResults] =
    useState<ValidationResults | null>(null);
  const [calculatedData, setCalculatedData] =
    useState<AdvancedReviewData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [smartAlternatives, setSmartAlternatives] =
    useState<SmartAlternativesResult | null>(null);

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
        const climateResult = detectClimate(
          personalInfo.country || "IN",
          personalInfo.state,
        );
        detectedClimate = climateResult.climate;

        // Map activity level to the expected type
        const activityLevel: ActivityLevel =
          (workoutPreferences.activity_level as ActivityLevel) || "moderate";

        // Calculate climate-adjusted water intake
        waterIntake = waterCalculator.calculate(
          bodyAnalysis && hasBodyData ? bodyAnalysis.current_weight_kg : 70,
          activityLevel,
          detectedClimate,
        );


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
      } = calculations as any;

      // BUG-03: Derive total_calorie_deficit from ValidationEngine's actual capped weekly rate
      const vEngineWeeklyRate = validationResultsData.calculatedMetrics.weeklyRate;
      const vEngineDailyDeficit = (vEngineWeeklyRate * 7700) / 7;
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
        const userRequestedRate = isRecomp ? 0 : weightDifference / timelineWeeks;

        try {
          const alternativesResult =
            ValidationEngine.calculateSmartAlternatives(
              userRequestedRate,
              validationResultsData.calculatedMetrics.bmr,
              validationResultsData.calculatedMetrics.tdee,
              bodyAnalysis.current_weight_kg,
              bodyAnalysis.target_weight_kg,
              personalInfo.gender as "male" | "female",
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
