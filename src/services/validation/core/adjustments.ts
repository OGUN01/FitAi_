export class ValidationAdjustments {
  static applyMedicalAdjustments(
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

  static applyDeficitLimit(
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

  static calculateRefeedSchedule(
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
}
