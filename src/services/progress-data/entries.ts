// v2 - recorded_at removed (column does not exist in DB)

import * as crypto from "expo-crypto";
import { supabase } from "../supabase";
import { crudOperations } from "../crudOperations";
import { analyticsDataService } from "../analyticsData";
import { offlineService } from "../offline/OfflineService";
import { BodyMeasurement } from "../../types/localData";
import { getLocalDateString } from "../../utils/weekUtils";
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
    const entryDate = getLocalDateString(now);
    const bodyMeasurement: BodyMeasurement = {
      id: `progress_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`,
      date: entryDate,
      weight: entryData.weight_kg,
      bodyFat: entryData.body_fat_percentage,
      muscleMass: entryData.muscle_mass_kg,
      photos: entryData.progress_photos || [],
      notes: entryData.notes,
      syncStatus: "pending",
    };

    await crudOperations.createBodyMeasurement(bodyMeasurement);

    const upsertPayload = {
      user_id: userId,
      entry_date: entryDate,
      weight_kg: entryData.weight_kg,
      body_fat_percentage: entryData.body_fat_percentage,
      muscle_mass_kg: entryData.muscle_mass_kg,
      measurements: entryData.measurements || {},
      progress_photos: entryData.progress_photos || [],
      notes: entryData.notes,
    };

    // If offline, queue for sync and return success based on locally-saved data
    if (!offlineService.isDeviceOnline()) {
      await offlineService.queueAction({
        type: "CREATE",
        table: "progress_entries",
        data: upsertPayload,
        userId,
        maxRetries: 3,
      });
      return {
        success: true,
        data: { ...upsertPayload, id: bodyMeasurement.id, created_at: entryDate, measurements: upsertPayload.measurements || {} } as ProgressEntry,
      };
    }

    const { data, error } = await supabase
      .from("progress_entries")
      .upsert(upsertPayload, { onConflict: "user_id,entry_date" })
      .select()
      .single();

    if (error) {
      // Data is saved locally — queue for retry rather than surfacing an error
      console.warn("[createProgressEntry] Remote upsert failed, queued for sync:", error.message);
      await offlineService.queueAction({
        type: "CREATE",
        table: "progress_entries",
        data: upsertPayload,
        userId,
        maxRetries: 3,
      });
      return {
        success: true,
        data: { ...upsertPayload, id: bodyMeasurement.id, created_at: entryDate, measurements: upsertPayload.measurements || {} } as ProgressEntry,
      };
    }

    // Sync weight to analytics_metrics so charts reflect the new entry immediately.
    const analyticsSynced = await analyticsDataService.updateTodaysMetrics(userId, {
      weightKg: entryData.weight_kg,
    });
    if (!analyticsSynced) {
      console.warn(
        "[createProgressEntry] analytics_metrics sync failed for weight",
        entryData.weight_kg,
        "kg on",
        entryDate,
        "— charts will fall back to progress_entries until next sync.",
      );
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
