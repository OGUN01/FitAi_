/**
 * Error Fallback Components
 * Reusable fallback UI components for different error states
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from '../../utils/constants';


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
      <Ionicons name={icon} size={48} color={ResponsiveTheme.colors.error} />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button" accessibilityLabel={retryText}>
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
      <Ionicons name={icon} size={48} color={ResponsiveTheme.colors.textSecondary} />

      <Text style={[styles.title, { color: ResponsiveTheme.colors.text }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onAction && actionText && (
        <TouchableOpacity style={styles.button} onPress={onAction} accessibilityRole="button" accessibilityLabel={actionText}>
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
    padding: ResponsiveTheme.spacing.xl,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  message: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: 22,
  },

  button: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.md,
  },

  buttonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
});

export default ErrorFallback;
