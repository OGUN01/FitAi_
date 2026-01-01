/**
 * Calculator interfaces for the Universal Health System
 * These interfaces define contracts for all health calculation implementations
 */

import type {
  UserProfile,
  BMIClassification,
  BMICutoffs,
  Macros,
  ActivityLevel,
  ClimateType,
  DietType,
  Goal,
} from '../types';

/**
 * BMR Calculator Interface
 * Different formulas for different populations/situations
 */
export interface BMRCalculator {
  /**
   * Calculate Basal Metabolic Rate
   * @param user - User profile with weight, height, age, gender
   * @returns BMR in kcal/day
   */
  calculate(user: UserProfile): number;

  /**
   * Get the formula name
   */
  getFormula(): string;

  /**
   * Get the accuracy rating
   */
  getAccuracy(): string;
}

/**
 * BMI Calculator Interface
 * Population-specific cutoffs and classifications
 */
export interface BMICalculator {
  /**
   * Calculate BMI
   * @param weight - Weight in kg
   * @param height - Height in cm
   * @returns BMI value
   */
  calculate(weight: number, height: number): number;

  /**
   * Get BMI classification for this population
   * @param bmi - BMI value
   * @returns Classification with health risk and recommendations
   */
  getClassification(bmi: number): BMIClassification;

  /**
   * Get population-specific cutoffs
   */
  getCutoffs(): BMICutoffs;
}

/**
 * TDEE Calculator Interface
 * Calculates Total Daily Energy Expenditure with climate adjustments
 */
export interface TDEECalculator {
  /**
   * Calculate TDEE
   * @param bmr - Basal Metabolic Rate
   * @param activityLevel - Activity level
   * @param climate - Climate type for adjustment
   * @returns TDEE in kcal/day
   */
  calculate(bmr: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}

/**
 * Water Calculator Interface
 * Calculates daily water needs with climate/activity adjustments
 */
export interface WaterCalculator {
  /**
   * Calculate daily water intake
   * @param weight - Weight in kg
   * @param activityLevel - Activity level
   * @param climate - Climate type
   * @returns Water intake in ml/day
   */
  calculate(weight: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}

/**
 * Macro Calculator Interface
 * Calculates protein, fat, and carb needs based on diet type and goals
 */
export interface MacroCalculator {
  /**
   * Calculate protein needs
   * @param weight - Weight in kg
   * @param goal - Fitness goal
   * @param dietType - Diet type
   * @returns Protein in grams/day
   */
  calculateProtein(weight: number, goal: Goal, dietType: DietType): number;

  /**
   * Calculate complete macro split
   * @param calories - Daily calorie target
   * @param protein - Protein requirement
   * @param dietType - Diet type
   * @returns Macro distribution
   */
  calculateMacroSplit(calories: number, protein: number, dietType: DietType): Macros;
}
