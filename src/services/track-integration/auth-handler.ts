import { migrationManager } from "../migrationManager";
import { dataBridge } from "../DataBridge";
import { enhancedLocalStorage } from "../localStorage";
import { backupRecoveryService } from "../backupRecoveryService";
import { TrackAAuthData, IntegrationStatus, IntegrationConfig } from "./types";

export class AuthHandler {
  private config: IntegrationConfig;
  private updateStatusCallback?: (updates: Partial<IntegrationStatus>) => void;
  private emitEventCallback?: (event: any) => void;
  private logCallback?: (message: string, ...args: any[]) => void;
  private startMigrationFlowCallback?: (userId: string) => Promise<void>;
  private startSyncServicesCallback?: () => Promise<void>;
  private startBackupServicesCallback?: () => Promise<void>;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  setCallbacks(
    updateStatus: (updates: Partial<IntegrationStatus>) => void,
    emitEvent: (event: any) => void,
    log: (message: string, ...args: any[]) => void,
    startMigrationFlow: (userId: string) => Promise<void>,
    startSyncServices: () => Promise<void>,
    startBackupServices: () => Promise<void>,
  ): void {
    this.updateStatusCallback = updateStatus;
    this.emitEventCallback = emitEvent;
    this.logCallback = log;
    this.startMigrationFlowCallback = startMigrationFlow;
    this.startSyncServicesCallback = startSyncServices;
    this.startBackupServicesCallback = startBackupServices;
  }

  async handleAuthentication(authData: TrackAAuthData): Promise<void> {
    try {
      this.log("Handling Track A authentication for user:", authData.userId);

      this.updateStatus({ trackAConnected: true });

      this.emitEvent({
        type: "auth_success",
        timestamp: new Date(),
        data: { userId: authData.userId, email: authData.email },
        source: "track_a",
      });

      await this.storeAuthData(authData);

      const migrationStatus = await migrationManager.checkMigrationStatus();

      if (migrationStatus.hasLocalData && this.config.autoMigrateOnAuth) {
        this.log("Starting automatic migration after authentication");
        await this.startMigrationFlow(authData.userId);
      } else if (!migrationStatus.hasLocalData) {
        this.log("No local data found, setting up for new user");
        await this.setupNewUser(authData);
      }

      if (this.config.enableBackgroundSync) {
        await this.startSyncServices();
      }

      if (this.config.enableAutoBackup) {
        await this.startBackupServices();
      }
    } catch (error) {
      this.log("Failed to handle Track A authentication:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.emitEvent({
        type: "auth_failure",
        timestamp: new Date(),
        data: { error: errorMessage },
        source: "track_a",
      });
      throw error;
    }
  }

  private async setupNewUser(authData: TrackAAuthData): Promise<void> {
    try {
      this.log("Setting up new user:", authData.userId);

      if (authData.onboardingData) {
        await dataBridge.storeOnboardingData(authData.onboardingData);
      }

      if (this.config.enableAutoBackup) {
        await backupRecoveryService.createBackup(
          "full",
          "Initial user setup backup",
        );
      }

      this.log("New user setup completed");
    } catch (error) {
      this.log("Failed to setup new user:", error);
      throw error;
    }
  }

  private async storeAuthData(authData: TrackAAuthData): Promise<void> {
    try {
      await enhancedLocalStorage.storeData("track_a_auth", {
        userId: authData.userId,
        email: authData.email,
        sessionId: authData.sessionId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.log("Failed to store auth data:", error);
    }
  }

  private updateStatus(updates: Partial<IntegrationStatus>): void {
    this.updateStatusCallback?.(updates);
  }

  private emitEvent(event: any): void {
    this.emitEventCallback?.(event);
  }

  private log(message: string, ...args: any[]): void {
    this.logCallback?.(message, ...args);
  }

  private async startMigrationFlow(userId: string): Promise<void> {
    await this.startMigrationFlowCallback?.(userId);
  }

  private async startSyncServices(): Promise<void> {
    await this.startSyncServicesCallback?.();
  }

  private async startBackupServices(): Promise<void> {
    await this.startBackupServicesCallback?.();
  }
}
