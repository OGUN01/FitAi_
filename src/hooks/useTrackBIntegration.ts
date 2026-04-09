// Track B Integration Hook for Track C Features
// Provides React integration for Track B infrastructure services (migration, backup, offline status)

import { useState, useEffect, useCallback } from 'react';
import {
  trackIntegrationService,
  IntegrationStatus,
  IntegrationEvent,
  TrackAAuthData,
} from '../services/trackIntegrationService';
import { useMigration } from './useMigration';
import { backupRecoveryService, BackupStatus } from '../services/backupRecoveryService';
import { offlineService } from '../services/offline/OfflineService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface UseTrackBIntegrationReturn {
  // Integration Status
  integration: {
    status: IntegrationStatus;
    isInitialized: boolean;
    isConnected: boolean;
    lastEvent: IntegrationEvent | null;
    serviceHealth: Record<string, any>;
  };

  // Migration
  migration: {
    canStart: boolean;
    isActive: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    progress: any;
    result: any;
    startMigration: (userId: string) => Promise<void>;
    clearResult: () => void;
  };

  // Sync (simplified — uses OfflineService online status)
  sync: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
  };

  // Backup
  backup: {
    status: BackupStatus;
    isBackingUp: boolean;
    lastBackupTime: Date | null;
    availableBackups: any[];
    createBackup: (type?: 'full' | 'incremental', description?: string) => Promise<void>;
    restoreFromBackup: (backupId: string, options?: any) => Promise<void>;
  };

  // Actions
  actions: {
    initialize: () => Promise<void>;
    handleAuthentication: (authData: TrackAAuthData) => Promise<void>;
    startServices: () => Promise<void>;
    stopServices: () => Promise<void>;
    getServiceHealth: () => Promise<Record<string, any>>;
  };

  // State
  isLoading: boolean;
  error: string | null;
  warnings: string[];
}

// ============================================================================
// TRACK B INTEGRATION HOOK
// ============================================================================

export const useTrackBIntegration = (): UseTrackBIntegrationReturn => {
  // Integration state
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    isInitialized: false,
    trackAConnected: false,
    trackCConnected: false,
    migrationCompleted: false,
    syncActive: false,
    backupActive: false,
    lastIntegrationCheck: null,
    services: {
      migration: 'inactive',
      sync: 'inactive',
      backup: 'inactive',
      monitoring: 'inactive',
      scheduler: 'inactive',
    },
  });

  const [lastEvent, setLastEvent] = useState<IntegrationEvent | null>(null);
  const [serviceHealth, setServiceHealth] = useState<Record<string, any>>({});

  // Offline/sync state (from OfflineService)
  const [isOnline, setIsOnline] = useState(offlineService.isDeviceOnline());

  // Backup state
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    isBackingUp: false,
    lastBackupTime: null,
    lastBackupResult: null,
    nextBackupTime: null,
    availableBackups: [],
    totalBackupSize: 0,
    backupHealth: 'good',
  });

  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Use migration hook
  const migration = useMigration();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Subscribe to integration events
    const unsubscribeEvents = trackIntegrationService.onEvent((event) => {
      setLastEvent(event);

      if (event.type === 'error') {
        setError(event.data.error || 'Unknown error occurred');
      }
    });

    const unsubscribeStatus = trackIntegrationService.onStatusChange((status) => {
      setIntegrationStatus(status);
    });

    // Subscribe to network status from OfflineService
    const unsubscribeNetwork = offlineService.addNetworkListener((online) => {
      setIsOnline(online);
    });

    // Subscribe to backup events
    const unsubscribeBackupStatus = backupRecoveryService.onStatusChange((status) => {
      setBackupStatus(status);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeStatus();
      unsubscribeNetwork();
      unsubscribeBackupStatus();
    };
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await trackIntegrationService.initialize();

      // Update service health
      const health = await trackIntegrationService.getServiceHealth();
      setServiceHealth(health);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Track B';
      setError(errorMessage);
      console.error('Track B initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAuthentication = useCallback(async (authData: TrackAAuthData) => {
    setIsLoading(true);
    setError(null);

    try {
      await trackIntegrationService.handleTrackAAuthentication(authData);

      // Update service health after authentication
      const health = await trackIntegrationService.getServiceHealth();
      setServiceHealth(health);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to handle authentication';
      setError(errorMessage);
      console.error('Authentication handling failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await trackIntegrationService.startSyncServices();
      await trackIntegrationService.startBackupServices();

      const health = await trackIntegrationService.getServiceHealth();
      setServiceHealth(health);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start services';
      setError(errorMessage);
      console.error('Service startup failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await trackIntegrationService.stop();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop services';
      setError(errorMessage);
      console.error('Service shutdown failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getServiceHealth = useCallback(async () => {
    try {
      const health = await trackIntegrationService.getServiceHealth();
      setServiceHealth(health);
      return health;
    } catch (err) {
      console.error('Failed to get service health:', err);
      return {};
    }
  }, []);

  const createBackup = useCallback(
    async (type: 'full' | 'incremental' = 'full', description = '') => {
      setError(null);
      try {
        await backupRecoveryService.createBackup(type, description);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
        setError(errorMessage);
        console.error('Backup creation failed:', err);
      }
    },
    []
  );

  const restoreFromBackup = useCallback(async (backupId: string, options: any = {}) => {
    setError(null);
    try {
      const recoveryOptions = {
        backupId,
        recoveryType: 'full',
        mergeStrategy: 'replace',
        validateData: true,
        createRecoveryPoint: true,
        ...options,
      };
      await backupRecoveryService.recoverFromBackup(recoveryOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore from backup';
      setError(errorMessage);
      console.error('Backup restoration failed:', err);
    }
  }, []);

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    // Integration Status
    integration: {
      status: integrationStatus,
      isInitialized: integrationStatus.isInitialized,
      isConnected: integrationStatus.trackAConnected,
      lastEvent,
      serviceHealth,
    },

    // Migration
    migration: {
      canStart: migration.canStart,
      isActive: migration.isActive,
      isCompleted: migration.isCompleted,
      isFailed: migration.isFailed,
      progress: migration.progress,
      result: migration.result,
      startMigration: migration.startMigration,
      clearResult: migration.clearResult,
    },

    // Sync (simplified — uses OfflineService for online status)
    sync: {
      isOnline,
      isSyncing: false,
      lastSyncTime: null,
    },

    // Backup
    backup: {
      status: backupStatus,
      isBackingUp: backupStatus.isBackingUp,
      lastBackupTime: backupStatus.lastBackupTime,
      availableBackups: backupStatus.availableBackups,
      createBackup,
      restoreFromBackup,
    },

    // Actions
    actions: {
      initialize,
      handleAuthentication,
      startServices,
      stopServices,
      getServiceHealth,
    },

    // State
    isLoading: isLoading || migration.isLoading,
    error: error || migration.error,
    warnings,
  };
};

export default useTrackBIntegration;
