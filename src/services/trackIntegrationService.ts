// Track Integration Service for Track B Infrastructure
// Provides seamless integration with Track A authentication and Track C features

import { migrationEngine } from "./migration";
import { migrationManager } from "./migrationManager";
import { realTimeSyncService } from "./syncService";
import { syncMonitoringService } from "./syncMonitoring";
import { intelligentSyncScheduler } from "./intelligentSyncScheduler";
import { backupRecoveryService } from "./backupRecoveryService";
import { dataBridge } from "./DataBridge";
import { enhancedLocalStorage } from "./localStorage";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TrackAAuthData {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  userProfile: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  onboardingData: {
    personalInfo: any;
    fitnessGoals: any;
    dietPreferences: any;
    workoutPreferences: any;
    bodyAnalysis: any;
  };
}

export interface IntegrationConfig {
  autoMigrateOnAuth: boolean;
  autoSyncAfterMigration: boolean;
  enableBackgroundSync: boolean;
  enableAutoBackup: boolean;
  trackCIntegrationEnabled: boolean;
  debugMode: boolean;
}

export interface IntegrationStatus {
  isInitialized: boolean;
  trackAConnected: boolean;
  trackCConnected: boolean;
  migrationCompleted: boolean;
  syncActive: boolean;
  backupActive: boolean;
  lastIntegrationCheck: Date | null;
  services: {
    migration: "active" | "inactive" | "error";
    sync: "active" | "inactive" | "error";
    backup: "active" | "inactive" | "error";
    monitoring: "active" | "inactive" | "error";
    scheduler: "active" | "inactive" | "error";
  };
}

export interface IntegrationEvent {
  type:
    | "auth_success"
    | "auth_failure"
    | "migration_start"
    | "migration_complete"
    | "sync_start"
    | "sync_complete"
    | "backup_complete"
    | "error";
  timestamp: Date;
  data: any;
  source: "track_a" | "track_b" | "track_c";
}

// ============================================================================
// TRACK INTEGRATION SERVICE
// ============================================================================

export class TrackIntegrationService {
  private config: IntegrationConfig;
  private status: IntegrationStatus;
  private isInitialized = false;
  private eventCallbacks: ((event: IntegrationEvent) => void)[] = [];
  private statusCallbacks: ((status: IntegrationStatus) => void)[] = [];

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
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Initialize Track B integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.log("Initializing Track B integration...");

      // Initialize all Track B services
      await this.initializeServices();

      // Set up service event listeners
      this.setupServiceListeners();

      // Load previous integration state
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

  /**
   * Handle Track A authentication success
   */
  async handleTrackAAuthentication(authData: TrackAAuthData): Promise<void> {
    try {
      this.log("Handling Track A authentication for user:", authData.userId);

      this.updateStatus({ trackAConnected: true });

      this.emitEvent({
        type: "auth_success",
        timestamp: new Date(),
        data: { userId: authData.userId, email: authData.email },
        source: "track_a",
      });

      // Store authentication data
      await this.storeAuthData(authData);

      // Check if migration is needed
      const migrationStatus = await migrationManager.checkMigrationStatus();

      if (migrationStatus.hasLocalData && this.config.autoMigrateOnAuth) {
        this.log("Starting automatic migration after authentication");
        await this.startMigrationFlow(authData.userId);
      } else if (!migrationStatus.hasLocalData) {
        this.log("No local data found, setting up for new user");
        await this.setupNewUser(authData);
      }

      // Start sync and backup services
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

  /**
   * Start migration flow
   */
  async startMigrationFlow(userId: string): Promise<void> {
    try {
      this.log("Starting migration flow for user:", userId);

      this.emitEvent({
        type: "migration_start",
        timestamp: new Date(),
        data: { userId },
        source: "track_b",
      });

      // Start migration
      const result = await migrationManager.startMigration(userId);

      if (result.success) {
        this.updateStatus({ migrationCompleted: true });

        this.emitEvent({
          type: "migration_complete",
          timestamp: new Date(),
          data: { result },
          source: "track_b",
        });

        // Start sync after successful migration
        if (this.config.autoSyncAfterMigration) {
          await this.startSyncServices();
        }

        this.log("Migration completed successfully");
      } else {
        throw new Error(`Migration failed: ${result.errors[0]?.message}`);
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

  /**
   * Start sync services
   */
  async startSyncServices(): Promise<void> {
    try {
      this.log("Starting sync services...");

      // Initialize sync service
      await realTimeSyncService.initialize();
      this.updateServiceStatus("sync", "active");

      // Start monitoring
      await syncMonitoringService.startMonitoring();
      this.updateServiceStatus("monitoring", "active");

      // Start intelligent scheduler
      await intelligentSyncScheduler.start();
      this.updateServiceStatus("scheduler", "active");

      this.updateStatus({ syncActive: true });

      this.emitEvent({
        type: "sync_start",
        timestamp: new Date(),
        data: { message: "Sync services started" },
        source: "track_b",
      });

      this.log("Sync services started successfully");
    } catch (error) {
      this.log("Failed to start sync services:", error);
      this.updateServiceStatus("sync", "error");
      throw error;
    }
  }

  /**
   * Start backup services
   */
  async startBackupServices(): Promise<void> {
    try {
      this.log("Starting backup services...");

      await backupRecoveryService.initialize();
      this.updateServiceStatus("backup", "active");
      this.updateStatus({ backupActive: true });

      // Create initial backup
      await backupRecoveryService.createBackup(
        "full",
        "Initial backup after authentication",
      );

      this.emitEvent({
        type: "backup_complete",
        timestamp: new Date(),
        data: { type: "initial" },
        source: "track_b",
      });

      this.log("Backup services started successfully");
    } catch (error) {
      this.log("Failed to start backup services:", error);
      this.updateServiceStatus("backup", "error");
      throw error;
    }
  }

  /**
   * Get integration status
   */
  getStatus(): IntegrationStatus {
    return { ...this.status };
  }

  /**
   * Get service health check
   */
  async getServiceHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    try {
      // Migration service health
      health.migration = {
        status: this.status.services.migration,
        lastMigration: migrationManager.getCurrentResult(),
      };

      // Sync service health
      health.sync = {
        status: this.status.services.sync,
        syncStatus: realTimeSyncService.getSyncStatus(),
        metrics: syncMonitoringService.getMetrics(),
      };

      // Backup service health
      health.backup = {
        status: this.status.services.backup,
        backupStatus: backupRecoveryService.getStatus(),
      };

      // Scheduler health
      health.scheduler = {
        status: this.status.services.scheduler,
        stats: intelligentSyncScheduler.getStats(),
      };
    } catch (error) {
      this.log("Failed to get service health:", error);
    }

    return health;
  }

  /**
   * Stop all services
   */
  async stop(): Promise<void> {
    try {
      this.log("Stopping Track B integration...");

      await realTimeSyncService.stop();
      await syncMonitoringService.stopMonitoring();
      await intelligentSyncScheduler.stop();
      await backupRecoveryService.stop();

      await this.saveIntegrationState();

      this.updateStatus({
        syncActive: false,
        backupActive: false,
        services: {
          migration: "inactive",
          sync: "inactive",
          backup: "inactive",
          monitoring: "inactive",
          scheduler: "inactive",
        },
      });

      this.isInitialized = false;
      this.log("Track B integration stopped");
    } catch (error) {
      this.log("Failed to stop Track B integration:", error);
      throw error;
    }
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to integration events
   */
  onEvent(callback: (event: IntegrationEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(callback: (status: IntegrationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async initializeServices(): Promise<void> {
    try {
      // Initialize migration manager
      await migrationManager.checkMigrationStatus();
      this.updateServiceStatus("migration", "active");

      this.log("All Track B services initialized");
    } catch (error) {
      this.log("Failed to initialize services:", error);
      throw error;
    }
  }

  private setupServiceListeners(): void {
    // Migration events
    migrationManager.onProgress((progress) => {
      this.emitEvent({
        type: "migration_start",
        timestamp: new Date(),
        data: { progress },
        source: "track_b",
      });
    });

    migrationManager.onResult((result) => {
      this.emitEvent({
        type: result.success ? "migration_complete" : "error",
        timestamp: new Date(),
        data: { result },
        source: "track_b",
      });
    });

    // Sync events
    realTimeSyncService.onSyncResult((result) => {
      this.emitEvent({
        type: result.success ? "sync_complete" : "error",
        timestamp: new Date(),
        data: { result },
        source: "track_b",
      });
    });

    // Backup events
    backupRecoveryService.onBackupResult((result) => {
      this.emitEvent({
        type: result.success ? "backup_complete" : "error",
        timestamp: new Date(),
        data: { result },
        source: "track_b",
      });
    });
  }

  private async setupNewUser(authData: TrackAAuthData): Promise<void> {
    try {
      this.log("Setting up new user:", authData.userId);

      // Store onboarding data in local storage
      if (authData.onboardingData) {
        await dataBridge.storeOnboardingData(authData.onboardingData);
      }

      // Create initial backup
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
    this.status = { ...this.status, ...updates };
    this.notifyStatusCallbacks(this.status);
  }

  private updateServiceStatus(
    service: keyof IntegrationStatus["services"],
    status: IntegrationStatus["services"][keyof IntegrationStatus["services"]],
  ): void {
    this.status.services[service] = status;
    this.notifyStatusCallbacks(this.status);
  }

  private emitEvent(event: IntegrationEvent): void {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.log("Error in event callback:", error);
      }
    });
  }

  private notifyStatusCallbacks(status: IntegrationStatus): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        this.log("Error in status callback:", error);
      }
    });
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

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const trackIntegrationService = new TrackIntegrationService();
export default trackIntegrationService;
