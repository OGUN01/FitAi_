import { migrationManager } from "../migrationManager";
import { backupRecoveryService } from "../backupRecoveryService";
import { IntegrationEvent, IntegrationStatus } from "./types";

export class EventSystem {
  private eventCallbacks: ((event: IntegrationEvent) => void)[] = [];
  private statusCallbacks: ((status: IntegrationStatus) => void)[] = [];

  setupServiceListeners(emitEvent: (event: IntegrationEvent) => void): void {
    migrationManager.onProgress((progress) => {
      emitEvent({
        type: "migration_start",
        timestamp: new Date(),
        data: { progress },
        source: "track_b",
      });
    });

    migrationManager.onResult((result) => {
      emitEvent({
        type: result.success ? "migration_complete" : "error",
        timestamp: new Date(),
        data: { result },
        source: "track_b",
      });
    });

    backupRecoveryService.onBackupResult((result) => {
      emitEvent({
        type: result.success ? "backup_complete" : "error",
        timestamp: new Date(),
        data: { result },
        source: "track_b",
      });
    });
  }

  onEvent(callback: (event: IntegrationEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  onStatusChange(callback: (status: IntegrationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  emitEvent(
    event: IntegrationEvent,
    log: (message: string, ...args: any[]) => void,
  ): void {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        log("Error in event callback:", error);
      }
    });
  }

  notifyStatusCallbacks(
    status: IntegrationStatus,
    log: (message: string, ...args: any[]) => void,
  ): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        log("Error in status callback:", error);
      }
    });
  }
}
