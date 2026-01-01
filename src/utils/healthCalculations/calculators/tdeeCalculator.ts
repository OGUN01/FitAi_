/**
 * TDEE Calculator - Climate-Adaptive Total Daily Energy Expenditure
 * Accounts for thermoregulation costs in different climates
 */

import type { TDEECalculator } from '../interfaces/calculators';
import type { ActivityLevel, ClimateType } from '../types';

/**
 * Climate-Adaptive TDEE Calculator
 * Calculates energy expenditure with climate and activity adjustments
 *
 * Research basis:
 * - Cold exposure increases BMR by 10-15% (shivering thermogenesis)
 * - Tropical heat increases energy cost by 5-7.5% (cooling mechanisms)
 * - Activity multipliers based on WHO/FAO guidelines
 */
export class ClimateAdaptiveTDEECalculator implements TDEECalculator {
  /**
   * Calculate TDEE with climate adjustments
   */
  calculate(bmr: number, activityLevel: ActivityLevel, climate: ClimateType): number {
    // Activity multipliers (WHO/FAO validated)
    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,     // Desk job, minimal exercise
      light: 1.375,       // Light exercise 1-3 days/week
      moderate: 1.55,     // Moderate exercise 3-5 days/week
      active: 1.725,      // Heavy exercise 6-7 days/week
      very_active: 1.9,   // Intense daily training or physical job
    };

    let tdee = bmr * activityMultipliers[activityLevel];

    // Climate adjustments (research-backed)
    const climateMultipliers: Record<ClimateType, number> = {
      tropical: 1.075,   // +7.5% for heat stress and sweating
      temperate: 1.0,    // Baseline (moderate climate)
      cold: 1.15,        // +15% for shivering thermogenesis
      arid: 1.05,        // +5% for dehydration stress and heat
    };

    tdee *= climateMultipliers[climate];

    return Math.round(tdee);
  }

  /**
   * Get detailed breakdown of TDEE calculation
   */
  getBreakdown(
    bmr: number,
    activityLevel: ActivityLevel,
    climate: ClimateType
  ): {
    bmr: number;
    activityMultiplier: number;
    climateMultiplier: number;
    activityTDEE: number;
    finalTDEE: number;
    breakdown: string;
  } {
    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const climateMultipliers: Record<ClimateType, number> = {
      tropical: 1.075,
      temperate: 1.0,
      cold: 1.15,
      arid: 1.05,
    };

    const activityMult = activityMultipliers[activityLevel];
    const climateMult = climateMultipliers[climate];
    const activityTDEE = bmr * activityMult;
    const finalTDEE = activityTDEE * climateMult;

    const breakdown = [
      `BMR: ${Math.round(bmr)} kcal`,
      `× Activity (${activityLevel}): ${activityMult}`,
      `= ${Math.round(activityTDEE)} kcal`,
      `× Climate (${climate}): ${climateMult}`,
      `= ${Math.round(finalTDEE)} kcal`,
    ].join('\n');

    return {
      bmr,
      activityMultiplier: activityMult,
      climateMultiplier: climateMult,
      activityTDEE: Math.round(activityTDEE),
      finalTDEE: Math.round(finalTDEE),
      breakdown,
    };
  }

  /**
   * Get activity level description
   */
  getActivityDescription(activityLevel: ActivityLevel): string {
    const descriptions: Record<ActivityLevel, string> = {
      sedentary: 'Little to no exercise, desk job',
      light: 'Light exercise 1-3 days/week',
      moderate: 'Moderate exercise 3-5 days/week',
      active: 'Heavy exercise 6-7 days/week',
      very_active: 'Intense daily training or physical labor',
    };

    return descriptions[activityLevel];
  }

  /**
   * Get climate impact description
   */
  getClimateDescription(climate: ClimateType): string {
    const descriptions: Record<ClimateType, string> = {
      tropical: 'Hot, humid climate (+7.5% for cooling)',
      temperate: 'Moderate climate (baseline)',
      cold: 'Cold climate (+15% for heat production)',
      arid: 'Hot, dry climate (+5% for heat stress)',
    };

    return descriptions[climate];
  }

  /**
   * Calculate calorie target for weight goal
   * @param tdee - Total Daily Energy Expenditure
   * @param goal - Weight goal ('fat_loss', 'muscle_gain', 'maintenance')
   * @param rate - Rate of change (kg per week)
   * @returns Daily calorie target
   */
  getCalorieTarget(
    tdee: number,
    goal: 'fat_loss' | 'muscle_gain' | 'maintenance',
    rate: number = 0.5
  ): number {
    // 1 kg fat = ~7700 kcal
    const caloriesPerKg = 7700;
    const weeklyDeficit = rate * caloriesPerKg;
    const dailyAdjustment = weeklyDeficit / 7;

    switch (goal) {
      case 'fat_loss':
        // Deficit for fat loss (max -1000 kcal/day = -1.3kg/week)
        return Math.round(tdee - Math.min(dailyAdjustment, 1000));

      case 'muscle_gain':
        // Surplus for muscle gain (recommended +300-500 kcal/day)
        return Math.round(tdee + Math.min(dailyAdjustment, 500));

      case 'maintenance':
      default:
        return Math.round(tdee);
    }
  }
}

/**
 * Helper function to detect climate from location (simplified version)
 * Note: For full detection with confidence scores, use detectClimate from autoDetection.ts
 * This simplified version returns just the ClimateType string
 */
export function detectClimateSimple(country: string, region?: string): ClimateType {
  // Tropical countries
  const tropicalCountries = [
    'India',
    'Indonesia',
    'Thailand',
    'Malaysia',
    'Singapore',
    'Philippines',
    'Vietnam',
    'Brazil',
    'Colombia',
    'Venezuela',
  ];

  // Cold countries
  const coldCountries = [
    'Canada',
    'Russia',
    'Norway',
    'Sweden',
    'Finland',
    'Iceland',
    'Greenland',
  ];

  // Arid countries
  const aridCountries = [
    'Saudi Arabia',
    'UAE',
    'Qatar',
    'Kuwait',
    'Egypt',
    'Jordan',
    'Israel',
    'Australia', // Most regions
  ];

  const countryLower = country.toLowerCase();

  if (tropicalCountries.some((c) => countryLower.includes(c.toLowerCase()))) {
    return 'tropical';
  }

  if (coldCountries.some((c) => countryLower.includes(c.toLowerCase()))) {
    return 'cold';
  }

  if (aridCountries.some((c) => countryLower.includes(c.toLowerCase()))) {
    return 'arid';
  }

  return 'temperate'; // Default
}

/**
 * Singleton instance
 */
export const tdeeCalculator = new ClimateAdaptiveTDEECalculator();
