import { HealthConnectData, MetricSource } from "./types";
import { getDataSource, getBestDataSource, rankOrigins } from "./dataSources";

/** Shape of a Health Connect record returned by readRecords */
interface HealthConnectRecord {
  startTime?: string;
  endTime?: string;
  exerciseType?: unknown;
  title?: string;
  energy?: { inKilocalories?: number };
  distance?: { inMeters?: number };
  weight?: { inKilograms?: number };
  heartRateVariabilityMillis?: number;
  percentage?: number;
  metadata?: {
    id?: string;
    dataOrigin?: string;
  };
  [key: string]: unknown;
}

/** Shape of an aggregate result returned by aggregateRecord */
interface AggregateResult {
  COUNT_TOTAL?: number;
  BPM_AVG?: number;
  BPM_MIN?: number;
  ACTIVE_CALORIES_TOTAL?: { inKilocalories?: number };
  ENERGY_TOTAL?: { inKilocalories?: number };
  BASAL_CALORIES_TOTAL?: { inKilocalories?: number };
  DISTANCE?: { inMeters?: number };
  dataOrigins?: string[];
  [key: string]: unknown;
}

/** Shape of a readRecords response */
interface ReadRecordsResult {
  records?: HealthConnectRecord[];
}

export interface SyncContext {
  healthData: HealthConnectData;
  allDataOrigins: Set<string>;
  excludedRawSources: string[];
  aggregateRecord: (params: Record<string, unknown>) => Promise<AggregateResult | null>;
  readRecords: (type: string, params: Record<string, unknown>) => Promise<ReadRecordsResult | null>;
  startDate: Date;
  endDate: Date;
  todayStart: Date;
}

function addOriginSource(
  ctx: SyncContext,
  field: keyof NonNullable<HealthConnectData["sources"]>,
  origins: string[],
) {
  if (origins?.length > 0) {
    origins.forEach((origin: string) => ctx.allDataOrigins.add(origin));
    const bestSource = getBestDataSource(origins);
    if (bestSource) {
      ctx.healthData.sources![field] = {
        packageName: origins[0],
        ...bestSource,
      } as MetricSource;
    }
  }
}

/** Attribute a metric to the single package name that actually produced its
 * value (as opposed to addOriginSource's multi-origin label, used only by
 * genuinely-averaged metrics like heart rate). No-ops when there's no source
 * (metric truly has no data this window). */
function setMetricSource(
  ctx: SyncContext,
  field: keyof NonNullable<HealthConnectData["sources"]>,
  packageName: string | null,
) {
  if (!packageName) return;
  ctx.allDataOrigins.add(packageName);
  ctx.healthData.sources![field] = {
    packageName,
    ...getDataSource(packageName),
  };
}

interface ResolveAggregateParams {
  ctx: SyncContext;
  recordType: string;
  timeRangeFilter: Record<string, unknown>;
  /** Pull the numeric value out of an AggregateResult — shape differs per
   * record type (COUNT_TOTAL is a bare number; ACTIVE_CALORIES_TOTAL,
   * DISTANCE, ENERGY_TOTAL, BASAL_CALORIES_TOTAL are {inKilocalories |
   * inMeters}). Return null when the field is genuinely absent (distinct
   * from a legitimate 0). */
  extractValue: (agg: AggregateResult) => number | null;
}

interface AggregateResolution {
  /** null only when Health Connect has no data for this metric/window at
   * all — callers decide whether that means "leave field unset" or "show 0"
   * for that metric, matching each field's existing UI convention. */
  value: number | null;
  /** The single package name the returned value is attributed to. */
  source: string | null;
}

/**
 * Single-source-of-truth resolver for cumulative (SUM-style) Health Connect
 * aggregates — steps, distance, active/total calories, BMR. Health Connect's
 * own aggregateRecord SUMS every contributing app's records for the window,
 * which silently double-counts once more than one source writes the same
 * metric: the phone's own step sensor AND a paired watch's companion app, or
 * two different watch apps both enabled. Every mature health platform avoids
 * this the same way — Apple HealthKit's per-category source priority, Health
 * Connect's own "app priority" setting — by never summing across sources:
 * pick ONE authoritative source per metric, ranked by device-accuracy tier
 * (dataSources.ts), and use only that source's value.
 *
 * Resolution order:
 *   1. Query unfiltered to discover which apps contributed this window.
 *   2. Rank the non-excluded (real app/watch) origins by tier + accuracy.
 *   3. Re-query filtered to just the top-ranked origin. A real (non-null)
 *      value from it wins outright.
 *   4. If the top source has nothing for this window, fall down the ranked
 *      list one at a time — never sum, just try the next-best source alone.
 *   5. If no app/watch source has anything (nothing paired, or Health
 *      Connect itself has no data), fall back to the raw unfiltered total —
 *      typically just the phone's own sensor.
 */
async function resolveBestAggregate({
  ctx,
  recordType,
  timeRangeFilter,
  extractValue,
}: ResolveAggregateParams): Promise<AggregateResolution> {
  const raw = await ctx.aggregateRecord({ recordType, timeRangeFilter });
  if (!raw) return { value: null, source: null };

  const allOrigins = raw.dataOrigins || [];
  const ranked = rankOrigins(allOrigins, ctx.excludedRawSources);

  for (const { origin } of ranked) {
    const filtered = await ctx.aggregateRecord({
      recordType,
      timeRangeFilter,
      dataOriginFilter: [origin],
    });
    const value = filtered ? extractValue(filtered) : null;
    if (value != null) {
      return { value, source: origin };
    }
  }

  // No ranked app/watch source had usable data — fall back to the raw,
  // unfiltered total (covers "no watch paired, phone sensor only").
  return { value: extractValue(raw), source: allOrigins[0] ?? null };
}

/**
 * For "latest snapshot" metrics (weight, HRV, SpO2, body fat) that pick a
 * single most-recent record rather than summing: picking by recency alone,
 * with no regard for which source wrote it, means a later-but-less-accurate
 * reading (e.g. a manual phone entry) silently overrides an earlier, more
 * accurate one (e.g. a Withings scale) just because it happened to be
 * entered later that day. Scope to the highest-tier source present, then
 * take its most recent record — mirroring resolveBestAggregate's
 * never-let-a-lower-tier-source-win policy, just for "pick one" instead of
 * "sum" semantics. Records are assumed to already arrive in ascending
 * chronological order from Health Connect (the same assumption the plain
 * array-index lookups this replaces already relied on).
 */
function pickBestRecordByOrigin<T extends { metadata?: { dataOrigin?: string } }>(
  records: T[],
): T | undefined {
  if (records.length === 0) return undefined;
  const origins = Array.from(
    new Set(
      records
        .map((r) => r.metadata?.dataOrigin)
        .filter((o): o is string => !!o),
    ),
  );
  const ranked = rankOrigins(origins, []);
  const topOrigin = ranked[0]?.origin;
  const candidates = topOrigin
    ? records.filter((r) => r.metadata?.dataOrigin === topOrigin)
    : records;
  return candidates[candidates.length - 1];
}

export async function syncSteps(ctx: SyncContext): Promise<void> {
  try {
    const { value, source } = await resolveBestAggregate({
      ctx,
      recordType: "Steps",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
      extractValue: (agg) =>
        typeof agg.COUNT_TOTAL === "number" ? agg.COUNT_TOTAL : null,
    });
    // Steps always shows a number (0, not "--") elsewhere in the app.
    ctx.healthData.steps = value ?? 0;
    setMetricSource(ctx, "steps", source);
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("steps");
  }
}

export async function syncHeartRate(ctx: SyncContext): Promise<void> {
  try {
    const heartRateAggregate = await ctx.aggregateRecord({
      recordType: "HeartRate",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (heartRateAggregate && typeof heartRateAggregate.BPM_AVG === "number") {
      ctx.healthData.heartRate = Math.round(heartRateAggregate.BPM_AVG);
      // Resting HR must NOT be derived from BPM_MIN — that is the lowest single
      // HR sample (often a sleeping/overnight reading), NOT true resting HR.
      // Using it here would inflate the Karvonen heart-rate-reserve in
      // getHeartRateZones, shifting every zone boundary up. Health Connect has
      // no dedicated RestingHeartRate record type (unlike Apple HealthKit), so we
      // leave this undefined rather than fabricate a value (CLAUDE.md #8 — no
      // fake values). True resting HR needs a dedicated query not available here.
      addOriginSource(ctx, "heartRate", heartRateAggregate.dataOrigins || []);
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("heartRate");
  }
}

export async function syncActiveCalories(ctx: SyncContext): Promise<void> {
  try {
    // excludedRawSources covers both the phone's raw sensor and FitAI's own
    // write-back (ActiveCaloriesBurned records written on workout completion
    // via completionTracking) — resolveBestAggregate drops both from
    // consideration the same way it does for steps/distance, so a workout
    // MET calories never double-counts against a watch's own reading.
    const { value, source } = await resolveBestAggregate({
      ctx,
      recordType: "ActiveCaloriesBurned",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
      extractValue: (agg) => agg.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? null,
    });
    if (value != null) {
      ctx.healthData.activeCalories = Math.round(value);
      setMetricSource(ctx, "activeCalories", source);
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("activeCalories");
  }
}

export async function syncTotalCaloriesWithBMRFallback(
  ctx: SyncContext,
): Promise<void> {
  try {
    const { value, source } = await resolveBestAggregate({
      ctx,
      recordType: "TotalCaloriesBurned",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
      extractValue: (agg) => agg.ENERGY_TOTAL?.inKilocalories ?? null,
    });
    if (value != null) {
      ctx.healthData.totalCalories = Math.round(value);
      setMetricSource(ctx, "totalCalories", source);
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("totalCalories");
  }

  if (!ctx.healthData.totalCalories) {
    try {
      const { value: bmrValue, source: bmrSource } = await resolveBestAggregate({
        ctx,
        recordType: "BasalMetabolicRate",
        timeRangeFilter: {
          operator: "between",
          startTime: ctx.todayStart.toISOString(),
          endTime: ctx.endDate.toISOString(),
        },
        extractValue: (agg) => agg.BASAL_CALORIES_TOTAL?.inKilocalories ?? null,
      });

      if (bmrValue != null) {
        ctx.healthData.totalCalories =
          Math.round(bmrValue) + (ctx.healthData.activeCalories || 0);

        if (bmrSource) {
          ctx.allDataOrigins.add(bmrSource);
          ctx.healthData.sources!.totalCalories = {
            packageName: bmrSource,
            ...getDataSource(bmrSource),
            name: getDataSource(bmrSource).name + " (BMR+Active)",
          };
        }
      }
    } catch (bmrError) {
      console.error("[syncHelpers] syncBMR aggregate failed:", bmrError);
    }
  }
}

export async function syncDistance(ctx: SyncContext): Promise<void> {
  try {
    const { value, source } = await resolveBestAggregate({
      ctx,
      recordType: "Distance",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
      extractValue: (agg) => agg.DISTANCE?.inMeters ?? null,
    });
    if (value != null) {
      ctx.healthData.distance = Math.round(value);
      setMetricSource(ctx, "distance", source);
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("distance");
  }
}

export async function syncWeight(ctx: SyncContext): Promise<void> {
  try {
    const weightRecords = await ctx.readRecords("Weight", {
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (weightRecords?.records && weightRecords.records.length > 0) {
      const latestRecord = pickBestRecordByOrigin(weightRecords.records)!;
      ctx.healthData.weight = latestRecord.weight?.inKilograms;

      if (latestRecord.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(latestRecord.metadata.dataOrigin);
        const source = getDataSource(latestRecord.metadata.dataOrigin);
        ctx.healthData.sources!.weight = {
          packageName: latestRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("weight");
  }
}

export async function syncSleep(ctx: SyncContext): Promise<void> {
  try {
    const sleepRecords = await ctx.readRecords("SleepSession", {
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (sleepRecords?.records && sleepRecords.records.length > 0) {
      ctx.healthData.sleep = sleepRecords.records.map((sleep) => ({
        startTime: sleep.startTime!,
        endTime: sleep.endTime!,
        duration: Math.round(
          (new Date(sleep.endTime!).getTime() -
            new Date(sleep.startTime!).getTime()) /
            60000,
        ),
      }));

      const firstRecord = sleepRecords.records[0];
      if (firstRecord.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(firstRecord.metadata.dataOrigin);
        const source = getDataSource(firstRecord.metadata.dataOrigin);
        ctx.healthData.sources!.sleep = {
          packageName: firstRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch (error) {
    console.error("[syncHelpers] Sleep sync failed:", error);
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("sleep");
  }
}

export async function syncExerciseSessions(ctx: SyncContext): Promise<void> {
  try {
    const exerciseRecords = await ctx.readRecords("ExerciseSession", {
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (exerciseRecords?.records && exerciseRecords.records.length > 0) {
      // Exclude FitAI's own write-back source. exportWorkoutToHealthConnect
      // writes ExerciseSession records under dataOrigin "com.fitai.app"
      // (core.ts writeWorkoutSession) on workout completion, and already adds
      // the workout to recentWorkouts locally with source "FitAI". Without
      // filtering it out here, the next sync reads that record back as a
      // "HealthConnect" workout with a different id (the HC uuid), and
      // mergeRecentWorkouts' source:id dedup leaves both — same workout twice.
      // Mirrors the EXCLUDED_RAW_SOURCES filter applied to active-calories,
      // steps, and distance aggregates.
      const filteredRecords = exerciseRecords.records.filter(
        (exercise) =>
          !ctx.excludedRawSources.includes(exercise.metadata?.dataOrigin || ""),
      );

      const recordsToMap =
        filteredRecords.length > 0 ? filteredRecords : exerciseRecords.records;

      ctx.healthData.exerciseSessions = recordsToMap.map((exercise) => ({
        id: exercise.metadata?.id || `exercise_${Date.now()}`,
        startTime: exercise.startTime!,
        endTime: exercise.endTime!,
        exerciseType: exercise.exerciseType?.toString() || "unknown",
        title: exercise.title,
        calories: exercise.energy?.inKilocalories,
        distance: exercise.distance?.inMeters,
        duration: Math.round(
          (new Date(exercise.endTime!).getTime() -
            new Date(exercise.startTime!).getTime()) /
            60000,
        ),
      }));

      const firstRecord = recordsToMap[0];
      if (firstRecord?.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(firstRecord.metadata.dataOrigin);
        const source = getDataSource(firstRecord.metadata.dataOrigin);
        ctx.healthData.sources!.exerciseSessions = {
          packageName: firstRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("exerciseSessions");
  }
}

export async function syncHRV(ctx: SyncContext): Promise<void> {
  try {
    const hrvRecords = await ctx.readRecords("HeartRateVariabilityRmssd", {
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (hrvRecords?.records && hrvRecords.records.length > 0) {
      const latestRecord = pickBestRecordByOrigin(hrvRecords.records)!;
      ctx.healthData.heartRateVariability =
        latestRecord.heartRateVariabilityMillis;

      if (latestRecord.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(latestRecord.metadata.dataOrigin);
        const source = getDataSource(latestRecord.metadata.dataOrigin);
        ctx.healthData.sources!.heartRateVariability = {
          packageName: latestRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("heartRateVariability");
  }
}

export async function syncSpO2(ctx: SyncContext): Promise<void> {
  try {
    const spo2Records = await ctx.readRecords("OxygenSaturation", {
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (spo2Records?.records && spo2Records.records.length > 0) {
      const latestRecord = pickBestRecordByOrigin(spo2Records.records)!;
      ctx.healthData.oxygenSaturation = latestRecord.percentage;

      if (latestRecord.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(latestRecord.metadata.dataOrigin);
        const source = getDataSource(latestRecord.metadata.dataOrigin);
        ctx.healthData.sources!.oxygenSaturation = {
          packageName: latestRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("oxygenSaturation");
  }
}

export async function syncBodyFat(ctx: SyncContext): Promise<void> {
  try {
    const bodyFatRecords = await ctx.readRecords("BodyFat", {
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.startDate.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (bodyFatRecords?.records && bodyFatRecords.records.length > 0) {
      const latestRecord = pickBestRecordByOrigin(bodyFatRecords.records)!;
      ctx.healthData.bodyFat = latestRecord.percentage;

      if (latestRecord.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(latestRecord.metadata.dataOrigin);
        const source = getDataSource(latestRecord.metadata.dataOrigin);
        ctx.healthData.sources!.bodyFat = {
          packageName: latestRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("bodyFat");
  }
}

export async function syncAllMetrics(ctx: SyncContext): Promise<void> {
  await syncSteps(ctx);
  await syncHeartRate(ctx);
  await syncActiveCalories(ctx);
  await syncTotalCaloriesWithBMRFallback(ctx);
  await syncDistance(ctx);
  await syncWeight(ctx);
  await syncSleep(ctx);
  await syncExerciseSessions(ctx);
  await syncHRV(ctx);
  await syncSpO2(ctx);
  await syncBodyFat(ctx);
}
