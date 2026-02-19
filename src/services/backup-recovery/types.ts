// Backup and Recovery Service Types
// Interfaces and type definitions for backup and recovery operations

import { LocalStorageSchema } from "../../types/localData";

export interface BackupConfig {
  enableAutoBackup: boolean;
  backupIntervalMs: number;
  maxLocalBackups: number;
  maxCloudBackups: number;
  enableCloudBackup: boolean;
  enableIncrementalBackup: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  backupRetentionDays: number;
}

export interface BackupMetadata {
  id: string;
  type: "full" | "incremental";
  location: "local" | "cloud" | "both";
  createdAt: Date;
  size: number; // bytes
  checksum: string;
  version: string;
  deviceId: string;
  userId: string;
  description: string;
  dataTypes: string[];
  isEncrypted: boolean;
  isCompressed: boolean;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: LocalStorageSchema;
  incrementalChanges?: IncrementalChange[];
}

export interface IncrementalChange {
  id: string;
  type: "create" | "update" | "delete";
  table: string;
  recordId: string;
  timestamp: Date;
  data?: any;
  previousData?: any;
}

export interface RecoveryOptions {
  backupId: string;
  recoveryType: "full" | "selective";
  selectedDataTypes?: string[];
  mergeStrategy: "replace" | "merge" | "skip_existing";
  validateData: boolean;
  createRecoveryPoint: boolean;
}

export interface RecoveryResult {
  success: boolean;
  recoveryId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  recoveredItems: {
    users: number;
    workouts: number;
    meals: number;
    progress: number;
    total: number;
  };
  errors: RecoveryError[];
  warnings: string[];
  backupInfo: BackupMetadata;
}

export interface RecoveryError {
  id: string;
  type: "validation" | "conflict" | "corruption" | "permission" | "unknown";
  message: string;
  details: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface BackupStatus {
  isBackingUp: boolean;
  lastBackupTime: Date | null;
  lastBackupResult: BackupResult | null;
  nextBackupTime: Date | null;
  availableBackups: BackupMetadata[];
  totalBackupSize: number;
  backupHealth: "excellent" | "good" | "warning" | "critical";
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  type: "full" | "incremental";
  location: "local" | "cloud" | "both";
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  errors: BackupError[];
  warnings: string[];
}

export interface BackupError {
  id: string;
  type:
    | "storage"
    | "network"
    | "encryption"
    | "compression"
    | "validation"
    | "unknown";
  message: string;
  details: any;
  timestamp: Date;
  retryable: boolean;
}
