/**
 * Water Calculator - Climate-Adaptive Daily Water Intake
 * Accounts for climate, activity level, and environmental factors
 */

import type { WaterCalculator } from '../interfaces/calculators';
import type { ActivityLevel, ClimateType } from '../types';

/**
 * Climate-Adaptive Water Calculator
 * Calculates daily water needs with climate and activity adjustments
 *
 * Research basis:
 * - Base: 35 ml/kg body weight (European Food Safety Authority)
 * - Activity: Additional 500-2000ml based on exercise intensity
 * - Climate: 50-70% increase in hot/humid climates
 * - Arid climates have highest dehydration risk
 */
export class ClimateAdaptiveWaterCalculator implements WaterCalculator {
  /**
   * Calculate daily water intake in milliliters
   */
  calculate(weight: number, activityLevel: ActivityLevel, climate: ClimateType): number {
    // Base water requirement: 35 ml/kg (EFSA recommendation)
    let waterML = weight * 35;

    // Activity-based additions (ml per day)
    const activityBonus: Record<ActivityLevel, number> = {
      sedentary: 0,        // No additional water needed
      light: 500,          // Light sweating
      moderate: 1000,      // Moderate sweating
      active: 1500,        // Heavy sweating
      very_active: 2000,   // Intense sweating
    };

    waterML += activityBonus[activityLevel];

    // Climate multipliers (research-backed)
    const climateMultipliers: Record<ClimateType, number> = {
      tropical: 1.5,    // +50% for humidity and heat
      temperate: 1.0,   // Baseline (moderate climate)
      cold: 0.9,        // -10% (less sweating, but still need hydration)
      arid: 1.7,        // +70% for extreme dehydration risk
    };

    waterML *= climateMultipliers[climate];

    // Round to nearest 50ml for practical measurement
    return Math.round(waterML / 50) * 50;
  }

  /**
   * Get detailed breakdown of water calculation
   */
  getBreakdown(
    weight: number,
    activityLevel: ActivityLevel,
    climate: ClimateType
  ): {
    baseWater: number;
    activityBonus: number;
    climateMultiplier: number;
    totalWater: number;
    breakdown: string;
    cups: number;
    liters: number;
  } {
    const baseWater = weight * 35;

    const activityBonus: Record<ActivityLevel, number> = {
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

    const bonus = activityBonus[activityLevel];
    const mult = climateMultipliers[climate];
    const beforeClimate = baseWater + bonus;
    const totalWater = beforeClimate * mult;

    const breakdown = [
      `Base (${weight}kg × 35ml): ${Math.round(baseWater)} ml`,
      `+ Activity (${activityLevel}): ${bonus} ml`,
      `= ${Math.round(beforeClimate)} ml`,
      `× Climate (${climate}): ${mult}`,
      `= ${Math.round(totalWater)} ml`,
    ].join('\n');

    return {
      baseWater: Math.round(baseWater),
      activityBonus: bonus,
      climateMultiplier: mult,
      totalWater: Math.round(totalWater / 50) * 50,
      breakdown,
      cups: Math.round((totalWater / 237) * 10) / 10, // 1 cup = 237ml
      liters: Math.round((totalWater / 1000) * 10) / 10,
    };
  }

  /**
   * Get hydration recommendations based on climate
   */
  getRecommendations(climate: ClimateType): string[] {
    const baseRecommendations = [
      'Drink water regularly throughout the day',
      'Monitor urine color (pale yellow is ideal)',
      'Increase intake during exercise',
      'Don\'t wait until you\'re thirsty',
    ];

    const climateSpecific: Record<ClimateType, string[]> = {
      tropical: [
        'Drink extra during outdoor activities',
        'Consider electrolyte drinks for prolonged exercise',
        'Pre-hydrate before going outside',
        'Avoid caffeine and alcohol in heat',
      ],
      temperate: [
        'Adjust intake based on seasonal changes',
        'Increase during summer months',
      ],
      cold: [
        'Don\'t reduce water despite less thirst',
        'Warm beverages count toward hydration',
        'Indoor heating increases water needs',
      ],
      arid: [
        'Increase intake significantly',
        'Electrolyte replacement critical',
        'Humidity is very low - rapid dehydration risk',
        'Monitor for signs of dehydration closely',
      ],
    };

    return [...baseRecommendations, ...climateSpecific[climate]];
  }

  /**
   * Get water intake schedule (hourly distribution)
   */
  getSchedule(totalWaterML: number, wakeHours: number = 16): {
    hourlyIntake: number;
    schedule: Array<{ time: string; amount: number; note: string }>;
  } {
    const hourlyIntake = Math.round(totalWaterML / wakeHours / 50) * 50;

    // Sample schedule for 16-hour day
    const schedule = [
      { time: '07:00', amount: hourlyIntake * 2, note: 'Upon waking (rehydrate)' },
      { time: '09:00', amount: hourlyIntake, note: 'Mid-morning' },
      { time: '11:00', amount: hourlyIntake, note: 'Before lunch' },
      { time: '13:00', amount: hourlyIntake, note: 'After lunch' },
      { time: '15:00', amount: hourlyIntake, note: 'Mid-afternoon' },
      { time: '17:00', amount: hourlyIntake * 2, note: 'Pre-workout/evening' },
      { time: '19:00', amount: hourlyIntake, note: 'With dinner' },
      { time: '21:00', amount: hourlyIntake, note: 'Evening (2h before bed)' },
    ];

    return {
      hourlyIntake,
      schedule,
    };
  }

  /**
   * Check if water intake is adequate
   */
  isAdequate(
    currentIntakeML: number,
    recommendedIntakeML: number
  ): {
    adequate: boolean;
    percentage: number;
    message: string;
  } {
    const percentage = (currentIntakeML / recommendedIntakeML) * 100;

    if (percentage >= 90) {
      return {
        adequate: true,
        percentage: Math.round(percentage),
        message: 'Excellent hydration!',
      };
    } else if (percentage >= 70) {
      return {
        adequate: true,
        percentage: Math.round(percentage),
        message: 'Good hydration, try to reach 100%',
      };
    } else if (percentage >= 50) {
      return {
        adequate: false,
        percentage: Math.round(percentage),
        message: 'Below recommended intake - drink more water',
      };
    } else {
      return {
        adequate: false,
        percentage: Math.round(percentage),
        message: 'Critically low - increase water intake immediately',
      };
    }
  }

  /**
   * Calculate additional water needed for specific exercise duration
   */
  getExerciseWaterBonus(durationMinutes: number, intensity: 'low' | 'medium' | 'high'): number {
    // Water loss rates (ml per minute)
    const sweatRates = {
      low: 5,       // 300ml/hour
      medium: 10,   // 600ml/hour
      high: 15,     // 900ml/hour
    };

    const waterLoss = durationMinutes * sweatRates[intensity];

    // Recommend 150% of water lost (proactive hydration)
    return Math.round((waterLoss * 1.5) / 50) * 50;
  }
}

/**
 * Dehydration assessment based on symptoms
 */
export function assessDehydration(symptoms: {
  darkUrine: boolean;
  dryMouth: boolean;
  fatigue: boolean;
  dizziness: boolean;
  headache: boolean;
  reducedUrination: boolean;
}): {
  level: 'none' | 'mild' | 'moderate' | 'severe';
  symptomCount: number;
  recommendations: string[];
} {
  const symptomCount = Object.values(symptoms).filter(Boolean).length;

  if (symptomCount === 0) {
    return {
      level: 'none',
      symptomCount: 0,
      recommendations: ['Maintain current hydration levels'],
    };
  } else if (symptomCount <= 2) {
    return {
      level: 'mild',
      symptomCount,
      recommendations: [
        'Increase water intake',
        'Monitor symptoms',
        'Drink 500ml of water immediately',
      ],
    };
  } else if (symptomCount <= 4) {
    return {
      level: 'moderate',
      symptomCount,
      recommendations: [
        'Drink water immediately',
        'Consider electrolyte solution',
        'Rest in cool environment',
        'Monitor symptoms closely',
      ],
    };
  } else {
    return {
      level: 'severe',
      symptomCount,
      recommendations: [
        'Seek medical attention immediately',
        'This may require IV rehydration',
        'Do not ignore these symptoms',
      ],
    };
  }
}

/**
 * Singleton instance
 */
export const waterCalculator = new ClimateAdaptiveWaterCalculator();
