// Migration Types and Interfaces
// Provides type definitions for the migration engine

import {
  LocalStorageSchema,
  ValidationResult,
  OnboardingData,
  WorkoutSession,
  MealLog,
  BodyMeasurement,
} from "../../types/localData";

export interface MigrationConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  timeoutMs: number;
  backupEnabled: boolean;
  cleanupAfterSuccess: boolean;
  validateBeforeMigration: boolean;
}

export interface MigrationStep {
  name: string;
  description: string;
  weight: number; // For progress calculation (0-1)
  handler: (data: any, context: MigrationContext) => Promise<void>;
  rollbackHandler?: (context: MigrationContext) => Promise<void>;
  retryable: boolean;
  critical: boolean; // If true, failure stops entire migration
}

export interface MigrationContext {
  migrationId: string;
  userId: string;
  startTime: Date;
  currentStep: string;
  completedSteps: string[];
  failedSteps: string[];
  backupData?: LocalStorageSchema;
  transformedData?: any;
  uploadedData: Record<string, any>;
  errors: MigrationError[];
  warnings: string[];
}

export interface MigrationProgress {
  migrationId: string;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | "rolling_back";
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  percentage: number;
  startTime: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
  message: string;
  errors: MigrationError[];
  warnings: string[];
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  progress: MigrationProgress;
  migratedDataCount: {
    userProfiles: number;
    workoutSessions: number;
    mealLogs: number;
    bodyMeasurements: number;
    achievements: number;
  };
  migratedData?: {
    personalInfo?: boolean;
    fitnessGoals?: boolean;
    dietPreferences?: boolean;
    workoutPreferences?: boolean;
    bodyAnalysis?: boolean;
    advancedReview?: boolean;
    workoutSessions?: any[];
    mealLogs?: any[];
    bodyMeasurements?: any[];
  };
  migratedKeys?: string[];
  localSyncKeys?: string[];
  remoteSyncKeys?: string[];
  errors: MigrationError[];
  warnings: string[];
  duration: number; // milliseconds
  conflicts?: any[];
}

export interface MigrationError {
  step: string;
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  retryCount: number;
  recoverable: boolean;
}

export interface MigrationErrorWithMessage {
  message: string;
  [key: string]: any;
}

export type {
  LocalStorageSchema,
  ValidationResult,
  OnboardingData,
  WorkoutSession,
  MealLog,
  BodyMeasurement,
};
