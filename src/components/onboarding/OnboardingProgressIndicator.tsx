import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rh, rw } from "../../utils/responsive";import {
  TabValidationResult,
} from "../../types/onboarding";
import { ONBOARDING_TABS } from "./OnboardingTabBar";
import { AuroraStepRail } from "./AuroraStepRail";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingProgressIndicatorProps {
  currentTab: number;
  totalTabs: number;
  completedTabs: number[];
  tabValidationStatus: Record<number, TabValidationResult>;
  overallCompletion: number;
  showDetails?: boolean;
}

interface ProgressStepProps {
  stepNumber: number;
  isCompleted: boolean;
  isActive: boolean;
  isAccessible: boolean;
  validationResult?: TabValidationResult;
  title: string;
}

// ============================================================================
// TAB TITLES FOR DISPLAY
// ============================================================================

const TAB_TITLES = {
  1: "Personal Info",
  2: "Diet Preferences",
  3: "Body Analysis",
  4: "Workout Preferences",
  5: "Advanced Review",
};

// ============================================================================
// PROGRESS STEP COMPONENT
// ============================================================================

const ProgressStep: React.FC<ProgressStepProps> = ({
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
          line: styles.stepLineCompleted,
        };
      case "active":
        return {
          circle: styles.stepCircleActive,
          number: styles.stepNumberActive,
          title: styles.stepTitleActive,
          line: styles.stepLineDefault,
        };
      case "accessible":
        return {
          circle: styles.stepCircleAccessible,
          number: styles.stepNumberAccessible,
          title: styles.stepTitleAccessible,
          line: styles.stepLineDefault,
        };
      default:
        return {
          circle: styles.stepCircleDisabled,
          number: styles.stepNumberDisabled,
          title: styles.stepTitleDisabled,
          line: styles.stepLineDefault,
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
      {/* Step Circle */}
      <View style={[styles.stepCircle, stepStyles.circle]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={rf(16)} color={colors.white} />
        ) : (
          <Text style={[styles.stepNumber, stepStyles.number]}>
            {stepNumber}
          </Text>
        )}

        {/* Validation Indicator */}
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

      {/* Step Title */}
      <Text style={[styles.stepTitle, stepStyles.title]}>{title}</Text>

      {/* Validation Details */}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OnboardingProgressIndicator: React.FC<
  OnboardingProgressIndicatorProps
> = ({
  currentTab,
  totalTabs,
  completedTabs,
  tabValidationStatus,
  overallCompletion,
  showDetails = true,
}) => {
  const getTabAccessibility = (tabNumber: number) => {
    // Tab 1 is always accessible
    if (tabNumber === 1) return true;

    // Other tabs are accessible if previous tab is completed or if it's the current tab
    return completedTabs.includes(tabNumber - 1) || tabNumber === currentTab;
  };

  const railTabs = ONBOARDING_TABS.slice(0, totalTabs).map((t) => ({
    id: t.id,
    title: t.title,
    isCompleted: completedTabs.includes(t.id),
    isAccessible: getTabAccessibility(t.id),
  }));

  return (
    <View style={styles.container}>
      {/* Header — shares the AuroraStepRail language of the main tab bar:
          micro-caps eyebrow, editorial hero stat, then the same capsule rail
          (read-only) so the detail view reads as one system. */}
      <View style={styles.headerSection}>
        <Text style={styles.headerEyebrow}>ONBOARDING PROGRESS</Text>
        <Text style={styles.headerHeroStat}>
          {overallCompletion}
          <Text style={styles.headerHeroPct}>%</Text>
        </Text>
        <Text style={styles.headerSubtitle}>
          Step {currentTab} of {totalTabs}
        </Text>
      </View>

      {/* Rail (read-only) — replaces the legacy plain progress bar. The
          redundant "N of M steps completed" caption was dropped: the hero %
          above and the Completed/Remaining stats row below already carry it. */}
      <View style={styles.overallProgressSection}>
        <AuroraStepRail tabs={railTabs} activeTab={currentTab} />
      </View>

      {/* Detailed Steps */}
      {showDetails && (
        <View style={styles.stepsSection}>
          {Array.from({ length: totalTabs }, (_, index) => {
            const tabNumber = index + 1;
            const isCompleted = completedTabs.includes(tabNumber);
            const isActive = tabNumber === currentTab;
            const isAccessible = getTabAccessibility(tabNumber);
            const validationResult = tabValidationStatus[tabNumber];
            const title = TAB_TITLES[tabNumber as keyof typeof TAB_TITLES];

            return (
              <View key={tabNumber} style={styles.stepWrapper}>
                <ProgressStep
                  stepNumber={tabNumber}
                  isCompleted={isCompleted}
                  isActive={isActive}
                  isAccessible={isAccessible}
                  validationResult={validationResult}
                  title={title}
                />

                {/* Connection Line */}
                {index < totalTabs - 1 && (
                  <View
                    style={[
                      styles.connectionLine,
                      isCompleted
                        ? styles.connectionLineCompleted
                        : styles.connectionLineDefault,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedTabs.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {totalTabs - completedTabs.length}
          </Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Object.values(tabValidationStatus).reduce(
              (total, result) => total + (result.errors?.length || 0),
              0,
            )}
          </Text>
          <Text style={styles.statLabel}>Errors</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  // Header Section — editorial aurora language (micro-caps eyebrow + hero stat)
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  headerEyebrow: {
    fontSize: fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 2,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },

  headerHeroStat: {
    fontSize: fontSize.display,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text,
    lineHeight: fontSize.display * 1.05,
  },

  headerHeroPct: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // Overall Progress Section (rail)
  overallProgressSection: {
    marginBottom: spacing.xl,
  },

  // Steps Section
  stepsSection: {
    marginBottom: spacing.xl,
  },

  stepWrapper: {
    position: "relative",
  },

  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },

  // Step Circle
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

  // Step Number/Checkmark
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

  stepCheckmark: {
    fontSize: fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },

  // Step Title
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

  // Connection Lines
  connectionLine: {
    position: "absolute",
    left: rw(19),
    top: rw(40) + spacing.md,
    width: 2,
    height: spacing.md * 2,
  },

  connectionLineDefault: {
    backgroundColor: colors.border,
  },

  connectionLineCompleted: {
    backgroundColor: colors.success,
  },

  // Validation Badges
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

  // Validation Details
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

  // Stats Section
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  // Missing step line styles
  stepLineCompleted: {
    backgroundColor: colors.success,
  },

  stepLineDefault: {
    backgroundColor: colors.border,
  },
});

export default OnboardingProgressIndicator;
