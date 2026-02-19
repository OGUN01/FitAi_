import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSteps,
  getActiveEnergyBurned,
  getHeartRateData,
  getSleepData,
  getBodyMass,
  getWorkouts,
  HealthKitModule,
} from "./platform";
import type { HealthKitData, HealthKitWorkout } from "./types";

export async function fetchHealthData(
  startDate?: Date,
  endDate?: Date,
): Promise<HealthKitData> {
  try {
    if (Platform.OS !== "ios" || !HealthKitModule) {
      return {};
    }

    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    const [steps, activeEnergy, heartRateData, sleepData, bodyMass, workouts] =
      await Promise.all([
        getSteps(options),
        getActiveEnergyBurned(options),
        getHeartRateData(options),
        getSleepData(options),
        getBodyMass({ unit: "kg" }),
        getWorkouts(options),
      ]);

    let heartRate, restingHeartRate, heartRateVariability;
    if (heartRateData && heartRateData.length > 0) {
      const hrValues = heartRateData.map((hr: any) => hr.value);
      heartRate = Math.round(
        hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length,
      );
      restingHeartRate = Math.min(...hrValues);

      if (hrValues.length > 1) {
        const diffs = hrValues
          .slice(1)
          .map((val: number, i: number) => Math.abs(val - hrValues[i]));
        heartRateVariability = Math.round(
          diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length,
        );
      }
    }

    let sleepHours, sleepQuality;
    if (sleepData && sleepData.length > 0) {
      const totalSleepMinutes = sleepData.reduce(
        (total: number, sleep: any) => {
          const duration =
            (new Date(sleep.endDate).getTime() -
              new Date(sleep.startDate).getTime()) /
            60000;
          return total + duration;
        },
        0,
      );
      sleepHours = totalSleepMinutes / 60;

      if (sleepHours >= 7 && sleepHours <= 9) {
        sleepQuality = "deep";
      } else if (sleepHours >= 6) {
        sleepQuality = "rem";
      } else if (sleepHours >= 5) {
        sleepQuality = "light";
      } else {
        sleepQuality = "awake";
      }
    }

    const processedWorkouts: HealthKitWorkout[] = workouts?.map(
      (workout: any) => ({
        id: workout.uuid || `workout_${Date.now()}_${Math.random()}`,
        activityType: workout.activityType,
        startDate: new Date(workout.startDate),
        endDate: new Date(workout.endDate),
        duration: workout.duration,
        energyBurned: workout.totalEnergyBurned,
        distance: workout.totalDistance,
        heartRate: workout.averageHeartRate,
        source: workout.sourceRevision?.source || "HealthKit",
      }),
    );

    await AsyncStorage.setItem("healthkit_last_sync", new Date().toISOString());

    return {
      steps: steps || 0,
      activeEnergy: activeEnergy || 0,
      heartRate,
      restingHeartRate,
      heartRateVariability,
      sleepHours,
      sleepQuality: sleepQuality as any,
      bodyWeight: bodyMass?.value,
      workouts: processedWorkouts,
    };
  } catch (error) {
    console.error("Failed to fetch health data:", error);
    return {};
  }
}

export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const syncTime = await AsyncStorage.getItem("healthkit_last_sync");
    return syncTime ? new Date(syncTime) : null;
  } catch (error) {
    console.error("Failed to get last sync time:", error);
    return null;
  }
}
