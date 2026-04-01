import { supabase } from "./supabase";
import { weightTrackingService } from "./WeightTrackingService";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { useProfileStore } from "../stores/profileStore";

export type CurrentWeightSource = "manual_log" | "body_analysis" | "none";

export interface WeightHistoryPoint {
  date: string;
  weight: number;
}

export interface ManualWeightEntry extends WeightHistoryPoint {
  recordedAt?: string | null;
}

interface CurrentWeightRow {
  weight_kg: number | null;
  entry_date: string;
  recorded_at: string | null;
}

export interface CurrentWeightResolution {
  value: number | null;
  source: CurrentWeightSource;
  asOf: string | null;
}

interface ResolveCurrentWeightOptions {
  weightHistory?: WeightHistoryPoint[];
  bodyAnalysisWeight?: number | null;
  bodyAnalysisUpdatedAt?: string | null;
}

function isValidWeight(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getLatestManualWeightEntry(
  weightHistory: WeightHistoryPoint[] = [],
): ManualWeightEntry | null {
  const validEntries = weightHistory.filter((entry) => {
    return typeof entry?.date === "string" && isValidWeight(entry?.weight);
  });

  if (validEntries.length === 0) {
    return null;
  }

  return validEntries.slice(1).reduce<ManualWeightEntry>((latest, entry) => {
    if (entry.date.localeCompare(latest.date) >= 0) {
      return entry;
    }
    return latest;
  }, validEntries[0]);
}

/**
 * SSOT weight resolver for components reading from store state.
 * Priority: manual entry > body analysis > null
 * Use this when you have weightHistory available.
 */
export function resolveCurrentWeight({
  weightHistory = [],
  bodyAnalysisWeight,
  bodyAnalysisUpdatedAt,
}: ResolveCurrentWeightOptions): CurrentWeightResolution {
  const latestManualWeight = getLatestManualWeightEntry(weightHistory);

  if (latestManualWeight) {
    return {
      value: latestManualWeight.weight,
      source: "manual_log",
      asOf: latestManualWeight.recordedAt ?? latestManualWeight.date,
    };
  }

  if (isValidWeight(bodyAnalysisWeight)) {
    return {
      value: bodyAnalysisWeight,
      source: "body_analysis",
      asOf: bodyAnalysisUpdatedAt ?? null,
    };
  }

  return {
    value: null,
    source: "none",
    asOf: null,
  };
}

export async function fetchLatestManualWeightEntry(
  userId: string,
): Promise<ManualWeightEntry | null> {
  if (!userId || userId.startsWith("guest") || userId === "local-user") {
    return null;
  }

  const { data: currentWeightRow, error: currentWeightError } = await supabase
    .from("user_current_weight")
    .select("entry_date, weight_kg, recorded_at")
    .eq("user_id", userId)
    .maybeSingle<CurrentWeightRow>();

  if (!currentWeightError && currentWeightRow && isValidWeight(currentWeightRow.weight_kg)) {
    return {
      date: currentWeightRow.entry_date,
      weight: currentWeightRow.weight_kg,
      recordedAt: currentWeightRow.recorded_at ?? currentWeightRow.entry_date,
    };
  }

  if (currentWeightError) {
    console.warn(
      "[currentWeight] Failed to fetch user_current_weight, falling back to progress_entries:",
      currentWeightError,
    );
  }

  const { data, error } = await supabase
    .from("progress_entries")
    .select("entry_date, weight_kg, created_at, updated_at")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("entry_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[currentWeight] Failed to fetch latest manual weight:", error);
    return null;
  }

  if (!data || !isValidWeight(data.weight_kg)) {
    return null;
  }

  return {
    date: data.entry_date,
    weight: data.weight_kg,
    recordedAt: data.updated_at ?? data.created_at ?? data.entry_date,
  };
}

/**
 * SSOT weight resolver for async contexts (DataBridge, DB operations).
 * Priority: manual weight log > body analysis param
 * Use this when you need to fetch from DB.
 */
export async function resolveCurrentWeightForUser(
  userId: string,
  fallback?: {
    bodyAnalysisWeight?: number | null;
    bodyAnalysisUpdatedAt?: string | null;
  },
): Promise<CurrentWeightResolution> {
  const latestManualWeight = await fetchLatestManualWeightEntry(userId);

  if (latestManualWeight) {
    return {
      value: latestManualWeight.weight,
      source: "manual_log",
      asOf: latestManualWeight.recordedAt ?? latestManualWeight.date,
    };
  }

  return resolveCurrentWeight({
    bodyAnalysisWeight: fallback?.bodyAnalysisWeight,
    bodyAnalysisUpdatedAt: fallback?.bodyAnalysisUpdatedAt,
  });
}

export function applyResolvedCurrentWeight<T extends { current_weight_kg?: number | null }>(
  bodyAnalysis: T,
  resolution: CurrentWeightResolution,
): T {
  if (!isValidWeight(resolution.value)) {
    return bodyAnalysis;
  }

  return {
    ...bodyAnalysis,
    current_weight_kg: resolution.value,
  };
}

/**
 * SSOT weight resolver for store-to-store calls (achievements, analytics).
 * Priority: analyticsStore.weightHistory > weightTrackingService > profileStore.bodyAnalysis
 * Use this for synchronous cross-store access only.
 */
export function resolveCurrentWeightFromStores(
  options?: {
    bodyAnalysisWeight?: number | null;
    bodyAnalysisUpdatedAt?: string | null;
  },
): CurrentWeightResolution {
  const weightHistory = useAnalyticsStore.getState().weightHistory || [];
  const trackedWeight = weightTrackingService.getCurrentWeight();
  const profileBodyAnalysis = useProfileStore.getState().bodyAnalysis;

  // AUDIT fix: if analyticsStore weightHistory is empty (not yet hydrated),
  // fall back to profileStore.bodyAnalysis directly rather than returning null.
  if (weightHistory.length === 0 && !isValidWeight(trackedWeight)) {
    return {
      value: profileBodyAnalysis?.current_weight_kg ?? null,
      source: profileBodyAnalysis?.current_weight_kg != null ? "body_analysis" : "none",
      asOf: null,
    };
  }

  if (isValidWeight(trackedWeight)) {
    return {
      value: trackedWeight,
      source:
        getLatestManualWeightEntry(weightHistory) != null
          ? "manual_log"
          : "body_analysis",
      asOf: null,
    };
  }

  return resolveCurrentWeight({
    weightHistory,
    bodyAnalysisWeight:
      options?.bodyAnalysisWeight ??
      profileBodyAnalysis?.current_weight_kg ??
      null,
    bodyAnalysisUpdatedAt:
      options?.bodyAnalysisUpdatedAt ??
      null,
  });
}
