import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../../utils/responsive";import { TabValidationResult } from "../../../types/onboarding";

interface ProgressStepProps {
  stepNumber: number;
  isCompleted: boolean;
  isActive: boolean;
  isAccessible: boolean;
  validationResult?: TabValidationResult;
  title: string;
}

export const ProgressStep: React.FC<ProgressStepProps> = ({
  stepNumber,
  isCompleted,
  isActive,
  isAccessible,
  validationResult,
  title,
}) => {
  const getStepStatus = () => {
    if (isCompleted) return "completed";
    if (isActive) return "active";
    if (isAccessible) return "accessible";
    return "disabled";
  };

  const getStepStyles = () => {
    const status = getStepStatus();
    switch (status) {
      case "completed":
        return {
          circle: styles.stepCircleCompleted,
          number: styles.stepNumberCompleted,
          title: styles.stepTitleCompleted,
        };
      case "active":
        return {
          circle: styles.stepCircleActive,
          number: styles.stepNumberActive,
          title: styles.stepTitleActive,
        };
      case "accessible":
        return {
          circle: styles.stepCircleAccessible,
          number: styles.stepNumberAccessible,
          title: styles.stepTitleAccessible,
        };
      default:
        return {
          circle: styles.stepCircleDisabled,
          number: styles.stepNumberDisabled,
          title: styles.stepTitleDisabled,
        };
    }
  };

  const stepStyles = getStepStyles();
  const hasErrors =
    validationResult?.errors && validationResult.errors.length > 0;
  const hasWarnings =
    validationResult?.warnings && validationResult.warnings.length > 0;

  return (
    <View style={styles.stepContainer}>
      <View style={[styles.stepCircle, stepStyles.circle]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={rf(16)} color="#FFFFFF" />
        ) : (
          <Text style={[styles.stepNumber, stepStyles.number]}>
            {stepNumber}
          </Text>
        )}

        {hasErrors && (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>!</Text>
          </View>
        )}
        {hasWarnings && !hasErrors && (
          <View style={styles.warningBadge}>
            <Text style={styles.warningBadgeText}>⚠</Text>
          </View>
        )}
      </View>

      <Text style={[styles.stepTitle, stepStyles.title]}>{title}</Text>

      {validationResult && (hasErrors || hasWarnings) && (
        <View style={styles.validationDetails}>
          {hasErrors && validationResult.errors && (
            <Text style={styles.errorCount}>
              {validationResult.errors.length} error
              {validationResult.errors.length !== 1 ? "s" : ""}
            </Text>
          )}
          {hasWarnings && validationResult.warnings && (
            <Text style={styles.warningCount}>
              {validationResult.warnings.length} warning
              {validationResult.warnings.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  stepCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    position: "relative",
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleAccessible: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepCircleDisabled: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  stepNumber: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  stepNumberCompleted: {
    color: colors.white,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepNumberAccessible: {
    color: colors.text,
  },
  stepNumberDisabled: {
    color: colors.textMuted,
  },
  stepTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  stepTitleCompleted: {
    color: colors.success,
  },
  stepTitleActive: {
    color: colors.primary,
  },
  stepTitleAccessible: {
    color: colors.text,
  },
  stepTitleDisabled: {
    color: colors.textMuted,
  },
  errorBadge: {
    position: "absolute",
    top: -rh(4),
    right: -rw(4),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBadgeText: {
    fontSize: rf(10),
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  warningBadge: {
    position: "absolute",
    top: -rh(4),
    right: -rw(4),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: colors.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  warningBadgeText: {
    fontSize: rf(10),
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  validationDetails: {
    marginLeft: spacing.sm,
  },
  errorCount: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },
  warningCount: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: typography.fontWeight.medium,
  },
});
