/**
 * TDEE Calculation - Single Source of Truth
 *
 * Consolidates 3+ duplicate TDEE implementations into one service
 *
 * TDEE = Total Daily Energy Expenditure
 * Formula: BMR × Activity Multiplier × Climate Multiplier
 *
 * Replaced implementations from:
 * - src/utils/healthCalculations.ts (MetabolicCalculations.calculateTDEE, calculateBaseTDEE)
 * - src/utils/healthCalculations/calculators/tdeeCalculator.ts
 * - src/utils/healthCalculations/calculatorFactory.ts
 */

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active"
  | "extreme";
export type ClimateType = "temperate" | "tropical" | "cold" | "arid";

/**
 * Activity Multipliers - WHO/FAO Validated
 * Research-backed multipliers for different activity levels
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // Desk job, minimal exercise (little to no exercise)
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise 3-5 days/week
  active: 1.725, // Heavy exercise 6-7 days/week
  very_active: 1.9, // Intense daily training or physical job
  extreme: 1.9, // Alias for very_active (backward compatibility)
};

/**
 * Climate Multipliers - Research-Backed
 * Accounts for thermoregulation costs in different climates
 */
export const CLIMATE_MULTIPLIERS: Record<ClimateType, number> = {
  temperate: 1.0, // Baseline (moderate climate)
  tropical: 1.075, // +7.5% for heat stress and sweating
  cold: 1.15, // +15% for shivering thermogenesis
  arid: 1.05, // +5% for dehydration stress and heat
};

/**
 * Occupation-based activity multipliers
 * For base daily metabolism from occupation NEAT (without exercise)
 */
export const OCCUPATION_MULTIPLIERS: Record<string, number> = {
  desk_job: 1.25, // Sitting most of day
  light_active: 1.35, // Standing, light movement throughout day
  moderate_active: 1.45, // Regular movement, on feet often
  heavy_labor: 1.6, // Physical work all day
  very_active: 1.7, // Constant intense physical activity
};

export interface TDEEResult {
  tdee: number;
  breakdown: {
    bmr: number;
    activityMultiplier: number;
    climateMultiplier: number;
    activityTDEE: number;
    finalTDEE: number;
  };
  formula: string;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 *
 * Standard approach: BMR × Activity Multiplier
 *
 * @param bmr - Basal Metabolic Rate in kcal/day
 * @param activityLevel - Activity level
 * @returns TDEE in kcal/day
 * @throws Error if BMR or activity level is invalid
 *
 * @example
 * const tdee = calculateTDEE(1680, 'moderate'); // Returns ~2604 kcal/day
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  if (!bmr || bmr <= 0) {
    throw new Error("Valid BMR required for TDEE calculation");
  }

  if (!activityLevel || !ACTIVITY_MULTIPLIERS[activityLevel]) {
    throw new Error(`Invalid activity level: ${activityLevel}`);
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate TDEE with climate adjustment
 *
 * Advanced approach: BMR × Activity Multiplier × Climate Multiplier
 * Accounts for thermoregulation costs in different climates
 *
 * @param bmr - Basal Metabolic Rate in kcal/day
 * @param activityLevel - Activity level
 * @param climate - Climate type
 * @returns TDEE in kcal/day
 *
 * @example
 * const tdee = calculateTDEEWithClimate(1680, 'moderate', 'tropical');
 * // Returns ~2800 kcal/day (2604 × 1.075)
 */
export function calculateTDEEWithClimate(
  bmr: number,
  activityLevel: ActivityLevel,
  climate: ClimateType = "temperate",
): number {
  if (!bmr || bmr <= 0) {
    throw new Error("Valid BMR required for TDEE calculation");
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  const climateMultiplier = CLIMATE_MULTIPLIERS[climate] || 1.0;

  const activityTDEE = bmr * activityMultiplier;
  const finalTDEE = activityTDEE * climateMultiplier;

  return Math.round(finalTDEE);
}

/**
 * Calculate TDEE with detailed breakdown
 *
 * @param bmr - Basal Metabolic Rate in kcal/day
 * @param activityLevel - Activity level
 * @param climate - Climate type
 * @returns Detailed TDEE result with breakdown
 *
 * @example
 * const result = calculateTDEEDetailed(1680, 'moderate', 'tropical');
 * console.log(result.breakdown);
 * // {
 * //   bmr: 1680,
 * //   activityMultiplier: 1.55,
 * //   climateMultiplier: 1.075,
 * //   activityTDEE: 2604,
 * //   finalTDEE: 2800
 * // }
 */
export function calculateTDEEDetailed(
  bmr: number,
  activityLevel: ActivityLevel,
  climate: ClimateType = "temperate",
): TDEEResult {
  if (!bmr || bmr <= 0) {
    throw new Error("Valid BMR required for TDEE calculation");
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  const climateMultiplier = CLIMATE_MULTIPLIERS[climate] || 1.0;

  const activityTDEE = bmr * activityMultiplier;
  const finalTDEE = activityTDEE * climateMultiplier;

  return {
    tdee: Math.round(finalTDEE),
    breakdown: {
      bmr: Math.round(bmr),
      activityMultiplier,
      climateMultiplier,
      activityTDEE: Math.round(activityTDEE),
      finalTDEE: Math.round(finalTDEE),
    },
    formula: `BMR (${Math.round(bmr)}) × Activity (${activityMultiplier}) × Climate (${climateMultiplier}) = ${Math.round(finalTDEE)} kcal/day`,
  };
}

/**
 * Calculate Base TDEE from Occupation (NEW APPROACH)
 * This represents daily metabolism from occupation NEAT (without exercise)
 *
 * @param bmr - Basal Metabolic Rate in kcal/day
 * @param occupation - Occupation type
 * @returns Base TDEE in kcal/day
 *
 * @example
 * const baseTDEE = calculateBaseTDEE(1680, 'desk_job'); // Returns ~2100 kcal/day
 */
export function calculateBaseTDEE(bmr: number, occupation: string): number {
  if (!bmr || bmr <= 0) {
    throw new Error("Valid BMR required for base TDEE calculation");
  }

  const multiplier = OCCUPATION_MULTIPLIERS[occupation] || 1.25;
  return Math.round(bmr * multiplier);
}

/**
 * Get activity level description
 *
 * @param activityLevel - Activity level
 * @returns Human-readable description
 */
export function getActivityDescription(activityLevel: ActivityLevel): string {
  const descriptions: Record<ActivityLevel, string> = {
    sedentary: "Little to no exercise, desk job",
    light: "Light exercise 1-3 days/week",
    moderate: "Moderate exercise 3-5 days/week",
    active: "Heavy exercise 6-7 days/week",
    very_active: "Intense daily training or physical labor",
    extreme: "Intense daily training or physical labor",
  };

  return descriptions[activityLevel] || "Unknown activity level";
}

/**
 * Get climate impact description
 *
 * @param climate - Climate type
 * @returns Human-readable description
 */
export function getClimateDescription(climate: ClimateType): string {
  const descriptions: Record<ClimateType, string> = {
    tropical: "Hot, humid climate (+7.5% for cooling)",
    temperate: "Moderate climate (baseline)",
    cold: "Cold climate (+15% for heat production)",
    arid: "Hot, dry climate (+5% for heat stress)",
  };

  return descriptions[climate] || "Unknown climate";
}

/**
 * Calculate calorie target for weight goal
 *
 * @param tdee - Total Daily Energy Expenditure
 * @param goal - Weight goal ('fat_loss', 'muscle_gain', 'maintenance')
 * @param rate - Rate of change (kg per week)
 * @returns Daily calorie target
 *
 * @example
 * const target = getCalorieTarget(2800, 'fat_loss', 0.5);
 * // Returns ~2250 kcal/day (500 kcal deficit per day = 0.5kg loss/week)
 */
export function getCalorieTarget(
  tdee: number,
  goal: "fat_loss" | "muscle_gain" | "maintenance",
  rate: number = 0.5,
): number {
  // 1 kg fat = ~7700 kcal
  const caloriesPerKg = 7700;
  const weeklyDeficit = rate * caloriesPerKg;
  const dailyAdjustment = weeklyDeficit / 7;

  switch (goal) {
    case "fat_loss":
      // Deficit for fat loss (max -1000 kcal/day = -1.3kg/week)
      return Math.round(tdee - Math.min(dailyAdjustment, 1000));

    case "muscle_gain":
      // Surplus for muscle gain (recommended +300-500 kcal/day)
      return Math.round(tdee + Math.min(dailyAdjustment, 500));

    case "maintenance":
    default:
      return Math.round(tdee);
  }
}

/**
 * Validate TDEE calculation inputs
 *
 * @param bmr - BMR value
 * @param activityLevel - Activity level
 * @returns Validation result
 */
export function validateTDEEInputs(
  bmr: number | null | undefined,
  activityLevel: ActivityLevel | null | undefined,
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!bmr || bmr <= 0) {
    errors.push("Valid BMR is required");
  } else if (bmr < 800 || bmr > 4000) {
    errors.push("BMR must be between 800-4000 kcal/day");
  }

  if (!activityLevel) {
    errors.push("Activity level is required");
  } else if (!ACTIVITY_MULTIPLIERS[activityLevel]) {
    errors.push(`Invalid activity level: ${activityLevel}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
