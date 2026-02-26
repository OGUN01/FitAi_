import migrationEngine from "../migration";
import { dataBridge } from "../DataBridge";
import {
  MigrationManagerConfig,
  MigrationState,
  MigrationAttempt,
  MigrationCheckpoint,
  CurrentMigration,
  MigrationProgress,
  MigrationResult,
} from "./types";
import { checkpointManager } from "./checkpoint-manager";
import { backupManager } from "./backup-manager";
import { profileMigration } from "./profile-migration";
import { MigrationOperations } from "./migration-operations";
import {
  hasLocalDataToMigrate,
  getMigrationHistory,
  saveMigrationAttemptToHistory,
} from "./helpers";

export class MigrationManager {
  private config: MigrationManagerConfig;
  private currentMigration: CurrentMigration = {
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

  async checkMigrationStatus(): Promise<MigrationState> {
    try {
      const hasLocalData = await hasLocalDataToMigrate();
      const migrationHistory = await getMigrationHistory();
      const lastAttempt = migrationHistory[0] || null;
      const checkpoint = await checkpointManager.loadCheckpoint();

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

  async startMigration(userId: string): Promise<MigrationResult> {
    if (this.currentMigration.progress?.status === "running") {
      throw new Error("Migration is already in progress");
    }

    const migrationId = `migration_${Date.now()}`;
    const startTime = new Date().toISOString();

    try {
      const backupCreated = await backupManager.createMigrationBackup();

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
      await checkpointManager.saveCheckpoint(checkpoint);

      this.currentMigration.unsubscribe = migrationEngine.onProgress(
        async (progress: MigrationProgress) => {
          this.currentMigration.progress = progress;
          this.notifyProgressChange(progress);

          if (progress.status === "running") {
            checkpoint.currentStepIndex = progress.currentStepIndex;
            checkpoint.currentStepName = progress.currentStep;
            checkpoint.lastCheckpointTime = new Date().toISOString();
            await checkpointManager.saveCheckpoint(checkpoint);
          }
        },
      );

      const result = await migrationEngine.migrateToSupabase(userId);

      if (result.success) {
        await checkpointManager.clearCheckpoint();
        await backupManager.clearBackup();
      } else {
        checkpoint.status = "failed";
        checkpoint.errors.push({
          step: checkpoint.currentStepName,
          message: result.errors?.[0]?.message || "Unknown error",
          timestamp: new Date().toISOString(),
        });
        await checkpointManager.saveCheckpoint(checkpoint);
      }

      this.currentMigration.result = result;
      this.notifyResultChange(result);

      await saveMigrationAttemptToHistory(result);

      await this.checkMigrationStatus();

      return result;
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
        duration: 0,
        migratedData: {
          workoutSessions: [],
          mealLogs: [],
          bodyMeasurements: [],
        },
      };

      this.currentMigration.result = errorResult;
      this.notifyResultChange(errorResult);
      await saveMigrationAttemptToHistory(errorResult);

      return errorResult;
    } finally {
      if (this.currentMigration.unsubscribe) {
        this.currentMigration.unsubscribe();
        this.currentMigration.unsubscribe = null;
      }
    }
  }

  async cancelMigration(): Promise<void> {
    if (!this.config.allowUserCancel) {
      throw new Error("Migration cancellation is not allowed");
    }

    if (this.currentMigration.progress?.status !== "running") {
      return;
    }

    try {

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

  getCurrentProgress(): MigrationProgress | null {
    return this.currentMigration.progress;
  }

  getCurrentResult(): MigrationResult | null {
    return this.currentMigration.result;
  }

  clearMigrationState(): void {
    this.currentMigration.progress = null;
    this.currentMigration.result = null;
  }

  onProgress(callback: (progress: MigrationProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  onResult(callback: (result: MigrationResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      const index = this.resultCallbacks.indexOf(callback);
      if (index > -1) {
        this.resultCallbacks.splice(index, 1);
      }
    };
  }

  onStateChange(callback: (state: MigrationState) => void): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      const index = this.stateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateCallbacks.splice(index, 1);
      }
    };
  }

  setProgressCallback(callback: (progress: MigrationProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  async getState(): Promise<MigrationState> {
    return await this.checkMigrationStatus();
  }

  async resumeMigration(userId: string): Promise<MigrationResult> {
    const operations = new MigrationOperations(
      this.currentMigration,
      this.progressCallbacks,
      this.resultCallbacks,
    );
    return operations.resumeMigration(
      userId,
      saveMigrationAttemptToHistory,
      this.checkMigrationStatus.bind(this),
    );
  }

  async rollbackMigration(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const operations = new MigrationOperations(
      this.currentMigration,
      this.progressCallbacks,
      this.resultCallbacks,
    );
    return operations.rollbackMigration(
      userId,
      this.checkMigrationStatus.bind(this),
    );
  }

  async checkProfileMigrationNeeded(userId: string): Promise<boolean> {
    return profileMigration.checkProfileMigrationNeeded(userId);
  }

  async startProfileMigration(userId: string): Promise<MigrationResult> {
    return profileMigration.startProfileMigration(userId);
  }

  async validateProfileData(): Promise<{ isValid: boolean; errors: string[] }> {
    return profileMigration.validateProfileData();
  }

  async testMigrationFlow(userId: string): Promise<void> {
    return profileMigration.testMigrationFlow(userId);
  }

  async setupTestEnvironment(userId: string): Promise<boolean> {
    return profileMigration.setupTestEnvironment(userId);
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
}

export const migrationManager = new MigrationManager();
