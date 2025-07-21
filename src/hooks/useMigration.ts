// Migration Hook for Track B Infrastructure
// Provides easy React integration for migration functionality

import { useState, useEffect, useCallback } from 'react';
import { migrationManager, MigrationState, MigrationAttempt } from '../services/migrationManager';
import { MigrationProgress, MigrationResult } from '../services/migration';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface UseMigrationReturn {
  // State
  state: MigrationState;
  progress: MigrationProgress | null;
  result: MigrationResult | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startMigration: (userId: string) => Promise<void>;
  cancelMigration: () => Promise<void>;
  clearResult: () => void;
  checkStatus: () => Promise<void>;

  // Computed values
  canStart: boolean;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  hasLocalData: boolean;
}

// ============================================================================
// MIGRATION HOOK
// ============================================================================

export const useMigration = (): UseMigrationReturn => {
  const [state, setState] = useState<MigrationState>({
    isActive: false,
    canStart: false,
    hasLocalData: false,
    lastMigrationAttempt: null,
    migrationHistory: [],
  });
  
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Subscribe to migration manager events
    const unsubscribeState = migrationManager.onStateChange(setState);
    const unsubscribeProgress = migrationManager.onProgress(setProgress);
    const unsubscribeResult = migrationManager.onResult(setResult);

    // Initial status check
    checkStatus();

    return () => {
      unsubscribeState();
      unsubscribeProgress();
      unsubscribeResult();
    };
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const startMigration = useCallback(async (userId: string) => {
    if (!userId) {
      setError('User ID is required for migration');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await migrationManager.startMigration(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start migration';
      setError(errorMessage);
      console.error('Migration start failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelMigration = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await migrationManager.cancelMigration();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel migration';
      setError(errorMessage);
      console.error('Migration cancel failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    migrationManager.clearMigrationState();
    setResult(null);
    setProgress(null);
    setError(null);
  }, []);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await migrationManager.checkMigrationStatus();
      
      // Get current progress and result
      const currentProgress = migrationManager.getCurrentProgress();
      const currentResult = migrationManager.getCurrentResult();
      
      if (currentProgress) setProgress(currentProgress);
      if (currentResult) setResult(currentResult);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check migration status';
      setError(errorMessage);
      console.error('Migration status check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const canStart = state.canStart && !isLoading && !error;
  const isActive = state.isActive || progress?.status === 'running';
  const isCompleted = result?.success === true;
  const isFailed = result?.success === false;
  const hasLocalData = state.hasLocalData;

  // ============================================================================
  // RETURN OBJECT
  // ============================================================================

  return {
    // State
    state,
    progress,
    result,
    isLoading,
    error,

    // Actions
    startMigration,
    cancelMigration,
    clearResult,
    checkStatus,

    // Computed values
    canStart,
    isActive,
    isCompleted,
    isFailed,
    hasLocalData,
  };
};

// ============================================================================
// MIGRATION STATUS HOOK
// ============================================================================

export const useMigrationStatus = () => {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [lastMigration, setLastMigration] = useState<MigrationAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await migrationManager.checkMigrationStatus();
        setHasLocalData(status.hasLocalData);
        setLastMigration(status.migrationHistory[0] || null);
      } catch (error) {
        console.error('Failed to check migration status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  return {
    hasLocalData,
    lastMigration,
    isLoading,
    needsMigration: hasLocalData && (!lastMigration || !lastMigration.success),
  };
};

// ============================================================================
// MIGRATION PROGRESS HOOK
// ============================================================================

export const useMigrationProgress = () => {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    const unsubscribeProgress = migrationManager.onProgress(setProgress);
    const unsubscribeResult = migrationManager.onResult(setResult);

    // Get current state
    const currentProgress = migrationManager.getCurrentProgress();
    const currentResult = migrationManager.getCurrentResult();
    
    if (currentProgress) setProgress(currentProgress);
    if (currentResult) setResult(currentResult);

    return () => {
      unsubscribeProgress();
      unsubscribeResult();
    };
  }, []);

  return {
    progress,
    result,
    isRunning: progress?.status === 'running',
    isCompleted: result?.success === true,
    isFailed: result?.success === false,
    percentage: progress?.percentage || 0,
    currentStep: progress?.currentStep || '',
    message: progress?.message || '',
    errors: result?.errors || [],
    warnings: result?.warnings || [],
  };
};

export default useMigration;
