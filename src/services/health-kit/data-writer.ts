import { Platform } from "react-native";
import {
  saveWorkout,
  saveSteps,
  saveBodyMass,
  HealthKitModule,
} from "./platform";
import type { WorkoutInput } from "./types";

function mapWorkoutType(type: string): string {
  const mapping: Record<string, string> = {
    strength: "TraditionalStrengthTraining",
    cardio: "Running",
    yoga: "Yoga",
    pilates: "Pilates",
    hiit: "HighIntensityIntervalTraining",
    cycling: "Cycling",
    swimming: "Swimming",
    walking: "Walking",
    running: "Running",
    boxing: "Boxing",
    dance: "Dance",
    crossfit: "CrossTraining",
    stretching: "Flexibility",
  };

  return mapping[type.toLowerCase()] || "Other";
}

export async function saveWorkoutToHealthKit(
  workout: WorkoutInput,
): Promise<boolean> {
  try {
    if (Platform.OS !== "ios" || !HealthKitModule) {
      return false;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + workout.duration * 60000);

    const workoutData = {
      type: mapWorkoutType(workout.type),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      energyBurned: workout.calories,
      distance: workout.distance ? workout.distance * 1000 : undefined,
    };

    const success = await saveWorkout(workoutData);

    if (success) {
      console.log("🍎 Workout saved to HealthKit successfully");
    }

    return success;
  } catch (error) {
    console.error("Failed to save workout to HealthKit:", error);
    return false;
  }
}

export async function saveStepsToHealthKit(
  steps: number,
  date?: Date,
): Promise<boolean> {
  try {
    if (Platform.OS !== "ios" || !HealthKitModule) {
      return false;
    }

    const stepData = {
      value: steps,
      startDate: (date || new Date()).toISOString(),
      endDate: (date || new Date()).toISOString(),
    };

    const success = await saveSteps(stepData);

    if (success) {
      console.log("🍎 Steps saved to HealthKit successfully");
    }

    return success;
  } catch (error) {
    console.error("Failed to save steps to HealthKit:", error);
    return false;
  }
}

export async function saveWeightToHealthKit(
  weight: number,
  unit: "kg" | "lbs" = "kg",
): Promise<boolean> {
  try {
    if (Platform.OS !== "ios" || !HealthKitModule) {
      return false;
    }

    const weightInKg = unit === "lbs" ? weight * 0.453592 : weight;

    const weightData = {
      value: weightInKg,
      unit: "kg",
      date: new Date().toISOString(),
    };

    const success = await saveBodyMass(weightData);

    if (success) {
      console.log("🍎 Weight saved to HealthKit successfully");
    }

    return success;
  } catch (error) {
    console.error("Failed to save weight to HealthKit:", error);
    return false;
  }
}
