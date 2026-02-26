import AsyncStorage from "@react-native-async-storage/async-storage";
import { OfflineAction, OfflineData } from "./types";

const SYNC_QUEUE_KEY = "offline_sync_queue";
const OFFLINE_DATA_KEY = "offline_data";

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
}
