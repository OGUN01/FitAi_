// Real-time Sync Service Types and Interfaces

export interface SyncConfig {
  autoSyncEnabled: boolean;
  syncIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  conflictResolutionStrategy: "auto" | "manual" | "local_wins" | "remote_wins";
  enableDeltaSync: boolean;
  enableBackgroundSync: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
  pendingChanges: number;
  queuedOperations: number;
  syncProgress: number; // 0-100
  nextSyncTime: Date | null;
  connectionQuality: "excellent" | "good" | "poor" | "offline";
}

export interface SyncResult {
  success: boolean;
  syncId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  syncedItems: {
    uploaded: number;
    downloaded: number;
    conflicts: number;
    errors: number;
  };
  errors: SyncError[];
  conflicts: SyncConflict[];
  nextSyncTime: Date;
}

export interface SyncError {
  id: string;
  type:
    | "network"
    | "validation"
    | "conflict"
    | "permission"
    | "quota"
    | "unknown";
  message: string;
  details: any;
  timestamp: Date;
  retryable: boolean;
  retryCount: number;
}

export interface SyncConflict {
  id: string;
  table: string;
  recordId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  resolvedValue?: any;
  resolution: "pending" | "auto" | "manual";
  timestamp: Date;
}

export interface SyncOperation {
  id: string;
  type: "create" | "update" | "delete";
  table: string;
  recordId: string;
  data: any;
  timestamp: Date;
  priority: "low" | "normal" | "high" | "critical";
  retryCount: number;
  maxRetries: number;
}

export interface DeltaSyncInfo {
  lastSyncTimestamp: Date;
  syncVersion: number;
  checksums: Record<string, string>;
}

export interface RemoteChange {
  table: string;
  record: any;
  type: "remote_update";
}

export interface ConflictResolution {
  resolvedValue: any;
  strategy: string;
}
