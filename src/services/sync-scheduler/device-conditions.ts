import { syncMonitoringService } from "../syncMonitoring";
import type {
  DeviceConditions,
  DevicePerformance,
  UserActivity,
} from "./types";

export class DeviceConditionsMonitor {
  async getCurrentConditions(): Promise<DeviceConditions> {
    const batteryLevel = await this.getBatteryLevel();
    const isCharging = await this.getChargingStatus();
    const networkType = await this.getNetworkType();
    const connectionHealth = syncMonitoringService.getConnectionHealth();
    const userActivity = await this.getUserActivity();
    const devicePerformance = await this.getDevicePerformance();

    return {
      batteryLevel,
      isCharging,
      networkType,
      connectionHealth,
      userActivity,
      devicePerformance,
    };
  }

  private async getBatteryLevel(): Promise<number> {
    return 75 + Math.random() * 25;
  }

  private async getChargingStatus(): Promise<boolean> {
    return Math.random() > 0.7;
  }

  private async getNetworkType(): Promise<DeviceConditions["networkType"]> {
    return Math.random() > 0.5 ? "wifi" : "cellular";
  }

  private async getUserActivity(): Promise<UserActivity> {
    const isActive = Math.random() > 0.6;
    const lastActivityTime = new Date(Date.now() - Math.random() * 600000);
    const inactivityDuration =
      (Date.now() - lastActivityTime.getTime()) / 60000;

    return {
      isActive,
      lastActivityTime,
      inactivityDuration,
      currentScreen: "HomeScreen",
      appInForeground: isActive,
    };
  }

  private async getDevicePerformance(): Promise<DevicePerformance> {
    return {
      cpuUsage: 20 + Math.random() * 40,
      memoryUsage: 30 + Math.random() * 40,
      storageAvailable: 1000 + Math.random() * 5000,
      thermalState: "normal",
    };
  }
}
