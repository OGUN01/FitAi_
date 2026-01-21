/**
 * Error Fallback Components
 * Reusable fallback UI components for different error states
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../ui";

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
      <Ionicons name={icon} size={48} color={THEME.colors.error} />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{retryText}</Text>
        </TouchableOpacity>
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
      <Ionicons name={icon} size={48} color={THEME.colors.textSecondary} />

      <Text style={[styles.title, { color: THEME.colors.text }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onAction && actionText && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: THEME.spacing.xl,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.error,
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
    textAlign: "center",
  },

  message: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: THEME.spacing.lg,
    lineHeight: 22,
  },

  button: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    marginTop: THEME.spacing.md,
  },

  buttonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
  },
});

export default ErrorFallback;
