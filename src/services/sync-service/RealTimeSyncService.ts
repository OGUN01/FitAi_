import { syncMutex } from "../syncMutex";
import type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncOperation,
  SyncError,
} from "./types";
import {
  DEFAULT_SYNC_CONFIG,
  CRITICAL_OPERATION_SYNC_DELAY_MS,
} from "./constants";
import {
  generateSyncId,
  generateOperationId,
  generateErrorId,
  calculateNextSyncTime,
} from "./utilities";
import {
  loadSyncStatus,
  saveSyncStatus,
  loadSyncQueue,
  saveSyncQueue,
} from "./persistence";
import {
  uploadLocalChanges,
  downloadRemoteChanges,
  cleanupSyncQueue,
} from "./sync-operations";
import { resolveConflicts } from "./conflict-resolution";
import { ConnectionMonitor } from "./connection-monitor";

export class RealTimeSyncService {
  private config: SyncConfig;
  private status: SyncStatus;
  private syncQueue: SyncOperation[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private statusCallbacks: ((status: SyncStatus) => void)[] = [];
  private resultCallbacks: ((result: SyncResult) => void)[] = [];
  private currentSyncId: string | null = null;
  private connectionMonitor: ConnectionMonitor;

  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };

    this.status = {
      isOnline: true,
      isSyncing: false,
      lastSyncTime: null,
      lastSyncResult: null,
      pendingChanges: 0,
      queuedOperations: 0,
      syncProgress: 0,
      nextSyncTime: null,
      connectionQuality: "good",
    };

    this.connectionMonitor = new ConnectionMonitor();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storedStatus = await loadSyncStatus(this.status);
      this.updateSyncStatus(storedStatus);

      this.syncQueue = await loadSyncQueue();
      this.updateSyncStatus({ queuedOperations: this.syncQueue.length });

      this.connectionMonitor.start((updates) => this.updateSyncStatus(updates));

      if (this.config.autoSyncEnabled) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log("Real-time sync service initialized");
    } catch (error) {
      console.error("Failed to initialize sync service:", error);
      throw error;
    }
  }

  async startSync(force = false): Promise<SyncResult> {
    return syncMutex.withLock(
      "RealTimeSyncService.startSync",
      async () => await this.startSyncInternal(force),
    );
  }

  private async startSyncInternal(force = false): Promise<SyncResult> {
    if (this.status.isSyncing && !force) {
      throw new Error("Sync is already in progress");
    }

    if (!this.status.isOnline) {
      throw new Error("Cannot sync while offline");
    }

    this.currentSyncId = generateSyncId();
    const startTime = new Date();

    try {
      this.updateSyncStatus({ isSyncing: true, syncProgress: 0 });

      const result = await this.executeSyncPhases();

      const endTime = new Date();
      const syncResult: SyncResult = {
        success: true,
        syncId: this.currentSyncId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        syncedItems: result.syncedItems,
        errors: result.errors,
        conflicts: result.conflicts,
        nextSyncTime: calculateNextSyncTime(this.config.syncIntervalMs),
      };

      this.updateSyncStatus({
        isSyncing: false,
        lastSyncTime: endTime,
        lastSyncResult: syncResult,
        syncProgress: 100,
        nextSyncTime: syncResult.nextSyncTime,
      });

      this.notifyResultCallbacks(syncResult);
      return syncResult;
    } catch (error) {
      const endTime = new Date();
      const syncResult: SyncResult = {
        success: false,
        syncId: this.currentSyncId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        syncedItems: { uploaded: 0, downloaded: 0, conflicts: 0, errors: 1 },
        errors: [
          {
            id: generateErrorId(),
            type: "unknown",
            message: error instanceof Error ? error.message : String(error),
            details: error,
            timestamp: new Date(),
            retryable: true,
            retryCount: 0,
          },
        ],
        conflicts: [],
        nextSyncTime: calculateNextSyncTime(this.config.syncIntervalMs),
      };

      this.updateSyncStatus({
        isSyncing: false,
        lastSyncResult: syncResult,
        syncProgress: 0,
        nextSyncTime: syncResult.nextSyncTime,
      });

      this.notifyResultCallbacks(syncResult);
      throw error;
    } finally {
      this.currentSyncId = null;
    }
  }

  async stop(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.connectionMonitor.stop();

    this.updateSyncStatus({ isSyncing: false });
    await saveSyncStatus(this.status);
    await saveSyncQueue(this.syncQueue);

    this.isInitialized = false;
    console.log("Real-time sync service stopped");
  }

  async queueOperation(
    operation: Omit<SyncOperation, "id" | "timestamp" | "retryCount">,
  ): Promise<void> {
    const syncOperation: SyncOperation = {
      id: generateOperationId(),
      timestamp: new Date(),
      retryCount: 0,
      ...operation,
    };

    this.syncQueue.push(syncOperation);
    this.updateSyncStatus({ queuedOperations: this.syncQueue.length });

    await saveSyncQueue(this.syncQueue);

    if (operation.priority === "critical" && this.config.autoSyncEnabled) {
      setTimeout(
        () => this.startSync().catch(console.error),
        CRITICAL_OPERATION_SYNC_DELAY_MS,
      );
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.syncIntervalMs && this.config.autoSyncEnabled) {
      this.startAutoSync();
    }
  }

  async forcSync(): Promise<SyncResult> {
    return this.startSync(true);
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  onSyncResult(callback: (result: SyncResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  private async executeSyncPhases(): Promise<{
    syncedItems: SyncResult["syncedItems"];
    errors: SyncError[];
    conflicts: SyncResult["conflicts"];
  }> {
    const syncedItems = { uploaded: 0, downloaded: 0, conflicts: 0, errors: 0 };
    const errors: SyncError[] = [];
    const conflicts: SyncResult["conflicts"] = [];

    try {
      this.updateSyncStatus({ syncProgress: 10 });
      const uploadResult = await uploadLocalChanges(
        this.syncQueue,
        this.config.batchSize,
      );
      syncedItems.uploaded = uploadResult.uploaded;
      errors.push(...uploadResult.errors);
      this.syncQueue = uploadResult.updatedQueue;
      this.updateSyncStatus({ syncProgress: 25 });

      const downloadResult = await downloadRemoteChanges();
      syncedItems.downloaded = downloadResult.downloaded;
      errors.push(...downloadResult.errors);
      this.updateSyncStatus({ syncProgress: 50 });

      const conflictResult = await resolveConflicts(
        this.syncQueue,
        this.config.conflictResolutionStrategy,
      );
      conflicts.push(...conflictResult.conflicts);
      syncedItems.conflicts = conflictResult.conflicts.length;
      this.updateSyncStatus({ syncProgress: 75 });

      this.syncQueue = cleanupSyncQueue(this.syncQueue);
      await saveSyncQueue(this.syncQueue);
      this.updateSyncStatus({
        syncProgress: 100,
        queuedOperations: this.syncQueue.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        id: generateErrorId(),
        type: "unknown",
        message: errorMessage,
        details: error,
        timestamp: new Date(),
        retryable: true,
        retryCount: 0,
      });
      syncedItems.errors = errors.length;
    }

    return { syncedItems, errors, conflicts };
  }

  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.syncTimer = setInterval(async () => {
      if (
        this.status.isOnline &&
        !this.status.isSyncing &&
        this.syncQueue.length > 0
      ) {
        try {
          await this.startSync();
        } catch (error) {
          console.error("Auto-sync failed:", error);
        }
      }
    }, this.config.syncIntervalMs);
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatusCallbacks(this.status);
  }

  private notifyStatusCallbacks(status: SyncStatus): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("Error in status callback:", error);
      }
    });
  }

  private notifyResultCallbacks(result: SyncResult): void {
    this.resultCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Error in result callback:", error);
      }
    });
  }
}
