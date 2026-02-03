import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
import { TabValidationResult } from "../../../types/onboarding";

interface ValidationSectionProps {
  validationResult?: TabValidationResult;
}

export const ValidationSection: React.FC<ValidationSectionProps> = ({
  validationResult,
}) => {
  if (!validationResult) return null;

  return (
    <View style={styles.validationSummary}>
      <GlassCard
        elevation={3}
        blurIntensity="default"
        padding="md"
        borderRadius="lg"
        style={styles.validationCard}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: ResponsiveTheme.spacing.xs,
          }}
        >
          <Ionicons
            name={
              validationResult.is_valid
                ? "checkmark-circle-outline"
                : "warning-outline"
            }
            size={rf(20)}
            color={
              validationResult.is_valid
                ? ResponsiveTheme.colors.success
                : ResponsiveTheme.colors.warning
            }
            style={{ marginRight: ResponsiveTheme.spacing.xs }}
          />
          <Text style={styles.validationTitle}>
            {validationResult.is_valid
              ? "Ready to Continue"
              : "Please Complete"}
          </Text>
        </View>
        <Text style={styles.validationPercentage}>
          {validationResult.completion_percentage}% Complete
        </Text>

        {validationResult.errors.length > 0 && (
          <View style={styles.validationErrors}>
            <Text style={styles.validationErrorTitle}>Required:</Text>
            {validationResult.errors.map((error, index) => (
              <Text key={index} style={styles.validationErrorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {validationResult.warnings.length > 0 && (
          <View style={styles.validationWarnings}>
            <Text style={styles.validationWarningTitle}>Recommendations:</Text>
            {validationResult.warnings.map((warning, index) => (
              <Text key={index} style={styles.validationWarningText}>
                • {warning}
              </Text>
            ))}
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  validationCard: {
    padding: ResponsiveTheme.spacing.md,
  },
  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  validationErrors: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },
  validationWarnings: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.3,
  },
});
