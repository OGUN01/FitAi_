import { BodyMeasurement } from "../../types/localData";
import { SupabaseProgressEntry } from "./types";

export function transformBodyMeasurementToSupabase(
  measurement: BodyMeasurement,
  userId: string,
): SupabaseProgressEntry {
  return {
    user_id: userId,
    entry_date: measurement.date,
    weight_kg: measurement.weight,
    body_fat_percentage: measurement.bodyFat,
    muscle_mass_kg: measurement.muscleMass,
    measurements: {
      chest: measurement.chest,
      waist: measurement.waist,
      hips: measurement.hips,
      biceps: measurement.biceps,
      thighs: measurement.thighs,
      calves: measurement.calves,
      neck: measurement.neck,
    },
    notes: measurement.notes || "",
  };
}

export function transformSupabaseToBodyMeasurement(
  supabaseEntry: any,
): BodyMeasurement {
  let measurements: any = {};
  if (supabaseEntry.measurements) {
    if (typeof supabaseEntry.measurements === "string") {
      try {
        measurements = JSON.parse(supabaseEntry.measurements);
      } catch {
        measurements = {};
      }
    } else {
      measurements = supabaseEntry.measurements;
    }
  }

  return {
    id: supabaseEntry.id,
    date: supabaseEntry.entry_date,
    weight: supabaseEntry.weight_kg,
    bodyFat: supabaseEntry.body_fat_percentage,
    muscleMass: supabaseEntry.muscle_mass_kg,
    chest: measurements.chest,
    waist: measurements.waist,
    hips: measurements.hips,
    biceps: measurements.biceps,
    thighs: measurements.thighs,
    calves: measurements.calves,
    neck: measurements.neck,
    notes: supabaseEntry.notes || "",
    syncStatus: "synced",
  };
}
