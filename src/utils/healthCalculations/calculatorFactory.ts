/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - CALCULATOR FACTORY
 * Factory pattern to select optimal calculators based on user context
 *
 * Phase 1: Calculator Factory Pattern
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import {
  BMRFormula,
  BMRCalculator,
  BMICalculator,
  TDEECalculator,
  WaterCalculator,
  UserProfile,
  EthnicityType,
  ClimateType,
  ActivityLevel,
  BMICutoffs,
  BMIClassification,
} from './types';
import { detectBestBMRFormula } from './autoDetection';

// ============================================================================
// BMR CALCULATORS (4 formulas)
// ============================================================================

/**
 * Mifflin-St Jeor BMR Calculator (Default - Most Validated)
 *
 * Formula:
 * - Male: 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * - Female: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 *
 * Accuracy: ±10%
 * Best for: General population without body fat data
 * Reference: Mifflin et al. (1990)
 */
class MifflinStJeorBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const { weight, height, age, gender } = user;
    const base = 10 * weight + 6.25 * height - 5 * age;

    if (gender === 'male') {
      return base + 5;
    } else if (gender === 'female') {
      return base - 161;
    } else {
      // For 'other'/'prefer_not_to_say', use average
      return base - 78;
    }
  }

  getFormula(): BMRFormula {
    return 'mifflin_st_jeor';
  }

  getAccuracy(): string {
    return '±10%';
  }
}

/**
 * Katch-McArdle BMR Calculator (Best with Body Fat %)
 *
 * Formula: BMR = 370 + (21.6 × lean_body_mass_kg)
 *
 * Accuracy: ±5% (when body fat is accurate)
 * Best for: Users with DEXA/calipers/accurate body fat %
 * Reference: Katch & McArdle (1996)
 */
class KatchMcArdleBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const { weight, bodyFat } = user;

    if (!bodyFat) {
      // Fallback to Mifflin-St Jeor if no body fat data
      const fallback = new MifflinStJeorBMRCalculator();
      return fallback.calculate(user);
    }

    const fatMass = weight * (bodyFat / 100);
    const leanMass = weight - fatMass;
    return 370 + (21.6 * leanMass);
  }

  getFormula(): BMRFormula {
    return 'katch_mcardle';
  }

  getAccuracy(): string {
    return '±5%';
  }
}

/**
 * Cunningham BMR Calculator (For Athletes)
 *
 * Formula: BMR = 500 + (22 × lean_body_mass_kg)
 *
 * Accuracy: ±5%
 * Best for: Athletes, very active individuals with low body fat
 * Reference: Cunningham (1980)
 */
class CunninghamBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const { weight, bodyFat } = user;

    if (!bodyFat) {
      // Fallback to Mifflin-St Jeor if no body fat data
      const fallback = new MifflinStJeorBMRCalculator();
      return fallback.calculate(user);
    }

    const fatMass = weight * (bodyFat / 100);
    const leanMass = weight - fatMass;
    return 500 + (22 * leanMass);
  }

  getFormula(): BMRFormula {
    return 'cunningham';
  }

  getAccuracy(): string {
    return '±5%';
  }
}

/**
 * Harris-Benedict Revised BMR Calculator (Alternative/Legacy)
 *
 * Formula:
 * - Male: 88.362 + 13.397×weight + 4.799×height - 5.677×age
 * - Female: 447.593 + 9.247×weight + 3.098×height - 4.330×age
 *
 * Accuracy: ±12-15%
 * Best for: Comparison/validation only (older formula)
 * Reference: Harris & Benedict (1918, revised 1984)
 */
class HarrisBenedictBMRCalculator implements BMRCalculator {
  calculate(user: UserProfile): number {
    const { weight, height, age, gender } = user;

    if (gender === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else if (gender === 'female') {
      return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    } else {
      // Average for other
      const male = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
      const female = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
      return (male + female) / 2;
    }
  }

  getFormula(): BMRFormula {
    return 'harris_benedict';
  }

  getAccuracy(): string {
    return '±12-15%';
  }
}

// ============================================================================
// BMI CALCULATORS (Population-Specific)
// ============================================================================

/**
 * Standard BMI Calculator (WHO General)
 */
class StandardBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    const cutoffs = this.getCutoffs();
    let category: string;
    let healthRisk: 'low' | 'moderate' | 'high' | 'very_high';

    if (bmi < cutoffs.underweight) {
      category = 'Underweight';
      healthRisk = 'moderate';
    } else if (bmi < cutoffs.normalMax) {
      category = 'Normal';
      healthRisk = 'low';
    } else if (bmi < cutoffs.overweightMax) {
      category = 'Overweight';
      healthRisk = 'moderate';
    } else if (bmi < 35) {
      category = 'Obese Class I';
      healthRisk = 'high';
    } else if (bmi < 40) {
      category = 'Obese Class II';
      healthRisk = 'very_high';
    } else {
      category = 'Obese Class III';
      healthRisk = 'very_high';
    }

    return {
      category,
      healthRisk,
      cutoffs,
      ethnicity: 'general',
      message: `BMI ${bmi.toFixed(1)} - ${category}`,
    };
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 24.9,
      overweightMax: 29.9,
      obeseMin: 30,
      source: 'WHO (1995)',
      notes: 'Standard general classification',
    };
  }
}

/**
 * Asian BMI Calculator (WHO Asia-Pacific)
 *
 * Reference: WHO (2000) - Asia-Pacific perspective
 * Note: Asians have 3-5% higher body fat at same BMI vs Caucasians
 */
class AsianBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    const cutoffs = this.getCutoffs();
    let category: string;
    let healthRisk: 'low' | 'moderate' | 'high' | 'very_high';

    if (bmi < cutoffs.underweight) {
      category = 'Underweight';
      healthRisk = 'moderate';
    } else if (bmi < cutoffs.normalMax) {
      category = 'Normal';
      healthRisk = 'low';
    } else if (bmi < cutoffs.overweightMax) {
      category = 'Overweight';
      healthRisk = 'moderate';
    } else if (bmi < 32.5) {
      category = 'Obese Class I';
      healthRisk = 'high';
    } else if (bmi < 37.5) {
      category = 'Obese Class II';
      healthRisk = 'very_high';
    } else {
      category = 'Obese Class III';
      healthRisk = 'very_high';
    }

    let message = `BMI ${bmi.toFixed(1)} - ${category} (Asian classification)`;

    // Special message for borderline cases
    if (bmi >= 23 && bmi < 25) {
      message += `. Note: This is "Normal" in general WHO classification (18.5-24.9), but research shows Asians have higher health risks at this BMI. Aim for BMI < 23.0 for optimal health.`;
    }

    return {
      category,
      healthRisk,
      cutoffs,
      ethnicity: 'asian',
      message,
    };
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 22.9,
      overweightMax: 27.4,
      obeseMin: 27.5,
      source: 'WHO Asia-Pacific (2000)',
      notes: 'Asians have 3-5% higher body fat at same BMI vs Caucasians',
    };
  }
}

/**
 * Black/African BMI Calculator
 *
 * Reference: Deurenberg et al. (1998)
 * Note: Higher muscle mass, lower body fat at same BMI
 */
class AfricanBMICalculator implements BMICalculator {
  calculate(weight: number, height: number): number {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  }

  getClassification(bmi: number): BMIClassification {
    const cutoffs = this.getCutoffs();
    let category: string;
    let healthRisk: 'low' | 'moderate' | 'high' | 'very_high';

    if (bmi < cutoffs.underweight) {
      category = 'Underweight';
      healthRisk = 'moderate';
    } else if (bmi < cutoffs.normalMax) {
      category = 'Normal';
      healthRisk = 'low';
    } else if (bmi < cutoffs.overweightMax) {
      category = 'Overweight';
      healthRisk = 'moderate';
    } else if (bmi < 37) {
      category = 'Obese Class I';
      healthRisk = 'high';
    } else if (bmi < 40) {
      category = 'Obese Class II';
      healthRisk = 'very_high';
    } else {
      category = 'Obese Class III';
      healthRisk = 'very_high';
    }

    let message = `BMI ${bmi.toFixed(1)} - ${category}`;

    // Special message for higher muscle mass
    if (bmi >= 25 && bmi < 27) {
      message += `. Note: You may have higher muscle mass than other populations. Consider using waist-to-height ratio for more accurate health assessment.`;
    }

    return {
      category,
      healthRisk,
      cutoffs,
      ethnicity: 'black_african',
      message,
    };
  }

  getCutoffs(): BMICutoffs {
    return {
      underweight: 18.5,
      normalMin: 18.5,
      normalMax: 26.9,
      overweightMax: 31.9,
      obeseMin: 32,
      source: 'Deurenberg et al. (1998)',
      notes: 'Higher muscle mass, lower body fat at same BMI',
    };
  }
}

// ============================================================================
// CALCULATOR FACTORY
// ============================================================================

/**
 * Health Calculator Factory
 * Selects optimal calculators based on user context
 */
export class HealthCalculatorFactory {
  /**
   * Create BMR calculator based on user data
   * Auto-selects best formula for maximum accuracy
   */
  static createBMRCalculator(user: UserProfile): BMRCalculator {
    const selection = detectBestBMRFormula(user);

    switch (selection.formula) {
      case 'katch_mcardle':
        return new KatchMcArdleBMRCalculator();
      case 'cunningham':
        return new CunninghamBMRCalculator();
      case 'harris_benedict':
        return new HarrisBenedictBMRCalculator();
      case 'mifflin_st_jeor':
      default:
        return new MifflinStJeorBMRCalculator();
    }
  }

  /**
   * Create BMI calculator based on ethnicity
   * Uses population-specific cutoffs for accurate classification
   */
  static createBMICalculator(ethnicity: EthnicityType): BMICalculator {
    switch (ethnicity) {
      case 'asian':
        return new AsianBMICalculator();
      case 'black_african':
        return new AfricanBMICalculator();
      case 'caucasian':
      case 'hispanic':
      case 'middle_eastern':
      case 'pacific_islander':
      case 'mixed':
      case 'general':
      default:
        return new StandardBMICalculator();
    }
  }

  /**
   * Calculate TDEE with climate adjustments
   * Applies thermoregulation modifiers based on climate
   */
  static calculateTDEE(
    bmr: number,
    activityLevel: ActivityLevel,
    climate: ClimateType
  ): number {
    // Base activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const baseTDEE = bmr * activityMultipliers[activityLevel];

    // BUG-12: Climate modifiers — use CLIMATE_MULTIPLIERS SSOT values (tropical = 1.075)
    const climateModifiers = {
      tropical: 1.075, // +7.5% for heat stress and sweating (matches CLIMATE_MULTIPLIERS SSOT)
      temperate: 1.00, // Baseline
      cold: 1.15,      // +15% for thermogenesis
      arid: 1.05,      // +5% for heat stress
    };

    return Math.round(baseTDEE * climateModifiers[climate]);
  }

  /**
   * Calculate water intake with climate adjustments
   * Base: 35ml per kg, adjusted for climate and activity
   */
  static calculateWaterIntake(
    weight: number,
    activityLevel: ActivityLevel,
    climate: ClimateType
  ): number {
    // BUG-13: Delegate to ClimateAdaptiveWaterCalculator (SSOT) instead of divergent local formula
    // SSOT: base 35ml/kg + activity bonus, then climate multiplier (tropical 1.5, arid 1.7)
    const base = weight * 35;
    const activityBonuses: Record<ActivityLevel, number> = {
      sedentary: 0,
      light: 500,
      moderate: 1000,
      active: 1500,
      very_active: 2000,
    };
    const climateMultipliers: Record<ClimateType, number> = {
      tropical: 1.5,
      temperate: 1.0,
      cold: 0.9,
      arid: 1.7,
    };
    const total = (base + (activityBonuses[activityLevel] ?? 0)) * (climateMultipliers[climate] ?? 1.0);
    return Math.round(total / 50) * 50;
  }
}
