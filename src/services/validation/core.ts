import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../../types/onboarding";
import { MetabolicCalculations, macroCalculator } from "../../utils/healthCalculations";
import { resolveDietType } from "../../utils/healthCalculations/nutritional";
import type { Goal, DietType } from "../../utils/healthCalculations/types";
import { mapActivityLevelForHealthCalc } from "../../utils/typeTransformers";
import {
  ValidationResult,
  ValidationResults,
  SmartAlternativesResult,
} from "./types";
import {
  CALORIE_PER_KG,
  MAX_SURPLUS_FRACTION,
  MIN_CALORIES_MALE,
  MIN_CALORIES_FEMALE,
  DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
} from "./constants";
import {
  validateMinimumBodyFat,
  validateMinimumBMI,
  validateMaximumBMI,
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
  warnUnderweightTargetBand,
  warnSingleMeal,
} from "./warningValidations";
import { calculateSmartAlternatives } from "./smartAlternatives";

// ============================================================================
// CALORIE & RATE DERIVATION — ARCHITECTURE REFERENCE
// ============================================================================
// All values flow through ValidationEngine.validateUserPlan as the SSOT.
// Downstream consumers (onboardingService, useCalculatedMetrics, AI transformers)
// must READ from advanced_review — never re-derive independently.
//
// For WEIGHT LOSS with a Boost Pace Card (boost_extra_cardio_minutes > 0):
//
//   TDEE          = baseTDEE (activity multiplier) + exerciseBurn (planned workouts)
//   BMR           = Mifflin-St Jeor formula
//
//   boostBurnPerDay = estimateSessionCalorieBurn(boostMinutes, intensity, weight, cardio)
//                     × workoutFrequency / 7
//     → This is the EXTRA cardio the user commits to ON TOP of their plan.
//     → It contributes to the weekly rate but NOT to the diet deficit.
//
//   dietOnlyDailyDeficit = requiredDailyDeficit - boostBurnPerDay
//   targetCalories       = TDEE - dietOnlyDailyDeficit
//                          BUT floored at BMR (absolute safe minimum).
//
//   daily_calories (stored in advanced_review) = targetCalories (= BMR when floored)
//     → This is the INTAKE target shown to the user, NOT BMR itself even if equal.
//
//   weekly_weight_loss_rate = ((TDEE - targetCalories) + boostBurnPerDay) × 7 / 7700
//     → Combines BOTH diet deficit AND exercise boost burn.
//     → This is why rate (e.g. 1.13 kg/wk) is higher than diet-only math implies.
//
// EXAMPLE (user: 90kg, TDEE=2873, BMR=1856, boost=30min×5/wk, rate=1.13kg/wk):
//   boostBurnPerDay ≈ 193 kcal/day
//   requiredDailyDeficit = (1.13 × 7700) / 7 ≈ 1243 kcal/day
//   dietOnlyDeficit = 1243 - 193 = 1050 kcal/day → intake = 1823 kcal
//   BMR floor applied: 1823 < 1856 → targetCalories = 1856 kcal
//   weeklyRate = (1017 + 193) × 7 / 7700 = 1.10 ≈ 1.13 kg/wk ✅
//
// The Move ring goal on HomeScreen = TDEE - BMR = 2873 - 1856 = 1017 kcal/day.
//   → This is the ACTIVE calorie burn goal (excludes resting metabolism).
//   → It is NOT equal to BMR by coincidence; it equals TDEE-BMR because
//     targetCalories was floored at BMR.
// ============================================================================

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

    // Map the onboarding activity_level ("extreme" → "very_active", others
    // pass through) once at the boundary, matching useReviewValidation.ts.
    // Previously this only "worked" because ACTIVITY_MULTIPLIERS happened to
    // alias "extreme" to the same 1.9 multiplier as "very_active" internally —
    // relying on that overlap rather than an explicit conversion.
    const mappedActivityLevel = mapActivityLevelForHealthCalc(
      workoutPreferences.activity_level ?? "sedentary",
    );

    const baseTDEE = MetabolicCalculations.calculateTDEE(
      bmr,
      mappedActivityLevel,
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
    // S10/S12: set when the gain surplus is clamped to MAX_SURPLUS_FRACTION —
    // drives the SURPLUS_LIMITED warning, wasRateCapped, and timeline recompute.
    let gainSurplusWasCapped = false;

    // S19: extra energy need for pregnancy/breastfeeding (ACOG: +0 T1, +340 T2,
    // +450 T3, +500 lactation). Wired into maintenance/gain branches below —
    // previously calculatePregnancyCalories was dead code and pregnant users
    // validated as "maintenance" got bare TDEE.
    const pregnancyBonusPerDay =
      MetabolicCalculations.calculatePregnancyCalories(
        tdee,
        bodyAnalysis.pregnancy_status ?? false,
        bodyAnalysis.pregnancy_trimester ?? undefined,
        bodyAnalysis.breastfeeding_status ?? false,
      ) - tdee;

    if (isWeightLoss) {
      // Boost card exercise burn: when the user selected a boost_* pace card,
      // they commit to extra cardio ON TOP of their existing plan. The deficit
      // comes from diet (eat at BMR) + exercise burn — not diet alone.
      // Without this, the BMR floor wipes out the exercise component and drops
      // the stored rate (e.g. 0.98 → 0.84) causing a timeline mismatch.
      const boostExtraMin = workoutPreferences.boost_extra_cardio_minutes ?? 0;
      let boostBurnPerDay = 0;
      if (boostExtraMin > 0) {
        const effectiveFreq = workoutPreferences.workout_frequency_per_week > 0
          ? workoutPreferences.workout_frequency_per_week
          : DEFAULT_EXERCISE_SESSIONS_PER_WEEK; // parity with smartAlternatives.ts
        const burnPerSession = MetabolicCalculations.estimateSessionCalorieBurn(
          boostExtraMin,
          workoutPreferences.intensity ?? "beginner",
          bodyAnalysis.current_weight_kg,
          ["cardio"],
        );
        boostBurnPerDay = (burnPerSession * effectiveFreq) / 7;
      }

      const dailyDeficit = (requiredWeeklyRate * CALORIE_PER_KG) / 7;
      // For boost cards the required diet deficit is reduced by the exercise burn.
      // The remaining gap comes from eating below TDEE (but at or above BMR).
      const dietOnlyDailyDeficit = dailyDeficit - boostBurnPerDay;
      const initialTargetCalories = tdee - dietOnlyDailyDeficit;
      if (opts?.bypassDeficitLimit) {
        // Show the user their actual selected goal — clamp at BMR (absolute floor).
        // BUG-47: For high-stress or medical-condition users, also enforce a conservative
        // 15% deficit ceiling. Without this, a stressed user could select a 35% deficit
        // via "KEEP MY GOAL" and the system would silently allow it in bypass mode.
        const isHighRisk =
          bodyAnalysis.stress_level === "high" ||
          (bodyAnalysis.medical_conditions?.length ?? 0) > 0 ||
          // S18: minors get conservative deficits — their physiology is still
          // developing; aggressive restriction risks growth/hormonal disruption.
          personalInfo.age < 18;
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
          personalInfo.age < 18,
        );
      }
      targetCalories = deficitLimitResult.adjustedCalories;

      // S08: a computed target within 5 kcal above BMR is, for every practical
      // purpose, eating at BMR — snap to it so the persisted plan matches the
      // pace card's "Eat at BMR" promise instead of drifting by rounding.
      if (targetCalories > bmr && targetCalories - bmr <= 5) {
        targetCalories = bmr;
      }

      if (deficitLimitResult.wasLimited) {
        const actualDailyDeficit = tdee - targetCalories;
        weeklyRate = ((actualDailyDeficit + boostBurnPerDay) * 7) / CALORIE_PER_KG;
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
          // Boost cards: total deficit = diet (tdee-bmr) + exercise burn.
          // Without boostBurnPerDay the rate falsely drops (e.g. 0.98→0.84).
          weeklyRate = ((actualDailyDeficit + boostBurnPerDay) * 7) / CALORIE_PER_KG;
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
      // S10/S12: the cap used to be silent — the card promised 1.0 kg/wk while
      // the plan delivered 0.25 with no warning and no timeline recompute.
      gainSurplusWasCapped = cappedSurplus < dailySurplus - 1e-9;
      // S19: pregnancy/breastfeeding energy needs override a smaller gain surplus.
      targetCalories = tdee + Math.max(cappedSurplus, pregnancyBonusPerDay);
      weeklyRate = ((targetCalories - tdee) * 7) / CALORIE_PER_KG;
      if (gainSurplusWasCapped) {
        warnings.push({
          status: "WARNING",
          code: "SURPLUS_LIMITED_FOR_SAFETY",
          message: `Gain rate reduced from ${requiredWeeklyRate.toFixed(2)} to ${weeklyRate.toFixed(2)} kg/week — surplus capped at ${Math.round(MAX_SURPLUS_FRACTION * 100)}% of TDEE`,
          recommendations: [
            "Gaining faster than this adds mostly fat, not muscle",
            `Adjusted target: ${Math.round(targetCalories)} cal/day`,
            "💡 Slower lean gains are easier to keep long-term",
          ],
          canProceed: true,
        });
      }
    } else {
      // Maintenance. S19: pregnancy needs override everything. S13/S14: honor the
      // selected BODY RECOMP card (stored goal > 0) — previously this branch
      // silently delivered exact TDEE while the card promised tdee−200.
      const storedRecompGoal = workoutPreferences.weekly_weight_loss_goal ?? 0;
      if (pregnancyBonusPerDay > 0) {
        targetCalories = tdee + pregnancyBonusPerDay;
        weeklyRate = (pregnancyBonusPerDay * 7) / CALORIE_PER_KG;
      } else if (storedRecompGoal > 0) {
        const dailyDeficit = (storedRecompGoal * CALORIE_PER_KG) / 7;
        const minCalorieFloor =
          personalInfo.gender === "female"
            ? MIN_CALORIES_FEMALE
            : MIN_CALORIES_MALE;
        targetCalories = Math.max(tdee - dailyDeficit, bmr, minCalorieFloor);
        weeklyRate = ((tdee - targetCalories) * 7) / CALORIE_PER_KG;
      } else {
        targetCalories = tdee;
        weeklyRate = 0;
      }
    }

    if (isWeightLoss) {
      // S20: use the RESOLVED body-fat value (manual → AI-estimate → BMI-derived
      // → sex default) instead of the raw manual entry. Previously an AI-estimated
      // 4.5% BF user with no manual entry slipped past the essential-fat block.
      const bodyFatCheck = validateMinimumBodyFat(
        bodyFatData.value,
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

      // S21: the 17.5–18.5 band passes the hard block but is still underweight.
      const underweightBandWarn = warnUnderweightTargetBand(
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.height_cm,
      );
      if (underweightBandWarn.status === "WARNING")
        warnings.push(underweightBandWarn);

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

    // S21: gain-side ceiling — no plan should actively target morbid obesity.
    if (isWeightGain) {
      const maxBmiCheck = validateMaximumBMI(
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.height_cm,
      );
      if (maxBmiCheck.status === "BLOCKED") errors.push(maxBmiCheck);
    }

    const pregnancyCheck = validatePregnancyBreastfeeding(
      bodyAnalysis.pregnancy_status,
      bodyAnalysis.breastfeeding_status,
      targetCalories,
      tdee,
    );
    if (pregnancyCheck.status === "BLOCKED") errors.push(pregnancyCheck);

    const goalCheck = validateGoalConflict(workoutPreferences.primary_goals ?? []);
    if (goalCheck.status === "BLOCKED") errors.push(goalCheck);

    const mealsCheck = validateMealsEnabled(
      dietPreferences.breakfast_enabled,
      dietPreferences.lunch_enabled,
      dietPreferences.dinner_enabled,
      dietPreferences.snacks_enabled,
    );
    if (mealsCheck.status === "BLOCKED") errors.push(mealsCheck);

    // S22: one enabled meal passes the block but concentrates the day's calories.
    const enabledMealCount = [
      dietPreferences.breakfast_enabled,
      dietPreferences.lunch_enabled,
      dietPreferences.dinner_enabled,
      dietPreferences.snacks_enabled,
    ].filter(Boolean).length;
    const singleMealWarn = warnSingleMeal(enabledMealCount);
    if (singleMealWarn.status === "WARNING") warnings.push(singleMealWarn);

    const sleepComboCheck = validateSleepAggressiveCombo(
      sleepHours,
      // S14/S23: validate the DELIVERED rate, not the requested one. A BMR-floored
      // plan delivering 0.03 kg/wk is not aggressive regardless of the stored goal.
      weeklyRate,
      bodyAnalysis.current_weight_kg,
    );
    if (sleepComboCheck.status === "BLOCKED") errors.push(sleepComboCheck);

    const volumeCheck = validateTrainingVolume(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      mappedActivityLevel,
    );
    if (volumeCheck.status === "BLOCKED") errors.push(volumeCheck);

    // S23: warnings are computed even when blocking errors exist. The old
    // errors.length===0 gate hid every warning behind the first error — a user
    // fixing the error was then hit by an avalanche of previously-invisible
    // warnings. All warning functions are null-safe; showing everything upfront
    // lets the wizard and the user act on the full picture.
    {
      // S14/S23: aggressiveness is judged on the DELIVERED rate (post floor/cap),
      // not the requested stored goal — a stale stored goal must not false-flag.
      const isAggressive =
        weeklyRate > bodyAnalysis.current_weight_kg * 0.0075;

      if (isWeightLoss || isWeightGain) {
        const timelineWarn = warnAggressiveTimeline(
          weeklyRate,
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
        bodyAnalysis.medical_conditions ?? [],
        isAggressive,
      );
      if (medicalWarn.status === "WARNING") warnings.push(medicalWarn);

      const recompWarn = warnBodyRecomp(
        workoutPreferences.primary_goals ?? [],
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
        isWeightLoss ? "weight-loss" : "other",
      );
      if (teenWarn.status === "WARNING") warnings.push(teenWarn);

      const heartWarn = warnHeartDisease(
        bodyAnalysis.medical_conditions ?? [],
        workoutPreferences.intensity,
        isAggressive,
      );
      if (heartWarn.status === "WARNING") warnings.push(heartWarn);

      const interferenceWarn = warnConcurrentTrainingInterference(
        workoutPreferences.primary_goals ?? [],
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

      // S09: suppress the "no exercise planned" warning when a boost card was
      // selected — the user just committed to extra cardio sessions, so the
      // warning would contradict the card they tapped.
      if ((workoutPreferences.boost_extra_cardio_minutes ?? 0) === 0) {
        const zeroExerciseWarn = warnZeroExercise(
          workoutPreferences.workout_frequency_per_week,
          isWeightLoss ? "weight-loss" : "other",
        );
        if (zeroExerciseWarn.status === "WARNING")
          warnings.push(zeroExerciseWarn);
      }

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
        workoutPreferences.primary_goals ?? [],
        workoutPreferences.location,
        workoutPreferences.equipment ?? [],
      );
      if (equipmentWarn.status === "WARNING") warnings.push(equipmentWarn);

      const limitationsWarn = warnPhysicalLimitationsVsIntensity(
        bodyAnalysis.physical_limitations ?? [],
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
        dietPreferences.allergies ?? [],
        proteinTarget,
      );
      if (veganWarn.status === "WARNING") warnings.push(veganWarn);

      const medWarn = warnMedicationEffects(bodyAnalysis.medications ?? []);
      if (medWarn.status === "WARNING") warnings.push(medWarn);

      if (isWeightGain) {
        // S10: warn on the DELIVERED (post-cap) rate. A 1.0 kg/wk request capped
        // to 0.25 must not fire "will be mostly fat" — the plan never uses 1.0.
        const gainWarn = warnExcessiveWeightGain(
          weeklyRate,
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
        bodyAnalysis.medical_conditions ?? [],
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

    // S19: hypothyroid/hyperthyroid multipliers re-anchor targetCalories — the
    // pregnancy guard must be re-checked against the ADJUSTED values, not the
    // pre-adjustment ones compared earlier.
    if (bodyAnalysis.pregnancy_status || bodyAnalysis.breastfeeding_status) {
      const adjustedPregnancyCheck = validatePregnancyBreastfeeding(
        bodyAnalysis.pregnancy_status,
        bodyAnalysis.breastfeeding_status,
        medicallyAdjustedTargetCalories,
        adjustedTDEE,
      );
      if (adjustedPregnancyCheck.status === "BLOCKED")
        errors.push(adjustedPregnancyCheck);
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

    // D1-FIX: When the BMR floor was applied in bypass mode, derive the timeline
    // from the actual enforced weeklyRate so chart / macros / daily_calories are
    // mathematically consistent (all three now reflect eating at BMR).
    // Without this, the chart shows 16 weeks but calories imply 20 weeks — ambiguous.
    const wasBMRFlooredInBypass =
      isWeightLoss &&
      !!opts?.bypassDeficitLimit &&
      Math.round(medicallyAdjustedTargetCalories) === Math.round(bmr) &&
      weeklyRate < requiredWeeklyRate;

    // S10/S17: wasRateCapped must cover EVERY path where the delivered rate is
    // lower than requested — the UI "pace reduced for safety" callout and the
    // timeline recompute both read this. Previously only the loss deficit-cap
    // path set it; capped gains and bypass BMR-floors sailed through silently.
    const capApplied =
      (isWeightLoss && deficitLimitResult?.wasLimited === true) ||
      wasBMRFlooredInBypass ||
      gainSurplusWasCapped;

    // FLAG/ROUNDING CONSISTENCY: weeklyRate and originalWeeklyRate are rounded to
    // 2 decimals before storage, so a sub-0.005 kg/wk cap (e.g. a boost card whose
    // eat-at-BMR design lands within rounding of the requested rate) surfaced
    // was_rate_capped=true next to identical displayed numbers (0.69 vs 0.69).
    // Only flag when the rounded delivered rate is actually below the rounded
    // requested rate — the callout must always agree with what the user sees.
    const roundedWeeklyRate = Math.round(weeklyRate * 100) / 100;
    const roundedRequiredRate = Math.round(requiredWeeklyRate * 100) / 100;
    const wasRateCapped = capApplied && roundedWeeklyRate < roundedRequiredRate;

    const computedTimeline =
      wasRateCapped && weeklyRate > 0
        ? Math.ceil(weightDifference / weeklyRate)
        : bodyAnalysis.target_timeline_weeks;

    // BMR-FLOOR VISIBILITY: a weight-loss plan can land exactly on the BMR floor
    // via silent paths (bypass "KEEP MY GOAL" floor, or the ≤5 kcal BMR snap).
    // Previously daily_calories === calculated_bmr with no explanation — it read
    // as a calculation bug. Surface the floor explicitly unless the deficit-limit
    // warning already covered it.
    if (
      isWeightLoss &&
      Math.round(medicallyAdjustedTargetCalories) === Math.round(bmr) &&
      deficitLimitResult?.wasLimited !== true
    ) {
      warnings.push({
        status: "WARNING",
        code: "EATING_AT_BMR_FLOOR",
        message: `Your calorie target sits at your BMR (${Math.round(bmr)} kcal) — the metabolic floor, the safest effective intake for your goal`,
        recommendations: [
          "🛡️ Eating below BMR risks muscle loss, hormonal disruption and rebound gain",
          "Your plan reaches the goal through activity on top of this intake, not by eating less",
          "💡 Adding exercise increases weekly progress without lowering calories further",
        ],
        canProceed: true,
      });
    }

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

    // Coverage for conditions that don't change calorie/macro math (arthritis,
    // asthma, depression, anxiety, sleep-apnea, high-cholesterol): previously
    // they produced ZERO notes, so medical_adjustments came back undefined even
    // for diagnosed users. Acknowledge them so the review tab can show the plan
    // accounted for the condition.
    if (medicalConditions.length > 0 && notes.length === 0) {
      notes.push(
        `ℹ️ Plan reviewed with your medical conditions in mind: ${medicalConditions.join(", ")}`,
      );
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
    isTeen: boolean = false,
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
    } else if (isTeen) {
      // S18: minors always get the conservative cap — developing physiology.
      maxDeficit = MAX_DEFICIT_PERCENT.conservative;
      limitReason = "age under 18 (safe deficit for development)";
    }

    if (currentDeficitPercent > maxDeficit) {
      const adjustedCalories = Math.round(tdee * (1 - maxDeficit));
      const finalCalories = Math.max(adjustedCalories, bmr);
      return {
        adjustedCalories: finalCalories,
        wasLimited: true,
        limitReason,
        originalDeficitPercent: currentDeficitPercent,
        // S23: report the deficit ACTUALLY enforced. When the BMR floor binds,
        // the real deficit is far below the nominal cap (e.g. "capped at 15%"
        // was displayed while the enforced deficit was 2.5%).
        adjustedDeficitPercent: (tdee - finalCalories) / tdee,
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
