/**
 * DataBridge Types
 * All interfaces and type definitions for the DataBridge module
 */

import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import {
  PersonalInfo,
  DietPreferences,
  WorkoutPreferences,
} from "../../types/profileData";

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface DataBridgeConfig {
  USE_NEW_SYSTEM: boolean;
  SHADOW_MODE: boolean;
}

// ============================================================================
// SHADOW MODE TYPES (kept for backward compatibility)
// ============================================================================

export interface ShadowModeDiscrepancy {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export interface ShadowModeReport {
  discrepancies: ShadowModeDiscrepancy[];
  oldSystemData: AllDataResult | null;
  newSystemData: AllDataResult | null;
  comparisonTimestamp: string;
  isConsistent: boolean;
}

// ============================================================================
// DATA RESULT TYPES
// ============================================================================

export interface AllDataResult {
  personalInfo: PersonalInfoData | PersonalInfo | null;
  dietPreferences: DietPreferencesData | DietPreferences | null;
  bodyAnalysis: BodyAnalysisData | any | null;
  workoutPreferences: WorkoutPreferencesData | WorkoutPreferences | null;
  advancedReview: AdvancedReviewData | any | null;
  source: "old_system" | "new_system" | "merged" | "local" | "database";
}

export interface SaveResult {
  success: boolean;
  oldSystemSuccess?: boolean;
  newSystemSuccess?: boolean;
  errors: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
  oldSystemMigration?: any;
  newSystemMigration?: any;
  // Track local vs remote sync separately for 100% sync precision
  localSyncKeys?: string[];
  remoteSyncKeys?: string[];
}

// ============================================================================
// RE-EXPORT ONBOARDING TYPES FOR CONVENIENCE
// ============================================================================

export type {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";

export type {
  PersonalInfo,
  DietPreferences,
  WorkoutPreferences,
} from "../../types/profileData";
