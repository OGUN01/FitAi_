import { useEffect } from 'react';
import { useOfflineStore } from '../stores/offlineStore';
import { offlineService, SyncResult } from '../services/offline';

export interface UseOfflineReturn {
  // State
  isOnline: boolean;
  syncInProgress: boolean;
  queueLength: number;
  lastSyncAttempt: number | null;
  lastSyncResult: SyncResult | null;
  autoSyncEnabled: boolean;

  // Actions
  syncNow: () => Promise<SyncResult>;
  clearOfflineData: () => Promise<void>;
  setAutoSync: (enabled: boolean) => void;

  // Utility functions
  isDataStale: (data: any, maxAgeMinutes?: number) => boolean;
  optimisticUpdate: (table: string, id: string, data: any, userId: string) => Promise<void>;
  optimisticCreate: (table: string, data: any, userId: string, tempId?: string) => Promise<string>;
  optimisticDelete: (table: string, id: string, userId: string) => Promise<void>;
}

/**
 * Custom hook for offline functionality
 * Provides access to offline state and actions
 */
export const useOffline = (): UseOfflineReturn => {
  const {
    isOnline,
    syncInProgress,
    queueLength,
    lastSyncAttempt,
    lastSyncResult,
    autoSyncEnabled,
    initialize,
    syncNow,
    clearOfflineData,
    setAutoSync,
    updateSyncStatus,
  } = useOfflineStore();

  // Initialize offline functionality
  useEffect(() => {
    initialize();

    // Update sync status periodically
    const interval = setInterval(() => {
      updateSyncStatus();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [initialize, updateSyncStatus]);

  return {
    isOnline,
    syncInProgress,
    queueLength,
    lastSyncAttempt,
    lastSyncResult,
    autoSyncEnabled,
    syncNow,
    clearOfflineData,
    setAutoSync,
    isDataStale: offlineService.isDataStale.bind(offlineService),
    optimisticUpdate: offlineService.optimisticUpdate.bind(offlineService),
    optimisticCreate: offlineService.optimisticCreate.bind(offlineService),
    optimisticDelete: offlineService.optimisticDelete.bind(offlineService),
  };
};

/**
 * Hook to check if device is online
 * Returns boolean indicating network status
 */
export const useIsOnline = (): boolean => {
  const isOnline = useOfflineStore((state) => state.isOnline);
  return isOnline;
};

/**
 * Hook to check if sync is in progress
 * Useful for showing sync indicators
 */
export const useSyncInProgress = (): boolean => {
  const syncInProgress = useOfflineStore((state) => state.syncInProgress);
  return syncInProgress;
};

/**
 * Hook to get sync queue length
 * Useful for showing pending sync count
 */
export const useSyncQueueLength = (): number => {
  const queueLength = useOfflineStore((state) => state.queueLength);
  return queueLength;
};

/**
 * Hook to get last sync result
 * Useful for showing sync status messages
 */
export const useLastSyncResult = (): SyncResult | null => {
  const lastSyncResult = useOfflineStore((state) => state.lastSyncResult);
  return lastSyncResult;
};

/**
 * Hook for offline actions only
 * Useful when you only need actions without state
 */
export const useOfflineActions = () => {
  const { syncNow, clearOfflineData, setAutoSync } = useOfflineStore();

  return {
    syncNow,
    clearOfflineData,
    setAutoSync,
    optimisticUpdate: offlineService.optimisticUpdate.bind(offlineService),
    optimisticCreate: offlineService.optimisticCreate.bind(offlineService),
    optimisticDelete: offlineService.optimisticDelete.bind(offlineService),
  };
};

/**
 * Hook for optimistic updates
 * Provides easy access to optimistic CRUD operations
 */
export const useOptimisticUpdates = (userId: string) => {
  return {
    create: (table: string, data: any, tempId?: string) =>
      offlineService.optimisticCreate(table, data, userId, tempId),

    update: (table: string, id: string, data: any) =>
      offlineService.optimisticUpdate(table, id, data, userId),

    delete: (table: string, id: string) => offlineService.optimisticDelete(table, id, userId),
  };
};

/**
 * Hook to get offline data for a specific table
 * Useful for displaying cached data when offline
 */
export const useOfflineData = (table: string) => {
  const { isOnline } = useOffline();

  const getOfflineData = (id?: string) => {
    if (id) {
      return offlineService.getOfflineData(`${table}_${id}`);
    }
    return offlineService.getOfflineDataByTable(table);
  };

  const storeOfflineData = (id: string, data: any) => {
    return offlineService.storeOfflineData(`${table}_${id}`, data);
  };

  const removeOfflineData = (id: string) => {
    return offlineService.removeOfflineData(`${table}_${id}`);
  };

  return {
    isOnline,
    getOfflineData,
    storeOfflineData,
    removeOfflineData,
  };
};

export default useOffline;
