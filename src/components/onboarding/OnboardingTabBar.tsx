import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { TabValidationResult } from '../../types/onboarding';
import { colors } from '../../theme/aurora-tokens';
import { gradients, toLinearGradientProps } from '../../theme/gradients';
import { animations } from '../../theme/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

export interface TabConfig {
  id: number;
  title: string;
  shortTitle: string; // Short title for compact display
  iconName: string;
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
    shortTitle: 'Profile',
    iconName: 'person-outline',
  },
  {
    id: 2,
    title: 'Diet Preferences',
    shortTitle: 'Diet',
    iconName: 'restaurant-outline',
  },
  {
    id: 3,
    title: 'Body Analysis',
    shortTitle: 'Body',
    iconName: 'body-outline',
  },
  {
    id: 4,
    title: 'Workout Preferences',
    shortTitle: 'Fitness',
    iconName: 'barbell-outline',
  },
  {
    id: 5,
    title: 'Review',
    shortTitle: 'Done',
    iconName: 'checkmark-circle-outline',
  },
];

// ============================================================================
// ANIMATED TAB COMPONENT - Modern Minimal Design
// ============================================================================

interface AnimatedTabProps {
  tab: TabConfig;
  index: number;
  totalTabs: number;
  isActive: boolean;
  isDisabled: boolean;
  onPress: () => void;
  isLastTab: boolean;
}

const AnimatedTab: React.FC<AnimatedTabProps> = ({
  tab,
  index,
  totalTabs,
  isActive,
  isDisabled,
  onPress,
  isLastTab,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isDisabled ? 0.4 : 1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.95, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(isDisabled ? 0.4 : 1, { duration: 200 });
  }, [isActive, isDisabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Determine status for styling
  const getStatus = () => {
    if (tab.isCompleted) return 'completed';
    if (isActive) return 'active';
    if (tab.isAccessible) return 'accessible';
    return 'disabled';
  };

  const status = getStatus();

  // Get colors based on status
  const getColors = () => {
    switch (status) {
      case 'completed':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '#10B981',
          icon: '#10B981',
          text: '#10B981',
          number: '#10B981',
          numberBg: 'rgba(16, 185, 129, 0.2)',
        };
      case 'active':
        return {
          bg: 'rgba(139, 92, 246, 0.15)',
          border: '#8B5CF6',
          icon: '#8B5CF6',
          text: '#FFFFFF',
          number: '#FFFFFF',
          numberBg: '#8B5CF6',
        };
      case 'accessible':
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.2)',
          icon: 'rgba(255, 255, 255, 0.7)',
          text: 'rgba(255, 255, 255, 0.7)',
          number: 'rgba(255, 255, 255, 0.7)',
          numberBg: 'rgba(255, 255, 255, 0.1)',
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.1)',
          icon: 'rgba(255, 255, 255, 0.3)',
          text: 'rgba(255, 255, 255, 0.3)',
          number: 'rgba(255, 255, 255, 0.3)',
          numberBg: 'rgba(255, 255, 255, 0.05)',
        };
    }
  };

  const colors = getColors();

  // Render validation badge
  const renderValidationBadge = () => {
    if (!tab.validationResult) return null;
    const { is_valid, errors, warnings } = tab.validationResult;

    if (tab.isCompleted && is_valid) {
      return (
        <View style={[styles.validationBadge, { backgroundColor: '#10B981' }]}>
          <Ionicons name="checkmark" size={8} color="#FFFFFF" />
        </View>
      );
    }

    if (errors && errors.length > 0) {
      return (
        <View style={[styles.validationBadge, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.validationBadgeText}>!</Text>
        </View>
      );
    }

    if (warnings && warnings.length > 0) {
      return (
        <View style={[styles.validationBadge, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.validationBadgeText}>!</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.tabItemWrapper}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: isActive ? 2 : 1,
            },
          ]}
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive, disabled: isDisabled }}
          accessibilityLabel={`${tab.title}, Step ${tab.id} of ${totalTabs}`}
        >
          {/* Step Number Badge */}
          <View style={[styles.stepBadge, { backgroundColor: colors.numberBg }]}>
            {tab.isCompleted ? (
              <Ionicons name="checkmark" size={10} color={colors.number} />
            ) : (
              <Text style={[styles.stepNumber, { color: colors.number }]}>{tab.id}</Text>
            )}
          </View>

          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons
              name={tab.iconName as any}
              size={rs(18)}
              color={colors.icon}
            />
            {renderValidationBadge()}
          </View>

          {/* Short Title */}
          <Text
            style={[styles.tabLabel, { color: colors.text }]}
            numberOfLines={1}
          >
            {tab.shortTitle || tab.title}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Connection Line */}
      {!isLastTab && (
        <View style={styles.connectionLineWrapper}>
          <View
            style={[
              styles.connectionLine,
              {
                backgroundColor: tab.isCompleted
                  ? '#10B981'
                  : 'rgba(255, 255, 255, 0.15)',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT - Modern Fitness App Style
// ============================================================================

export const OnboardingTabBar: React.FC<OnboardingTabBarProps> = ({
  activeTab,
  tabs,
  onTabPress,
  completionPercentage,
}) => {
  // Animated values for smooth transitions
  const progressWidth = useSharedValue(0);

  // Animate progress bar on completion percentage change
  useEffect(() => {
    progressWidth.value = withTiming(completionPercentage, {
      duration: 600,
    });
  }, [completionPercentage]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <View style={styles.container}>
      {/* Header Section with Progress */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step {activeTab}</Text>
            <Text style={styles.stepDivider}>/</Text>
            <Text style={styles.totalSteps}>{tabs.length}</Text>
          </View>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>{Math.round(completionPercentage)}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, animatedProgressStyle]}>
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
        </View>

        {/* Active Tab Title */}
        <Text style={styles.activeTabTitle}>
          {activeTabData?.title || ''}
        </Text>
      </View>

      {/* Tab Navigation - Horizontal Scroll */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isDisabled = !tab.isAccessible && !tab.isCompleted && !isActive;
          const isLastTab = index === tabs.length - 1;

          return (
            <AnimatedTab
              key={tab.id}
              tab={tab}
              index={index}
              totalTabs={tabs.length}
              isActive={isActive}
              isDisabled={isDisabled}
              onPress={() => !isDisabled && onTabPress(tab.id)}
              isLastTab={isLastTab}
            />
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES - Modern Fitness App Design (Mobile-First Responsive)
// ============================================================================

// Helper to clamp values between min and max
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Get responsive values that work on both mobile and desktop
const getResponsiveSize = (mobile: number, desktop: number) => {
  const width = SCREEN_WIDTH;
  if (width < 500) return mobile;
  if (width > 900) return desktop;
  // Linear interpolation between mobile and desktop
  return mobile + ((desktop - mobile) * (width - 500)) / 400;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F0F1A',
    paddingTop: rh(8),
    paddingBottom: rh(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Header Section
  headerSection: {
    paddingHorizontal: rw(12),
    marginBottom: rh(8),
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rh(8),
  },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  stepText: {
    fontSize: rf(20),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  stepDivider: {
    fontSize: rf(14),
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: rw(3),
  },

  totalSteps: {
    fontSize: rf(14),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },

  percentageContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: rw(10),
    paddingVertical: rh(4),
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },

  percentageText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: '#A78BFA',
  },

  // Progress Bar
  progressBarContainer: {
    marginBottom: rh(6),
  },

  progressBarBg: {
    height: rh(4),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: rw(2),
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    borderRadius: rw(2),
    overflow: 'hidden',
  },

  progressGradient: {
    flex: 1,
  },

  activeTabTitle: {
    fontSize: rf(14),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.2,
  },

  // Tabs Container
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: rw(4),
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  // Tab Item
  tabItemWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabItem: {
    alignItems: 'center',
    paddingVertical: rh(6),
    paddingHorizontal: rw(2),
    borderRadius: rw(10),
    width: '100%',
    minWidth: rw(52),
  },

  stepBadge: {
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rh(3),
  },

  stepNumber: {
    fontSize: rf(9),
    fontWeight: '700',
  },

  iconWrapper: {
    position: 'relative',
    marginBottom: rh(2),
  },

  tabLabel: {
    fontSize: rf(9),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0,
    width: '100%',
  },

  // Connection Line
  connectionLineWrapper: {
    width: rw(10),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  connectionLine: {
    height: rh(2),
    width: '100%',
    borderRadius: rw(1),
  },

  // Validation Badge
  validationBadge: {
    position: 'absolute',
    top: -rh(3),
    right: -rw(4),
    width: rw(14),
    height: rw(14),
    borderRadius: rw(7),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0F0F1A',
  },

  validationBadgeText: {
    fontSize: rf(8),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default OnboardingTabBar;
