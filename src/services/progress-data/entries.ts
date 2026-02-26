import * as crypto from "expo-crypto";
import { supabase } from "../supabase";
import { crudOperations } from "../crudOperations";
import { analyticsDataService } from "../analyticsData";
import { BodyMeasurement } from "../../types/localData";
import {
  ProgressEntry,
  ProgressDataResponse,
  CreateProgressEntryData,
} from "./types";
import { convertBodyMeasurementToProgressEntry } from "./converters";

export async function getUserProgressEntries(
  userId: string,
  limit?: number,
): Promise<ProgressDataResponse<ProgressEntry[]>> {
  try {
    const localMeasurements = await crudOperations.readBodyMeasurements(limit);

    if (localMeasurements.length > 0) {
      const entries = localMeasurements.map((measurement) =>
        convertBodyMeasurementToProgressEntry(measurement),
      );
      return {
        success: true,
        data: entries,
      };
    }

    let query = supabase
      .from("progress_entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching progress entries:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error("Error in getUserProgressEntries:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch progress entries",
    };
  }
}

export async function createProgressEntry(
  userId: string,
  entryData: CreateProgressEntryData,
): Promise<ProgressDataResponse<ProgressEntry>> {
  try {
    const now = new Date();
    const entryDate = now.toISOString().split("T")[0];
    const recordedAt = now.toISOString();

    const bodyMeasurement: BodyMeasurement = {
      id: `progress_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`,
      date: entryDate,
      weight: entryData.weight_kg,
      bodyFat: entryData.body_fat_percentage,
      muscleMass: entryData.muscle_mass_kg,
      photos: entryData.progress_photos || [],
      notes: entryData.notes,
      syncStatus: "pending",
    } as any;

    await crudOperations.createBodyMeasurement(bodyMeasurement);

    const { data, error } = await supabase
      .from("progress_entries")
      .insert({
        user_id: userId,
        entry_date: entryDate,
        weight_kg: entryData.weight_kg,
        body_fat_percentage: entryData.body_fat_percentage,
        muscle_mass_kg: entryData.muscle_mass_kg,
        measurements: entryData.measurements || {},
        progress_photos: entryData.progress_photos || [],
        notes: entryData.notes,
        recorded_at: recordedAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating progress entry:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    try {
      await analyticsDataService.updateTodaysMetrics(userId, {
        weightKg: entryData.weight_kg,
      });
    } catch (analyticsError) {
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error in createProgressEntry:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create progress entry",
    };
  }
}
