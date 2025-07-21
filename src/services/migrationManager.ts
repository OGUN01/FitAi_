// Migration Manager for Track B Infrastructure
// Coordinates migration process with UI updates and user interaction

import { migrationEngine, MigrationProgress, MigrationResult } from './migration';
import { enhancedLocalStorage } from './localStorage';
import { dataManager } from './dataManager';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface MigrationManagerConfig {
  autoStartAfterAuth: boolean;
  showProgressUI: boolean;
  allowUserCancel: boolean;
  backgroundMigration: boolean;
}

export interface MigrationState {
  isActive: boolean;
  canStart: boolean;
  hasLocalData: boolean;
  lastMigrationAttempt: Date | null;
  migrationHistory: MigrationAttempt[];
}

export interface MigrationAttempt {
  id: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
  dataCount: {
    workouts: number;
    meals: number;
    measurements: number;
  };
}

// ============================================================================
// MIGRATION MANAGER CLASS
// ============================================================================

export class MigrationManager {
  private config: MigrationManagerConfig;
  private currentMigration: {
    progress: MigrationProgress | null;
    result: MigrationResult | null;
    unsubscribe: (() => void) | null;
  } = {
    progress: null,
    result: null,
    unsubscribe: null,
  };
  
  private progressCallbacks: ((progress: MigrationProgress) => void)[] = [];
  private resultCallbacks: ((result: MigrationResult) => void)[] = [];
  private stateCallbacks: ((state: MigrationState) => void)[] = [];

  constructor(config?: Partial<MigrationManagerConfig>) {
    this.config = {
      autoStartAfterAuth: true,
      showProgressUI: true,
      allowUserCancel: true,
      backgroundMigration: false,
      ...config,
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if migration is needed and possible
   */
  async checkMigrationStatus(): Promise<MigrationState> {
    try {
      const hasLocalData = await this.hasLocalDataToMigrate();
      const migrationHistory = await this.getMigrationHistory();
      const lastAttempt = migrationHistory[0] || null;

      const state: MigrationState = {
        isActive: this.currentMigration.progress?.status === 'running',
        canStart: hasLocalData && !this.currentMigration.progress,
        hasLocalData,
        lastMigrationAttempt: lastAttempt?.startTime || null,
        migrationHistory,
      };

      this.notifyStateChange(state);
      return state;
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return {
        isActive: false,
        canStart: false,
        hasLocalData: false,
        lastMigrationAttempt: null,
        migrationHistory: [],
      };
    }
  }

  /**
   * Start migration process
   */
  async startMigration(userId: string): Promise<void> {
    if (this.currentMigration.progress?.status === 'running') {
      throw new Error('Migration is already in progress');
    }

    try {
      // Subscribe to migration progress
      this.currentMigration.unsubscribe = migrationEngine.onProgress((progress) => {
        this.currentMigration.progress = progress;
        this.notifyProgressChange(progress);
      });

      // Start migration
      const result = await migrationEngine.migrateToSupabase(userId);
      
      this.currentMigration.result = result;
      this.notifyResultChange(result);

      // Save migration attempt to history
      await this.saveMigrationAttempt(result);

      // Update state
      await this.checkMigrationStatus();

    } catch (error) {
      const errorResult: MigrationResult = {
        success: false,
        migrationId: `failed_${Date.now()}`,
        progress: {
          migrationId: `failed_${Date.now()}`,
          status: 'failed',
          currentStep: 'unknown',
          currentStepIndex: 0,
          totalSteps: 8,
          percentage: 0,
          startTime: new Date(),
          endTime: new Date(),
          message: `Migration failed: ${error.message}`,
          errors: [{
            step: 'unknown',
            code: 'MIGRATION_START_FAILED',
            message: error.message,
            timestamp: new Date(),
            retryCount: 0,
            recoverable: true,
          }],
          warnings: [],
        },
        migratedDataCount: {
          userProfiles: 0,
          workoutSessions: 0,
          mealLogs: 0,
          bodyMeasurements: 0,
          achievements: 0,
        },
        errors: [{
          step: 'unknown',
          code: 'MIGRATION_START_FAILED',
          message: error.message,
          timestamp: new Date(),
          retryCount: 0,
          recoverable: true,
        }],
        warnings: [],
        duration: 0,
      };

      this.currentMigration.result = errorResult;
      this.notifyResultChange(errorResult);
      await this.saveMigrationAttempt(errorResult);
    } finally {
      if (this.currentMigration.unsubscribe) {
        this.currentMigration.unsubscribe();
        this.currentMigration.unsubscribe = null;
      }
    }
  }

  /**
   * Cancel ongoing migration
   */
  async cancelMigration(): Promise<void> {
    if (!this.config.allowUserCancel) {
      throw new Error('Migration cancellation is not allowed');
    }

    if (this.currentMigration.progress?.status !== 'running') {
      return;
    }

    try {
      // TODO: Implement migration cancellation in migration engine
      console.log('Migration cancellation requested');
      
      if (this.currentMigration.unsubscribe) {
        this.currentMigration.unsubscribe();
        this.currentMigration.unsubscribe = null;
      }

      this.currentMigration.progress = null;
      this.currentMigration.result = null;

      await this.checkMigrationStatus();
    } catch (error) {
      console.error('Failed to cancel migration:', error);
    }
  }

  /**
   * Get current migration progress
   */
  getCurrentProgress(): MigrationProgress | null {
    return this.currentMigration.progress;
  }

  /**
   * Get current migration result
   */
  getCurrentResult(): MigrationResult | null {
    return this.currentMigration.result;
  }

  /**
   * Clear migration state (after user acknowledges completion)
   */
  clearMigrationState(): void {
    this.currentMigration.progress = null;
    this.currentMigration.result = null;
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to migration progress updates
   */
  onProgress(callback: (progress: MigrationProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to migration result updates
   */
  onResult(callback: (result: MigrationResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to migration state changes
   */
  onStateChange(callback: (state: MigrationState) => void): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      const index = this.stateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async hasLocalDataToMigrate(): Promise<boolean> {
    try {
      const localData = await dataManager.exportAllData();
      if (!localData) return false;

      // Check if there's meaningful data to migrate
      const hasUserData = localData.user && Object.keys(localData.user).length > 0;
      const hasFitnessData = localData.fitness && (
        localData.fitness.workouts?.length > 0 ||
        localData.fitness.sessions?.length > 0
      );
      const hasNutritionData = localData.nutrition && (
        localData.nutrition.meals?.length > 0 ||
        localData.nutrition.logs?.length > 0
      );
      const hasProgressData = localData.progress && (
        localData.progress.measurements?.length > 0 ||
        localData.progress.achievements?.length > 0
      );

      return hasUserData || hasFitnessData || hasNutritionData || hasProgressData;
    } catch (error) {
      console.error('Failed to check local data:', error);
      return false;
    }
  }

  private async getMigrationHistory(): Promise<MigrationAttempt[]> {
    try {
      const history = await enhancedLocalStorage.getData<MigrationAttempt[]>('migration_history');
      return history || [];
    } catch (error) {
      console.error('Failed to get migration history:', error);
      return [];
    }
  }

  private async saveMigrationAttempt(result: MigrationResult): Promise<void> {
    try {
      const history = await this.getMigrationHistory();
      const attempt: MigrationAttempt = {
        id: result.migrationId,
        startTime: result.progress.startTime,
        endTime: result.progress.endTime,
        success: result.success,
        error: result.success ? undefined : result.errors[0]?.message,
        dataCount: {
          workouts: result.migratedDataCount.workoutSessions,
          meals: result.migratedDataCount.mealLogs,
          measurements: result.migratedDataCount.bodyMeasurements,
        },
      };

      history.unshift(attempt);
      // Keep only last 10 attempts
      if (history.length > 10) {
        history.splice(10);
      }

      await enhancedLocalStorage.storeData('migration_history', history);
    } catch (error) {
      console.error('Failed to save migration attempt:', error);
    }
  }

  private notifyProgressChange(progress: MigrationProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  private notifyResultChange(result: MigrationResult): void {
    this.resultCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in result callback:', error);
      }
    });
  }

  private notifyStateChange(state: MigrationState): void {
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const migrationManager = new MigrationManager();
export default migrationManager;
