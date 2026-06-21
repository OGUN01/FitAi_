import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../../components/ui/aurora";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";import { TabValidationResult } from "../../types/onboarding";

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
                ? colors.secondary
                : colors.warning
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  validationCard: {
    backgroundColor: colors.backgroundTertiary,
  },
  validationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  validationTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
  },
  validationTitleSuccess: {
    color: colors.secondary,
  },
  validationPercentage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  validationErrors: {
    marginTop: spacing.sm,
  },
  validationErrorTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  validationErrorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: 2,
    marginLeft: spacing.xs,
  },
  validationWarnings: {
    marginTop: spacing.md,
  },
  validationWarningTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  validationWarningText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginBottom: 2,
    marginLeft: spacing.xs,
  },
});
