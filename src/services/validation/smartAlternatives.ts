import { SmartAlternative, SmartAlternativesResult, RiskLevel } from "./types";
import { MetabolicCalculations } from "../../utils/healthCalculations";
import {
  CALORIE_PER_KG,
  MIN_CALORIES_FEMALE,
  MIN_CALORIES_MALE,
  DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
} from "./constants";

export function calculateSmartAlternatives(
  userRequestedRate: number,
  bmr: number,
  tdee: number,
  currentWeight: number,
  targetWeight: number,
  gender: "male" | "female",
  workoutFrequency: number = DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
  workoutIntensity: string = "beginner",
  workoutTimeMinutes: number = 60,
): SmartAlternativesResult {
  const isWeightGain = currentWeight < targetWeight;
  const minimumCalorieFloor =
    gender === "female" ? MIN_CALORIES_FEMALE : MIN_CALORIES_MALE;
  const weightToLose = Math.abs(currentWeight - targetWeight);

  // M6: document the maintenance threshold — <0.5 kg to lose is treated as
  // maintenance/recomp because the deficit required is too small to optimise
  // around; body recomposition (eat at TDEE or mild -200 kcal) is the right
  // strategy at that range.
  const MAINTENANCE_THRESHOLD_KG = 0.5;
  const goalMode: "loss" | "gain" | "maintenance" =
    isWeightGain ? "gain"
    : weightToLose < MAINTENANCE_THRESHOLD_KG ? "maintenance"
    : "loss";

  const bmrDeficit = tdee - bmr;
  const rateAtBMR = (bmrDeficit * 7) / CALORIE_PER_KG;

  const rateTiers: Array<{
    id: string;
    rate: number;
    label: string;
    icon: string;
    isUserOriginal?: boolean;
    isRecommended?: boolean;
  }> = [
    {
      id: "user_original",
      rate: userRequestedRate,
      label: "KEEP MY GOAL",
      icon: "flame",
      isUserOriginal: true,
    },
    { id: "aggressive", rate: 1.0, label: "AGGRESSIVE", icon: "flash" },
    { id: "challenging", rate: 0.8, label: "CHALLENGING", icon: "fitness" },
    {
      id: "at_bmr",
      rate: Math.round(rateAtBMR * 100) / 100,
      label: "AT YOUR BMR",
      icon: "shield-checkmark",
      isRecommended: true,
    },
    {
      id: "comfortable",
      rate: Math.max(0.3, Math.round((rateAtBMR - 0.15) * 100) / 100),
      label: "COMFORTABLE",
      icon: "leaf",
    },
  ];

  const alternatives: SmartAlternative[] = [];

  const getDescription = (riskLevel: RiskLevel, bmrDiff: number): string => {
    switch (riskLevel) {
      case "blocked":
        return "Below safe minimum - not available";
      case "dangerous":
        return `${Math.abs(bmrDiff)} cal below BMR - significant health risks`;
      case "caution":
        return `${Math.abs(bmrDiff)} cal below BMR - proceed with caution`;
      case "moderate":
        return `${Math.abs(bmrDiff)} cal below BMR - challenging but manageable`;
      case "safe":
        return "Safe & effective fat loss";
      case "easy":
        return "Easier to maintain, minimal hunger";
      default:
        return "";
    }
  };

  for (const tier of rateTiers) {
    if (!tier.isUserOriginal && Math.abs(tier.rate - userRequestedRate) < 0.05)
      continue;
    if (tier.rate <= 0) continue;

    const dailyDeficit = (tier.rate * CALORIE_PER_KG) / 7;
    // TRUE required calories — no BMR floor on the card.
    // The card shows what it ACTUALLY costs to hit this rate. The enforcement
    // floor (BMR) is a system-level guard shown in the Daily Target section.
    const rawDailyCalories = Math.round(tdee - dailyDeficit);
    // Allow ±50 cal tolerance — a card within 50 cal of BMR is not meaningfully
    // different from eating at BMR and should not be flagged as "below BMR".
    const isBelowBMR = rawDailyCalories < Math.round(bmr) - 50;
    const dailyCalories = rawDailyCalories;
    const bmrDifference = rawDailyCalories - bmr;
    const timelineWeeks =
      weightToLose > 0 ? Math.ceil(weightToLose / tier.rate) : 0;

    let riskLevel: RiskLevel;
    let badge: string;

    if (dailyCalories < minimumCalorieFloor) {
      riskLevel = "blocked";
      badge = "Blocked";
    } else if (isBelowBMR) {
      // All below-BMR diet routes are at least risky — the body cannot sustain
      // eating less than its own metabolic floor without health consequences.
      if (bmrDifference < -500) {
        riskLevel = "dangerous";
        badge = "DANGEROUS";
      } else if (bmrDifference < -200) {
        riskLevel = "caution";
        badge = "RISKY";
      } else {
        // 51–199 cal below BMR: still below the metabolic floor but not severely.
        riskLevel = "moderate";
        badge = "RISKY";
      }
    } else if (tier.isRecommended) {
      riskLevel = "safe";
      badge = "Recommended";
    } else {
      riskLevel = "easy";
      badge = "Easy";
    }

    alternatives.push({
      id: tier.id,
      label: tier.label,
      weeklyRate: Math.round(tier.rate * 100) / 100,
      dailyCalories,
      bmrDifference: Math.round(bmrDifference),
      timelineWeeks,
      riskLevel,
      icon: tier.icon,
      badge,
      description: getDescription(riskLevel, bmrDifference),
      isUserOriginal: tier.isUserOriginal || false,
      isRecommended: tier.isRecommended || false,
      isBlocked: riskLevel === "blocked",
      blockReason:
        riskLevel === "blocked"
          ? `Below minimum ${minimumCalorieFloor} cal/day`
          : undefined,
      requiresExercise: false,
      isBelowBMR,
      workoutPlanInclusive: workoutFrequency > 0,
    });
  }

  // ─ WEIGHT LOSS MODE: Dynamic cardio boost options (+20/+30/+40 min per session)
  if (goalMode === "loss") {
    const boosts = [
      { id: "boost_light",  extraMin: 20, label: "LIGHT BOOST",  icon: "walk",    badge: "Easy Extra",  riskLevel: "easy" as RiskLevel,     isRecommended: false },
      { id: "boost_cardio", extraMin: 30, label: "CARDIO BOOST", icon: "bicycle", badge: "Smart Pick",  riskLevel: "safe" as RiskLevel,     isRecommended: true  },
      { id: "boost_hard",   extraMin: 40, label: "HARD BOOST",   icon: "barbell", badge: "High Effort", riskLevel: "moderate" as RiskLevel, isRecommended: false },
    ];

    const effectiveFreq = workoutFrequency > 0 ? workoutFrequency : DEFAULT_EXERCISE_SESSIONS_PER_WEEK;

    for (const boost of boosts) {
      const extraBurnPerSession = MetabolicCalculations.estimateSessionCalorieBurn(
        boost.extraMin,
        workoutIntensity as "beginner" | "intermediate" | "advanced",
        currentWeight,
        ["cardio"],
      );
      const extraBurnPerDay = (extraBurnPerSession * effectiveFreq) / 7;
      const combinedDeficit = bmrDeficit + extraBurnPerDay;
      const weeklyRate = (combinedDeficit * 7) / CALORIE_PER_KG;
      if (weeklyRate <= 0) continue;

      const exerciseDescription = workoutFrequency > 0
        ? `+${boost.extraMin} min cardio/session (${workoutFrequency}×/wk)`
        : `Start ${boost.extraMin} min cardio sessions (${DEFAULT_EXERCISE_SESSIONS_PER_WEEK}×/wk)`;

      alternatives.push({
        id: boost.id,
        label: boost.label,
        weeklyRate: Math.round(weeklyRate * 100) / 100,
        dailyCalories: Math.round(bmr),
        bmrDifference: 0,
        timelineWeeks: Math.ceil(weightToLose / weeklyRate),
        riskLevel: boost.riskLevel,
        icon: boost.icon,
        badge: boost.badge,
        description: `Eat at BMR (${Math.round(bmr)} cal) + ${exerciseDescription}. Your existing workout plan continues unchanged.`,
        isUserOriginal: false,
        isRecommended: boost.isRecommended,
        isBlocked: false,
        requiresExercise: true,
        exerciseType: boost.id as SmartAlternative["exerciseType"],
        exerciseMinutes: boost.extraMin,
        exerciseSessions: effectiveFreq,
        exerciseCaloriesBurned: Math.round(extraBurnPerSession),
        exerciseDescription,
        isBelowBMR: false,
      });
    }
  }

  // ─ MAINTENANCE MODE: 2 simple options (eat at TDEE or slight deficit for body recomp)
  if (goalMode === "maintenance") {
    alternatives.push({
      id: "maintain",
      label: "MAINTAIN WEIGHT",
      weeklyRate: 0,
      dailyCalories: Math.round(tdee),
      bmrDifference: Math.round(tdee - bmr),
      timelineWeeks: 0,
      riskLevel: "safe",
      icon: "scale",
      badge: "Balanced",
      description: `Eat at your TDEE (${Math.round(tdee)} cal/day) — maintain current weight.`,
      isUserOriginal: false,
      isRecommended: false,
      isBlocked: false,
      requiresExercise: false,
      workoutPlanInclusive: workoutFrequency > 0,
    });
    const recompCals = Math.round(tdee - 200);
    alternatives.push({
      id: "recomp",
      label: "BODY RECOMP",
      weeklyRate: Math.round((200 * 7) / CALORIE_PER_KG * 100) / 100,
      dailyCalories: recompCals,
      bmrDifference: Math.round(recompCals - bmr),
      timelineWeeks: 0,
      riskLevel: "safe",
      icon: "fitness",
      badge: "Recommended",
      description: `Eat ${recompCals} cal/day (200 cal deficit). Lose fat slowly while building muscle — no dramatic changes.`,
      isUserOriginal: false,
      isRecommended: true,
      isBlocked: false,
      requiresExercise: false,
      workoutPlanInclusive: workoutFrequency > 0,
    });
  }

  alternatives.sort((a, b) => {
    if (a.isUserOriginal) return -1;
    if (b.isUserOriginal) return 1;
    if (!a.requiresExercise && b.requiresExercise) return -1;
    if (a.requiresExercise && !b.requiresExercise) return 1;
    return b.weeklyRate - a.weeklyRate;
  });

  // Compute bestBoostOptionId for weight-loss mode auto-selection
  const boostOptions = alternatives.filter(a =>
    ["boost_light", "boost_cardio", "boost_hard"].includes(a.id)
  );
  // M1: prefer the isRecommended card (CARDIO BOOST) over the highest-rate card (HARD BOOST).
  // Sort recommended first, then fall back to highest weeklyRate as tiebreaker.
  const bestBoost = boostOptions.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return b.weeklyRate - a.weeklyRate;
  })[0] ?? null;

  if (isWeightGain) {
    // Weight-gain alternatives: surplus-based tiers
    const weightToGain = Math.abs(targetWeight - currentWeight);
    const gainTiers: Array<{
      id: string;
      rate: number;
      label: string;
      icon: string;
      isUserOriginal?: boolean;
      isRecommended?: boolean;
    }> = [
      {
        id: "user_original",
        rate: userRequestedRate,
        label: "KEEP MY GOAL",
        icon: "flame",
        isUserOriginal: true,
      },
      {
        id: "lean_gain",
        // D4a-FIX: 0.20% body weight/week — evidence-based maximum for lean gain.
        // Old value (0.5%) was 2.5x too aggressive and primarily added fat, not muscle.
        rate: Math.round(currentWeight * 0.002 * 100) / 100,
        label: "LEAN GAIN",
        icon: "shield-checkmark",
        isRecommended: true,
      },
      {
        id: "moderate_gain",
        // D4a-FIX: 0.35% body weight/week — moderate lean gain.
        rate: Math.round(currentWeight * 0.0035 * 100) / 100,
        label: "MODERATE GAIN",
        icon: "flash",
      },
      {
        id: "aggressive_gain",
        // D4a-FIX: 0.50% body weight/week — upper bound of lean bulk.
        rate: Math.round(currentWeight * 0.005 * 100) / 100,
        label: "AGGRESSIVE GAIN",
        icon: "barbell",
      },
    ];

    const gainAlternatives: SmartAlternative[] = [];
    for (const tier of gainTiers) {
      if (!tier.isUserOriginal && Math.abs(tier.rate - userRequestedRate) < 0.05)
        continue;
      if (tier.rate <= 0) continue;

      const dailySurplus = (tier.rate * CALORIE_PER_KG) / 7;
      const dailyCalories = Math.round(tdee + dailySurplus);
      const timelineWeeks =
        weightToGain > 0 ? Math.ceil(weightToGain / tier.rate) : 0;
      const bmrDifference = dailyCalories - bmr;

      // For weight gain, risk level reflects fat gain speed, not calorie restriction
      let riskLevel: RiskLevel;
      let badge: string;
      // D4a-FIX: Badge thresholds aligned with new tier multipliers (0.2% / 0.35% / 0.5%)
      if (tier.isRecommended) {
        riskLevel = "safe";
        badge = "Recommended";
      } else if (tier.rate <= currentWeight * 0.0035) {
        riskLevel = "easy";
        badge = "Easy";
      } else if (tier.rate <= currentWeight * 0.005) {
        riskLevel = "moderate";
        badge = "Moderate";
      } else {
        riskLevel = "caution";
        badge = "Caution";
      }

      gainAlternatives.push({
        id: tier.id,
        label: tier.label,
        weeklyRate: Math.round(tier.rate * 100) / 100,
        dailyCalories,
        bmrDifference: Math.round(bmrDifference),
        timelineWeeks,
        riskLevel,
        icon: tier.icon as string,
        badge,
        description: `+${Math.round(dailySurplus)} cal/day surplus — ${timelineWeeks} weeks to goal`,
        isUserOriginal: tier.isUserOriginal || false,
        isRecommended: tier.isRecommended || false,
        isBlocked: false,
        requiresExercise: false,
        workoutPlanInclusive: workoutFrequency > 0,
      });
    }

    gainAlternatives.sort((a, b) => {
      if (a.isUserOriginal) return -1;
      if (b.isUserOriginal) return 1;
      return a.weeklyRate - b.weeklyRate;
    });

    // ─ WEIGHT GAIN MODE: Frequency upgrade options (train more for better muscle:fat ratio)
    const maxFrequency = 6;
    const upgradeTargets = [workoutFrequency + 1, workoutFrequency + 2].filter(f => f <= maxFrequency && f > workoutFrequency);

    if (upgradeTargets.length > 0) {
      // Current exercise burn component so we can replace it (not double-count)
      const currentExerciseBurn = MetabolicCalculations.calculateDailyExerciseBurn(
        workoutFrequency, workoutTimeMinutes, workoutIntensity as "beginner" | "intermediate" | "advanced", currentWeight, ["strength", "mixed"]
      );
      // Current daily calories at user's requested gain rate
      const currentDailyCalories = Math.round(tdee + (userRequestedRate * CALORIE_PER_KG) / 7);
      const currentSurplus = currentDailyCalories - tdee;

      for (const targetFreq of upgradeTargets) {
        const newExerciseBurn = MetabolicCalculations.calculateDailyExerciseBurn(
          targetFreq, workoutTimeMinutes, workoutIntensity as "beginner" | "intermediate" | "advanced", currentWeight, ["strength", "mixed"]
        );
        const newTDEE = (tdee - currentExerciseBurn) + newExerciseBurn;
        const requiredNewCalories = newTDEE + currentSurplus;
        const extraFoodNeeded = requiredNewCalories - currentDailyCalories;
        const targetFreqGainTimeline =
          weightToGain > 0 ? Math.ceil(weightToGain / userRequestedRate) : 0;

        gainAlternatives.push({
          id: `freq_${targetFreq}`,
          label: `TRAIN ${targetFreq}×/WEEK`,
          weeklyRate: Math.round(userRequestedRate * 100) / 100,
          dailyCalories: Math.round(requiredNewCalories),
          bmrDifference: Math.round(requiredNewCalories - bmr),
          timelineWeeks: targetFreqGainTimeline,
          riskLevel: "safe",
          icon: "barbell",
          badge: "Good for Muscle",
          description: `${targetFreq} workout days/week. Eat +${Math.round(extraFoodNeeded)} cal/day more to maintain your gain rate. Better muscle:fat ratio.`,
          isUserOriginal: false,
          isRecommended: targetFreq === workoutFrequency + 1,
          isBlocked: false,
          requiresExercise: true,
          isFrequencyUpgrade: true,
          motivationalNote: "More training = better muscle quality",
          exerciseType: `freq_${targetFreq}` as SmartAlternative["exerciseType"],
          exerciseSessions: targetFreq,
        });
      }
    }

    return {
      alternatives: gainAlternatives,
      userBMR: Math.round(bmr),
      userTDEE: Math.round(tdee),
      currentWeight,
      targetWeight,
      weightToLose: weightToGain,
      originalRequestedRate: userRequestedRate,
      showRateComparison: gainAlternatives.length > 1,
      minimumCalorieFloor,
      rateAtBMR: Math.round(rateAtBMR * 100) / 100,
      bestBoostOptionId: null,
      goalMode: "gain",
    };
  }

  return {
    alternatives,
    userBMR: Math.round(bmr),
    userTDEE: Math.round(tdee),
    currentWeight,
    targetWeight,
    weightToLose,
    originalRequestedRate: userRequestedRate,
    showRateComparison: alternatives.length > 1,
    minimumCalorieFloor,
    rateAtBMR: Math.round(rateAtBMR * 100) / 100,
    bestBoostOptionId: bestBoost?.id ?? null,
    goalMode,
  };
}
