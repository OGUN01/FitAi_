import { MigrationConfig } from "./types";

export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  maxRetryDelayMs: 16000,
  timeoutMs: 300000, // 5 minutes
  backupEnabled: true,
  cleanupAfterSuccess: true,
  validateBeforeMigration: true,
};
