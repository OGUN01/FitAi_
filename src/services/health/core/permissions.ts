import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionType } from "../types";
import { getHealthConnectModule } from "./moduleLoader";
import {
  DEFAULT_PERMISSIONS,
  STORAGE_KEYS,
  SdkAvailabilityStatus,
} from "./types";

export class PermissionsManager {
  private permissionsGranted = false;

  async requestPermissions(
    permissions: PermissionType[] = DEFAULT_PERMISSIONS,
  ): Promise<boolean> {
    try {
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        this.permissionsGranted = false;
        return false;
      }

      const { requestPermission } = hcModule;
      const grantedPermissions = await requestPermission(permissions);

      const hasPermissions =
        Array.isArray(grantedPermissions) && grantedPermissions.length > 0;
      this.permissionsGranted = hasPermissions;

      if (!hasPermissions) {
        console.warn("⚠️ No Health Connect permissions were granted");
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.PERMISSIONS_KEY,
        this.permissionsGranted ? "granted" : "denied",
      );

      return this.permissionsGranted;
    } catch (error) {
      console.error("❌ Permission request failed:", error);
      this.permissionsGranted = false;
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") return false;

      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        const cachedPermissions = await AsyncStorage.getItem(
          STORAGE_KEYS.PERMISSIONS_KEY,
        );
        const hasCache = cachedPermissions === "granted";
        this.permissionsGranted = hasCache;
        return hasCache;
      }

      const { getSdkStatus, getGrantedPermissions } = hcModule;

      try {
        const sdkStatus = await getSdkStatus();
        if (sdkStatus !== 3) {
          this.permissionsGranted = false;
          return false;
        }

        const grantedPermissions = await getGrantedPermissions();
        const hasPermissions =
          Array.isArray(grantedPermissions) && grantedPermissions.length > 0;

        this.permissionsGranted = hasPermissions;
        await AsyncStorage.setItem(
          STORAGE_KEYS.PERMISSIONS_KEY,
          hasPermissions ? "granted" : "denied",
        );

        return hasPermissions;
      } catch (sdkError) {
        console.warn("⚠️ SDK check failed, falling back to cache:", sdkError);
        const cachedPermissions = await AsyncStorage.getItem(
          STORAGE_KEYS.PERMISSIONS_KEY,
        );
        const hasCache = cachedPermissions === "granted";
        this.permissionsGranted = hasCache;
        return hasCache;
      }
    } catch (error) {
      console.error("❌ Error checking Health Connect permissions:", error);
      this.permissionsGranted = false;
      return false;
    }
  }

  async revokeAllPermissions(): Promise<void> {
    try {
      const hcModule = await getHealthConnectModule();
      if (!hcModule) {
        throw new Error("Health Connect module not available");
      }

      const { revokeAllPermissions } = hcModule;
      await revokeAllPermissions();
      this.permissionsGranted = false;
    } catch (error) {
      console.error("❌ Error revoking permissions:", error);
      throw error;
    }
  }

  isPermissionsGranted(): boolean {
    return this.permissionsGranted;
  }

  setPermissionsGranted(granted: boolean): void {
    this.permissionsGranted = granted;
  }
}
