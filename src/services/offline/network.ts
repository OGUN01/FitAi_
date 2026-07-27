import NetInfo from "@react-native-community/netinfo";
import { NetworkListener } from "./types";

export class NetworkManager {
  private isOnline: boolean = true;
  private listeners: Set<NetworkListener> = new Set();

  async initialize(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      NetInfo.addEventListener((state) => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;

        this.listeners.forEach((listener) => listener(this.isOnline));

        if (!wasOnline && this.isOnline) {
          this.notifyBackOnline();
        }
      });
    } catch (error) {
      // NetInfo init failure is non-fatal (default isOnline=true keeps the app
      // usable) but MUST be logged per CLAUDE.md #5 — a silent swallow here would
      // hide a broken network-detection layer and leave the app falsely reporting
      // "online" with no trace of why.
      console.error("[offline/network] NetworkManager.initialize failed — defaulting isOnline=true:", error);
    }
  }

  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private onlineCallback?: () => void;

  setOnlineCallback(callback: () => void): void {
    this.onlineCallback = callback;
  }

  private notifyBackOnline(): void {
    if (this.onlineCallback) {
      this.onlineCallback();
    }
  }
}
