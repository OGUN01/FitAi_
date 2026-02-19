import type { SyncConfig } from "./types";

export const SYNC_STATUS_KEY = "@fitai_sync_status";
export const SYNC_QUEUE_KEY = "@fitai_sync_queue";
export const DELTA_SYNC_KEY = "@fitai_delta_sync";

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSyncEnabled: true,
  syncIntervalMs: 30000,
  maxRetries: 3,
  retryDelayMs: 5000,
  batchSize: 50,
  conflictResolutionStrategy: "auto",
  enableDeltaSync: true,
  enableBackgroundSync: true,
};

export const TABLES_TO_SYNC = [
  "workout_sessions",
  "meal_logs",
  "weight_logs",
  "hydration_logs",
  "user_achievements",
  "analytics_metrics",
] as const;

export const TABLE_TO_STORAGE_KEY: Record<string, string> = {
  workout_sessions: "@fitai_workout_history",
  meal_logs: "@fitai_meal_logs",
  weight_logs: "@fitai_weight_logs",
  hydration_logs: "@fitai_hydration_logs",
  user_achievements: "@fitai_achievements",
  analytics_metrics: "@fitai_analytics",
};

export const CONNECTION_MONITOR_INTERVAL_MS = 5000;
export const MAX_OPERATION_AGE_MS = 24 * 60 * 60 * 1000;
export const CRITICAL_OPERATION_SYNC_DELAY_MS = 1000;
