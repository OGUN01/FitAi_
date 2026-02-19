// Types for offline operations
export interface OfflineAction {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  table: string;
  data: any;
  timestamp: number;
  userId: string;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

export interface SupabaseResponse {
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  } | null;
}

// Rollback state for optimistic updates
export interface OptimisticRollbackState {
  actionId: string;
  key: string;
  originalData: OfflineData | null; // null means data didn't exist (was created)
  type: "UPDATE" | "CREATE" | "DELETE";
}

export interface SyncStatus {
  queueLength: number;
  isOnline: boolean;
  syncInProgress: boolean;
  lastSyncAttempt: number | null;
}

export type NetworkListener = (isOnline: boolean) => void;
