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
      return;
    }

    this.syncInterval = setInterval(
      async () => {
        await fetchHealthData();
      },
      intervalMinutes * 60 * 1000,
    );

  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
