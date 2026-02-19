import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { TabValidationResult } from "../../../types/onboarding";

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
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  stepCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
    position: "relative",
  },
  stepCircleCompleted: {
    backgroundColor: ResponsiveTheme.colors.success,
  },
  stepCircleActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  stepCircleAccessible: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
  },
  stepCircleDisabled: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    opacity: 0.6,
  },
  stepNumber: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  stepNumberCompleted: {
    color: ResponsiveTheme.colors.white,
  },
  stepNumberActive: {
    color: ResponsiveTheme.colors.white,
  },
  stepNumberAccessible: {
    color: ResponsiveTheme.colors.text,
  },
  stepNumberDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },
  stepTitle: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  stepTitleCompleted: {
    color: ResponsiveTheme.colors.success,
  },
  stepTitleActive: {
    color: ResponsiveTheme.colors.primary,
  },
  stepTitleAccessible: {
    color: ResponsiveTheme.colors.text,
  },
  stepTitleDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },
  errorBadge: {
    position: "absolute",
    top: -rh(4),
    right: -rw(4),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBadgeText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  warningBadge: {
    position: "absolute",
    top: -rh(4),
    right: -rw(4),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  warningBadgeText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  validationDetails: {
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  errorCount: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  warningCount: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
