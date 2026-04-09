import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../../types/onboarding";
import { MetabolicCalculations, macroCalculator } from "../../utils/healthCalculations";
import { resolveDietType } from "../../utils/healthCalculations/nutritional";
import type { Goal, DietType } from "../../utils/healthCalculations/types";
import {
  ValidationResult,
  ValidationResults,
  SmartAlternativesResult,
} from "./types";
import { CALORIE_PER_KG, MAX_SURPLUS_FRACTION } from "./constants";
import {
  validateMinimumBodyFat,
  validateMinimumBMI,
  validateBMRSafety,
  validateAbsoluteMinimum,
  validateTimeline,
  validatePregnancyBreastfeeding,
  validateGoalConflict,
  validateMealsEnabled,
  validateSleepAggressiveCombo,
  validateTrainingVolume,
  validateInsufficientExercise,
} from "./blockingValidations";
import {
  warnAggressiveTimeline,
  warnElderlyUser,
  warnTeenAthlete,
  warnZeroExercise,
  warnHighTrainingVolume,
  warnMenopause,
  warnLowSleep,
  warnMedicalConditions,
  warnBodyRecomp,
  warnAlcoholImpact,
  warnTobaccoImpact,
  warnHeartDisease,
  warnConcurrentTrainingInterference,
  warnObesitySpecialGuidance,
  warnEquipmentLimitations,
  warnPhysicalLimitationsVsIntensity,
  warnLowDietReadiness,
  warnVeganProteinLimitations,
  warnMedicationEffects,
  warnExcessiveWeightGain,
  warnMultipleBadHabits,
} from "./warningValidations";
import { calculateSmartAlternatives } from "./smartAlternatives";

export class ValidationEngine {
  static validateUserPlan(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
    opts?: { bypassDeficitLimit?: boolean },
  ): ValidationResults {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];

    // Guard: Bail out early if body measurements are out of valid range.
    // calculateBMR and calculateBMI both throw for weight < 30 or height < 100.
    // This can happen when the user is mid-typing a value (e.g. "9" before "93").
    if (
      bodyAnalysis.current_weight_kg < 30 ||
      bodyAnalysis.current_weight_kg > 300 ||
      bodyAnalysis.height_cm < 100 ||
      bodyAnalysis.height_cm > 250
    ) {
      return {
        hasErrors: false,
        hasWarnings: false,
        errors: [],
        warnings: [],
        canProceed: false,
        calculatedMetrics: {
          bmr: 0, tdee: 0, targetCalories: 0,
          protein: 0, carbs: 0, fat: 0,
          weeklyRate: 0, originalWeeklyRate: 0,
          wasRateCapped: false, timeline: 0,
        },
        adjustments: undefined,
      } as ValidationResults;
    }

    const bmr = MetabolicCalculations.calculateBMR(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
      personalInfo.age,
      personalInfo.gender,
    );

    const bmi = MetabolicCalculations.calculateBMI(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
    );
    const bodyFatData = MetabolicCalculations.getFinalBodyFatPercentage(
      bodyAnalysis.body_fat_percentage,
      bodyAnalysis.ai_estimated_body_fat,
      bodyAnalysis.ai_confidence_score,
      bmi,
      personalInfo.gender,
      personalInfo.age,
    );

    const sleepHours = this.calculateSleepDuration(
      personalInfo.wake_time,
      personalInfo.sleep_time,
    );

    const baseTDEE = MetabolicCalculations.calculateTDEE(
      bmr,
      workoutPreferences.activity_level ?? "sedentary",
    );
    const exerciseBurn = MetabolicCalculations.calculateDailyExerciseBurn(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      bodyAnalysis.current_weight_kg,
      workoutPreferences.workout_types,
    );
    let tdee = MetabolicCalculations.applyAgeModifier(
      baseTDEE + exerciseBurn,
      personalInfo.age,
      personalInfo.gender,
    );

    const isWeightLoss =
      bodyAnalysis.current_weight_kg > bodyAnalysis.target_weight_kg;
    const isWeightGain =
      bodyAnalysis.current_weight_kg < bodyAnalysis.target_weight_kg;

    const weightDifference = Math.abs(
      bodyAnalysis.target_weight_kg - bodyAnalysis.current_weight_kg,
    );
    // Use the stored pace-card rate (SSOT) rather than deriving from timeline.
    // Timeline is Math.ceil-rounded so 17/22 = 0.77 ≠ 0.8 — using it introduces
    // a calorie discrepancy vs what the card displayed. Fall back to timeline-derived
    // rate only for legacy data or first-load before any card is selected.
    const _storedGoal = workoutPreferences.weekly_weight_loss_goal;
    const requiredWeeklyRate =
      (_storedGoal && _storedGoal > 0)
        ? _storedGoal
        : weightDifference / bodyAnalysis.target_timeline_weeks;

    let targetCalories: number;
    let weeklyRate: number;
    let deficitLimitResult: {
      adjustedCalories: number;
      wasLimited: boolean;
      limitReason?: string;
      originalDeficitPercent: number;
      adjustedDeficitPercent: number;
    } | null = null;

    if (isWeightLoss) {
      const dailyDeficit = (requiredWeeklyRate * CALORIE_PER_KG) / 7;
      const initialTargetCalories = tdee - dailyDeficit;
      if (opts?.bypassDeficitLimit) {
        // Show the user their actual selected goal — clamp at BMR (absolute floor).
        // BUG-47: For high-stress or medical-condition users, also enforce a conservative
        // 15% deficit ceiling. Without this, a stressed user could select a 35% deficit
        // via "KEEP MY GOAL" and the system would silently allow it in bypass mode.
        const isHighRisk =
          bodyAnalysis.stress_level === "high" ||
          (bodyAnalysis.medical_conditions?.length ?? 0) > 0;
        const conservativeFloor = isHighRisk
          ? Math.round(tdee * (1 - 0.15))  // 15% max deficit for high-risk
          : 0;                              // no extra floor for normal users
        const floored = Math.max(initialTargetCalories, bmr, conservativeFloor);
        const wasConservativeLimited = isHighRisk && floored > initialTargetCalories;
        deficitLimitResult = {
          adjustedCalories: floored,
          wasLimited: wasConservativeLimited,
          limitReason: wasConservativeLimited ? "high stress or medical conditions" : undefined,
          originalDeficitPercent: dailyDeficit / tdee,
          adjustedDeficitPercent: (tdee - floored) / tdee,
        };
      } else {
        deficitLimitResult = this.applyDeficitLimit(
          initialTargetCalories,
          tdee,
          bmr,
          bodyAnalysis.stress_level || "moderate",
          (bodyAnalysis.medical_conditions?.length ?? 0) > 0,
        );
      }
      targetCalories = deficitLimitResult.adjustedCalories;

      if (deficitLimitResult.wasLimited) {
        const actualDailyDeficit = tdee - targetCalories;
        weeklyRate = (actualDailyDeficit * 7) / CALORIE_PER_KG;
        warnings.push({
          status: "WARNING",
          code: "DEFICIT_LIMITED_FOR_SAFETY",
          message: `Calorie deficit reduced from ${Math.round(deficitLimitResult.originalDeficitPercent * 100)}% to ${Math.round(deficitLimitResult.adjustedDeficitPercent * 100)}% due to ${deficitLimitResult.limitReason}`,
          recommendations: [
            `🛡️ Your deficit was capped at ${Math.round(deficitLimitResult.adjustedDeficitPercent * 100)}% for your safety`,
            `Original target: ${Math.round(initialTargetCalories)} cal/day`,
            `Adjusted target: ${Math.round(targetCalories)} cal/day`,
            "💡 This will extend your timeline but protect your health and hormones",
          ],
          canProceed: true,
        });
      } else {
        // D1-FIX: In bypass mode the BMR floor may have been applied even though
        // wasLimited=false. When initialTargetCalories < bmr the system ate at BMR —
        // the actual achievable weeklyRate is derived from the real deficit (tdee-bmr),
        // not the user's requested rate. This makes chart / macros / daily_calories consistent.
        const wasBMRFloored =
          !!opts?.bypassDeficitLimit &&
          Math.round(initialTargetCalories) < Math.round(bmr);
        if (wasBMRFloored) {
          const actualDailyDeficit = tdee - targetCalories; // targetCalories === bmr here
          weeklyRate = (actualDailyDeficit * 7) / CALORIE_PER_KG;
        } else {
          weeklyRate = requiredWeeklyRate;
        }
      }
    } else if (isWeightGain) {
      const dailySurplus = (requiredWeeklyRate * CALORIE_PER_KG) / 7;
      // D4b-FIX: Cap surplus at 10% of TDEE (evidence-based lean bulk maximum).
      // 15% was too aggressive and led primarily to fat gain not muscle gain.
      // Science: ~5-10% surplus above TDEE maximises muscle-to-fat ratio.
      const cappedSurplus = Math.min(dailySurplus, tdee * MAX_SURPLUS_FRACTION);
      targetCalories = tdee + cappedSurplus;
      weeklyRate = (cappedSurplus * 7) / CALORIE_PER_KG;
    } else {
      targetCalories = tdee;
      weeklyRate = 0;
    }

    if (isWeightLoss) {
      const bodyFatCheck = validateMinimumBodyFat(
        bodyAnalysis.body_fat_percentage,
        personalInfo.gender,
      );
      if (bodyFatCheck.status === "BLOCKED") errors.push(bodyFatCheck);

      const computedBMI = bodyAnalysis.bmi ||
        (bodyAnalysis.current_weight_kg && bodyAnalysis.height_cm
          ? bodyAnalysis.current_weight_kg / Math.pow(bodyAnalysis.height_cm / 100, 2)
          : 0);
      const bmiCheck = validateMinimumBMI(
        computedBMI,
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.height_cm,
      );
      if (bmiCheck.status === "BLOCKED") errors.push(bmiCheck);

      const bmrCheck = validateBMRSafety(targetCalories, bmr);
      if (bmrCheck.status === "BLOCKED") errors.push(bmrCheck);

      const minCheck = validateAbsoluteMinimum(
        targetCalories,
        personalInfo.gender,
      );
      if (minCheck.status === "BLOCKED") errors.push(minCheck);

      const timelineCheck = validateTimeline(
        bodyAnalysis.current_weight_kg,
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.target_timeline_weeks,
        workoutPreferences.weekly_weight_loss_goal,
      );
      if (timelineCheck.status === "BLOCKED") errors.push(timelineCheck);

      const exerciseCheck = validateInsufficientExercise(
        workoutPreferences.workout_frequency_per_week,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
        tdee,
        bmr,
        targetCalories,
      );
      if (exerciseCheck.status === "BLOCKED") errors.push(exerciseCheck);
    }

    const pregnancyCheck = validatePregnancyBreastfeeding(
      bodyAnalysis.pregnancy_status,
      bodyAnalysis.breastfeeding_status,
      targetCalories,
      tdee,
    );
    if (pregnancyCheck.status === "BLOCKED") errors.push(pregnancyCheck);

    const goalCheck = validateGoalConflict(workoutPreferences.primary_goals);
    if (goalCheck.status === "BLOCKED") errors.push(goalCheck);

    const mealsCheck = validateMealsEnabled(
      dietPreferences.breakfast_enabled,
      dietPreferences.lunch_enabled,
      dietPreferences.dinner_enabled,
      dietPreferences.snacks_enabled,
    );
    if (mealsCheck.status === "BLOCKED") errors.push(mealsCheck);

    const sleepComboCheck = validateSleepAggressiveCombo(
      sleepHours,
      requiredWeeklyRate,
      bodyAnalysis.current_weight_kg,
    );
    if (sleepComboCheck.status === "BLOCKED") errors.push(sleepComboCheck);

    const volumeCheck = validateTrainingVolume(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      workoutPreferences.activity_level ?? "sedentary",
    );
    if (volumeCheck.status === "BLOCKED") errors.push(volumeCheck);

    if (errors.length === 0) {
      const isAggressive =
        requiredWeeklyRate > bodyAnalysis.current_weight_kg * 0.0075;

      if (isWeightLoss || isWeightGain) {
        const timelineWarn = warnAggressiveTimeline(
          requiredWeeklyRate,
          bodyAnalysis.current_weight_kg,
          bodyAnalysis.target_weight_kg,
          bodyAnalysis.target_timeline_weeks,
          tdee,
        );
        if (timelineWarn.status === "BLOCKED") {
          errors.push(timelineWarn);
        } else if (timelineWarn.status === "WARNING") {
          warnings.push(timelineWarn);
        }
      }

      const sleepWarn = warnLowSleep(sleepHours);
      if (sleepWarn.status === "WARNING") warnings.push(sleepWarn);

      const medicalWarn = warnMedicalConditions(
        bodyAnalysis.medical_conditions,
        isAggressive,
      );
      if (medicalWarn.status === "WARNING") warnings.push(medicalWarn);

      const recompWarn = warnBodyRecomp(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
        bodyFatData.value,
        bodyFatData.confidence,
      );
      if (recompWarn.status !== "OK") warnings.push(recompWarn);

      const alcoholWarn = warnAlcoholImpact(
        dietPreferences.drinks_alcohol,
        isAggressive,
      );
      if (alcoholWarn.status === "WARNING") warnings.push(alcoholWarn);

      const tobaccoWarn = warnTobaccoImpact(
        dietPreferences.smokes_tobacco,
      );
      if (tobaccoWarn.status === "WARNING") warnings.push(tobaccoWarn);

      const elderlyWarn = warnElderlyUser(personalInfo.age);
      if (elderlyWarn.status === "WARNING") warnings.push(elderlyWarn);

      const teenWarn = warnTeenAthlete(
        personalInfo.age,
        workoutPreferences.activity_level,
        isWeightLoss ? "weight-loss" : "other",
      );
      if (teenWarn.status === "WARNING") warnings.push(teenWarn);

      const heartWarn = warnHeartDisease(
        bodyAnalysis.medical_conditions,
        workoutPreferences.intensity,
        isAggressive,
      );
      if (heartWarn.status === "WARNING") warnings.push(heartWarn);

      const interferenceWarn = warnConcurrentTrainingInterference(
        workoutPreferences.primary_goals,
      );
      if (interferenceWarn.status === "WARNING")
        warnings.push(interferenceWarn);

      const obesityWarn = warnObesitySpecialGuidance(
        bmi,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
        (bodyAnalysis as BodyAnalysisData & { ethnicity?: string })?.ethnicity ?? (personalInfo as PersonalInfoData & { ethnicity?: string })?.ethnicity ?? undefined,
      );
      if (obesityWarn.status === "WARNING") warnings.push(obesityWarn);

      const zeroExerciseWarn = warnZeroExercise(
        workoutPreferences.workout_frequency_per_week,
        isWeightLoss ? "weight-loss" : "other",
      );
      if (zeroExerciseWarn.status === "WARNING")
        warnings.push(zeroExerciseWarn);

      const highVolumeWarn = warnHighTrainingVolume(
        workoutPreferences.workout_frequency_per_week,
        workoutPreferences.time_preference,
        workoutPreferences.intensity,
      );
      if (highVolumeWarn.status === "WARNING") warnings.push(highVolumeWarn);

      const menopauseWarn = warnMenopause(
        personalInfo.gender,
        personalInfo.age,
      );
      if (menopauseWarn.status === "WARNING") warnings.push(menopauseWarn);

      const equipmentWarn = warnEquipmentLimitations(
        workoutPreferences.primary_goals,
        workoutPreferences.location,
        workoutPreferences.equipment,
      );
      if (equipmentWarn.status === "WARNING") warnings.push(equipmentWarn);

      const limitationsWarn = warnPhysicalLimitationsVsIntensity(
        bodyAnalysis.physical_limitations,
        workoutPreferences.intensity,
      );
      if (limitationsWarn.status === "WARNING") warnings.push(limitationsWarn);

      const dietReadinessScore =
        MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
      const readinessWarn = warnLowDietReadiness(
        dietReadinessScore,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
      );
      if (readinessWarn.status === "WARNING") warnings.push(readinessWarn);

      const _warnGoalMap: Record<string, Goal> = { cutting: 'fat_loss', bulking: 'muscle_gain', maintenance: 'maintenance' };
      const _warnGoal: Goal = _warnGoalMap[isWeightLoss ? 'cutting' : isWeightGain ? 'bulking' : 'maintenance'];
      const proteinTarget = macroCalculator.calculateProtein(
        bodyAnalysis.current_weight_kg,
        _warnGoal,
        resolveDietType(dietPreferences),
        bodyAnalysis.body_fat_percentage ?? undefined,
        bodyAnalysis.target_weight_kg,
      );
      const veganWarn = warnVeganProteinLimitations(
        dietPreferences.diet_type,
        dietPreferences.allergies,
        proteinTarget,
      );
      if (veganWarn.status === "WARNING") warnings.push(veganWarn);

      const medWarn = warnMedicationEffects(bodyAnalysis.medications);
      if (medWarn.status === "WARNING") warnings.push(medWarn);

      if (isWeightGain) {
        const gainWarn = warnExcessiveWeightGain(
          requiredWeeklyRate,
          bodyAnalysis.current_weight_kg,
        );
        if (gainWarn.status === "WARNING") warnings.push(gainWarn);
      }

      const habitsWarn = warnMultipleBadHabits(
        sleepHours,
        dietPreferences.smokes_tobacco,
        dietPreferences.drinks_alcohol,
      );
      if (habitsWarn.status === "WARNING") warnings.push(habitsWarn);
    }

    const goalMap: Record<string, Goal> = { cutting: 'fat_loss', bulking: 'muscle_gain', maintenance: 'maintenance' };
    const proteinGoalKey = isWeightLoss ? 'cutting' : isWeightGain ? 'bulking' : 'maintenance';
    const protein = macroCalculator.calculateProtein(
      bodyAnalysis.current_weight_kg,
      goalMap[proteinGoalKey],
      resolveDietType(dietPreferences),
      bodyAnalysis.body_fat_percentage ?? undefined,
      bodyAnalysis.target_weight_kg,
    );
    const macros = this.calculateMacros(
      targetCalories,
      protein,
      resolveDietType(dietPreferences),
    );

    const { adjustedTDEE, adjustedMacros, notes } =
      this.applyMedicalAdjustments(
        tdee,
        macros,
        bodyAnalysis.medical_conditions,
      );

    // BUG-28: Re-anchor targetCalories to adjustedTDEE to preserve the deficit ratio.
    // Without this, hypothyroid TDEE drops 10% but targetCalories stays the same,
    // making the actual deficit only ~11% of adjustedTDEE instead of the intended 20%.
    const medicallyAdjustedTargetCalories =
      adjustedTDEE !== tdee && tdee > 0
        ? Math.round(targetCalories * (adjustedTDEE / tdee))
        : targetCalories;

    // BUG-FIX: adjustedMacros were calculated against the original targetCalories above.
    // If a medical multiplier shifted targetCalories (e.g. hypothyroid 0.9×), the macro
    // grams must be scaled proportionally so that protein*4 + carbs*4 + fat*9 ≈
    // medicallyAdjustedTargetCalories. Without this, displayed daily calories and
    // displayed macros do not add up for medical-condition users.
    const finalMacros =
      targetCalories > 0 && medicallyAdjustedTargetCalories !== targetCalories
        ? {
            protein: Math.round(adjustedMacros.protein * (medicallyAdjustedTargetCalories / targetCalories)),
            carbs: Math.round(adjustedMacros.carbs * (medicallyAdjustedTargetCalories / targetCalories)),
            fat: Math.round(adjustedMacros.fat * (medicallyAdjustedTargetCalories / targetCalories)),
          }
        : adjustedMacros;

    // Re-run BMR floor check on the medically-adjusted value. The pre-adjustment
    // check at line 255 can pass while the post-adjustment value (e.g. hypothyroid
    // 0.9× multiplier) falls below BMR. Errors from this second check are appended
    // only when weight-loss is active (same guard as the original check).
    if (isWeightLoss) {
      const adjustedBmrCheck = validateBMRSafety(medicallyAdjustedTargetCalories, bmr);
      if (adjustedBmrCheck.status === "BLOCKED") errors.push(adjustedBmrCheck);
    }

    const deficitPercent = isWeightLoss ? (adjustedTDEE - medicallyAdjustedTargetCalories) / adjustedTDEE : 0;
    const refeedSchedule = this.calculateRefeedSchedule(
      bodyAnalysis.target_timeline_weeks,
      deficitPercent,
      isWeightLoss
        ? "weight-loss"
        : isWeightGain
          ? "weight-gain"
          : "maintenance",
    );

    const wasRateCapped =
      isWeightLoss && deficitLimitResult?.wasLimited === true;

    // D1-FIX: When the BMR floor was applied in bypass mode, derive the timeline
    // from the actual enforced weeklyRate so chart / macros / daily_calories are
    // mathematically consistent (all three now reflect eating at BMR).
    // Without this, the chart shows 16 weeks but calories imply 20 weeks — ambiguous.
    const wasBMRFlooredInBypass =
      isWeightLoss &&
      !!opts?.bypassDeficitLimit &&
      Math.round(medicallyAdjustedTargetCalories) === Math.round(bmr) &&
      weeklyRate < requiredWeeklyRate;
    const computedTimeline =
      (wasBMRFlooredInBypass || wasRateCapped) && weeklyRate > 0
        ? Math.ceil(weightDifference / weeklyRate)
        : bodyAnalysis.target_timeline_weeks;

    return {
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      calculatedMetrics: {
        bmr: Math.round(bmr),
        tdee: Math.round(adjustedTDEE || tdee),
        targetCalories: Math.round(medicallyAdjustedTargetCalories),
        weeklyRate: Math.round(weeklyRate * 100) / 100,
        originalWeeklyRate: Math.round(requiredWeeklyRate * 100) / 100,
        wasRateCapped,
        protein: finalMacros.protein,
        carbs: finalMacros.carbs,
        fat: finalMacros.fat,
        timeline: computedTimeline,
      },
      adjustments: {
        refeedSchedule:
          refeedSchedule.needsRefeeds || refeedSchedule.needsDietBreak
            ? refeedSchedule
            : undefined,
        medicalNotes: notes.length > 0 ? notes : undefined,
      },
    };
  }

  private static calculateSleepDuration(
    wakeTime: string,
    sleepTime: string,
  ): number {
    if (!wakeTime || !sleepTime) return 8; // safe default (normal sleep)
    const [wakeH, wakeM] = wakeTime.split(":").map(Number);
    const [sleepH, sleepM] = sleepTime.split(":").map(Number);
    const wakeMinutes = wakeH * 60 + wakeM;
    const sleepMinutes = sleepH * 60 + sleepM;
    let durationMinutes = wakeMinutes - sleepMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    return durationMinutes / 60;
  }


  private static calculateMacros(
    dailyCalories: number,
    proteinGrams: number,
    dietType: DietType,
  ): { protein: number; carbs: number; fat: number } {
    return macroCalculator.calculateMacroSplit(dailyCalories, proteinGrams, dietType);
  }

  private static applyMedicalAdjustments(
    tdee: number,
    macros: { protein: number; carbs: number; fat: number },
    medicalConditions: string[],
  ): {
    adjustedTDEE: number;
    adjustedMacros: { protein: number; carbs: number; fat: number };
    notes: string[];
  } {
    let adjustedTDEE = tdee;
    let adjustedMacros = { ...macros };
    const notes: string[] = [];

    if (
      medicalConditions.includes("hypothyroid") ||
      medicalConditions.includes("thyroid")
    ) {
      adjustedTDEE = tdee * 0.9;
      notes.push("⚠️ TDEE reduced 10% due to hypothyroidism");
    } else if (
      medicalConditions.includes("hyperthyroid") ||
      medicalConditions.includes("graves-disease")
    ) {
      adjustedTDEE = tdee * 1.15;
      notes.push("⚠️ TDEE increased 15% due to hyperthyroidism");
    }

    const hasInsulinResistance =
      medicalConditions.includes("pcos") ||
      medicalConditions.includes("diabetes-type2") ||
      medicalConditions.includes("diabetes-type1");

    if (hasInsulinResistance) {
      const originalCarbs = adjustedMacros.carbs;
      adjustedMacros.carbs = Math.round(originalCarbs * 0.75);
      const carbsRemoved = originalCarbs - adjustedMacros.carbs;
      adjustedMacros.fat = Math.round(
        adjustedMacros.fat + (carbsRemoved * 4) / 9,
      );
      notes.push("⚠️ Lower carb (75%) for blood sugar management");
    }

    if (
      medicalConditions.includes("hypertension") ||
      medicalConditions.includes("heart-disease")
    ) {
      notes.push("⚠️ Limit high-intensity exercise without medical clearance");
    }

    adjustedTDEE = Math.max(adjustedTDEE, tdee * 0.85);
    adjustedMacros.carbs = Math.max(adjustedMacros.carbs, macros.carbs * 0.7);

    return { adjustedTDEE, adjustedMacros, notes };
  }

  private static applyDeficitLimit(
    targetCalories: number,
    tdee: number,
    bmr: number,
    stressLevel: "low" | "moderate" | "high",
    hasMedicalConditions: boolean,
  ): {
    adjustedCalories: number;
    wasLimited: boolean;
    limitReason?: string;
    originalDeficitPercent: number;
    adjustedDeficitPercent: number;
  } {
    const MAX_DEFICIT_PERCENT = {
      standard: 0.25,
      recommended: 0.2,
      conservative: 0.15,
    };

    const currentDeficit = tdee - targetCalories;
    const currentDeficitPercent = currentDeficit / tdee;

    let maxDeficit = MAX_DEFICIT_PERCENT.recommended;
    let limitReason = "recommended safety limits";

    if (stressLevel === "high") {
      maxDeficit = MAX_DEFICIT_PERCENT.conservative;
      limitReason = "high stress level";
    } else if (hasMedicalConditions) {
      maxDeficit = MAX_DEFICIT_PERCENT.conservative;
      limitReason = "medical conditions";
    }

    if (currentDeficitPercent > maxDeficit) {
      const adjustedCalories = Math.round(tdee * (1 - maxDeficit));
      const finalCalories = Math.max(adjustedCalories, bmr);
      return {
        adjustedCalories: finalCalories,
        wasLimited: true,
        limitReason,
        originalDeficitPercent: currentDeficitPercent,
        adjustedDeficitPercent: maxDeficit,
      };
    }

    return {
      adjustedCalories: targetCalories,
      wasLimited: false,
      originalDeficitPercent: currentDeficitPercent,
      adjustedDeficitPercent: currentDeficitPercent,
    };
  }

  private static calculateRefeedSchedule(
    timelineWeeks: number,
    deficitPercent: number,
    goalType: string,
  ): {
    needsRefeeds: boolean;
    refeedFrequency?: "weekly";
    needsDietBreak: boolean;
    dietBreakWeek?: number;
    explanation: string[];
  } {
    const needsRefeeds =
      timelineWeeks >= 12 &&
      deficitPercent >= 0.2 &&
      goalType === "weight-loss";
    const needsDietBreak = timelineWeeks >= 16 && goalType === "weight-loss";
    const explanation: string[] = [];

    if (needsRefeeds) {
      explanation.push("📅 WEEKLY REFEED DAYS PLANNED");
      explanation.push("• One day per week: Eat at maintenance calories");
    }

    if (needsDietBreak) {
      const breakWeek = Math.floor(timelineWeeks / 2);
      explanation.push(`🔄 DIET BREAK SCHEDULED at week ${breakWeek}`);
    }

    return {
      needsRefeeds,
      refeedFrequency: needsRefeeds ? "weekly" : undefined,
      needsDietBreak,
      dietBreakWeek: needsDietBreak ? Math.floor(timelineWeeks / 2) : undefined,
      explanation,
    };
  }

  static calculateSmartAlternatives = calculateSmartAlternatives;
}
