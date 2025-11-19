import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { TabValidationResult } from '../../types/onboarding';
import { colors } from '../../theme/aurora-tokens';
import { gradients, toLinearGradientProps } from '../../theme/gradients';
import { animations } from '../../theme/animations';

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
// ANIMATED TAB COMPONENT
// ============================================================================

interface AnimatedTabProps {
  tab: TabConfig;
  index: number;
  isActive: boolean;
  isDisabled: boolean;
  tabStyles: {
    container: any;
    text: any;
    icon: any;
  };
  onPress: () => void;
  renderValidationIndicator: (tab: TabConfig) => React.ReactNode;
  isLastTab: boolean;
}

const AnimatedTab: React.FC<AnimatedTabProps> = ({
  tab,
  index,
  isActive,
  isDisabled,
  tabStyles,
  onPress,
  renderValidationIndicator,
  isLastTab,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.08 : 1, animations.springConfig.smooth);
  }, [isActive]);

  const animatedTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View key={tab.id} style={styles.tabWrapper}>
      <Animated.View style={animatedTabStyle}>
        <TouchableOpacity
          style={[styles.tab, tabStyles.container]}
          onPress={onPress}
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
      </Animated.View>

      {/* Connection Line to Next Tab */}
      {!isLastTab && (
        <View
          style={[
            styles.connectionLine,
            tab.isCompleted ? styles.connectionLineCompleted : styles.connectionLineDefault
          ]}
        />
      )}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OnboardingTabBar: React.FC<OnboardingTabBarProps> = ({
  activeTab,
  tabs,
  onTabPress,
  completionPercentage,
}) => {
  // Animated values for smooth transitions
  const progressWidth = useSharedValue(0);
  const activeTabIndex = useSharedValue(activeTab - 1);

  // Animate progress bar on completion percentage change
  useEffect(() => {
    progressWidth.value = withTiming(completionPercentage, {
      duration: animations.duration.verySlow,
      easing: animations.easing.easeOutCubic,
    });
  }, [completionPercentage]);

  // Animate active tab indicator on tab change
  useEffect(() => {
    activeTabIndex.value = withSpring(activeTab - 1, animations.springConfig.smooth);
  }, [activeTab]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Animated indicator that slides beneath active tab
  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / tabs.length; // Percentage width of each tab
    const translateX = activeTabIndex.value * tabWidth;

    return {
      transform: [{ translateX: `${translateX}%` }],
      width: `${tabWidth}%`,
    };
  });

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
      {/* Overall Progress Bar with Gradient */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFillContainer, animatedProgressStyle]}>
            <LinearGradient
              {...toLinearGradientProps(gradients.primary)}
              style={styles.progressGradient}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressText}>
          {Math.round(completionPercentage)}% Complete
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab, index) => {
          const status = getTabStatus(tab);
          const tabStyles = getTabStyles(status);
          const isDisabled = status === 'disabled';
          const isActive = tab.id === activeTab;
          const isLastTab = index === tabs.length - 1;

          return (
            <AnimatedTab
              key={tab.id}
              tab={tab}
              index={index}
              isActive={isActive}
              isDisabled={isDisabled}
              tabStyles={tabStyles}
              onPress={() => !isDisabled && onTabPress(tab.id)}
              renderValidationIndicator={renderValidationIndicator}
              isLastTab={isLastTab}
            />
          );
        })}
      </View>

      {/* Sliding Active Tab Indicator */}
      <View style={styles.indicatorContainer}>
        <Animated.View style={[styles.indicatorWrapper, animatedIndicatorStyle]}>
          <LinearGradient
            {...toLinearGradientProps(gradients.primary)}
            style={styles.indicator}
          />
        </Animated.View>
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

  progressFillContainer: {
    height: '100%',
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
  },

  progressGradient: {
    width: '100%',
    height: '100%',
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

  // Sliding Active Tab Indicator
  indicatorContainer: {
    width: '100%',
    height: rh(4),
    marginTop: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    overflow: 'hidden',
  },

  indicatorWrapper: {
    height: '100%',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  indicator: {
    height: '100%',
    borderRadius: ResponsiveTheme.borderRadius.full,
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
