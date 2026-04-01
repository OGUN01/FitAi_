/**
 * ErrorBoundary Component
 *
 * Screen-level error boundary for catching and displaying React errors gracefully.
 * Prevents the entire app from crashing when a component throws an error.
 *
 * ARCHITECTURE FIX (ARCH-010): Enhanced Error Boundaries
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ResponsiveTheme } from "../utils/constants";
import { logger } from "../utils/logger";

interface Props {
  children: React.ReactNode;
  /** Custom fallback component to render on error */
  fallback?: React.ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Screen name for logging purposes */
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store error info for display
    this.setState({ errorInfo });

    // Auto-retry once for transient module-loading / Hermes ReferenceErrors
    // (e.g. "Property 'rh' doesn't exist" from stale Metro cache)
    // Use setTimeout(0) so React finishes the current error-commit cycle
    // before we clear the error state and attempt a re-render.
    if (
      this.state.retryCount < 1 &&
      error instanceof ReferenceError &&
      error.message?.includes("doesn't exist")
    ) {
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 0);
      return;
    }

    // Suppress Metro symbolication errors from console
    if (
      error.message?.includes("unknown") ||
      error.stack?.includes("getCodeFrame") ||
      error.stack?.includes("symbolicate") ||
      error.message?.includes("ENOENT")
    ) {
      // Silently ignore Metro symbolication errors
      return;
    }

    // Log error using centralized logger
    const screenName = this.props.screenName || "Unknown";
    logger.error(`ErrorBoundary caught error in ${screenName}`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message || "An unexpected error occurred"}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRestart}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>{this.state.error?.stack}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.xl,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    alignItems: "center",
    maxWidth: "90%",
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },
  message: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.xl,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  buttonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  debugContainer: {
    marginTop: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  debugText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontFamily: "monospace",
  },
});
