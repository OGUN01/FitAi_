/**
 * Screen Error Boundary
 * Catches errors in screen components and displays a friendly fallback UI
 */

import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rh, rw, rf } from '../../utils/responsive';
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";


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
      errorInfo,
    );

    this.setState({
      error,
      errorInfo,
    });
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
              size={rf(64)}
              color={colors.error}
            />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              {this.props.screenName
                ? `We encountered an error loading ${this.props.screenName}.`
                : "We encountered an unexpected error."}
            </Text>

            <AnimatedPressable style={styles.button} onPress={this.handleReset} scaleValue={0.95} accessibilityRole="button" accessibilityLabel="Try again">
              <Text style={styles.buttonText}>Try Again</Text>
            </AnimatedPressable>

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
    backgroundColor: colors.background,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: spacing.lg,
  },

  content: {
    alignItems: "center" as const,
    maxWidth: 400,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: rf(22),
  },

  button: {
    backgroundColor: colors.primary,
    minHeight: Math.max(rh(44), 44),
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    minWidth: Math.max(rw(150), 150),
  },

  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
  },

  errorDetails: {
    marginTop: spacing.xl,
    maxHeight: 200,
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },

  errorTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },

  errorText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: "monospace",
    marginBottom: spacing.sm,
  },

  errorStack: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
});

export default ScreenErrorBoundary;
