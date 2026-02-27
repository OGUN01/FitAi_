import * as crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "./supabase";

// Types for offline operations
export interface OfflineAction {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  table: string;
  data: any;
  timestamp: number;
  userId: string;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

interface SupabaseResponse {
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  } | null;
}

// Map LocalWorkoutSession camelCase fields to Supabase snake_case columns
function mapSessionToDb(data: Record<string, unknown>) {
  if ('caloriesBurned' in data || 'userId' in data || 'workoutId' in data) {
    return {
      id: data.id,
      user_id: data.userId,
      workout_id: data.workoutId || null,
      started_at: data.startedAt,
      completed_at: data.completedAt,
      duration: data.duration,
      calories_burned: data.caloriesBurned,
      exercises: data.exercises,
      notes: data.notes || '',
      rating: data.rating || 0,
      is_completed: data.isCompleted,
    };
  }
  return data;
}

function isValidSupabaseResponse(
  response: unknown,
): response is SupabaseResponse {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return false;
  }
  return true;
}

function validateSupabaseResponse(
  response: unknown,
  operation: string,
  table: string,
): { valid: boolean; error?: string } {
  if (!isValidSupabaseResponse(response)) {
    const errorMsg = `Received malformed Supabase response for ${operation} on ${table}: ${typeof response}`;
    console.warn(errorMsg, response);
    return { valid: false, error: errorMsg };
  }

  const supabaseRes = response as SupabaseResponse;

  if (supabaseRes.error) {
    const errorMsg = `Supabase error for ${operation} on ${table}: ${supabaseRes.error.message}`;
    console.warn(errorMsg, supabaseRes.error);
    return { valid: false, error: errorMsg };
  }

  return { valid: true };
}

// Rollback state for optimistic updates
interface OptimisticRollbackState {
  actionId: string;
  key: string;
  originalData: OfflineData | null; // null means data didn't exist (was created)
  type: "UPDATE" | "CREATE" | "DELETE";
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncQueue: OfflineAction[] = [];
  private offlineData: Map<string, OfflineData> = new Map();
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private rollbackStates: Map<string, OptimisticRollbackState> = new Map();

  private constructor() {
    this.initializeNetworkListener();
    this.loadOfflineData();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Initialize network connectivity listener
   */
  private async initializeNetworkListener(): Promise<void> {
    try {
      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      // Listen for network changes
      NetInfo.addEventListener((state) => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;

        // Notify listeners
        this.listeners.forEach((listener) => listener(this.isOnline));

        // Auto-sync when coming back online
        if (!wasOnline && this.isOnline) {
          this.syncOfflineActions();
        }
      });
    } catch (error) {
    }
  }

  /**
   * Load offline data from AsyncStorage
   */
  private async loadOfflineData(): Promise<void> {
    try {
      const [queueData, offlineData] = await Promise.all([
        AsyncStorage.getItem("offline_sync_queue"),
        AsyncStorage.getItem("offline_data"),
      ]);

      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        // Purge stale workout_sessions actions with camelCase fields
        const before = this.syncQueue.length;
        this.syncQueue = this.syncQueue.filter((action) => {
          if (action.table === 'workout_sessions' && action.type === 'CREATE') {
            const d = action.data as Record<string, unknown>;
            return !('caloriesBurned' in d || 'userId' in d || 'workoutId' in d);
          }
          return true;
        });
        if (this.syncQueue.length !== before) {
          this.saveOfflineData().catch(() => {});
        }
      }

      if (offlineData) {
        const data = JSON.parse(offlineData);
        this.offlineData = new Map(Object.entries(data));
      }
    } catch (error) {
    }
  }

  /**
   * Save offline data to AsyncStorage
   */
  private async saveOfflineData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(
          "offline_sync_queue",
          JSON.stringify(this.syncQueue),
        ),
        AsyncStorage.setItem(
          "offline_data",
          JSON.stringify(Object.fromEntries(this.offlineData)),
        ),
      ]);
    } catch (error) {
    }
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add network status listener
   */
  addNetworkListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Queue an action for offline sync
   */
  async queueAction(
    action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">,
  ): Promise<string> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(offlineAction);
    await this.saveOfflineData();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncOfflineActions();
    }

    return offlineAction.id;
  }

  /**
   * Store data for offline access
   */
  async storeOfflineData(key: string, data: OfflineData): Promise<void> {
    this.offlineData.set(key, {
      ...data,
      _offline_timestamp: Date.now(),
    });
    await this.saveOfflineData();
  }

  /**
   * Get offline data
   */
  getOfflineData(key: string): OfflineData | null {
    return this.offlineData.get(key) || null;
  }

  /**
   * Remove offline data
   */
  async removeOfflineData(key: string): Promise<void> {
    this.offlineData.delete(key);
    await this.saveOfflineData();
  }

  /**
   * Get all offline data for a specific table
   */
  getOfflineDataByTable(table: string): OfflineData[] {
    const results: OfflineData[] = [];
    for (const [key, data] of this.offlineData.entries()) {
      if (key.startsWith(`${table}_`)) {
        results.push(data);
      }
    }
    return results;
  }

  /**
   * Sync offline actions with server
   */
  async syncOfflineActions(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return {
        success: true,
        syncedActions: 0,
        failedActions: 0,
        errors: [],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: [],
    };

    try {
      const actionsToSync = [...this.syncQueue];
      const successfulActions: string[] = [];

      for (const action of actionsToSync) {
        try {
          await this.executeAction(action);
          successfulActions.push(action.id);
          result.syncedActions++;
          this.rollbackStates.delete(action.id);
        } catch (error) {
          action.retryCount++;

          if (action.retryCount >= action.maxRetries) {
            await this.rollbackAction(action.id);
            successfulActions.push(action.id);
            result.failedActions++;
            result.errors.push(`Failed to sync action ${action.id}: ${error}`);
          }
        }
      }

      // Remove successful and failed actions from queue
      this.syncQueue = this.syncQueue.filter(
        (action) => !successfulActions.includes(action.id),
      );
      await this.saveOfflineData();

      result.success = result.failedActions === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  private async rollbackAction(actionId: string): Promise<void> {
    const rollbackState = this.rollbackStates.get(actionId);
    if (!rollbackState) {
      return;
    }

    const { key, originalData, type } = rollbackState;

    switch (type) {
      case "UPDATE":
        if (originalData) {
          await this.storeOfflineData(key, originalData);
        } else {
          await this.removeOfflineData(key);
        }
        break;
      case "CREATE":
        await this.removeOfflineData(key);
        break;
      case "DELETE":
        if (originalData) {
          await this.storeOfflineData(key, originalData);
        }
        break;
    }

    this.rollbackStates.delete(actionId);
  }

  /**
   * Execute a single offline action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    const { type, table, data } = action;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {

        switch (type) {
          case "CREATE":
            const insertData = table === 'workout_sessions' ? mapSessionToDb(data as Record<string, unknown>) : data;
            const createResponse = await supabase.from(table).insert([insertData]);
            const createValidation = validateSupabaseResponse(
              createResponse,
              "CREATE",
              table,
            );
            if (!createValidation.valid) {
              throw new Error(createValidation.error);
            }
            break;

          case "UPDATE":
            const { id, ...updateData } = data;
            if (!id) {
              throw new Error(
                `UPDATE operation missing required 'id' field for table ${table}`,
              );
            }
            const updateResponse = await supabase
              .from(table)
              .update(updateData)
              .eq("id", id);
            const updateValidation = validateSupabaseResponse(
              updateResponse,
              "UPDATE",
              table,
            );
            if (!updateValidation.valid) {
              throw new Error(updateValidation.error);
            }
            break;

          case "DELETE":
            if (!data.id) {
              throw new Error(
                `DELETE operation missing required 'id' field for table ${table}`,
              );
            }
            const deleteResponse = await supabase
              .from(table)
              .delete()
              .eq("id", data.id);
            const deleteValidation = validateSupabaseResponse(
              deleteResponse,
              "DELETE",
              table,
            );
            if (!deleteValidation.valid) {
              throw new Error(deleteValidation.error);
            }
            break;

          default:
            throw new Error(`Unknown action type: ${type}`);
        }

        // Success - exit retry loop
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `⚠️ Attempt ${attempt} failed for ${type} on ${table}:`,
          error,
        );

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All attempts failed
    const errorMessage = `Failed to execute ${type} on ${table} after ${maxRetries} attempts: ${lastError?.message}`;
    console.warn(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    this.syncQueue = [];
    this.offlineData.clear();
    await Promise.all([
      AsyncStorage.removeItem("offline_sync_queue"),
      AsyncStorage.removeItem("offline_data"),
    ]);
  }

  /**
   * Clear failed actions for a specific table (useful for fixing UUID format issues)
   */
  async clearFailedActionsForTable(table: string): Promise<void> {
    const initialCount = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter((action) => action.table !== table);
    const clearedCount = initialCount - this.syncQueue.length;

    if (clearedCount > 0) {
      await this.saveOfflineData();
    }
  }

  /**
   * Get sync queue status
   */
  getSyncStatus(): {
    queueLength: number;
    isOnline: boolean;
    syncInProgress: boolean;
    lastSyncAttempt: number | null;
  } {
    return {
      queueLength: this.syncQueue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSyncAttempt:
        this.syncQueue.length > 0
          ? Math.max(...this.syncQueue.map((a) => a.timestamp))
          : null,
    };
  }

  /**
   * Force sync (useful for manual sync buttons)
   */
  async forcSync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ["Device is offline"],
      };
    }

    return this.syncOfflineActions();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`;
  }

  /**
   * Check if data is stale (older than specified minutes)
   */
  isDataStale(data: OfflineData, maxAgeMinutes: number = 30): boolean {
    const timestamp = data._offline_timestamp;
    if (!timestamp) return true;

    const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Optimistic update - update local data immediately and queue for sync
   */
  async optimisticUpdate(
    table: string,
    id: string,
    data: any,
    userId: string,
  ): Promise<void> {
    const key = `${table}_${id}`;
    const originalData = this.getOfflineData(key);

    await this.storeOfflineData(key, { ...data, id });

    const actionId = await this.queueAction({
      type: "UPDATE",
      table,
      data: { ...data, id },
      userId,
      maxRetries: 3,
    });

    this.rollbackStates.set(actionId, {
      actionId,
      key,
      originalData,
      type: "UPDATE",
    });
  }

  /**
   * Optimistic create - create local data immediately and queue for sync
   */
  async optimisticCreate(
    table: string,
    data: any,
    userId: string,
    tempId?: string,
  ): Promise<string> {
    const id = tempId || this.generateId();
    const dataWithId = { ...data, id };
    const key = `${table}_${id}`;

    await this.storeOfflineData(key, dataWithId);

    const actionId = await this.queueAction({
      type: "CREATE",
      table,
      data: dataWithId,
      userId,
      maxRetries: 3,
    });

    this.rollbackStates.set(actionId, {
      actionId,
      key,
      originalData: null,
      type: "CREATE",
    });

    return id;
  }

  /**
   * Optimistic delete - remove local data immediately and queue for sync
   */
  async optimisticDelete(
    table: string,
    id: string,
    userId: string,
  ): Promise<void> {
    const key = `${table}_${id}`;
    const originalData = this.getOfflineData(key);

    await this.removeOfflineData(key);

    const actionId = await this.queueAction({
      type: "DELETE",
      table,
      data: { id },
      userId,
      maxRetries: 3,
    });

    this.rollbackStates.set(actionId, {
      actionId,
      key,
      originalData,
      type: "DELETE",
    });
  }
}

export const offlineService = OfflineService.getInstance();
export default offlineService;
