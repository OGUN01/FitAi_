import AsyncStorage from "@react-native-async-storage/async-storage";
import { OfflineAction, OfflineData } from "./types";

const SYNC_QUEUE_KEY = "offline_sync_queue";
const OFFLINE_DATA_KEY = "offline_data";
const MIGRATION_FLAG_PREFIX = "offline_migration_";

export class StorageManager {
  private offlineData: Map<string, OfflineData> = new Map();
  private syncQueue: OfflineAction[] = [];

  async loadData(): Promise<void> {
    try {
      const [queueData, offlineData] = await Promise.all([
        AsyncStorage.getItem(SYNC_QUEUE_KEY),
        AsyncStorage.getItem(OFFLINE_DATA_KEY),
      ]);

      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }

      if (offlineData) {
        const data = JSON.parse(offlineData);
        this.offlineData = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error("[OfflineStorage] Failed to load offline data:", error);
    }
  }

  async saveData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue)),
        AsyncStorage.setItem(
          OFFLINE_DATA_KEY,
          JSON.stringify(Object.fromEntries(this.offlineData)),
        ),
      ]);
    } catch (error) {
      console.error("[OfflineStorage] Failed to save offline data:", error);
    }
  }

  getSyncQueue(): OfflineAction[] {
    return this.syncQueue;
  }

  setSyncQueue(queue: OfflineAction[]): void {
    this.syncQueue = queue;
  }

  addToQueue(action: OfflineAction): void {
    this.syncQueue.push(action);
  }

  removeFromQueue(actionIds: string[]): void {
    this.syncQueue = this.syncQueue.filter(
      (action) => !actionIds.includes(action.id),
    );
  }

  /**
   * Patch a queued action in place by id (e.g. retryCount/lastError/nextRetryAt
   * after a failed sync attempt). Routes the mutation through an explicit API
   * instead of callers reaching into the array returned by getSyncQueue() and
   * mutating it directly — that only works today because this getter happens
   * to leak the live internal array, not because it's a guaranteed contract.
   */
  updateAction(id: string, patch: Partial<OfflineAction>): void {
    const index = this.syncQueue.findIndex((action) => action.id === id);
    if (index === -1) {
      return;
    }
    this.syncQueue[index] = { ...this.syncQueue[index], ...patch };
  }

  getOfflineData(key: string): OfflineData | null {
    return this.offlineData.get(key) || null;
  }

  setOfflineData(key: string, data: OfflineData): void {
    this.offlineData.set(key, {
      ...data,
      _offline_timestamp: Date.now(),
    });
  }

  removeOfflineData(key: string): void {
    this.offlineData.delete(key);
  }

  getOfflineDataByTable(table: string): OfflineData[] {
    const results: OfflineData[] = [];
    for (const [key, data] of this.offlineData.entries()) {
      if (key.startsWith(`${table}_`)) {
        results.push(data);
      }
    }
    return results;
  }

  clearAllData(): void {
    this.syncQueue = [];
    this.offlineData.clear();
  }

  async clearStorage(): Promise<void> {
    this.clearAllData();
    await Promise.all([
      AsyncStorage.removeItem(SYNC_QUEUE_KEY),
      AsyncStorage.removeItem(OFFLINE_DATA_KEY),
    ]);
  }

  isDataStale(data: OfflineData, maxAgeMinutes: number = 30): boolean {
    const timestamp = data._offline_timestamp;
    if (!timestamp) return true;

    const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Re-read the offline data cache directly from AsyncStorage and replace the
   * in-memory snapshot with it. This module's in-memory copy is otherwise only
   * populated once at construction (loadData()), so any write made by another
   * writer of the same AsyncStorage key during the live session is invisible
   * to callers of getOfflineData()/getOfflineDataByTable() until the app
   * restarts. Best-effort: on read/parse failure, keeps the existing in-memory
   * data and logs rather than throwing.
   */
  async refreshOfflineDataFromDisk(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.offlineData = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error(
        "[OfflineStorage] Failed to refresh offline data from disk:",
        error,
      );
    }
  }

  /** One-time migration bookkeeping, namespaced separately from the queue/data keys. */
  async isMigrationApplied(migrationId: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(
        `${MIGRATION_FLAG_PREFIX}${migrationId}`,
      );
      return value === "true";
    } catch (error) {
      console.error(
        `[OfflineStorage] Failed to read migration flag "${migrationId}":`,
        error,
      );
      return false;
    }
  }

  async markMigrationApplied(migrationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${MIGRATION_FLAG_PREFIX}${migrationId}`, "true");
    } catch (error) {
      console.error(
        `[OfflineStorage] Failed to persist migration flag "${migrationId}":`,
        error,
      );
    }
  }
}
