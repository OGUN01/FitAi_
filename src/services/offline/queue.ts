import { OfflineAction, SyncResult } from "./types";
import { StorageManager } from "./storage";
import { executeAction } from "./actions";
import { RollbackManager } from "./rollback";
import * as crypto from "expo-crypto";

export class QueueManager {
  private syncInProgress: boolean = false;

  constructor(
    private storage: StorageManager,
    private rollback: RollbackManager,
  ) {}

  async queueAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): Promise<string> {
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
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: [],
    };

    try {
      const actionsToSync = [...syncQueue];
      const successfulActions: string[] = [];

      for (const action of actionsToSync) {
        try {
          await executeAction(action);
          successfulActions.push(action.id);
          result.syncedActions++;
          this.rollback.clearRollback(action.id);
        } catch (error) {
          action.retryCount++;

          if (action.retryCount >= action.maxRetries) {
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

  async clearFailedActionsForTable(table: string): Promise<void> {
    const syncQueue = this.storage.getSyncQueue();
    const initialCount = syncQueue.length;
    const filtered = syncQueue.filter((action) => action.table !== table);
    const clearedCount = initialCount - filtered.length;

    if (clearedCount > 0) {
      this.storage.setSyncQueue(filtered);
      await this.storage.saveData();
      console.log(
        `🧹 Cleared ${clearedCount} failed actions for table ${table}`,
      );
    }
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
  }
}
