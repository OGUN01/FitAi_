/**
 * ValidationAlert Component
 *
 * Displays validation errors and warnings from AI generation.
 * Supports multiple severity levels with appropriate styling and icons.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import type {
  ValidationError,
  ValidationWarning,
} from "../../services/dataTransformers";

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = "error" | "warning" | "info" | "success";

export interface ValidationAlertProps {
  severity: AlertSeverity;
  title: string;
  message: string;
  affectedItems?: string[];
  suggestions?: string[];
  onDismiss?: () => void;
  onRetry?: () => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEVERITY_CONFIG = {
  error: {
    icon: "alert-circle" as const,
    color: ResponsiveTheme.colors.errorAlt,
    backgroundColor: `${ResponsiveTheme.colors.errorAlt}26`,
    borderColor: `${ResponsiveTheme.colors.errorAlt}4D`,
  },
  warning: {
    icon: "warning" as const,
    color: ResponsiveTheme.colors.warningAlt,
    backgroundColor: `${ResponsiveTheme.colors.warningAlt}26`,
    borderColor: `${ResponsiveTheme.colors.warningAlt}4D`,
  },
  info: {
    icon: "information-circle" as const,
    color: ResponsiveTheme.colors.blue,
    backgroundColor: `${ResponsiveTheme.colors.blue}26`,
    borderColor: `${ResponsiveTheme.colors.blue}4D`,
  },
  success: {
    icon: "checkmark-circle" as const,
    color: ResponsiveTheme.colors.successAlt,
    backgroundColor: `${ResponsiveTheme.colors.successAlt}26`,
    borderColor: `${ResponsiveTheme.colors.successAlt}4D`,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  severity,
  title,
  message,
  affectedItems,
  suggestions,
  onDismiss,
  onRetry,
}) => {
  const config = SEVERITY_CONFIG[severity];

  const handleDismiss = () => {
    haptics.light();
    onDismiss?.();
  };

  const handleRetry = () => {
    haptics.medium();
    onRetry?.();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <GlassCard
        elevation={1}
        blurIntensity="default"
        padding="none"
        borderRadius="md"
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: config.backgroundColor,
              borderColor: config.borderColor,
            },
          ]}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons
                  name={config.icon}
                  size={rf(20)}
                  color={config.color}
                />
                <Text style={[styles.title, { color: config.color }]}>
                  {title}
                </Text>
              </View>
              {onDismiss && (
                <TouchableOpacity
                  onPress={handleDismiss}
                  style={styles.dismissButton}
                >
                  <Ionicons
                    name="close"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Affected Items */}
            {affectedItems && affectedItems.length > 0 && (
              <View style={styles.itemsList}>
                <Text style={styles.itemsHeader}>Affected Items:</Text>
                {affectedItems.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Ionicons
                      name="ellipse"
                      size={rf(6)}
                      color={ResponsiveTheme.colors.textSecondary}
                    />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                <Text style={styles.suggestionsHeader}>Suggestions:</Text>
                {suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionRow}>
                    <Ionicons
                      name="bulb-outline"
                      size={rf(14)}
                      color={ResponsiveTheme.colors.textSecondary}
                    />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Retry Button */}
            {onRetry && (
              <TouchableOpacity
                onPress={handleRetry}
                style={styles.retryButton}
              >
                <Ionicons name="refresh" size={rf(16)} color={ResponsiveTheme.colors.white} />
                <Text style={styles.retryText}>Regenerate Plan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

// ============================================================================
// HELPER: Convert ValidationError to Alert Props
// ============================================================================

export const validationErrorToAlertProps = (
  error: ValidationError,
): ValidationAlertProps => {
  return {
    severity:
      error.severity === "error"
        ? "error"
        : error.severity === "warning"
          ? "warning"
          : "info",
    title: error.title,
    message: error.message,
    affectedItems: undefined,
    suggestions: error.suggestions,
  };
};

// ============================================================================
// HELPER: Convert ValidationWarning to Alert Props
// ============================================================================

export const validationWarningToAlertProps = (
  warning: ValidationWarning,
): ValidationAlertProps => {
  return {
    severity: warning.severity === "WARNING" ? "warning" : "info",
    title: warning.code,
    message: warning.message,
    suggestions: warning.action ? [warning.action] : undefined,
  };
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  card: {
    borderWidth: 1,
  },
  content: {
    padding: ResponsiveTheme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    flex: 1,
  },
  title: {
    fontSize: rf(15),
    fontWeight: "700",
  },
  dismissButton: {
    padding: rp(4),
  },
  message: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(18),
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  itemsList: {
    marginTop: ResponsiveTheme.spacing.xs,
    paddingLeft: ResponsiveTheme.spacing.sm,
  },
  itemsHeader: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(4),
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: rp(2),
  },
  itemText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  suggestionsList: {
    marginTop: ResponsiveTheme.spacing.sm,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassHighlight,
  },
  suggestionsHeader: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(4),
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(8),
    marginBottom: rp(4),
  },
  suggestionText: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  retryText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});

export default ValidationAlert;
