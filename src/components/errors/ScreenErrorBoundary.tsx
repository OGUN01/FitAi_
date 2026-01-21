/**
 * Screen Error Boundary
 * Catches errors in screen components and displays a friendly fallback UI
 */

import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../ui";

interface Props {
  children: ReactNode;
  screenName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ScreenErrorBoundary] Error in ${this.props.screenName || "Screen"}:`,
      error,
    );
    console.error("[ScreenErrorBoundary] Error Info:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log to error tracking service (if configured)
    if (__DEV__) {
      console.log("[ScreenErrorBoundary] Stack:", errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons
              name="alert-circle"
              size={64}
              color={THEME.colors.error}
            />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              {this.props.screenName
                ? `We encountered an error loading ${this.props.screenName}.`
                : "We encountered an unexpected error."}
            </Text>

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
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
    backgroundColor: THEME.colors.background,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: THEME.spacing.lg,
  },

  content: {
    alignItems: "center" as const,
    maxWidth: 400,
  },

  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
    textAlign: "center",
  },

  message: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: THEME.spacing.xl,
    lineHeight: 22,
  },

  button: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.md,
    minWidth: 150,
  },

  buttonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    textAlign: "center",
  },

  errorDetails: {
    marginTop: THEME.spacing.xl,
    maxHeight: 200,
    width: "100%",
  },

  errorTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.error,
    marginBottom: THEME.spacing.xs,
  },

  errorText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontFamily: "monospace",
    marginBottom: THEME.spacing.sm,
  },

  errorStack: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontFamily: "monospace",
  },
});

export default ScreenErrorBoundary;
