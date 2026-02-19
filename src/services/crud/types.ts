// Shared types and interfaces for CRUD operations

export interface BatchResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface DataStatistics {
  totalWorkoutSessions: number;
  totalMealLogs: number;
  totalMeasurements: number;
  pendingSyncItems: number;
  storageUsed: number;
  lastUpdated: string | null;
}
