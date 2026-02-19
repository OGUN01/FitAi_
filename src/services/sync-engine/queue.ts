import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncMutex } from "../syncMutex";
import {
  conflictResolutionService,
  ConflictContext,
} from "../conflictResolution";
import { supabase } from "../supabase";
import { SyncOperation, SyncResult, DataType, TableMapping } from "./types";
import { QUEUE_STORAGE_KEY, MAX_RETRIES, BASE_DELAY_MS } from "./constants";
import { generateOperationId, sleep } from "./utils";

export class QueueManager {
  private queue: SyncOperation[] = [];
  private isSyncing: boolean = false;

  private executeOperation?: (operation: SyncOperation) => Promise<void>;

  constructor(executeOperation?: (operation: SyncOperation) => Promise<void>) {
    this.executeOperation = executeOperation;
  }

  async queueOperation(
    type: DataType,
    data: any,
    userId: string,
    processQueue: () => void,
    isOnline: boolean,
  ): Promise<void> {
    if (!userId) {
      console.warn("[SyncEngine] Cannot queue operation: No user ID");
      return;
    }

    const operation: SyncOperation = {
      id: generateOperationId(),
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      userId,
      status: "pending",
    };

    console.log(`[SyncEngine] Queueing operation: ${type}`);

    this.queue.push(operation);
    await this.saveQueue();

    if (isOnline && !this.isSyncing) {
      processQueue();
    }
  }

  async processQueue(
    isOnline: boolean,
    setLastSyncAt: (timestamp: string) => Promise<void>,
  ): Promise<SyncResult> {
    return syncMutex.withLock(
      "SyncEngine.processQueue",
      async () => await this.processQueueInternal(isOnline, setLastSyncAt),
    );
  }

  private async processQueueInternal(
    isOnline: boolean,
    setLastSyncAt: (timestamp: string) => Promise<void>,
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log("[SyncEngine] Already syncing, skipping...");
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ["Already syncing"],
      };
    }

    if (!isOnline) {
      console.log("[SyncEngine] Offline, cannot process queue");
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ["Offline"],
      };
    }

    if (this.queue.length === 0) {
      console.log("[SyncEngine] Queue is empty");
      return { success: true, syncedItems: 0, failedItems: 0, errors: [] };
    }

    this.isSyncing = true;
    console.log(
      `[SyncEngine] Processing queue (${this.queue.length} operations)...`,
    );

    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: [],
    };

    const completedIds: string[] = [];

    for (const operation of this.queue) {
      if (operation.status === "processing") {
        continue;
      }

      operation.status = "processing";

      try {
        await this.executeOperationWithConflictResolution(operation);
        completedIds.push(operation.id);
        result.syncedItems++;
        console.log(`[SyncEngine] Operation completed: ${operation.type}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        operation.error = errorMessage;
        operation.retryCount++;

        if (operation.retryCount >= MAX_RETRIES) {
          operation.status = "failed";
          result.failedItems++;
          result.errors.push(`${operation.type}: ${errorMessage}`);
          completedIds.push(operation.id);
          console.error(
            `[SyncEngine] Operation failed after ${MAX_RETRIES} retries: ${operation.type}`,
          );
        } else {
          operation.status = "pending";
          console.warn(
            `[SyncEngine] Operation failed, will retry (${operation.retryCount}/${MAX_RETRIES}): ${operation.type}`,
          );
        }
      }
    }

    this.queue = this.queue.filter((op) => !completedIds.includes(op.id));
    await this.saveQueue();

    await setLastSyncAt(new Date().toISOString());

    this.isSyncing = false;
    result.success = result.failedItems === 0;

    console.log(
      `[SyncEngine] Queue processing complete. Synced: ${result.syncedItems}, Failed: ${result.failedItems}`,
    );
    return result;
  }

  private async executeOperationWithConflictResolution(
    operation: SyncOperation,
  ): Promise<void> {
    const { type, data, userId, retryCount } = operation;

    if (retryCount > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
      console.log(`[SyncEngine] Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }

    let resolvedData = data;
    try {
      const { data: remoteData, updatedAt: remoteUpdatedAt } =
        await this.fetchRemoteData(type, userId);

      if (remoteData && Object.keys(remoteData).length > 0) {
        const localUpdatedAt = data.updated_at
          ? new Date(data.updated_at)
          : new Date(operation.timestamp);

        const context: ConflictContext = {
          tableName: type,
          recordId: userId,
          userId,
          lastModified: {
            local: localUpdatedAt,
            remote: remoteUpdatedAt || new Date(0),
          },
        };

        const conflicts = conflictResolutionService.detectConflicts(
          data,
          remoteData,
          context,
        );

        if (conflicts.length > 0) {
          console.log(
            `[SyncEngine] Detected ${conflicts.length} conflicts for ${type}, resolving with last-write-wins...`,
          );

          conflictResolutionService.registerResolutionRule(
            ".*",
            () => "use_latest_timestamp",
          );

          const resolution =
            await conflictResolutionService.resolveConflicts(conflicts);

          if (resolution.unresolvedConflicts.length > 0) {
            console.warn(
              `[SyncEngine] ${resolution.unresolvedConflicts.length} conflicts could not be auto-resolved for ${type}`,
            );
          }

          resolvedData = {
            ...data,
            ...resolution.mergedData,
            updated_at: new Date().toISOString(),
          };

          console.log(
            `[SyncEngine] Resolved ${resolution.summary.autoResolved} conflicts automatically`,
          );
        }
      }
    } catch (conflictError) {
      console.warn(
        `[SyncEngine] Conflict detection failed for ${type}, proceeding with original data:`,
        conflictError instanceof Error
          ? conflictError.message
          : "Unknown error",
      );
    }

    if (this.executeOperation) {
      await this.executeOperation({ ...operation, data: resolvedData });
    }
  }

  private async fetchRemoteData(
    type: DataType,
    userId: string,
  ): Promise<{ data: any; updatedAt: Date | null }> {
    const tableMap: Record<DataType, TableMapping> = {
      personalInfo: { table: "profiles", idField: "id" },
      dietPreferences: { table: "diet_preferences", idField: "user_id" },
      bodyAnalysis: { table: "body_analysis", idField: "user_id" },
      workoutPreferences: { table: "workout_preferences", idField: "user_id" },
      advancedReview: { table: "advanced_review", idField: "user_id" },
    };

    const { table, idField } = tableMap[type];
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(idField, userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.warn(
        `[SyncEngine] Failed to fetch remote data for ${type}:`,
        error.message,
      );
    }

    const updatedAt = data?.updated_at ? new Date(data.updated_at) : null;
    return { data: data || {}, updatedAt };
  }

  async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
        console.log(
          `[SyncEngine] Loaded ${this.queue.length} operations from storage`,
        );
      }
    } catch (error) {
      console.error("[SyncEngine] Failed to load queue:", error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("[SyncEngine] Failed to save queue:", error);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  setIsSyncing(value: boolean): void {
    this.isSyncing = value;
  }
}
