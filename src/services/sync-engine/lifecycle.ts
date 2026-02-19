import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { supabase } from "../supabase";
import { authEvents } from "../authEvents";
import { LAST_SYNC_KEY } from "./constants";

export class LifecycleManager {
  private isInitialized: boolean = false;
  private authUnsubscribe: (() => void) | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private isOnline: boolean = true;
  private userId: string | null = null;
  private lastSyncAt: string | null = null;

  private onAuthChange?: (userId: string | null) => void;
  private onNetworkChange?: (isOnline: boolean) => void;

  constructor(
    onAuthChange?: (userId: string | null) => void,
    onNetworkChange?: (isOnline: boolean) => void,
  ) {
    this.onAuthChange = onAuthChange;
    this.onNetworkChange = onNetworkChange;
  }

  async initialize(loadQueue: () => Promise<void>): Promise<void> {
    if (this.isInitialized) {
      console.log("[SyncEngine] Already initialized, skipping...");
      return;
    }

    console.log("[SyncEngine] Initializing...");

    try {
      await loadQueue();

      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSync) {
        this.lastSyncAt = lastSync;
      }

      this.setupAuthListener();
      await this.setupNetworkListener();

      this.isInitialized = true;
      console.log("[SyncEngine] Initialization complete");
    } catch (error) {
      console.error("[SyncEngine] Initialization failed:", error);
      throw error;
    }
  }

  private setupAuthListener(): void {
    console.log("[SyncEngine] Setting up auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[SyncEngine] Auth state changed: ${event}`);

      if (event === "SIGNED_IN" && session?.user) {
        const userId = session.user.id;
        console.log(`[SyncEngine] User signed in: ${userId}`);
        this.userId = userId;
        this.onAuthChange?.(userId);
      } else if (event === "SIGNED_OUT") {
        console.log("[SyncEngine] User signed out, clearing user ID");
        this.userId = null;
        this.onAuthChange?.(null);
      }
    });

    this.authUnsubscribe = () => subscription.unsubscribe();
  }

  private async setupNetworkListener(): Promise<void> {
    console.log("[SyncEngine] Setting up network state listener...");

    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;
    console.log(
      `[SyncEngine] Initial network state: ${this.isOnline ? "online" : "offline"}`,
    );

    this.netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? true;

        console.log(
          `[SyncEngine] Network state changed: ${this.isOnline ? "online" : "offline"}`,
        );

        if (wasOffline && this.isOnline) {
          console.log("[SyncEngine] Back online, processing queue...");
          this.onNetworkChange?.(this.isOnline);
        }
      },
    );
  }

  setUserId(userId: string | null): void {
    console.log(`[SyncEngine] Setting user ID: ${userId || "null"}`);
    this.userId = userId;
  }

  getCurrentUserId(): string | null {
    if (this.userId) {
      return this.userId;
    }
    return authEvents.getCurrentUserId();
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getLastSyncAt(): string | null {
    return this.lastSyncAt;
  }

  async setLastSyncAt(timestamp: string): Promise<void> {
    this.lastSyncAt = timestamp;
    await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
  }

  destroy(): void {
    console.log("[SyncEngine] Destroying lifecycle manager...");

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.isInitialized = false;
    console.log("[SyncEngine] Lifecycle manager destroyed");
  }
}
