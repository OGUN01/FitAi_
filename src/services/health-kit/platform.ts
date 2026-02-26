import { Platform } from "react-native";

let HealthKitModule: any = null;

if (Platform.OS === "ios") {
  try {
    HealthKitModule = require("expo-health-kit");
  } catch (error) {
  }
}

export const HealthKitPermissions = HealthKitModule?.HealthKitPermissions;

export const isHealthKitSupported =
  HealthKitModule?.isHealthKitSupported || (() => false);

export const requestPermissions =
  HealthKitModule?.requestPermissions || (() => Promise.resolve(false));

export const getWorkouts =
  HealthKitModule?.getWorkouts || (() => Promise.resolve([]));

export const getSteps = HealthKitModule?.getSteps || (() => Promise.resolve(0));

export const getHeartRateData =
  HealthKitModule?.getHeartRateData || (() => Promise.resolve([]));

export const getSleepData =
  HealthKitModule?.getSleepData || (() => Promise.resolve([]));

export const getBodyMass =
  HealthKitModule?.getBodyMass || (() => Promise.resolve(null));

export const getActiveEnergyBurned =
  HealthKitModule?.getActiveEnergyBurned || (() => Promise.resolve(0));

export const saveWorkout =
  HealthKitModule?.saveWorkout || (() => Promise.resolve(false));

export const saveSteps =
  HealthKitModule?.saveSteps || (() => Promise.resolve(false));

export const saveBodyMass =
  HealthKitModule?.saveBodyMass || (() => Promise.resolve(false));

export { HealthKitModule };
