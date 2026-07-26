/**
 * Error Fallback Components
 * Reusable fallback UI components for different error states
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rh, rw, rf } from '../../utils/responsive';
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";


interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  retryText = "Try Again",
  icon = "alert-circle",
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.error} />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <AnimatedPressable style={styles.button} onPress={onRetry} scaleValue={0.95} accessibilityRole="button" accessibilityLabel={retryText}>
          <Text style={styles.buttonText}>{retryText}</Text>
        </AnimatedPressable>
      )}
    </View>
  );
};

interface DataLoadErrorProps {
  dataType: string;
  onRetry?: () => void;
  partial?: boolean;
}

export const DataLoadError: React.FC<DataLoadErrorProps> = ({
  dataType,
  onRetry,
  partial = false,
}) => {
  return (
    <ErrorFallback
      icon="cloud-offline"
      title={
        partial ? `Partial ${dataType} data` : `Failed to load ${dataType}`
      }
      message={
        partial
          ? `Some ${dataType} data could not be loaded. Showing available data.`
          : `We couldn't load your ${dataType}. Please check your connection and try again.`
      }
      onRetry={onRetry}
    />
  );
};

interface NetworkErrorProps {
  onRetry?: () => void;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry }) => {
  return (
    <ErrorFallback
      icon="cloud-offline"
      title="No connection"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
};

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "file-tray",
  title,
  message,
  actionText,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textSecondary} />

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onAction && actionText && (
        <AnimatedPressable style={styles.button} onPress={onAction} scaleValue={0.95} accessibilityRole="button" accessibilityLabel={actionText}>
          <Text style={styles.buttonText}>{actionText}</Text>
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: spacing.xl,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: rf(22),
  },

  button: {
    backgroundColor: colors.primary,
    minHeight: Math.max(rh(44), 44),
    minWidth: Math.max(rw(120), 120),
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },

  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ErrorFallback;
