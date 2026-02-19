// Sync and file upload API types

import { UserPreferences } from "./profile";

export interface SyncRequest {
  lastSyncTimestamp?: string;
  data: SyncData;
}

export interface SyncData {
  workouts?: SyncWorkoutData[];
  meals?: SyncMealData[];
  progress?: SyncProgressData[];
  preferences?: UserPreferences;
}

export interface SyncWorkoutData {
  id: string;
  action: "create" | "update" | "delete";
  data?: any;
  timestamp: string;
}

export interface SyncMealData {
  id: string;
  action: "create" | "update" | "delete";
  data?: any;
  timestamp: string;
}

export interface SyncProgressData {
  id: string;
  action: "create" | "update" | "delete";
  data?: any;
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  conflicts?: SyncConflict[];
  serverData?: SyncData;
  lastSyncTimestamp: string;
}

export interface SyncConflict {
  id: string;
  type: "workout" | "meal" | "progress";
  localData: any;
  serverData: any;
  conflictFields: string[];
  resolution?: "local" | "server" | "merge" | "manual";
}

export interface FileUploadRequest {
  file: File | Blob;
  type: "profile_picture" | "progress_photo" | "meal_photo" | "exercise_video";
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  url: string;
  thumbnailUrl?: string;
  fileId: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: ServiceStatus[];
  uptime: number;
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
}
