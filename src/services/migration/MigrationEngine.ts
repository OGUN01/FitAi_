import { validationService } from "../../utils/validation";
import { dataBridge } from "../DataBridge";
import {
  MigrationConfig,
  MigrationStep,
  MigrationContext,
  MigrationProgress,
  MigrationResult,
  MigrationError,
  LocalStorageSchema,
} from "./types";
import { DEFAULT_MIGRATION_CONFIG } from "./config";
import { createMigrationSteps } from "./steps";
import {
  generateMigrationId,
  sleep,
  createBackup,
  cleanupBackup,
} from "./helpers";

export class MigrationEngine {
  private config: MigrationConfig;
  private steps: MigrationStep[] = [];
  private progressCallbacks: ((progress: MigrationProgress) => void)[] = [];
  private currentMigration: MigrationContext | null = null;

  constructor(config?: Partial<MigrationConfig>) {
    this.config = {
      ...DEFAULT_MIGRATION_CONFIG,
      ...config,
    };

    this.steps = createMigrationSteps();
  }

  async migrateToSupabase(userId: string): Promise<MigrationResult> {
    const migrationId = generateMigrationId();
    const startTime = new Date();

    try {
      const context: MigrationContext = {
        migrationId,
        userId,
        startTime,
        currentStep: "",
        completedSteps: [],
        failedSteps: [],
        uploadedData: {},
        errors: [],
        warnings: [],
      };

      this.currentMigration = context;

      const localData = await dataBridge.exportAllData();
      if (!localData) {
        throw new Error("No local data found to migrate");
      }

      if (this.config.backupEnabled) {
        context.backupData = localData;
        await createBackup(migrationId, localData);
      }

      if (this.config.validateBeforeMigration) {
        const validation =
          validationService.validateLocalStorageSchema(localData);
        if (!validation.isValid) {
          throw new Error(
            `Data validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
          );
        }
        context.warnings.push(...validation.warnings.map((w) => w.message));
      }

      await this.executeMigrationSteps(context, localData);

      const result: MigrationResult = {
        success: true,
        migrationId,
        progress: this.createProgressUpdate(
          context,
          "completed",
          "Migration completed successfully",
        ),
        migratedDataCount: this.calculateMigratedDataCount(context),
        errors: context.errors,
        warnings: context.warnings,
        duration: Date.now() - startTime.getTime(),
      };

      if (this.config.cleanupAfterSuccess) {
        await this.cleanupAfterSuccess(context);
      }

      return result;
    } catch (error) {
      return this.handleMigrationFailure(migrationId, startTime, error);
    } finally {
      this.currentMigration = null;
    }
  }

  async resumeMigration(migrationId: string): Promise<MigrationResult> {
    throw new Error("Resume migration not yet implemented");
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    throw new Error("Rollback migration not yet implemented");
  }

  getMigrationStatus(): MigrationProgress | null {
    if (!this.currentMigration) {
      return null;
    }

    return this.createProgressUpdate(
      this.currentMigration,
      "running",
      `Executing step: ${this.currentMigration.currentStep}`,
    );
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

  private async executeMigrationSteps(
    context: MigrationContext,
    localData: LocalStorageSchema,
  ): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      context.currentStep = step.name;

      this.notifyProgress(context, "running", `Executing ${step.description}`);

      try {
        await this.executeStepWithRetry(step, localData, context);
        context.completedSteps.push(step.name);
      } catch (error) {
        context.failedSteps.push(step.name);

        if (step.critical) {
          throw error;
        } else {
          context.warnings.push(
            `Non-critical step failed: ${step.name} - ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    }
  }

  private async executeStepWithRetry(
    step: MigrationStep,
    data: any,
    context: MigrationContext,
  ): Promise<void> {
    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= this.config.maxRetries) {
      try {
        await step.handler(data, context);
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        const migrationError: MigrationError = {
          step: step.name,
          code: (error instanceof Error && 'code' in error ? (error as Error & { code?: string }).code : undefined) || "UNKNOWN_ERROR",
          message: error instanceof Error ? error.message : String(error),
          details: error,
          timestamp: new Date(),
          retryCount,
          recoverable: step.retryable && retryCount <= this.config.maxRetries,
        };

        context.errors.push(migrationError);

        if (!step.retryable || retryCount > this.config.maxRetries) {
          throw error;
        }

        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(2, retryCount - 1),
          this.config.maxRetryDelayMs,
        );
        await sleep(delay);
      }
    }

    throw lastError;
  }

  private async cleanupAfterSuccess(context: MigrationContext): Promise<void> {
    try {
      await cleanupBackup(context.migrationId);
    } catch (error) {
      context.warnings.push(
        `Failed to cleanup backup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private handleMigrationFailure(
    migrationId: string,
    startTime: Date,
    error: any,
  ): MigrationResult {
    const migrationError: MigrationError = {
      step: this.currentMigration?.currentStep || "unknown",
      code: error.code || "MIGRATION_FAILED",
      message: error.message || "Unknown migration error",
      details: error,
      timestamp: new Date(),
      retryCount: 0,
      recoverable: false,
    };

    return {
      success: false,
      migrationId,
      progress: {
        migrationId,
        status: "failed",
        currentStep: this.currentMigration?.currentStep || "unknown",
        currentStepIndex: this.currentMigration?.completedSteps.length || 0,
        totalSteps: this.steps.length,
        percentage: 0,
        startTime,
        endTime: new Date(),
        message: `Migration failed: ${error.message}`,
        errors: [migrationError],
        warnings: this.currentMigration?.warnings || [],
      },
      migratedDataCount: {
        userProfiles: 0,
        workoutSessions: 0,
        mealLogs: 0,
        bodyMeasurements: 0,
        achievements: 0,
      },
      errors: [migrationError],
      warnings: this.currentMigration?.warnings || [],
      duration: Date.now() - startTime.getTime(),
    };
  }

  private calculateMigratedDataCount(
    context: MigrationContext,
  ): MigrationResult["migratedDataCount"] {
    return {
      userProfiles: context.uploadedData.user ? 1 : 0,
      workoutSessions: context.uploadedData.fitness?.sessions?.length || 0,
      mealLogs: context.uploadedData.nutrition?.logs?.length || 0,
      bodyMeasurements:
        context.uploadedData.progress?.measurements?.length || 0,
      achievements: context.uploadedData.progress?.achievements?.length || 0,
    };
  }

  private createProgressUpdate(
    context: MigrationContext,
    status: MigrationProgress["status"],
    message: string,
  ): MigrationProgress {
    const currentStepIndex = context.completedSteps.length;
    const percentage = Math.round((currentStepIndex / this.steps.length) * 100);

    return {
      migrationId: context.migrationId,
      status,
      currentStep: context.currentStep,
      currentStepIndex,
      totalSteps: this.steps.length,
      percentage,
      startTime: context.startTime,
      endTime:
        status === "completed" || status === "failed" ? new Date() : undefined,
      message,
      errors: context.errors,
      warnings: context.warnings,
    };
  }

  private notifyProgress(
    context: MigrationContext,
    status: MigrationProgress["status"],
    message: string,
  ): void {
    const progress = this.createProgressUpdate(context, status, message);
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error("Error in progress callback:", error);
      }
    });
  }
}
