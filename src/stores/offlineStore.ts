import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService, SyncResult, OfflineAction } from '../services/offline';

interface OfflineState {
  // State
  isOnline: boolean;
  syncInProgress: boolean;
  queueLength: number;
  lastSyncAttempt: number | null;
  lastSyncResult: SyncResult | null;
  autoSyncEnabled: boolean;

  // Actions
  initialize: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  clearOfflineData: () => Promise<void>;
  setAutoSync: (enabled: boolean) => void;
  updateNetworkStatus: (isOnline: boolean) => void;
  updateSyncStatus: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: true,
      syncInProgress: false,
      queueLength: 0,
      lastSyncAttempt: null,
      lastSyncResult: null,
      autoSyncEnabled: true,

      // Actions
      initialize: async () => {
        try {
          // Set up network listener
          const removeListener = offlineService.addNetworkListener((isOnline) => {
            get().updateNetworkStatus(isOnline);
          });

          // Update initial status
          get().updateSyncStatus();

          // Store the cleanup function (in a real app, you'd want to call this on unmount)
          // For now, we'll just update the status
        } catch (error) {
          console.warn('Failed to initialize offline store:', error);
        }
      },

      syncNow: async (): Promise<SyncResult> => {
        set({ syncInProgress: true });

        try {
          const result = await offlineService.forcSync();
          
          set({
            syncInProgress: false,
            lastSyncResult: result,
            lastSyncAttempt: Date.now(),
          });

          // Update queue length after sync
          get().updateSyncStatus();

          return result;
        } catch (error) {
          const errorResult: SyncResult = {
            success: false,
            syncedActions: 0,
            failedActions: 0,
            errors: [error instanceof Error ? error.message : 'Sync failed'],
          };

          set({
            syncInProgress: false,
            lastSyncResult: errorResult,
            lastSyncAttempt: Date.now(),
          });

          return errorResult;
        }
      },

      clearOfflineData: async () => {
        try {
          await offlineService.clearOfflineData();
          
          set({
            queueLength: 0,
            lastSyncResult: null,
            lastSyncAttempt: null,
          });
        } catch (error) {
          console.warn('Failed to clear offline data:', error);
        }
      },

      setAutoSync: (enabled: boolean) => {
        set({ autoSyncEnabled: enabled });
      },

      updateNetworkStatus: (isOnline: boolean) => {
        const wasOnline = get().isOnline;
        set({ isOnline });

        // Auto-sync when coming back online (if enabled)
        if (!wasOnline && isOnline && get().autoSyncEnabled) {
          get().syncNow();
        }
      },

      updateSyncStatus: () => {
        const status = offlineService.getSyncStatus();
        set({
          isOnline: status.isOnline,
          syncInProgress: status.syncInProgress,
          queueLength: status.queueLength,
          lastSyncAttempt: status.lastSyncAttempt,
        });
      },
    }),
    {
      name: 'offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        autoSyncEnabled: state.autoSyncEnabled,
        lastSyncResult: state.lastSyncResult,
      }),
    }
  )
);

export default useOfflineStore;
