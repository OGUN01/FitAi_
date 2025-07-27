// CRUD Operations Service for Track B Infrastructure
// Provides comprehensive Create, Read, Update, Delete operations with optimistic updates

import { dataManager } from './dataManager';
import { offlineService } from './offline';
import { 
  OnboardingData,
  WorkoutSession,
  MealLog,
  BodyMeasurement,
  UserPreferences,
  LocalStorageSchema,
  ValidationResult
} from '../types/localData';

// ============================================================================
// CRUD OPERATIONS SERVICE
// ============================================================================

export class CrudOperationsService {
  private static instance: CrudOperationsService;

  private constructor() {}

  static getInstance(): CrudOperationsService {
    if (!CrudOperationsService.instance) {
      CrudOperationsService.instance = new CrudOperationsService();
    }
    return CrudOperationsService.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    try {
      await dataManager.initialize();
      console.log('CRUD Operations Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CRUD Operations Service:', error);
      throw error;
    }
  }

  // ============================================================================
  // USER DATA OPERATIONS
  // ============================================================================

  async createOnboardingData(data: OnboardingData): Promise<void> {
    try {
      await dataManager.storeOnboardingData(data);
      console.log('Onboarding data created successfully');
    } catch (error) {
      console.error('Failed to create onboarding data:', error);
      throw error;
    }
  }

  async readOnboardingData(): Promise<OnboardingData | null> {
    try {
      return await dataManager.getOnboardingData();
    } catch (error) {
      console.error('Failed to read onboarding data:', error);
      return null;
    }
  }

  async updateOnboardingData(updates: Partial<OnboardingData>): Promise<void> {
    try {
      const existing = await dataManager.getOnboardingData();
      if (!existing) {
        throw new Error('No existing onboarding data to update');
      }

      const updated: OnboardingData = {
        ...existing,
        ...updates,
      };

      await dataManager.storeOnboardingData(updated);
      console.log('Onboarding data updated successfully');
    } catch (error) {
      console.error('Failed to update onboarding data:', error);
      throw error;
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      await dataManager.updateUserPreferences(preferences);
      console.log('User preferences updated successfully');
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  async readUserPreferences(): Promise<UserPreferences | null> {
    try {
      return await dataManager.getUserPreferences();
    } catch (error) {
      console.error('Failed to read user preferences:', error);
      return null;
    }
  }

  // ============================================================================
  // WORKOUT SESSION OPERATIONS
  // ============================================================================

  async createWorkoutSession(session: WorkoutSession): Promise<void> {
    try {
      console.log('📝 Creating workout session:', {
        id: session.id,
        workoutId: session.workoutId,
        duration: session.duration,
        calories: session.caloriesBurned,
        exerciseCount: session.exercises?.length || 0
      });
      
      await dataManager.storeWorkoutSession(session);
      console.log(`✅ Workout session ${session.id} created successfully`);
      
      // Verify it was stored
      const stored = await this.readWorkoutSession(session.id);
      if (!stored) {
        console.warn('⚠️ Workout session was not found after creation');
      } else {
        console.log('✅ Workout session verified in storage');
      }
    } catch (error) {
      console.error('❌ Failed to create workout session:', error);
      console.error('Session data:', JSON.stringify(session, null, 2));
      throw error;
    }
  }

  async readWorkoutSessions(limit?: number): Promise<WorkoutSession[]> {
    try {
      return await dataManager.getWorkoutSessions(limit);
    } catch (error) {
      console.error('Failed to read workout sessions:', error);
      return [];
    }
  }

  async readWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
    try {
      const sessions = await dataManager.getWorkoutSessions();
      return sessions.find(session => session.id === sessionId) || null;
    } catch (error) {
      console.error('Failed to read workout session:', error);
      return null;
    }
  }

  async updateWorkoutSession(sessionId: string, updates: Partial<WorkoutSession>): Promise<void> {
    try {
      await dataManager.updateWorkoutSession(sessionId, updates);
      console.log(`Workout session ${sessionId} updated successfully`);
    } catch (error) {
      console.error('Failed to update workout session:', error);
      throw error;
    }
  }

  async deleteWorkoutSession(sessionId: string): Promise<void> {
    try {
      // For now, we'll mark as deleted rather than actually removing
      await this.updateWorkoutSession(sessionId, { 
        notes: (await this.readWorkoutSession(sessionId))?.notes + ' [DELETED]' || '[DELETED]'
      });
      console.log(`Workout session ${sessionId} marked as deleted`);
    } catch (error) {
      console.error('Failed to delete workout session:', error);
      throw error;
    }
  }

  // ============================================================================
  // MEAL LOG OPERATIONS
  // ============================================================================

  async createMealLog(mealLog: MealLog): Promise<void> {
    try {
      console.log('🍽️ Creating meal log:', {
        id: mealLog.id,
        userId: mealLog.userId,
        mealType: mealLog.mealType,
        foodCount: mealLog.foods?.length || 0,
        calories: mealLog.totalCalories
      });
      
      await dataManager.storeMealLog(mealLog);
      console.log(`✅ Meal log ${mealLog.id} created successfully`);
      
      // Verify it was stored
      const stored = await this.readMealLog(mealLog.id);
      if (!stored) {
        console.warn('⚠️ Meal log was not found after creation');
      } else {
        console.log('✅ Meal log verified in storage');
      }
    } catch (error) {
      console.error('❌ Failed to create meal log:', error);
      console.error('Meal data:', JSON.stringify(mealLog, null, 2));
      throw error;
    }
  }

  async readMealLogs(date?: string, limit?: number): Promise<MealLog[]> {
    try {
      return await dataManager.getMealLogs(date, limit);
    } catch (error) {
      console.error('Failed to read meal logs:', error);
      return [];
    }
  }

  async readMealLog(logId: string): Promise<MealLog | null> {
    try {
      const logs = await dataManager.getMealLogs();
      return logs.find(log => log.id === logId) || null;
    } catch (error) {
      console.error('Failed to read meal log:', error);
      return null;
    }
  }

  async updateMealLog(logId: string, updates: Partial<MealLog>): Promise<void> {
    try {
      const existing = await this.readMealLog(logId);
      if (!existing) {
        throw new Error(`Meal log ${logId} not found`);
      }

      const updated: MealLog = {
        ...existing,
        ...updates,
        syncStatus: 'pending',
      };

      await dataManager.storeMealLog(updated);
      console.log(`Meal log ${logId} updated successfully`);
    } catch (error) {
      console.error('Failed to update meal log:', error);
      throw error;
    }
  }

  async deleteMealLog(logId: string): Promise<void> {
    try {
      // For now, we'll mark as deleted rather than actually removing
      await this.updateMealLog(logId, { 
        notes: (await this.readMealLog(logId))?.notes + ' [DELETED]' || '[DELETED]'
      });
      console.log(`Meal log ${logId} marked as deleted`);
    } catch (error) {
      console.error('Failed to delete meal log:', error);
      throw error;
    }
  }

  // ============================================================================
  // BODY MEASUREMENT OPERATIONS
  // ============================================================================

  async createBodyMeasurement(measurement: BodyMeasurement): Promise<void> {
    try {
      await dataManager.storeBodyMeasurement(measurement);
      console.log(`Body measurement ${measurement.id} created successfully`);
    } catch (error) {
      console.error('Failed to create body measurement:', error);
      throw error;
    }
  }

  async readBodyMeasurements(limit?: number): Promise<BodyMeasurement[]> {
    try {
      return await dataManager.getBodyMeasurements(limit);
    } catch (error) {
      console.error('Failed to read body measurements:', error);
      return [];
    }
  }

  async readBodyMeasurement(measurementId: string): Promise<BodyMeasurement | null> {
    try {
      const measurements = await dataManager.getBodyMeasurements();
      return measurements.find(measurement => measurement.id === measurementId) || null;
    } catch (error) {
      console.error('Failed to read body measurement:', error);
      return null;
    }
  }

  async updateBodyMeasurement(measurementId: string, updates: Partial<BodyMeasurement>): Promise<void> {
    try {
      const existing = await this.readBodyMeasurement(measurementId);
      if (!existing) {
        throw new Error(`Body measurement ${measurementId} not found`);
      }

      const updated: BodyMeasurement = {
        ...existing,
        ...updates,
        syncStatus: 'pending',
      };

      await dataManager.storeBodyMeasurement(updated);
      console.log(`Body measurement ${measurementId} updated successfully`);
    } catch (error) {
      console.error('Failed to update body measurement:', error);
      throw error;
    }
  }

  async deleteBodyMeasurement(measurementId: string): Promise<void> {
    try {
      // For now, we'll mark as deleted rather than actually removing
      await this.updateBodyMeasurement(measurementId, { 
        notes: (await this.readBodyMeasurement(measurementId))?.notes + ' [DELETED]' || '[DELETED]'
      });
      console.log(`Body measurement ${measurementId} marked as deleted`);
    } catch (error) {
      console.error('Failed to delete body measurement:', error);
      throw error;
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async batchCreateWorkoutSessions(sessions: WorkoutSession[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    for (const session of sessions) {
      try {
        await this.createWorkoutSession(session);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to create session ${session.id}: ${error}`);
      }
    }

    return result;
  }

  async batchCreateMealLogs(logs: MealLog[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    for (const log of logs) {
      try {
        await this.createMealLog(log);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to create meal log ${log.id}: ${error}`);
      }
    }

    return result;
  }

  // ============================================================================
  // DATA VALIDATION AND INTEGRITY
  // ============================================================================

  async validateAllData(): Promise<ValidationResult> {
    try {
      const schema = await dataManager.exportAllData();
      if (!schema) {
        return {
          isValid: false,
          errors: [{ field: 'schema', message: 'No data found', code: 'NO_DATA', severity: 'error' }],
          warnings: [],
        };
      }

      const { validationService } = await import('../utils/validation');
      return validationService.validateLocalStorageSchema(schema);
    } catch (error) {
      console.error('Failed to validate data:', error);
      return {
        isValid: false,
        errors: [{ field: 'validation', message: 'Validation failed', code: 'VALIDATION_ERROR', severity: 'error' }],
        warnings: [],
      };
    }
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
    try {
      return await dataManager.getDataStatistics();
    } catch (error) {
      console.error('Failed to get data statistics:', error);
      return {
        totalWorkoutSessions: 0,
        totalMealLogs: 0,
        totalMeasurements: 0,
        pendingSyncItems: 0,
        storageUsed: 0,
        lastUpdated: null,
      };
    }
  }

  // ============================================================================
  // DATA EXPORT/IMPORT
  // ============================================================================

  async exportAllData(): Promise<LocalStorageSchema | null> {
    try {
      return await dataManager.exportAllData();
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  async importData(data: LocalStorageSchema): Promise<void> {
    try {
      await dataManager.importData(data);
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }


  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async clearAllData(): Promise<void> {
    try {
      await dataManager.clearAllData();
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<any> {
    try {
      return await dataManager.getStorageInfo();
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  async isQuotaExceeded(): Promise<boolean> {
    try {
      return await dataManager.isQuotaExceeded();
    } catch (error) {
      console.error('Failed to check quota:', error);
      return false;
    }
  }
}

// Export singleton instance
export const crudOperations = CrudOperationsService.getInstance();
export default crudOperations;
