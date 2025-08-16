import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

// Types for offline operations
export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
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

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncQueue: OfflineAction[] = [];
  private offlineData: Map<string, OfflineData> = new Map();
  private listeners: Set<(isOnline: boolean) => void> = new Set();

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
      console.warn('Failed to initialize network listener:', error);
    }
  }

  /**
   * Load offline data from AsyncStorage
   */
  private async loadOfflineData(): Promise<void> {
    try {
      const [queueData, offlineData] = await Promise.all([
        AsyncStorage.getItem('offline_sync_queue'),
        AsyncStorage.getItem('offline_data'),
      ]);

      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }

      if (offlineData) {
        const data = JSON.parse(offlineData);
        this.offlineData = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error);
    }
  }

  /**
   * Save offline data to AsyncStorage
   */
  private async saveOfflineData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('offline_sync_queue', JSON.stringify(this.syncQueue)),
        AsyncStorage.setItem('offline_data', JSON.stringify(Object.fromEntries(this.offlineData))),
      ]);
    } catch (error) {
      console.warn('Failed to save offline data:', error);
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
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
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
        } catch (error) {
          action.retryCount++;

          if (action.retryCount >= action.maxRetries) {
            // Remove failed action after max retries
            successfulActions.push(action.id);
            result.failedActions++;
            result.errors.push(`Failed to sync action ${action.id}: ${error}`);
          }
        }
      }

      // Remove successful and failed actions from queue
      this.syncQueue = this.syncQueue.filter((action) => !successfulActions.includes(action.id));
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

  /**
   * Execute a single offline action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    const { type, table, data } = action;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting ${type} on ${table} (attempt ${attempt}/${maxRetries})`);

        switch (type) {
          case 'CREATE':
            const { error: createError } = await supabase.from(table).insert([data]);
            if (createError) {
              console.error(`❌ CREATE error on ${table}:`, createError);
              throw createError;
            }
            console.log(`✅ Successfully created record in ${table}`);
            break;

          case 'UPDATE':
            const { id, ...updateData } = data;
            if (!id) {
              throw new Error(`UPDATE operation missing required 'id' field for table ${table}`);
            }
            const { error: updateError } = await supabase.from(table).update(updateData).eq('id', id);
            if (updateError) {
              console.error(`❌ UPDATE error on ${table}:`, updateError);
              throw updateError;
            }
            console.log(`✅ Successfully updated record ${id} in ${table}`);
            break;

          case 'DELETE':
            if (!data.id) {
              throw new Error(`DELETE operation missing required 'id' field for table ${table}`);
            }
            const { error: deleteError } = await supabase.from(table).delete().eq('id', data.id);
            if (deleteError) {
              console.error(`❌ DELETE error on ${table}:`, deleteError);
              throw deleteError;
            }
            console.log(`✅ Successfully deleted record ${data.id} from ${table}`);
            break;

          default:
            throw new Error(`Unknown action type: ${type}`);
        }

        // Success - exit retry loop
        return;

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed for ${type} on ${table}:`, error);

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ Retrying in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All attempts failed
    const errorMessage = `Failed to execute ${type} on ${table} after ${maxRetries} attempts: ${lastError?.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    this.syncQueue = [];
    this.offlineData.clear();
    await Promise.all([
      AsyncStorage.removeItem('offline_sync_queue'),
      AsyncStorage.removeItem('offline_data'),
    ]);
  }

  /**
   * Clear failed actions for a specific table (useful for fixing UUID format issues)
   */
  async clearFailedActionsForTable(table: string): Promise<void> {
    const initialCount = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(action => action.table !== table);
    const clearedCount = initialCount - this.syncQueue.length;
    
    if (clearedCount > 0) {
      await this.saveOfflineData();
      console.log(`🧹 Cleared ${clearedCount} failed actions for table ${table}`);
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
        this.syncQueue.length > 0 ? Math.max(...this.syncQueue.map((a) => a.timestamp)) : null,
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
        errors: ['Device is offline'],
      };
    }

    return this.syncOfflineActions();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
  async optimisticUpdate(table: string, id: string, data: any, userId: string): Promise<void> {
    // Update local data immediately
    const key = `${table}_${id}`;
    await this.storeOfflineData(key, { ...data, id });

    // Queue for sync
    await this.queueAction({
      type: 'UPDATE',
      table,
      data: { ...data, id },
      userId,
      maxRetries: 3,
    });
  }

  /**
   * Optimistic create - create local data immediately and queue for sync
   */
  async optimisticCreate(
    table: string,
    data: any,
    userId: string,
    tempId?: string
  ): Promise<string> {
    const id = tempId || this.generateId();
    const dataWithId = { ...data, id };

    // Store local data immediately
    const key = `${table}_${id}`;
    await this.storeOfflineData(key, dataWithId);

    // Queue for sync
    await this.queueAction({
      type: 'CREATE',
      table,
      data: dataWithId,
      userId,
      maxRetries: 3,
    });

    return id;
  }

  /**
   * Optimistic delete - remove local data immediately and queue for sync
   */
  async optimisticDelete(table: string, id: string, userId: string): Promise<void> {
    // Remove local data immediately
    const key = `${table}_${id}`;
    await this.removeOfflineData(key);

    // Queue for sync
    await this.queueAction({
      type: 'DELETE',
      table,
      data: { id },
      userId,
      maxRetries: 3,
    });
  }
}

export const offlineService = OfflineService.getInstance();
export default offlineService;
