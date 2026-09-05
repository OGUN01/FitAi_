/**
 * useGoalProjection — Phase D glue between the unified energy engine and the
 * Goal Contract card.
 *
 * `projectGoal` (Phase A.1) already implements the confidence ladder
 * (0-2 plan_math / 3-5 blended / 6+ observed) and the maintenance/recomp
 * special case. It accepts `weightHistory` + `progressEntries` and uses
 * `mergeWeightSeries` internally to count weigh-ins and (for the observed
 * tier) fit a least-squares slope. Phase D's job is to FEED it real weigh-in
 * data from the stores so the ladder's tiers actually engage — not to rebuild
 * the ladder.
 *
 * This hook assembles the inputs the card needs:
 *   - effectiveTdee   = computeEnergyBreakdown(currentWeight, activePlan).effectiveTdee
 *   - plannedIntake   = advanced_review.daily_calories (the target the user eats to)
 *   - currentWeightKg = resolved current weight
 *   - targetWeightKg  = bodyAnalysis.target_weight_kg
 *   - goalDirection   = derived from workout_preferences.primary_goals
 *   - rateBand        = classifyRateBand(weeklyRateKg, weight, direction)
 *   - weightHistory   = analyticsStore.weightHistory (authed users; merged series)
 *
 * It also derives a "what would close the gap" hint: the extra deficit/day
 * needed to reach the target by the user's chosen timeline (or, when the
 * projection already shows a date, an empty hint — the plan is on track).
 */

import { useMemo } from "react";
import { useCalculatedMetrics, type CalculatedMetrics } from "./useCalculatedMetrics";
import { useProfileStore } from "../stores/profileStore";
import { useFitnessStore } from "../stores/fitnessStore";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { computeEnergyBreakdown } from "../services/energy/energyModel";
import {
  projectGoal,
  type ProjectGoalResult,
  type GoalDirection,
} from "../services/energy/projection";
import {
  CALORIE_PER_KG,
  RATE_BAND_THRESHOLDS,
  type RateBand,
} from "../services/energy/constants";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function resolveGoalDirection(primaryGoals: string[] | null): GoalDirection {
  const hasLoss = primaryGoals?.includes("weight-loss") ?? false;
  const hasGain = primaryGoals?.includes("weight-gain") ?? false;
  if (hasLoss && !hasGain) return "loss";
  if (hasGain && !hasLoss) return "gain";
  return "maintain";
}

function classifyRateBand(
  weeklyRateKg: number,
  weightKg: number,
  direction: GoalDirection,
): RateBand {
  if (direction === "maintain") return "safe";
  const absRate = Math.abs(weeklyRateKg);
  const bodyFraction = weightKg > 0 ? absRate / weightKg : 0;
  if (bodyFraction <= RATE_BAND_THRESHOLDS.safe) return "safe";
  if (bodyFraction <= RATE_BAND_THRESHOLDS.unpredictable) return "aggressive";
  return "unpredictable";
}

function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export interface GoalProjectionData {
  /** The projection result (eta range, band, confidence, label). null when the
   *  inputs are insufficient to compute anything (no weight/calorie target). */
  projection: ProjectGoalResult | null;
  /** Human-readable "what would close the gap" hint. Empty string when the
   *  plan is on track or the hint can't be computed. */
  gapHint: string;
}

export function useGoalProjection(): GoalProjectionData {
  const { metrics } = useCalculatedMetrics();
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);
  const advancedReview = useProfileStore((s) => s.advancedReview);
  const weightHistory = useAnalyticsStore((s) => s.weightHistory);
  const activePlan = useFitnessStore((s) => s.getActivePlan());

  return useMemo<GoalProjectionData>(() => {
    if (!metrics) return { projection: null, gapHint: "" };

    const currentWeightKg = metrics.currentWeightKg;
    const targetWeightKg = metrics.targetWeightKg;
    const plannedIntake = metrics.dailyCalories;

    if (
      currentWeightKg == null ||
      targetWeightKg == null ||
      plannedIntake == null ||
      currentWeightKg <= 0 ||
      plannedIntake <= 0
    ) {
      return { projection: null, gapHint: "" };
    }

    // Live effective TDEE from the active workout plan (planTdee = NEAT + PLAN_BURN).
    const energy = computeEnergyBreakdown({
      weightKg: currentWeightKg,
      heightCm: metrics.heightCm ?? bodyAnalysis?.height_cm ?? 0,
      age: metrics.age ?? 0,
      gender: metrics.gender ?? "male",
      activityLevel: metrics.activityLevel ?? "sedentary",
      medicalConditions: advancedReview?.medical_adjustments,
      pregnancyStatus: bodyAnalysis?.pregnancy_status,
      pregnancyTrimester: bodyAnalysis?.pregnancy_trimester,
      breastfeedingStatus: bodyAnalysis?.breastfeeding_status,
      workoutFrequencyPerWeek:
        workoutPreferences?.workout_frequency_per_week ?? 0,
      timePreference: workoutPreferences?.time_preference ?? 0,
      intensity: workoutPreferences?.intensity ?? "",
      workoutTypes: workoutPreferences?.workout_types ?? [],
      plan: activePlan,
    });

    const effectiveTdee = energy.effectiveTdee;
    const goalDirection = resolveGoalDirection(metrics.primaryGoals);
    const weeklyRateKg = ((effectiveTdee - plannedIntake) * 7) / CALORIE_PER_KG;
    const rateBand = classifyRateBand(weeklyRateKg, currentWeightKg, goalDirection);

    const projection = projectGoal({
      effectiveTdee,
      plannedIntake,
      currentWeightKg,
      targetWeightKg,
      goalDirection,
      rateBand,
      weightHistory,
      progressEntries: [], // analyticsStore.weightHistory already merges sources.
    });

    // ── "What would close the gap" ──
    // When the projection shows a date, the plan is on track — no hint.
    // Otherwise, compute the extra deficit/day needed to hit the user's chosen
    // target timeline (bodyAnalysis.target_timeline_weeks), if one exists.
    let gapHint = "";
    if (!projection.etaEarliest && goalDirection !== "maintain") {
      const targetTimelineWeeks =
        bodyAnalysis?.target_timeline_weeks ??
        metrics.targetTimelineWeeks ??
        metrics.estimatedTimelineWeeks ??
        null;

      if (targetTimelineWeeks && targetTimelineWeeks > 0) {
        const weightDelta = Math.abs(currentWeightKg - targetWeightKg);
        const neededWeeklyRate = weightDelta / targetTimelineWeeks;
        const neededDailyDelta = (neededWeeklyRate * CALORIE_PER_KG) / 7;
        const currentDailyDelta = effectiveTdee - plannedIntake;
        const extra = Math.round(neededDailyDelta - currentDailyDelta);
        if (extra > 0) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + targetTimelineWeeks * 7);
          gapHint = `+${extra} kcal/day deficit (eat less or burn more) reaches your goal by ${formatMonthYear(targetDate)}.`;
        }
      }
    }

    return { projection, gapHint };
  }, [
    metrics,
    bodyAnalysis,
    workoutPreferences,
    advancedReview,
    weightHistory,
    activePlan,
  ]);
}

export type { CalculatedMetrics };
