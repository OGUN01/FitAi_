export { RealTimeSyncService } from "./RealTimeSyncService";
export { ConnectionMonitor } from "./connection-monitor";

export type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncError,
  SyncConflict,
  SyncOperation,
  DeltaSyncInfo,
  RemoteChange,
  ConflictResolution,
} from "./types";

export {
  SYNC_STATUS_KEY,
  SYNC_QUEUE_KEY,
  DELTA_SYNC_KEY,
  DEFAULT_SYNC_CONFIG,
  TABLES_TO_SYNC,
  TABLE_TO_STORAGE_KEY,
  CONNECTION_MONITOR_INTERVAL_MS,
  MAX_OPERATION_AGE_MS,
  CRITICAL_OPERATION_SYNC_DELAY_MS,
} from "./constants";

export {
  generateSyncId,
  generateOperationId,
  generateErrorId,
  chunkArray,
  calculateNextSyncTime,
} from "./utilities";

export {
  loadSyncStatus,
  saveSyncStatus,
  loadSyncQueue,
  saveSyncQueue,
  loadDeltaSyncInfo,
  saveDeltaSyncInfo,
} from "./persistence";

export {
  executeUploadOperation,
  uploadLocalChanges,
  fetchRemoteChanges,
  applyRemoteChange,
  downloadRemoteChanges,
  cleanupSyncQueue,
} from "./sync-operations";

export {
  getPendingConflicts,
  resolveConflict,
  resolveConflicts,
} from "./conflict-resolution";

import { RealTimeSyncService } from "./RealTimeSyncService";
export const realTimeSyncService = new RealTimeSyncService();
export default realTimeSyncService;
