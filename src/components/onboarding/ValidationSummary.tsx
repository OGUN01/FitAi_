import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../../components/ui/aurora";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { TabValidationResult } from "../../types/onboarding";

interface ValidationSummaryProps {
  validationResult: TabValidationResult;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationResult,
}) => {
  return (
    <View style={styles.validationSummary}>
      <GlassCard
        elevation={3}
        blurIntensity="default"
        padding="md"
        borderRadius="lg"
        style={styles.validationCard}
      >
        <View style={styles.validationTitleRow}>
          <Ionicons
            name={
              validationResult.is_valid ? "checkmark-circle" : "alert-circle"
            }
            size={rf(20)}
            color={
              validationResult.is_valid
                ? ResponsiveTheme.colors.secondary
                : ResponsiveTheme.colors.warning
            }
          />
          <Text
            style={[
              styles.validationTitle,
              validationResult.is_valid && styles.validationTitleSuccess,
            ]}
          >
            {validationResult.is_valid
              ? "Ready to Continue"
              : "Please Complete"}
          </Text>
        </View>
        <Text style={styles.validationPercentage} numberOfLines={1}>
          {validationResult.is_valid && validationResult.completion_percentage === 0
            ? "Optional"
            : `${validationResult.completion_percentage}% Complete`}
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
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  validationCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  validationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    gap: ResponsiveTheme.spacing.xs,
  },
  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
  },
  validationTitleSuccess: {
    color: ResponsiveTheme.colors.secondary,
  },
  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  validationErrors: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginBottom: 2,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  validationWarnings: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
    marginBottom: 2,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});
