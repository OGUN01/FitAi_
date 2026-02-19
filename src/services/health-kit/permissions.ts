import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  HealthKitPermissions,
  requestPermissions,
  HealthKitModule,
} from "./platform";
import type { HealthKitPermissionsStatus } from "./types";

export async function requestAuthorization(): Promise<HealthKitPermissionsStatus> {
  try {
    if (Platform.OS !== "ios" || !HealthKitModule) {
      return { granted: false };
    }

    const permissions = {
      permissions: {
        read: [
          HealthKitPermissions?.StepCount,
          HealthKitPermissions?.ActiveEnergyBurned,
          HealthKitPermissions?.HeartRate,
          HealthKitPermissions?.RestingHeartRate,
          HealthKitPermissions?.HeartRateVariability,
          HealthKitPermissions?.SleepAnalysis,
          HealthKitPermissions?.BodyMass,
          HealthKitPermissions?.Workout,
          HealthKitPermissions?.DistanceWalkingRunning,
          HealthKitPermissions?.FlightsClimbed,
          HealthKitPermissions?.AppleStandTime,
          HealthKitPermissions?.AppleExerciseTime,
        ].filter(Boolean),
        write: [
          HealthKitPermissions?.StepCount,
          HealthKitPermissions?.ActiveEnergyBurned,
          HealthKitPermissions?.BodyMass,
          HealthKitPermissions?.Workout,
        ].filter(Boolean),
      },
    };

    const granted = await requestPermissions(permissions);

    if (granted) {
      await AsyncStorage.setItem("healthkit_authorized", "true");
      await AsyncStorage.setItem(
        "healthkit_auth_date",
        new Date().toISOString(),
      );
    }

    return {
      granted,
      permissions: permissions.permissions,
    };
  } catch (error) {
    console.error("Failed to request HealthKit authorization:", error);
    return { granted: false };
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    if (Platform.OS !== "ios" || !HealthKitModule) {
      return false;
    }

    const authorized = await AsyncStorage.getItem("healthkit_authorized");
    return authorized === "true";
  } catch (error) {
    console.error("Failed to check HealthKit permissions:", error);
    return false;
  }
}
