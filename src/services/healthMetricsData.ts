/**
 * HealthMetricsData Service - Supabase persistence for daily health snapshots
 *
 * SINGLE SOURCE OF TRUTH: health_metrics table in Supabase.
 *
 * Wave 3: Previously Health Connect data (steps, HR, calories, sleep, HRV,
 * SpO2, weight, body fat, distance) was store-only/ephemeral — it reset daily
 * and was never persisted, so reinstall / device change lost all history. This
 * service writes one row per (user_id, date, metric_type) upsert, giving
 * historical charts a stable read path.
 *
 * Mirrors the structure of hydrationData.ts: same imports, same
 * { success, data?, error? } return shape, same console.error logging, same
 * service-object export at the bottom.
 */

import { supabase } from "./supabase";
import { getCurrentUserId } from "./authUtils";
import { getLocalDateString } from "../utils/weekUtils";

/**
 * Maps a metric_type to its canonical unit. Used by saveHealthSnapshot when the
 * caller does not pass an explicit unit, and as the source of truth for what
 * each metric_type means. Keep in sync with the migration comment block.
 */
export const METRIC_UNITS: Record<string, string> = {
  steps: "count",
  heart_rate: "bpm",
  resting_heart_rate: "bpm",
  active_calories: "kcal",
  total_calories: "kcal",
  distance_km: "km",
  weight_kg: "kg",
  sleep_hours: "hours",
  heart_rate_variability: "ms",
  oxygen_saturation: "%",
  body_fat: "%",
};

/** All metric_type keys the service knows about — used for multi-metric fetches. */
export const ALL_METRIC_TYPES: string[] = Object.keys(METRIC_UNITS);

interface HealthMetricRow {
  id: string;
  user_id: string;
  date: string;
  metric_type: string;
  value: number;
  unit: string | null;
  source: string;
  recorded_at: string;
  created_at: string;
}

/** Shape returned by getTodayHealthMetrics: metric_type → { value, unit, source }. */
export type TodayHealthMetrics = Record<
  string,
  { value: number; unit: string | null; source: string }
>;

/** Shape returned by getMultiMetricHistory: metric_type → array of { date, value }. */
export type MultiMetricHistory = Record<string, Array<{ date: string; value: number }>>;

/**
 * Save (upsert) a single health metric for a given date.
 * Defaults to today + source 'healthconnect'. On conflict (same user/date/type)
 * the existing row is updated with the new value/unit/source/recorded_at so the
 * last sync of the day wins as the authoritative snapshot.
 *
 * SOURCE PRIORITY (Task 1): when `source === 'healthconnect'`, this function
 * FIRST checks for an existing `source='manual'` row for the same
 * (user_id, date, metric_type) and SKIPS the upsert if one exists. A Health
 * Connect sync (which may report 0 for metrics HC doesn't have) must NEVER
 * clobber a value the user explicitly logged via ManualHealthEntryScreen.
 * When `source === 'manual'`, NO check is performed — manual entries are
 * authoritative and overwrite everything (a user explicitly entering a value
 * wins over any sensor sync). This is the single-row path used by the
 * dedicated sleep write (Task 6) and direct HC callers; the batch path lives
 * in saveHealthSnapshot.
 */
export async function saveHealthMetric(
  metricType: string,
  value: number,
  unit?: string,
  source: "healthconnect" | "manual" = "healthconnect",
  dateStr?: string,
): Promise<{ success: boolean; data?: HealthMetricRow; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Task 5: NUMERIC NOT NULL guard. Reject non-finite values (NaN, Infinity,
    // null/undefined coerced to number) before they hit the upsert — otherwise
    // Postgres rejects the row with a constraint violation that surfaces as a
    // generic error. Fail fast with a clear message instead.
    if (!Number.isFinite(value)) {
      return { success: false, error: "Invalid value (not finite)" };
    }

    const date = dateStr ?? getLocalDateString();
    const resolvedUnit = unit ?? METRIC_UNITS[metricType] ?? null;

    // Task 1 — Manual-source priority. Only Health Connect writes are gated;
    // manual writes skip this check and overwrite everything.
    if (source === "healthconnect") {
      const { data: existingManual, error: manualCheckError } = await supabase
        .from("health_metrics")
        .select("id")
        .eq("user_id", userId)
        .eq("date", date)
        .eq("metric_type", metricType)
        .eq("source", "manual")
        .limit(1)
        .maybeSingle();
      if (manualCheckError) {
        console.error(
          "[HealthMetrics] Failed to check manual priority:",
          manualCheckError,
        );
        return { success: false, error: manualCheckError.message };
      }
      if (existingManual) {
        // Preserve the user's manual entry — do NOT overwrite with HC data.
        // success:true with no data signals "intentionally skipped".
        return { success: true };
      }
    }

    const { data, error } = await supabase
      .from("health_metrics")
      .upsert(
        {
          user_id: userId,
          date,
          metric_type: metricType,
          value,
          unit: resolvedUnit,
          source,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date,metric_type" },
      )
      .select()
      .single();

    if (error) {
      console.error("[HealthMetrics] Failed to save metric:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[HealthMetrics] Error saving metric:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Batch-save multiple metrics for today (or the given date) in a SINGLE
 * upsert round-trip (Task 4 — atomic, no partial failure). Returns the count
 * of rows actually written.
 *
 * SOURCE PRIORITY (Task 1): when `source === 'healthconnect'`, this function
 * FIRST queries existing rows where `source='manual'` for the target date,
 * builds a `manualMetricTypes` set, and EXCLUDES those metric types from the
 * batched upsert — so a HC sync reporting 0 for a metric the user manually
 * logged cannot clobber the manual value. When `source === 'manual'`, no
 * exclusion is performed (manual is authoritative — a user explicitly
 * entering values wins over any sensor sync). The exclusion is read-exclude:
 * we filter HC rows in JS based on the manual-metric-type set we read first.
 *
 * FINITE GUARD (Task 5): entries whose value is not a finite number are
 * skipped before the upsert (value column is NUMERIC NOT NULL).
 *
 * @param metrics  Map of metric_type → numeric value (e.g. { steps: 8200, heart_rate: 72 })
 * @param source   'healthconnect' | 'manual' — defaults to 'healthconnect'
 * @param dateStr  Optional date override (YYYY-MM-DD). Defaults to today.
 */
export async function saveHealthSnapshot(
  metrics: Record<string, number>,
  source: "healthconnect" | "manual" = "healthconnect",
  dateStr?: string,
): Promise<{ success: boolean; saved: number; error?: string }> {
  try {
    // Validate auth once up-front so we fail fast with a clear error instead of
    // attempting writes that fail with "Not authenticated".
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, saved: 0, error: "Not authenticated" };
    }

    const date = dateStr ?? getLocalDateString();

    // Task 5 — filter out non-finite values BEFORE building the batch so a
    // NaN/Infinity entry can't blow up the whole upsert.
    const finiteEntries = Object.entries(metrics).filter(
      ([, v]) => Number.isFinite(v),
    );
    if (finiteEntries.length === 0) {
      return { success: true, saved: 0 };
    }

    // Task 1 — For HC writes, read existing manual rows for this date and
    // exclude those metric types from the batch. App-layer read-exclude is
    // simplest and safe (no RPC / no per-row conditional upsert needed).
    let manualMetricTypes = new Set<string>();
    if (source === "healthconnect") {
      const { data: manualRows, error: manualReadError } = await supabase
        .from("health_metrics")
        .select("metric_type")
        .eq("user_id", userId)
        .eq("date", date)
        .eq("source", "manual");
      if (manualReadError) {
        console.error(
          "[HealthMetrics] Failed to read manual metrics for priority check:",
          manualReadError,
        );
        return { success: false, saved: 0, error: manualReadError.message };
      }
      manualMetricTypes = new Set(
        (manualRows ?? []).map((r) => r.metric_type),
      );
    }

    // Build the row array, excluding manual-clobbered metric types for HC writes.
    const rowsToUpsert = finiteEntries
      .filter(
        ([metricType]) => !manualMetricTypes.has(metricType),
      )
      .map(([metricType, value]) => ({
        user_id: userId,
        date,
        metric_type: metricType,
        value,
        unit: METRIC_UNITS[metricType] ?? null,
        source,
        recorded_at: new Date().toISOString(),
      }));

    const skippedManual = finiteEntries.length - rowsToUpsert.length;
    if (rowsToUpsert.length === 0) {
      // All metrics were either manual-prioritized (HC write) or all-finite-but-skipped.
      // success:true — this is the intended behavior, not an error.
      return { success: true, saved: 0 };
    }

    // Task 4 — SINGLE batched upsert. Atomic: either all rows land or none do
    // (no partial failure). onConflict matches the UNIQUE(user_id, date, metric_type).
    const { error: upsertError } = await supabase
      .from("health_metrics")
      .upsert(rowsToUpsert, {
        onConflict: "user_id,date,metric_type",
      });

    if (upsertError) {
      console.error("[HealthMetrics] Failed to save snapshot batch:", upsertError);
      return { success: false, saved: 0, error: upsertError.message };
    }

    return {
      success: true,
      saved: rowsToUpsert.length,
    };
  } catch (err) {
    console.error("[HealthMetrics] Error saving snapshot:", err);
    return {
      success: false,
      saved: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch all of today's health metrics for the current user.
 * Returns a map keyed by metric_type → { value, unit, source }.
 */
export async function getTodayHealthMetrics(): Promise<{
  success: boolean;
  data: TodayHealthMetrics;
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, data: {}, error: "Not authenticated" };
    }

    const today = getLocalDateString();

    const { data, error } = await supabase
      .from("health_metrics")
      .select("metric_type, value, unit, source")
      .eq("user_id", userId)
      .eq("date", today);

    if (error) {
      console.error("[HealthMetrics] Failed to get today's metrics:", error);
      return { success: false, data: {}, error: error.message };
    }

    const result: TodayHealthMetrics = {};
    data?.forEach((row) => {
      result[row.metric_type] = {
        value: Number(row.value),
        unit: row.unit,
        source: row.source,
      };
    });

    return { success: true, data: result };
  } catch (err) {
    console.error("[HealthMetrics] Error getting today's metrics:", err);
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch the history of a single metric_type for the last `days` days
 * (ordered ascending by date — the natural order for charts).
 */
export async function getHealthMetricsHistory(
  metricType: string,
  days: number = 30,
): Promise<{
  success: boolean;
  data: Array<{ date: string; value: number; source: string }>;
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, data: [], error: "Not authenticated" };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = getLocalDateString(startDate);

    const { data, error } = await supabase
      .from("health_metrics")
      .select("date, value, source")
      .eq("user_id", userId)
      .eq("metric_type", metricType)
      .gte("date", startDateStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("[HealthMetrics] Failed to get history:", error);
      return { success: false, data: [], error: error.message };
    }

    const result =
      data?.map((row) => ({
        date: row.date,
        value: Number(row.value),
        source: row.source,
      })) ?? [];

    return { success: true, data: result };
  } catch (err) {
    console.error("[HealthMetrics] Error getting history:", err);
    return {
      success: false,
      data: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch history for multiple metric_types in a single query, then group in JS
 * by metric_type. Returns a map: metric_type → Array<{ date, value }> ordered
 * ascending by date. Metric types with no rows in the window are present as
 * empty arrays so chart components can rely on key presence.
 */
export async function getMultiMetricHistory(
  metricTypes: string[],
  days: number = 7,
): Promise<{
  success: boolean;
  data: MultiMetricHistory;
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, data: {}, error: "Not authenticated" };
    }

    // Pre-seed every requested type with an empty array so callers always
    // get a key back, even when no rows exist for that metric in the window.
    const result: MultiMetricHistory = {};
    metricTypes.forEach((t) => {
      result[t] = [];
    });

    if (metricTypes.length === 0) {
      return { success: true, data: result };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = getLocalDateString(startDate);

    const { data, error } = await supabase
      .from("health_metrics")
      .select("metric_type, date, value")
      .eq("user_id", userId)
      .in("metric_type", metricTypes)
      .gte("date", startDateStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("[HealthMetrics] Failed to get multi-metric history:", error);
      return { success: false, data: {}, error: error.message };
    }

    data?.forEach((row) => {
      const bucket = result[row.metric_type];
      if (bucket) {
        bucket.push({ date: row.date, value: Number(row.value) });
      }
    });

    return { success: true, data: result };
  } catch (err) {
    console.error("[HealthMetrics] Error getting multi-metric history:", err);
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Delete a single metric row for a given date (defaults to today).
 * Used by the manual-entry screen to let users remove an incorrect entry.
 */
export async function deleteHealthMetric(
  metricType: string,
  dateStr?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const date = dateStr ?? getLocalDateString();

    const { error } = await supabase
      .from("health_metrics")
      .delete()
      .eq("user_id", userId)
      .eq("date", date)
      .eq("metric_type", metricType);

    if (error) {
      console.error("[HealthMetrics] Failed to delete metric:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[HealthMetrics] Error deleting metric:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Export service object for consistency with other services (hydrationData, etc.)
export const healthMetricsDataService = {
  saveHealthMetric,
  saveHealthSnapshot,
  getTodayHealthMetrics,
  getHealthMetricsHistory,
  getMultiMetricHistory,
  deleteHealthMetric,
};

export default healthMetricsDataService;
