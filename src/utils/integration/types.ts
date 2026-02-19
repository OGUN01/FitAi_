/**
 * Type definitions for integration utilities
 */

import {
  PersonalInfo as UserPersonalInfo,
  FitnessGoals as UserFitnessGoals,
  OnboardingData,
} from "../../types/user";

/**
 * Common response type for integration operations
 */
export interface IntegrationResponse {
  success: boolean;
  error?: string;
}

/**
 * User ID getter function type
 */
export type GetUserIdFn = () => string;

/**
 * Health metrics return type
 */
export interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  weight: number;
  height: number;
}

/**
 * Unit conversion formats
 */
export type WeightUnit = "kg" | "lbs";
export type HeightUnit = "cm" | "ft";
export type UnitSystem = "metric" | "imperial";

/**
 * Re-export user types for convenience
 */
export type { UserPersonalInfo, UserFitnessGoals, OnboardingData };
