// Track Integration Service Types
// All interfaces and type definitions for the track integration system

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

export type ServiceStatus = "active" | "inactive" | "error";
export type ServiceType = keyof IntegrationStatus["services"];
