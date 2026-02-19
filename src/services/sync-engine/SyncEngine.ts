import { syncMutex } from "../syncMutex";
import { supabase } from "../supabase";
import { LifecycleManager } from "./lifecycle";
import { QueueManager } from "./queue";
import { SyncOperations } from "./operations";
import { SyncStatus, SyncResult, DataType } from "./types";

export class SyncEngine {
  private lifecycleManager: LifecycleManager;
  private queueManager: QueueManager;
  private syncOperations: SyncOperations;
  private lastError: string | null = null;

  constructor() {
    this.syncOperations = new SyncOperations();
    this.queueManager = new QueueManager(
      this.syncOperations.executeOperation.bind(this.syncOperations),
    );
    this.lifecycleManager = new LifecycleManager(
      this.handleAuthChange.bind(this),
      this.handleNetworkChange.bind(this),
    );
  }

  private handleAuthChange(userId: string | null): void {
    if (userId && this.lifecycleManager.getIsOnline()) {
      console.log("[SyncEngine] Triggering auto-sync after login...");
      this.syncAll(userId);
    }
  }

  private handleNetworkChange(isOnline: boolean): void {
    if (isOnline && this.queueManager.getQueueLength() > 0) {
      this.processQueue();
    }
  }

  async initialize(): Promise<void> {
    await this.lifecycleManager.initialize(() => this.queueManager.loadQueue());

    if (
      this.lifecycleManager.getIsOnline() &&
      this.queueManager.getQueueLength() > 0
    ) {
      console.log(
        `[SyncEngine] Found ${this.queueManager.getQueueLength()} pending operations, processing...`,
      );
      this.processQueue();
    }
  }

  setUserId(userId: string | null): void {
    this.lifecycleManager.setUserId(userId);
  }

  async queueOperation(type: DataType, data: any): Promise<void> {
    const userId = this.lifecycleManager.getCurrentUserId();
    await this.queueManager.queueOperation(
      type,
      data,
      userId!,
      () => this.processQueue(),
      this.lifecycleManager.getIsOnline(),
    );
  }

  async processQueue(): Promise<SyncResult> {
    const result = await this.queueManager.processQueue(
      this.lifecycleManager.getIsOnline(),
      (timestamp) => this.lifecycleManager.setLastSyncAt(timestamp),
    );

    if (result.errors.length > 0) {
      this.lastError = result.errors.join("; ");
    } else {
      this.lastError = null;
    }

    return result;
  }

  async syncAll(userId: string): Promise<SyncResult> {
    return syncMutex.withLock(
      "SyncEngine.syncAll",
      async () => await this.syncAllInternal(userId),
    );
  }

  private async syncAllInternal(userId: string): Promise<SyncResult> {
    console.log(`[SyncEngine] Syncing all data for user: ${userId}`);

    if (!this.lifecycleManager.getIsOnline()) {
      console.warn("[SyncEngine] Cannot sync: offline");
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ["Offline"],
      };
    }

    this.queueManager.setIsSyncing(true);
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: [],
    };

    if (this.queueManager.getQueueLength() > 0) {
      const queueResult = await this.queueManager.processQueue(
        this.lifecycleManager.getIsOnline(),
        (timestamp) => this.lifecycleManager.setLastSyncAt(timestamp),
      );
      result.syncedItems += queueResult.syncedItems;
      result.failedItems += queueResult.failedItems;
      result.errors.push(...queueResult.errors);
    }

    this.queueManager.setIsSyncing(false);
    await this.lifecycleManager.setLastSyncAt(new Date().toISOString());

    result.success = result.failedItems === 0;
    console.log(
      `[SyncEngine] Sync all complete. Synced: ${result.syncedItems}, Failed: ${result.failedItems}`,
    );

    return result;
  }

  async loadFromDatabase(userId: string): Promise<{
    personalInfo: any | null;
    dietPreferences: any | null;
    bodyAnalysis: any | null;
    workoutPreferences: any | null;
    advancedReview: any | null;
  }> {
    console.log(
      `[SyncEngine] Loading all data from database for user: ${userId}`,
    );

    const result: {
      personalInfo: any | null;
      dietPreferences: any | null;
      bodyAnalysis: any | null;
      workoutPreferences: any | null;
      advancedReview: any | null;
    } = {
      personalInfo: null,
      dietPreferences: null,
      bodyAnalysis: null,
      workoutPreferences: null,
      advancedReview: null,
    };

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileData && !profileError) {
        result.personalInfo = profileData;
        console.log("[SyncEngine] Loaded personal info");
      }

      const { data: dietData, error: dietError } = await supabase
        .from("diet_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (dietData && !dietError) {
        result.dietPreferences = dietData;
        console.log("[SyncEngine] Loaded diet preferences");
      }

      const { data: bodyData, error: bodyError } = await supabase
        .from("body_analysis")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (bodyData && !bodyError) {
        result.bodyAnalysis = bodyData;
        console.log("[SyncEngine] Loaded body analysis");
      }

      const { data: workoutData, error: workoutError } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (workoutData && !workoutError) {
        result.workoutPreferences = workoutData;
        console.log("[SyncEngine] Loaded workout preferences");
      }

      const { data: advancedData, error: advancedError } = await supabase
        .from("advanced_review")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (advancedData && !advancedError) {
        result.advancedReview = advancedData;
        console.log("[SyncEngine] Loaded advanced review");
      }

      console.log("[SyncEngine] Database load complete");
      return result;
    } catch (error) {
      console.error("[SyncEngine] Failed to load from database:", error);
      throw error;
    }
  }

  getStatus(): SyncStatus {
    return {
      isOnline: this.lifecycleManager.getIsOnline(),
      isSyncing: this.queueManager.getIsSyncing(),
      userId: this.lifecycleManager.getCurrentUserId(),
      queueLength: this.queueManager.getQueueLength(),
      lastSyncAt: this.lifecycleManager.getLastSyncAt(),
      lastError: this.lastError,
    };
  }

  destroy(): void {
    console.log("[SyncEngine] Destroying...");
    this.lifecycleManager.destroy();
    console.log("[SyncEngine] Destroyed");
  }
}
