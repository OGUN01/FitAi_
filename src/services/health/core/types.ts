import { PermissionType } from "../types";

export interface SdkAvailabilityStatus {
  SDK_AVAILABLE: string | number;
  SDK_UNAVAILABLE: string | number;
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: string | number;
}

export const SdkAvailabilityStatus = {
  SDK_AVAILABLE: "SDK_AVAILABLE",
  SDK_UNAVAILABLE: "SDK_UNAVAILABLE",
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
    "SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED",
} as const;

export interface HealthConnectModule {
  getSdkStatus: () => Promise<string | number>;
  initialize: () => Promise<boolean>;
  openHealthConnectSettings: () => void | Promise<void>;
  SdkAvailabilityStatus?: SdkAvailabilityStatus;
  requestPermission: (
    permissions: PermissionType[],
  ) => Promise<PermissionType[]>;
  getGrantedPermissions: () => Promise<PermissionType[]>;
  revokeAllPermissions: () => Promise<void>;
  readRecords: (config: any) => Promise<any>;
  aggregateRecord: (config: any) => Promise<any>;
  [key: string]: any;
}

export interface StorageKeys {
  STORAGE_KEY: string;
  SYNC_INTERVAL_KEY: string;
  PERMISSIONS_KEY: string;
  INITIALIZED_KEY: string;
}

export const STORAGE_KEYS: StorageKeys = {
  STORAGE_KEY: "fitai_healthconnect_data",
  SYNC_INTERVAL_KEY: "fitai_healthconnect_last_sync",
  PERMISSIONS_KEY: "fitai_healthconnect_permissions",
  INITIALIZED_KEY: "fitai_healthconnect_initialized",
};

export const DEFAULT_PERMISSIONS: PermissionType[] = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "TotalCaloriesBurned" },
  { accessType: "read", recordType: "BasalMetabolicRate" },
  { accessType: "read", recordType: "Distance" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "ExerciseSession" },
  { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
  { accessType: "read", recordType: "OxygenSaturation" },
  { accessType: "read", recordType: "BodyFat" },
  { accessType: "write", recordType: "ExerciseSession" },
  { accessType: "write", recordType: "ActiveCaloriesBurned" },
];

export const EXCLUDED_RAW_SOURCES = ["android"];
