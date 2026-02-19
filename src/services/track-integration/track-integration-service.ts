import { enhancedLocalStorage } from "../localStorage";
import {
  TrackAAuthData,
  IntegrationConfig,
  IntegrationStatus,
  IntegrationEvent,
  ServiceType,
  ServiceStatus,
} from "./types";
import { ServiceManager } from "./service-manager";
import { AuthHandler } from "./auth-handler";
import { MigrationHandler } from "./migration-handler";
import { EventSystem } from "./event-system";

export class TrackIntegrationService {
  private config: IntegrationConfig;
  private status: IntegrationStatus;
  private isInitialized = false;

  private serviceManager: ServiceManager;
  private authHandler: AuthHandler;
  private migrationHandler: MigrationHandler;
  private eventSystem: EventSystem;

  constructor(config?: Partial<IntegrationConfig>) {
    this.config = {
      autoMigrateOnAuth: true,
      autoSyncAfterMigration: true,
      enableBackgroundSync: true,
      enableAutoBackup: true,
      trackCIntegrationEnabled: true,
      debugMode: false,
      ...config,
    };

    this.status = {
      isInitialized: false,
      trackAConnected: false,
      trackCConnected: false,
      migrationCompleted: false,
      syncActive: false,
      backupActive: false,
      lastIntegrationCheck: null,
      services: {
        migration: "inactive",
        sync: "inactive",
        backup: "inactive",
        monitoring: "inactive",
        scheduler: "inactive",
      },
    };

    this.serviceManager = new ServiceManager();
    this.authHandler = new AuthHandler(this.config);
    this.migrationHandler = new MigrationHandler(this.config);
    this.eventSystem = new EventSystem();

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.serviceManager.setCallbacks(
      this.updateStatus.bind(this),
      this.updateServiceStatus.bind(this),
      this.log.bind(this),
    );

    this.authHandler.setCallbacks(
      this.updateStatus.bind(this),
      this.emitEvent.bind(this),
      this.log.bind(this),
      this.startMigrationFlow.bind(this),
      this.startSyncServices.bind(this),
      this.startBackupServices.bind(this),
    );

    this.migrationHandler.setCallbacks(
      this.updateStatus.bind(this),
      this.emitEvent.bind(this),
      this.log.bind(this),
      this.startSyncServices.bind(this),
    );
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.log("Initializing Track B integration...");

      await this.serviceManager.initialize();
      this.eventSystem.setupServiceListeners(this.emitEvent.bind(this));
      await this.loadIntegrationState();

      this.updateStatus({
        isInitialized: true,
        lastIntegrationCheck: new Date(),
      });

      this.isInitialized = true;
      this.log("Track B integration initialized successfully");

      this.emitEvent({
        type: "migration_start",
        timestamp: new Date(),
        data: { message: "Track B integration initialized" },
        source: "track_b",
      });
    } catch (error) {
      this.log("Failed to initialize Track B integration:", error);
      throw error;
    }
  }

  async handleTrackAAuthentication(authData: TrackAAuthData): Promise<void> {
    return this.authHandler.handleAuthentication(authData);
  }

  async startMigrationFlow(userId: string): Promise<void> {
    return this.migrationHandler.startMigrationFlow(userId);
  }

  async startSyncServices(): Promise<void> {
    await this.serviceManager.startSyncServices();

    this.emitEvent({
      type: "sync_start",
      timestamp: new Date(),
      data: { message: "Sync services started" },
      source: "track_b",
    });

    this.log("Sync services started successfully");
  }

  async startBackupServices(): Promise<void> {
    await this.serviceManager.startBackupServices();

    this.emitEvent({
      type: "backup_complete",
      timestamp: new Date(),
      data: { type: "initial" },
      source: "track_b",
    });

    this.log("Backup services started successfully");
  }

  getStatus(): IntegrationStatus {
    return { ...this.status };
  }

  async getServiceHealth(): Promise<Record<string, any>> {
    return this.serviceManager.getServiceHealth();
  }

  async stop(): Promise<void> {
    try {
      this.log("Stopping Track B integration...");

      await this.serviceManager.stopAllServices();
      await this.saveIntegrationState();

      this.isInitialized = false;
      this.log("Track B integration stopped");
    } catch (error) {
      this.log("Failed to stop Track B integration:", error);
      throw error;
    }
  }

  onEvent(callback: (event: IntegrationEvent) => void): () => void {
    return this.eventSystem.onEvent(callback);
  }

  onStatusChange(callback: (status: IntegrationStatus) => void): () => void {
    return this.eventSystem.onStatusChange(callback);
  }

  private updateStatus(updates: Partial<IntegrationStatus>): void {
    this.status = { ...this.status, ...updates };
    this.eventSystem.notifyStatusCallbacks(this.status, this.log.bind(this));
  }

  private updateServiceStatus(
    service: ServiceType,
    status: ServiceStatus,
  ): void {
    this.status.services[service] = status;
    this.eventSystem.notifyStatusCallbacks(this.status, this.log.bind(this));
  }

  private emitEvent(event: IntegrationEvent): void {
    this.eventSystem.emitEvent(event, this.log.bind(this));
  }

  private async loadIntegrationState(): Promise<void> {
    try {
      const savedState =
        await enhancedLocalStorage.getData<Partial<IntegrationStatus>>(
          "integration_state",
        );
      if (savedState) {
        this.status = { ...this.status, ...savedState };
      }
    } catch (error) {
      this.log("Failed to load integration state:", error);
    }
  }

  private async saveIntegrationState(): Promise<void> {
    try {
      await enhancedLocalStorage.storeData("integration_state", this.status);
    } catch (error) {
      this.log("Failed to save integration state:", error);
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.debugMode) {
      console.log(`[TrackIntegration] ${message}`, ...args);
    }
  }
}

export const trackIntegrationService = new TrackIntegrationService();
export default trackIntegrationService;
