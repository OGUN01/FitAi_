import { NativeModules } from "react-native";

let healthConnectModule: any | null = null;
let healthConnectAvailable: boolean | null = null;

export const isHealthConnectNativeAvailable = (): boolean => {
  try {
    const hasNativeModule = !!(
      NativeModules.HealthConnect || NativeModules.RNHealthConnect
    );
    if (!hasNativeModule) {
      console.log(
        "Health Connect native module not found - package may not be linked",
      );
      return false;
    }
    return true;
  } catch (error) {
    console.log(
      "Error checking Health Connect native module availability:",
      error,
    );
    return false;
  }
};

export const getHealthConnectModule = async (): Promise<any | null> => {
  if (healthConnectAvailable === false) {
    return null;
  }

  if (healthConnectModule) {
    return healthConnectModule;
  }

  try {
    if (!isHealthConnectNativeAvailable()) {
      healthConnectAvailable = false;
      return null;
    }

    // Use require() instead of import() — Hermes module resolution errors
    // from dynamic import() are not catchable by try-catch, but require() is.
    const module = require("react-native-health-connect");
    healthConnectModule = module;
    healthConnectAvailable = true;
    return module;
  } catch (error) {
    console.warn("Failed to load react-native-health-connect:", error);
    healthConnectAvailable = false;
    return null;
  }
};

export const isHealthConnectModuleAvailable = (): boolean => {
  try {
    return !!(NativeModules.HealthConnect || NativeModules.RNHealthConnect);
  } catch {
    return false;
  }
};
