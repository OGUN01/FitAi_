/**
 * Safety Gates — plan-level safety evaluation for the goal engine.
 *
 * Phase A.1. Three gates:
 *
 * 1. **foodFloor** — hard wall, never bends. Reuses
 *    `blockingValidations.validateAbsoluteMinimum` / `validateBMRSafety`.
 *    A plan below the floor cannot be saved-and-activated.
 *
 * 2. **trainingLoad** — WARN + logged override. Reuses
 *    `builderValidationService.validatePlan` for pregnancy / injury / under-18
 *    hard blocks via `ExerciseValidationService`. NEW (not in
 *    builderValidationService today): a WARN when a high-intensity cardio plan
 *    is paired with a logged cardiac/respiratory condition or high stress_level.
 *    The hard-block list stays narrow (pregnancy / injury / under-18).
 *
 * 3. **rate** — band classification ('safe' | 'aggressive' | 'unpredictable').
 *    Rate is an OUTPUT, never a limit. Past the safe band the app downgrades
 *    its *promise* instead of blocking the plan.
 */

import type { WeeklyWorkoutPlan } from "../../types/ai";
import type { ValidationWarning } from "../../types/workout";
import {
  validateAbsoluteMinimum,
  validateBMRSafety,
} from "../validation/blockingValidations";
import type { ValidationResult } from "../validation/types";
import {
  validatePlan,
  type ValidationProfile,
} from "../builderValidationService";
import {
  RATE_BAND_THRESHOLDS,
  CARDIAC_RESPITORY_CONDITIONS,
  type RateBand,
} from "./constants";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface PlanSafetyInput {
  // ── Food floor gate ──
  /** Planned daily intake in kcal. */
  plannedIntake: number;
  /** BMR (Mifflin-St Jeor). */
  bmr: number;
  /** User gender ("male" | "female"). */
  gender: string;

  // ── Training load gate ──
  /** The active weekly workout plan (null = no plan → skip training-load gate). */
  plan: WeeklyWorkoutPlan | null;
  /** Safety-relevant profile slice. */
  profile?: ValidationProfile | null;
  /** Medical conditions for the cardiac/respiratory WARN. */
  medicalConditions?: string[];
  /** Stress level ("low" | "moderate" | "high"). */
  stressLevel?: "low" | "moderate" | "high";
  /** User age — under-18 is part of the narrow hard-block list. */
  age?: number;

  // ── Rate gate ──
  /** Computed weekly rate in kg/week (signed: + = loss, - = gain). */
  weeklyRateKg: number;
  /** Current body weight in kg. */
  weightKg: number;
  /** Goal direction — maintenance gets special handling. */
  goalDirection: "loss" | "gain" | "maintain";
}

export interface PlanSafetyResult {
  /** 'BLOCK' when planned intake is below the food floor; 'OK' otherwise. */
  foodFloor: "BLOCK" | "OK";
  /** Food-floor shortfall in kcal (floor − intake). 0 when OK. */
  foodFloorShortfall: number;
  /** Blocking validations that failed (BELOW_BMR, BELOW_ABSOLUTE_MINIMUM). */
  foodFloorViolations: ValidationResult[];
  /** Training-load warnings from builderValidationService + the new cardiac/respiratory WARN. */
  trainingLoad: ValidationWarning[];
  /** Rate band classification. */
  rate: {
    band: RateBand;
  };
}

// ----------------------------------------------------------------------------
// CARDIAC / RESPIRATORY WARN (NEW — not in builderValidationService)
// ----------------------------------------------------------------------------
//
// builderValidationService.validatePlan only takes pregnancy / injuries — it
// has NO medical_conditions input for training-load signals. The diet side
// already has heart-disease / high-stress warnings (warningValidations.ts);
// the workout side does not. This WARN (not BLOCK) closes that gap.
//
// Triggers when:
//   - A high-intensity cardio plan is paired with a logged cardiac or
//     respiratory condition (heart-disease, hypertension, asthma, sleep-apnea).
//   - OR a high-intensity cardio plan is paired with a high stress_level.
//
// This is WARN only — the hard-block list stays narrow (pregnancy / injury /
// under-18) per the goal-engine decision.

/** Activities that are inherently high-intensity regardless of the intensity
 *  field (sprinting, HIIT, jump rope, burpees, tabata). Running/cycling/rowing
 *  at *moderate* intensity do NOT trigger — only when the intensity field is
 *  "high" or the activity is inherently maximal effort. */
const INHERENTLY_HIGH_INTENSITY_KEYWORDS = [
  "sprint",
  "hiit",
  "jump rope",
  "burpee",
  "tabata",
];

function hasHighIntensityCardio(
  plan: WeeklyWorkoutPlan,
): boolean {
  for (const day of plan.workouts) {
    // Check cardio blocks — high intensity OR inherently high-intensity name.
    const cardioBlocks = (day as any).cardioBlocks;
    if (cardioBlocks && Array.isArray(cardioBlocks)) {
      for (const block of cardioBlocks) {
        if (block.intensity === "high") return true;
        const name = (block.name ?? "").toLowerCase();
        if (INHERENTLY_HIGH_INTENSITY_KEYWORDS.some((kw) => name.includes(kw))) {
          return true;
        }
      }
    }
    // Check planned exercises for inherently high-intensity names.
    const planned = day.plannedExercises ?? [];
    for (const ex of planned) {
      const name = (ex.name ?? "").toLowerCase();
      if (INHERENTLY_HIGH_INTENSITY_KEYWORDS.some((kw) => name.includes(kw))) {
        return true;
      }
    }
    // Check legacy exercises.
    const legacy = day.exercises ?? [];
    for (const ex of legacy) {
      const name = (ex.name ?? ex.exerciseName ?? "").toLowerCase();
      if (INHERENTLY_HIGH_INTENSITY_KEYWORDS.some((kw) => name.includes(kw))) {
        return true;
      }
    }
  }
  return false;
}

function evaluateCardioMedicalWarn(
  plan: WeeklyWorkoutPlan,
  medicalConditions: string[] | undefined,
  stressLevel: "low" | "moderate" | "high" | undefined,
): ValidationWarning | null {
  const hasCardioRespiratoryCondition =
    (medicalConditions ?? []).some((c) =>
      CARDIAC_RESPITORY_CONDITIONS.has(c),
    );
  const hasHighStress = stressLevel === "high";

  if (!hasCardioRespiratoryCondition && !hasHighStress) return null;
  if (!hasHighIntensityCardio(plan)) return null;

  const conditions = [];
  if (hasCardioRespiratoryCondition) {
    const matched = (medicalConditions ?? []).filter((c) =>
      CARDIAC_RESPITORY_CONDITIONS.has(c),
    );
    conditions.push(matched.join(", "));
  }
  if (hasHighStress) conditions.push("high stress level");

  return {
    id: "cardio_respiratory_warn",
    type: "safety_constraint",
    severity: "warning",
    message: `High-intensity cardio plan paired with ${conditions.join(" + ")} on file — consider medical clearance and moderate-intensity alternatives.`,
    fixAction: {
      label: "Review cardio intensity",
      type: "adjust_volume",
      payload: { reason: "cardio_respiratory_condition" },
    },
  };
}

// ----------------------------------------------------------------------------
// RATE BAND
// ----------------------------------------------------------------------------

function classifyRateBand(
  weeklyRateKg: number,
  weightKg: number,
  goalDirection: "loss" | "gain" | "maintain",
): RateBand {
  // Maintenance / recomp — rate is near-zero by design; not "aggressive".
  if (goalDirection === "maintain") return "safe";

  const absRate = Math.abs(weeklyRateKg);
  const bodyFraction = weightKg > 0 ? absRate / weightKg : 0;

  if (bodyFraction <= RATE_BAND_THRESHOLDS.safe) return "safe";
  if (bodyFraction <= RATE_BAND_THRESHOLDS.unpredictable) return "aggressive";
  return "unpredictable";
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Evaluate a plan against all three safety gates.
 *
 * The food floor is a hard BLOCK — a below-floor plan cannot be activated.
 * Training-load and rate are advisory (WARN / band classification) — they
 * downgrade the promise, never block the save.
 */
export function evaluatePlanSafety(input: PlanSafetyInput): PlanSafetyResult {
  const {
    plannedIntake,
    bmr,
    gender,
    plan,
    profile,
    medicalConditions,
    stressLevel,
    weeklyRateKg,
    weightKg,
    goalDirection,
  } = input;

  // ── 1. Food floor gate ──
  const foodFloorViolations: ValidationResult[] = [];

  const absMinResult = validateAbsoluteMinimum(plannedIntake, gender);
  if (absMinResult.status === "BLOCKED") foodFloorViolations.push(absMinResult);

  const bmrSafetyResult = validateBMRSafety(plannedIntake, bmr);
  if (bmrSafetyResult.status === "BLOCKED") foodFloorViolations.push(bmrSafetyResult);

  const foodFloorBlocked = foodFloorViolations.length > 0;
  const foodFloor = foodFloorBlocked ? "BLOCK" : "OK";

  // Shortfall = floor − intake (how far below the safe floor the plan sits).
  const genderMin = gender === "female" ? 1200 : 1500;
  const floor = Math.max(bmr, genderMin);
  const foodFloorShortfall = foodFloorBlocked
    ? Math.max(0, Math.round(floor - plannedIntake))
    : 0;

  // ── 2. Training load gate ──
  let trainingLoad: ValidationWarning[] = [];

  if (plan) {
    // Reuse builderValidationService for pregnancy / injury / under-18 hard blocks.
    const builderProfile: ValidationProfile | undefined = profile
      ? {
          pregnancyStatus: profile.pregnancyStatus,
          pregnancyTrimester: profile.pregnancyTrimester,
          injuries: profile.injuries,
          medicalConditions: profile.medicalConditions ?? medicalConditions,
        }
      : undefined;

    trainingLoad = validatePlan(plan, {
      profile: builderProfile ?? null,
    });

    // NEW: cardiac/respiratory + high-intensity cardio WARN.
    const cardioWarn = evaluateCardioMedicalWarn(
      plan,
      medicalConditions,
      stressLevel,
    );
    if (cardioWarn && !trainingLoad.some((w) => w.id === cardioWarn.id)) {
      trainingLoad.push(cardioWarn);
    }
  }

  // ── 3. Rate band ──
  const band = classifyRateBand(weeklyRateKg, weightKg, goalDirection);

  return {
    foodFloor,
    foodFloorShortfall,
    foodFloorViolations,
    trainingLoad,
    rate: { band },
  };
}
