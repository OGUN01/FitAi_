// 🧮 COMPREHENSIVE HEALTH CALCULATIONS ENGINE
// 50+ Mathematical Formulas for Fitness and Health Metrics

import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../types/onboarding";

// ============================================================================
// BASIC METABOLIC CALCULATIONS
// ============================================================================

export class MetabolicCalculations {
  /**
   * Calculate BMI (Body Mass Index)
   * Formula: weight(kg) / height(m)²
   * VALIDATION: Throws error if weight or height is missing
   */
  static calculateBMI(weightKg: number, heightCm: number): number {
    // CRITICAL VALIDATION: No fallbacks allowed
    if (!weightKg || weightKg === 0) {
      throw new Error(
        "Weight is required for BMI calculation. Please complete your profile.",
      );
    }
    if (!heightCm || heightCm === 0) {
      throw new Error(
        "Height is required for BMI calculation. Please complete your profile.",
      );
    }

    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  /**
   * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
   * Men: 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
   * Women: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
   * VALIDATION: Throws error if any critical parameter is missing
   */
  static calculateBMR(
    weightKg: number,
    heightCm: number,
    age: number,
    gender: string,
  ): number {
    // CRITICAL VALIDATION: No fallbacks allowed
    if (!weightKg || weightKg === 0) {
      throw new Error(
        "Weight is required for BMR calculation. Please complete your profile.",
      );
    }
    if (!heightCm || heightCm === 0) {
      throw new Error(
        "Height is required for BMR calculation. Please complete your profile.",
      );
    }
    if (!age || age === 0) {
      throw new Error(
        "Age is required for BMR calculation. Please complete your profile.",
      );
    }
    if (!gender || gender === "") {
      throw new Error(
        "Gender is required for accurate BMR calculation. Please complete your profile.",
      );
    }

    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

    if (gender === "male") {
      return base + 5;
    } else if (gender === "female") {
      return base - 161;
    } else {
      // For 'other'/'prefer_not_to_say', use average of male/female formulas
      // Male: base + 5, Female: base - 161
      // Average: (base + 5 + base - 161) / 2 = (2*base - 156) / 2 = base - 78
      return base - 78;
    }
  }

  /**
   * Calculate TDEE (Total Daily Energy Expenditure)
   * Formula: BMR × Activity Factor
   * NOTE: This is legacy - new approach uses occupation-based calculation
   */
  static calculateTDEE(bmr: number, activityLevel: string): number {
    const activityFactors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      extreme: 1.9,
    };

    return (
      bmr *
      (activityFactors[activityLevel as keyof typeof activityFactors] || 1.2)
    );
  }

  /**
   * Calculate Base TDEE from Occupation (NEW APPROACH)
   * This represents daily metabolism from occupation NEAT (without exercise)
   */
  static calculateBaseTDEE(bmr: number, occupation: string): number {
    const BASE_OCCUPATION_MULTIPLIERS: Record<string, number> = {
      desk_job: 1.25, // Sitting most of day
      light_active: 1.35, // Standing, light movement throughout day
      moderate_active: 1.45, // Regular movement, on feet often
      heavy_labor: 1.6, // Physical work all day
      very_active: 1.7, // Constant intense physical activity
    };

    const multiplier = BASE_OCCUPATION_MULTIPLIERS[occupation] || 1.25;
    return bmr * multiplier;
  }

  /**
   * Estimate calories burned in a single workout session using MET values
   * Formula: MET × weight(kg) × duration(hours)
   */
  static estimateSessionCalorieBurn(
    durationMinutes: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    // MET values (Metabolic Equivalent of Task) - research-backed
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

    // Determine workout type (use first in array, or 'mixed')
    const primaryType = workoutTypes[0]?.toLowerCase() || "mixed";
    const met =
      MET_VALUES[intensity]?.[primaryType] ||
      MET_VALUES[intensity]?.mixed ||
      5.0;

    // Formula: Calories = MET × weight(kg) × duration(hours)
    const hours = durationMinutes / 60;
    const caloriesBurned = met * weight * hours;

    return Math.round(caloriesBurned);
  }

  /**
   * Calculate total weekly exercise calorie burn
   */
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

  /**
   * Calculate average daily exercise calorie burn
   */
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

  /**
   * Get final body fat percentage using priority logic
   * Priority: User Input > AI Analysis > BMI Estimation > Default
   */
  static getFinalBodyFatPercentage(
    userInput?: number,
    aiEstimated?: number,
    aiConfidence?: number,
    bmi?: number,
    gender?: string,
    age?: number,
  ): {
    value: number;
    source:
      | "user_input"
      | "ai_analysis"
      | "bmi_estimation"
      | "default_estimate";
    confidence: "high" | "medium" | "low";
    showWarning: boolean;
  } {
    // Priority 1: User manual input (most reliable)
    if (userInput !== undefined && userInput > 0) {
      return {
        value: userInput,
        source: "user_input",
        confidence: "high",
        showWarning: false,
      };
    }

    // Priority 2: AI estimation (if confidence > 70%)
    if (aiEstimated && aiConfidence && aiConfidence > 70) {
      return {
        value: aiEstimated,
        source: "ai_analysis",
        confidence: "medium",
        showWarning: true,
      };
    }

    // Priority 3: BMI estimation (rough approximation)
    if (bmi && gender && age) {
      const estimated = this.estimateBodyFatFromBMI(bmi, gender, age);
      return {
        value: estimated,
        source: "bmi_estimation",
        confidence: "low",
        showWarning: true,
      };
    }

    // Fallback: Use conservative middle value
    return {
      value: gender === "male" ? 20 : 28,
      source: "default_estimate",
      confidence: "low",
      showWarning: true,
    };
  }

  /**
   * Validate that selected activity level matches occupation requirements
   * Prevents users from selecting activity levels below their occupation's minimum
   */
  static validateActivityForOccupation(
    occupation: string,
    selectedActivity: string,
  ): { isValid: boolean; minimumRequired?: string; message?: string } {
    const OCCUPATION_MIN_ACTIVITY: Record<string, string | null> = {
      desk_job: null, // No restriction
      light_active: "light", // Must be at least "light"
      moderate_active: "moderate", // Must be at least "moderate"
      heavy_labor: "active", // Must be at least "active"
      very_active: "extreme", // Must be "extreme"
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

  /**
   * Calculate recommended intensity based on experience and fitness tests
   * Returns recommendation + reasoning (user can override)
   */
  static calculateRecommendedIntensity(
    workoutExperience: number,
    canDoPushups: number,
    canRunMinutes: number,
    age: number,
    gender: string,
  ): {
    recommendedIntensity: "beginner" | "intermediate" | "advanced";
    reasoning: string;
  } {
    // Primary factor: Experience (most reliable)
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

    // For 1-3 years experience, use fitness assessment
    const pushupThreshold =
      gender === "male" ? (age < 40 ? 25 : 20) : age < 40 ? 15 : 10;

    const runThreshold = 15; // 15 minutes continuous run

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

  /**
   * Calculate additional calories needed for pregnancy/breastfeeding
   * Evidence-based adjustments for maternal health and fetal development
   */
  static calculatePregnancyCalories(
    tdee: number,
    pregnancyStatus: boolean,
    trimester?: 1 | 2 | 3,
    breastfeedingStatus?: boolean,
  ): number {
    // Breastfeeding takes priority (can't be pregnant and breastfeeding simultaneously)
    if (breastfeedingStatus) {
      return tdee + 500; // +500 cal for milk production
    }

    if (pregnancyStatus && trimester) {
      if (trimester === 1) {
        return tdee; // No additional calories needed first trimester
      } else if (trimester === 2) {
        return tdee + 340; // +340 cal second trimester (rapid fetal growth)
      } else if (trimester === 3) {
        return tdee + 450; // +450 cal third trimester (maximum growth)
      }
    }

    return tdee;
  }

  /**
   * Calculate diet readiness score from 14 health habits
   * Returns 0-100 score predicting adherence likelihood
   */
  static calculateDietReadinessScore(dietPreferences: any): number {
    let score = 0;

    // Positive habits (add points)
    if (dietPreferences.drinks_enough_water) score += 10;
    if (dietPreferences.limits_sugary_drinks) score += 15;
    if (dietPreferences.eats_regular_meals) score += 25; // Most predictive
    if (dietPreferences.avoids_late_night_eating) score += 10;
    if (dietPreferences.controls_portion_sizes) score += 30; // Highly predictive
    if (dietPreferences.reads_nutrition_labels) score += 20;
    if (dietPreferences.eats_5_servings_fruits_veggies) score += 20;
    if (dietPreferences.limits_refined_sugar) score += 15;
    if (dietPreferences.includes_healthy_fats) score += 10;

    // Negative habits (subtract points)
    if (dietPreferences.eats_processed_foods) score -= 20;
    if (dietPreferences.drinks_alcohol) score -= 10;
    if (dietPreferences.smokes_tobacco) score -= 15;

    // Normalize to 0-100 scale
    // Max: 155, Min: -45, Range: 200
    const normalized = Math.round(((score + 45) / 200) * 100);
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * Calculate daily water intake recommendation
   * Formula: 35ml per kg body weight
   */
  static calculateWaterIntake(weightKg: number): number {
    return Math.round(weightKg * 35); // Returns ml
  }

  /**
   * Calculate daily fiber recommendation
   * Formula: 14g per 1000 calories
   */
  static calculateFiber(dailyCalories: number): number {
    return Math.round((dailyCalories / 1000) * 14);
  }

  /**
   * Estimate body fat percentage from BMI using Deurenberg formula
   */
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
      // For 'other', use average
      const maleEst = 1.2 * bmi + 0.23 * age - 16.2;
      const femaleEst = 1.2 * bmi + 0.23 * age - 5.4;
      return Math.round((maleEst + femaleEst) / 2);
    }
  }

  /**
   * Apply age-based metabolic adjustments to TDEE
   * Metabolism declines with age - progressive adjustments
   */
  static applyAgeModifier(tdee: number, age: number, gender: string): number {
    let modifier = 1.0;

    if (age >= 60) {
      modifier = 0.85; // -15% metabolism
    } else if (age >= 50) {
      modifier = 0.9; // -10% metabolism
    } else if (age >= 40) {
      modifier = 0.95; // -5% metabolism
    } else if (age >= 30) {
      modifier = 0.98; // -2% metabolism
    }

    // Additional adjustment for women in menopause age range
    if (gender === "female" && age >= 45 && age <= 55) {
      modifier = modifier * 0.95; // Additional -5% for potential menopause
    }

    return tdee * modifier;
  }

  /**
   * Apply sleep penalty to timeline
   * 20% timeline extension per hour of sleep under 7
   */
  static applySleepPenalty(timelineWeeks: number, sleepHours: number): number {
    if (sleepHours >= 7) return timelineWeeks; // No penalty

    // 20% penalty for each hour under 7
    const hoursUnder = 7 - sleepHours;
    const penaltyPercent = hoursUnder * 0.2;

    return Math.ceil(timelineWeeks * (1 + penaltyPercent));
  }

  /**
   * Calculate Metabolic Age
   * Compares actual BMR to expected BMR for age/gender
   * Uses improved age-based reference curves
   */
  static calculateMetabolicAge(
    bmr: number,
    chronologicalAge: number,
    gender: string,
  ): number {
    // Get expected BMR for chronological age
    // BMR declines non-linearly with age (faster decline in younger years)
    const expectedBMR = MetabolicCalculations.getExpectedBMRForAge(
      chronologicalAge,
      gender,
    );

    // Calculate BMR difference
    const bmrDifference = expectedBMR - bmr;

    // Convert BMR difference to age equivalent (approximately 8-10 cal/year decline)
    // Higher BMR than expected = younger metabolic age
    // Lower BMR than expected = older metabolic age
    const calPerYear = gender === "male" ? 10 : 8;
    const metabolicAgeAdjustment = bmrDifference / calPerYear;

    const metabolicAge = chronologicalAge + metabolicAgeAdjustment;

    // Cap between realistic bounds
    return Math.max(18, Math.min(85, Math.round(metabolicAge)));
  }

  /**
   * Get expected BMR for a given age and gender
   * Uses age-adjusted reference values based on population norms
   */
  private static getExpectedBMRForAge(age: number, gender: string): number {
    // Reference BMR values by age ranges (average for 70kg male, 60kg female)
    const maleReferences = [
      { ageRange: [18, 24], bmr: 1750 },
      { ageRange: [25, 34], bmr: 1700 },
      { ageRange: [35, 44], bmr: 1650 },
      { ageRange: [45, 54], bmr: 1580 },
      { ageRange: [55, 64], bmr: 1500 },
      { ageRange: [65, 120], bmr: 1400 },
    ];

    const femaleReferences = [
      { ageRange: [18, 24], bmr: 1400 },
      { ageRange: [25, 34], bmr: 1350 },
      { ageRange: [35, 44], bmr: 1300 },
      { ageRange: [45, 54], bmr: 1250 },
      { ageRange: [55, 64], bmr: 1200 },
      { ageRange: [65, 120], bmr: 1150 },
    ];

    const references = gender === "male" ? maleReferences : femaleReferences;

    // Find matching age range
    const match = references.find(
      (ref) => age >= ref.ageRange[0] && age <= ref.ageRange[1],
    );
    return match ? match.bmr : gender === "male" ? 1650 : 1300; // Default mid-range value
  }
}

// ============================================================================
// NUTRITIONAL CALCULATIONS
// ============================================================================

export class NutritionalCalculations {
  /**
   * Calculate daily calorie needs for weight goal
   * Formula: TDEE ± calorie deficit/surplus
   */
  static calculateDailyCaloriesForGoal(
    tdee: number,
    weeklyWeightChangeKg: number,
    isWeightLoss: boolean = true,
  ): number {
    // 1 kg fat ≈ 7700 calories
    const weeklyCalorieChange = weeklyWeightChangeKg * 7700;
    const dailyCalorieChange = weeklyCalorieChange / 7;

    return isWeightLoss ? tdee - dailyCalorieChange : tdee + dailyCalorieChange;
  }

  /**
   * Calculate macronutrient distribution based on goals and diet type
   */
  static calculateMacronutrients(
    dailyCalories: number,
    primaryGoals: string[],
    dietReadiness: any,
  ): { protein: number; carbs: number; fat: number } {
    let proteinPercent = 0.25; // Default 25%
    let carbPercent = 0.45; // Default 45%
    let fatPercent = 0.3; // Default 30%

    // Adjust based on diet readiness
    if (dietReadiness.keto_ready) {
      proteinPercent = 0.25;
      carbPercent = 0.05;
      fatPercent = 0.7;
    } else if (dietReadiness.high_protein_ready) {
      proteinPercent = 0.35;
      carbPercent = 0.35;
      fatPercent = 0.3;
    } else if (dietReadiness.low_carb_ready) {
      proteinPercent = 0.3;
      carbPercent = 0.25;
      fatPercent = 0.45;
    }

    // Adjust based on goals
    if (primaryGoals.includes("muscle_gain")) {
      proteinPercent = Math.max(proteinPercent, 0.3);
    }

    return {
      protein: Math.round((dailyCalories * proteinPercent) / 4), // 4 cal/g
      carbs: Math.round((dailyCalories * carbPercent) / 4), // 4 cal/g
      fat: Math.round((dailyCalories * fatPercent) / 9), // 9 cal/g
    };
  }

  // Removed: calculateDailyWaterNeeds - replaced by calculateWaterIntake (line 206, matches spec)
  // Removed: calculateDailyFiberNeeds - replaced by calculateFiber (line 214, cleaner name)
}

// ============================================================================
// BODY COMPOSITION CALCULATIONS
// ============================================================================

export class BodyCompositionCalculations {
  /**
   * Calculate ideal weight range using gender-specific formulas
   * Uses a combination of BMI and gender-based formulas (Devine, Robinson)
   * @param heightCm - Height in centimeters
   * @param gender - Gender ('male', 'female', 'other', 'prefer_not_to_say')
   * @param age - Age in years (optional, for age-based adjustments)
   */
  static calculateIdealWeightRange(
    heightCm: number,
    gender: string,
    age?: number,
  ): { min: number; max: number } {
    const heightM = heightCm / 100;

    // For 'other' or 'prefer_not_to_say', use BMI-based calculation
    if (gender === "other" || gender === "prefer_not_to_say") {
      return {
        min: Math.round(18.5 * heightM * heightM * 100) / 100,
        max: Math.round(24.9 * heightM * heightM * 100) / 100,
      };
    }

    // Convert height to inches for Devine/Robinson formulas
    const heightInches = heightCm / 2.54;
    const heightOver5Feet = Math.max(0, heightInches - 60); // Inches over 5 feet (60 inches)

    let idealWeight: number;

    if (gender === "male") {
      // Devine Formula for men: 50 kg + 2.3 kg per inch over 5 feet
      idealWeight = 50 + 2.3 * heightOver5Feet;
    } else {
      // Devine Formula for women: 45.5 kg + 2.3 kg per inch over 5 feet
      idealWeight = 45.5 + 2.3 * heightOver5Feet;
    }

    // Create a range: ±10% from ideal weight (clinically accepted range)
    const minWeight = idealWeight * 0.9;
    const maxWeight = idealWeight * 1.1;

    return {
      min: Math.round(minWeight * 100) / 100,
      max: Math.round(maxWeight * 100) / 100,
    };
  }

  /**
   * Calculate healthy weight loss rate based on weight and gender
   * Research shows men can lose weight faster while preserving lean muscle mass
   * Women should aim for slightly lower rates to maintain muscle mass
   * Formula: 0.5-1% of body weight per week, adjusted by gender
   *
   * @param currentWeight - Current weight in kg
   * @param gender - Gender ('male', 'female', 'other', 'prefer_not_to_say')
   * @returns Weekly weight loss rate in kg
   */
  static calculateHealthyWeightLossRate(
    currentWeight: number,
    gender?: string,
  ): number {
    // Calculate as percentage of body weight (0.5-1% per week is safe)
    let baseRate: number;

    if (currentWeight > 100) {
      baseRate = currentWeight * 0.01; // 1% for heavier individuals
    } else if (currentWeight > 80) {
      baseRate = currentWeight * 0.008; // 0.8% for moderate weight
    } else {
      baseRate = currentWeight * 0.006; // 0.6% for lighter individuals
    }

    // Gender-specific adjustments based on research
    // Women lose more lean muscle mass, so slightly lower rate is healthier
    if (gender === "female") {
      baseRate = baseRate * 0.85; // 15% lower for women to preserve muscle
    } else if (gender === "male") {
      baseRate = baseRate * 1.0; // Full rate for men
    } else {
      baseRate = baseRate * 0.925; // Middle ground for other/prefer_not_to_say
    }

    // Cap at safe limits (0.3-1.2 kg per week)
    return Math.max(0.3, Math.min(1.2, baseRate));
  }

  /**
   * Calculate body fat percentage ranges (healthy ranges by age/gender)
   */
  static getHealthyBodyFatRange(
    age: number,
    gender: string,
  ): { min: number; max: number } {
    const ranges = {
      male: {
        "18-24": { min: 6, max: 17 },
        "25-34": { min: 7, max: 18 },
        "35-44": { min: 12, max: 21 },
        "45-54": { min: 14, max: 23 },
        "55+": { min: 16, max: 25 },
      },
      female: {
        "18-24": { min: 16, max: 24 },
        "25-34": { min: 16, max: 25 },
        "35-44": { min: 17, max: 28 },
        "45-54": { min: 18, max: 30 },
        "55+": { min: 18, max: 31 },
      },
    };

    const ageGroup =
      age < 25
        ? "18-24"
        : age < 35
          ? "25-34"
          : age < 45
            ? "35-44"
            : age < 55
              ? "45-54"
              : "55+";
    return (
      ranges[gender as keyof typeof ranges]?.[
        ageGroup as keyof typeof ranges.male
      ] || ranges.male["25-34"]
    );
  }

  /**
   * Calculate lean body mass and fat mass
   */
  static calculateBodyComposition(
    weightKg: number,
    bodyFatPercentage: number,
  ): {
    leanMass: number;
    fatMass: number;
  } {
    const fatMass = (weightKg * bodyFatPercentage) / 100;
    const leanMass = weightKg - fatMass;

    return {
      leanMass: Math.round(leanMass * 100) / 100,
      fatMass: Math.round(fatMass * 100) / 100,
    };
  }

  /**
   * Calculate waist-to-hip ratio
   */
  static calculateWaistHipRatio(waistCm: number, hipCm: number): number {
    return Math.round((waistCm / hipCm) * 100) / 100;
  }
}

// ============================================================================
// CARDIOVASCULAR FITNESS CALCULATIONS
// ============================================================================

export class CardiovascularCalculations {
  /**
   * Calculate maximum heart rate
   * Formula: 220 - age
   */
  static calculateMaxHeartRate(age: number): number {
    return 220 - age;
  }

  /**
   * Calculate heart rate training zones
   */
  static calculateHeartRateZones(maxHeartRate: number): {
    fatBurn: { min: number; max: number };
    cardio: { min: number; max: number };
    peak: { min: number; max: number };
  } {
    return {
      fatBurn: {
        min: Math.round(maxHeartRate * 0.6),
        max: Math.round(maxHeartRate * 0.7),
      },
      cardio: {
        min: Math.round(maxHeartRate * 0.7),
        max: Math.round(maxHeartRate * 0.85),
      },
      peak: {
        min: Math.round(maxHeartRate * 0.85),
        max: Math.round(maxHeartRate * 0.95),
      },
    };
  }

  /**
   * Estimate VO2 Max based on fitness assessment
   * Simplified estimation based on running ability and age
   * Peak VO2 Max typically occurs around age 20-25, then declines
   */
  static estimateVO2Max(
    canRunMinutes: number,
    age: number,
    gender: string,
  ): number {
    // Base VO2 Max by gender (peak values at age 20)
    // Male peak: ~50 ml/kg/min, Female peak: ~40 ml/kg/min
    const peakVO2 = gender === "male" ? 50 : 40;

    // Age-related decline (0.5 ml/kg/min per year for males, 0.4 for females after age 20)
    // For ages under 20, assume they're at or near peak
    const ageAdjustment =
      age >= 20 ? (age - 20) * (gender === "male" ? 0.5 : 0.4) : 0; // No penalty for ages under 20

    const baseVO2 = peakVO2 - ageAdjustment;

    // Adjust based on running ability (0.3 points per minute of running)
    const runningBonus = canRunMinutes * 0.3;

    // Cap between realistic bounds (20-80 ml/kg/min)
    return Math.max(20, Math.min(80, baseVO2 + runningBonus));
  }
}

// ============================================================================
// FITNESS RECOMMENDATIONS
// ============================================================================

export class FitnessRecommendations {
  /**
   * Calculate recommended workout frequency based on goals and experience
   */
  static calculateWorkoutFrequency(
    primaryGoals: string[],
    experienceYears: number,
    currentFrequency: number,
  ): number {
    let recommendedFrequency = 3; // Default 3x per week

    // Adjust based on goals
    if (primaryGoals.includes("weight_loss"))
      recommendedFrequency = Math.max(recommendedFrequency, 4);
    if (primaryGoals.includes("muscle_gain"))
      recommendedFrequency = Math.max(recommendedFrequency, 4);
    if (primaryGoals.includes("endurance"))
      recommendedFrequency = Math.max(recommendedFrequency, 5);

    // Adjust based on experience
    if (experienceYears === 0)
      recommendedFrequency = Math.min(recommendedFrequency, 3);
    if (experienceYears > 2)
      recommendedFrequency = Math.min(recommendedFrequency + 1, 6);

    // Don't recommend more than 50% increase from current
    if (currentFrequency > 0) {
      const maxIncrease = Math.ceil(currentFrequency * 1.5);
      recommendedFrequency = Math.min(recommendedFrequency, maxIncrease);
    }

    return recommendedFrequency;
  }

  /**
   * Calculate recommended cardio minutes per week
   */
  static calculateCardioMinutes(
    primaryGoals: string[],
    intensity: string,
  ): number {
    let baseMinutes = 150; // WHO recommendation

    if (primaryGoals.includes("weight_loss")) baseMinutes = 250;
    if (primaryGoals.includes("endurance")) baseMinutes = 300;
    if (intensity === "advanced") baseMinutes = Math.min(baseMinutes + 50, 400);

    return baseMinutes;
  }

  /**
   * Calculate recommended strength training sessions
   */
  static calculateStrengthSessions(
    primaryGoals: string[],
    experienceYears: number,
  ): number {
    let sessions = 2; // Minimum recommendation

    if (primaryGoals.includes("muscle_gain")) sessions = 4;
    if (primaryGoals.includes("strength")) sessions = 3;
    if (experienceYears > 2) sessions = Math.min(sessions + 1, 5);

    return sessions;
  }
}

// ============================================================================
// HEALTH SCORING SYSTEM
// ============================================================================

export class HealthScoring {
  /**
   * Calculate overall health score (0-100)
   */
  static calculateOverallHealthScore(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): number {
    let score = 100;

    // BMI penalty/bonus
    if (bodyAnalysis.bmi) {
      if (bodyAnalysis.bmi < 18.5 || bodyAnalysis.bmi > 25) score -= 10;
      if (bodyAnalysis.bmi > 30) score -= 20;
      if (bodyAnalysis.bmi >= 18.5 && bodyAnalysis.bmi <= 24.9) score += 5;
    }

    // Activity level bonus/penalty
    const activityBonus = {
      sedentary: -15,
      light: -5,
      moderate: 5,
      active: 10,
      extreme: 15,
    };
    score +=
      activityBonus[
        workoutPreferences.activity_level as keyof typeof activityBonus
      ] || 0;

    // Diet habits
    if (dietPreferences.drinks_enough_water) score += 5;
    if (dietPreferences.eats_5_servings_fruits_veggies) score += 10;
    if (dietPreferences.limits_refined_sugar) score += 5;
    if (dietPreferences.eats_processed_foods) score -= 10;
    if (dietPreferences.smokes_tobacco) score -= 25;
    if (dietPreferences.drinks_alcohol) score -= 5;

    // Sleep quality
    if (personalInfo.wake_time && personalInfo.sleep_time) {
      const sleepHours = this.calculateSleepDuration(
        personalInfo.wake_time,
        personalInfo.sleep_time,
      );
      if (sleepHours >= 7 && sleepHours <= 9) score += 10;
      if (sleepHours < 6) score -= 15;
    }

    // Workout experience bonus
    if (workoutPreferences.workout_experience_years > 0) score += 5;
    if (workoutPreferences.workout_frequency_per_week >= 3) score += 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Removed: OLD calculateDietReadinessScore - replaced by NEW version (line 177)
  // NEW version matches VALIDATION_SYSTEM_COMPLETE.md spec exactly with correct weights

  /**
   * Calculate fitness readiness score (0-100)
   */
  static calculateFitnessReadinessScore(
    workoutPreferences: WorkoutPreferencesData,
    bodyAnalysis: BodyAnalysisData,
  ): number {
    let score = 50; // Base score

    // Experience bonus
    score += Math.min(workoutPreferences.workout_experience_years * 3, 15);

    // Current fitness level
    score += Math.min(workoutPreferences.can_do_pushups * 0.5, 15);
    score += Math.min(workoutPreferences.can_run_minutes * 0.3, 15);

    // Activity level
    const activityBonus = {
      sedentary: -10,
      light: 0,
      moderate: 10,
      active: 15,
      extreme: 20,
    };
    score +=
      activityBonus[
        workoutPreferences.activity_level as keyof typeof activityBonus
      ] || 0;

    // Medical conditions penalty
    if (
      bodyAnalysis.medical_conditions &&
      bodyAnalysis.medical_conditions.length > 0
    ) {
      score -= bodyAnalysis.medical_conditions.length * 5;
    }

    // Physical limitations penalty
    if (
      bodyAnalysis.physical_limitations &&
      bodyAnalysis.physical_limitations.length > 0
    ) {
      score -= bodyAnalysis.physical_limitations.length * 3;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate goal realistic score (0-100)
   */
  static calculateGoalRealisticScore(
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): number {
    let score = 80; // Start optimistic

    // Check weight loss rate
    if (
      bodyAnalysis.current_weight_kg &&
      bodyAnalysis.target_weight_kg &&
      bodyAnalysis.target_timeline_weeks
    ) {
      const weeklyRate =
        Math.abs(
          bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg,
        ) / bodyAnalysis.target_timeline_weeks;

      if (weeklyRate > 1.5)
        score -= 30; // Very aggressive
      else if (weeklyRate > 1)
        score -= 15; // Slightly aggressive
      else if (weeklyRate >= 0.5)
        score += 10; // Perfect range
      else if (weeklyRate < 0.25) score -= 10; // Too slow
    }

    // Experience vs goals alignment
    const hasAmbitiousGoals =
      workoutPreferences.primary_goals.includes("muscle_gain") ||
      workoutPreferences.primary_goals.includes("strength");
    const isExperienced = workoutPreferences.workout_experience_years > 1;

    if (hasAmbitiousGoals && !isExperienced) score -= 15;
    if (!hasAmbitiousGoals && isExperienced) score += 5;

    // Medical conditions impact
    if (
      bodyAnalysis.medical_conditions &&
      bodyAnalysis.medical_conditions.length > 2
    ) {
      score -= 20;
    }

    return Math.max(20, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate sleep duration from wake and sleep times
   */
  private static calculateSleepDuration(
    wakeTime: string,
    sleepTime: string,
  ): number {
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;

    return duration / 60;
  }
}

// ============================================================================
// SLEEP ANALYSIS
// ============================================================================

export class SleepAnalysis {
  /**
   * Calculate recommended sleep hours by age
   */
  static getRecommendedSleepHours(age: number): number {
    if (age < 18) return 8.5;
    if (age < 26) return 8.0;
    if (age < 65) return 7.5;
    return 7.0;
  }

  /**
   * Calculate current sleep duration
   */
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;

    return Math.round((duration / 60) * 10) / 10;
  }

  /**
   * Calculate sleep efficiency score
   */
  static calculateSleepEfficiencyScore(
    currentSleep: number,
    recommendedSleep: number,
    healthHabits: any,
  ): number {
    let score = 50;

    // Sleep duration score
    const sleepDifference = Math.abs(currentSleep - recommendedSleep);
    if (sleepDifference <= 0.5) score += 30;
    else if (sleepDifference <= 1) score += 20;
    else if (sleepDifference <= 2) score += 10;
    else score -= 10;

    // Sleep quality factors
    if (healthHabits.avoids_late_night_eating) score += 10;
    if (!healthHabits.drinks_coffee) score += 5; // No late caffeine
    if (!healthHabits.drinks_alcohol) score += 10;
    if (healthHabits.eats_regular_meals) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// ============================================================================
// MASTER CALCULATION ENGINE
// ============================================================================

export class HealthCalculationEngine {
  /**
   * Calculate all health metrics for advanced review
   */
  static calculateAllMetrics(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): AdvancedReviewData {
    // Basic metabolic calculations
    const bmi = MetabolicCalculations.calculateBMI(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
    );
    const bmr = MetabolicCalculations.calculateBMR(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
      personalInfo.age,
      personalInfo.gender,
    );
    const tdee = MetabolicCalculations.calculateTDEE(
      bmr,
      workoutPreferences.activity_level,
    );
    const metabolicAge = MetabolicCalculations.calculateMetabolicAge(
      bmr,
      personalInfo.age,
      personalInfo.gender,
    );

    // Weight management
    const idealWeightRange =
      BodyCompositionCalculations.calculateIdealWeightRange(
        bodyAnalysis.height_cm,
        personalInfo.gender,
        personalInfo.age,
      );
    const weeklyWeightLossRate =
      BodyCompositionCalculations.calculateHealthyWeightLossRate(
        bodyAnalysis.current_weight_kg,
        personalInfo.gender,
      );
    const isWeightLoss =
      bodyAnalysis.current_weight_kg > bodyAnalysis.target_weight_kg;
    const dailyCalories = NutritionalCalculations.calculateDailyCaloriesForGoal(
      tdee,
      workoutPreferences.weekly_weight_loss_goal || weeklyWeightLossRate,
      isWeightLoss,
    );

    // Nutritional needs
    const macros = NutritionalCalculations.calculateMacronutrients(
      dailyCalories,
      workoutPreferences.primary_goals,
      dietPreferences,
    );
    const dailyWater = MetabolicCalculations.calculateWaterIntake(
      bodyAnalysis.current_weight_kg,
    );
    const dailyFiber = MetabolicCalculations.calculateFiber(dailyCalories);

    // Body composition
    const bodyFatRange = BodyCompositionCalculations.getHealthyBodyFatRange(
      personalInfo.age,
      personalInfo.gender,
    );
    const bodyComposition = bodyAnalysis.body_fat_percentage
      ? BodyCompositionCalculations.calculateBodyComposition(
          bodyAnalysis.current_weight_kg,
          bodyAnalysis.body_fat_percentage,
        )
      : { leanMass: 0, fatMass: 0 };

    // Cardiovascular metrics
    const maxHeartRate = CardiovascularCalculations.calculateMaxHeartRate(
      personalInfo.age,
    );
    const heartRateZones =
      CardiovascularCalculations.calculateHeartRateZones(maxHeartRate);
    const estimatedVO2Max = CardiovascularCalculations.estimateVO2Max(
      workoutPreferences.can_run_minutes,
      personalInfo.age,
      personalInfo.gender,
    );

    // Fitness recommendations
    const recommendedWorkoutFrequency =
      FitnessRecommendations.calculateWorkoutFrequency(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
        workoutPreferences.workout_frequency_per_week,
      );
    const recommendedCardioMinutes =
      FitnessRecommendations.calculateCardioMinutes(
        workoutPreferences.primary_goals,
        workoutPreferences.intensity,
      );
    const recommendedStrengthSessions =
      FitnessRecommendations.calculateStrengthSessions(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
      );

    // Health scores
    const overallHealthScore = HealthScoring.calculateOverallHealthScore(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
    );
    const dietReadinessScore =
      MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
    const fitnessReadinessScore = HealthScoring.calculateFitnessReadinessScore(
      workoutPreferences,
      bodyAnalysis,
    );
    const goalRealisticScore = HealthScoring.calculateGoalRealisticScore(
      bodyAnalysis,
      workoutPreferences,
    );

    // Sleep analysis
    const recommendedSleepHours = SleepAnalysis.getRecommendedSleepHours(
      personalInfo.age,
    );
    const currentSleepDuration = SleepAnalysis.calculateSleepDuration(
      personalInfo.wake_time,
      personalInfo.sleep_time,
    );
    const sleepEfficiencyScore = SleepAnalysis.calculateSleepEfficiencyScore(
      currentSleepDuration,
      recommendedSleepHours,
      dietPreferences,
    );

    // Timeline calculations
    const estimatedTimelineWeeks = bodyAnalysis.target_timeline_weeks;
    const totalCalorieDeficit = Math.round(weeklyWeightLossRate * 7700); // Weekly deficit

    return {
      // Basic metabolic calculations
      calculated_bmi: Math.round(bmi * 100) / 100,
      calculated_bmr: Math.round(bmr),
      calculated_tdee: Math.round(tdee),
      metabolic_age: Math.round(metabolicAge),

      // Daily nutritional needs
      daily_calories: Math.round(dailyCalories),
      daily_protein_g: macros.protein,
      daily_carbs_g: macros.carbs,
      daily_fat_g: macros.fat,
      daily_water_ml: Math.round(dailyWater),
      daily_fiber_g: dailyFiber,

      // Weight management
      healthy_weight_min: idealWeightRange.min,
      healthy_weight_max: idealWeightRange.max,
      weekly_weight_loss_rate: weeklyWeightLossRate,
      estimated_timeline_weeks: estimatedTimelineWeeks,
      total_calorie_deficit: totalCalorieDeficit,

      // Body composition
      ideal_body_fat_min: bodyFatRange.min,
      ideal_body_fat_max: bodyFatRange.max,
      lean_body_mass: bodyComposition.leanMass,
      fat_mass: bodyComposition.fatMass,

      // Fitness metrics
      estimated_vo2_max: Math.round(estimatedVO2Max * 10) / 10,
      target_hr_fat_burn_min: heartRateZones.fatBurn.min,
      target_hr_fat_burn_max: heartRateZones.fatBurn.max,
      target_hr_cardio_min: heartRateZones.cardio.min,
      target_hr_cardio_max: heartRateZones.cardio.max,
      target_hr_peak_min: heartRateZones.peak.min,
      target_hr_peak_max: heartRateZones.peak.max,
      recommended_workout_frequency: recommendedWorkoutFrequency,
      recommended_cardio_minutes: recommendedCardioMinutes,
      recommended_strength_sessions: recommendedStrengthSessions,

      // Health scores
      overall_health_score: overallHealthScore,
      diet_readiness_score: dietReadinessScore,
      fitness_readiness_score: fitnessReadinessScore,
      goal_realistic_score: goalRealisticScore,

      // Sleep analysis
      recommended_sleep_hours: recommendedSleepHours,
      current_sleep_duration: currentSleepDuration,
      sleep_efficiency_score: sleepEfficiencyScore,

      // Completion metrics (will be calculated by validation)
      data_completeness_percentage: 0,
      reliability_score: 0,
      personalization_level: 0,
    };
  }
}

// Export all calculation classes
// Note: All classes are already exported with their class declarations above
// No need for duplicate export statements

// ============================================================================
// RE-EXPORTS FROM UNIVERSAL HEALTH CALCULATION SYSTEM
// ============================================================================
// Re-export key functions from the modular health calculations system
// This ensures backward compatibility when importing from 'utils/healthCalculations'

export {
  // Auto-detection functions
  detectClimate,
  detectEthnicity,
  detectBestBMRFormula,

  // Calculators
  waterCalculator,
  tdeeCalculator,
  macroCalculator,

  // Calculator classes
  ClimateAdaptiveWaterCalculator,
  ClimateAdaptiveTDEECalculator,

  // Types
  type ActivityLevel,
  type ClimateType,
  type ClimateDetectionResult,
} from "./healthCalculations/index";
