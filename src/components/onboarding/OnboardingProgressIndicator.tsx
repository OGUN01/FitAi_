import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { OnboardingProgressData, TabValidationResult } from '../../types/onboarding';

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
  1: 'Personal Info',
  2: 'Diet Preferences',
  3: 'Body Analysis',
  4: 'Workout Preferences',
  5: 'Advanced Review',
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
    if (isCompleted) return 'completed';
    if (isActive) return 'active';
    if (isAccessible) return 'accessible';
    return 'disabled';
  };

  const getStepStyles = () => {
    const status = getStepStatus();
    switch (status) {
      case 'completed':
        return {
          circle: styles.stepCircleCompleted,
          number: styles.stepNumberCompleted,
          title: styles.stepTitleCompleted,
          line: styles.stepLineCompleted,
        };
      case 'active':
        return {
          circle: styles.stepCircleActive,
          number: styles.stepNumberActive,
          title: styles.stepTitleActive,
          line: styles.stepLineDefault,
        };
      case 'accessible':
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
  const hasErrors = validationResult?.errors && validationResult.errors.length > 0;
  const hasWarnings = validationResult?.warnings && validationResult.warnings.length > 0;

  return (
    <View style={styles.stepContainer}>
      {/* Step Circle */}
      <View style={[styles.stepCircle, stepStyles.circle]}>
        {isCompleted ? (
          <Text style={styles.stepCheckmark}>✓</Text>
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
      <Text style={[styles.stepTitle, stepStyles.title]}>
        {title}
      </Text>

      {/* Validation Details */}
      {validationResult && (hasErrors || hasWarnings) && (
        <View style={styles.validationDetails}>
          {hasErrors && validationResult.errors && (
            <Text style={styles.errorCount}>
              {validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''}
            </Text>
          )}
          {hasWarnings && validationResult.warnings && (
            <Text style={styles.warningCount}>
              {validationResult.warnings.length} warning{validationResult.warnings.length !== 1 ? 's' : ''}
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

export const OnboardingProgressIndicator: React.FC<OnboardingProgressIndicatorProps> = ({
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

  const calculateTabCompletion = (tabNumber: number) => {
    if (completedTabs.includes(tabNumber)) return 100;
    if (tabNumber === currentTab) {
      return tabValidationStatus[tabNumber]?.completion_percentage || 0;
    }
    return 0;
  };

  return (
    <View style={styles.container}>
      {/* Overall Progress Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Onboarding Progress</Text>
        <Text style={styles.headerSubtitle}>
          Step {currentTab} of {totalTabs} • {overallCompletion}% Complete
        </Text>
      </View>

      {/* Overall Progress Bar */}
      <View style={styles.overallProgressSection}>
        <View style={styles.overallProgressBar}>
          <View 
            style={[
              styles.overallProgressFill, 
              { width: `${overallCompletion}%` }
            ]} 
          />
        </View>
        <Text style={styles.overallProgressText}>
          {completedTabs.length} of {totalTabs} steps completed
        </Text>
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
                      isCompleted ? styles.connectionLineCompleted : styles.connectionLineDefault
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
          <Text style={styles.statValue}>{totalTabs - completedTabs.length}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Object.values(tabValidationStatus).reduce((total, result) => 
              total + (result.errors?.length || 0), 0
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
    backgroundColor: ResponsiveTheme.colors.background,
    padding: ResponsiveTheme.spacing.lg,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  headerTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  headerSubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Overall Progress Section
  overallProgressSection: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  overallProgressBar: {
    width: '100%',
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  overallProgressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  overallProgressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Steps Section
  stepsSection: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  stepWrapper: {
    position: 'relative',
  },

  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  // Step Circle
  stepCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
    position: 'relative',
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

  // Step Number/Checkmark
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

  stepCheckmark: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Step Title
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

  // Connection Lines
  connectionLine: {
    position: 'absolute',
    left: rw(19),
    top: rw(40) + ResponsiveTheme.spacing.md,
    width: 2,
    height: ResponsiveTheme.spacing.md * 2,
  },

  connectionLineDefault: {
    backgroundColor: ResponsiveTheme.colors.border,
  },

  connectionLineCompleted: {
    backgroundColor: ResponsiveTheme.colors.success,
  },

  // Validation Badges
  errorBadge: {
    position: 'absolute',
    top: -rh(4),
    right: -rw(4),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorBadgeText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  warningBadge: {
    position: 'absolute',
    top: -rh(4),
    right: -rw(4),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },

  warningBadgeText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Validation Details
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

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Missing step line styles
  stepLineCompleted: {
    backgroundColor: ResponsiveTheme.colors.success,
  },

  stepLineDefault: {
    backgroundColor: ResponsiveTheme.colors.border,
  },
});

export default OnboardingProgressIndicator;
