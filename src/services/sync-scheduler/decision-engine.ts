import type {
  DeviceConditions,
  SchedulingConfig,
  SchedulingStats,
  SyncDecision,
  ScheduleWindow,
} from "./types";

export class SyncDecisionEngine {
  constructor(
    private config: SchedulingConfig,
    private stats: SchedulingStats,
  ) {}

  evaluateSyncDecision(
    conditions: DeviceConditions,
    priority: string,
  ): SyncDecision {
    const decision: SyncDecision = {
      shouldSync: true,
      reason: "",
      confidence: 100,
      suggestedDelay: 0,
      conditions: {
        battery: "good",
        network: "good",
        activity: "good",
        performance: "good",
      },
      recommendations: [],
    };

    const reasons: string[] = [];
    let confidence = 100;

    if (priority === "critical" && this.config.priorityOverrides.critical) {
      decision.reason = "Critical priority override";
      return decision;
    }

    if (this.config.respectBatteryLevel) {
      if (
        conditions.batteryLevel < this.config.minBatteryLevel &&
        !conditions.isCharging
      ) {
        decision.shouldSync = false;
        decision.conditions.battery = "poor";
        reasons.push(`Battery level too low (${conditions.batteryLevel}%)`);
        confidence -= 30;
        this.stats.conditionBreakdown.batteryBlocks++;
      } else if (conditions.batteryLevel < this.config.minBatteryLevel * 1.5) {
        decision.conditions.battery = "acceptable";
        confidence -= 10;
        decision.recommendations.push(
          "Consider charging device for optimal sync performance",
        );
      }
    }

    if (this.config.respectNetworkConditions) {
      if (conditions.connectionHealth.score < this.config.minConnectionScore) {
        decision.shouldSync = false;
        decision.conditions.network = "poor";
        reasons.push(
          `Network quality too poor (${conditions.connectionHealth.score}/100)`,
        );
        confidence -= 25;
        this.stats.conditionBreakdown.networkBlocks++;
      } else if (
        conditions.connectionHealth.score <
        this.config.minConnectionScore * 1.2
      ) {
        decision.conditions.network = "acceptable";
        confidence -= 10;
        decision.recommendations.push(
          "Network quality is marginal, sync may be slower",
        );
      }
    }

    if (this.config.respectUserActivity) {
      if (
        conditions.userActivity.isActive &&
        conditions.userActivity.appInForeground
      ) {
        decision.conditions.activity = "poor";
        confidence -= 15;
        decision.suggestedDelay = 60000;
        decision.recommendations.push("User is active, consider delaying sync");
      } else if (
        conditions.userActivity.inactivityDuration <
        this.config.userActivityThreshold
      ) {
        decision.conditions.activity = "acceptable";
        confidence -= 5;
      }
    }

    if (
      conditions.devicePerformance.cpuUsage > 80 ||
      conditions.devicePerformance.memoryUsage > 90
    ) {
      decision.conditions.performance = "poor";
      confidence -= 20;
      decision.suggestedDelay = 120000;
      decision.recommendations.push(
        "Device under high load, consider delaying sync",
      );
      this.stats.conditionBreakdown.performanceBlocks++;
    } else if (
      conditions.devicePerformance.cpuUsage > 60 ||
      conditions.devicePerformance.memoryUsage > 70
    ) {
      decision.conditions.performance = "acceptable";
      confidence -= 5;
    }

    decision.confidence = Math.max(0, confidence);
    decision.reason = decision.shouldSync
      ? `Sync approved with ${decision.confidence}% confidence`
      : reasons.join(", ");

    if (!decision.shouldSync) {
      decision.suggestedDelay = Math.max(decision.suggestedDelay, 300000);
    }

    return decision;
  }

  getOptimalSyncWindow(
    scheduleWindows: ScheduleWindow[],
  ): ScheduleWindow | null {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const activeWindows = scheduleWindows.filter((window) => {
      const isInTimeRange =
        currentHour >= window.startHour && currentHour < window.endHour;
      const isInDayRange = window.daysOfWeek.includes(currentDay);
      return isInTimeRange && isInDayRange;
    });

    return (
      activeWindows.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })[0] || null
    );
  }

  updateStats(decision: SyncDecision): void {
    this.stats.totalDecisions++;

    if (decision.shouldSync) {
      this.stats.syncApproved++;
    } else if (decision.suggestedDelay > 0) {
      this.stats.syncDelayed++;
      this.stats.averageDelay =
        (this.stats.averageDelay * (this.stats.syncDelayed - 1) +
          decision.suggestedDelay) /
        this.stats.syncDelayed;
    } else {
      this.stats.syncDenied++;
    }
  }
}
