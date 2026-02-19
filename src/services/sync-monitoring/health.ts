import { ConnectionHealth, NetworkStats } from "./types";
import { enhancedLocalStorage } from "../localStorage";

export class HealthMonitor {
  private connectionHistory: ConnectionHealth[] = [];
  private healthCallbacks: ((health: ConnectionHealth) => void)[] = [];

  getConnectionHealth(networkStats: NetworkStats): ConnectionHealth {
    const latency = networkStats.latency;
    const bandwidth = networkStats.bandwidth;
    const signalStrength = networkStats.signalStrength;

    const recentHistory = this.connectionHistory.slice(-10);
    const stability =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, h) => sum + h.score, 0) /
          recentHistory.length
        : 50;

    const factors = {
      latency: this.scoreLatency(latency),
      bandwidth: this.scoreBandwidth(bandwidth),
      stability,
      signalStrength,
    };

    const score =
      (factors.latency +
        factors.bandwidth +
        factors.stability +
        factors.signalStrength) /
      4;
    const status = this.getHealthStatus(score);
    const recommendations = this.generateRecommendations(factors);

    const health: ConnectionHealth = {
      status,
      score,
      factors,
      recommendations,
    };

    this.connectionHistory.push(health);
    this.notifyHealthCallbacks(health);

    return health;
  }

  getConnectionHistory(limit = 50): ConnectionHealth[] {
    return this.connectionHistory.slice(-limit);
  }

  getSignalStrength(quality: string): number {
    switch (quality) {
      case "excellent":
        return 100;
      case "good":
        return 80;
      case "poor":
        return 40;
      case "offline":
        return 0;
      default:
        return 60;
    }
  }

  cleanupHistory(): void {
    if (this.connectionHistory.length > 100) {
      this.connectionHistory = this.connectionHistory.slice(-100);
    }
  }

  resetHistory(): void {
    this.connectionHistory = [];
  }

  onHealthUpdate(callback: (health: ConnectionHealth) => void): () => void {
    this.healthCallbacks.push(callback);
    return () => {
      const index = this.healthCallbacks.indexOf(callback);
      if (index > -1) {
        this.healthCallbacks.splice(index, 1);
      }
    };
  }

  async loadHistory(): Promise<void> {
    try {
      const savedHealth = await enhancedLocalStorage.getData<
        ConnectionHealth[]
      >("connection_health_history");
      if (savedHealth) {
        this.connectionHistory = savedHealth;
      }
    } catch (error) {
      console.error("Failed to load connection health history:", error);
    }
  }

  async saveHistory(): Promise<void> {
    try {
      await enhancedLocalStorage.storeData(
        "connection_health_history",
        this.connectionHistory,
      );
    } catch (error) {
      console.error("Failed to save connection health history:", error);
    }
  }

  private scoreLatency(latency: number): number {
    if (latency < 50) return 100;
    if (latency < 100) return 80;
    if (latency < 200) return 60;
    if (latency < 500) return 40;
    return 20;
  }

  private scoreBandwidth(bandwidth: number): number {
    if (bandwidth > 50) return 100;
    if (bandwidth > 25) return 80;
    if (bandwidth > 10) return 60;
    if (bandwidth > 5) return 40;
    return 20;
  }

  private getHealthStatus(score: number): ConnectionHealth["status"] {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "fair";
    if (score >= 30) return "poor";
    return "offline";
  }

  private generateRecommendations(
    factors: ConnectionHealth["factors"],
  ): string[] {
    const recommendations: string[] = [];

    if (factors.latency < 50) {
      recommendations.push(
        "High latency detected. Consider switching to a faster network.",
      );
    }

    if (factors.bandwidth < 50) {
      recommendations.push(
        "Low bandwidth detected. Sync may be slower than usual.",
      );
    }

    if (factors.stability < 70) {
      recommendations.push(
        "Unstable connection detected. Consider enabling background sync.",
      );
    }

    if (factors.signalStrength < 50) {
      recommendations.push(
        "Weak signal strength. Move closer to your router or cell tower.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Connection is optimal for syncing.");
    }

    return recommendations;
  }

  private notifyHealthCallbacks(health: ConnectionHealth): void {
    this.healthCallbacks.forEach((callback) => {
      try {
        callback(health);
      } catch (error) {
        console.error("Error in health callback:", error);
      }
    });
  }
}
