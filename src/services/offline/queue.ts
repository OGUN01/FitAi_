import { OfflineAction, SyncResult } from "./types";
import { StorageManager } from "./storage";
import { executeAction } from "./actions";
import { RollbackManager } from "./rollback";
import * as crypto from "expo-crypto";

// Mirrors the exponential backoff used by the sibling flat module
// (src/services/offline.ts) so a persistently-failing action (bad FK,
// constraint violation) doesn't get hammered on every syncOfflineActions()
// call and burn through maxRetries within seconds of a flapping connection.
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

function computeBackoffMs(retryCount: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, retryCount - 1), MAX_RETRY_DELAY_MS);
}

export class QueueManager {
  private syncInProgress: boolean = false;
  private lastSyncAttempt: number | null = null;

  constructor(
    private storage: StorageManager,
    private rollback: RollbackManager,
  ) {}

  async queueAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): Promise<string> {
    // Dedup: if an UPDATE for the same table+record is already queued, replace its
    // payload instead of stacking a redundant entry (last-write-wins semantics).
    if (action.type === "UPDATE" && action.data?.id) {
      const queue = this.storage.getSyncQueue();
      const existingIndex = queue.findIndex(
        (a) => a.type === "UPDATE" && a.table === action.table && a.data?.id === action.data.id,
      );
      if (existingIndex !== -1) {
        queue[existingIndex].data = action.data;
        queue[existingIndex].timestamp = Date.now();
        this.storage.setSyncQueue(queue);
        await this.storage.saveData();
        return queue[existingIndex].id;
      }
    }

    // Dedup: skip duplicate CREATE for the same entity (double-tap offline guard).
    if (action.type === "CREATE" && action.data?.id) {
      const queue = this.storage.getSyncQueue();
      const existing = queue.find(
        (a) => a.type === "CREATE" && a.table === action.table && a.data?.id === action.data.id,
      );
      if (existing) {
        return existing.id;
      }
    }

    // Dedup: skip duplicate DELETE for the same entity.
    if (action.type === "DELETE" && action.data?.id) {
      const queue = this.storage.getSyncQueue();
      const existing = queue.find(
        (a) => a.type === "DELETE" && a.table === action.table && a.data?.id === action.data.id,
      );
      if (existing) {
        return existing.id;
      }
    }

    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.storage.addToQueue(offlineAction);
    await this.storage.saveData();

    return offlineAction.id;
  }

  async syncActions(isOnline: boolean): Promise<SyncResult> {
    const syncQueue = this.storage.getSyncQueue();

    if (this.syncInProgress || !isOnline || syncQueue.length === 0) {
      return {
        success: true,
        syncedActions: 0,
        failedActions: 0,
        errors: [],
      };
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = Date.now();
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: [],
    };

    try {
      const now = Date.now();
      // Actions still inside their backoff cooldown from a previous failed
      // attempt are left untouched in the queue for a later sync pass.
      const actionsToSync = syncQueue.filter(
        (action) => !action.nextRetryAt || action.nextRetryAt <= now,
      );
      const successfulActions: string[] = [];

      for (const action of actionsToSync) {
        try {
          await executeAction(action);
          successfulActions.push(action.id);
          result.syncedActions++;
          this.rollback.clearRollback(action.id);
        } catch (error) {
          const newRetryCount = action.retryCount + 1;
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Route the mutation through the storage API instead of relying on
          // `action` being a live reference into the shared internal array.
          this.storage.updateAction(action.id, {
            retryCount: newRetryCount,
            lastError: errorMessage,
            nextRetryAt: Date.now() + computeBackoffMs(newRetryCount),
          });
          // Persist immediately so retryCount/backoff survive an app kill mid-sync.
          await this.storage.saveData();

          if (newRetryCount >= action.maxRetries) {
            console.error(
              `[OfflineQueue] Action ${action.id} (${action.type} ${action.table}) permanently failed after ${newRetryCount} attempts and was rolled back: ${errorMessage}`,
            );
            await this.rollback.rollbackAction(action.id, this.storage);
            successfulActions.push(action.id);
            result.failedActions++;
            result.errors.push(`Failed to sync action ${action.id}: ${error}`);
          }
        }
      }

      this.storage.removeFromQueue(successfulActions);
      await this.storage.saveData();

      result.success = result.failedActions === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /** Real "last time a sync was attempted" timestamp, updated on every pass
   * (success or failure) — unlike deriving it from action creation time. */
  getLastSyncAttempt(): number | null {
    return this.lastSyncAttempt;
  }

  async clearFailedActionsForTable(table: string): Promise<void> {
    const syncQueue = this.storage.getSyncQueue();
    const initialCount = syncQueue.length;
    const filtered = syncQueue.filter((action) => action.table !== table);
    const clearedCount = initialCount - filtered.length;

    if (clearedCount > 0) {
      this.storage.setSyncQueue(filtered);
      await this.storage.saveData();
    }
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
  }
}
