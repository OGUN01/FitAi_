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

    const module = await import("react-native-health-connect");
    healthConnectModule = module as any;
    healthConnectAvailable = true;
    return module as any;
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
