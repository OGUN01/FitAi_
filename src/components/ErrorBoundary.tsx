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
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../theme/aurora-tokens";
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
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  errorContainer: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    maxWidth: "90%",
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  message: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  debugContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  debugText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: "monospace",
  },
});
