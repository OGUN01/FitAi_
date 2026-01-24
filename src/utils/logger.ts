/**
 * Logger Utility for FitAI
 *
 * Centralized logging utility that provides:
 * - Consistent log formatting
 * - Environment-aware logging (DEV vs PROD)
 * - Log levels (error, warn, info, debug)
 * - Structured logging with context
 *
 * ARCHITECTURE FIX (ARCH-009): Console Logging Instead of Logger
 *
 * Usage:
 * import { logger } from '../utils/logger';
 *
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch data', { error: err.message });
 *
 * TODO: In production, integrate with a real logging service like:
 * - Sentry
 * - LogRocket
 * - Datadog
 * - Firebase Crashlytics
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

// Configuration
const CONFIG = {
  // Only show debug logs in development
  minLevel: __DEV__ ? "debug" : "info",
  // Enable console output
  enableConsole: true,
  // Enable structured logging (JSON format)
  structuredLogging: false,
  // App identifier for logs
  appName: "FitAI",
};

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Emoji prefixes for log levels (DEV only)
const LOG_EMOJIS: Record<LogLevel, string> = {
  debug: "🔍",
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
};

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.minLevel as LogLevel];
}

/**
 * Format a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const emoji = __DEV__ ? LOG_EMOJIS[entry.level] + " " : "";
  const prefix = `[${CONFIG.appName}]`;
  const levelStr = entry.level.toUpperCase();

  let message = `${emoji}${prefix} ${levelStr}: ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    if (CONFIG.structuredLogging) {
      message += "\n" + JSON.stringify(entry.context, null, 2);
    } else {
      const contextStr = Object.entries(entry.context)
        .map(
          ([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`,
        )
        .join(", ");
      message += ` | ${contextStr}`;
    }
  }

  return message;
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
}

/**
 * Output log to console
 */
function outputLog(entry: LogEntry): void {
  if (!CONFIG.enableConsole) return;

  const formattedMessage = formatLogEntry(entry);

  switch (entry.level) {
    case "debug":
      console.debug(formattedMessage);
      break;
    case "info":
      console.info(formattedMessage);
      break;
    case "warn":
      console.warn(formattedMessage);
      break;
    case "error":
      console.error(formattedMessage);
      break;
  }
}

/**
 * Main logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;

  const entry = createLogEntry(level, message, context);
  outputLog(entry);

  // TODO: In production, send to external logging service
  // if (!__DEV__) {
  //   sendToLoggingService(entry);
  // }
}

/**
 * Logger object with level-specific methods
 */
export const logger = {
  /**
   * Debug level - verbose information for development
   */
  debug: (message: string, context?: LogContext): void => {
    log("debug", message, context);
  },

  /**
   * Info level - general information about app operation
   */
  info: (message: string, context?: LogContext): void => {
    log("info", message, context);
  },

  /**
   * Warn level - potentially problematic situations
   */
  warn: (message: string, context?: LogContext): void => {
    log("warn", message, context);
  },

  /**
   * Error level - errors that need attention
   */
  error: (message: string, context?: LogContext): void => {
    log("error", message, context);
  },

  /**
   * Log with explicit level
   */
  log: (level: LogLevel, message: string, context?: LogContext): void => {
    log(level, message, context);
  },

  /**
   * Create a scoped logger with a prefix
   */
  scope: (scopeName: string) => ({
    debug: (message: string, context?: LogContext) =>
      log("debug", `[${scopeName}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
      log("info", `[${scopeName}] ${message}`, context),
    warn: (message: string, context?: LogContext) =>
      log("warn", `[${scopeName}] ${message}`, context),
    error: (message: string, context?: LogContext) =>
      log("error", `[${scopeName}] ${message}`, context),
  }),

  /**
   * Log and return the error (useful for error handling chains)
   */
  errorAndReturn: <T extends Error>(error: T, context?: LogContext): T => {
    log("error", error.message, { ...context, stack: error.stack });
    return error;
  },

  /**
   * Configure the logger
   */
  configure: (options: Partial<typeof CONFIG>): void => {
    Object.assign(CONFIG, options);
  },
};

// Create scoped loggers for common modules
export const storeLogger = logger.scope("Store");
export const apiLogger = logger.scope("API");
export const authLogger = logger.scope("Auth");
export const analyticsLogger = logger.scope("Analytics");
export const healthLogger = logger.scope("Health");

export default logger;
