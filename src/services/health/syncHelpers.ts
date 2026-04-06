import { HealthConnectData, MetricSource } from "./types";
import { getDataSource, getBestDataSource } from "./dataSources";

export interface SyncContext {
  healthData: HealthConnectData;
  allDataOrigins: Set<string>;
  excludedRawSources: string[];
  aggregateRecord: (params: any) => Promise<any>;
  readRecords: (type: string, params: any) => Promise<any>;
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

export async function syncSteps(ctx: SyncContext): Promise<void> {
  try {
    const stepsAggregate = await ctx.aggregateRecord({
      recordType: "Steps",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (stepsAggregate && typeof stepsAggregate.COUNT_TOTAL === "number") {
      const origins = stepsAggregate.dataOrigins || [];
      const hasRawSensor = origins.some((o: any) =>
        ctx.excludedRawSources.includes(o),
      );
      const appSources = origins.filter(
        (o: any) => !ctx.excludedRawSources.includes(o),
      );

      if (hasRawSensor && appSources.length > 0) {
        const filteredAggregate = await ctx.aggregateRecord({
          recordType: "Steps",
          timeRangeFilter: {
            operator: "between",
            startTime: ctx.todayStart.toISOString(),
            endTime: ctx.endDate.toISOString(),
          },
          dataOriginFilter: appSources,
        });

        if (
          filteredAggregate &&
          typeof filteredAggregate.COUNT_TOTAL === "number"
        ) {
          ctx.healthData.steps = filteredAggregate.COUNT_TOTAL;
          addOriginSource(ctx, "steps", appSources);
        } else {
          ctx.healthData.steps = stepsAggregate.COUNT_TOTAL;
          origins.forEach((origin: string) => ctx.allDataOrigins.add(origin));
        }
      } else {
        ctx.healthData.steps = stepsAggregate.COUNT_TOTAL;
        addOriginSource(ctx, "steps", origins);
      }
    } else {
      ctx.healthData.steps = 0;
    }
  } catch (error) {
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
      ctx.healthData.restingHeartRate = heartRateAggregate.BPM_MIN;
      addOriginSource(ctx, "heartRate", heartRateAggregate.dataOrigins || []);
    }
  } catch (error) {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("heartRate");
  }
}

export async function syncActiveCalories(ctx: SyncContext): Promise<void> {
  try {
    const caloriesAggregate = await ctx.aggregateRecord({
      recordType: "ActiveCaloriesBurned",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (caloriesAggregate?.ACTIVE_CALORIES_TOTAL) {
      ctx.healthData.activeCalories = Math.round(
        caloriesAggregate.ACTIVE_CALORIES_TOTAL.inKilocalories || 0,
      );
      addOriginSource(
        ctx,
        "activeCalories",
        caloriesAggregate.dataOrigins || [],
      );
    }
  } catch (error) {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("activeCalories");
  }
}

export async function syncTotalCaloriesWithBMRFallback(
  ctx: SyncContext,
): Promise<void> {
  let totalCaloriesSuccess = false;

  try {
    const totalCaloriesAggregate = await ctx.aggregateRecord({
      recordType: "TotalCaloriesBurned",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (totalCaloriesAggregate?.ENERGY_TOTAL) {
      ctx.healthData.totalCalories = Math.round(
        totalCaloriesAggregate.ENERGY_TOTAL.inKilocalories || 0,
      );
      totalCaloriesSuccess = true;
      addOriginSource(
        ctx,
        "totalCalories",
        totalCaloriesAggregate.dataOrigins || [],
      );
    }
  } catch (error) {
    ctx.healthData.metadata!.isPartial = true;
    ctx.healthData.metadata!.failedMetrics!.push("totalCalories");
  }

  if (!totalCaloriesSuccess || !ctx.healthData.totalCalories) {
    try {
      const bmrAggregate = await ctx.aggregateRecord({
        recordType: "BasalMetabolicRate",
        timeRangeFilter: {
          operator: "between",
          startTime: ctx.todayStart.toISOString(),
          endTime: ctx.endDate.toISOString(),
        },
      });

      if (bmrAggregate?.BASAL_CALORIES_TOTAL) {
        const bmrCalories = Math.round(
          bmrAggregate.BASAL_CALORIES_TOTAL.inKilocalories || 0,
        );
        ctx.healthData.totalCalories =
          bmrCalories + (ctx.healthData.activeCalories || 0);

        if (bmrAggregate.dataOrigins?.length > 0) {
          bmrAggregate.dataOrigins.forEach((origin: string) =>
            ctx.allDataOrigins.add(origin),
          );
          const bestSource = getBestDataSource(bmrAggregate.dataOrigins);
          if (bestSource) {
            ctx.healthData.sources!.totalCalories = {
              packageName: bmrAggregate.dataOrigins[0],
              ...bestSource,
              name: bestSource.name + " (BMR+Active)",
            };
          }
        }
      }
    } catch (bmrError) {
    }
  }
}

export async function syncDistance(ctx: SyncContext): Promise<void> {
  try {
    const distanceAggregate = await ctx.aggregateRecord({
      recordType: "Distance",
      timeRangeFilter: {
        operator: "between",
        startTime: ctx.todayStart.toISOString(),
        endTime: ctx.endDate.toISOString(),
      },
    });

    if (distanceAggregate?.DISTANCE) {
      const origins = distanceAggregate.dataOrigins || [];
      const hasRawSensor = origins.some((o: string) =>
        ctx.excludedRawSources.includes(o),
      );
      const appSources = origins.filter(
        (o: string) => !ctx.excludedRawSources.includes(o),
      );

      if (hasRawSensor && appSources.length > 0) {
        const filteredAggregate = await ctx.aggregateRecord({
          recordType: "Distance",
          timeRangeFilter: {
            operator: "between",
            startTime: ctx.todayStart.toISOString(),
            endTime: ctx.endDate.toISOString(),
          },
          dataOriginFilter: appSources,
        });

        if (filteredAggregate?.DISTANCE) {
          ctx.healthData.distance = Math.round(
            filteredAggregate.DISTANCE.inMeters || 0,
          );
          addOriginSource(ctx, "distance", appSources);
        } else {
          ctx.healthData.distance = Math.round(
            distanceAggregate.DISTANCE.inMeters || 0,
          );
        }
      } else {
        ctx.healthData.distance = Math.round(
          distanceAggregate.DISTANCE.inMeters || 0,
        );
        addOriginSource(ctx, "distance", origins);
      }
    }
  } catch (error) {
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

    if (weightRecords?.records?.length > 0) {
      const latestRecord = weightRecords.records[
        weightRecords.records.length - 1
      ] as any;
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
  } catch (error) {
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

    if (sleepRecords?.records?.length > 0) {
      ctx.healthData.sleep = sleepRecords.records.map((sleep: any) => ({
        startTime: sleep.startTime,
        endTime: sleep.endTime,
        duration: Math.round(
          (new Date(sleep.endTime).getTime() -
            new Date(sleep.startTime).getTime()) /
            60000,
        ),
      }));

      const firstRecord = sleepRecords.records[0] as any;
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

    if (exerciseRecords?.records?.length > 0) {
      ctx.healthData.exerciseSessions = exerciseRecords.records.map(
        (exercise: any) => ({
          id: exercise.metadata?.id || `exercise_${Date.now()}`,
          startTime: exercise.startTime,
          endTime: exercise.endTime,
          exerciseType: exercise.exerciseType?.toString() || "unknown",
          title: exercise.title,
          calories: exercise.energy?.inKilocalories,
          distance: exercise.distance?.inMeters,
          duration: Math.round(
            (new Date(exercise.endTime).getTime() -
              new Date(exercise.startTime).getTime()) /
              60000,
          ),
        }),
      );

      const firstRecord = exerciseRecords.records[0] as any;
      if (firstRecord.metadata?.dataOrigin) {
        ctx.allDataOrigins.add(firstRecord.metadata.dataOrigin);
        const source = getDataSource(firstRecord.metadata.dataOrigin);
        ctx.healthData.sources!.exerciseSessions = {
          packageName: firstRecord.metadata.dataOrigin,
          ...source,
        };
      }
    }
  } catch (error) {
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

    if (hrvRecords?.records?.length > 0) {
      const latestRecord = hrvRecords.records[
        hrvRecords.records.length - 1
      ] as any;
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
  } catch (error) {
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

    if (spo2Records?.records?.length > 0) {
      const latestRecord = spo2Records.records[
        spo2Records.records.length - 1
      ] as any;
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
  } catch (error) {
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

    if (bodyFatRecords?.records?.length > 0) {
      const latestRecord = bodyFatRecords.records[
        bodyFatRecords.records.length - 1
      ] as any;
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
  } catch (error) {
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
