// Migration Manager for Track B Infrastructure
// Coordinates migration process with UI updates and user interaction

import { migrationEngine, MigrationProgress, MigrationResult } from './migration';
import { enhancedLocalStorage } from './localStorage';
import { dataManager } from './dataManager';
import { syncManager } from './syncManager';
import { profileValidator } from './profileValidator';
import { supabase } from './supabase';
import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  SyncConflict,
} from '../types/profileData';

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
          errors: [
            {
              step: 'unknown',
              code: 'MIGRATION_START_FAILED',
              message: error.message,
              timestamp: new Date(),
              retryCount: 0,
              recoverable: true,
            },
          ],
          warnings: [],
        },
        migratedDataCount: {
          userProfiles: 0,
          workoutSessions: 0,
          mealLogs: 0,
          bodyMeasurements: 0,
          achievements: 0,
        },
        errors: [
          {
            step: 'unknown',
            code: 'MIGRATION_START_FAILED',
            message: error.message,
            timestamp: new Date(),
            retryCount: 0,
            recoverable: true,
          },
        ],
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

  /**
   * Set progress callback (for React hooks integration)
   */
  setProgressCallback(callback: (progress: MigrationProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Get current migration state
   */
  async getState(): Promise<MigrationState> {
    return await this.checkMigrationStatus();
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
      const hasFitnessData =
        localData.fitness &&
        (localData.fitness.workouts?.length > 0 || localData.fitness.sessions?.length > 0);
      const hasNutritionData =
        localData.nutrition &&
        (localData.nutrition.meals?.length > 0 || localData.nutrition.logs?.length > 0);
      const hasProgressData =
        localData.progress &&
        (localData.progress.measurements?.length > 0 ||
          localData.progress.achievements?.length > 0);

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
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  private notifyResultChange(result: MigrationResult): void {
    this.resultCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in result callback:', error);
      }
    });
  }

  private notifyStateChange(state: MigrationState): void {
    this.stateCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    });
  }

  // ============================================================================
  // PROFILE DATA MIGRATION METHODS
  // ============================================================================

  /**
   * Check if profile data migration is needed for a user
   */
  async checkProfileMigrationNeeded(userId: string): Promise<boolean> {
    try {
      console.log('🔍 Checking profile migration for user:', userId);

      // Set user ID in data manager
      dataManager.setUserId(userId);

      // Debug: Check if hasLocalData method exists
      if (typeof dataManager.hasLocalData !== 'function') {
        console.error('❌ hasLocalData method not found on dataManager');
        return false;
      }

      // Check if user has local profile data
      const hasLocalData = await dataManager.hasLocalData();
      console.log('📊 Local data check result:', hasLocalData);

      if (!hasLocalData) {
        console.log('📊 No local profile data found, migration not needed');
        return false;
      }

      // Check if user already has remote profile data
      // Use the correct table name 'profiles' instead of 'user_profiles'
      const { data: remoteProfile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)  // profiles table uses 'id' not 'user_id'
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking remote profile data:', error);
        return false;
      }

      // If user has local data but no remote data, migration is needed
      const migrationNeeded = hasLocalData && !remoteProfile;
      console.log(
        `📊 Profile migration needed: ${migrationNeeded} (local: ${hasLocalData}, remote: ${!!remoteProfile})`
      );

      return migrationNeeded;
    } catch (error) {
      console.error('❌ Error checking profile migration status:', error);
      return false;
    }
  }

  /**
   * Start profile data migration process
   */
  async startProfileMigration(userId: string): Promise<MigrationResult> {
    console.log('🚀 Starting profile data migration for user:', userId);

    try {
      // Use the existing syncManager for the actual migration
      const result = await syncManager.migrateLocalDataToRemote(userId);

      if (result.success) {
        console.log('✅ Profile migration completed successfully');

        // Update migration history
        const attempt: MigrationAttempt = {
          id: `profile_${Date.now()}`,
          startTime: new Date(),
          endTime: new Date(),
          success: true,
          dataCount: {
            workouts: 0, // Profile migration doesn't include workouts
            meals: 0, // Profile migration doesn't include meals
            measurements: 0, // Profile migration doesn't include measurements
          },
        };

        // Store migration attempt
        await this.storeMigrationAttempt(attempt);
      } else {
        console.error('❌ Profile migration failed:', result.errors);
      }

      return result;
    } catch (error) {
      console.error('❌ Profile migration error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
      return {
        success: false,
        migratedData: {},
        conflicts: [],
        errors: [errorMessage],
        duration: 0,
      };
    }
  }

  /**
   * Validate local profile data before migration
   */
  async validateProfileData(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate personal info
      const personalInfo = await dataManager.loadPersonalInfo();
      if (personalInfo) {
        const validation = profileValidator.validatePersonalInfo(personalInfo);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Personal Info: ${e}`));
        }
      }

      // Validate fitness goals
      const fitnessGoals = await dataManager.loadFitnessGoals();
      if (fitnessGoals) {
        const validation = profileValidator.validateFitnessGoals(fitnessGoals);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Fitness Goals: ${e}`));
        }
      }

      // Validate diet preferences
      const dietPreferences = await dataManager.loadDietPreferences();
      if (dietPreferences) {
        const validation = profileValidator.validateDietPreferences(dietPreferences);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Diet Preferences: ${e}`));
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Store migration attempt in history
   */
  private async storeMigrationAttempt(attempt: MigrationAttempt): Promise<void> {
    try {
      const currentState = await this.getState();
      const updatedHistory = [...currentState.migrationHistory, attempt];

      // Keep only last 10 attempts
      if (updatedHistory.length > 10) {
        updatedHistory.splice(0, updatedHistory.length - 10);
      }

      // Update state with new history
      const newState: MigrationState = {
        ...currentState,
        lastMigrationAttempt: attempt.endTime || new Date(),
        migrationHistory: updatedHistory,
      };

      await enhancedLocalStorage.setItem('migration_state', newState);
    } catch (error) {
      console.error('❌ Failed to store migration attempt:', error);
    }
  }

  // ============================================================================
  // DEBUG & TESTING METHODS
  // ============================================================================

  /**
   * Test the complete migration detection and flow
   */
  async testMigrationFlow(userId: string): Promise<void> {
    try {
      console.log('🧪 Testing complete migration flow for user:', userId);

      // Step 0: Test localStorage methods directly
      console.log('🧪 Step 0: Testing localStorage methods...');
      await dataManager.testLocalStorageMethods();

      // Step 1: Test data manager methods
      console.log('🧪 Step 1: Testing DataManager methods...');
      await dataManager.testMigrationDetection();

      // Step 2: Test migration detection
      console.log('🧪 Step 2: Testing migration detection...');
      const migrationNeeded = await this.checkProfileMigrationNeeded(userId);
      console.log('📊 Migration needed result:', migrationNeeded);

      // Step 3: Test profile data validation
      console.log('🧪 Step 3: Testing profile data validation...');
      const validationResult = await this.validateProfileData();
      console.log('📊 Validation result:', validationResult);

      console.log('✅ Migration flow test completed successfully');
    } catch (error) {
      console.error('❌ Migration flow test failed:', error);
    }
  }

  /**
   * Create test environment for migration
   */
  async setupTestEnvironment(userId: string): Promise<boolean> {
    try {
      console.log('🧪 Setting up test environment for migration...');

      // Set user ID
      dataManager.setUserId(userId);

      // Create sample data
      const sampleCreated = await dataManager.createSampleProfileData();

      if (sampleCreated) {
        console.log('✅ Test environment setup completed');
        return true;
      } else {
        console.error('❌ Failed to create sample data');
        return false;
      }
    } catch (error) {
      console.error('❌ Test environment setup failed:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const migrationManager = new MigrationManager();
export default migrationManager;
