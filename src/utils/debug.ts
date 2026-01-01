/**
 * Debug Logger Utility
 *
 * Provides conditional logging that only outputs in development mode.
 * In production, only errors are logged to avoid performance overhead
 * and prevent sensitive information leaks.
 *
 * Usage:
 *   import { logger } from '@/utils/debug';
 *   logger.log('Debug message');
 *   logger.warn('Warning message');
 *   logger.error('Error message'); // Always logged
 */

const DEBUG = __DEV__;

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: any[]) => {
    if (DEBUG) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: any[]) => {
    if (DEBUG) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: any[]) => {
    if (DEBUG) {
      console.info(...args);
    }
  },

  /**
   * Group related logs together (only in development)
   */
  group: (label: string) => {
    if (DEBUG) {
      console.group(label);
    }
  },

  /**
   * End a log group (only in development)
   */
  groupEnd: () => {
    if (DEBUG) {
      console.groupEnd();
    }
  },

  /**
   * Log with table formatting (only in development)
   */
  table: (data: any) => {
    if (DEBUG) {
      console.table(data);
    }
  },
};

/**
 * Performance timing utility
 */
export const perfLogger = {
  timers: new Map<string, number>(),

  start: (label: string) => {
    if (DEBUG) {
      perfLogger.timers.set(label, Date.now());
      logger.log(`⏱️ [PERF] ${label} - started`);
    }
  },

  end: (label: string) => {
    if (DEBUG) {
      const startTime = perfLogger.timers.get(label);
      if (startTime) {
        const duration = Date.now() - startTime;
        logger.log(`⏱️ [PERF] ${label} - completed in ${duration}ms`);
        perfLogger.timers.delete(label);
      } else {
        logger.warn(`⏱️ [PERF] ${label} - no start time found`);
      }
    }
  },
};

export default logger;
