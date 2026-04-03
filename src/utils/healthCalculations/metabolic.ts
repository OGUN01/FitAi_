import { calculateBMI as calculateBMICore } from "./core/bmiCalculation";
import { calculateBMR as calculateBMRCore } from "./core/bmrCalculation";
import {
  calculateTDEE as calculateTDEECore,
  calculateBaseTDEE as calculateBaseTDEECore,
} from "./core/tdeeCalculation";
import {
  BodyFatData,
  ActivityValidationResult,
  IntensityRecommendation,
} from "./shared-types";

export class MetabolicCalculations {
  static calculateBMI(weightKg: number, heightCm: number): number {
    if (weightKg <= 0 || heightCm <= 0) {
      throw new Error(
        `[MetabolicCalculations.calculateBMI] Invalid inputs: weight=${weightKg}kg, height=${heightCm}cm`,
      );
    }
    return calculateBMICore(weightKg, heightCm);
  }

  static calculateBMR(
    weightKg: number,
    heightCm: number,
    age: number,
    gender: string,
  ): number {
    if (weightKg <= 0 || heightCm <= 0) {
      throw new Error(
        `[MetabolicCalculations.calculateBMR] Invalid inputs: weight=${weightKg}kg, height=${heightCm}cm`,
      );
    }
    return calculateBMRCore(weightKg, heightCm, age, gender);
  }

  static calculateTDEE(bmr: number, activityLevel: string): number {
    return calculateTDEECore(bmr, activityLevel as any);
  }

  static calculateBaseTDEE(bmr: number, occupation: string): number {
    return calculateBaseTDEECore(bmr, occupation);
  }

  static estimateSessionCalorieBurn(
    durationMinutes: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    const MET_VALUES: Record<string, Record<string, number>> = {
      beginner: {
        strength: 3.5,
        cardio: 5.0,
        sports: 4.5,
        yoga: 2.5,
        hiit: 6.0,
        pilates: 3.0,
        flexibility: 2.5,
        functional: 4.0,
        mixed: 4.0,
      },
      intermediate: {
        strength: 5.0,
        cardio: 7.0,
        sports: 6.5,
        yoga: 3.5,
        hiit: 8.0,
        pilates: 4.5,
        flexibility: 3.0,
        functional: 6.0,
        mixed: 6.0,
      },
      advanced: {
        strength: 6.5,
        cardio: 9.0,
        sports: 8.5,
        yoga: 4.5,
        hiit: 10.0,
        pilates: 6.0,
        flexibility: 4.0,
        functional: 7.5,
        mixed: 7.5,
      },
    };

    const primaryType = workoutTypes[0]?.toLowerCase() || "mixed";
    const met =
      MET_VALUES[intensity]?.[primaryType] ||
      MET_VALUES[intensity]?.mixed ||
      5.0;

    const hours = durationMinutes / 60;
    const caloriesBurned = met * weight * hours;

    return Math.round(caloriesBurned);
  }

  static calculateWeeklyExerciseBurn(
    frequency: number,
    duration: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    const perSession = this.estimateSessionCalorieBurn(
      duration,
      intensity,
      weight,
      workoutTypes,
    );
    return perSession * frequency;
  }

  static calculateDailyExerciseBurn(
    frequency: number,
    duration: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    const weekly = this.calculateWeeklyExerciseBurn(
      frequency,
      duration,
      intensity,
      weight,
      workoutTypes,
    );
    return Math.round(weekly / 7);
  }

  static getFinalBodyFatPercentage(
    userInput?: number,
    aiEstimated?: number,
    aiConfidence?: number,
    bmi?: number,
    gender?: string,
    age?: number,
  ): BodyFatData {
    if (userInput !== undefined && userInput > 0) {
      return {
        value: userInput,
        source: "user_input",
        confidence: "high",
        showWarning: false,
      };
    }

    if (aiEstimated && aiConfidence && aiConfidence > 70) {
      return {
        value: aiEstimated,
        source: "ai_analysis",
        confidence: "medium",
        showWarning: true,
      };
    }

    if (bmi && gender && age) {
      const estimated = this.estimateBodyFatFromBMI(bmi, gender, age);
      return {
        value: estimated,
        source: "bmi_estimation",
        confidence: "low",
        showWarning: true,
      };
    }

    return {
      value: gender === "male" ? 20 : 28,
      source: "default_estimate",
      confidence: "low",
      showWarning: true,
    };
  }

  static validateActivityForOccupation(
    occupation: string,
    selectedActivity: string,
  ): ActivityValidationResult {
    const OCCUPATION_MIN_ACTIVITY: Record<string, string | null> = {
      desk_job: null,
      light_active: "light",
      moderate_active: "moderate",
      heavy_labor: "active",
      very_active: "extreme",
    };

    const minRequired = OCCUPATION_MIN_ACTIVITY[occupation];
    if (!minRequired) return { isValid: true };

    const activityLevels = [
      "sedentary",
      "light",
      "moderate",
      "active",
      "extreme",
    ];
    const minIndex = activityLevels.indexOf(minRequired);
    const selectedIndex = activityLevels.indexOf(selectedActivity);

    if (selectedIndex < minIndex) {
      return {
        isValid: false,
        minimumRequired: minRequired,
        message: `Your occupation (${occupation.replace("_", " ")}) requires at least "${minRequired}" activity level. Please adjust.`,
      };
    }

    return { isValid: true };
  }

  static calculateRecommendedIntensity(
    workoutExperience: number,
    canDoPushups: number,
    canRunMinutes: number,
    age: number,
    gender: string,
  ): IntensityRecommendation {
    if (workoutExperience >= 3) {
      return {
        recommendedIntensity: "advanced",
        reasoning: "3+ years training experience indicates advanced level",
      };
    }

    if (workoutExperience < 1) {
      return {
        recommendedIntensity: "beginner",
        reasoning:
          "Less than 1 year experience - starting with beginner intensity for safety",
      };
    }

    const pushupThreshold =
      gender === "male" ? (age < 40 ? 25 : 20) : age < 40 ? 15 : 10;

    const runThreshold = 15;

    const meetsStrengthStandard = canDoPushups >= pushupThreshold;
    const meetsCardioStandard = canRunMinutes >= runThreshold;

    if (meetsStrengthStandard && meetsCardioStandard) {
      return {
        recommendedIntensity: "advanced",
        reasoning:
          "Strong fitness test results indicate advanced level capability",
      };
    }

    if (meetsStrengthStandard || meetsCardioStandard) {
      return {
        recommendedIntensity: "intermediate",
        reasoning: "1-3 years experience with solid fitness test results",
      };
    }

    return {
      recommendedIntensity: "beginner",
      reasoning: "Building foundation strength and cardio base recommended",
    };
  }

  static calculatePregnancyCalories(
    tdee: number,
    pregnancyStatus: boolean,
    trimester?: 1 | 2 | 3,
    breastfeedingStatus?: boolean,
  ): number {
    if (breastfeedingStatus) {
      return tdee + 500;
    }

    if (pregnancyStatus && trimester) {
      if (trimester === 1) {
        return tdee;
      } else if (trimester === 2) {
        return tdee + 340;
      } else if (trimester === 3) {
        return tdee + 450;
      }
    }

    return tdee;
  }

  static calculateDietReadinessScore(dietPreferences: any): number {
    let score = 0;

    if (dietPreferences.drinks_enough_water) score += 10;
    if (dietPreferences.limits_sugary_drinks) score += 15;
    if (dietPreferences.eats_regular_meals) score += 25;
    if (dietPreferences.avoids_late_night_eating) score += 10;
    if (dietPreferences.controls_portion_sizes) score += 30;
    if (dietPreferences.reads_nutrition_labels) score += 20;
    if (dietPreferences.eats_5_servings_fruits_veggies) score += 20;
    if (dietPreferences.limits_refined_sugar) score += 15;
    if (dietPreferences.includes_healthy_fats) score += 10;

    if (dietPreferences.eats_processed_foods) score -= 20;
    if (dietPreferences.drinks_alcohol) score -= 10;
    if (dietPreferences.smokes_tobacco) score -= 15;

    const normalized = Math.round(((score + 45) / 200) * 100);
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * @deprecated Use waterCalculator.calculate() from calculators/waterCalculator.ts instead.
   * This legacy formula uses MULTIPLICATIVE climate adjustment which over-inflates results.
   * SSOT: ClimateAdaptiveWaterCalculator uses ADDITIVE climate bonuses.
   * Kept only for master-engine backward compatibility; its output is stripped by useReviewValidation.
   */
  static calculateWaterIntake(
    weightKg: number,
    activityLevel?: string,
    climate?: string,
  ): number {
    const base = weightKg * 35;
    const activityBonuses: Record<string, number> = {
      sedentary: 0,
      light: 500,
      moderate: 1000,
      active: 1500,
      very_active: 2000,
      extreme: 2000, // Alias for very_active (onboarding uses "extreme")
    };
    const climateMultipliers: Record<string, number> = {
      tropical: 1.5,
      temperate: 1.0,
      cold: 0.9,
      arid: 1.7,
    };
    const bonus = activityBonuses[activityLevel ?? 'sedentary'] ?? 1000;
    const multiplier = climateMultipliers[climate ?? 'temperate'] ?? 1.0;
    return Math.round(((base + bonus) * multiplier) / 50) * 50;
  }

  static calculateFiber(dailyCalories: number): number {
    return Math.round((dailyCalories / 1000) * 14);
  }

  static estimateBodyFatFromBMI(
    bmi: number,
    gender: string,
    age: number,
  ): number {
    if (gender === "male") {
      return Math.round(1.2 * bmi + 0.23 * age - 16.2);
    } else if (gender === "female") {
      return Math.round(1.2 * bmi + 0.23 * age - 5.4);
    } else {
      const maleEst = 1.2 * bmi + 0.23 * age - 16.2;
      const femaleEst = 1.2 * bmi + 0.23 * age - 5.4;
      return Math.round((maleEst + femaleEst) / 2);
    }
  }

  static applyAgeModifier(tdee: number, age: number, gender: string): number {
    let modifier = 1.0;

    // Note: Mifflin-St Jeor already accounts for age via -5×age in BMR.
    // Only apply additional modifier for ages ≥40 where metabolic slowdown
    // exceeds what the linear age term captures.
    if (age >= 60) {
      modifier = 0.85;
    } else if (age >= 50) {
      modifier = 0.9;
    } else if (age >= 40) {
      modifier = 0.95;
    }
    // No modifier for age < 40 — the Mifflin formula covers it.

    if (gender === "female" && age >= 45 && age <= 55) {
      modifier = modifier * 0.95;
    }

    return tdee * modifier;
  }

  static applySleepPenalty(timelineWeeks: number, sleepHours: number): number {
    if (sleepHours >= 7) return timelineWeeks;

    const hoursUnder = 7 - sleepHours;
    const penaltyPercent = hoursUnder * 0.2;

    return Math.ceil(timelineWeeks * (1 + penaltyPercent));
  }

  static calculateMetabolicAge(
    bmr: number,
    chronologicalAge: number,
    gender: string,
  ): number {
    const expectedBMR = MetabolicCalculations.getExpectedBMRForAge(
      chronologicalAge,
      gender,
    );

    // BUG-17: Use percentage-based comparison to avoid body-size bias.
    // Absolute cal/year (10) caused large-framed users with high BMR to always
    // hit the floor (18) because their absolute BMR difference is large even when
    // metabolically healthy. Percentage comparison is body-weight-agnostic.
    // Each 10% BMR deviation from the age-group reference = ~5 metabolic years.
    const bmrDifferencePercent = (expectedBMR - bmr) / expectedBMR;
    const metabolicAgeAdjustment = bmrDifferencePercent * 50;

    const metabolicAge = chronologicalAge + metabolicAgeAdjustment;

    return Math.max(18, Math.min(85, Math.round(metabolicAge)));
  }

  private static getExpectedBMRForAge(age: number, gender: string): number {
    const maleReferences = [
      { ageRange: [18, 24], bmr: 1750 },
      { ageRange: [25, 34], bmr: 1700 },
      { ageRange: [35, 44], bmr: 1650 },
      { ageRange: [45, 54], bmr: 1580 },
      { ageRange: [55, 64], bmr: 1500 },
      { ageRange: [65, 120], bmr: 1400 },
    ];

    const femaleReferences = [
      { ageRange: [18, 24], bmr: 1500 },
      { ageRange: [25, 34], bmr: 1450 },
      { ageRange: [35, 44], bmr: 1400 },
      { ageRange: [45, 54], bmr: 1350 },
      { ageRange: [55, 64], bmr: 1300 },
      { ageRange: [65, 120], bmr: 1250 },
    ];

    const references = gender === "male" ? maleReferences : femaleReferences;

    const match = references.find(
      (ref) => age >= ref.ageRange[0] && age <= ref.ageRange[1],
    );
    return match ? match.bmr : gender === "male" ? 1650 : 1300;
  }
}
