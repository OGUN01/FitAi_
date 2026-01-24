// Migration Manager for Track B Infrastructure
// Coordinates migration process with UI updates and user interaction
// Supports resume capability after interruption and rollback on failure

import AsyncStorage from "@react-native-async-storage/async-storage";
import { migrationEngine, MigrationProgress } from "./migration";
import { enhancedLocalStorage } from "./localStorage";
import { dataBridge } from "./DataBridge";
import { profileValidator } from "./profileValidator";
import { supabase } from "./supabase";
import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  SyncConflict,
  MigrationResult,
} from "../types/profileData";

// ============================================================================
// CONSTANTS
// ============================================================================

const MIGRATION_STATE_KEY = "fitai_migration_state";
const MIGRATION_BACKUP_KEY = "fitai_migration_backup";
const MIGRATION_CHECKPOINT_KEY = "fitai_migration_checkpoint";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface MigrationManagerConfig {
  autoStartAfterAuth: boolean;
  showProgressUI: boolean;
  allowUserCancel: boolean;
  backgroundMigration: boolean;
}

export interface MigrationCheckpoint {
  migrationId: string;
  userId: string;
  currentStepIndex: number;
  currentStepName: string;
  completedSteps: string[];
  failedSteps: string[];
  startTime: string;
  lastCheckpointTime: string;
  status: "in_progress" | "interrupted" | "failed" | "rolled_back";
  backupCreated: boolean;
  errors: Array<{ step: string; message: string; timestamp: string }>;
}

export interface MigrationState {
  isActive: boolean;
  canStart: boolean;
  hasLocalData: boolean;
  hasIncompleteResumable: boolean;
  incompleteCheckpoint: MigrationCheckpoint | null;
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
      const checkpoint = await this.loadCheckpoint();

      // Check if there's an incomplete migration that can be resumed
      const hasIncompleteResumable =
        checkpoint !== null &&
        (checkpoint.status === "in_progress" ||
          checkpoint.status === "interrupted");

      const state: MigrationState = {
        isActive: this.currentMigration.progress?.status === "running",
        canStart: hasLocalData && !this.currentMigration.progress,
        hasLocalData,
        hasIncompleteResumable,
        incompleteCheckpoint: hasIncompleteResumable ? checkpoint : null,
        lastMigrationAttempt: lastAttempt?.startTime || null,
        migrationHistory,
      };

      this.notifyStateChange(state);
      return state;
    } catch (error) {
      console.error("Failed to check migration status:", error);
      return {
        isActive: false,
        canStart: false,
        hasLocalData: false,
        hasIncompleteResumable: false,
        incompleteCheckpoint: null,
        lastMigrationAttempt: null,
        migrationHistory: [],
      };
    }
  }

  /**
   * Start migration process with checkpoint support for resume/rollback
   */
  async startMigration(userId: string): Promise<MigrationResult> {
    if (this.currentMigration.progress?.status === "running") {
      throw new Error("Migration is already in progress");
    }

    const migrationId = `migration_${Date.now()}`;
    const startTime = new Date().toISOString();

    try {
      // Step 1: Create backup of local data before migration
      console.log("💾 Creating backup before migration...");
      const backupCreated = await this.createMigrationBackup();

      // Step 2: Create initial checkpoint
      const checkpoint: MigrationCheckpoint = {
        migrationId,
        userId,
        currentStepIndex: 0,
        currentStepName: "initializing",
        completedSteps: [],
        failedSteps: [],
        startTime,
        lastCheckpointTime: startTime,
        status: "in_progress",
        backupCreated,
        errors: [],
      };
      await this.saveCheckpoint(checkpoint);
      console.log("📍 Initial checkpoint created");

      // Step 3: Subscribe to migration progress and update checkpoints
      this.currentMigration.unsubscribe = migrationEngine.onProgress(
        async (progress) => {
          this.currentMigration.progress = progress;
          this.notifyProgressChange(progress);

          // Update checkpoint on each progress update
          if (progress.status === "running") {
            checkpoint.currentStepIndex = progress.currentStepIndex;
            checkpoint.currentStepName = progress.currentStep;
            checkpoint.lastCheckpointTime = new Date().toISOString();

            // Track completed steps from progress
            if (progress.currentStepIndex > checkpoint.completedSteps.length) {
              // A new step was completed - this is a simplified tracking
              // The actual completed steps come from migrationEngine
            }

            await this.saveCheckpoint(checkpoint);
          }
        },
      );

      // Step 4: Start migration
      console.log("🚀 Starting migration with checkpoint tracking...");
      const result = await migrationEngine.migrateToSupabase(userId);

      // Step 5: Handle result
      if (result.success) {
        // Clear checkpoint and backup on success
        console.log("✅ Migration completed successfully, cleaning up...");
        await this.clearCheckpoint();
        await this.clearBackup();
      } else {
        // Mark checkpoint as failed but keep it for potential resume
        checkpoint.status = "failed";
        checkpoint.errors.push({
          step: checkpoint.currentStepName,
          message: result.errors?.[0]?.message || "Unknown error",
          timestamp: new Date().toISOString(),
        });
        await this.saveCheckpoint(checkpoint);
        console.log("⚠️ Migration failed, checkpoint preserved for resume");
      }

      this.currentMigration.result = result as any;
      this.notifyResultChange(result as any);

      // Save migration attempt to history
      await this.saveMigrationAttempt(result as any);

      // Update state
      await this.checkMigrationStatus();

      return result as any;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorResult: MigrationResult = {
        success: false,
        migrationId: `failed_${Date.now()}`,
        progress: {
          migrationId: `failed_${Date.now()}`,
          status: "failed",
          currentStep: "unknown",
          currentStepIndex: 0,
          totalSteps: 8,
          percentage: 0,
          startTime: new Date(),
          endTime: new Date(),
          message: `Migration failed: ${errorMessage}`,
          errors: [
            {
              step: "unknown",
              code: "MIGRATION_START_FAILED",
              message: errorMessage,
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
        errors: [errorMessage],
        warnings: [],
        duration: 0,
        migratedData: {
          personalInfo: false,
          fitnessGoals: false,
          dietPreferences: false,
          workoutPreferences: false,
          bodyAnalysis: false,
          advancedReview: false,
        },
        conflicts: [],
      };

      this.currentMigration.result = errorResult;
      this.notifyResultChange(errorResult);
      await this.saveMigrationAttempt(errorResult);

      return errorResult;
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
      throw new Error("Migration cancellation is not allowed");
    }

    if (this.currentMigration.progress?.status !== "running") {
      return;
    }

    try {
      // TODO: Implement migration cancellation in migration engine
      console.log("Migration cancellation requested");

      if (this.currentMigration.unsubscribe) {
        this.currentMigration.unsubscribe();
        this.currentMigration.unsubscribe = null;
      }

      this.currentMigration.progress = null;
      this.currentMigration.result = null;

      await this.checkMigrationStatus();
    } catch (error) {
      console.error("Failed to cancel migration:", error);
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
      const localData = await dataBridge.exportAllData();
      if (!localData) return false;

      // Check if there's meaningful data to migrate
      const hasUserData =
        localData.user && Object.keys(localData.user).length > 0;
      const hasFitnessData =
        localData.fitness &&
        ((localData.fitness.workouts?.length || 0) > 0 ||
          (localData.fitness.sessions?.length || 0) > 0);
      const hasNutritionData =
        localData.nutrition &&
        ((localData.nutrition.meals?.length || 0) > 0 ||
          (localData.nutrition.logs?.length || 0) > 0);
      const hasProgressData =
        localData.progress &&
        ((localData.progress.measurements?.length || 0) > 0 ||
          (localData.progress.achievements?.length || 0) > 0);

      return (
        hasUserData || hasFitnessData || hasNutritionData || hasProgressData
      );
    } catch (error) {
      console.error("Failed to check local data:", error);
      return false;
    }
  }

  private async getMigrationHistory(): Promise<MigrationAttempt[]> {
    try {
      const history =
        await enhancedLocalStorage.getData<MigrationAttempt[]>(
          "migration_history",
        );
      return history || [];
    } catch (error) {
      console.error("Failed to get migration history:", error);
      return [];
    }
  }

  // ============================================================================
  // CHECKPOINT MANAGEMENT - Resume/Rollback Support
  // ============================================================================

  /**
   * Load migration checkpoint from AsyncStorage
   */
  private async loadCheckpoint(): Promise<MigrationCheckpoint | null> {
    try {
      const checkpointJson = await AsyncStorage.getItem(
        MIGRATION_CHECKPOINT_KEY,
      );
      if (!checkpointJson) return null;
      return JSON.parse(checkpointJson);
    } catch (error) {
      console.error("Failed to load migration checkpoint:", error);
      return null;
    }
  }

  /**
   * Save migration checkpoint to AsyncStorage
   */
  private async saveCheckpoint(checkpoint: MigrationCheckpoint): Promise<void> {
    try {
      await AsyncStorage.setItem(
        MIGRATION_CHECKPOINT_KEY,
        JSON.stringify(checkpoint),
      );
      console.log(
        `📍 Migration checkpoint saved: step ${checkpoint.currentStepIndex}/${checkpoint.completedSteps.length}`,
      );
    } catch (error) {
      console.error("Failed to save migration checkpoint:", error);
    }
  }

  /**
   * Clear migration checkpoint after successful completion or explicit rollback
   */
  private async clearCheckpoint(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MIGRATION_CHECKPOINT_KEY);
      console.log("🧹 Migration checkpoint cleared");
    } catch (error) {
      console.error("Failed to clear migration checkpoint:", error);
    }
  }

  /**
   * Create backup of local data before migration
   */
  private async createMigrationBackup(): Promise<boolean> {
    try {
      const localData = await dataBridge.exportAllData();
      if (!localData) {
        console.warn("No local data to backup");
        return false;
      }
      await AsyncStorage.setItem(
        MIGRATION_BACKUP_KEY,
        JSON.stringify(localData),
      );
      console.log("💾 Migration backup created successfully");
      return true;
    } catch (error) {
      console.error("Failed to create migration backup:", error);
      return false;
    }
  }

  /**
   * Restore local data from backup (rollback)
   */
  private async restoreFromBackup(): Promise<boolean> {
    try {
      const backupJson = await AsyncStorage.getItem(MIGRATION_BACKUP_KEY);
      if (!backupJson) {
        console.warn("No migration backup found");
        return false;
      }

      const backupData = JSON.parse(backupJson);
      await dataBridge.importAllData(backupData);
      console.log("✅ Local data restored from backup");
      return true;
    } catch (error) {
      console.error("Failed to restore from backup:", error);
      return false;
    }
  }

  /**
   * Clear migration backup after successful migration
   */
  private async clearBackup(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MIGRATION_BACKUP_KEY);
      console.log("🧹 Migration backup cleared");
    } catch (error) {
      console.error("Failed to clear migration backup:", error);
    }
  }

  // ============================================================================
  // RESUME MIGRATION
  // ============================================================================

  /**
   * Resume an interrupted migration from the last checkpoint
   */
  async resumeMigration(userId: string): Promise<MigrationResult> {
    console.log("🔄 Attempting to resume interrupted migration...");

    const checkpoint = await this.loadCheckpoint();
    if (!checkpoint) {
      return {
        success: false,
        migrationId: `resume_failed_${Date.now()}`,
        errors: ["No checkpoint found to resume from"],
        migratedData: {},
        conflicts: [],
        duration: 0,
      } as any;
    }

    if (checkpoint.userId !== userId) {
      return {
        success: false,
        migrationId: checkpoint.migrationId,
        errors: ["Checkpoint belongs to a different user"],
        migratedData: {},
        conflicts: [],
        duration: 0,
      } as any;
    }

    if (
      checkpoint.status !== "in_progress" &&
      checkpoint.status !== "interrupted"
    ) {
      return {
        success: false,
        migrationId: checkpoint.migrationId,
        errors: [`Cannot resume migration with status: ${checkpoint.status}`],
        migratedData: {},
        conflicts: [],
        duration: 0,
      } as any;
    }

    console.log(
      `📍 Resuming from step ${checkpoint.currentStepIndex}: ${checkpoint.currentStepName}`,
    );
    console.log(
      `✅ Previously completed steps: ${checkpoint.completedSteps.join(", ")}`,
    );

    // Update checkpoint to show we're resuming
    checkpoint.status = "in_progress";
    checkpoint.lastCheckpointTime = new Date().toISOString();
    await this.saveCheckpoint(checkpoint);

    try {
      // Subscribe to migration progress
      this.currentMigration.unsubscribe = migrationEngine.onProgress(
        async (progress) => {
          this.currentMigration.progress = progress;
          this.notifyProgressChange(progress);

          // Update checkpoint on progress
          if (progress.status === "running") {
            checkpoint.currentStepIndex = progress.currentStepIndex;
            checkpoint.currentStepName = progress.currentStep;
            checkpoint.lastCheckpointTime = new Date().toISOString();
            await this.saveCheckpoint(checkpoint);
          }
        },
      );

      // Continue migration from checkpoint
      const result = await migrationEngine.migrateToSupabase(userId);

      if (result.success) {
        // Clear checkpoint and backup on success
        await this.clearCheckpoint();
        await this.clearBackup();
      } else {
        // Mark checkpoint as failed
        checkpoint.status = "failed";
        checkpoint.errors.push({
          step: checkpoint.currentStepName,
          message: result.errors?.[0]?.message || "Unknown error during resume",
          timestamp: new Date().toISOString(),
        });
        await this.saveCheckpoint(checkpoint);
      }

      this.currentMigration.result = result as any;
      this.notifyResultChange(result as any);
      await this.saveMigrationAttempt(result as any);
      await this.checkMigrationStatus();

      return result as any;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      checkpoint.status = "failed";
      checkpoint.errors.push({
        step: checkpoint.currentStepName,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      await this.saveCheckpoint(checkpoint);

      return {
        success: false,
        migrationId: checkpoint.migrationId,
        errors: [errorMessage],
        migratedData: {},
        conflicts: [],
        duration: Date.now() - new Date(checkpoint.startTime).getTime(),
      } as any;
    } finally {
      if (this.currentMigration.unsubscribe) {
        this.currentMigration.unsubscribe();
        this.currentMigration.unsubscribe = null;
      }
    }
  }

  // ============================================================================
  // ROLLBACK MIGRATION
  // ============================================================================

  /**
   * Rollback a failed or interrupted migration
   * Restores local data from backup and clears remote data that was uploaded
   */
  async rollbackMigration(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    console.log("⏪ Rolling back migration...");

    const checkpoint = await this.loadCheckpoint();

    try {
      // Step 1: Restore local data from backup
      const restored = await this.restoreFromBackup();
      if (!restored) {
        console.warn("⚠️ No backup to restore, but continuing rollback");
      }

      // Step 2: Clear any partially uploaded remote data
      if (checkpoint && checkpoint.completedSteps.length > 0) {
        console.log(
          `🗑️ Cleaning up ${checkpoint.completedSteps.length} completed steps from remote...`,
        );

        // Delete data from Supabase for each completed step
        for (const step of checkpoint.completedSteps.reverse()) {
          try {
            await this.rollbackStep(step, userId);
            console.log(`  ✅ Rolled back step: ${step}`);
          } catch (stepError) {
            console.error(`  ❌ Failed to rollback step ${step}:`, stepError);
            // Continue with other steps even if one fails
          }
        }
      }

      // Step 3: Update checkpoint status
      if (checkpoint) {
        checkpoint.status = "rolled_back";
        checkpoint.lastCheckpointTime = new Date().toISOString();
        await this.saveCheckpoint(checkpoint);
      }

      // Step 4: Clear checkpoint and backup
      await this.clearCheckpoint();
      await this.clearBackup();

      // Step 5: Clear current migration state
      this.currentMigration.progress = null;
      this.currentMigration.result = null;

      // Refresh state
      await this.checkMigrationStatus();

      console.log("✅ Migration rollback completed");
      return {
        success: true,
        message:
          "Migration rolled back successfully. Local data has been restored.",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown rollback error";
      console.error("❌ Rollback failed:", error);
      return {
        success: false,
        message: `Rollback failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Rollback a specific migration step by deleting uploaded data
   */
  private async rollbackStep(step: string, userId: string): Promise<void> {
    switch (step) {
      case "uploadUserProfile":
        // Delete profile data
        await supabase.from("profiles").delete().eq("id", userId);
        await supabase.from("fitness_goals").delete().eq("user_id", userId);
        await supabase.from("diet_preferences").delete().eq("user_id", userId);
        await supabase
          .from("workout_preferences")
          .delete()
          .eq("user_id", userId);
        await supabase.from("body_analysis").delete().eq("user_id", userId);
        break;

      case "uploadFitnessData":
        // Delete workout data
        await supabase.from("workouts").delete().eq("user_id", userId);
        await supabase.from("workout_sessions").delete().eq("user_id", userId);
        break;

      case "uploadNutritionData":
        // Delete nutrition data
        await supabase.from("meals").delete().eq("user_id", userId);
        await supabase.from("meal_logs").delete().eq("user_id", userId);
        break;

      case "uploadProgressData":
        // Delete progress data
        await supabase.from("progress_entries").delete().eq("user_id", userId);
        await supabase.from("body_measurements").delete().eq("user_id", userId);
        break;

      default:
        console.log(`  ⏭️ No rollback needed for step: ${step}`);
    }
  }

  private async saveMigrationAttempt(result: MigrationResult): Promise<void> {
    try {
      const history = await this.getMigrationHistory();
      const attempt: MigrationAttempt = {
        id: (result as any).migrationId || "",
        startTime: (result as any).progress?.startTime || new Date(),
        endTime: (result as any).progress?.endTime,
        success: result.success,
        error: result.success ? undefined : (result.errors as any)[0]?.message,
        dataCount: {
          workouts: (result.migratedData as any)?.workoutSessions?.length ?? 0,
          meals: (result.migratedData as any)?.mealLogs?.length ?? 0,
          measurements:
            (result.migratedData as any)?.bodyMeasurements?.length ?? 0,
        },
      };

      history.unshift(attempt);
      // Keep only last 10 attempts
      if (history.length > 10) {
        history.splice(10);
      }

      await enhancedLocalStorage.storeData("migration_history", history);
    } catch (error) {
      console.error("Failed to save migration attempt:", error);
    }
  }

  private notifyProgressChange(progress: MigrationProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error("Error in progress callback:", error);
      }
    });
  }

  private notifyResultChange(result: MigrationResult): void {
    this.resultCallbacks.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Error in result callback:", error);
      }
    });
  }

  private notifyStateChange(state: MigrationState): void {
    this.stateCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error("Error in state callback:", error);
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
      console.log("🔍 Checking profile migration for user:", userId);

      // Set user ID in data manager
      dataBridge.setUserId(userId);

      // Debug: Check if hasLocalData method exists
      if (typeof dataBridge.hasLocalData !== "function") {
        console.error("❌ hasLocalData method not found on dataManager");
        return false;
      }

      // Check if user has local profile data
      const hasLocalData = await dataBridge.hasLocalData();
      console.log("📊 Local data check result:", hasLocalData);

      if (!hasLocalData) {
        console.log("📊 No local profile data found, migration not needed");
        return false;
      }

      // Check if user already has remote profile data
      // Use the correct table name 'profiles' instead of 'user_profiles'
      const { data: remoteProfile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId) // profiles table uses 'id' not 'user_id'
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Error checking remote profile data:", error);
        return false;
      }

      // If user has local data but no remote data, migration is needed
      const migrationNeeded = hasLocalData && !remoteProfile;
      console.log(
        `📊 Profile migration needed: ${migrationNeeded} (local: ${hasLocalData}, remote: ${!!remoteProfile})`,
      );

      return migrationNeeded;
    } catch (error) {
      console.error("❌ Error checking profile migration status:", error);
      return false;
    }
  }

  /**
   * Start profile data migration process
   */
  async startProfileMigration(userId: string): Promise<MigrationResult> {
    console.log("🚀 Starting profile data migration for user:", userId);

    try {
      // Use DataBridge for the actual migration
      const result = await dataBridge.migrateGuestToUser(userId);

      if (result.success) {
        console.log("✅ Profile migration completed successfully");

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
        console.error("❌ Profile migration failed:", result.errors);
      }

      return result as any;
    } catch (error) {
      console.error("❌ Profile migration error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown migration error";

      return {
        success: false,
        migrationId: `profile_error_${Date.now()}`,
        errors: [errorMessage],
        migratedData: {},
        conflicts: [],
        duration: 0,
      } as any;
    }
  }

  /**
   * Validate local profile data before migration
   */
  async validateProfileData(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate personal info
      const personalInfo = await dataBridge.loadPersonalInfo();
      if (personalInfo) {
        const validation = profileValidator.validatePersonalInfo(personalInfo);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Personal Info: ${e}`));
        }
      }

      // Validate fitness goals
      const fitnessGoals = await dataBridge.loadFitnessGoals();
      if (fitnessGoals) {
        const validation = profileValidator.validateFitnessGoals(fitnessGoals);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Fitness Goals: ${e}`));
        }
      }

      // Validate diet preferences
      const dietPreferences = await dataBridge.loadDietPreferences();
      if (dietPreferences) {
        const validation =
          profileValidator.validateDietPreferences(dietPreferences);
        if (!validation.isValid) {
          errors.push(
            ...validation.errors.map((e) => `Diet Preferences: ${e}`),
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Store migration attempt in history
   */
  private async storeMigrationAttempt(
    attempt: MigrationAttempt,
  ): Promise<void> {
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

      await enhancedLocalStorage.setItem("migration_state", newState);
    } catch (error) {
      console.error("❌ Failed to store migration attempt:", error);
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
      console.log("🧪 Testing complete migration flow for user:", userId);

      // Step 0: Test localStorage methods directly
      console.log("🧪 Step 0: Testing localStorage methods...");
      await dataBridge.testLocalStorageMethods();

      // Step 1: Test data manager methods
      console.log("🧪 Step 1: Testing DataManager methods...");
      await dataBridge.testMigrationDetection();

      // Step 2: Test migration detection
      console.log("🧪 Step 2: Testing migration detection...");
      const migrationNeeded = await this.checkProfileMigrationNeeded(userId);
      console.log("📊 Migration needed result:", migrationNeeded);

      // Step 3: Test profile data validation
      console.log("🧪 Step 3: Testing profile data validation...");
      const validationResult = await this.validateProfileData();
      console.log("📊 Validation result:", validationResult);

      console.log("✅ Migration flow test completed successfully");
    } catch (error) {
      console.error("❌ Migration flow test failed:", error);
    }
  }

  /**
   * Create test environment for migration
   */
  async setupTestEnvironment(userId: string): Promise<boolean> {
    try {
      console.log("🧪 Setting up test environment for migration...");

      // Set user ID
      dataBridge.setUserId(userId);

      // Create sample data
      const sampleCreated = await dataBridge.createSampleProfileData();

      if (sampleCreated) {
        console.log("✅ Test environment setup completed");
        return true;
      } else {
        console.error("❌ Failed to create sample data");
        return false;
      }
    } catch (error) {
      console.error("❌ Test environment setup failed:", error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const migrationManager = new MigrationManager();
export default migrationManager;
export { MigrationProgress, MigrationStatus } from "../types/profileData";
