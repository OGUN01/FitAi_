// Enhanced Data Manager for Track B Infrastructure
// Provides comprehensive data management with local storage, validation, and sync capabilities

import { enhancedLocalStorage } from './localStorage';
import { validationService } from '../utils/validation';
import { offlineService } from './offline';
import { 
  LocalStorageSchema,
  LocalUserData,
  LocalFitnessData,
  LocalNutritionData,
  LocalProgressData,
  OnboardingData,
  WorkoutSession,
  MealLog,
  BodyMeasurement,
  ValidationResult,
  SyncStatus
} from '../types/localData';

// ============================================================================
// DATA MANAGER SERVICE
// ============================================================================

export class DataManagerService {
  private static instance: DataManagerService;
  private isInitialized = false;
  private currentSchema: LocalStorageSchema | null = null;

  private constructor() {}

  static getInstance(): DataManagerService {
    if (!DataManagerService.instance) {
      DataManagerService.instance = new DataManagerService();
    }
    return DataManagerService.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    try {
      // Initialize enhanced local storage
      await enhancedLocalStorage.initialize();

      // Load current schema (use regular method since localStorage is now initialized)
      this.currentSchema = await enhancedLocalStorage.getStoredSchema();

      if (!this.currentSchema) {
        throw new Error('Failed to initialize local storage schema');
      }

      // Validate schema integrity
      const validation = validationService.validateLocalStorageSchema(this.currentSchema);
      if (!validation.isValid) {
        console.warn('Schema validation warnings:', validation.warnings);
        if (validation.errors.length > 0) {
          console.error('Schema validation errors:', validation.errors);
          // Attempt to repair schema
          await this.repairSchema(validation);
        }
      }

      this.isInitialized = true;
      console.log('Data Manager Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Data Manager Service:', error);
      throw error;
    }
  }

  private async repairSchema(validation: ValidationResult): Promise<void> {
    console.log('Attempting to repair schema...');
    // TODO: Implement schema repair logic based on validation errors
    // For now, we'll just log the errors
    validation.errors.forEach(error => {
      console.error(`Schema repair needed for ${error.field}: ${error.message}`);
    });
  }

  // ============================================================================
  // USER DATA MANAGEMENT
  // ============================================================================

  async storeOnboardingData(data: OnboardingData): Promise<void> {
    this.ensureInitialized();
    
    // Validate data
    const validation = validationService.validateOnboardingData(data);
    if (!validation.isValid) {
      throw new Error(`Invalid onboarding data: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Sanitize data
    const sanitizedData: OnboardingData = {
      personalInfo: validationService.sanitizePersonalInfo(data.personalInfo),
      fitnessGoals: data.fitnessGoals,
      isComplete: data.isComplete,
    };

    // Update schema
    if (this.currentSchema) {
      this.currentSchema.user.onboardingData = sanitizedData;
      this.currentSchema.updatedAt = new Date().toISOString();
      
      await enhancedLocalStorage.updateSchema(this.currentSchema);
    }
  }

  async getOnboardingData(): Promise<OnboardingData | null> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return null;
    }

    return this.currentSchema.user.onboardingData;
  }

  async updateUserPreferences(preferences: Partial<any>): Promise<void> {
    this.ensureInitialized();
    
    if (this.currentSchema) {
      this.currentSchema.user.preferences = {
        ...this.currentSchema.user.preferences,
        ...preferences,
      };
      this.currentSchema.updatedAt = new Date().toISOString();
      
      await enhancedLocalStorage.updateSchema(this.currentSchema);
    }
  }

  async getUserPreferences(): Promise<any> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return null;
    }

    return this.currentSchema.user.preferences;
  }

  // ============================================================================
  // FITNESS DATA MANAGEMENT
  // ============================================================================

  async storeWorkoutSession(session: WorkoutSession): Promise<void> {
    this.ensureInitialized();
    
    // Validate session
    const validation = validationService.validateWorkoutSession(session);
    if (!validation.isValid) {
      throw new Error(`Invalid workout session: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Add to schema
    if (this.currentSchema) {
      // Remove existing session with same ID
      this.currentSchema.fitness.sessions = this.currentSchema.fitness.sessions.filter(s => s.id !== session.id);
      
      // Add new session
      this.currentSchema.fitness.sessions.push({
        ...session,
        syncStatus: 'local' as SyncStatus,
      });
      
      this.currentSchema.updatedAt = new Date().toISOString();
      await enhancedLocalStorage.updateSchema(this.currentSchema);

      // Queue for sync if user is authenticated
      if (this.currentSchema.user.authState.isAuthenticated) {
        await this.queueForSync('workout_sessions', 'create', session);
      }
    }
  }

  async getWorkoutSessions(limit?: number): Promise<WorkoutSession[]> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return [];
    }

    const sessions = this.currentSchema.fitness.sessions;
    
    if (limit) {
      return sessions.slice(-limit).reverse(); // Get most recent sessions
    }
    
    return sessions.reverse(); // Most recent first
  }

  async updateWorkoutSession(sessionId: string, updates: Partial<WorkoutSession>): Promise<void> {
    this.ensureInitialized();
    
    if (this.currentSchema) {
      const sessionIndex = this.currentSchema.fitness.sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        this.currentSchema.fitness.sessions[sessionIndex] = {
          ...this.currentSchema.fitness.sessions[sessionIndex],
          ...updates,
          syncStatus: 'pending' as SyncStatus,
        };
        
        this.currentSchema.updatedAt = new Date().toISOString();
        await enhancedLocalStorage.updateSchema(this.currentSchema);

        // Queue for sync if user is authenticated
        if (this.currentSchema.user.authState.isAuthenticated) {
          await this.queueForSync('workout_sessions', 'update', this.currentSchema.fitness.sessions[sessionIndex]);
        }
      }
    }
  }

  // ============================================================================
  // NUTRITION DATA MANAGEMENT
  // ============================================================================

  async storeMealLog(mealLog: MealLog): Promise<void> {
    this.ensureInitialized();
    
    if (this.currentSchema) {
      // Remove existing log with same ID
      this.currentSchema.nutrition.logs = this.currentSchema.nutrition.logs.filter(log => log.id !== mealLog.id);
      
      // Add new log
      this.currentSchema.nutrition.logs.push({
        ...mealLog,
        syncStatus: 'local' as SyncStatus,
      });
      
      this.currentSchema.updatedAt = new Date().toISOString();
      await enhancedLocalStorage.updateSchema(this.currentSchema);

      // Queue for sync if user is authenticated
      if (this.currentSchema.user.authState.isAuthenticated) {
        await this.queueForSync('meal_logs', 'create', mealLog);
      }
    }
  }

  async getMealLogs(date?: string, limit?: number): Promise<MealLog[]> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return [];
    }

    let logs = this.currentSchema.nutrition.logs;
    
    // Filter by date if provided
    if (date) {
      logs = logs.filter(log => log.date === date);
    }
    
    // Sort by timestamp (most recent first)
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (limit) {
      return logs.slice(0, limit);
    }
    
    return logs;
  }

  // ============================================================================
  // PROGRESS DATA MANAGEMENT
  // ============================================================================

  async storeBodyMeasurement(measurement: BodyMeasurement): Promise<void> {
    this.ensureInitialized();
    
    if (this.currentSchema) {
      // Remove existing measurement with same ID
      this.currentSchema.progress.measurements = this.currentSchema.progress.measurements.filter(m => m.id !== measurement.id);
      
      // Add new measurement
      this.currentSchema.progress.measurements.push({
        ...measurement,
        syncStatus: 'local' as SyncStatus,
      });
      
      this.currentSchema.updatedAt = new Date().toISOString();
      await enhancedLocalStorage.updateSchema(this.currentSchema);

      // Queue for sync if user is authenticated
      if (this.currentSchema.user.authState.isAuthenticated) {
        await this.queueForSync('progress_entries', 'create', measurement);
      }
    }
  }

  async getBodyMeasurements(limit?: number): Promise<BodyMeasurement[]> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return [];
    }

    const measurements = this.currentSchema.progress.measurements;
    
    // Sort by date (most recent first)
    measurements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (limit) {
      return measurements.slice(0, limit);
    }
    
    return measurements;
  }

  // ============================================================================
  // SYNC MANAGEMENT
  // ============================================================================

  private async queueForSync(table: string, operation: 'create' | 'update' | 'delete', data: any): Promise<void> {
    try {
      await offlineService.queueAction({
        type: operation.toUpperCase() as 'CREATE' | 'UPDATE' | 'DELETE',
        table,
        data,
        userId: this.currentSchema?.user.authState.userId || '',
        maxRetries: 3,
      });
    } catch (error) {
      console.error('Failed to queue data for sync:', error);
    }
  }

  async markDataAsSynced(table: string, id: string): Promise<void> {
    this.ensureInitialized();
    
    if (!this.currentSchema) return;

    // Update sync status based on table
    switch (table) {
      case 'workout_sessions':
        const sessionIndex = this.currentSchema.fitness.sessions.findIndex(s => s.id === id);
        if (sessionIndex !== -1) {
          this.currentSchema.fitness.sessions[sessionIndex].syncStatus = 'synced';
        }
        break;
      
      case 'meal_logs':
        const logIndex = this.currentSchema.nutrition.logs.findIndex(log => log.id === id);
        if (logIndex !== -1) {
          this.currentSchema.nutrition.logs[logIndex].syncStatus = 'synced';
        }
        break;
      
      case 'progress_entries':
        const measurementIndex = this.currentSchema.progress.measurements.findIndex(m => m.id === id);
        if (measurementIndex !== -1) {
          this.currentSchema.progress.measurements[measurementIndex].syncStatus = 'synced';
        }
        break;
    }

    await enhancedLocalStorage.updateSchema(this.currentSchema);
  }

  async getPendingSyncData(): Promise<{ table: string; data: any[] }[]> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return [];
    }

    const pendingData: { table: string; data: any[] }[] = [];

    // Check workout sessions
    const pendingSessions = this.currentSchema.fitness.sessions.filter(s => s.syncStatus === 'pending' || s.syncStatus === 'local');
    if (pendingSessions.length > 0) {
      pendingData.push({ table: 'workout_sessions', data: pendingSessions });
    }

    // Check meal logs
    const pendingLogs = this.currentSchema.nutrition.logs.filter(log => log.syncStatus === 'pending' || log.syncStatus === 'local');
    if (pendingLogs.length > 0) {
      pendingData.push({ table: 'meal_logs', data: pendingLogs });
    }

    // Check measurements
    const pendingMeasurements = this.currentSchema.progress.measurements.filter(m => m.syncStatus === 'pending' || m.syncStatus === 'local');
    if (pendingMeasurements.length > 0) {
      pendingData.push({ table: 'progress_entries', data: pendingMeasurements });
    }

    return pendingData;
  }

  // ============================================================================
  // AUTHENTICATION STATE MANAGEMENT
  // ============================================================================

  async updateAuthState(authState: Partial<any>): Promise<void> {
    this.ensureInitialized();
    
    if (this.currentSchema) {
      this.currentSchema.user.authState = {
        ...this.currentSchema.user.authState,
        ...authState,
      };
      this.currentSchema.updatedAt = new Date().toISOString();
      
      await enhancedLocalStorage.updateSchema(this.currentSchema);

      // If user just authenticated, mark migration as required
      if (authState.isAuthenticated && !this.currentSchema.user.authState.migrationStatus.isCompleted) {
        await this.markMigrationRequired();
      }
    }
  }

  async getAuthState(): Promise<any> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return null;
    }

    return this.currentSchema.user.authState;
  }

  private async markMigrationRequired(): Promise<void> {
    if (this.currentSchema) {
      this.currentSchema.user.authState.migrationStatus.isRequired = true;
      this.currentSchema.metadata.migrationStatus.isRequired = true;
      await enhancedLocalStorage.updateSchema(this.currentSchema);
    }
  }

  // ============================================================================
  // DATA EXPORT/IMPORT
  // ============================================================================

  async exportAllData(): Promise<LocalStorageSchema | null> {
    this.ensureInitialized();
    return this.currentSchema;
  }

  async importData(data: LocalStorageSchema): Promise<void> {
    this.ensureInitialized();
    
    // Validate imported data
    const validation = validationService.validateLocalStorageSchema(data);
    if (!validation.isValid) {
      throw new Error(`Invalid import data: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Update schema
    this.currentSchema = data;
    await enhancedLocalStorage.updateSchema(data);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Data Manager Service not initialized. Call initialize() first.');
    }
  }

  async getStorageInfo(): Promise<any> {
    return enhancedLocalStorage.getStorageInfo();
  }

  async isQuotaExceeded(): Promise<boolean> {
    return enhancedLocalStorage.isQuotaExceeded();
  }

  async clearAllData(): Promise<void> {
    this.ensureInitialized();
    await enhancedLocalStorage.clearAllData();
    this.currentSchema = null;
    this.isInitialized = false;
  }

  // ============================================================================
  // DATA STATISTICS
  // ============================================================================

  async getDataStatistics(): Promise<{
    totalWorkoutSessions: number;
    totalMealLogs: number;
    totalMeasurements: number;
    pendingSyncItems: number;
    storageUsed: number;
    lastUpdated: string | null;
  }> {
    this.ensureInitialized();
    
    if (!this.currentSchema) {
      return {
        totalWorkoutSessions: 0,
        totalMealLogs: 0,
        totalMeasurements: 0,
        pendingSyncItems: 0,
        storageUsed: 0,
        lastUpdated: null,
      };
    }

    const pendingData = await this.getPendingSyncData();
    const pendingSyncItems = pendingData.reduce((total, item) => total + item.data.length, 0);
    const storageInfo = await this.getStorageInfo();

    return {
      totalWorkoutSessions: this.currentSchema.fitness.sessions.length,
      totalMealLogs: this.currentSchema.nutrition.logs.length,
      totalMeasurements: this.currentSchema.progress.measurements.length,
      pendingSyncItems,
      storageUsed: storageInfo?.usedSize || 0,
      lastUpdated: this.currentSchema.updatedAt,
    };
  }
}

// Export singleton instance
export const dataManager = DataManagerService.getInstance();
export default dataManager;
