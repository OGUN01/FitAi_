// Real-time Sync Service for Track B Infrastructure
// Provides bidirectional data synchronization with Supabase and intelligent sync scheduling

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

// Storage keys for sync service
const SYNC_STATUS_KEY = "@fitai_sync_status";
const SYNC_QUEUE_KEY = "@fitai_sync_queue";
const DELTA_SYNC_KEY = "@fitai_delta_sync";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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

// ============================================================================
// REAL-TIME SYNC SERVICE
// ============================================================================

export class RealTimeSyncService {
  private config: SyncConfig;
  private status: SyncStatus;
  private syncQueue: SyncOperation[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private statusCallbacks: ((status: SyncStatus) => void)[] = [];
  private resultCallbacks: ((result: SyncResult) => void)[] = [];
  private currentSyncId: string | null = null;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      autoSyncEnabled: true,
      syncIntervalMs: 30000, // 30 seconds
      maxRetries: 3,
      retryDelayMs: 5000,
      batchSize: 50,
      conflictResolutionStrategy: "auto",
      enableDeltaSync: true,
      enableBackgroundSync: true,
      ...config,
    };

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
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load sync status from storage
      await this.loadSyncStatus();

      // Load pending operations
      await this.loadSyncQueue();

      // Start connection monitoring
      this.startConnectionMonitoring();

      // Start auto-sync if enabled
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

  /**
   * Start manual sync
   */
  async startSync(force = false): Promise<SyncResult> {
    if (this.status.isSyncing && !force) {
      throw new Error("Sync is already in progress");
    }

    if (!this.status.isOnline) {
      throw new Error("Cannot sync while offline");
    }

    this.currentSyncId = this.generateSyncId();
    const startTime = new Date();

    try {
      this.updateSyncStatus({ isSyncing: true, syncProgress: 0 });

      // Execute sync phases
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
        nextSyncTime: this.calculateNextSyncTime(),
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
            id: this.generateErrorId(),
            type: "unknown",
            message: error instanceof Error ? error.message : String(error),
            details: error,
            timestamp: new Date(),
            retryable: true,
            retryCount: 0,
          },
        ],
        conflicts: [],
        nextSyncTime: this.calculateNextSyncTime(),
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

  /**
   * Stop sync service
   */
  async stop(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.connectionMonitorTimer) {
      clearInterval(this.connectionMonitorTimer);
      this.connectionMonitorTimer = null;
    }

    this.updateSyncStatus({ isSyncing: false });
    await this.saveSyncStatus();
    await this.saveSyncQueue();

    this.isInitialized = false;
    console.log("Real-time sync service stopped");
  }

  /**
   * Queue a sync operation
   */
  async queueOperation(
    operation: Omit<SyncOperation, "id" | "timestamp" | "retryCount">,
  ): Promise<void> {
    const syncOperation: SyncOperation = {
      id: this.generateOperationId(),
      timestamp: new Date(),
      retryCount: 0,
      ...operation,
    };

    this.syncQueue.push(syncOperation);
    this.updateSyncStatus({ queuedOperations: this.syncQueue.length });

    // Save queue to storage
    await this.saveSyncQueue();

    // Trigger immediate sync for critical operations
    if (operation.priority === "critical" && this.config.autoSyncEnabled) {
      setTimeout(() => this.startSync().catch(console.error), 1000);
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Update sync configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto-sync if interval changed
    if (newConfig.syncIntervalMs && this.config.autoSyncEnabled) {
      this.startAutoSync();
    }
  }

  /**
   * Force immediate sync
   */
  async forcSync(): Promise<SyncResult> {
    return this.startSync(true);
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to sync status updates
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to sync result updates
   */
  onSyncResult(callback: (result: SyncResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeSyncPhases(): Promise<{
    syncedItems: SyncResult["syncedItems"];
    errors: SyncError[];
    conflicts: SyncConflict[];
  }> {
    const syncedItems = { uploaded: 0, downloaded: 0, conflicts: 0, errors: 0 };
    const errors: SyncError[] = [];
    const conflicts: SyncConflict[] = [];

    try {
      // Phase 1: Upload local changes (25%)
      this.updateSyncStatus({ syncProgress: 10 });
      const uploadResult = await this.uploadLocalChanges();
      syncedItems.uploaded = uploadResult.uploaded;
      errors.push(...uploadResult.errors);
      this.updateSyncStatus({ syncProgress: 25 });

      // Phase 2: Download remote changes (50%)
      const downloadResult = await this.downloadRemoteChanges();
      syncedItems.downloaded = downloadResult.downloaded;
      errors.push(...downloadResult.errors);
      this.updateSyncStatus({ syncProgress: 50 });

      // Phase 3: Resolve conflicts (75%)
      const conflictResult = await this.resolveConflicts();
      conflicts.push(...conflictResult.conflicts);
      syncedItems.conflicts = conflictResult.conflicts.length;
      this.updateSyncStatus({ syncProgress: 75 });

      // Phase 4: Cleanup and finalize (100%)
      await this.cleanupSyncQueue();
      this.updateSyncStatus({ syncProgress: 100 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        id: this.generateErrorId(),
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

  private async uploadLocalChanges(): Promise<{
    uploaded: number;
    errors: SyncError[];
  }> {
    const errors: SyncError[] = [];
    let uploaded = 0;

    try {
      // Process queued operations in batches
      const batches = this.chunkArray(this.syncQueue, this.config.batchSize);

      for (const batch of batches) {
        for (const operation of batch) {
          try {
            await this.executeUploadOperation(operation);
            uploaded++;

            // Remove successful operation from queue
            const index = this.syncQueue.indexOf(operation);
            if (index > -1) {
              this.syncQueue.splice(index, 1);
            }
          } catch (error) {
            operation.retryCount++;
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              id: this.generateErrorId(),
              type: "network",
              message: `Failed to upload ${operation.type} operation: ${errorMessage}`,
              details: { operation, error },
              timestamp: new Date(),
              retryable: operation.retryCount < operation.maxRetries,
              retryCount: operation.retryCount,
            });
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        id: this.generateErrorId(),
        type: "unknown",
        message: `Upload phase failed: ${errorMessage}`,
        details: error,
        timestamp: new Date(),
        retryable: true,
        retryCount: 0,
      });
    }

    return { uploaded, errors };
  }

  private async downloadRemoteChanges(): Promise<{
    downloaded: number;
    errors: SyncError[];
  }> {
    const errors: SyncError[] = [];
    let downloaded = 0;

    try {
      // Get delta sync info
      const deltaInfo = await this.getDeltaSyncInfo();

      // Download changes since last sync
      const remoteChanges = await this.fetchRemoteChanges(deltaInfo);

      for (const change of remoteChanges) {
        try {
          await this.applyRemoteChange(change);
          downloaded++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({
            id: this.generateErrorId(),
            type: "validation",
            message: `Failed to apply remote change: ${errorMessage}`,
            details: { change, error },
            timestamp: new Date(),
            retryable: true,
            retryCount: 0,
          });
        }
      }

      // Update delta sync info
      await this.updateDeltaSyncInfo(deltaInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        id: this.generateErrorId(),
        type: "network",
        message: `Download phase failed: ${errorMessage}`,
        details: error,
        timestamp: new Date(),
        retryable: true,
        retryCount: 0,
      });
    }

    return { downloaded, errors };
  }

  private async resolveConflicts(): Promise<{ conflicts: SyncConflict[] }> {
    const conflicts: SyncConflict[] = [];

    try {
      // Get pending conflicts
      const pendingConflicts = await this.getPendingConflicts();

      for (const conflict of pendingConflicts) {
        try {
          const resolution = await this.resolveConflict(conflict);
          conflicts.push({
            ...conflict,
            resolvedValue: resolution.resolvedValue,
            resolution:
              resolution.strategy === "user_choice" ? "manual" : "auto",
          });
        } catch (error) {
          conflicts.push({
            ...conflict,
            resolution: "pending",
          });
        }
      }
    } catch (error) {
      console.error("Conflict resolution phase failed:", error);
    }

    return { conflicts };
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

  private connectionMonitorTimer: NodeJS.Timeout | null = null;

  private startConnectionMonitoring(): void {
    // Monitor network connectivity
    // This would be implemented with actual network monitoring
    if (this.connectionMonitorTimer) {
      clearInterval(this.connectionMonitorTimer);
    }

    this.connectionMonitorTimer = setInterval(() => {
      this.updateConnectionStatus();
    }, 5000);
  }

  private updateConnectionStatus(): void {
    // Simulate connection quality assessment
    // In real implementation, this would check actual network conditions
    const isOnline = Math.random() > 0.1; // 90% online simulation
    const quality = isOnline ? "good" : "offline";

    this.updateSyncStatus({
      isOnline,
      connectionQuality: quality as any,
    });
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

  // Utility methods
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateNextSyncTime(): Date {
    return new Date(Date.now() + this.config.syncIntervalMs);
  }

  // ============================================================================
  // PERSISTENCE METHODS - Load/Save sync state to AsyncStorage
  // ============================================================================

  private async loadSyncStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.status = {
          ...this.status,
          lastSyncTime: parsed.lastSyncTime
            ? new Date(parsed.lastSyncTime)
            : null,
          lastSyncResult: parsed.lastSyncResult
            ? {
                ...parsed.lastSyncResult,
                startTime: new Date(parsed.lastSyncResult.startTime),
                endTime: new Date(parsed.lastSyncResult.endTime),
                nextSyncTime: new Date(parsed.lastSyncResult.nextSyncTime),
              }
            : null,
          nextSyncTime: parsed.nextSyncTime
            ? new Date(parsed.nextSyncTime)
            : null,
        };
        console.log("✅ Loaded sync status from storage");
      }
    } catch (error) {
      console.error("Failed to load sync status:", error);
    }
  }

  private async saveSyncStatus(): Promise<void> {
    try {
      const toStore = {
        lastSyncTime: this.status.lastSyncTime?.toISOString() || null,
        lastSyncResult: this.status.lastSyncResult
          ? {
              ...this.status.lastSyncResult,
              startTime: this.status.lastSyncResult.startTime.toISOString(),
              endTime: this.status.lastSyncResult.endTime.toISOString(),
              nextSyncTime:
                this.status.lastSyncResult.nextSyncTime.toISOString(),
            }
          : null,
        nextSyncTime: this.status.nextSyncTime?.toISOString() || null,
      };
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(toStore));
      console.log("✅ Saved sync status to storage");
    } catch (error) {
      console.error("Failed to save sync status:", error);
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.syncQueue = parsed.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
        this.updateSyncStatus({ queuedOperations: this.syncQueue.length });
        console.log(`✅ Loaded ${this.syncQueue.length} queued operations`);
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      const toStore = this.syncQueue.map((op) => ({
        ...op,
        timestamp: op.timestamp.toISOString(),
      }));
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }

  // ============================================================================
  // SYNC OPERATIONS - Execute uploads/downloads with Supabase
  // ============================================================================

  private async executeUploadOperation(
    operation: SyncOperation,
  ): Promise<void> {
    const { type, table, recordId, data } = operation;

    console.log(`📤 Executing ${type} on ${table}:${recordId}`);

    switch (type) {
      case "create":
        const { error: createError } = await supabase.from(table).insert(data);
        if (createError) throw new Error(createError.message);
        break;

      case "update":
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq("id", recordId);
        if (updateError) throw new Error(updateError.message);
        break;

      case "delete":
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("id", recordId);
        if (deleteError) throw new Error(deleteError.message);
        break;
    }

    console.log(`✅ Successfully executed ${type} on ${table}:${recordId}`);
  }

  private async getDeltaSyncInfo(): Promise<DeltaSyncInfo> {
    try {
      const stored = await AsyncStorage.getItem(DELTA_SYNC_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          lastSyncTimestamp: new Date(parsed.lastSyncTimestamp),
          syncVersion: parsed.syncVersion || 1,
          checksums: parsed.checksums || {},
        };
      }
    } catch (error) {
      console.error("Failed to load delta sync info:", error);
    }

    // Default: sync everything from the beginning
    return {
      lastSyncTimestamp: new Date(0),
      syncVersion: 1,
      checksums: {},
    };
  }

  private async fetchRemoteChanges(deltaInfo: DeltaSyncInfo): Promise<any[]> {
    const changes: any[] = [];
    const lastSync = deltaInfo.lastSyncTimestamp.toISOString();

    // Tables to sync - these are the main data tables in FitAI
    const tablesToSync = [
      "workout_sessions",
      "meal_logs",
      "weight_logs",
      "hydration_logs",
      "user_achievements",
      "analytics_metrics",
    ];

    for (const table of tablesToSync) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .gt("updated_at", lastSync)
          .order("updated_at", { ascending: true });

        if (error) {
          console.warn(`⚠️ Failed to fetch changes from ${table}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          changes.push(
            ...data.map((record) => ({
              table,
              record,
              type: "remote_update",
            })),
          );
          console.log(`📥 Found ${data.length} changes in ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching from ${table}:`, error);
      }
    }

    console.log(`📥 Total remote changes: ${changes.length}`);
    return changes;
  }

  private async applyRemoteChange(change: any): Promise<void> {
    const { table, record } = change;

    // Use AsyncStorage directly for sync operations (enhancedLocalStorage is for encrypted backups only)
    // Map table names to local storage keys
    const tableToStorageKey: Record<string, string> = {
      workout_sessions: "@fitai_workout_history",
      meal_logs: "@fitai_meal_logs",
      weight_logs: "@fitai_weight_logs",
      hydration_logs: "@fitai_hydration_logs",
      user_achievements: "@fitai_achievements",
      analytics_metrics: "@fitai_analytics",
    };

    const storageKey = tableToStorageKey[table];
    if (storageKey) {
      try {
        // Load existing data
        const existingJson = await AsyncStorage.getItem(storageKey);
        const existing = existingJson ? JSON.parse(existingJson) : [];
        const history = Array.isArray(existing) ? existing : [];

        // Merge the record
        const index = history.findIndex((item: any) => item.id === record.id);
        if (index >= 0) {
          history[index] = { ...history[index], ...record };
        } else {
          history.push(record);
        }

        // Save back to storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(history));
        console.log(`✅ Applied remote change to ${table}:${record.id}`);
      } catch (error) {
        console.error(`Failed to apply change to ${table}:`, error);
        throw error;
      }
    }
  }

  private async updateDeltaSyncInfo(deltaInfo: DeltaSyncInfo): Promise<void> {
    try {
      const toStore = {
        lastSyncTimestamp: new Date().toISOString(),
        syncVersion: deltaInfo.syncVersion + 1,
        checksums: deltaInfo.checksums,
      };
      await AsyncStorage.setItem(DELTA_SYNC_KEY, JSON.stringify(toStore));
      console.log("✅ Updated delta sync info");
    } catch (error) {
      console.error("Failed to update delta sync info:", error);
    }
  }

  private async getPendingConflicts(): Promise<SyncConflict[]> {
    // For now, use the conflict resolution service to get pending conflicts
    // In a full implementation, this would query a conflicts table or local storage
    try {
      // Check for any queued operations that might conflict
      const conflicts: SyncConflict[] = [];

      for (const operation of this.syncQueue) {
        // Check if remote has a newer version
        try {
          const { data } = await supabase
            .from(operation.table)
            .select("*")
            .eq("id", operation.recordId)
            .single();

          if (data && new Date(data.updated_at) > operation.timestamp) {
            // Potential conflict detected
            conflicts.push({
              id: `conflict_${operation.id}`,
              table: operation.table,
              recordId: operation.recordId,
              field: "*", // All fields
              localValue: operation.data,
              remoteValue: data,
              resolution: "pending",
              timestamp: new Date(),
            });
          }
        } catch {
          // No conflict if record doesn't exist remotely
        }
      }

      return conflicts;
    } catch (error) {
      console.error("Failed to get pending conflicts:", error);
      return [];
    }
  }

  private async resolveConflict(conflict: SyncConflict): Promise<any> {
    // Implement conflict resolution based on configured strategy
    // This is a simplified version - the full conflictResolutionService has a private method
    const strategy = this.config.conflictResolutionStrategy;

    let resolvedValue: any;
    let appliedStrategy: string;

    switch (strategy) {
      case "local_wins":
        resolvedValue = conflict.localValue;
        appliedStrategy = "local_wins";
        break;

      case "remote_wins":
        resolvedValue = conflict.remoteValue;
        appliedStrategy = "remote_wins";
        break;

      case "auto":
        // Use timestamp-based resolution for auto mode
        const localTimestamp =
          conflict.localValue?.updated_at || conflict.localValue?.created_at;
        const remoteTimestamp =
          conflict.remoteValue?.updated_at || conflict.remoteValue?.created_at;

        if (localTimestamp && remoteTimestamp) {
          const localDate = new Date(localTimestamp);
          const remoteDate = new Date(remoteTimestamp);
          resolvedValue =
            localDate > remoteDate ? conflict.localValue : conflict.remoteValue;
          appliedStrategy =
            localDate > remoteDate
              ? "use_latest_timestamp_local"
              : "use_latest_timestamp_remote";
        } else {
          // Default to local if timestamps unavailable
          resolvedValue = conflict.localValue;
          appliedStrategy = "local_wins_default";
        }
        break;

      case "manual":
      default:
        // For manual resolution, prefer local but flag for review
        resolvedValue = conflict.localValue;
        appliedStrategy = "pending_user_review";
        break;
    }

    console.log(
      `🔄 Resolved conflict for ${conflict.table}:${conflict.recordId} using ${appliedStrategy}`,
    );

    return {
      resolvedValue,
      strategy: appliedStrategy,
    };
  }

  private async cleanupSyncQueue(): Promise<void> {
    // Remove completed/expired operations
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.syncQueue = this.syncQueue.filter((op) => {
      const age = now.getTime() - op.timestamp.getTime();
      const expired = age > maxAge;
      const maxRetriesReached = op.retryCount >= op.maxRetries;

      if (expired || maxRetriesReached) {
        console.log(
          `🗑️ Removing ${expired ? "expired" : "failed"} operation: ${op.id}`,
        );
        return false;
      }
      return true;
    });

    // Save updated queue
    await this.saveSyncQueue();
    this.updateSyncStatus({ queuedOperations: this.syncQueue.length });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const realTimeSyncService = new RealTimeSyncService();
export default realTimeSyncService;
