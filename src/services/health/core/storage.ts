import AsyncStorage from "@react-native-async-storage/async-storage";
import { HealthConnectData } from "../types";
import { STORAGE_KEYS } from "./types";

export class StorageManager {
  async getCachedHealthData(): Promise<HealthConnectData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error("❌ Error reading cached Health Connect data:", error);
      return null;
    }
  }

  async cacheHealthData(data: HealthConnectData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.STORAGE_KEY,
        JSON.stringify(data),
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_INTERVAL_KEY,
        Date.now().toString(),
      );
    } catch (error) {
      console.error("❌ Error caching Health Connect data:", error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(
        STORAGE_KEYS.SYNC_INTERVAL_KEY,
      );
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error("❌ Error getting last sync time:", error);
      return null;
    }
  }

  async shouldSync(intervalHours: number = 1): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const hoursSinceLastSync =
      (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync >= intervalHours;
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.STORAGE_KEY,
        STORAGE_KEYS.SYNC_INTERVAL_KEY,
        STORAGE_KEYS.PERMISSIONS_KEY,
        STORAGE_KEYS.INITIALIZED_KEY,
      ]);
    } catch (error) {
      console.error("❌ Error clearing Health Connect cache:", error);
    }
  }
}
