import { realTimeSyncService } from "../syncService";
import { enhancedLocalStorage } from "../localStorage";
import { DeviceConditionsMonitor } from "./device-conditions";
import { SyncDecisionEngine } from "./decision-engine";
import type {
  SchedulingConfig,
  SchedulingStats,
  SyncDecision,
  DeviceConditions,
  SyncDecisionCallback,
  ConditionsUpdateCallback,
  ScheduleWindow,
} from "./types";

export class IntelligentSyncScheduler {
  private config: SchedulingConfig;
  private stats: SchedulingStats;
  private isActive = false;
  private schedulingTimer: NodeJS.Timeout | null = null;
  private decisionCallbacks: SyncDecisionCallback[] = [];
  private conditionsCallbacks: ConditionsUpdateCallback[] = [];
  private deviceMonitor: DeviceConditionsMonitor;
  private decisionEngine: SyncDecisionEngine;

  constructor(config?: Partial<SchedulingConfig>) {
    this.config = {
      enableIntelligentScheduling: true,
      respectBatteryLevel: true,
      respectNetworkConditions: true,
      respectUserActivity: true,
      minBatteryLevel: 20,
      minConnectionScore: 50,
      userActivityThreshold: 5,
      priorityOverrides: {
        critical: true,
        highPriority: false,
      },
      scheduleWindows: [
        {
          name: "Night Sync",
          startHour: 2,
          endHour: 6,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          priority: "high",
          conditions: {
            requireWifi: true,
            requireCharging: true,
            maxBatteryDrain: 5,
          },
        },
        {
          name: "Lunch Break",
          startHour: 12,
          endHour: 14,
          daysOfWeek: [1, 2, 3, 4, 5],
          priority: "normal",
          conditions: {
            requireWifi: false,
            requireCharging: false,
            maxBatteryDrain: 10,
          },
        },
      ],
      ...config,
    };

    this.stats = {
      totalDecisions: 0,
      syncApproved: 0,
      syncDelayed: 0,
      syncDenied: 0,
      averageDelay: 0,
      conditionBreakdown: {
        batteryBlocks: 0,
        networkBlocks: 0,
        activityBlocks: 0,
        performanceBlocks: 0,
      },
    };

    this.deviceMonitor = new DeviceConditionsMonitor();
    this.decisionEngine = new SyncDecisionEngine(this.config, this.stats);
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      await this.loadStats();

      if (this.schedulingTimer) {
        clearInterval(this.schedulingTimer);
      }

      this.schedulingTimer = setInterval(() => {
        this.evaluateConditions();
      }, 30000);

      this.isActive = true;
    } catch (error) {
      console.error("Failed to start sync scheduler:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;

    if (this.schedulingTimer) {
      clearInterval(this.schedulingTimer);
      this.schedulingTimer = null;
    }

    await this.saveStats();
    this.isActive = false;
  }

  async makeSyncDecision(
    priority: "low" | "normal" | "high" | "critical" = "normal",
  ): Promise<SyncDecision> {
    const conditions = await this.getCurrentConditions();
    const decision = this.decisionEngine.evaluateSyncDecision(
      conditions,
      priority,
    );

    this.decisionEngine.updateStats(decision);
    this.notifyDecisionCallbacks(decision);

    return decision;
  }

  async getCurrentConditions(): Promise<DeviceConditions> {
    const conditions = await this.deviceMonitor.getCurrentConditions();
    this.notifyConditionsCallbacks(conditions);
    return conditions;
  }

  getOptimalSyncWindow(): ScheduleWindow | null {
    return this.decisionEngine.getOptimalSyncWindow(
      this.config.scheduleWindows,
    );
  }

  updateConfig(newConfig: Partial<SchedulingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getStats(): SchedulingStats {
    return { ...this.stats };
  }

  async resetStats(): Promise<void> {
    this.stats = {
      totalDecisions: 0,
      syncApproved: 0,
      syncDelayed: 0,
      syncDenied: 0,
      averageDelay: 0,
      conditionBreakdown: {
        batteryBlocks: 0,
        networkBlocks: 0,
        activityBlocks: 0,
        performanceBlocks: 0,
      },
    };
    await this.saveStats();
  }

  onSyncDecision(callback: SyncDecisionCallback): () => void {
    this.decisionCallbacks.push(callback);
    return () => {
      const index = this.decisionCallbacks.indexOf(callback);
      if (index > -1) {
        this.decisionCallbacks.splice(index, 1);
      }
    };
  }

  onConditionsUpdate(callback: ConditionsUpdateCallback): () => void {
    this.conditionsCallbacks.push(callback);
    return () => {
      const index = this.conditionsCallbacks.indexOf(callback);
      if (index > -1) {
        this.conditionsCallbacks.splice(index, 1);
      }
    };
  }

  private async evaluateConditions(): Promise<void> {
    if (!this.config.enableIntelligentScheduling) return;

    const conditions = await this.getCurrentConditions();
    const decision = await this.makeSyncDecision();

    if (decision.shouldSync && decision.confidence > 80) {
      const syncStatus = realTimeSyncService.getSyncStatus();
      if (syncStatus.queuedOperations > 0 && !syncStatus.isSyncing) {
        realTimeSyncService.startSync().catch(console.error);
      }
    }
  }

  private notifyDecisionCallbacks(decision: SyncDecision): void {
    this.decisionCallbacks.forEach((callback) => {
      try {
        callback(decision);
      } catch (error) {
        console.error("Error in decision callback:", error);
      }
    });
  }

  private notifyConditionsCallbacks(conditions: DeviceConditions): void {
    this.conditionsCallbacks.forEach((callback) => {
      try {
        callback(conditions);
      } catch (error) {
        console.error("Error in conditions callback:", error);
      }
    });
  }

  private async loadStats(): Promise<void> {
    try {
      const savedStats = await enhancedLocalStorage.getData<SchedulingStats>(
        "sync_scheduling_stats",
      );
      if (savedStats) {
        this.stats = savedStats;
      }
    } catch (error) {
      console.error("Failed to load scheduling stats:", error);
    }
  }

  private async saveStats(): Promise<void> {
    try {
      await enhancedLocalStorage.storeData("sync_scheduling_stats", this.stats);
    } catch (error) {
      console.error("Failed to save scheduling stats:", error);
    }
  }
}
