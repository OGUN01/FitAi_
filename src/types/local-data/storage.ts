import { LocalUserData } from "./user";
import { LocalFitnessData } from "./workout";
import { LocalNutritionData } from "./nutrition";
import { LocalProgressData } from "./progress";

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: string;
  expiresAt: string;
  size: number;
  accessCount: number;
  lastAccessedAt: string;
}

export interface OfflineQueue {
  id: string;
  action: "create" | "update" | "delete" | "sync";
  entity: "workout" | "meal" | "progress" | "user" | "achievement";
  entityId: string;
  data: Record<string, unknown>;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  priority: "low" | "normal" | "high";
  createdAt: string;
}

export interface AppState {
  isFirstLaunch: boolean;
  lastOpenedAt: string;
  sessionCount: number;
  installDate: string;
  appVersion: string;
  deviceInfo: {
    model: string;
    os: string;
    osVersion: string;
    screenSize: string;
  };
  featureFlags: {
    [key: string]: boolean;
  };
  debugMode: boolean;
}

export interface NavigationState {
  currentScreen: string;
  previousScreen?: string;
  navigationStack: string[];
  tabHistory: {
    [tab: string]: string[];
  };
  timestamp: string;
}

export interface StorageStats {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  breakdown: {
    userData: number;
    workouts: number;
    nutrition: number;
    progress: number;
    media: number;
    cache: number;
  };
  lastCalculatedAt: string;
}

export interface StorageQuota {
  maxTotalSize: number;
  maxMediaSize: number;
  maxCacheSize: number;
  maxOfflineDataSize: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface StorageInfo {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  quotaExceeded: boolean;
  lastCleanup: string | null;
  compressionRatio: number;
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  saltLength: number;
  ivLength: number;
}

export interface EncryptedData {
  iv: string;
  salt: string;
  payload: string;
  tag?: string;
}

export interface MigrationRecord {
  id: string;
  fromVersion: string;
  toVersion: string;
  startedAt: string;
  completedAt?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  migratedEntities: {
    [entity: string]: {
      total: number;
      completed: number;
      failed: number;
      errors?: string[];
    };
  };
  rollbackData?: unknown;
}

export interface LocalStorageSchema {
  version: string;
  encrypted?: boolean;
  createdAt: string;
  updatedAt: string;
  user: LocalUserData;
  fitness: LocalFitnessData;
  nutrition: LocalNutritionData;
  progress: LocalProgressData;
  metadata?: Record<string, unknown>;
}
