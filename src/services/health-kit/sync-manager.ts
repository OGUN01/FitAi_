import { Platform } from "react-native";
import { HealthKitModule } from "./platform";
import { fetchHealthData } from "./data-fetcher";

export class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;

  startAutoSync(intervalMinutes: number = 15): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (Platform.OS !== "ios" || !HealthKitModule) {
      console.log("🍎 HealthKit auto-sync not available on this platform");
      return;
    }

    this.syncInterval = setInterval(
      async () => {
        console.log("🍎 Running HealthKit auto-sync...");
        await fetchHealthData();
      },
      intervalMinutes * 60 * 1000,
    );

    console.log(
      `🍎 HealthKit auto-sync started (every ${intervalMinutes} minutes)`,
    );
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("🍎 HealthKit auto-sync stopped");
    }
  }
}
