import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { TabValidationResult } from '../../types/onboarding';

// ============================================================================
// TYPES
// ============================================================================

export interface TabConfig {
  id: number;
  title: string;
  icon: string;
  isCompleted: boolean;
  isAccessible: boolean;
  validationResult?: TabValidationResult;
}

interface OnboardingTabBarProps {
  activeTab: number;
  tabs: TabConfig[];
  onTabPress: (tabId: number) => void;
  completionPercentage: number;
}

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

export const ONBOARDING_TABS: Omit<TabConfig, 'isCompleted' | 'isAccessible' | 'validationResult'>[] = [
  {
    id: 1,
    title: 'Personal Info',
    icon: '👤',
  },
  {
    id: 2,
    title: 'Diet Preferences',
    icon: '🍽️',
  },
  {
    id: 3,
    title: 'Body Analysis',
    icon: '📊',
  },
  {
    id: 4,
    title: 'Workout Preferences',
    icon: '💪',
  },
  {
    id: 5,
    title: 'Advanced Review',
    icon: '📋',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const OnboardingTabBar: React.FC<OnboardingTabBarProps> = ({
  activeTab,
  tabs,
  onTabPress,
  completionPercentage,
}) => {
  const getTabStatus = (tab: TabConfig) => {
    if (tab.isCompleted) return 'completed';
    if (tab.id === activeTab) return 'active';
    if (tab.isAccessible) return 'accessible';
    return 'disabled';
  };

  const getTabStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          container: styles.tabCompleted,
          text: styles.tabTextCompleted,
          icon: styles.tabIconCompleted,
        };
      case 'active':
        return {
          container: styles.tabActive,
          text: styles.tabTextActive,
          icon: styles.tabIconActive,
        };
      case 'accessible':
        return {
          container: styles.tabAccessible,
          text: styles.tabTextAccessible,
          icon: styles.tabIconAccessible,
        };
      default:
        return {
          container: styles.tabDisabled,
          text: styles.tabTextDisabled,
          icon: styles.tabIconDisabled,
        };
    }
  };

  const renderValidationIndicator = (tab: TabConfig) => {
    if (!tab.validationResult) return null;

    const { is_valid, errors, warnings } = tab.validationResult;
    
    if (tab.isCompleted && is_valid) {
      return <View style={styles.validationSuccess}>
        <Text style={styles.validationIcon}>✓</Text>
      </View>;
    }
    
    if (errors.length > 0) {
      return <View style={styles.validationError}>
        <Text style={styles.validationIcon}>!</Text>
      </View>;
    }
    
    if (warnings.length > 0) {
      return <View style={styles.validationWarning}>
        <Text style={styles.validationIcon}>⚠</Text>
      </View>;
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Overall Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${completionPercentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {completionPercentage}% Complete
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab, index) => {
          const status = getTabStatus(tab);
          const tabStyles = getTabStyles(status);
          const isDisabled = status === 'disabled';

          return (
            <View key={tab.id} style={styles.tabWrapper}>
              <TouchableOpacity
                style={[styles.tab, tabStyles.container]}
                onPress={() => !isDisabled && onTabPress(tab.id)}
                disabled={isDisabled}
                activeOpacity={0.7}
              >
                {/* Tab Icon */}
                <View style={styles.tabIconContainer}>
                  <Text style={[styles.tabIcon, tabStyles.icon]}>
                    {tab.icon}
                  </Text>
                  {renderValidationIndicator(tab)}
                </View>

                {/* Tab Title */}
                <Text 
                  style={[styles.tabText, tabStyles.text]}
                  numberOfLines={2}
                >
                  {tab.title}
                </Text>

                {/* Tab Number */}
                <View style={[styles.tabNumber, tabStyles.container]}>
                  <Text style={[styles.tabNumberText, tabStyles.text]}>
                    {tab.id}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Connection Line to Next Tab */}
              {index < tabs.length - 1 && (
                <View 
                  style={[
                    styles.connectionLine,
                    tab.isCompleted ? styles.connectionLineCompleted : styles.connectionLineDefault
                  ]} 
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Active Tab Indicator */}
      <View style={styles.activeTabSection}>
        <Text style={styles.activeTabText}>
          Step {activeTab} of {tabs.length}
        </Text>
        <Text style={styles.activeTabTitle}>
          {tabs.find(tab => tab.id === activeTab)?.title || ''}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  // Progress Section
  progressSection: {
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  progressBar: {
    width: '100%',
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Tab Container
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  tabWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },

  tab: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    minWidth: rw(60),
    position: 'relative',
  },

  // Tab States
  tabCompleted: {
    backgroundColor: `${ResponsiveTheme.colors.success}15`,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.success,
  },

  tabActive: {
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
  },

  tabAccessible: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  tabDisabled: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    opacity: 0.5,
  },

  // Tab Icon
  tabIconContainer: {
    position: 'relative',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  tabIcon: {
    fontSize: rf(20),
  },

  tabIconCompleted: {
    fontSize: rf(20),
  },

  tabIconActive: {
    fontSize: rf(22),
  },

  tabIconAccessible: {
    fontSize: rf(18),
  },

  tabIconDisabled: {
    fontSize: rf(16),
  },

  // Tab Text
  tabText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
    lineHeight: rf(14),
  },

  tabTextCompleted: {
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  tabTextActive: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  tabTextAccessible: {
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  tabTextDisabled: {
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: ResponsiveTheme.fontWeight.normal,
  },

  // Tab Number
  tabNumber: {
    width: rw(20),
    height: rw(20),
    borderRadius: rw(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  tabNumberText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Connection Lines
  connectionLine: {
    position: 'absolute',
    top: '50%',
    right: -rw(15),
    width: rw(30),
    height: 2,
    marginTop: -1,
  },

  connectionLineDefault: {
    backgroundColor: ResponsiveTheme.colors.border,
  },

  connectionLineCompleted: {
    backgroundColor: ResponsiveTheme.colors.success,
  },

  // Validation Indicators
  validationSuccess: {
    position: 'absolute',
    top: -rh(2),
    right: -rw(2),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  validationError: {
    position: 'absolute',
    top: -rh(2),
    right: -rw(2),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },

  validationWarning: {
    position: 'absolute',
    top: -rh(2),
    right: -rw(2),
    width: rw(16),
    height: rw(16),
    borderRadius: rw(8),
    backgroundColor: ResponsiveTheme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },

  validationIcon: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Active Tab Section
  activeTabSection: {
    marginTop: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  activeTabText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  activeTabTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginTop: ResponsiveTheme.spacing.xs,
  },
});

export default OnboardingTabBar;
