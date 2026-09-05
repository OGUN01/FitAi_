/**
 * Custom diet plan → goal projection.
 *
 * Phase A.3: Now delegates to the unified energy engine
 * (computeEnergyBreakdown + projectGoal) so the diet builder's TDEE and
 * projection agree with core.ts and master-engine.ts. The old hand-rolled
 * `calculateTDEE(bmr, mappedLevel)` used ACTIVITY_MULTIPLIERS (which bake in
 * planned exercise) with no separate exercise term and no age modifier —
 * diverging from core.ts. The engine computes NEAT_TDEE (NEAT-only multiplier
 * × age modifier) which is the correct shared base.
 *
 * For the diet-only projection case (custom diet, no active workout plan):
 *   - planBurnPerDay = 0 (no active plan passed)
 *   - intentExerciseBurn = 0 (workoutFrequencyPerWeek = 0)
 *   - effectiveTdee == neatTdee
 * This is the correct TDEE for a diet-only card: NEAT alone, no exercise
 * credit. PLAN_BURN is a real, separate term in the engine — the old
 * "would double-count" caveat is obsolete.
 *
 * The GOAL_DIRECTION_CONFLICT guard stays (it's correct) and now operates
 * on the engine's outputs. The food floor (validateAbsoluteMinimum +
 * validateBMRSafety) remains the hard blocker.
 */

import {
  CALORIE_PER_KG,
  MIN_CALORIES_MALE,
  MIN_CALORIES_FEMALE,
} from "./constants";
import { validateAbsoluteMinimum, validateBMRSafety } from "./blockingValidations";
import type { ValidationResult } from "./types";
import { macroCalculator } from "../../utils/healthCalculations/calculators/macroCalculator";
import { computeEnergyBreakdown } from "../energy/energyModel";
import { projectGoal, type GoalDirection as EngineGoalDirection } from "../energy/projection";
import { RATE_BAND_THRESHOLDS, type RateBand } from "../energy/constants";

/** Hermes-safe month names (no Intl dependency) — matches the convention in
 * src/components/onboarding/review/WeightManagementSection.tsx. */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type GoalDirection = "loss" | "gain" | "maintain";

export interface CustomDietProjectionInput {
  currentWeightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  /** Onboarding activity_level (e.g. "extreme") — mapped internally via
   * mapActivityLevelForHealthCalc before use, per CLAUDE.md's "Enum
   * boundaries" rule. Do not pre-map before calling. */
  activityLevel: string;
  targetWeightKg: number;
  /** e.g. ["weight-loss"] — same string convention as
   * blockingValidations.validateGoalConflict. */
  primaryGoals: string[];
  /** Summed from the custom plan's TODAY's meals (or another representative
   * day) — the caller owns which day this represents. */
  customDailyCalories: number;
  customDailyMacros: { protein: number; carbs: number; fat: number; fiber: number };
}

export interface CustomDietProjectionResult {
  status: "OK" | "WARNING" | "BLOCKED";
  bmr: number;
  tdee: number;
  /** Positive = deficit (losing), negative = surplus (gaining). */
  dailyDeficit: number;
  /** Positive = losing weight, negative = gaining. */
  weeklyRateKg: number;
  goalDirection: GoalDirection;
  /** null whenever a projection would be misleading — direction conflict,
   * near-zero rate, or an absurdly long horizon. Never show a date derived
   * from a mismatched-direction or zero-progress rate. */
  projectedDate: Date | null;
  /** Conservative end of the ETA range (0.75 realization). null when no date. */
  projectedDateLatest: Date | null;
  /** "Month Year", Hermes-safe formatting. null iff projectedDate is null. */
  projectedDateLabel: string | null;
  /** "Month Year – Month Year" range, or the deferred/no-date sentence from
   *  projectGoal when no date is shown. null only when there is no projection
   *  context at all. Adopted from projectGoal.label so the diet builder's copy
   *  follows the same range/deferred rules as the workout side. */
  /** "Month Year – Month Year" range, or the deferred/no-date sentence from
   *  projectGoal when no date is shown. null only when there is no projection
   *  context at all. Adopted from projectGoal.label so the diet builder's copy
   *  follows the same range/deferred rules as the workout side. */
  projectionLabel: string | null;
  weeksToGoal: number | null;
  /** Food floor = max(BMR, 1500 M / 1200 F). The hard wall — a plan below it
   *  cannot be activated (Phase B Save & Activate gate). */
  foodFloorKcal: number;
  /** How far below the floor the plan sits (floor − intake). 0 when at/above. */
  foodFloorShortfall: number;
  warnings: ValidationResult[];
  blockers: ValidationResult[];
}

function resolveGoalDirection(primaryGoals: string[]): GoalDirection {
  const hasLoss = primaryGoals.includes("weight-loss");
  const hasGain = primaryGoals.includes("weight-gain");
  if (hasLoss && !hasGain) return "loss";
  if (hasGain && !hasLoss) return "gain";
  return "maintain";
}

/**
 * Project a custom diet plan's calorie/macro totals onto the user's weight
 * goal: resulting deficit/surplus, weekly rate, safety warnings, and — only
 * when it would not be misleading — a projected goal date.
 */
export function projectCustomDietPlan(
  input: CustomDietProjectionInput,
): CustomDietProjectionResult {
  const {
    currentWeightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    targetWeightKg,
    primaryGoals,
    customDailyCalories,
    customDailyMacros,
  } = input;

  // Phase A.3: Delegate to the unified energy engine. For a diet-only
  // projection there is no active workout plan and no workout intent — both
  // planBurnPerDay and intentExerciseBurn are 0, so effectiveTdee == neatTdee.
  const energy = computeEnergyBreakdown({
    weightKg: currentWeightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    workoutFrequencyPerWeek: 0,
    timePreference: 0,
    intensity: "",
    workoutTypes: [],
    plan: null,
  });
  const bmr = energy.bmr;
  const tdee = energy.effectiveTdee; // = neatTdee (no plan, no intent)

  const dailyDeficit = tdee - customDailyCalories;
  const goalDirection = resolveGoalDirection(primaryGoals);

  const warnings: ValidationResult[] = [];
  const blockers: ValidationResult[] = [];

  // Clinical floors — reuse the existing validators rather than re-deriving
  // the 1200/1500 kcal thresholds.
  const absMinResult = validateAbsoluteMinimum(customDailyCalories, gender);
  if (absMinResult.status === "BLOCKED") blockers.push(absMinResult);

  const bmrSafetyResult = validateBMRSafety(customDailyCalories, bmr);
  if (bmrSafetyResult.status === "BLOCKED") blockers.push(bmrSafetyResult);

  // Macro floors (protein / fat) — macroCalculator.validateMacros warns,
  // it does not block; surfaced here as a WARNING to match that contract.
  const macroCheck = macroCalculator.validateMacros(
    {
      protein: customDailyMacros.protein,
      carbs: customDailyMacros.carbs,
      fat: customDailyMacros.fat,
    },
    customDailyCalories,
  );
  if (!macroCheck.valid) {
    warnings.push({
      status: "WARNING",
      code: "MACRO_FLOOR",
      message: macroCheck.issues.join("; "),
    });
  }

  // Goal-direction guard: the single genuinely-new safety check. A
  // weight-loss goal paired with a net-surplus custom plan (or vice versa)
  // must never show a confident projected date.
  const weeklyRateKg = (dailyDeficit * 7) / CALORIE_PER_KG;
  let directionConflict = false;
  if (goalDirection === "loss" && weeklyRateKg <= 0) {
    directionConflict = true;
    warnings.push({
      status: "WARNING",
      code: "GOAL_DIRECTION_CONFLICT",
      message:
        weeklyRateKg < 0
          ? `This plan is a ${Math.abs(Math.round(dailyDeficit))} kcal/day surplus — it will cause weight GAIN, not the loss you're aiming for.`
          : "This plan is calorie-neutral — it won't move you toward your weight-loss goal.",
      recommendations: ["Reduce daily calories to create a deficit"],
    });
  } else if (goalDirection === "gain" && weeklyRateKg >= 0) {
    directionConflict = true;
    warnings.push({
      status: "WARNING",
      code: "GOAL_DIRECTION_CONFLICT",
      message:
        weeklyRateKg > 0
          ? `This plan is a ${Math.round(dailyDeficit)} kcal/day deficit — it will cause weight LOSS, not the gain you're aiming for.`
          : "This plan is calorie-neutral — it won't move you toward your weight-gain goal.",
      recommendations: ["Increase daily calories to create a surplus"],
    });
  }

  // Phase A.3: Projection via projectGoal. The rate band is classified from
  // the constants (same thresholds as evaluatePlanSafety). For a diet-only
  // plan with no weigh-ins, confidence is always 'plan_math' — a date is
  // only shown when the band is 'safe'. Aggressive/unpredictable plans get
  // no date until 3+ weigh-ins confirm the trend (per the goal-engine
  // decision).
  const rateBand = classifyRateBand(weeklyRateKg, currentWeightKg, goalDirection);
  const projection = projectGoal({
    effectiveTdee: tdee,
    plannedIntake: customDailyCalories,
    currentWeightKg,
    targetWeightKg,
    goalDirection: goalDirection as EngineGoalDirection,
    rateBand,
    // No weight history for the custom diet builder — confidence is always plan_math.
  });

  let weeksToGoal: number | null = null;
  let projectedDate: Date | null = null;
  let projectedDateLatest: Date | null = null;
  let projectedDateLabel: string | null = null;
  let projectionLabel: string | null = null;

  if (projection.etaEarliest && !directionConflict) {
    const weightDeltaKg = Math.abs(currentWeightKg - targetWeightKg);
    const absRate = Math.abs(projection.weeklyRateKg);
    if (absRate > 0) {
      const rawWeeks = weightDeltaKg / absRate;
      if (Number.isFinite(rawWeeks) && rawWeeks > 0) {
        weeksToGoal = Math.ceil(rawWeeks);
      }
    }
    projectedDate = projection.etaEarliest;
    projectedDateLatest = projection.etaLatest;
    projectedDateLabel = `${MONTHS[projection.etaEarliest.getMonth()]} ${projection.etaEarliest.getFullYear()}`;
    // Range label: when a conservative bound exists, show earliest–latest;
    // otherwise fall back to the single earliest date.
    if (projection.etaLatest) {
      projectionLabel = `${MONTHS[projection.etaEarliest.getMonth()]} ${projection.etaEarliest.getFullYear()} – ${MONTHS[projection.etaLatest.getMonth()]} ${projection.etaLatest.getFullYear()}`;
    } else {
      projectionLabel = projectedDateLabel;
    }
  } else {
    // No date shown — carry projectGoal's honest label (deferred / no-progress /
    // direction-conflict copy) so the panel surfaces the same messaging the
    // workout side does, instead of a generic "keep building" line.
    projectionLabel = projection.label;
  }

  const status: CustomDietProjectionResult["status"] =
    blockers.length > 0 ? "BLOCKED" : warnings.length > 0 ? "WARNING" : "OK";

  return {
    status,
    bmr,
    tdee,
    dailyDeficit,
    weeklyRateKg: projection.weeklyRateKg,
    goalDirection,
    projectedDate,
    projectedDateLatest,
    projectedDateLabel,
    projectionLabel,
    weeksToGoal,
    foodFloorKcal: energy.foodFloor,
    foodFloorShortfall: Math.max(0, energy.foodFloor - customDailyCalories),
    warnings,
    blockers,
  };
}

/** Classify the rate band from the shared constants — same thresholds as
 *  evaluatePlanSafety.classifyRateBand (private there, so we replicate the
 *  logic here rather than exposing it). Maintenance is always 'safe'. */
function classifyRateBand(
  weeklyRateKg: number,
  weightKg: number,
  goalDirection: GoalDirection,
): RateBand {
  if (goalDirection === "maintain") return "safe";
  const absRate = Math.abs(weeklyRateKg);
  const bodyFraction = weightKg > 0 ? absRate / weightKg : 0;
  if (bodyFraction <= RATE_BAND_THRESHOLDS.safe) return "safe";
  if (bodyFraction <= RATE_BAND_THRESHOLDS.unpredictable) return "aggressive";
  return "unpredictable";
}

// Re-exported so callers building UI copy don't need a second import for
// the floor values already computed above.
export { MIN_CALORIES_MALE, MIN_CALORIES_FEMALE, CALORIE_PER_KG };
