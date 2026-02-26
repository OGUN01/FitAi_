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
  }

  switchToNewSystem(): void {
    this.config.USE_NEW_SYSTEM = true;
  }

  switchToOldSystem(): void {
    this.config.USE_NEW_SYSTEM = true; // Always use new system
  }

  setShadowMode(enabled: boolean): void {
    this.config.SHADOW_MODE = false;
  }

  getConfig(): DataBridgeConfig {
    return { ...this.config };
  }
}
