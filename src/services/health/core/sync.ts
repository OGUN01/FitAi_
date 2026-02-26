import { HealthConnectData, HealthConnectSyncResult } from "../types";
import { syncAllMetrics, SyncContext } from "../syncHelpers";
import { EXCLUDED_RAW_SOURCES } from "./types";

export class SyncManager {
  async syncHealthData(
    daysBack: number,
    readRecords: any,
    aggregateRecord: any,
  ): Promise<HealthConnectSyncResult> {
    const startTime = Date.now();

    try {

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const healthData: HealthConnectData = {
        sources: {},
        dataOrigins: [],
        metadata: {
          isPartial: false,
          failedMetrics: [],
          isFallback: false,
          estimatedMetrics: [],
        },
      };

      const allDataOrigins = new Set<string>();

      const ctx: SyncContext = {
        healthData,
        allDataOrigins,
        excludedRawSources: EXCLUDED_RAW_SOURCES,
        aggregateRecord,
        readRecords,
        startDate,
        endDate,
        todayStart,
      };

      await syncAllMetrics(ctx);

      healthData.dataOrigins = Array.from(allDataOrigins);
      healthData.lastSyncDate = endDate.toISOString();

      const syncTime = Date.now() - startTime;

      return {
        success: true,
        data: healthData,
        syncTime,
        partial: healthData.metadata?.isPartial,
      };
    } catch (error) {
      console.error("❌ Health Connect sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
        syncTime: Date.now() - startTime,
      };
    }
  }
}
