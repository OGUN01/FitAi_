// Enhanced Data Manager for Track B Infrastructure
// Provides comprehensive data management with local storage, validation, and sync capabilities

import { enhancedLocalStorage } from './localStorage';
import { validationService } from '../utils/validation';
import { offlineService } from './offline';
import { supabase } from './supabase';
import { isGuestId } from '../utils/uuid';
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
  SyncStatus,
} from '../types/localData';
import {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  BodyAnalysis,
  StorageConfig,
  SyncResult,
  SyncableData,
} from '../types/profileData';

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
    validation.errors.forEach((error) => {
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
      throw new Error(
        `Invalid onboarding data: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Sanitize data
    const sanitizedData: OnboardingData = {
      personalInfo: validationService.sanitizePersonalInfo(data.personalInfo),
      fitnessGoals: data.fitnessGoals,
      currentStep: data.currentStep ?? 0,
      isComplete: data.isComplete,
      startedAt: data.startedAt ?? new Date().toISOString(),
      completedAt: data.completedAt,
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
      throw new Error(
        `Invalid workout session: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Add to schema
    if (this.currentSchema) {
      // Remove existing session with same ID
      this.currentSchema.fitness.sessions = this.currentSchema.fitness.sessions.filter(
        (s) => s.id !== session.id
      );

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
      const sessionIndex = this.currentSchema.fitness.sessions.findIndex((s) => s.id === sessionId);

      if (sessionIndex !== -1) {
        this.currentSchema.fitness.sessions[sessionIndex] = {
          ...this.currentSchema.fitness.sessions[sessionIndex],
          ...updates,
          syncStatus: SyncStatus.PENDING,
        };

        this.currentSchema.updatedAt = new Date().toISOString();
        await enhancedLocalStorage.updateSchema(this.currentSchema);

        // Queue for sync if user is authenticated
        if (this.currentSchema.user.authState.isAuthenticated) {
          await this.queueForSync(
            'workout_sessions',
            'update',
            this.currentSchema.fitness.sessions[sessionIndex]
          );
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
      this.currentSchema.nutrition.logs = this.currentSchema.nutrition.logs.filter(
        (log) => log.id !== mealLog.id
      );

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
      logs = logs.filter((log) => (log.date || log.loggedAt?.slice(0, 10)) === date);
    }

    // Sort by timestamp (most recent first)
    logs.sort(
      (a, b) =>
        new Date(b.loggedAt || b.date || '').getTime() -
        new Date(a.loggedAt || a.date || '').getTime()
    );

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
      this.currentSchema.progress.measurements = this.currentSchema.progress.measurements.filter(
        (m) => m.id !== measurement.id
      );

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

  private async queueForSync(
    table: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
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
        const sessionIndex = this.currentSchema.fitness.sessions.findIndex((s) => s.id === id);
        if (sessionIndex !== -1) {
          this.currentSchema.fitness.sessions[sessionIndex].syncStatus = SyncStatus.SYNCED;
        }
        break;

      case 'meal_logs':
        const logIndex = this.currentSchema.nutrition.logs.findIndex((log) => log.id === id);
        if (logIndex !== -1) {
          this.currentSchema.nutrition.logs[logIndex].syncStatus = SyncStatus.SYNCED;
        }
        break;

      case 'progress_entries':
        const measurementIndex = this.currentSchema.progress.measurements.findIndex(
          (m) => m.id === id
        );
        if (measurementIndex !== -1) {
          this.currentSchema.progress.measurements[measurementIndex].syncStatus = SyncStatus.SYNCED;
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
    const pendingSessions = this.currentSchema.fitness.sessions.filter(
      (s) => (s.syncStatus as any) === SyncStatus.PENDING || (s.syncStatus as any) === 'local'
    );
    if (pendingSessions.length > 0) {
      pendingData.push({ table: 'workout_sessions', data: pendingSessions });
    }

    // Check meal logs
    const pendingLogs = this.currentSchema.nutrition.logs.filter(
      (log) => (log.syncStatus as any) === SyncStatus.PENDING || (log.syncStatus as any) === 'local'
    );
    if (pendingLogs.length > 0) {
      pendingData.push({ table: 'meal_logs', data: pendingLogs });
    }

    // Check measurements
    const pendingMeasurements = this.currentSchema.progress.measurements.filter(
      (m) => (m.syncStatus as any) === SyncStatus.PENDING || (m.syncStatus as any) === 'local'
    );
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
      if (
        authState.isAuthenticated &&
        !this.currentSchema.user.authState.migrationStatus.isCompleted
      ) {
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
      throw new Error(`Invalid import data: ${validation.errors.map((e) => e.message).join(', ')}`);
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

  /**
   * Check if guest data exists that needs migration
   */
  async hasGuestDataForMigration(): Promise<boolean> {
    try {
      console.log('🔍 Checking for guest data that needs migration');
      
      const baseKeys = ['personalInfo', 'fitnessGoals', 'dietPreferences', 'workoutPreferences'];
      
      for (const baseKey of baseKeys) {
        try {
          const guestData = await enhancedLocalStorage.retrieveData(`${baseKey}_guest`);
          if (guestData) {
            console.log(`📊 Found guest data for migration: ${baseKey}`);
            return true;
          }
        } catch (keyError) {
          console.error(`❌ Error checking guest key ${baseKey}:`, keyError);
        }
      }
      
      console.log('💭 No guest data found for migration');
      return false;
    } catch (error) {
      console.error('❌ Error checking guest data for migration:', error);
      return false;
    }
  }

  // ============================================================================
  // ENHANCED PROFILE DATA MANAGEMENT
  // ============================================================================

  private userId: string | null = null;
  private isOnline: boolean = true;

  setUserId(userId: string | null) {
    console.log('🔐 DataManager.setUserId() called:', {
      previousUserId: this.userId,
      newUserId: userId,
      timestamp: new Date().toISOString()
    });
    this.userId = userId;
  }

  getCurrentUserId(): string {
    return this.userId || 'guest_user';
  }

  /**
   * Checks if the current user is a guest user
   */
  private isGuestUser(): boolean {
    return !this.userId || isGuestId(this.userId);
  }

  /**
   * Checks if database operations should be attempted for saves
   */
  private shouldSaveToDatabase(): boolean {
    return this.userId && this.isOnline && !this.isGuestUser();
  }

  /**
   * Checks if database operations should be attempted for loads
   */
  private shouldLoadFromDatabase(): boolean {
    return this.userId && this.isOnline && !this.isGuestUser();
  }

  getCurrentUserUUID(): string {
    console.log('🔍 DataManager.getCurrentUserUUID() called:', {
      hasUserId: !!this.userId,
      userId: this.userId,
      isGuest: this.isGuestUser(),
      isGuestUser: this.userId === 'guest_user'
    });
    
    // If we have a real user ID, return it (should already be UUID from Supabase)
    if (this.userId && this.userId !== 'guest_user') {
      console.log('✅ Returning real authenticated user ID:', this.userId);
      return this.userId;
    }
    
    // For guest users, generate a proper UUID v4 format
    // This ensures guest users get a valid UUID for database operations
    const generatedUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    console.log('⚠️ Generating UUID for guest user:', generatedUUID);
    return generatedUUID;
  }

  setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
  }

  // Enhanced save methods with dual storage
  async savePersonalInfo(data: PersonalInfo): Promise<boolean> {
    try {
      const localKey = `personalInfo_${this.userId || 'guest'}`;

      // Save to local storage first
      const localSuccess = await enhancedLocalStorage.storeData(localKey, data);
      if (!localSuccess) {
        console.warn('⚠️ Failed to save personal info locally');
      }

      // Save to remote only if user is authenticated (not guest)
      let remoteSuccess = false;
      if (this.shouldSaveToDatabase()) {
        try {
          // Save to profiles table directly (no separate personal_info table)
          const profileData = {
            id: this.userId,
            email: data.email || '',
            name: data.name,
            age: data.age ? parseInt(data.age) : null,
            gender: data.gender,
            height_cm: data.height ? parseInt(data.height) : null,
            weight_kg: data.weight ? parseFloat(data.weight) : null,
            activity_level: data.activityLevel,
            updated_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });
          
          remoteSuccess = !error;
          if (error) {
            console.error('Failed to save personal info to profiles:', error.message);
          } else {
            console.log('✅ Personal info saved to profiles table');
          }
        } catch (error) {
          console.error('Failed to save personal info to remote:', error);
        }
      } else {
        const reason = this.isGuestUser() ? 'Guest mode' : 'Offline mode';
        console.log(`📱 ${reason}: Personal info saved locally only (skipping database)`);
      }

      return localSuccess; // At minimum, local save must succeed
    } catch (error) {
      console.error('Failed to save personal info:', error);
      return false;
    }
  }

  async loadPersonalInfo(): Promise<PersonalInfo | null> {
    try {
      const localKey = `personalInfo_${this.userId || 'guest'}`;

      // Try remote first if user is authenticated
      if (this.shouldLoadFromDatabase()) {
        try {
          // Load from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.userId)
            .single();

          if (!error && data) {
            // Convert profiles data back to PersonalInfo format
            const personalInfo: PersonalInfo = {
              id: data.id,
              name: data.name,
              email: data.email,
              age: data.age ? data.age.toString() : '',
              gender: data.gender,
              height: data.height_cm ? data.height_cm.toString() : '',
              weight: data.weight_kg ? data.weight_kg.toString() : '',
              activityLevel: data.activity_level,
              version: 1,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              syncStatus: 'synced',
              source: 'remote'
            };
            return personalInfo;
          }
        } catch (error) {
          console.error('Failed to load personal info from remote:', error);
        }
      }

      // Fallback to local storage
      return await enhancedLocalStorage.retrieveData<PersonalInfo>(localKey);
    } catch (error) {
      console.error('Failed to load personal info:', error);
      return null;
    }
  }

  async saveFitnessGoals(data: FitnessGoals): Promise<boolean> {
    try {
      const localKey = `fitnessGoals_${this.userId || 'guest'}`;

      // Save to local storage first
      const localSuccess = await enhancedLocalStorage.storeData(localKey, data);
      if (!localSuccess) {
        console.warn('⚠️ Failed to save fitness goals locally');
      }

      // Save to remote only if user is authenticated (not guest)
      let remoteSuccess = false;
      if (this.shouldSaveToDatabase()) {
        try {
          const fitnessGoalsData = {
            user_id: this.userId,
            primary_goals: data.primaryGoals,
            time_commitment: data.timeCommitment,
            experience_level: data.experience,
            updated_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('fitness_goals')
            .upsert(fitnessGoalsData, { onConflict: 'user_id' });
            
          remoteSuccess = !error;
          if (error) {
            console.error('Failed to save fitness goals to remote:', error.message);
          } else {
            console.log('✅ Fitness goals saved to remote');
          }
        } catch (error) {
          console.error('Failed to save fitness goals to remote:', error);
        }
      } else {
        const reason = this.isGuestUser() ? 'Guest mode' : 'Offline mode';
        console.log(`📱 ${reason}: Fitness goals saved locally only (skipping database)`);
      }

      return localSuccess; // At minimum, local save must succeed
    } catch (error) {
      console.error('Failed to save fitness goals:', error);
      return false;
    }
  }

  async loadFitnessGoals(): Promise<FitnessGoals | null> {
    try {
      const localKey = `fitnessGoals_${this.userId || 'guest'}`;

      if (this.shouldLoadFromDatabase()) {
        try {
          const { data, error } = await supabase
            .from('fitness_goals')
            .select('*')
            .eq('user_id', this.userId)
            .single();

          if (!error && data) {
            // Convert remote data to local FitnessGoals format
            const fitnessGoals: FitnessGoals = {
              id: data.id,
              primaryGoals: data.primary_goals,
              timeCommitment: data.time_commitment,
              experience: data.experience_level,
              version: 1,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              syncStatus: 'synced',
              source: 'remote'
            };
            return fitnessGoals;
          }
        } catch (error) {
          console.error('Failed to load fitness goals from remote:', error);
        }
      }

      return await enhancedLocalStorage.retrieveData<FitnessGoals>(localKey);
    } catch (error) {
      console.error('Failed to load fitness goals:', error);
      return null;
    }
  }

  async saveDietPreferences(data: DietPreferences): Promise<boolean> {
    try {
      const localKey = `dietPreferences_${this.userId || 'guest'}`;

      // Add default values for optional fields if not provided
      const dataWithDefaults = {
        ...data,
        cookingSkill: data.cookingSkill || 'intermediate',
        mealPrepTime: data.mealPrepTime || 'moderate',
        dislikes: data.dislikes || []
      };

      const localSuccess = await enhancedLocalStorage.storeData(localKey, dataWithDefaults);

      let remoteSuccess = false;
      if (this.shouldSaveToDatabase()) {
        try {
          const { error } = await supabase
            .from('diet_preferences')
            .upsert({ ...dataWithDefaults, user_id: this.userId });
          remoteSuccess = !error;
          if (!error) {
            console.log('✅ Diet preferences saved to remote');
          }
        } catch (error) {
          console.error('Failed to save diet preferences to remote:', error);
        }
      } else {
        const reason = this.isGuestUser() ? 'Guest mode' : 'Offline mode';
        console.log(`📱 ${reason}: Diet preferences saved locally only (skipping database)`);
      }

      return localSuccess || remoteSuccess;
    } catch (error) {
      console.error('Failed to save diet preferences:', error);
      return false;
    }
  }

  async loadDietPreferences(): Promise<DietPreferences | null> {
    try {
      const localKey = `dietPreferences_${this.userId || 'guest'}`;

      if (this.shouldLoadFromDatabase()) {
        try {
          const { data, error } = await supabase
            .from('diet_preferences')
            .select('*')
            .eq('user_id', this.userId)
            .single();

          if (!error && data) {
            return data as DietPreferences;
          }
        } catch (error) {
          console.error('Failed to load diet preferences from remote:', error);
        }
      }

      return await enhancedLocalStorage.retrieveData<DietPreferences>(localKey);
    } catch (error) {
      console.error('Failed to load diet preferences:', error);
      return null;
    }
  }

  async saveWorkoutPreferences(data: WorkoutPreferences): Promise<boolean> {
    try {
      const localKey = `workoutPreferences_${this.userId || 'guest'}`;

      const localSuccess = await enhancedLocalStorage.storeData(localKey, data);

      // For now, workout preferences are stored locally only
      // TODO: Add workout_preferences table to Supabase when ready
      let remoteSuccess = false;
      if (this.shouldSaveToDatabase()) {
        try {
          // Placeholder for future Supabase integration
          console.log('📝 Workout preferences will be synced to Supabase in future update');
          remoteSuccess = true; // Assume success for now
        } catch (error) {
          console.error('Failed to save workout preferences to remote:', error);
        }
      } else {
        const reason = this.isGuestUser() ? 'Guest mode' : 'Offline mode';
        console.log(`📱 ${reason}: Workout preferences saved locally only`);
      }

      return localSuccess || remoteSuccess;
    } catch (error) {
      console.error('Failed to save workout preferences:', error);
      return false;
    }
  }

  async loadWorkoutPreferences(): Promise<WorkoutPreferences | null> {
    try {
      const localKey = `workoutPreferences_${this.userId || 'guest'}`;

      // For now, load from local storage only
      // TODO: Add remote loading when Supabase table is ready
      if (this.shouldLoadFromDatabase()) {
        try {
          // Placeholder for future Supabase integration
          console.log('📝 Workout preferences will be loaded from Supabase in future update');
        } catch (error) {
          console.error('Failed to load workout preferences from remote:', error);
        }
      }

      return await enhancedLocalStorage.retrieveData<WorkoutPreferences>(localKey);
    } catch (error) {
      console.error('Failed to load workout preferences:', error);
      return null;
    }
  }

  // ============================================================================
  // UTILITY METHODS FOR MIGRATION
  // ============================================================================

  /**
   * Check if user has any local profile data
   * Checks both guest keys and user-specific keys for comprehensive migration detection
   */
  async hasLocalData(): Promise<boolean> {
    try {
      console.log('🔍 Checking for local data, userId:', this.userId);

      // Define all possible key patterns to check
      const baseKeys = ['personalInfo', 'fitnessGoals', 'dietPreferences', 'workoutPreferences'];
      const keysToCheck: string[] = [];

      // Always check guest keys first (for migration scenarios)
      baseKeys.forEach(baseKey => {
        keysToCheck.push(`${baseKey}_guest`);
      });

      // If we have a userId, also check user-specific keys
      if (this.userId) {
        baseKeys.forEach(baseKey => {
          keysToCheck.push(`${baseKey}_${this.userId}`);
        });
      }

      console.log('🔍 Checking keys:', keysToCheck);

      // Check each key for data
      for (const key of keysToCheck) {
        try {
          const data = await enhancedLocalStorage.retrieveData(key);
          console.log(`🔍 Key ${key}: ${data ? 'HAS DATA' : 'NO DATA'}`);
          if (data) {
            console.log(`📊 Found local data for key: ${key}`);
            return true;
          }
        } catch (keyError) {
          console.error(`❌ Error checking key ${key}:`, keyError);
        }
      }

      console.log('📊 No local profile data found');
      return false;
    } catch (error) {
      console.error('❌ Error checking local data:', error);
      return false;
    }
  }

  /**
   * Clear all local profile data
   */
  async clearLocalData(): Promise<boolean> {
    try {
      const keys = [
        `personalInfo_${this.userId || 'guest'}`,
        `fitnessGoals_${this.userId || 'guest'}`,
        `dietPreferences_${this.userId || 'guest'}`,
        `workoutPreferences_${this.userId || 'guest'}`,
        `userProfile_${this.userId || 'guest'}`,
      ];

      // Remove all profile data
      for (const key of keys) {
        await enhancedLocalStorage.removeData(key);
      }

      console.log('✅ Cleared all local profile data');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear local data:', error);
      return false;
    }
  }

  /**
   * Get profile data summary for debugging
   */
  async getProfileDataSummary(): Promise<{
    hasPersonalInfo: boolean;
    hasFitnessGoals: boolean;
    hasDietPreferences: boolean;
    hasWorkoutPreferences: boolean;
    totalItems: number;
    dataLocation: 'guest' | 'user' | 'mixed' | 'none';
  }> {
    try {
      const personalInfo = await this.loadPersonalInfo();
      const fitnessGoals = await this.loadFitnessGoals();
      const dietPreferences = await this.loadDietPreferences();
      const workoutPreferences = await this.loadWorkoutPreferences();

      const summary = {
        hasPersonalInfo: !!personalInfo,
        hasFitnessGoals: !!fitnessGoals,
        hasDietPreferences: !!dietPreferences,
        hasWorkoutPreferences: !!workoutPreferences,
        totalItems: 0,
        dataLocation: 'none' as 'guest' | 'user' | 'mixed' | 'none'
      };

      summary.totalItems = Object.values(summary).filter(Boolean).length - 2; // Exclude totalItems and dataLocation

      // Determine data location for debugging
      if (summary.totalItems > 0) {
        const guestDataCount = await this.countGuestData();
        const userDataCount = await this.countUserData();
        
        if (guestDataCount > 0 && userDataCount > 0) {
          summary.dataLocation = 'mixed';
        } else if (guestDataCount > 0) {
          summary.dataLocation = 'guest';
        } else if (userDataCount > 0) {
          summary.dataLocation = 'user';
        }
      }

      console.log('📊 Profile data summary:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Error getting profile data summary:', error);
      return {
        hasPersonalInfo: false,
        hasFitnessGoals: false,
        hasDietPreferences: false,
        hasWorkoutPreferences: false,
        totalItems: 0,
        dataLocation: 'none'
      };
    }
  }

  /**
   * Count guest data entries
   */
  private async countGuestData(): Promise<number> {
    let count = 0;
    const baseKeys = ['personalInfo', 'fitnessGoals', 'dietPreferences', 'workoutPreferences'];
    
    for (const baseKey of baseKeys) {
      try {
        const data = await enhancedLocalStorage.retrieveData(`${baseKey}_guest`);
        if (data) count++;
      } catch (error) {
        // Ignore individual key errors
      }
    }
    
    return count;
  }

  /**
   * Count user-specific data entries
   */
  private async countUserData(): Promise<number> {
    if (!this.userId) return 0;
    
    let count = 0;
    const baseKeys = ['personalInfo', 'fitnessGoals', 'dietPreferences', 'workoutPreferences'];
    
    for (const baseKey of baseKeys) {
      try {
        const data = await enhancedLocalStorage.retrieveData(`${baseKey}_${this.userId}`);
        if (data) count++;
      } catch (error) {
        // Ignore individual key errors
      }
    }
    
    return count;
  }

  /**
   * Migrate guest data to authenticated user keys
   * This handles the key transition when a user signs in after using the app as guest
   */
  async migrateGuestDataToUser(userId: string): Promise<{
    success: boolean;
    migratedKeys: string[];
    errors: string[];
  }> {
    const result = {
      success: true,
      migratedKeys: [] as string[],
      errors: [] as string[]
    };

    try {
      console.log('🔄 Starting guest data migration to user:', userId);

      const baseKeys = ['personalInfo', 'fitnessGoals', 'dietPreferences', 'workoutPreferences', 'bodyAnalysis'];

      for (const baseKey of baseKeys) {
        try {
          const guestKey = `${baseKey}_guest`;
          const userKey = `${baseKey}_${userId}`;

          // Check if guest data exists
          const guestData = await enhancedLocalStorage.retrieveData(guestKey);
          if (guestData) {
            console.log(`💾 Migrating ${baseKey} from guest to user key`);
            
            // Save to user-specific key
            const saveSuccess = await enhancedLocalStorage.storeData(userKey, guestData);
            if (saveSuccess) {
              // Remove guest key after successful migration
              await enhancedLocalStorage.removeData(guestKey);
              result.migratedKeys.push(baseKey);
              console.log(`✅ Successfully migrated ${baseKey}`);
            } else {
              result.errors.push(`Failed to save ${baseKey} to user key`);
              result.success = false;
            }
          } else {
            console.log(`💭 No guest data found for ${baseKey}`);
          }
        } catch (keyError) {
          const errorMsg = `Error migrating ${baseKey}: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      console.log(`🏁 Guest data migration completed. Migrated: ${result.migratedKeys.length} keys`);
      return result;
    } catch (error) {
      console.error('❌ Guest data migration failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
      return result;
    }
  }

  // ============================================================================
  // DEBUG & TESTING METHODS
  // ============================================================================

  /**
   * Create sample profile data for testing migration
   */
  async createSampleProfileData(): Promise<boolean> {
    try {
      console.log('🧪 Creating sample profile data for testing...');

      // Sample personal info
      const samplePersonalInfo: PersonalInfo = {
        id: 'sample-personal-1',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        source: 'local',
        name: 'Test User',
        age: '25',
        gender: 'male',
        height: '175',
        weight: '70',
        activityLevel: 'moderate',
      };

      // Sample fitness goals
      const sampleFitnessGoals: FitnessGoals = {
        id: 'sample-goals-1',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        source: 'local',
        primaryGoals: ['weight_loss', 'muscle_gain'],
        experience: 'intermediate',
        timeCommitment: '30-45 minutes',
      };

      // Save sample data
      const personalInfoSaved = await this.savePersonalInfo(samplePersonalInfo);
      const fitnessGoalsSaved = await this.saveFitnessGoals(sampleFitnessGoals);

      const success = personalInfoSaved && fitnessGoalsSaved;
      console.log(`🧪 Sample data creation ${success ? 'successful' : 'failed'}`);

      return success;
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      return false;
    }
  }

  /**
   * Test the migration detection system
   */
  async testMigrationDetection(): Promise<void> {
    try {
      console.log('🧪 Testing migration detection system...');

      // Check current state
      const hasData = await this.hasLocalData();
      console.log('📊 Current hasLocalData result:', hasData);

      // Get data summary
      const summary = await this.getProfileDataSummary();
      console.log('📊 Profile data summary:', summary);

      // If no data, create sample data
      if (!hasData) {
        console.log('🧪 No data found, creating sample data...');
        await this.createSampleProfileData();

        // Check again
        const hasDataAfter = await this.hasLocalData();
        console.log('📊 hasLocalData after creating sample:', hasDataAfter);
      }

      console.log('✅ Migration detection test completed');
    } catch (error) {
      console.error('❌ Migration detection test failed:', error);
    }
  }

  /**
   * Test localStorage methods directly
   */
  async testLocalStorageMethods(): Promise<void> {
    try {
      console.log('🧪 Testing localStorage methods directly...');

      const testKey = 'test_key_123';
      const testData = { message: 'Hello, World!', timestamp: Date.now() };

      // Test storeData
      console.log('🧪 Testing storeData...');
      const storeResult = await enhancedLocalStorage.storeData(testKey, testData);
      console.log('📊 Store result:', storeResult);

      // Test retrieveData
      console.log('🧪 Testing retrieveData...');
      const retrieveResult = await enhancedLocalStorage.retrieveData(testKey);
      console.log('📊 Retrieve result:', retrieveResult);

      // Test removeData
      console.log('🧪 Testing removeData...');
      await enhancedLocalStorage.removeData(testKey);
      console.log('📊 Remove completed');

      // Verify removal
      const verifyResult = await enhancedLocalStorage.retrieveData(testKey);
      console.log('📊 Verify removal result (should be null):', verifyResult);

      console.log('✅ localStorage methods test completed');
    } catch (error) {
      console.error('❌ localStorage methods test failed:', error);
    }
  }
}

// Export singleton instance
export const dataManager = DataManagerService.getInstance();
export default dataManager;
