/**
 * Centralized Logging Service for FitAI
 *
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Automatic __DEV__ wrapping for development-only logs
 * - Production-safe error reporting hooks
 * - Structured logging with metadata
 * - Module-specific log level control
 * - File/function/line tracking
 * - Integration ready for Sentry/Crashlytics
 *
 * Usage:
 *   import { Logger } from '@/services/logging/Logger';
 *
 *   const logger = new Logger('MyModule');
 *   logger.debug('Debug message', { extra: 'data' });
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */

import { LogConfig, LOG_LEVELS } from "./config";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogMetadata {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  metadata?: LogMetadata;
  error?: Error;
  stackTrace?: string;
}

/**
 * Error reporting callback type
 * Integrate with services like Sentry, Crashlytics, etc.
 */
export type ErrorReporter = (error: Error, context: LogEntry) => void;

/**
 * Log handler callback type
 * For custom log processing (e.g., writing to file, remote logging)
 */
export type LogHandler = (entry: LogEntry) => void;

class LoggerService {
  private errorReporters: ErrorReporter[] = [];
  private logHandlers: LogHandler[] = [];
  private config = LogConfig;

  /**
   * Register an error reporting service (e.g., Sentry)
   */
  registerErrorReporter(reporter: ErrorReporter): void {
    this.errorReporters.push(reporter);
  }

  /**
   * Register a custom log handler
   */
  registerLogHandler(handler: LogHandler): void {
    this.logHandlers.push(handler);
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<typeof LogConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Report error to registered error reporting services
   */
  private reportError(error: Error, context: LogEntry): void {
    if (!this.config.enableErrorReporting) {
      return;
    }

    this.errorReporters.forEach((reporter) => {
      try {
        reporter(error, context);
      } catch (e) {
        // Fail silently to avoid infinite loops
        console.error("[Logger] Error in error reporter:", e);
      }
    });
  }

  /**
   * Process log entry through registered handlers
   */
  private processLogEntry(entry: LogEntry): void {
    this.logHandlers.forEach((handler) => {
      try {
        handler(entry);
      } catch (e) {
        // Fail silently to avoid infinite loops
        console.error("[Logger] Error in log handler:", e);
      }
    });
  }

  /**
   * Create a logger instance for a specific module
   */
  createLogger(moduleName: string): Logger {
    return new Logger(moduleName);
  }

  /**
   * Check if a log level should be logged for a module
   */
  shouldLog(moduleName: string, level: LogLevel): boolean {
    // Get module-specific level or default
    const moduleLevel =
      this.config.moduleLevels[moduleName] || this.config.defaultLevel;
    const levelValue = LOG_LEVELS[level];
    const thresholdValue = LOG_LEVELS[moduleLevel];

    return levelValue >= thresholdValue;
  }

  /**
   * Internal log method
   */
  log(
    moduleName: string,
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): void {
    // Check if we should log this
    if (!this.shouldLog(moduleName, level)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module: moduleName,
      message,
      metadata,
      error,
      stackTrace: error?.stack,
    };

    // Process through handlers
    this.processLogEntry(entry);

    // Report errors to error reporting services
    if (error && level === "ERROR") {
      this.reportError(error, entry);
    }

    // Console output based on level
    this.consoleOutput(entry);
  }

  /**
   * Output to console with appropriate formatting
   */
  private consoleOutput(entry: LogEntry): void {
    const { timestamp, level, module, message, metadata, error } = entry;
    const time = timestamp.toISOString().split("T")[1].split(".")[0];
    const prefix = `[${time}] [${level}] [${module}]`;

    switch (level) {
      case "DEBUG":
        if (__DEV__) {
          console.log(`${prefix} ${message}`, metadata || "");
        }
        break;

      case "INFO":
        if (__DEV__ || this.config.logInfoInProduction) {
          console.log(`${prefix} ${message}`, metadata || "");
        }
        break;

      case "WARN":
        console.warn(`${prefix} ${message}`, metadata || "");
        break;

      case "ERROR":
        console.error(`${prefix} ${message}`, metadata || "", error || "");
        break;
    }
  }
}

/**
 * Logger class for specific modules
 */
export class Logger {
  private moduleName: string;
  private static instance = new LoggerService();

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Get the global logger service instance
   */
  static getService(): LoggerService {
    return Logger.instance;
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (__DEV__) {
      Logger.instance.log(this.moduleName, "DEBUG", message, metadata);
    }
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: LogMetadata): void {
    Logger.instance.log(this.moduleName, "INFO", message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    Logger.instance.log(this.moduleName, "WARN", message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    Logger.instance.log(this.moduleName, "ERROR", message, metadata, error);
  }

  /**
   * Create a child logger with a sub-module name
   */
  child(subModule: string): Logger {
    return new Logger(`${this.moduleName}.${subModule}`);
  }

  /**
   * Create a scoped logger for a specific function/operation
   */
  scope(scopeName: string): ScopedLogger {
    return new ScopedLogger(this.moduleName, scopeName);
  }
}

/**
 * Scoped logger for tracking operations with timing
 */
class ScopedLogger extends Logger {
  private startTime: number;
  private scopeName: string;

  constructor(moduleName: string, scopeName: string) {
    super(`${moduleName}.${scopeName}`);
    this.scopeName = scopeName;
    this.startTime = Date.now();
  }

  /**
   * Log operation start
   */
  start(message?: string, metadata?: LogMetadata): void {
    this.debug(`[START] ${message || this.scopeName}`, metadata);
  }

  /**
   * Log operation completion with duration
   */
  end(message?: string, metadata?: LogMetadata): void {
    const duration = Date.now() - this.startTime;
    this.debug(`[END] ${message || this.scopeName} (${duration}ms)`, {
      ...metadata,
      duration,
    });
  }

  /**
   * Log operation success with duration
   */
  success(message?: string, metadata?: LogMetadata): void {
    const duration = Date.now() - this.startTime;
    this.info(`[SUCCESS] ${message || this.scopeName} (${duration}ms)`, {
      ...metadata,
      duration,
    });
  }

  /**
   * Log operation failure with duration
   */
  failure(message: string, error?: Error, metadata?: LogMetadata): void {
    const duration = Date.now() - this.startTime;
    this.error(`[FAILURE] ${message}`, error, {
      ...metadata,
      duration,
    });
  }
}

/**
 * Create a logger instance for a module
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}

/**
 * Get the global logger service
 */
export function getLoggerService(): LoggerService {
  return Logger.getService();
}

// Default export
export default Logger;
