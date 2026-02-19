import NetInfo from "@react-native-community/netinfo";
import type { SyncStatus } from "./types";
import { CONNECTION_MONITOR_INTERVAL_MS } from "./constants";

export class ConnectionMonitor {
  private timer: NodeJS.Timeout | null = null;
  private statusCallback: ((updates: Partial<SyncStatus>) => void) | null =
    null;

  start(onStatusUpdate: (updates: Partial<SyncStatus>) => void): void {
    this.statusCallback = onStatusUpdate;

    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.checkConnection();
    }, CONNECTION_MONITOR_INTERVAL_MS);

    this.checkConnection();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.statusCallback = null;
  }

  private async checkConnection(): Promise<void> {
    const netState = await NetInfo.fetch();
    const isOnline = !!(
      netState.isConnected &&
      (netState.isInternetReachable ?? true)
    );
    const quality = isOnline ? "good" : "offline";

    if (this.statusCallback) {
      this.statusCallback({
        isOnline,
        connectionQuality: quality as any,
      });
    }
  }
}
