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
      return;
    }


    try {
      await loadQueue();

      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSync) {
        this.lastSyncAt = lastSync;
      }

      this.setupAuthListener();
      await this.setupNetworkListener();

      this.isInitialized = true;
    } catch (error) {
      console.error("[SyncEngine] Initialization failed:", error);
      throw error;
    }
  }

  private setupAuthListener(): void {

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === "SIGNED_IN" && session?.user) {
        const userId = session.user.id;
        this.userId = userId;
        this.onAuthChange?.(userId);
      } else if (event === "SIGNED_OUT") {
        this.userId = null;
        this.onAuthChange?.(null);
      }
    });

    this.authUnsubscribe = () => subscription.unsubscribe();
  }

  private async setupNetworkListener(): Promise<void> {

    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    this.netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? true;


        if (wasOffline && this.isOnline) {
          this.onNetworkChange?.(this.isOnline);
        }
      },
    );
  }

  setUserId(userId: string | null): void {
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

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.isInitialized = false;
  }
}
