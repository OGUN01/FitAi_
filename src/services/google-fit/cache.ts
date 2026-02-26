import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleFitData, HealthSummary } from "./types";

export class GoogleFitCache {
  private readonly STORAGE_KEY = "fitai_googlefit_data";
  private readonly SYNC_INTERVAL_KEY = "fitai_googlefit_last_sync";

  async getCachedHealthData(): Promise<GoogleFitData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error("❌ Error reading cached Google Fit data:", error);
      return null;
    }
  }

  async cacheHealthData(data: GoogleFitData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(this.SYNC_INTERVAL_KEY, Date.now().toString());
    } catch (error) {
      console.error("❌ Error caching Google Fit data:", error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(this.SYNC_INTERVAL_KEY);
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error("❌ Error getting last Google Fit sync time:", error);
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

  async getHealthSummary(): Promise<HealthSummary> {
    try {
      const cachedData = await this.getCachedHealthData();
      const lastSync = await this.getLastSyncTime();

      let syncStatus: "synced" | "needs_sync" | "never_synced" = "never_synced";

      if (lastSync) {
        const hoursSinceSync =
          (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        syncStatus = hoursSinceSync < 2 ? "synced" : "needs_sync";
      }

      return {
        dailySteps: cachedData?.steps || 0,
        dailyCalories: cachedData?.calories || 0,
        dailyDistance:
          Math.round(((cachedData?.distance || 0) / 1000) * 10) / 10,
        lastWeight: cachedData?.weight,
        heartRate: cachedData?.heartRate,
        recentWorkouts: cachedData?.workouts?.length || 0,
        syncStatus,
      };
    } catch (error) {
      console.error("❌ Error getting Google Fit health summary:", error);
      return {
        dailySteps: 0,
        dailyCalories: 0,
        dailyDistance: 0,
        recentWorkouts: 0,
        syncStatus: "never_synced",
      };
    }
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEY,
        this.SYNC_INTERVAL_KEY,
      ]);
    } catch (error) {
      console.error("❌ Error clearing Google Fit cache:", error);
    }
  }
}
