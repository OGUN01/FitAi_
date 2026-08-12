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
  private syncResultListeners: Set<(result: SyncResult) => void> = new Set();

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
    await this.runPurgeStaleWorkoutSessionsMigration();
    await this.network.initialize();
    this.network.setOnlineCallback(() => this.syncOfflineActions());

    // Clear offline queue on sign-out to prevent RLS errors looping on the next sync.
    // Guard: in test environments that mock `supabase` without an `auth` object
    // (or where the SecureStore adapter isn't initialized), `onAuthStateChange`
    // is undefined and calling it crashes module init — which kills the entire
    // Jest process. Log and skip instead of crashing; the sign-out cleanup is
    // best-effort here (the real app always has a fully-initialized supabase).
    try {
      supabase.auth?.onAuthStateChange?.((event: string) => {
        if (event === "SIGNED_OUT") {
          this.clearOfflineData();
        }
      });
    } catch (error) {
      console.error("[OfflineService] Failed to subscribe to auth state changes:", error);
    }
  }

  /**
   * One-time (versioned) migration that purges queued `workout_sessions`
   * CREATE actions using an old/invalid field shape that would fail to sync
   * (legacy camelCase fields, null calories_burned, rating=0 violating the
   * check constraint). Previously this ran unconditionally on every app boot
   * with no logging, silently dropping any legitimately-queued-but-unsynced
   * workout with zero trace. Now it runs exactly once (tracked via a
   * migration flag) and logs every purged action's id + reason.
   */
  private async runPurgeStaleWorkoutSessionsMigration(): Promise<void> {
    const MIGRATION_ID = "v1_purge_stale_workout_session_creates";
    if (await this.storage.isMigrationApplied(MIGRATION_ID)) {
      return;
    }

    const queue = this.storage.getSyncQueue();
    const purged: Array<{ id: string; reason: string }> = [];
    const cleaned = queue.filter((action) => {
      if (action.table === "workout_sessions" && action.type === "CREATE") {
        const d = action.data as Record<string, unknown>;
        if ("caloriesBurned" in d || "userId" in d || "workoutId" in d) {
          purged.push({ id: action.id, reason: "legacy camelCase fields present" });
          return false;
        }
        if (d.calories_burned == null) {
          purged.push({ id: action.id, reason: "null calories_burned violates NOT NULL constraint" });
          return false;
        }
        if (d.rating === 0) {
          purged.push({ id: action.id, reason: "rating=0 violates check constraint (must be 1-5 or null)" });
          return false;
        }
      }
      return true;
    });

    if (purged.length > 0) {
      for (const p of purged) {
        console.warn(
          `[OfflineService] Migration ${MIGRATION_ID} purged stale queued action ${p.id}: ${p.reason}`,
        );
      }
      this.storage.setSyncQueue(cleaned);
      await this.storage.saveData();
    }

    await this.storage.markMigrationApplied(MIGRATION_ID);
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

  /**
   * Refreshes the in-memory offline data cache from AsyncStorage before
   * reading it. This instance's cache is otherwise only populated once at
   * construction, so a write made by another writer of the same
   * `offline_data` key during the live session (e.g. an optimistic profile
   * edit) would otherwise stay invisible to callers like DataBridge's
   * hydration guard until the next app restart.
   */
  async getOfflineDataByTable(table: string): Promise<OfflineData[]> {
    await this._ready;
    await this.storage.refreshOfflineDataFromDisk();
    return this.storage.getOfflineDataByTable(table);
  }

  /** Subscribe to sync passes that ended with at least one permanently-failed
   * action (maxRetries exhausted + rolled back). Returns an unsubscribe fn.
   * NOTE: no in-scope consumer currently wires this to a user-facing
   * indicator — that requires a store/UI outside this module's scope. */
  addSyncResultListener(listener: (result: SyncResult) => void): () => void {
    this.syncResultListeners.add(listener);
    return () => this.syncResultListeners.delete(listener);
  }

  async syncOfflineActions(): Promise<SyncResult> {
    await this._ready;
    if (this.queue.isSyncInProgress()) {
      return { success: true, syncedActions: 0, failedActions: 0, errors: [] };
    }
    const result = await syncMutex.withLock("OfflineService.syncOfflineActions", () =>
      this.queue.syncActions(this.network.isDeviceOnline()),
    );
    if (result.failedActions > 0) {
      this.syncResultListeners.forEach((listener) => {
        try {
          listener(result);
        } catch (error) {
          console.error("[OfflineService] syncResultListener threw:", error);
        }
      });
    }
    return result;
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
      // Real "last time a sync pass was attempted" timestamp, tracked inside
      // QueueManager.syncActions() — not derived from when the oldest/newest
      // queued action was first created, which stayed frozen for days on a
      // device silently failing retries on an old item.
      lastSyncAttempt: this.queue.getLastSyncAttempt(),
    };
  }

  /** @deprecated Use forceSync() — kept as an alias for any external callers
   * still using the old misspelled name. */
  async forcSync(): Promise<SyncResult> {
    return this.forceSync();
  }

  async forceSync(): Promise<SyncResult> {
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
