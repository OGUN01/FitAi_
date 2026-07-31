/**
 * goalRateTiers.ts — pace-tier derivation for the S5 "Choose your pace" panel
 *
 * Pure presentation mapping over the ValidationEngine's SmartAlternativesResult.
 * NOTHING here re-implements engine math: tier rates are clamped to the engine's
 * own safe-rate output (rateAtBMR), and tier calories/timelines are recomposed
 * from the engine's constants (CALORIE_PER_KG) plus the BMR/TDEE the engine
 * itself reported on the result. Selecting a tier dispatches a SmartAlternative
 * through the existing handleRateSelection flow, which persists
 * weekly_weight_loss_goal (the SSOT) and re-runs the engine — so every
 * downstream number (target calories, weekly deficit, timeline weeks)
 * re-derives from the same engine that produced the review screen.
 *
 * Tier ladder (weight-loss mode):
 *   Relaxed      ~0.5 kg/wk — gentlest option, easiest to sustain
 *   Comfortable  ~1.0 kg/wk — steady middle option when safely deliverable
 *   Recommended  the engine's safe capped rate (eat-at-BMR ceiling)
 *   Your goal    the user's own pick, shown with its engine safety verdict
 *
 * A tier is only offered at a rate the engine can actually deliver: composed
 * tiers clamp at rateAtBMR (the BMR floor is the binding diet-only constraint
 * in the engine's bypass path) and tiers that would collapse onto an
 * already-shown rate are dropped — a card may never promise what the plan
 * cannot deliver.
 */

import type {
  SmartAlternative,
  SmartAlternativesResult,
} from "../../../services/validationEngine";
import { CALORIE_PER_KG } from "../../../services/validation/constants";

export type PaceTierKey = "relaxed" | "comfortable" | "recommended" | "original";

export type PaceTierTone = "default" | "accent" | "danger";

export interface PaceTier {
  key: PaceTierKey;
  /** Display title, e.g. "Relaxed". */
  title: string;
  /** Delivered weekly rate in kg/wk (2dp) — what the engine will persist. */
  rate: number;
  /** Engine-composed daily calories for this rate. */
  dailyCalories: number;
  /** Engine-composed weeks to goal (Math.ceil parity with the engine). */
  timelineWeeks: number;
  /** One-line rationale shown under the title. */
  note: string;
  /** Small caps badge on the right (e.g. "Recommended", "Too fast"); null hides. */
  badge: string | null;
  tone: PaceTierTone;
  /** Danger line under the row (below-BMR / blocked reason); null when safe. */
  warning: string | null;
  /** Locked rows are visible but not selectable (engine-blocked picks). */
  blocked: boolean;
  /** Dispatched to onSelectAlternative → handleRateSelection (SSOT update). */
  alternative: SmartAlternative;
}

/** Requested rates for the composed middle/bottom tiers (kg/week). */
const RELAXED_RATE = 0.5;
const COMFORTABLE_RATE = 1.0;

/** 2dp rate key — mirrors the engine's own rounding for card rates. */
const rateKey = (rate: number) => Math.round(rate * 100);

const weeksToGoal = (weightToLose: number, rate: number): number =>
  weightToLose > 0 && rate > 0 ? Math.ceil(weightToLose / rate) : 0;

/**
 * Compose a SmartAlternative for a tier the engine did not produce as a card.
 * Uses ONLY engine-reported values (userBMR / userTDEE / rateAtBMR /
 * weightToLose) and the engine's CALORIE_PER_KG constant — same formulas the
 * engine uses for its own cards, so promise and delivery stay identical.
 */
const composeTierAlternative = (params: {
  id: string;
  label: string;
  deliveredRate: number;
  result: SmartAlternativesResult;
  description: string;
}): SmartAlternative => {
  const { id, label, deliveredRate, result, description } = params;
  const { userBMR, userTDEE, weightToLose } = result;
  const dailyDeficit = (deliveredRate * CALORIE_PER_KG) / 7;
  const dailyCalories = Math.round(userTDEE - dailyDeficit);
  const belowFloor = dailyCalories < result.minimumCalorieFloor;
  return {
    id,
    label,
    weeklyRate: deliveredRate,
    dailyCalories,
    bmrDifference: Math.round(dailyCalories - userBMR),
    timelineWeeks: weeksToGoal(weightToLose, deliveredRate),
    riskLevel: belowFloor ? "blocked" : "safe",
    icon: "leaf",
    badge: "",
    description,
    isUserOriginal: false,
    isRecommended: false,
    isBlocked: belowFloor,
    blockReason: belowFloor
      ? `Below minimum ${result.minimumCalorieFloor} cal/day`
      : undefined,
    requiresExercise: false,
    isBelowBMR: false,
    workoutPlanInclusive: true,
  };
};

/** Engine diet-only card (not a boost) whose 2dp rate matches `rate`. */
const findEngineCardAtRate = (
  result: SmartAlternativesResult,
  rate: number,
): SmartAlternative | undefined =>
  result.alternatives.find(
    (a) =>
      !a.requiresExercise &&
      !a.isUserOriginal &&
      !a.isBlocked &&
      rateKey(a.weeklyRate) === rateKey(rate),
  );

/**
 * Build the loss-mode pace ladder. Returns [] for gain/maintenance modes —
 * WarningCard keeps its existing layouts there.
 */
export function buildLossPaceTiers(
  result: SmartAlternativesResult | null | undefined,
): PaceTier[] {
  if (!result || (result.goalMode ?? "loss") !== "loss") return [];

  const { alternatives, userBMR, weightToLose, rateAtBMR } = result;
  const original = alternatives.find((a) => a.isUserOriginal);
  const recommendedCard = alternatives.find(
    (a) => a.isRecommended && !a.requiresExercise && !a.isUserOriginal,
  );

  // The engine's safe capped rate: the fastest pace it can deliver without
  // dropping the user below their own BMR (diet-only).
  const safeRate = Math.round(rateAtBMR * 100) / 100;
  if (safeRate <= 0) return [];

  const tiers: PaceTier[] = [];
  const shownRates = new Set<number>();

  // ── Your goal — the user's own pick, with the engine's safety verdict ──
  if (original) {
    const origRate = Math.round(original.weeklyRate * 100) / 100;
    const warning = original.isBlocked
      ? (original.blockReason ?? "Not safely deliverable at your numbers")
      : original.isBelowBMR
        ? `Requires eating below your BMR (${result.userBMR} cal) — not sustainable long-term`
        : null;
    tiers.push({
      key: "original",
      title: "Your goal",
      rate: origRate,
      dailyCalories: original.dailyCalories,
      timelineWeeks: original.timelineWeeks,
      note: "The pace you asked for",
      badge: original.isBlocked
        ? (original.badge || "Too fast")
        : original.isBelowBMR
          ? "Risky"
          : null,
      tone: warning ? "danger" : "default",
      warning,
      blocked: original.isBlocked,
      alternative: original,
    });
    shownRates.add(rateKey(origRate));
  }

  // ── Recommended — the engine's safe capped rate ──
  const recommendedAlt =
    recommendedCard ??
    composeTierAlternative({
      id: `tier_recommended_${rateKey(safeRate)}`,
      label: "RECOMMENDED",
      deliveredRate: safeRate,
      result,
      description: "Fastest safe pace at your numbers",
    });
  const recommendedRate = Math.round(recommendedAlt.weeklyRate * 100) / 100;

  if (shownRates.has(rateKey(recommendedRate)) && tiers.length > 0) {
    // The user's own pick already IS the safe rate — merge the verdict into
    // that row instead of rendering two rows at the same pace.
    const originalTier = tiers[0];
    if (!originalTier.warning) {
      originalTier.badge = "Recommended";
      originalTier.tone = "accent";
      originalTier.note = "Your pick — already the fastest safe pace";
    }
  } else {
    tiers.push({
      key: "recommended",
      title: "Recommended",
      rate: recommendedRate,
      dailyCalories: recommendedAlt.dailyCalories,
      timelineWeeks: recommendedAlt.timelineWeeks,
      note: `Fastest safe pace — eat at your BMR (${result.userBMR} cal)`,
      badge: "Recommended",
      tone: "accent",
      warning: null,
      blocked: recommendedAlt.isBlocked,
      alternative: recommendedAlt,
    });
    shownRates.add(rateKey(recommendedRate));
  }

  // ── Comfortable — ~1.0 kg/wk when the engine can deliver it safely ──
  // Clamped at the safe rate: when 1.0 would require below-BMR eating, the
  // engine floors it — so the honest comfortable tier IS the recommended rate
  // and dedupes away rather than promising what the plan can't deliver.
  const comfortableRate = Math.round(Math.min(COMFORTABLE_RATE, safeRate) * 100) / 100;
  if (!shownRates.has(rateKey(comfortableRate)) && comfortableRate > 0) {
    const comfortableAlt =
      findEngineCardAtRate(result, comfortableRate) ??
      composeTierAlternative({
        id: `tier_comfortable_${rateKey(comfortableRate)}`,
        label: "COMFORTABLE",
        deliveredRate: comfortableRate,
        result,
        description: "Steady deficit — challenging but sustainable",
      });
    tiers.push({
      key: "comfortable",
      title: "Comfortable",
      rate: comfortableRate,
      dailyCalories: comfortableAlt.dailyCalories,
      timelineWeeks: comfortableAlt.timelineWeeks,
      note: "Steady deficit — challenging but sustainable",
      badge: null,
      tone: "default",
      warning: null,
      blocked: comfortableAlt.isBlocked,
      alternative: comfortableAlt,
    });
    shownRates.add(rateKey(comfortableRate));
  }

  // ── Relaxed — ~0.5 kg/wk, the gentlest option ──
  const relaxedRate = Math.round(Math.min(RELAXED_RATE, safeRate) * 100) / 100;
  if (!shownRates.has(rateKey(relaxedRate)) && relaxedRate > 0) {
    const relaxedAlt =
      findEngineCardAtRate(result, relaxedRate) ??
      composeTierAlternative({
        id: `tier_relaxed_${rateKey(relaxedRate)}`,
        label: "RELAXED",
        deliveredRate: relaxedRate,
        result,
        description: "Easiest to sustain — minimal hunger",
      });
    tiers.push({
      key: "relaxed",
      title: "Relaxed",
      rate: relaxedRate,
      dailyCalories: relaxedAlt.dailyCalories,
      timelineWeeks: relaxedAlt.timelineWeeks,
      note: "Easiest to sustain — minimal hunger",
      badge: null,
      tone: "default",
      warning: null,
      blocked: relaxedAlt.isBlocked,
      alternative: relaxedAlt,
    });
    shownRates.add(rateKey(relaxedRate));
  }

  // Pace ladder reads slow → fast; "Your goal" takes its natural rung.
  tiers.sort((a, b) => a.rate - b.rate);
  return tiers;
}

/** True when no tier is selectable — WarningCard shows its infeasible-goal guidance. */
export function hasSelectablePaceTier(tiers: PaceTier[]): boolean {
  return tiers.some((t) => !t.blocked);
}

/** Selection check: engine-card id match, or rate parity with the stored goal
    (covers composed tiers, which never appear in the engine's card list). */
export function isPaceTierSelected(
  tier: PaceTier,
  selectedAlternativeId: string | null | undefined,
  selectedWeeklyRate: number | null | undefined,
): boolean {
  if (selectedAlternativeId && tier.alternative.id === selectedAlternativeId) {
    return true;
  }
  if (selectedWeeklyRate != null && selectedWeeklyRate > 0) {
    return rateKey(selectedWeeklyRate) === rateKey(tier.rate);
  }
  return false;
}
