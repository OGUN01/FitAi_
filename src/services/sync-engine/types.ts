/**
 * Type definitions for SyncEngine
 */

export type DataType =
  | "personalInfo"
  | "dietPreferences"
  | "bodyAnalysis"
  | "workoutPreferences"
  | "advancedReview";

export interface SyncOperation {
  id: string;
  type: DataType;
  data: any;
  timestamp: string;
  retryCount: number;
  userId: string;
  status: "pending" | "processing" | "failed";
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  userId: string | null;
  queueLength: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

export interface TableMapping {
  table: string;
  idField: string;
}
