// Track B Integration Hook for Track C Features
// Provides comprehensive React integration for all Track B infrastructure services

import { useState, useEffect, useCallback } from 'react';
import {
  trackIntegrationService,
  IntegrationStatus,
  IntegrationEvent,
  TrackAAuthData,
} from '../services/trackIntegrationService';
import { useMigration } from './useMigration';
import { realTimeSyncService, SyncStatus } from '../services/syncService';
import { syncMonitoringService, SyncMetrics, ConnectionHealth } from '../services/syncMonitoring';
import { backupRecoveryService, BackupStatus } from '../services/backupRecoveryService';
import {
  intelligentSyncScheduler,
  SyncDecision,
  DeviceConditions,
} from '../services/intelligentSyncScheduler';

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

  // Sync
  sync: {
    status: SyncStatus;
    metrics: SyncMetrics | null;
    connectionHealth: ConnectionHealth | null;
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    startSync: () => Promise<void>;
    forceSync: () => Promise<void>;
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

  // Intelligent Scheduling
  scheduler: {
    decision: SyncDecision | null;
    conditions: DeviceConditions | null;
    stats: any;
    makeSyncDecision: (priority?: string) => Promise<SyncDecision>;
    getCurrentConditions: () => Promise<DeviceConditions>;
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

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
    pendingChanges: 0,
    queuedOperations: 0,
    syncProgress: 0,
    nextSyncTime: null,
    connectionQuality: 'good',
  });

  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth | null>(null);

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

  // Scheduler state
  const [syncDecision, setSyncDecision] = useState<SyncDecision | null>(null);
  const [deviceConditions, setDeviceConditions] = useState<DeviceConditions | null>(null);
  const [schedulerStats, setSchedulerStats] = useState<any>(null);

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

    // Subscribe to sync events
    const unsubscribeSyncStatus = realTimeSyncService.onStatusChange((status) => {
      setSyncStatus(status);
    });

    // Subscribe to monitoring events
    const unsubscribeMetrics = syncMonitoringService.onMetricsUpdate((metrics) => {
      setSyncMetrics(metrics);
    });

    const unsubscribeHealth = syncMonitoringService.onHealthUpdate((health) => {
      setConnectionHealth(health);
    });

    // Subscribe to backup events
    const unsubscribeBackupStatus = backupRecoveryService.onStatusChange((status) => {
      setBackupStatus(status);
    });

    // Subscribe to scheduler events
    const unsubscribeSchedulerDecision = intelligentSyncScheduler.onSyncDecision((decision) => {
      setSyncDecision(decision);
    });

    const unsubscribeSchedulerConditions = intelligentSyncScheduler.onConditionsUpdate(
      (conditions) => {
        setDeviceConditions(conditions);
      }
    );

    return () => {
      unsubscribeEvents();
      unsubscribeStatus();
      unsubscribeSyncStatus();
      unsubscribeMetrics();
      unsubscribeHealth();
      unsubscribeBackupStatus();
      unsubscribeSchedulerDecision();
      unsubscribeSchedulerConditions();
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

  const startSync = useCallback(async () => {
    setError(null);
    try {
      await realTimeSyncService.startSync();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start sync';
      setError(errorMessage);
      console.error('Sync start failed:', err);
    }
  }, []);

  const forceSync = useCallback(async () => {
    setError(null);
    try {
      await realTimeSyncService.forcSync();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to force sync';
      setError(errorMessage);
      console.error('Force sync failed:', err);
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

  const makeSyncDecision = useCallback(async (priority = 'normal') => {
    try {
      const decision = await intelligentSyncScheduler.makeSyncDecision(priority as any);
      setSyncDecision(decision);
      return decision;
    } catch (err) {
      console.error('Failed to make sync decision:', err);
      throw err;
    }
  }, []);

  const getCurrentConditions = useCallback(async () => {
    try {
      const conditions = await intelligentSyncScheduler.getCurrentConditions();
      setDeviceConditions(conditions);
      return conditions;
    } catch (err) {
      console.error('Failed to get current conditions:', err);
      throw err;
    }
  }, []);

  // Update scheduler stats periodically
  useEffect(() => {
    const updateStats = () => {
      try {
        const stats = intelligentSyncScheduler.getStats();
        setSchedulerStats(stats);
      } catch (err) {
        console.error('Failed to get scheduler stats:', err);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Every 30 seconds

    return () => clearInterval(interval);
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

    // Sync
    sync: {
      status: syncStatus,
      metrics: syncMetrics,
      connectionHealth,
      isOnline: syncStatus.isOnline,
      isSyncing: syncStatus.isSyncing,
      lastSyncTime: syncStatus.lastSyncTime,
      startSync,
      forceSync,
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

    // Intelligent Scheduling
    scheduler: {
      decision: syncDecision,
      conditions: deviceConditions,
      stats: schedulerStats,
      makeSyncDecision,
      getCurrentConditions,
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
