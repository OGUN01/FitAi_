import Constants from "expo-constants";
import { Platform } from "react-native";

export interface EnvironmentInfo {
  type: "development" | "preview" | "production" | "testing";
  isDevelopment: boolean;
  isProduction: boolean;
  isTesting: boolean;
  isEmulator: boolean;
  buildType: "debug" | "release" | "unknown";
  appVersion: string;
  bundleIdentifier: string;
  platform: "ios" | "android" | "web";
}

/**
 * Comprehensive environment detection for FitAI
 * Determines build type, environment, and device characteristics
 */
export class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private cachedInfo: EnvironmentInfo | null = null;

  private constructor() {}

  static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  /**
   * Get comprehensive environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const environmentInfo: EnvironmentInfo = {
      type: this.detectEnvironmentType(),
      isDevelopment: this.isDevelopmentEnvironment(),
      isProduction: this.isProductionEnvironment(),
      isTesting: this.isTestingEnvironment(),
      isEmulator: this.isEmulatorEnvironment(),
      buildType: this.detectBuildType(),
      appVersion: this.getAppVersion(),
      bundleIdentifier: this.getBundleIdentifier(),
      platform: Platform.OS as "ios" | "android" | "web",
    };

    this.cachedInfo = environmentInfo;

    // Log environment info for debugging
    console.log("🔍 Environment Detection:", {
      type: environmentInfo.type,
      buildType: environmentInfo.buildType,
      isEmulator: environmentInfo.isEmulator,
      appVersion: environmentInfo.appVersion,
      bundleId: environmentInfo.bundleIdentifier,
    });

    return environmentInfo;
  }

  /**
   * Detect the primary environment type
   */
  private detectEnvironmentType():
    | "development"
    | "preview"
    | "production"
    | "testing" {
    // Check if we're in Expo development mode
    if (__DEV__) {
      return "development";
    }

    // Check if we're running tests
    if (this.isTestingEnvironment()) {
      return "testing";
    }

    // Check environment variables
    const envType = this.getEnvVar("EXPO_PUBLIC_ENVIRONMENT");
    if (envType) {
      switch (envType.toLowerCase()) {
        case "development":
        case "dev":
          return "development";
        case "preview":
        case "staging":
          return "preview";
        case "production":
        case "prod":
          return "production";
      }
    }

    // Check build configuration
    const buildType = this.detectBuildType();
    if (buildType === "debug") {
      return "development";
    }

    // Check bundle identifier for environment indicators
    const bundleId = this.getBundleIdentifier();
    if (bundleId.includes(".debug") || bundleId.includes(".dev")) {
      return "development";
    }
    if (bundleId.includes(".preview") || bundleId.includes(".staging")) {
      return "preview";
    }

    // Default to production for release builds
    return "production";
  }

  /**
   * Check if we're in development environment
   */
  private isDevelopmentEnvironment(): boolean {
    return (
      __DEV__ ||
      this.getEnvVar("EXPO_PUBLIC_ENVIRONMENT") === "development" ||
      this.detectBuildType() === "debug"
    );
  }

  /**
   * Check if we're in production environment
   */
  private isProductionEnvironment(): boolean {
    return (
      !__DEV__ &&
      this.getEnvVar("EXPO_PUBLIC_ENVIRONMENT") === "production" &&
      this.detectBuildType() === "release"
    );
  }

  /**
   * Check if we're running tests
   */
  private isTestingEnvironment(): boolean {
    return (
      typeof jest !== "undefined" ||
      process.env.NODE_ENV === "test" ||
      this.getEnvVar("EXPO_PUBLIC_ENVIRONMENT") === "test"
    );
  }

  /**
   * Check if we're running on an emulator/simulator
   */
  private isEmulatorEnvironment(): boolean {
    if (Platform.OS === "android") {
      // Android emulator detection
      return (
        Constants.platform?.android?.manufacturer === "Google" ||
        Constants.deviceName?.toLowerCase()?.includes("emulator") ||
        Constants.deviceName?.toLowerCase()?.includes("simulator") ||
        // Common emulator model names
        Constants.deviceName?.includes("sdk_gphone") ||
        Constants.deviceName?.includes("Android SDK") ||
        false
      );
    } else if (Platform.OS === "ios") {
      // iOS simulator detection
      return (
        Constants.platform?.ios?.simulator === true ||
        Constants.deviceName?.toLowerCase()?.includes("simulator") ||
        Constants.deviceModel?.toLowerCase()?.includes("simulator") ||
        false
      );
    }

    return false;
  }

  /**
   * Detect build type (debug vs release)
   */
  private detectBuildType(): "debug" | "release" | "unknown" {
    // Check if we're in development mode
    if (__DEV__) {
      return "debug";
    }

    // Check bundle identifier
    const bundleId = this.getBundleIdentifier();
    if (bundleId.includes(".debug")) {
      return "debug";
    }

    // Check environment variables
    const buildType = this.getEnvVar("EXPO_PUBLIC_BUILD_TYPE");
    if (buildType === "debug" || buildType === "release") {
      return buildType as "debug" | "release";
    }

    // Check if Metro bundler is connected (development)
    try {
      if (typeof (global as any).__METRO_GLOBAL_PREFIX__ !== "undefined") {
        return "debug";
      }
    } catch {
      // Metro prefix check failed, continue
    }

    // Default assumption for non-dev builds
    return "release";
  }

  /**
   * Get app version
   */
  private getAppVersion(): string {
    return (
      Constants.expoConfig?.version ||
      this.getEnvVar("EXPO_PUBLIC_APP_VERSION") ||
      "1.0.0"
    );
  }

  /**
   * Get bundle identifier
   */
  private getBundleIdentifier(): string {
    return (
      Constants.expoConfig?.slug ||
      (Platform.OS === "android" ? "com.fitai.app" : "com.fitai.fitai")
    );
  }

  /**
   * Get environment variable with multiple fallback strategies
   */
  private getEnvVar(key: string): string | null {
    try {
      // Strategy 1: Direct process.env access (development)
      if (process.env[key]) {
        return process.env[key];
      }

      // Strategy 2: Constants.expoConfig access
      const expoConfigValue = (Constants.expoConfig as any)?.[key];
      if (expoConfigValue) {
        return expoConfigValue;
      }

      // Strategy 3: Constants.expoConfig.extra access (production)
      const extraValue = (Constants.expoConfig as any)?.extra?.[key];
      if (extraValue) {
        return extraValue;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get human-readable environment description
   */
  getEnvironmentDescription(): string {
    const info = this.getEnvironmentInfo();

    let description = `${info.type.charAt(0).toUpperCase()}${info.type.slice(1)} Environment`;

    if (info.buildType !== "unknown") {
      description += ` (${info.buildType})`;
    }

    if (info.isEmulator) {
      description += ` - ${info.platform === "android" ? "Emulator" : "Simulator"}`;
    }

    return description;
  }

  /**
   * Check if Health Connect production issues are expected
   */
  shouldExpectHealthConnectProductionIssues(): boolean {
    const info = this.getEnvironmentInfo();

    // Production APKs have the permission registration issue
    return (
      info.type === "production" &&
      info.buildType === "release" &&
      info.platform === "android"
    );
  }

  /**
   * Get appropriate Health Connect error message based on environment
   */
  getHealthConnectErrorMessage(
    hasPermissions: boolean,
    hasRealData: boolean,
  ): string {
    const info = this.getEnvironmentInfo();

    if (info.isDevelopment) {
      // Development-friendly technical message
      return (
        `🔧 Development Build Status:\n` +
        `Environment: ${this.getEnvironmentDescription()}\n` +
        `Permissions: ${hasPermissions ? "✅ Granted" : "❌ Denied"}\n` +
        `Data Sources: ${hasRealData ? "✅ Available" : "❌ None found"}\n\n` +
        `${!hasPermissions ? "Need to grant Health Connect permissions.\n" : ""}` +
        `${hasPermissions && !hasRealData ? "Need to install health apps (Samsung Health, Google Fit).\n" : ""}` +
        `Check logs for detailed technical information.`
      );
    } else {
      // User-friendly production message
      if (!hasPermissions) {
        return (
          `📱 Health Connect Setup Required\n\n` +
          `FitAI needs permissions to access your health data.\n\n` +
          `Please follow the setup guide to enable health tracking.`
        );
      } else if (!hasRealData) {
        return (
          `💪 Health Data Sources Needed\n\n` +
          `Health Connect is connected but no health data was found.\n\n` +
          `Install Samsung Health, Google Fit, or other health apps to start tracking.`
        );
      } else {
        return `✅ Health Connect Ready\n\nYour health data is connected and available!`;
      }
    }
  }

  /**
   * Should show technical debugging information
   */
  shouldShowTechnicalDetails(): boolean {
    const info = this.getEnvironmentInfo();
    return info.isDevelopment || info.type === "testing";
  }

  /**
   * Reset cached environment info (for testing)
   */
  resetCache(): void {
    this.cachedInfo = null;
  }
}

// Singleton instance
export const environmentDetector = EnvironmentDetector.getInstance();

// Convenience exports
export const getEnvironmentInfo = () =>
  environmentDetector.getEnvironmentInfo();
export const isDevelopment = () =>
  environmentDetector.getEnvironmentInfo().isDevelopment;
export const isProduction = () =>
  environmentDetector.getEnvironmentInfo().isProduction;
export const isEmulator = () =>
  environmentDetector.getEnvironmentInfo().isEmulator;
export const shouldExpectHealthConnectIssues = () =>
  environmentDetector.shouldExpectHealthConnectProductionIssues();
export const getHealthConnectErrorMessage = (
  hasPermissions: boolean,
  hasRealData: boolean,
) =>
  environmentDetector.getHealthConnectErrorMessage(hasPermissions, hasRealData);
