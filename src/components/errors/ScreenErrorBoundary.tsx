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
import { ResponsiveTheme } from '../../utils/constants';


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
              color={ResponsiveTheme.colors.error}
            />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              {this.props.screenName
                ? `We encountered an error loading ${this.props.screenName}.`
                : "We encountered an unexpected error."}
            </Text>

            <TouchableOpacity style={styles.button} onPress={this.handleReset} accessibilityRole="button" accessibilityLabel="Try again">
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
    backgroundColor: ResponsiveTheme.colors.background,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.lg,
  },

  content: {
    alignItems: "center" as const,
    maxWidth: 400,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  message: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
    lineHeight: 22,
  },

  button: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.xl,
    borderRadius: ResponsiveTheme.borderRadius.md,
    minWidth: 150,
  },

  buttonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    textAlign: "center",
  },

  errorDetails: {
    marginTop: ResponsiveTheme.spacing.xl,
    maxHeight: 200,
    width: "100%",
  },

  errorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontFamily: "monospace",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  errorStack: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontFamily: "monospace",
  },
});

export default ScreenErrorBoundary;
