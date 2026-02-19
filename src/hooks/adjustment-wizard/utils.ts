import { Ionicons } from "@expo/vector-icons";
import { RiskLevel, SmartAlternative } from "../../services/validationEngine";
import { Alternative } from "./types";

export const getIconForRiskLevel = (
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

export const getIconColorForRiskLevel = (riskLevel: RiskLevel): string => {
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

export const getProsForAlternative = (alt: SmartAlternative): string[] => {
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

  if (pros.length === 0) {
    pros.push("Progress toward goal");
  }

  return pros.slice(0, 4);
};

export const getConsForAlternative = (alt: SmartAlternative): string[] => {
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

export const transformSmartAlternativeToAlternative = (
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
