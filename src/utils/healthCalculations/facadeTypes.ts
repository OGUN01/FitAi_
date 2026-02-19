/**
 * FACADE-SPECIFIC TYPES
 * Types and interfaces for HealthCalculatorFacade
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 */

import type { ClimateType, EthnicityType, BMRFormula } from "./types";

// ============================================================================
// COMPREHENSIVE HEALTH METRICS
// ============================================================================

export interface ComprehensiveHealthMetrics {
  // Core Metrics
  bmr: number;
  bmi: number;
  bmiClassification: {
    category: string;
    healthRisk: "low" | "moderate" | "high" | "very_high";
    ethnicity: EthnicityType;
    message: string;
  };
  tdee: number;
  dailyCalories: number;

  // Hydration & Nutrition
  waterIntakeML: number;
  protein: number;
  carbs: number;
  fat: number;
  macroSplit: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };

  // Advanced Cardio Metrics (optional)
  heartRateZones?: {
    resting: number;
    fatBurn: { min: number; max: number };
    cardio: { min: number; max: number };
    peak: { min: number; max: number };
    maxHR: number;
  } | null;

  vo2max?: {
    vo2max: number;
    classification: string;
    fitnessAge: number;
  } | null;

  // Health Assessment (optional)
  healthScore?: {
    totalScore: number;
    grade: string;
    breakdown: {
      bmi: number;
      bodyFat: number;
      hydration: number;
      nutrition: number;
      cardiovascular: number;
    };
    recommendations: string[];
  } | null;

  // Goal-Specific Metrics (optional)
  muscleGainLimits?: {
    monthlyRate: number;
    yearlyGain: number;
    classification: string;
  } | null;

  fatLossValidation?: {
    valid: boolean;
    severity: "success" | "warning" | "error";
    message: string;
    weeklyRate: number;
  } | null;

  // Context & Metadata
  climate: ClimateType;
  ethnicity: EthnicityType;
  bmrFormula: BMRFormula;
  bmrAccuracy: string;
  bmrConfidence: number;
  calculationDate: string;

  // Calculation breakdown for transparency
  breakdown?: {
    bmr: {
      formula: BMRFormula;
      value: number;
      accuracy: string;
    };
    tdee: {
      baseTDEE: number;
      climateModifier: number;
      finalTDEE: number;
    };
    water: {
      base_ml: number;
      climate_ml: number;
      activity_ml: number;
      final_ml: number;
    };
  };
}

// ============================================================================
// GOAL VALIDATION TYPES
// ============================================================================

export interface GoalInput {
  type: "fat_loss" | "muscle_gain" | "maintenance" | "recomp";
  targetWeight?: number;
  targetGain?: number;
  timelineWeeks?: number;
  timelineMonths?: number;
}

export interface GoalValidationResult {
  valid: boolean;
  severity: "success" | "warning" | "error";
  message: string;
  suggestions?: string[];
  adjustedTimeline?: number;
  weeklyRate?: number;
}
