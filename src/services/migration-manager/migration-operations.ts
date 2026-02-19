import migrationEngine from "../migration";
import { checkpointManager } from "./checkpoint-manager";
import { backupManager } from "./backup-manager";
import { MigrationResult, MigrationProgress, CurrentMigration } from "./types";

export class MigrationOperations {
  private currentMigration: CurrentMigration;
  private progressCallbacks: ((progress: MigrationProgress) => void)[];
  private resultCallbacks: ((result: MigrationResult) => void)[];

  constructor(
    currentMigration: CurrentMigration,
    progressCallbacks: ((progress: MigrationProgress) => void)[],
    resultCallbacks: ((result: MigrationResult) => void)[],
  ) {
    this.currentMigration = currentMigration;
    this.progressCallbacks = progressCallbacks;
    this.resultCallbacks = resultCallbacks;
  }

  async resumeMigration(
    userId: string,
    saveMigrationAttempt: (result: MigrationResult) => Promise<void>,
    checkMigrationStatus: () => Promise<any>,
  ): Promise<MigrationResult> {
    console.log("🔄 Attempting to resume interrupted migration...");

    const checkpoint = await checkpointManager.loadCheckpoint();
    if (!checkpoint) {
      return {
        success: false,
        migrationId: `resume_failed_${Date.now()}`,
        errors: [
          {
            step: "resume",
            code: "NO_CHECKPOINT",
            message: "No checkpoint found to resume from",
            timestamp: new Date(),
            retryCount: 0,
            recoverable: false,
          },
        ],
        warnings: [],
        duration: 0,
        progress: {
          migrationId: `resume_failed_${Date.now()}`,
          status: "failed",
          currentStep: "resume",
          currentStepIndex: 0,
          totalSteps: 0,
          percentage: 0,
          startTime: new Date(),
          message: "No checkpoint found",
          errors: [],
          warnings: [],
        },
        migratedDataCount: {
          userProfiles: 0,
          workoutSessions: 0,
          mealLogs: 0,
          bodyMeasurements: 0,
          achievements: 0,
        },
      };
    }

    if (checkpoint.userId !== userId) {
      return this.createErrorResult(
        checkpoint.migrationId,
        "Checkpoint belongs to a different user",
      );
    }

    if (
      checkpoint.status !== "in_progress" &&
      checkpoint.status !== "interrupted"
    ) {
      return this.createErrorResult(
        checkpoint.migrationId,
        `Cannot resume migration with status: ${checkpoint.status}`,
      );
    }

    console.log(
      `📍 Resuming from step ${checkpoint.currentStepIndex}: ${checkpoint.currentStepName}`,
    );
    console.log(
      `✅ Previously completed steps: ${checkpoint.completedSteps.join(", ")}`,
    );

    checkpoint.status = "in_progress";
    checkpoint.lastCheckpointTime = new Date().toISOString();
    await checkpointManager.saveCheckpoint(checkpoint);

    try {
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
          message: result.errors?.[0]?.message || "Unknown error during resume",
          timestamp: new Date().toISOString(),
        });
        await checkpointManager.saveCheckpoint(checkpoint);
      }

      this.currentMigration.result = result;
      this.notifyResultChange(result);
      await saveMigrationAttempt(result);
      await checkMigrationStatus();

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      checkpoint.status = "failed";
      checkpoint.errors.push({
        step: checkpoint.currentStepName,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      await checkpointManager.saveCheckpoint(checkpoint);

      return this.createErrorResult(
        checkpoint.migrationId,
        errorMessage,
        Date.now() - new Date(checkpoint.startTime).getTime(),
      );
    } finally {
      if (this.currentMigration.unsubscribe) {
        this.currentMigration.unsubscribe();
        this.currentMigration.unsubscribe = null;
      }
    }
  }

  async rollbackMigration(
    userId: string,
    checkMigrationStatus: () => Promise<any>,
  ): Promise<{ success: boolean; message: string }> {
    console.log("⏪ Rolling back migration...");

    const checkpoint = await checkpointManager.loadCheckpoint();

    try {
      const restored = await backupManager.restoreFromBackup();
      if (!restored) {
        console.warn("⚠️ No backup to restore, but continuing rollback");
      }

      if (checkpoint && checkpoint.completedSteps.length > 0) {
        console.log(
          `🗑️ Cleaning up ${checkpoint.completedSteps.length} completed steps from remote...`,
        );

        for (const step of checkpoint.completedSteps.reverse()) {
          try {
            await backupManager.rollbackStep(step, userId);
            console.log(`  ✅ Rolled back step: ${step}`);
          } catch (stepError) {
            console.error(`  ❌ Failed to rollback step ${step}:`, stepError);
          }
        }
      }

      if (checkpoint) {
        checkpoint.status = "rolled_back";
        checkpoint.lastCheckpointTime = new Date().toISOString();
        await checkpointManager.saveCheckpoint(checkpoint);
      }

      await checkpointManager.clearCheckpoint();
      await backupManager.clearBackup();

      this.currentMigration.progress = null;
      this.currentMigration.result = null;

      await checkMigrationStatus();

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

  private createErrorResult(
    migrationId: string,
    errorMessage: string,
    duration: number = 0,
  ): MigrationResult {
    return {
      success: false,
      migrationId,
      errors: [
        {
          step: "resume",
          code: "RESUME_ERROR",
          message: errorMessage,
          timestamp: new Date(),
          retryCount: 0,
          recoverable: true,
        },
      ],
      warnings: [],
      duration,
      progress: {
        migrationId,
        status: "failed",
        currentStep: "resume",
        currentStepIndex: 0,
        totalSteps: 0,
        percentage: 0,
        startTime: new Date(),
        message: errorMessage,
        errors: [
          {
            step: "resume",
            code: "RESUME_ERROR",
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
    };
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
}
