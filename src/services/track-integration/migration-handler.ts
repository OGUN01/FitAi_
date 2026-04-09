import { migrationManager } from "../migrationManager";
import { IntegrationConfig } from "./types";

export class MigrationHandler {
  private config: IntegrationConfig;
  private updateStatusCallback?: (updates: any) => void;
  private emitEventCallback?: (event: any) => void;
  private logCallback?: (message: string, ...args: any[]) => void;
  private startSyncServicesCallback?: () => Promise<void>;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  setCallbacks(
    updateStatus: (updates: any) => void,
    emitEvent: (event: any) => void,
    log: (message: string, ...args: any[]) => void,
    startSyncServices: () => Promise<void>,
  ): void {
    this.updateStatusCallback = updateStatus;
    this.emitEventCallback = emitEvent;
    this.logCallback = log;
    this.startSyncServicesCallback = startSyncServices;
  }

  async startMigrationFlow(userId: string): Promise<void> {
    try {
      this.log("Starting migration flow for user:", userId);

      this.emitEvent({
        type: "migration_start",
        timestamp: new Date(),
        data: { userId },
        source: "track_b",
      });

      const result = await migrationManager.startMigration(userId);

      if (result && result.success) {
        this.updateStatus({ migrationCompleted: true });

        this.emitEvent({
          type: "migration_complete",
          timestamp: new Date(),
          data: { result },
          source: "track_b",
        });

        if (this.config.autoSyncAfterMigration) {
          await this.startSyncServices();
        }

        this.log("Migration completed successfully");
      } else {
        throw new Error(
          `Migration failed: ${(result as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      this.log("Migration flow failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.emitEvent({
        type: "error",
        timestamp: new Date(),
        data: { error: errorMessage, context: "migration" },
        source: "track_b",
      });
      throw error;
    }
  }

  private updateStatus(updates: any): void {
    this.updateStatusCallback?.(updates);
  }

  private emitEvent(event: any): void {
    this.emitEventCallback?.(event);
  }

  private log(message: string, ...args: any[]): void {
    this.logCallback?.(message, ...args);
  }

  private async startSyncServices(): Promise<void> {
    await this.startSyncServicesCallback?.();
  }
}
