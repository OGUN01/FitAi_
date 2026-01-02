/**
 * DataBridge - Unified Data Access Layer
 *
 * UPDATED: January 2026 - OLD SYSTEM COMPLETELY REMOVED
 *
 * This is now a thin wrapper around DataBridgeV2 which uses ONLY the new architecture:
 * - ProfileStore (Zustand) for local state management
 * - SyncEngine for database synchronization
 * - onboardingService for database operations
 *
 * Backward compatibility is maintained for all existing imports.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../stores/userStore';
import { useProfileStore } from '../stores/profileStore';
import { syncEngine } from './SyncEngine';
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
} from './onboardingService';
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from '../types/onboarding';
import { PersonalInfo, DietPreferences, WorkoutPreferences } from '../types/profileData';

// ============================================================================
// TYPES
// ============================================================================

interface DataBridgeConfig {
  USE_NEW_SYSTEM: boolean;
  SHADOW_MODE: boolean;
}

interface ShadowModeDiscrepancy {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

interface ShadowModeReport {
  discrepancies: ShadowModeDiscrepancy[];
  oldSystemData: AllDataResult | null;
  newSystemData: AllDataResult | null;
  comparisonTimestamp: string;
  isConsistent: boolean;
}

interface AllDataResult {
  personalInfo: PersonalInfoData | PersonalInfo | null;
  dietPreferences: DietPreferencesData | DietPreferences | null;
  bodyAnalysis: BodyAnalysisData | any | null;
  workoutPreferences: WorkoutPreferencesData | WorkoutPreferences | null;
  advancedReview: AdvancedReviewData | any | null;
  source: 'old_system' | 'new_system' | 'merged' | 'local' | 'database';
}

interface SaveResult {
  success: boolean;
  oldSystemSuccess?: boolean;
  newSystemSuccess?: boolean;
  errors: string[];
}

interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
  oldSystemMigration?: any;
  newSystemMigration?: any;
}

// Storage keys
const ONBOARDING_DATA_KEY = 'onboarding_data';
const WORKOUT_SESSIONS_KEY = 'workout_sessions';
const MEAL_LOGS_KEY = 'meal_logs';
const BODY_MEASUREMENTS_KEY = 'body_measurements';

// ============================================================================
// DATA BRIDGE CLASS - UNIFIED NEW ARCHITECTURE
// ============================================================================

class DataBridge {
  private static instance: DataBridge;
  private currentUserId: string | null = null;
  private isOnline: boolean = true;
  private isInitialized: boolean = false;

  // Configuration - NEW SYSTEM ONLY (old system removed)
  private config: DataBridgeConfig = {
    USE_NEW_SYSTEM: true,
    SHADOW_MODE: false,
  };

  private constructor() {
    console.log('[DataBridge] Initialized - Using NEW architecture only (old system removed)');
  }

  static getInstance(): DataBridge {
    if (!DataBridge.instance) {
      DataBridge.instance = new DataBridge();
    }
    return DataBridge.instance;
  }

  // ============================================================================
  // CONFIGURATION METHODS (kept for backward compatibility)
  // ============================================================================

  switchToNewSystem(): void {
    console.log('[DataBridge] Already using NEW system (old system removed)');
    this.config.USE_NEW_SYSTEM = true;
  }

  switchToOldSystem(): void {
    console.log('[DataBridge] WARNING: Old system has been removed. Using new system.');
    this.config.USE_NEW_SYSTEM = true; // Always use new system
  }

  setShadowMode(enabled: boolean): void {
    console.log(`[DataBridge] Shadow mode no longer available (old system removed)`);
    this.config.SHADOW_MODE = false;
  }

  getConfig(): DataBridgeConfig {
    return { ...this.config };
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  setUserId(userId: string | null): void {
    this.currentUserId = userId;
    if (userId) {
      syncEngine.setUserId(userId);
    }
    console.log(`[DataBridge] User ID set to: ${userId || 'guest'}`);
  }

  getUserId(): string | null {
    return this.currentUserId;
  }

  isGuest(): boolean {
    return !this.currentUserId;
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    console.log(`[DataBridge] Online status: ${online}`);
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[DataBridge] Already initialized');
      return;
    }

    try {
      console.log('[DataBridge] Initializing...');
      // Load any persisted data into ProfileStore
      const data = await this.loadFromLocal();
      if (data.personalInfo) {
        const profileStore = useProfileStore.getState();
        if (data.personalInfo) profileStore.updatePersonalInfo(data.personalInfo as PersonalInfoData);
        if (data.dietPreferences) profileStore.updateDietPreferences(data.dietPreferences as DietPreferencesData);
        if (data.bodyAnalysis) profileStore.updateBodyAnalysis(data.bodyAnalysis);
        if (data.workoutPreferences) profileStore.updateWorkoutPreferences(data.workoutPreferences as WorkoutPreferencesData);
        if (data.advancedReview) profileStore.updateAdvancedReview(data.advancedReview);
      }
      this.isInitialized = true;
      console.log('[DataBridge] Initialization complete');
    } catch (error) {
      console.error('[DataBridge] Initialization error:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent loops
    }
  }

  // ============================================================================
  // LOAD ALL DATA
  // ============================================================================

  async loadAllData(userId?: string): Promise<AllDataResult> {
    const targetUserId = userId || this.currentUserId;
    console.log(`[DataBridge] loadAllData called, userId: ${targetUserId || 'guest'}`);

    try {
      if (!targetUserId) {
        return await this.loadFromLocal();
      }
      return await this.loadFromDatabase(targetUserId);
    } catch (error) {
      console.error('[DataBridge] loadAllData error:', error);
      return await this.loadFromLocal();
    }
  }

  private async loadFromLocal(): Promise<AllDataResult> {
    console.log('[DataBridge] Loading from local storage');

    try {
      // Check ProfileStore first
      const profileStore = useProfileStore.getState();
      if (profileStore.personalInfo) {
        return {
          personalInfo: profileStore.personalInfo,
          dietPreferences: profileStore.dietPreferences,
          bodyAnalysis: profileStore.bodyAnalysis,
          workoutPreferences: profileStore.workoutPreferences,
          advancedReview: profileStore.advancedReview,
          source: 'new_system',
        };
      }

      // Fallback to AsyncStorage (onboarding_data key)
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        return {
          personalInfo: data.personalInfo || null,
          dietPreferences: data.dietPreferences || null,
          bodyAnalysis: data.bodyAnalysis || null,
          workoutPreferences: data.workoutPreferences || null,
          advancedReview: data.advancedReview || null,
          source: 'new_system',
        };
      }

      // Also check userStore for backward compatibility
      const userStore = useUserStore.getState();
      if (userStore.profile?.personalInfo) {
        return {
          personalInfo: userStore.profile.personalInfo,
          dietPreferences: null,
          bodyAnalysis: null,
          workoutPreferences: null,
          advancedReview: null,
          source: 'new_system',
        };
      }

      return {
        personalInfo: null,
        dietPreferences: null,
        bodyAnalysis: null,
        workoutPreferences: null,
        advancedReview: null,
        source: 'new_system',
      };
    } catch (error) {
      console.error('[DataBridge] loadFromLocal error:', error);
      return {
        personalInfo: null,
        dietPreferences: null,
        bodyAnalysis: null,
        workoutPreferences: null,
        advancedReview: null,
        source: 'new_system',
      };
    }
  }

  private async loadFromDatabase(userId: string): Promise<AllDataResult> {
    console.log('[DataBridge] Loading from database for user:', userId);

    try {
      const [personalInfo, dietPreferences, bodyAnalysis, workoutPreferences, advancedReview] =
        await Promise.all([
          PersonalInfoService.load(userId).catch(() => null),
          DietPreferencesService.load(userId).catch(() => null),
          BodyAnalysisService.load(userId).catch(() => null),
          WorkoutPreferencesService.load(userId).catch(() => null),
          AdvancedReviewService.load(userId).catch(() => null),
        ]);

      // Update ProfileStore with loaded data
      const profileStore = useProfileStore.getState();
      if (personalInfo) profileStore.updatePersonalInfo(personalInfo);
      if (dietPreferences) profileStore.updateDietPreferences(dietPreferences);
      if (bodyAnalysis) profileStore.updateBodyAnalysis(bodyAnalysis);
      if (workoutPreferences) profileStore.updateWorkoutPreferences(workoutPreferences);
      if (advancedReview) profileStore.updateAdvancedReview(advancedReview);

      // Also update userStore for backward compatibility
      if (personalInfo) {
        const userStore = useUserStore.getState();
        userStore.updatePersonalInfo(personalInfo as PersonalInfo);
      }

      return {
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences,
        advancedReview,
        source: 'new_system',
      };
    } catch (error) {
      console.error('[DataBridge] loadFromDatabase error:', error);
      return await this.loadFromLocal();
    }
  }

  // ============================================================================
  // INDIVIDUAL LOAD METHODS (for backward compatibility)
  // ============================================================================

  async loadPersonalInfo(userId?: string): Promise<PersonalInfoData | PersonalInfo | null> {
    const data = await this.loadAllData(userId);
    return data.personalInfo;
  }

  async loadDietPreferences(userId?: string): Promise<DietPreferencesData | DietPreferences | null> {
    const data = await this.loadAllData(userId);
    return data.dietPreferences;
  }

  async loadBodyAnalysis(userId?: string): Promise<BodyAnalysisData | null> {
    const data = await this.loadAllData(userId);
    return data.bodyAnalysis;
  }

  async loadWorkoutPreferences(userId?: string): Promise<WorkoutPreferencesData | WorkoutPreferences | null> {
    const data = await this.loadAllData(userId);
    return data.workoutPreferences;
  }

  async loadAdvancedReview(userId?: string): Promise<AdvancedReviewData | null> {
    const data = await this.loadAllData(userId);
    return data.advancedReview;
  }

  // Alias for backward compatibility (fitnessGoals maps to workoutPreferences)
  async loadFitnessGoals(userId?: string): Promise<WorkoutPreferencesData | WorkoutPreferences | null> {
    return this.loadWorkoutPreferences(userId);
  }

  async saveFitnessGoals(data: WorkoutPreferencesData | WorkoutPreferences, userId?: string): Promise<SaveResult> {
    return this.saveWorkoutPreferences(data, userId);
  }

  // ============================================================================
  // SAVE METHODS
  // ============================================================================

  async savePersonalInfo(data: PersonalInfoData | PersonalInfo, userId?: string): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;
    console.log(`[DataBridge] savePersonalInfo, userId: ${targetUserId || 'guest'}`);

    const result: SaveResult = { success: true, errors: [], newSystemSuccess: true };

    try {
      // Update ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.updatePersonalInfo(data as PersonalInfoData);

      // Update userStore for backward compatibility
      const userStore = useUserStore.getState();
      userStore.updatePersonalInfo(data as PersonalInfo);

      // Save to database if authenticated
      if (targetUserId) {
        const dbSuccess = await PersonalInfoService.save(targetUserId, data as PersonalInfoData);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          result.errors.push('Database save failed');
          syncEngine.queueOperation('personalInfo', data);
        }
      } else {
        await this.saveToLocal('personalInfo', data);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('[DataBridge] savePersonalInfo error:', error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveDietPreferences(data: DietPreferencesData | DietPreferences, userId?: string): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;
    console.log(`[DataBridge] saveDietPreferences, userId: ${targetUserId || 'guest'}`);

    const result: SaveResult = { success: true, errors: [], newSystemSuccess: true };

    try {
      // Update ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.updateDietPreferences(data as DietPreferencesData);

      // Save to database if authenticated
      if (targetUserId) {
        const dbSuccess = await DietPreferencesService.save(targetUserId, data as DietPreferencesData);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          result.errors.push('Database save failed');
          syncEngine.queueOperation('dietPreferences', data);
        }
      } else {
        await this.saveToLocal('dietPreferences', data);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('[DataBridge] saveDietPreferences error:', error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveBodyAnalysis(data: BodyAnalysisData, userId?: string): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;
    console.log(`[DataBridge] saveBodyAnalysis, userId: ${targetUserId || 'guest'}`);

    const result: SaveResult = { success: true, errors: [], newSystemSuccess: true };

    try {
      // Update ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.updateBodyAnalysis(data);

      // Save to database if authenticated
      if (targetUserId) {
        const dbSuccess = await BodyAnalysisService.save(targetUserId, data);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          result.errors.push('Database save failed');
          syncEngine.queueOperation('bodyAnalysis', data);
        }
      } else {
        await this.saveToLocal('bodyAnalysis', data);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('[DataBridge] saveBodyAnalysis error:', error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveWorkoutPreferences(data: WorkoutPreferencesData | WorkoutPreferences, userId?: string): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;
    console.log(`[DataBridge] saveWorkoutPreferences, userId: ${targetUserId || 'guest'}`);

    const result: SaveResult = { success: true, errors: [], newSystemSuccess: true };

    try {
      // Update ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.updateWorkoutPreferences(data as WorkoutPreferencesData);

      // Save to database if authenticated
      if (targetUserId) {
        const dbSuccess = await WorkoutPreferencesService.save(targetUserId, data as WorkoutPreferencesData);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          result.errors.push('Database save failed');
          syncEngine.queueOperation('workoutPreferences', data);
        }
      } else {
        await this.saveToLocal('workoutPreferences', data);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('[DataBridge] saveWorkoutPreferences error:', error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  async saveAdvancedReview(data: AdvancedReviewData, userId?: string): Promise<SaveResult> {
    const targetUserId = userId || this.currentUserId;
    console.log(`[DataBridge] saveAdvancedReview, userId: ${targetUserId || 'guest'}`);

    const result: SaveResult = { success: true, errors: [], newSystemSuccess: true };

    try {
      // Update ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.updateAdvancedReview(data);

      // Save to database if authenticated
      if (targetUserId) {
        const dbSuccess = await AdvancedReviewService.save(targetUserId, data);
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          result.errors.push('Database save failed');
          syncEngine.queueOperation('advancedReview', data);
        }
      } else {
        await this.saveToLocal('advancedReview', data);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('[DataBridge] saveAdvancedReview error:', error);
      return { success: false, errors: [`Error: ${error}`] };
    }
  }

  // ============================================================================
  // MIGRATION METHODS
  // ============================================================================

  async migrateGuestToUser(userId: string): Promise<MigrationResult> {
    console.log(`[DataBridge] migrateGuestToUser: ${userId}`);

    const result: MigrationResult = {
      success: true,
      migratedKeys: [],
      errors: [],
    };

    try {
      // Load all local guest data
      const localData = await this.loadFromLocal();

      // Set the user ID
      this.setUserId(userId);

      // Sync each data type to database
      if (localData.personalInfo) {
        const saveResult = await this.savePersonalInfo(localData.personalInfo, userId);
        if (saveResult.success) {
          result.migratedKeys.push('personalInfo');
        } else {
          result.errors.push(...saveResult.errors);
        }
      }

      if (localData.dietPreferences) {
        const saveResult = await this.saveDietPreferences(localData.dietPreferences, userId);
        if (saveResult.success) {
          result.migratedKeys.push('dietPreferences');
        } else {
          result.errors.push(...saveResult.errors);
        }
      }

      if (localData.bodyAnalysis) {
        const saveResult = await this.saveBodyAnalysis(localData.bodyAnalysis, userId);
        if (saveResult.success) {
          result.migratedKeys.push('bodyAnalysis');
        } else {
          result.errors.push(...saveResult.errors);
        }
      }

      if (localData.workoutPreferences) {
        const saveResult = await this.saveWorkoutPreferences(localData.workoutPreferences, userId);
        if (saveResult.success) {
          result.migratedKeys.push('workoutPreferences');
        } else {
          result.errors.push(...saveResult.errors);
        }
      }

      if (localData.advancedReview) {
        const saveResult = await this.saveAdvancedReview(localData.advancedReview, userId);
        if (saveResult.success) {
          result.migratedKeys.push('advancedReview');
        } else {
          result.errors.push(...saveResult.errors);
        }
      }

      // Clear guest data after successful migration
      if (result.errors.length === 0) {
        await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
        console.log('[DataBridge] Guest data cleared after migration');
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('[DataBridge] migrateGuestToUser error:', error);
      return { success: false, migratedKeys: [], errors: [`Critical error: ${error}`] };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async hasLocalData(): Promise<boolean> {
    try {
      // Check ProfileStore
      const profileStore = useProfileStore.getState();
      if (profileStore.personalInfo || profileStore.dietPreferences) {
        return true;
      }

      // Check AsyncStorage
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        return !!(data.personalInfo || data.dietPreferences || data.bodyAnalysis);
      }

      // Check userStore
      const userStore = useUserStore.getState();
      if (userStore.profile?.personalInfo) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DataBridge] hasLocalData error:', error);
      return false;
    }
  }

  async getShadowModeReport(): Promise<ShadowModeReport> {
    // Shadow mode no longer available - return empty report
    console.log('[DataBridge] Shadow mode report not available (old system removed)');
    return {
      discrepancies: [],
      oldSystemData: null,
      newSystemData: await this.loadAllData(),
      comparisonTimestamp: new Date().toISOString(),
      isConsistent: true,
    };
  }

  async clearLocalData(): Promise<void> {
    try {
      // Clear ProfileStore
      const profileStore = useProfileStore.getState();
      profileStore.reset();

      // Clear AsyncStorage
      await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
      await AsyncStorage.removeItem(WORKOUT_SESSIONS_KEY);
      await AsyncStorage.removeItem(MEAL_LOGS_KEY);
      await AsyncStorage.removeItem(BODY_MEASUREMENTS_KEY);

      console.log('[DataBridge] Local data cleared');
    } catch (error) {
      console.error('[DataBridge] clearLocalData error:', error);
    }
  }

  // Alias for backward compatibility
  async hasGuestDataForMigration(): Promise<boolean> {
    return this.hasLocalData();
  }

  // Alias for backward compatibility
  async migrateGuestDataToUser(userId: string): Promise<MigrationResult> {
    return this.migrateGuestToUser(userId);
  }

  // ============================================================================
  // ONBOARDING DATA METHODS (backward compatibility)
  // ============================================================================

  async storeOnboardingData(data: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify({
        ...data,
        lastUpdatedAt: new Date().toISOString(),
      }));

      // Also update ProfileStore
      const profileStore = useProfileStore.getState();
      if (data.personalInfo) profileStore.updatePersonalInfo(data.personalInfo);
      if (data.dietPreferences) profileStore.updateDietPreferences(data.dietPreferences);
      if (data.bodyAnalysis) profileStore.updateBodyAnalysis(data.bodyAnalysis);
      if (data.workoutPreferences) profileStore.updateWorkoutPreferences(data.workoutPreferences);
      if (data.advancedReview) profileStore.updateAdvancedReview(data.advancedReview);

      console.log('[DataBridge] Onboarding data stored');
      return true;
    } catch (error) {
      console.error('[DataBridge] storeOnboardingData error:', error);
      return false;
    }
  }

  async getOnboardingData(): Promise<any | null> {
    try {
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      return dataStr ? JSON.parse(dataStr) : null;
    } catch (error) {
      console.error('[DataBridge] getOnboardingData error:', error);
      return null;
    }
  }

  // ============================================================================
  // WORKOUT SESSIONS (backward compatibility)
  // ============================================================================

  async storeWorkoutSession(session: any): Promise<boolean> {
    try {
      const existingStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift({ ...session, id: session.id || Date.now().toString(), createdAt: new Date().toISOString() });
      await AsyncStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify(existing.slice(0, 100))); // Keep last 100
      return true;
    } catch (error) {
      console.error('[DataBridge] storeWorkoutSession error:', error);
      return false;
    }
  }

  async getWorkoutSessions(limit: number = 10): Promise<any[]> {
    try {
      const dataStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
      const sessions = dataStr ? JSON.parse(dataStr) : [];
      return sessions.slice(0, limit);
    } catch (error) {
      console.error('[DataBridge] getWorkoutSessions error:', error);
      return [];
    }
  }

  async updateWorkoutSession(sessionId: string, updates: any): Promise<boolean> {
    try {
      const dataStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
      const sessions = dataStr ? JSON.parse(dataStr) : [];
      const index = sessions.findIndex((s: any) => s.id === sessionId);
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify(sessions));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DataBridge] updateWorkoutSession error:', error);
      return false;
    }
  }

  // ============================================================================
  // MEAL LOGS (backward compatibility)
  // ============================================================================

  async storeMealLog(mealLog: any): Promise<boolean> {
    try {
      const existingStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift({ ...mealLog, id: mealLog.id || Date.now().toString(), createdAt: new Date().toISOString() });
      await AsyncStorage.setItem(MEAL_LOGS_KEY, JSON.stringify(existing.slice(0, 500))); // Keep last 500
      return true;
    } catch (error) {
      console.error('[DataBridge] storeMealLog error:', error);
      return false;
    }
  }

  async getMealLogs(date?: string, limit: number = 50): Promise<any[]> {
    try {
      const dataStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
      let logs = dataStr ? JSON.parse(dataStr) : [];
      if (date) {
        logs = logs.filter((log: any) => log.date === date || log.createdAt?.startsWith(date));
      }
      return logs.slice(0, limit);
    } catch (error) {
      console.error('[DataBridge] getMealLogs error:', error);
      return [];
    }
  }

  // ============================================================================
  // BODY MEASUREMENTS (backward compatibility)
  // ============================================================================

  async storeBodyMeasurement(measurement: any): Promise<boolean> {
    try {
      const existingStr = await AsyncStorage.getItem(BODY_MEASUREMENTS_KEY);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift({ ...measurement, id: measurement.id || Date.now().toString(), createdAt: new Date().toISOString() });
      await AsyncStorage.setItem(BODY_MEASUREMENTS_KEY, JSON.stringify(existing.slice(0, 100))); // Keep last 100
      return true;
    } catch (error) {
      console.error('[DataBridge] storeBodyMeasurement error:', error);
      return false;
    }
  }

  async getBodyMeasurements(limit: number = 10): Promise<any[]> {
    try {
      const dataStr = await AsyncStorage.getItem(BODY_MEASUREMENTS_KEY);
      const measurements = dataStr ? JSON.parse(dataStr) : [];
      return measurements.slice(0, limit);
    } catch (error) {
      console.error('[DataBridge] getBodyMeasurements error:', error);
      return [];
    }
  }

  // ============================================================================
  // EXPORT/IMPORT DATA (backward compatibility)
  // ============================================================================

  async exportAllData(): Promise<any> {
    try {
      const allData = await this.loadAllData();
      const workoutSessions = await this.getWorkoutSessions(100);
      const mealLogs = await this.getMealLogs(undefined, 500);
      const bodyMeasurements = await this.getBodyMeasurements(100);

      return {
        user: {
          personalInfo: allData.personalInfo,
          dietPreferences: allData.dietPreferences,
          workoutPreferences: allData.workoutPreferences,
        },
        fitness: {
          bodyAnalysis: allData.bodyAnalysis,
          workoutSessions,
        },
        nutrition: {
          mealLogs,
        },
        progress: {
          bodyMeasurements,
          advancedReview: allData.advancedReview,
        },
        exportedAt: new Date().toISOString(),
        version: '2.0',
      };
    } catch (error) {
      console.error('[DataBridge] exportAllData error:', error);
      return null;
    }
  }

  async getDataStatistics(): Promise<any> {
    try {
      const workoutSessions = await this.getWorkoutSessions(100);
      const mealLogs = await this.getMealLogs(undefined, 500);
      const bodyMeasurements = await this.getBodyMeasurements(100);

      return {
        workoutSessionsCount: workoutSessions.length,
        mealLogsCount: mealLogs.length,
        bodyMeasurementsCount: bodyMeasurements.length,
        hasPersonalInfo: !!(await this.loadPersonalInfo()),
        hasDietPreferences: !!(await this.loadDietPreferences()),
        hasWorkoutPreferences: !!(await this.loadWorkoutPreferences()),
      };
    } catch (error) {
      console.error('[DataBridge] getDataStatistics error:', error);
      return {};
    }
  }

  // ============================================================================
  // IMPORT DATA (backward compatibility)
  // ============================================================================

  async importData(data: any): Promise<boolean> {
    try {
      if (data.user) {
        if (data.user.personalInfo) await this.savePersonalInfo(data.user.personalInfo);
        if (data.user.dietPreferences) await this.saveDietPreferences(data.user.dietPreferences);
        if (data.user.workoutPreferences) await this.saveWorkoutPreferences(data.user.workoutPreferences);
      }
      if (data.fitness?.bodyAnalysis) await this.saveBodyAnalysis(data.fitness.bodyAnalysis);
      if (data.progress?.advancedReview) await this.saveAdvancedReview(data.progress.advancedReview);
      return true;
    } catch (error) {
      console.error('[DataBridge] importData error:', error);
      return false;
    }
  }

  async importAllData(data: any): Promise<boolean> {
    return this.importData(data);
  }

  async importUserData(data: any): Promise<boolean> {
    try {
      if (data.personalInfo) await this.savePersonalInfo(data.personalInfo);
      if (data.dietPreferences) await this.saveDietPreferences(data.dietPreferences);
      if (data.workoutPreferences) await this.saveWorkoutPreferences(data.workoutPreferences);
      return true;
    } catch (error) {
      console.error('[DataBridge] importUserData error:', error);
      return false;
    }
  }

  async importFitnessData(data: any): Promise<boolean> {
    try {
      if (data.bodyAnalysis) await this.saveBodyAnalysis(data.bodyAnalysis);
      if (data.workoutSessions) {
        for (const session of data.workoutSessions) {
          await this.storeWorkoutSession(session);
        }
      }
      return true;
    } catch (error) {
      console.error('[DataBridge] importFitnessData error:', error);
      return false;
    }
  }

  async importNutritionData(data: any): Promise<boolean> {
    try {
      if (data.mealLogs) {
        for (const log of data.mealLogs) {
          await this.storeMealLog(log);
        }
      }
      return true;
    } catch (error) {
      console.error('[DataBridge] importNutritionData error:', error);
      return false;
    }
  }

  async importProgressData(data: any): Promise<boolean> {
    try {
      if (data.bodyMeasurements) {
        for (const measurement of data.bodyMeasurements) {
          await this.storeBodyMeasurement(measurement);
        }
      }
      if (data.advancedReview) await this.saveAdvancedReview(data.advancedReview);
      return true;
    } catch (error) {
      console.error('[DataBridge] importProgressData error:', error);
      return false;
    }
  }

  // ============================================================================
  // USER PREFERENCES (backward compatibility)
  // ============================================================================

  async updateUserPreferences(preferences: any): Promise<boolean> {
    try {
      // Store in ProfileStore and local
      const profileStore = useProfileStore.getState();
      const current = profileStore.personalInfo || {};
      const updated = { ...current, ...preferences };
      profileStore.updatePersonalInfo(updated as PersonalInfoData);
      await this.saveToLocal('userPreferences', preferences);
      return true;
    } catch (error) {
      console.error('[DataBridge] updateUserPreferences error:', error);
      return false;
    }
  }

  async getUserPreferences(): Promise<any | null> {
    try {
      const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        return data.userPreferences || null;
      }
      return null;
    } catch (error) {
      console.error('[DataBridge] getUserPreferences error:', error);
      return null;
    }
  }

  // ============================================================================
  // STORAGE UTILITIES (backward compatibility)
  // ============================================================================

  async clearAllData(): Promise<void> {
    return this.clearLocalData();
  }

  async getStorageInfo(): Promise<any> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stats = await this.getDataStatistics();
      return {
        totalKeys: keys.length,
        ...stats,
      };
    } catch (error) {
      console.error('[DataBridge] getStorageInfo error:', error);
      return { totalKeys: 0 };
    }
  }

  async isQuotaExceeded(): Promise<boolean> {
    // AsyncStorage doesn't have a quota limit in the same way
    return false;
  }

  // ============================================================================
  // TEST/DEBUG UTILITIES (backward compatibility)
  // ============================================================================

  async testLocalStorageMethods(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    try {
      // Test save
      const testData = { test: true, timestamp: Date.now() };
      await this.saveToLocal('testData', testData);
      results.push({ method: 'saveToLocal', success: true });

      // Test load
      const loaded = await this.getOnboardingData();
      results.push({ method: 'getOnboardingData', success: !!loaded });

      // Test hasLocalData
      const hasData = await this.hasLocalData();
      results.push({ method: 'hasLocalData', success: true, hasData });

      return { success: true, results };
    } catch (error) {
      results.push({ method: 'error', success: false, error: String(error) });
      return { success: false, results };
    }
  }

  async testMigrationDetection(): Promise<{ hasData: boolean; dataTypes: string[] }> {
    const dataTypes: string[] = [];
    const data = await this.loadAllData();
    if (data.personalInfo) dataTypes.push('personalInfo');
    if (data.dietPreferences) dataTypes.push('dietPreferences');
    if (data.bodyAnalysis) dataTypes.push('bodyAnalysis');
    if (data.workoutPreferences) dataTypes.push('workoutPreferences');
    if (data.advancedReview) dataTypes.push('advancedReview');
    return { hasData: dataTypes.length > 0, dataTypes };
  }

  async createSampleProfileData(): Promise<boolean> {
    try {
      const samplePersonalInfo = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        age: 25,
        gender: 'male' as const,
        country: 'US',
        state: 'CA',
      };
      await this.savePersonalInfo(samplePersonalInfo as any);
      console.log('[DataBridge] Sample profile data created');
      return true;
    } catch (error) {
      console.error('[DataBridge] createSampleProfileData error:', error);
      return false;
    }
  }

  async getProfileDataSummary(): Promise<any> {
    const data = await this.loadAllData();
    return {
      hasPersonalInfo: !!data.personalInfo,
      hasDietPreferences: !!data.dietPreferences,
      hasBodyAnalysis: !!data.bodyAnalysis,
      hasWorkoutPreferences: !!data.workoutPreferences,
      hasAdvancedReview: !!data.advancedReview,
      source: data.source,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async saveToLocal(field: string, data: any): Promise<void> {
    try {
      const existingDataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};

      const updatedData = {
        ...existingData,
        [field]: data,
        lastUpdatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(updatedData));
      console.log(`[DataBridge] Saved ${field} to local storage`);
    } catch (error) {
      console.error(`[DataBridge] Failed to save ${field} to local:`, error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const dataBridge = DataBridge.getInstance();
export default dataBridge;
export { DataBridge };
export type {
  DataBridgeConfig,
  ShadowModeReport,
  AllDataResult,
  SaveResult,
  MigrationResult,
  ShadowModeDiscrepancy,
};
