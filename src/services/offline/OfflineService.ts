import {
  OfflineAction,
  OfflineData,
  SyncResult,
  SyncStatus,
  NetworkListener,
} from "./types";
import { StorageManager } from "./storage";
import { NetworkManager } from "./network";
import { QueueManager } from "./queue";
import { RollbackManager } from "./rollback";
import * as crypto from "expo-crypto";
import { supabase } from "../supabase";
import { syncMutex } from "../syncMutex";

class OfflineService {
  private static instance: OfflineService;
  private storage: StorageManager;
  private network: NetworkManager;
  private queue: QueueManager;
  private rollback: RollbackManager;
  private _ready: Promise<void>;

  private constructor() {
    this.storage = new StorageManager();
    this.network = new NetworkManager();
    this.rollback = new RollbackManager();
    this.queue = new QueueManager(this.storage, this.rollback);

    this._ready = this.initializeService();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async initializeService(): Promise<void> {
    await this.storage.loadData();
    // Purge stale workout_sessions actions that use old/invalid field shapes
    const queue = this.storage.getSyncQueue();
    const cleaned = queue.filter((action) => {
      if (action.table === 'workout_sessions' && action.type === 'CREATE') {
        const d = action.data as Record<string, unknown>;
        // Purge: old camelCase fields (will fail column mapping)
        if ('caloriesBurned' in d || 'userId' in d || 'workoutId' in d) return false;
        // Purge: null/undefined calories_burned (will fail NOT NULL constraint)
        if (d.calories_burned == null) return false;
        // Purge: rating=0 (will fail check constraint — must be 1-5 or null)
        if (d.rating === 0) return false;
      }
      return true;
    });
    if (cleaned.length !== queue.length) {
      this.storage.setSyncQueue(cleaned);
      await this.storage.saveData();
    }
    await this.network.initialize();
    this.network.setOnlineCallback(() => this.syncOfflineActions());

    // Clear offline queue on sign-out to prevent RLS errors looping on the next sync.
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        this.clearOfflineData();
      }
    });
  }

  isDeviceOnline(): boolean {
    return this.network.isDeviceOnline();
  }

  addNetworkListener(listener: NetworkListener): () => void {
    return this.network.addListener(listener);
  }

  async queueAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): Promise<string> {
    await this._ready;
    const actionId = await this.queue.queueAction(action);

    if (this.isDeviceOnline()) {
      this.syncOfflineActions();
    }

    return actionId;
  }

  async storeOfflineData(key: string, data: OfflineData): Promise<void> {
    this.storage.setOfflineData(key, data);
    await this.storage.saveData();
  }

  getOfflineData(key: string): OfflineData | null {
    return this.storage.getOfflineData(key);
  }

  async removeOfflineData(key: string): Promise<void> {
    this.storage.removeOfflineData(key);
    await this.storage.saveData();
  }

  getOfflineDataByTable(table: string): OfflineData[] {
    return this.storage.getOfflineDataByTable(table);
  }

  async syncOfflineActions(): Promise<SyncResult> {
    await this._ready;
    if (this.queue.isSyncInProgress()) {
      return { success: true, syncedActions: 0, failedActions: 0, errors: [] };
    }
    return syncMutex.withLock("OfflineService.syncOfflineActions", () =>
      this.queue.syncActions(this.network.isDeviceOnline()),
    );
  }

  async clearOfflineData(): Promise<void> {
    await this.storage.clearStorage();
  }

  async clearFailedActionsForTable(table: string): Promise<void> {
    await this.queue.clearFailedActionsForTable(table);
  }

  hasPendingActions(): boolean {
    return this.storage.getSyncQueue().length > 0;
  }

  getSyncStatus(): SyncStatus {
    const syncQueue = this.storage.getSyncQueue();
    return {
      queueLength: syncQueue.length,
      isOnline: this.network.isDeviceOnline(),
      syncInProgress: this.queue.isSyncInProgress(),
      lastSyncAttempt:
        syncQueue.length > 0
          ? Math.max(...syncQueue.map((a) => a.timestamp))
          : null,
    };
  }

  async forcSync(): Promise<SyncResult> {
    if (!this.isDeviceOnline()) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ["Device is offline"],
      };
    }

    return this.syncOfflineActions();
  }

  isDataStale(data: OfflineData, maxAgeMinutes: number = 30): boolean {
    return this.storage.isDataStale(data, maxAgeMinutes);
  }

  async optimisticUpdate(
    table: string,
    id: string,
    data: any,
    userId: string,
  ): Promise<void> {
    const key = `${table}_${id}`;
    const originalData = this.getOfflineData(key);

    await this.storeOfflineData(key, { ...data, id });

    const actionId = await this.queueAction({
      type: "UPDATE",
      table,
      data: { ...data, id },
      userId,
      maxRetries: 3,
    });

    this.rollback.setRollback({
      actionId,
      key,
      originalData,
      type: "UPDATE",
    });
  }

  async optimisticCreate(
    table: string,
    data: any,
    userId: string,
    tempId?: string,
  ): Promise<string> {
    const id = tempId || this.generateId();
    const dataWithId = { ...data, id };
    const key = `${table}_${id}`;

    await this.storeOfflineData(key, dataWithId);

    const actionId = await this.queueAction({
      type: "CREATE",
      table,
      data: dataWithId,
      userId,
      maxRetries: 3,
    });

    this.rollback.setRollback({
      actionId,
      key,
      originalData: null,
      type: "CREATE",
    });

    return id;
  }

  async optimisticDelete(
    table: string,
    id: string,
    userId: string,
  ): Promise<void> {
    const key = `${table}_${id}`;
    const originalData = this.getOfflineData(key);

    await this.removeOfflineData(key);

    const actionId = await this.queueAction({
      type: "DELETE",
      table,
      data: { id },
      userId,
      maxRetries: 3,
    });

    this.rollback.setRollback({
      actionId,
      key,
      originalData,
      type: "DELETE",
    });
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
  }
}

export const offlineService = OfflineService.getInstance();
export default offlineService;
