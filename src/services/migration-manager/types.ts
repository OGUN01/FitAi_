// Type definitions for Migration Manager
// Extracted from migrationManager.ts for modular architecture

import { MigrationProgress, MigrationResult } from "../migration/types";

export interface MigrationManagerConfig {
  autoStartAfterAuth: boolean;
  showProgressUI: boolean;
  allowUserCancel: boolean;
  backgroundMigration: boolean;
}

export interface MigrationCheckpoint {
  migrationId: string;
  userId: string;
  currentStepIndex: number;
  currentStepName: string;
  completedSteps: string[];
  failedSteps: string[];
  startTime: string;
  lastCheckpointTime: string;
  status: "in_progress" | "interrupted" | "failed" | "rolled_back";
  backupCreated: boolean;
  errors: Array<{ step: string; message: string; timestamp: string }>;
}

export interface MigrationState {
  isActive: boolean;
  canStart: boolean;
  hasLocalData: boolean;
  hasIncompleteResumable: boolean;
  incompleteCheckpoint: MigrationCheckpoint | null;
  lastMigrationAttempt: Date | null;
  migrationHistory: MigrationAttempt[];
}

export interface MigrationAttempt {
  id: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
  dataCount: {
    workouts: number;
    meals: number;
    measurements: number;
  };
}

export interface CurrentMigration {
  progress: MigrationProgress | null;
  result: MigrationResult | null;
  unsubscribe: (() => void) | null;
}

// Re-export types from profileData
export type { MigrationProgress, MigrationResult };
