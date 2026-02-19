// Barrel export for core health service modules
export { HealthConnectService } from "./HealthConnectService";
export { PermissionsManager } from "./permissions";
export { SyncManager } from "./sync";
export { StorageManager } from "./storage";
export {
  getHealthConnectModule,
  isHealthConnectNativeAvailable,
  isHealthConnectModuleAvailable,
} from "./moduleLoader";
export type {
  HealthConnectModule,
  SdkAvailabilityStatus,
  StorageKeys,
} from "./types";
export {
  SdkAvailabilityStatus as SdkAvailabilityStatusConst,
  STORAGE_KEYS,
  DEFAULT_PERMISSIONS,
  EXCLUDED_RAW_SOURCES,
} from "./types";

// Create and export singleton instance
import { HealthConnectService } from "./HealthConnectService";
import { getHealthConnectModule } from "./moduleLoader";
export const healthConnectService = new HealthConnectService();

// Export utility functions for backward compatibility
export const canUseHealthConnect = async (): Promise<boolean> => {
  const { Platform } = await import("react-native");
  if (Platform.OS !== "android") return false;
  const module = await getHealthConnectModule();
  return module !== null;
};
