import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ValidationResult,
  SmartAlternative,
  RiskLevel,
} from "../services/validationEngine";

export interface Alternative {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  newTimeline?: number;
  newTargetWeight?: number;
  newWorkoutFrequency?: number;
  dailyCalories: number;
  weeklyRate: number;
  approach: string;
  pros: string[];
  cons: string[];
  goalType?:
    | "weight-loss"
    | "weight-gain"
    | "muscle-gain"
    | "strength"
    | "endurance"
    | "body-recomp"
    | "flexibility"
    | "general-fitness";
  newProteinTarget?: number;
  newIntensity?: "beginner" | "intermediate" | "advanced";
  newWorkoutTypes?: string[];
  newCardioMinutes?: number;
  newStrengthSessions?: number;
  newMobilitySessions?: number;
}

// Helper functions moved outside component
const getIconForRiskLevel = (
  riskLevel: RiskLevel,
  icon: string,
): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    flame: "flame",
    flash: "flash",
    fitness: "fitness",
    "shield-checkmark": "shield-checkmark",
    leaf: "leaf",
    walk: "walk",
    bicycle: "bicycle",
    barbell: "barbell",
  };
  return iconMap[icon] || "ellipse";
};

const getIconColorForRiskLevel = (riskLevel: RiskLevel): string => {
  switch (riskLevel) {
    case "blocked":
      return "#9CA3AF";
    case "dangerous":
      return "#EF4444";
    case "caution":
      return "#F59E0B";
    case "moderate":
      return "#EAB308";
    case "safe":
      return "#22C55E";
    case "easy":
      return "#3B82F6";
    default:
      return "#6B7280";
  }
};

const getProsForAlternative = (alt: SmartAlternative): string[] => {
  const pros: string[] = [];

  if (alt.isRecommended) {
    pros.push("Recommended approach");
  }

  if (alt.riskLevel === "safe" || alt.riskLevel === "easy") {
    pros.push("Sustainable long-term");
    pros.push("Minimal hunger");
  } else if (alt.riskLevel === "moderate") {
    pros.push("Faster results");
    pros.push("Still manageable");
  } else if (alt.riskLevel === "caution" || alt.riskLevel === "dangerous") {
    pros.push("Fastest possible");
  }

  if (alt.requiresExercise) {
    pros.push("Eat more calories");
    pros.push("Fitness benefits");
  }

  if (alt.bmrDifference >= 0) {
    pros.push("Eating above BMR");
    pros.push("Preserves metabolism");
  }

  // Ensure at least one pro is returned
  if (pros.length === 0) {
    pros.push("Progress toward goal");
  }

  return pros.slice(0, 4);
};

const getConsForAlternative = (alt: SmartAlternative): string[] => {
  const cons: string[] = [];

  if (alt.bmrDifference < 0) {
    cons.push(`${Math.abs(alt.bmrDifference)} cal below BMR`);
  }

  if (alt.riskLevel === "dangerous") {
    cons.push("Health risks");
    cons.push("Not recommended");
  } else if (alt.riskLevel === "caution") {
    cons.push("Requires monitoring");
  }

  if (alt.requiresExercise) {
    cons.push(`${alt.exerciseDescription || "Exercise"} required`);
  }

  if (alt.timelineWeeks > 20) {
    cons.push(`Takes ${alt.timelineWeeks} weeks`);
  }

  if (alt.isBlocked) {
    cons.push(alt.blockReason || "Not available");
  }

  return cons.slice(0, 2);
};

const transformSmartAlternativeToAlternative = (
  smartAlt: SmartAlternative,
): Alternative => {
  return {
    name: smartAlt.label,
    icon: getIconForRiskLevel(smartAlt.riskLevel, smartAlt.icon),
    iconColor: getIconColorForRiskLevel(smartAlt.riskLevel),
    newTimeline: smartAlt.timelineWeeks,
    dailyCalories: smartAlt.dailyCalories,
    weeklyRate: smartAlt.weeklyRate,
    approach: smartAlt.description,
    pros: getProsForAlternative(smartAlt),
    cons: getConsForAlternative(smartAlt),
    goalType: "weight-loss",
    newWorkoutFrequency: smartAlt.requiresExercise ? 4 : undefined,
    newCardioMinutes: smartAlt.exerciseMinutes
      ? smartAlt.exerciseMinutes * 7
      : undefined,
  };
};

export interface UseAdjustmentWizardProps {
  visible: boolean;
  error: ValidationResult;
  currentData: {
    bmr: number;
    tdee: number;
    currentWeight: number;
    targetWeight: number;
    currentTimeline: number;
    currentFrequency: number;
    currentIntensity?: string;
    currentProtein?: number;
    currentCardioMinutes?: number;
    currentStrengthSessions?: number;
  };
  primaryGoals?: string[];
  onSelectAlternative: (alternative: Alternative) => void;
  onSaveToDatabase?: () => Promise<boolean>;
  onClose: () => void;
}

export const useAdjustmentWizard = ({
  visible,
  error,
  currentData,
  primaryGoals = [],
  onSelectAlternative,
  onSaveToDatabase,
  onClose,
}: UseAdjustmentWizardProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Helper calculation functions
  const calculateWeightRateAlternatives = (
    data: typeof currentData,
    isWeightLoss: boolean,
    isWeightGain: boolean,
    hasMuscleGoal: boolean,
    safeOptimalRate: number,
    safeMaxRate: number,
  ): Alternative[] => {
    const {
      bmr,
      tdee,
      currentWeight,
      targetWeight,
      currentTimeline,
      currentFrequency,
    } = data;
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const alternatives: Alternative[] = [];

    // ALTERNATIVE 1: EXTEND TIMELINE (Recommended)
    const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);
    const optimalDeficit = (safeOptimalRate * 7700) / 7;
    const optimalCalories = isWeightLoss
      ? Math.max(Math.round(tdee - optimalDeficit), bmr)
      : Math.round(tdee + optimalDeficit);

    alternatives.push({
      name: "Extend Timeline",
      icon: "calendar-outline",
      iconColor: "#3B82F6",
      goalType: isWeightLoss ? "weight-loss" : "weight-gain",
      newTimeline: optimalWeeks,
      dailyCalories: optimalCalories,
      newWorkoutFrequency: currentFrequency,
      weeklyRate: safeOptimalRate,
      newProteinTarget: hasMuscleGoal
        ? Math.round(currentWeight * 2.2)
        : Math.round(currentWeight * 1.6),
      approach: isWeightLoss
        ? "More time, less restriction, same exercise"
        : hasMuscleGoal
          ? "Gradual lean bulk for quality muscle"
          : "Gradual, sustainable weight gain",
      pros: [
        "Easiest to maintain",
        isWeightLoss ? "Preserves muscle mass" : "Lean muscle gains",
        hasMuscleGoal ? "Better strength progression" : "No lifestyle changes",
        "Most sustainable",
      ],
      cons: [
        "Takes longer",
        `+${Math.max(0, optimalWeeks - currentTimeline)} extra weeks`,
      ],
    });

    // ALTERNATIVE 2: ADD EXERCISE
    const aggressiveWeeks = Math.ceil(weightDiff / safeMaxRate);
    const aggressiveDeficit = (safeMaxRate * 7700) / 7;
    const caloriesPerSession = 300;
    const additionalSessionsNeeded = Math.ceil(
      (aggressiveDeficit * 0.4) / (caloriesPerSession / 7),
    );
    const newFrequency = Math.min(
      currentFrequency + additionalSessionsNeeded,
      7,
    );

    const exerciseCalories = isWeightLoss
      ? Math.max(Math.round(tdee - aggressiveDeficit * 0.6), bmr)
      : Math.round(tdee + aggressiveDeficit * 0.6);

    alternatives.push({
      name: hasMuscleGoal ? "Add Strength Training" : "Add Exercise",
      icon: "barbell-outline",
      iconColor: "#8B5CF6",
      goalType: hasMuscleGoal
        ? "muscle-gain"
        : isWeightLoss
          ? "weight-loss"
          : "weight-gain",
      newTimeline: aggressiveWeeks,
      dailyCalories: exerciseCalories,
      newWorkoutFrequency: newFrequency,
      newStrengthSessions: hasMuscleGoal
        ? Math.min(newFrequency, 5)
        : Math.ceil(newFrequency * 0.6),
      newCardioMinutes: isWeightLoss ? 150 : 90,
      weeklyRate: safeMaxRate,
      newProteinTarget: hasMuscleGoal
        ? Math.round(currentWeight * 2.4)
        : Math.round(currentWeight * 2.0),
      approach: isWeightLoss
        ? "More activity, moderate diet"
        : hasMuscleGoal
          ? "Strength focus with controlled surplus"
          : "Active weight gain approach",
      pros: [
        "Faster results",
        "Eat more food",
        hasMuscleGoal ? "Build muscle while achieving goal" : "Fitness gains",
        "Better metabolism",
      ],
      cons: ["More time commitment", `${newFrequency}× workouts/week`],
    });

    // ALTERNATIVE 3: BALANCED APPROACH
    const balancedRate = currentWeight * 0.0085;
    const balancedWeeks = Math.ceil(weightDiff / balancedRate);
    const balancedDeficit = (balancedRate * 7700) / 7;

    const balancedCalories = isWeightLoss
      ? Math.max(Math.round(tdee - balancedDeficit), bmr)
      : Math.round(tdee + balancedDeficit);

    alternatives.push({
      name: "Balanced Approach",
      icon: "options-outline",
      iconColor: "#10B981",
      goalType: "general-fitness",
      newTimeline: balancedWeeks,
      dailyCalories: balancedCalories,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 7),
      newStrengthSessions: 3,
      newCardioMinutes: 120,
      weeklyRate: balancedRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: "Moderate diet + moderate exercise",
      pros: [
        "Well-rounded",
        "Not too restrictive",
        "Reasonable time",
        "Sustainable",
      ],
      cons: ["Middle ground"],
    });

    // ALTERNATIVE 4: ADJUST TARGET
    const achievableWeightChange = safeOptimalRate * currentTimeline;
    const newTargetWeight = isWeightLoss
      ? currentWeight - achievableWeightChange
      : currentWeight + achievableWeightChange;

    const targetCalories = isWeightLoss
      ? Math.max(Math.round(tdee - (safeOptimalRate * 7700) / 7), bmr)
      : Math.round(tdee + (safeOptimalRate * 7700) / 7);

    alternatives.push({
      name: "Adjust Goal",
      icon: "flag-outline",
      iconColor: "#F59E0B",
      goalType: isWeightLoss ? "weight-loss" : "weight-gain",
      newTimeline: currentTimeline,
      newTargetWeight: Math.round(newTargetWeight * 10) / 10,
      dailyCalories: targetCalories,
      newWorkoutFrequency: currentFrequency,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: `Achieve ${Math.round(newTargetWeight)}kg in your timeframe`,
      pros: ["Keep your timeline", "Still good progress", "Sustainable pace"],
      cons: [
        `${Math.abs(targetWeight - newTargetWeight).toFixed(1)}kg less change`,
      ],
    });

    return alternatives;
  };

  const calculateExerciseAlternatives = (
    data: typeof currentData,
    isWeightLoss: boolean,
    hasMuscleGoal: boolean,
    hasEnduranceGoal: boolean,
    safeOptimalRate: number,
  ): Alternative[] => {
    const {
      bmr,
      tdee,
      currentWeight,
      targetWeight,
      currentTimeline,
      currentFrequency,
    } = data;
    const alternatives: Alternative[] = [];

    // ALTERNATIVE 1: ADD STRENGTH TRAINING
    alternatives.push({
      name: "Add Strength Training",
      icon: "barbell-outline",
      iconColor: "#8B5CF6",
      goalType: "strength",
      newWorkoutFrequency: Math.min(currentFrequency + 3, 6),
      newStrengthSessions: 4,
      newCardioMinutes: 60,
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.2),
      newIntensity: "intermediate",
      approach: "Focus on progressive resistance training",
      pros: [
        "Build muscle",
        "Boost metabolism",
        "Increase strength",
        "Better body composition",
      ],
      cons: ["Requires gym access or equipment", "4× strength sessions/week"],
    });

    // ALTERNATIVE 2: ADD CARDIO
    alternatives.push({
      name: hasEnduranceGoal ? "Cardio Focus" : "Add Cardio",
      icon: "heart-outline",
      iconColor: "#EF4444",
      goalType: "endurance",
      newWorkoutFrequency: Math.min(currentFrequency + 3, 6),
      newStrengthSessions: 2,
      newCardioMinutes: 200,
      dailyCalories: isWeightLoss ? Math.round(tdee * 0.85) : tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: hasEnduranceGoal
        ? "Build cardio endurance progressively"
        : "Add cardio for calorie burn",
      pros: [
        "Burn more calories",
        "Improve heart health",
        "Better endurance",
        "Can be done anywhere",
      ],
      cons: ["Time consuming", "200+ min cardio/week"],
    });

    // ALTERNATIVE 3: MIXED TRAINING
    alternatives.push({
      name: "Mixed Training",
      icon: "fitness-outline",
      iconColor: "#10B981",
      goalType: "general-fitness",
      newWorkoutFrequency: Math.min(currentFrequency + 2, 5),
      newStrengthSessions: 3,
      newCardioMinutes: 120,
      newWorkoutTypes: ["strength", "cardio", "hiit"],
      dailyCalories: isWeightLoss ? Math.round(tdee * 0.9) : tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: "Balanced strength and cardio program",
      pros: [
        "All-round fitness",
        "Variety keeps it interesting",
        "Balanced results",
        "Flexible schedule",
      ],
      cons: ["Jack of all trades", "Slower specific gains"],
    });

    // ALTERNATIVE 4: EXTEND TIMELINE INSTEAD
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);

    alternatives.push({
      name: "Extend Timeline Instead",
      icon: "calendar-outline",
      iconColor: "#3B82F6",
      goalType: isWeightLoss ? "weight-loss" : "weight-gain",
      newTimeline: optimalWeeks,
      newWorkoutFrequency: currentFrequency,
      dailyCalories: isWeightLoss
        ? Math.round(tdee * 0.85)
        : Math.round(tdee * 1.1),
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: "Keep current exercise, extend time for results",
      pros: [
        "No extra workouts needed",
        "Less lifestyle change",
        "Still achievable",
        "Lower commitment",
      ],
      cons: [
        "Takes longer",
        `+${Math.max(0, optimalWeeks - currentTimeline)} extra weeks`,
      ],
    });

    return alternatives;
  };

  const calculateTrainingReductionAlternatives = (
    data: typeof currentData,
    isWeightLoss: boolean,
  ): Alternative[] => {
    const {
      bmr,
      tdee,
      currentWeight,
      targetWeight,
      currentTimeline,
      currentFrequency,
    } = data;
    const alternatives: Alternative[] = [];
    const safeOptimalRate = currentWeight * 0.0075;

    // ALTERNATIVE 1: REDUCE FREQUENCY
    alternatives.push({
      name: "Reduce Frequency",
      icon: "remove-circle-outline",
      iconColor: "#F59E0B",
      goalType: "general-fitness",
      newWorkoutFrequency: Math.max(currentFrequency - 2, 3),
      newStrengthSessions: 3,
      newCardioMinutes: 90,
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: "Fewer sessions, better recovery",
      pros: [
        "Better recovery",
        "Reduce burnout risk",
        "More sustainable",
        "Quality over quantity",
      ],
      cons: ["Slightly slower progress", "Fewer workout days"],
    });

    // ALTERNATIVE 2: REDUCE INTENSITY
    alternatives.push({
      name: "Lower Intensity",
      icon: "speedometer-outline",
      iconColor: "#3B82F6",
      goalType: "general-fitness",
      newWorkoutFrequency: currentFrequency,
      newIntensity: "intermediate",
      newStrengthSessions: Math.ceil(currentFrequency * 0.5),
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: "Same frequency, easier sessions",
      pros: [
        "Keep your routine",
        "Less fatigue",
        "Sustainable long-term",
        "Lower injury risk",
      ],
      cons: ["May feel too easy initially", "Slower strength gains"],
    });

    // ALTERNATIVE 3: ADD REST DAYS
    alternatives.push({
      name: "Add Recovery Days",
      icon: "bed-outline",
      iconColor: "#10B981",
      goalType: "general-fitness",
      newWorkoutFrequency: Math.max(currentFrequency - 1, 4),
      newStrengthSessions: 3,
      newCardioMinutes: 60,
      newMobilitySessions: 2,
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: "Include active recovery and mobility",
      pros: [
        "Better muscle repair",
        "Improved flexibility",
        "Reduce overtraining",
        "Mental break",
      ],
      cons: ["Feels like less work", "2 recovery sessions/week"],
    });

    // ALTERNATIVE 4: PERIODIZATION
    alternatives.push({
      name: "Add Deload Weeks",
      icon: "analytics-outline",
      iconColor: "#8B5CF6",
      goalType: "strength",
      newWorkoutFrequency: currentFrequency,
      newStrengthSessions: Math.ceil(currentFrequency * 0.6),
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: "Periodized training with planned easy weeks",
      pros: [
        "Professional approach",
        "Prevents plateaus",
        "Sustainable progress",
        "Better long-term gains",
      ],
      cons: ["Requires planning", "Deload every 4-6 weeks"],
    });

    return alternatives;
  };

  const calculateGainRateAlternatives = (
    data: typeof currentData,
    hasMuscleGoal: boolean,
    safeOptimalRate: number,
  ): Alternative[] => {
    const {
      bmr,
      tdee,
      currentWeight,
      targetWeight,
      currentTimeline,
      currentFrequency,
    } = data;
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const alternatives: Alternative[] = [];

    // Optimal rate for lean gains
    const leanGainRate = currentWeight * 0.005; // 0.5% for lean muscle gain
    const moderateGainRate = currentWeight * 0.0075; // 0.75% moderate gain

    // ALTERNATIVE 1: LEAN BULK
    const leanWeeks = Math.ceil(weightDiff / leanGainRate);
    alternatives.push({
      name: "Lean Bulk",
      icon: "trending-up",
      iconColor: "#10B981",
      goalType: "muscle-gain",
      newTimeline: leanWeeks,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 6),
      newStrengthSessions: 5,
      dailyCalories: Math.round(tdee + (leanGainRate * 7700) / 7),
      weeklyRate: leanGainRate,
      newProteinTarget: Math.round(currentWeight * 2.4),
      approach: "Slow surplus for maximum muscle, minimal fat",
      pros: [
        "Mostly muscle gain",
        "Stay lean",
        "Better aesthetics",
        "No harsh cut needed after",
      ],
      cons: ["Slower weight gain", `${leanWeeks} weeks timeline`],
    });

    // ALTERNATIVE 2: STRENGTH FOCUS
    alternatives.push({
      name: "Strength Focus",
      icon: "barbell-outline",
      iconColor: "#8B5CF6",
      goalType: "strength",
      newTimeline: Math.ceil(weightDiff / moderateGainRate),
      newWorkoutFrequency: Math.min(currentFrequency, 5),
      newStrengthSessions: 4,
      dailyCalories: Math.round(tdee + (moderateGainRate * 7700) / 7),
      weeklyRate: moderateGainRate,
      newProteinTarget: Math.round(currentWeight * 2.2),
      newIntensity: "advanced",
      approach: "Focus on getting stronger, weight follows",
      pros: [
        "Strength gains priority",
        "Moderate bulk rate",
        "Balanced approach",
        "Performance based",
      ],
      cons: ["Some fat gain expected", "High intensity required"],
    });

    // ALTERNATIVE 3: RECOMP APPROACH
    alternatives.push({
      name: "Body Recomposition",
      icon: "swap-horizontal-outline",
      iconColor: "#3B82F6",
      goalType: "body-recomp",
      newTimeline: currentTimeline,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 5),
      newStrengthSessions: 4,
      newCardioMinutes: 90,
      dailyCalories: tdee, // Maintenance
      weeklyRate: 0,
      newProteinTarget: Math.round(currentWeight * 2.4),
      approach: "Build muscle at maintenance, slow but lean",
      pros: [
        "Stay same weight",
        "Lose fat, gain muscle",
        "No bulk/cut cycles",
        "Sustainable",
      ],
      cons: ["Very slow progress", "Requires patience"],
    });

    // ALTERNATIVE 4: ADJUST TARGET
    const achievableGain = leanGainRate * currentTimeline;
    const newTarget = currentWeight + achievableGain;

    alternatives.push({
      name: "Adjust Target",
      icon: "flag-outline",
      iconColor: "#F59E0B",
      goalType: "weight-gain",
      newTimeline: currentTimeline,
      newTargetWeight: Math.round(newTarget * 10) / 10,
      newWorkoutFrequency: currentFrequency,
      dailyCalories: Math.round(tdee + (leanGainRate * 7700) / 7),
      weeklyRate: leanGainRate,
      newProteinTarget: Math.round(currentWeight * 2.2),
      approach: `Gain ${achievableGain.toFixed(1)}kg quality mass in your timeframe`,
      pros: [
        "Keep your timeline",
        "Realistic target",
        "Quality gains",
        "No rushing",
      ],
      cons: [`${(targetWeight - newTarget).toFixed(1)}kg less than planned`],
    });

    return alternatives;
  };

  const calculateAlternativesForError = (
    errorCode: string,
    data: typeof currentData,
    goals: string[],
  ): Alternative[] => {
    const {
      bmr,
      tdee,
      currentWeight,
      targetWeight,
      currentTimeline,
      currentFrequency,
    } = data;

    // CRITICAL: Validate required data before calculations
    const hasValidData =
      bmr > 0 &&
      tdee > 0 &&
      currentWeight > 0 &&
      targetWeight > 0 &&
      currentTimeline > 0;

    if (!hasValidData) {
      console.warn("[AdjustmentWizard] Invalid data for calculations:", {
        bmr,
        tdee,
        currentWeight,
        targetWeight,
        currentTimeline,
      });
      // Return a fallback alternative with sensible defaults
      return [
        {
          name: "Extend Timeline",
          icon: "calendar-outline",
          iconColor: "#3B82F6",
          goalType: "weight-loss",
          newTimeline: Math.max(currentTimeline * 2, 12),
          dailyCalories: bmr > 0 ? Math.round(bmr * 1.2) : 1500,
          weeklyRate: 0.5,
          newWorkoutFrequency: currentFrequency || 3,
          approach: "Safe, gradual approach to your goal",
          pros: ["Sustainable", "Preserves muscle", "Easier to maintain"],
          cons: ["Takes longer"],
        },
      ];
    }

    const weightDiff = Math.abs(targetWeight - currentWeight);
    const isWeightLoss = currentWeight > targetWeight;
    const isWeightGain = currentWeight < targetWeight;

    // Determine goal context for better messaging
    const hasMuscleGoal =
      goals.includes("muscle-gain") || goals.includes("strength");
    const hasEnduranceGoal =
      goals.includes("endurance") || goals.includes("cardio");
    const hasRecompGoal =
      goals.includes("body-recomp") ||
      (goals.includes("weight-loss") && goals.includes("muscle-gain"));

    // Safe rates
    const safeOptimalRate = currentWeight * 0.0075; // 0.75% BW/week (optimal)
    const safeMaxRate = currentWeight * 0.01; // 1% BW/week (aggressive but safe)

    // Route to appropriate calculator based on error type
    switch (errorCode) {
      case "EXTREMELY_UNREALISTIC":
      case "BELOW_BMR":
      case "BELOW_ABSOLUTE_MINIMUM":
        return calculateWeightRateAlternatives(
          data,
          isWeightLoss,
          isWeightGain,
          hasMuscleGoal,
          safeOptimalRate,
          safeMaxRate,
        );

      case "INSUFFICIENT_EXERCISE":
        return calculateExerciseAlternatives(
          data,
          isWeightLoss,
          hasMuscleGoal,
          hasEnduranceGoal,
          safeOptimalRate,
        );

      case "EXCESSIVE_TRAINING_VOLUME":
        return calculateTrainingReductionAlternatives(data, isWeightLoss);

      case "EXCESSIVE_GAIN_RATE":
        return calculateGainRateAlternatives(
          data,
          hasMuscleGoal,
          safeOptimalRate,
        );

      default:
        // Default to weight-rate alternatives for unknown errors
        return calculateWeightRateAlternatives(
          data,
          isWeightLoss,
          isWeightGain,
          hasMuscleGoal,
          safeOptimalRate,
          safeMaxRate,
        );
    }
  };

  useEffect(() => {
    if (visible && error.code) {
      console.log("[AdjustmentWizard] Visible with error:", {
        errorCode: error.code,
        hasPrecomputedAlternatives: !!(
          error.alternatives && error.alternatives.length > 0
        ),
        precomputedCount: error.alternatives?.length || 0,
        currentData: {
          bmr: currentData.bmr,
          tdee: currentData.tdee,
          currentWeight: currentData.currentWeight,
          targetWeight: currentData.targetWeight,
          currentTimeline: currentData.currentTimeline,
          currentFrequency: currentData.currentFrequency,
        },
      });

      // Check if pre-computed alternatives are COMPLETE (have required fields)
      const hasCompleteAlternatives =
        error.alternatives &&
        error.alternatives.length > 0 &&
        error.alternatives.every(
          (alt: any) =>
            // Must have calories and rate, or be a fully-formed Alternative
            (typeof alt.dailyCalories === "number" && alt.dailyCalories > 0) ||
            (typeof alt.weeklyRate === "number" && alt.weeklyRate > 0) ||
            ("name" in alt && "pros" in alt && "cons" in alt),
        );

      if (hasCompleteAlternatives && error.alternatives) {
        console.log(
          "[AdjustmentWizard] Using complete pre-computed alternatives:",
          error.alternatives.length,
        );
        const transformedAlternatives = error.alternatives!.map((alt: any) => {
          if ("name" in alt && "pros" in alt && "cons" in alt) {
            return alt as Alternative;
          }
          return transformSmartAlternativeToAlternative(
            alt as SmartAlternative,
          );
        });
        console.log("[AdjustmentWizard] Transformed alternatives:", {
          count: transformedAlternatives.length,
          alternatives: transformedAlternatives.map((a: Alternative) => ({
            name: a.name,
            dailyCalories: a.dailyCalories,
            weeklyRate: a.weeklyRate,
            prosCount: a.pros?.length || 0,
            consCount: a.cons?.length || 0,
          })),
        });
        setAlternatives(transformedAlternatives);
      } else {
        // Calculate alternatives based on error code
        console.log(
          "[AdjustmentWizard] Calculating alternatives for error code:",
          error.code,
        );
        const calculatedAlternatives = calculateAlternativesForError(
          error.code,
          currentData,
          primaryGoals,
        );
        console.log("[AdjustmentWizard] Calculated alternatives:", {
          count: calculatedAlternatives.length,
          alternatives: calculatedAlternatives.map((a) => ({
            name: a.name,
            dailyCalories: a.dailyCalories,
            weeklyRate: a.weeklyRate,
          })),
        });
        setAlternatives(calculatedAlternatives);
      }
      setSelectedIndex(null);
    }
  }, [visible, currentData, error, primaryGoals]);

  const handleSelectAlternative = async () => {
    if (selectedIndex !== null && alternatives[selectedIndex]) {
      setIsSaving(true);

      // First notify parent to update state
      onSelectAlternative(alternatives[selectedIndex]);

      // Wait for React to process state updates before saving to database
      if (onSaveToDatabase) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        try {
          await onSaveToDatabase();
          console.log("[AdjustmentWizard] Successfully saved to database");
        } catch (err) {
          console.error("[AdjustmentWizard] Failed to save to database:", err);
        }
      }

      setIsSaving(false);
      onClose();
    }
  };

  return {
    selectedIndex,
    setSelectedIndex,
    alternatives,
    isSaving,
    handleSelectAlternative,
  };
};
