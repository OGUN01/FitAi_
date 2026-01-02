/**
 * Enhanced Profile Data Types with Versioning and Sync Support
 * Designed for 100% data accuracy and seamless local-remote synchronization
 *
 * ✅ CRITICAL: This file does NOT define PersonalInfo, FitnessGoals, DietPreferences, or WorkoutPreferences
 * Those core types are imported from user.ts to maintain a single source of truth
 * This file only adds sync-related metadata and utility types
 */

import type {
  PersonalInfo as BasePersonalInfo,
  FitnessGoals as BaseFitnessGoals,
  DietPreferences as BaseDietPreferences,
  WorkoutPreferences as BaseWorkoutPreferences,
  BodyMetrics,
} from './user';

// ============================================================================
// CORE TYPE RE-EXPORTS (Single source of truth from user.ts)
// ============================================================================
export type PersonalInfo = BasePersonalInfo;
export type FitnessGoals = BaseFitnessGoals;
export type DietPreferences = BaseDietPreferences;
export type WorkoutPreferences = BaseWorkoutPreferences;
export type { BodyMetrics } from './user';

// ============================================================================
// SYNC METADATA (Profile data management specific)
// ============================================================================

// Base interface for all data with sync metadata
export interface SyncableData {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  source: 'local' | 'remote' | 'merged';
}

// Body Analysis Data with progress tracking
export interface BodyAnalysis extends SyncableData {
  photos: {
    front?: string;
    side?: string;
    back?: string;
  };
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  bodyFatPercentage?: number;
  muscleMass?: number;
  bmi?: number;
  analysisDate: string;
  aiAnalysisResults?: {
    bodyType?: string;
    recommendations?: string[];
    progressNotes?: string;
  };
}

// Comprehensive User Profile with all data
export interface UserProfile extends SyncableData {
  userId: string;
  personalInfo?: PersonalInfo;
  fitnessGoals?: FitnessGoals;
  dietPreferences?: DietPreferences;
  workoutPreferences?: WorkoutPreferences;
  bodyAnalysis?: BodyAnalysis[];
  onboardingCompleted: boolean;
  profileCompleteness: number; // 0-100%
  lastActiveAt: string;
}

// ============================================================================
// DATA VALIDATION
// ============================================================================
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataValidationSchema {
  validatePersonalInfo(data: Partial<PersonalInfo>): ValidationResult;
  validateFitnessGoals(data: Partial<FitnessGoals>): ValidationResult;
  validateDietPreferences(data: Partial<DietPreferences>): ValidationResult;
  validateWorkoutPreferences(data: Partial<WorkoutPreferences>): ValidationResult;
  validateUserProfile(data: Partial<UserProfile>): ValidationResult;
}

// ============================================================================
// SYNC AND CONFLICT RESOLUTION
// ============================================================================
export interface SyncConflict {
  id: string;
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: string;
  remoteTimestamp: string;
  conflictType: 'value_mismatch' | 'version_conflict' | 'deletion_conflict';
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'use_local' | 'use_remote' | 'merge' | 'manual';
  mergedValue?: any;
  userChoice?: boolean;
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================
export interface StorageOperation {
  type: 'create' | 'update' | 'delete' | 'sync';
  dataType:
    | 'personalInfo'
    | 'fitnessGoals'
    | 'dietPreferences'
    | 'workoutPreferences'
    | 'bodyAnalysis'
    | 'userProfile';
  data: any;
  timestamp: string;
  userId?: string;
}

export interface StorageQueue {
  operations: StorageOperation[];
  isProcessing: boolean;
  lastProcessedAt?: string;
}

// ============================================================================
// MIGRATION
// ============================================================================
export interface MigrationStatus {
  isInProgress: boolean;
  progress: number; // 0-100%
  currentStep: string;
  step?: string; // Alternative name for currentStep (for compatibility)
  totalSteps: number;
  completedSteps: number;
  errors: string[];
  message?: string; // Status message
  isComplete?: boolean; // Whether migration is complete
  hasErrors?: boolean; // Whether there are errors
  startedAt?: string;
  completedAt?: string;
}

// Alias for backward compatibility
export type MigrationProgress = MigrationStatus;

export interface MigrationResult {
  success: boolean;
  migratedData: {
    personalInfo?: boolean;
    fitnessGoals?: boolean;
    dietPreferences?: boolean;
    workoutPreferences?: boolean;
    bodyAnalysis?: boolean;
    advancedReview?: boolean;
  };
  conflicts: SyncConflict[];
  errors: string[];
  warnings?: string[];
  duration: number; // in milliseconds
}

// ============================================================================
// EDIT CONTEXT
// ============================================================================
export interface EditContextData {
  isEditMode: boolean;
  editSection: 'personalInfo' | 'fitnessGoals' | 'dietPreferences' | 'workoutPreferences' | null;
  originalData: any;
  currentData: any;
  hasChanges: boolean;
  validationErrors: string[];
}

export interface EditActions {
  startEdit: (section: string, data: any) => void;
  updateData: (data: any) => void;
  saveChanges: () => Promise<boolean>;
  cancelEdit: () => void;
  validateData: () => ValidationResult;
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================
export interface StorageConfig {
  enableLocalStorage: boolean;
  enableRemoteStorage: boolean;
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  enableConflictResolution: boolean;
  enableOfflineQueue: boolean;
}
