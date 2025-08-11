/**
 * Enhanced Error Handling and Logging Utilities
 * Provides comprehensive error management for production-ready applications
 */

import { Alert } from 'react-native';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  AUTHENTICATION = 'AUTHENTICATION',
  MIGRATION = 'MIGRATION',
  SYNC = 'SYNC',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  stack?: string;
  timestamp: string;
  userId?: string;
  context?: Record<string, any>;
  retryable: boolean;
  userFriendlyMessage: string;
}

// ============================================================================
// ERROR LOGGER
// ============================================================================

class ErrorLogger {
  private errors: AppError[] = [];
  private maxErrors: number = 100;
  private isEnabled: boolean = true;

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  log(error: Partial<AppError> & { message: string; type: ErrorType }): AppError {
    if (!this.isEnabled) {
      return error as AppError;
    }

    const appError: AppError = {
      id: this.generateErrorId(),
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date().toISOString(),
      retryable: false,
      userFriendlyMessage: this.generateUserFriendlyMessage(error.type, error.message),
      ...error,
    };

    // Add to error log
    this.errors.unshift(appError);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (__DEV__) {
      this.logToConsole(appError);
    }

    // Log to crash reporting service in production
    if (!__DEV__) {
      this.logToCrashlytics(appError);
    }

    return appError;
  }

  getErrors(): AppError[] {
    return [...this.errors];
  }

  getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter((error) => error.type === type);
  }

  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter((error) => error.severity === severity);
  }

  clearErrors() {
    this.errors = [];
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserFriendlyMessage(type: ErrorType, message: string): string {
    const friendlyMessages: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: 'Please check your input and try again.',
      [ErrorType.NETWORK]: 'Please check your internet connection and try again.',
      [ErrorType.STORAGE]: 'There was a problem saving your data. Please try again.',
      [ErrorType.AUTHENTICATION]: 'Please log in again to continue.',
      [ErrorType.MIGRATION]: 'There was a problem syncing your data. Please try again.',
      [ErrorType.SYNC]:
        'Your data could not be synced. Please try again when you have a stable connection.',
      [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.',
    };

    return friendlyMessages[type] || friendlyMessages[ErrorType.UNKNOWN];
  }

  private logToConsole(error: AppError) {
    const emoji = this.getSeverityEmoji(error.severity);
    console.group(`${emoji} ${error.type} Error - ${error.severity}`);
    console.error('Message:', error.message);
    console.error('User Message:', error.userFriendlyMessage);
    if (error.details) console.error('Details:', error.details);
    if (error.context) console.error('Context:', error.context);
    if (error.stack) console.error('Stack:', error.stack);
    console.error('Timestamp:', error.timestamp);
    console.error('Retryable:', error.retryable);
    console.groupEnd();
  }

  private logToCrashlytics(error: AppError) {
    // In a real app, you would integrate with Firebase Crashlytics or similar
    console.log('📊 Logging to crash reporting service:', error.id);
  }

  private getSeverityEmoji(severity: ErrorSeverity): string {
    const emojis: Record<ErrorSeverity, string> = {
      [ErrorSeverity.LOW]: '💡',
      [ErrorSeverity.MEDIUM]: '⚠️',
      [ErrorSeverity.HIGH]: '🚨',
      [ErrorSeverity.CRITICAL]: '💥',
    };
    return emojis[severity];
  }
}

export const errorLogger = new ErrorLogger();

// ============================================================================
// ERROR HANDLERS
// ============================================================================

export class ErrorHandler {
  static handle(error: Error | AppError, context?: Record<string, any>): AppError {
    let appError: AppError;

    if ('type' in error && 'severity' in error) {
      // Already an AppError
      appError = error as AppError;
    } else {
      // Convert regular Error to AppError
      appError = this.convertToAppError(error as Error, context);
    }

    // Log the error
    errorLogger.log(appError);

    return appError;
  }

  static handleWithAlert(error: Error | AppError, context?: Record<string, any>): AppError {
    const appError = this.handle(error, context);

    // Show user-friendly alert for high severity errors
    if (appError.severity === ErrorSeverity.HIGH || appError.severity === ErrorSeverity.CRITICAL) {
      Alert.alert('Error', appError.userFriendlyMessage, [{ text: 'OK' }]);
    }

    return appError;
  }

  static handleWithRetry(
    error: Error | AppError,
    retryCallback: () => void,
    context?: Record<string, any>
  ): AppError {
    const appError = this.handle(error, context);

    if (appError.retryable) {
      Alert.alert('Error', appError.userFriendlyMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: retryCallback },
      ]);
    } else {
      Alert.alert('Error', appError.userFriendlyMessage, [{ text: 'OK' }]);
    }

    return appError;
  }

  private static convertToAppError(error: Error, context?: Record<string, any>): AppError {
    const type = this.inferErrorType(error);
    const severity = this.inferErrorSeverity(error, type);
    const retryable = this.isRetryable(error, type);

    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message: error.message,
      details: error.stack,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      retryable,
      userFriendlyMessage: errorLogger['generateUserFriendlyMessage'](type, error.message),
    };
  }

  private static inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('storage') || message.includes('asyncstorage')) {
      return ErrorType.STORAGE;
    }
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return ErrorType.AUTHENTICATION;
    }
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('migration') || message.includes('sync')) {
      return ErrorType.MIGRATION;
    }

    return ErrorType.UNKNOWN;
  }

  private static inferErrorSeverity(error: Error, type: ErrorType): ErrorSeverity {
    // Critical errors that break core functionality
    if (type === ErrorType.AUTHENTICATION || error.message.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for data loss scenarios
    if (type === ErrorType.STORAGE || type === ErrorType.MIGRATION) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for user-facing issues
    if (type === ErrorType.VALIDATION || type === ErrorType.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private static isRetryable(error: Error, type: ErrorType): boolean {
    // Network and sync errors are usually retryable
    if (type === ErrorType.NETWORK || type === ErrorType.SYNC || type === ErrorType.MIGRATION) {
      return true;
    }

    // Storage errors might be retryable
    if (type === ErrorType.STORAGE && !error.message.includes('quota')) {
      return true;
    }

    return false;
  }
}

// ============================================================================
// SPECIALIZED ERROR CREATORS
// ============================================================================

export const createValidationError = (
  message: string,
  details?: string,
  context?: Record<string, any>
): AppError => {
  return errorLogger.log({
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    context,
    retryable: false,
  });
};

export const createNetworkError = (
  message: string,
  details?: string,
  context?: Record<string, any>
): AppError => {
  return errorLogger.log({
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    retryable: true,
  });
};

export const createStorageError = (
  message: string,
  details?: string,
  context?: Record<string, any>
): AppError => {
  return errorLogger.log({
    type: ErrorType.STORAGE,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    retryable: true,
  });
};

export const createMigrationError = (
  message: string,
  details?: string,
  context?: Record<string, any>
): AppError => {
  return errorLogger.log({
    type: ErrorType.MIGRATION,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    context,
    retryable: true,
  });
};

// ============================================================================
// ERROR BOUNDARY HELPERS
// ============================================================================

export const handleComponentError = (error: Error, errorInfo: any) => {
  const appError = ErrorHandler.handle(error, {
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
  });

  // In production, you might want to show a fallback UI
  if (!__DEV__) {
    console.log('🔄 Component error handled, showing fallback UI');
  }

  return appError;
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  ErrorType,
  ErrorSeverity,
  errorLogger,
  ErrorHandler,
  createValidationError,
  createNetworkError,
  createStorageError,
  createMigrationError,
  handleComponentError,
};
