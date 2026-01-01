/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - INTERFACES
 * TypeScript interfaces for all calculator implementations
 *
 * Phase 1: Base Interfaces
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import {
  BMRFormula,
  ClimateType,
  ActivityLevel,
  EthnicityType,
  UserProfile,
  BMIClassification,
  BMICutoffs,
} from './types';

// ============================================================================
// CALCULATOR INTERFACES
// ============================================================================

/**
 * BMR Calculator Interface
 * All BMR calculators must implement this interface
 */
export interface IBMRCalculator {
  /**
   * Calculate Basal Metabolic Rate
   * @param user - User profile with weight, height, age, gender, body fat
   * @returns BMR in calories per day
   */
  calculate(user: UserProfile): number;

  /**
   * Get the formula name
   * @returns Formula identifier
   */
  getFormula(): BMRFormula;

  /**
   * Get accuracy rating
   * @returns Accuracy as percentage string (e.g., "±5%")
   */
  getAccuracy(): string;
}

/**
 * BMI Calculator Interface
 * All BMI calculators must implement this interface
 */
export interface IBMICalculator {
  /**
   * Calculate Body Mass Index
   * @param weight - Weight in kg
   * @param height - Height in cm
   * @returns BMI value
   */
  calculate(weight: number, height: number): number;

  /**
   * Get BMI classification with health risk
   * @param bmi - BMI value
   * @returns Classification with category, risk, cutoffs
   */
  getClassification(bmi: number): BMIClassification;

  /**
   * Get BMI cutoff points for this population
   * @returns Cutoff values for underweight, normal, overweight, obese
   */
  getCutoffs(): BMICutoffs;
}

/**
 * TDEE Calculator Interface
 */
export interface ITDEECalculator {
  /**
   * Calculate Total Daily Energy Expenditure
   * @param bmr - Basal Metabolic Rate
   * @param activityLevel - User's activity level
   * @param climate - User's climate zone
   * @returns TDEE in calories per day
   */
  calculate(bmr: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}

/**
 * Water Calculator Interface
 */
export interface IWaterCalculator {
  /**
   * Calculate daily water intake recommendation
   * @param weight - Weight in kg
   * @param activityLevel - User's activity level
   * @param climate - User's climate zone
   * @returns Daily water in ml
   */
  calculate(weight: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}

// ============================================================================
// DETECTION INTERFACES
// ============================================================================

/**
 * Climate Detector Interface
 */
export interface IClimateDetector {
  /**
   * Detect climate zone from location
   * @param country - ISO 3166-1 alpha-2 country code
   * @param state - State/province code (optional)
   * @returns Climate detection result with confidence
   */
  detect(country: string, state?: string): {
    climate: ClimateType;
    confidence: number;
    shouldAskUser: boolean;
  };
}

/**
 * Ethnicity Detector Interface
 */
export interface IEthnicityDetector {
  /**
   * Detect ethnicity from location
   * @param country - ISO 3166-1 alpha-2 country code
   * @param state - State/province code (optional)
   * @returns Ethnicity detection result with confidence
   */
  detect(country: string, state?: string): {
    ethnicity: EthnicityType;
    confidence: number;
    shouldAskUser: boolean;
  };
}

/**
 * Formula Selector Interface
 */
export interface IFormulaSelector {
  /**
   * Select best BMR formula based on user data
   * @param user - User profile
   * @returns Formula selection with reasoning
   */
  selectBMRFormula(user: UserProfile): {
    formula: BMRFormula;
    reason: string;
    accuracy: string;
    confidence: number;
  };
}

// ============================================================================
// FACTORY INTERFACE
// ============================================================================

/**
 * Health Calculator Factory Interface
 * Creates appropriate calculators based on user context
 */
export interface IHealthCalculatorFactory {
  /**
   * Create BMR calculator
   * @param user - User profile
   * @returns BMR calculator instance
   */
  createBMRCalculator(user: UserProfile): IBMRCalculator;

  /**
   * Create BMI calculator
   * @param ethnicity - User's ethnicity
   * @returns BMI calculator instance
   */
  createBMICalculator(ethnicity: EthnicityType): IBMICalculator;

  /**
   * Calculate TDEE
   * @param bmr - Basal Metabolic Rate
   * @param activityLevel - Activity level
   * @param climate - Climate zone
   * @returns TDEE value
   */
  calculateTDEE(bmr: number, activityLevel: ActivityLevel, climate: ClimateType): number;

  /**
   * Calculate water intake
   * @param weight - Weight in kg
   * @param activityLevel - Activity level
   * @param climate - Climate zone
   * @returns Water intake in ml
   */
  calculateWaterIntake(weight: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}
