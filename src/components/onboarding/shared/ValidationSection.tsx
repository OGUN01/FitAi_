import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";import { GlassCard } from "../../../components/ui/aurora";
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
            marginBottom: spacing.xs,
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
                ? colors.success
                : colors.warning
            }
            style={{ marginRight: spacing.xs }}
          />
          <Text style={styles.validationTitle}>
            {validationResult.is_valid
              ? "Ready to Continue"
              : "Please Complete"}
          </Text>
        </View>
        <Text style={styles.validationPercentage}>
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
    marginBottom: spacing.lg,
  },
  validationCard: {
    padding: spacing.md,
  },
  validationTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  validationPercentage: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },
  validationErrors: {
    marginBottom: spacing.md,
  },
  validationErrorTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  validationErrorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: fontSize.sm * 1.3,
  },
  validationWarnings: {
    marginBottom: spacing.md,
  },
  validationWarningTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  validationWarningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: fontSize.sm * 1.3,
  },
});
