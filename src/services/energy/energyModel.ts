/**
 * Energy Model — unified energy decomposition for the goal engine.
 *
 * Phase A.1. Everything derives from one decomposition:
 *
 *   NEAT_TDEE   = BMR × NEAT_MULTIPLIERS[activity_level] × ageModifier × medicalAdjustment
 *   PLAN_BURN   = daily-average kcal/day from the ACTIVE workout plan
 *   TDEE_eff    = NEAT_TDEE + PLAN_BURN          (the LIVE number — planTdee)
 *   FOOD_FLOOR  = max(BMR, 1500 M / 1200 F) + pregnancy/lactation bonus
 *   goalTdee    = NEAT_TDEE + intentExerciseBurn   (the ONBOARDING-INTENT number)
 *
 * Two TDEEs exist on purpose — do not collapse them:
 *   - `goalTdee`   is frozen at onboarding/review-tab time; powers the goal target.
 *   - `effectiveTdee` (planTdee) recomputes whenever the active plan changes;
 *     powers builder previews, the daily gap, the ledger, and the projection.
 *
 * Reuses (per CLAUDE.md §3 "Search Before Building"):
 *   - `MetabolicCalculations.calculateBMR` — Mifflin-St Jeor BMR.
 *   - `MetabolicCalculations.applyAgeModifier` — age × gender metabolic slowdown.
 *   - `MetabolicCalculations.calculateDailyExerciseBurn` — intent exercise burn.
 *   - `MetabolicCalculations.calculatePregnancyCalories` — floor adjustment.
 *   - `mapActivityLevelForHealthCalc` — enum boundary mapping.
 *   - `computePlanBurnPerDay` — the live plan's burn (this module).
 */

import { MetabolicCalculations } from "../../utils/healthCalculations/metabolic";
import { mapActivityLevelForHealthCalc } from "../../utils/typeTransformers";
import type { WeeklyWorkoutPlan } from "../../types/ai";
import {
  CALORIE_PER_KG,
  MIN_CALORIES_MALE,
  MIN_CALORIES_FEMALE,
} from "../validation/constants";
import { NEAT_MULTIPLIERS } from "./constants";
import { computePlanBurnPerDay, type PlanBurnResult } from "./planBurn";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface EnergyBreakdownInput {
  // ── Profile ──
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  /** Onboarding `activity_level` (sedentary | light | moderate | active | extreme).
   *  Mapped internally via `mapActivityLevelForHealthCalc` — do not pre-map. */
  activityLevel: string;
  /** Medical conditions for TDEE adjustment (hypothyroid 0.9×, hyperthyroid 1.15×). */
  medicalConditions?: string[];

  // ── Pregnancy / lactation ──
  pregnancyStatus?: boolean;
  pregnancyTrimester?: 1 | 2 | 3;
  breastfeedingStatus?: boolean;

  // ── Workout intent (for goalTdee — the ONBOARDING-INTENT number) ──
  /** Sessions per week the user stated at onboarding. */
  workoutFrequencyPerWeek: number;
  /** Session duration in minutes (workout_preferences.time_preference). */
  timePreference: number;
  /** Onboarding intensity: beginner | intermediate | advanced. */
  intensity: string;
  /** Workout type strings (e.g. ["cardio", "strength"]). */
  workoutTypes: string[];

  // ── Active plan (for effectiveTdee — the LIVE number) ──
  /** The active weekly workout plan, or null when no plan is active. */
  plan: WeeklyWorkoutPlan | null;
}

export interface EnergyBreakdown {
  /** Basal Metabolic Rate (Mifflin-St Jeor). */
  bmr: number;
  /** NEAT-only TDEE: BMR × NEAT multiplier × age modifier × medical adjustment.
   *  Excludes ALL exercise — both intent and plan. */
  neatTdee: number;
  /** Daily-average burn from the active plan (PLAN_BURN). 0 when no plan. */
  planBurnPerDay: number;
  /** Effective/live TDEE = NEAT_TDEE + PLAN_BURN. Powers gap, ledger, projection. */
  effectiveTdee: number;
  /** Food floor = max(BMR, 1500 M / 1200 F) + pregnancy/lactation bonus. */
  foodFloor: number;
  /** Goal-intent TDEE = NEAT_TDEE + intentExerciseBurn. Frozen at onboarding. */
  goalTdee: number;
  /** Intent exercise burn from workout_frequency_per_week / intensity (goalTdee only). */
  intentExerciseBurn: number;
  // ── Plan burn details (passed through from computePlanBurnPerDay) ──
  perDayOfWeek: number[];
  weeklyKcal: number;
  unresolvedExerciseIds: string[];
}

// ----------------------------------------------------------------------------
// MEDICAL ADJUSTMENT FACTOR
// ----------------------------------------------------------------------------
//
// Mirrors `ValidationEngine.applyMedicalAdjustments` (core.ts) — a private
// method we cannot call directly. The factor multiplies NEAT_TDEE:
//   hypothyroid / thyroid  → 0.90
//   hyperthyroid / graves  → 1.15
//   floor at 0.85 (never drops more than 15%)
// Non-thyroid conditions (PCOS, diabetes, hypertension, etc.) do not change
// the TDEE multiplier — they are surfaced as warnings/training-load signals
// elsewhere.
function computeMedicalAdjustmentFactor(
  medicalConditions: string[] | undefined,
): number {
  if (!medicalConditions || medicalConditions.length === 0) return 1.0;

  if (
    medicalConditions.includes("hypothyroid") ||
    medicalConditions.includes("thyroid")
  ) {
    return 0.90;
  }
  if (
    medicalConditions.includes("hyperthyroid") ||
    medicalConditions.includes("graves-disease")
  ) {
    return 1.15;
  }
  return 1.0;
}

// ----------------------------------------------------------------------------
// PREGNANCY BONUS
// ----------------------------------------------------------------------------
//
// Reuses `MetabolicCalculations.calculatePregnancyCalories` to derive the
// additive bonus (0 T1, +340 T2, +450 T3, +500 lactation). The base TDEE
// passed in is arbitrary — only the additive delta matters for the floor.
function computePregnancyBonus(
  baseTdee: number,
  pregnancyStatus?: boolean,
  pregnancyTrimester?: 1 | 2 | 3,
  breastfeedingStatus?: boolean,
): number {
  return (
    MetabolicCalculations.calculatePregnancyCalories(
      baseTdee,
      pregnancyStatus ?? false,
      pregnancyTrimester,
      breastfeedingStatus ?? false,
    ) - baseTdee
  );
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Decompose the user's energy expenditure into its components.
 *
 * This is the single entry point for the goal engine. Callers (core.ts,
 * master-engine.ts, customDietProjection.ts) collapse onto this function
 * so every path shares one NEAT_TDEE / BMR / age-modifier implementation.
 */
export function computeEnergyBreakdown(input: EnergyBreakdownInput): EnergyBreakdown {
  const {
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    medicalConditions,
    pregnancyStatus,
    pregnancyTrimester,
    breastfeedingStatus,
    workoutFrequencyPerWeek,
    timePreference,
    intensity,
    workoutTypes,
    plan,
  } = input;

  // 1. BMR (Mifflin-St Jeor).
  const bmr = MetabolicCalculations.calculateBMR(weightKg, heightCm, age, gender);

  // 2. NEAT multiplier — map onboarding enum at the boundary, then look up.
  const mappedActivity = mapActivityLevelForHealthCalc(activityLevel);
  const neatMultiplier = NEAT_MULTIPLIERS[mappedActivity] ?? NEAT_MULTIPLIERS.sedentary;
  const baseNeat = bmr * neatMultiplier;

  // 3. Age modifier (applied to the NEAT base, same as core.ts applies it to
  //    baseTDEE + exerciseBurn — here exercise is separate, so age modifier
  //    applies to the NEAT-only portion).
  const neatWithAge = MetabolicCalculations.applyAgeModifier(baseNeat, age, gender);

  // 4. Medical adjustment (thyroid multiplier, floor 0.85).
  const medicalFactor = computeMedicalAdjustmentFactor(medicalConditions);
  const neatTdee = Math.round(neatWithAge * medicalFactor);

  // 5. Intent exercise burn (goalTdee only — the onboarding-stated frequency).
  const intentExerciseBurn = MetabolicCalculations.calculateDailyExerciseBurn(
    workoutFrequencyPerWeek,
    timePreference,
    intensity,
    weightKg,
    workoutTypes,
  );

  // 6. Plan burn (effectiveTdee only — the live plan's daily average).
  const planBurn: PlanBurnResult = computePlanBurnPerDay(plan, weightKg);

  // 7. Two TDEEs — kept separate per the plan's "Two TDEEs" section.
  const goalTdee = Math.round(neatTdee + intentExerciseBurn);
  const effectiveTdee = Math.round(neatTdee + planBurn.perDayKcal);

  // 8. Food floor — max(BMR, gender absolute min) + pregnancy/lactation bonus.
  const genderMin = gender === "female" ? MIN_CALORIES_FEMALE : MIN_CALORIES_MALE;
  const pregnancyBonus = computePregnancyBonus(
    neatTdee,
    pregnancyStatus,
    pregnancyTrimester,
    breastfeedingStatus,
  );
  const foodFloor = Math.round(Math.max(bmr, genderMin) + pregnancyBonus);

  return {
    bmr: Math.round(bmr),
    neatTdee,
    planBurnPerDay: planBurn.perDayKcal,
    effectiveTdee,
    foodFloor,
    goalTdee,
    intentExerciseBurn,
    perDayOfWeek: planBurn.perDayOfWeek,
    weeklyKcal: planBurn.weeklyKcal,
    unresolvedExerciseIds: planBurn.unresolvedExerciseIds,
  };
}

// Re-export for callers.
export { CALORIE_PER_KG };
