import { BodyMeasurement } from "../../types/localData";
import { ProgressEntry } from "./types";

export function convertBodyMeasurementToProgressEntry(
  measurement: BodyMeasurement,
): ProgressEntry {
  return {
    id: measurement.id,
    user_id: "local-user",
    entry_date: measurement.date,
    weight_kg: measurement.weight ?? 0,
    body_fat_percentage: measurement.bodyFat,
    muscle_mass_kg: measurement.muscleMass,
    measurements: (measurement as any).measurements || {},
    progress_photos: measurement.photos || [],
    notes: measurement.notes,
    recorded_at: measurement.date,
    created_at: measurement.date,
  };
}

export function getDefaultGoals(userId: string) {
  return {
    id: "default",
    user_id: userId,
    target_weight_kg: undefined,
    target_body_fat_percentage: undefined,
    target_muscle_mass_kg: undefined,
    target_measurements: {},
    target_date: undefined,
    weekly_workout_goal: 3,
    daily_calorie_goal: 2000,
    daily_protein_goal: 150,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
