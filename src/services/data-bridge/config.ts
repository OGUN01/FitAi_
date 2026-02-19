/**
 * DataBridge Configuration
 * Configuration methods for the DataBridge module
 */

import { DataBridgeConfig } from "./types";

/**
 * Creates the default configuration
 */
export function createDefaultConfig(): DataBridgeConfig {
  return {
    USE_NEW_SYSTEM: true,
    SHADOW_MODE: false,
  };
}

/**
 * Configuration management class
 */
export class ConfigManager {
  private config: DataBridgeConfig;

  constructor() {
    this.config = createDefaultConfig();
    console.log(
      "[DataBridge] Initialized - Using NEW architecture only (old system removed)",
    );
  }

  switchToNewSystem(): void {
    console.log("[DataBridge] Already using NEW system (old system removed)");
    this.config.USE_NEW_SYSTEM = true;
  }

  switchToOldSystem(): void {
    console.log(
      "[DataBridge] WARNING: Old system has been removed. Using new system.",
    );
    this.config.USE_NEW_SYSTEM = true; // Always use new system
  }

  setShadowMode(enabled: boolean): void {
    console.log(
      `[DataBridge] Shadow mode no longer available (old system removed)`,
    );
    this.config.SHADOW_MODE = false;
  }

  getConfig(): DataBridgeConfig {
    return { ...this.config };
  }
}
