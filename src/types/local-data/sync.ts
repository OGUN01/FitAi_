// Sync and Metadata Types
// Types for sync status and metadata used across all local data entities

export enum SyncStatus {
  SYNCED = "synced",
  PENDING = "pending",
  FAILED = "failed",
  CONFLICT = "conflict",
}

export interface SyncMetadata {
  lastSyncedAt?: string;
  lastModifiedAt: string;
  syncVersion: number;
  deviceId: string;
  conflictResolution?: "local" | "remote" | "manual";
}
