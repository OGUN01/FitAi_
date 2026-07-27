/**
 * TDEE Calculator - Climate-Adaptive Total Daily Energy Expenditure
 * Accounts for thermoregulation costs in different climates
 */

import type { TDEECalculator } from '../interfaces/calculators';
import type { ActivityLevel, ClimateType } from '../types';
import { CALORIE_PER_KG } from '../../../services/validation/constants';
import { ACTIVITY_MULTIPLIERS, CLIMATE_MULTIPLIERS } from '../core/tdeeCalculation';

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
    let tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2);

    // Climate adjustments (research-backed)
    tdee *= CLIMATE_MULTIPLIERS[climate];

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
    const activityMult = ACTIVITY_MULTIPLIERS[activityLevel];
    const climateMult = CLIMATE_MULTIPLIERS[climate];
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
    const descriptions: Record<string, string> = {
      sedentary: 'Little to no exercise, desk job',
      light: 'Light exercise 1-3 days/week',
      moderate: 'Moderate exercise 3-5 days/week',
      active: 'Heavy exercise 6-7 days/week',
      very_active: 'Intense daily training or physical labor',
      extreme: 'Intense daily training or physical labor', // Alias for very_active
    };

    return descriptions[activityLevel] || descriptions.moderate;
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
    const weeklyDeficit = rate * CALORIE_PER_KG;
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
