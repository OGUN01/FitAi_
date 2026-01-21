/**
 * Logger Configuration
 *
 * Central configuration for the logging system.
 * Control log levels globally, per-module, and for production vs development.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Log level values for comparison
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Module-specific log levels
 * Add your modules here to control their log level independently
 */
export const MODULE_LEVELS: Record<string, LogLevel> = {
  // Core Services
  HealthConnect: "INFO",
  GoogleFit: "INFO",
  HealthKit: "INFO",
  SyncEngine: "INFO",
  DataBridge: "INFO",

  // Onboarding
  OnboardingService: "INFO",
  OnboardingState: "INFO",

  // AI & Recognition
  FoodRecognition: "INFO",
  ExerciseVisual: "INFO",
  WorkoutGeneration: "INFO",

  // Data Services
  FitnessStore: "INFO",
  NutritionStore: "INFO",
  CalorieCalculator: "INFO",

  // Screens
  DietScreen: "WARN",
  WorkoutScreen: "WARN",
  ProfileScreen: "WARN",

  // Test/Debug modules (can be verbose)
  GeminiTest: "DEBUG",
  TestUtils: "DEBUG",
};

/**
 * Main logging configuration
 */
export const LogConfig = {
  /**
   * Default log level for modules not specified in MODULE_LEVELS
   */
  defaultLevel: __DEV__ ? "DEBUG" : ("WARN" as LogLevel),

  /**
   * Module-specific log levels
   */
  moduleLevels: MODULE_LEVELS,

  /**
   * Whether to log INFO messages in production
   * Set to false to only log WARN and ERROR in production
   */
  logInfoInProduction: false,

  /**
   * Enable error reporting to external services (Sentry, Crashlytics, etc.)
   */
  enableErrorReporting: !__DEV__,

  /**
   * Enable console output in production
   * Useful for debugging production builds locally
   */
  enableConsoleInProduction: false,

  /**
   * Maximum number of log entries to keep in memory
   * Set to 0 to disable in-memory logging
   */
  maxLogEntries: __DEV__ ? 1000 : 100,

  /**
   * Enable performance logging (timing operations)
   */
  enablePerformanceLogging: __DEV__,

  /**
   * Enable structured logging (adds metadata to all logs)
   */
  enableStructuredLogging: true,
};

/**
 * Update module log level at runtime
 */
export function setModuleLogLevel(moduleName: string, level: LogLevel): void {
  MODULE_LEVELS[moduleName] = level;
}

/**
 * Get module log level
 */
export function getModuleLogLevel(moduleName: string): LogLevel {
  return MODULE_LEVELS[moduleName] || LogConfig.defaultLevel;
}

/**
 * Enable debug mode for a module (sets level to DEBUG)
 */
export function enableDebugMode(moduleName: string): void {
  setModuleLogLevel(moduleName, "DEBUG");
}

/**
 * Disable debug mode for a module (sets level to INFO)
 */
export function disableDebugMode(moduleName: string): void {
  setModuleLogLevel(moduleName, "INFO");
}

/**
 * Enable verbose logging for all modules
 */
export function enableVerboseLogging(): void {
  LogConfig.defaultLevel = "DEBUG";
  LogConfig.logInfoInProduction = true;
}

/**
 * Disable verbose logging (production mode)
 */
export function disableVerboseLogging(): void {
  LogConfig.defaultLevel = "WARN";
  LogConfig.logInfoInProduction = false;
}

/**
 * Production-optimized configuration
 */
export const ProductionConfig = {
  defaultLevel: "WARN" as LogLevel,
  moduleLevels: MODULE_LEVELS,
  logInfoInProduction: false,
  enableErrorReporting: true,
  enableConsoleInProduction: false,
  maxLogEntries: 100,
  enablePerformanceLogging: false,
  enableStructuredLogging: true,
};

/**
 * Development-optimized configuration
 */
export const DevelopmentConfig = {
  defaultLevel: "DEBUG" as LogLevel,
  moduleLevels: MODULE_LEVELS,
  logInfoInProduction: true,
  enableErrorReporting: false,
  enableConsoleInProduction: true,
  maxLogEntries: 1000,
  enablePerformanceLogging: true,
  enableStructuredLogging: true,
};

// Export default configuration
export default LogConfig;
