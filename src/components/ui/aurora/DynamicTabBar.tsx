/**
 * DynamicTabBar Component
 * Animated tab bar with liquid morph indicator
 * Features progress integration and validation state indicators
 */

import React, { useEffect } from "react";
import { StyleSheet, View, Text, Pressable, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { colors, typography, spacing } from "../../../theme/aurora-tokens";
import { gradients, toLinearGradientProps } from "../../../theme/gradients";
import {
  springConfig,
  duration,
  easingFunctions,
} from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export interface TabItem {
  /**
   * Tab identifier
   */
  id: string | number;

  /**
   * Tab title/label
   */
  title: string;

  /**
   * Tab icon (emoji or React component)
   */
  icon?: React.ReactNode;

  /**
   * Is this tab completed?
   */
  isCompleted?: boolean;

  /**
   * Is this tab accessible/enabled?
   */
  isAccessible?: boolean;

  /**
   * Validation state
   */
  validationState?: "valid" | "invalid" | "warning" | "none";
}

export interface DynamicTabBarProps {
  /**
   * Array of tabs
   */
  tabs: TabItem[];

  /**
   * Current active tab index
   */
  activeIndex: number;

  /**
   * Overall completion progress (0-100)
   */
  progress?: number;

  /**
   * Tab press handler
   */
  onTabPress: (index: number) => void;

  /**
   * Show progress bar
   * @default true
   */
  showProgress?: boolean;

  /**
   * Show validation indicators
   * @default true
   */
  showValidation?: boolean;

  /**
   * Enable liquid morph animation
   * @default true
   */
  liquidMorphEnabled?: boolean;

  /**
   * Tab bar height
   * @default 80
   */
  height?: number;

  /**
   * Additional styles
   */
  style?: ViewStyle;
}

export const DynamicTabBar: React.FC<DynamicTabBarProps> = ({
  tabs,
  activeIndex,
  progress = 0,
  onTabPress,
  showProgress = true,
  showValidation = true,
  liquidMorphEnabled = true,
  height = 80,
  style,
}) => {
  // Animated values for liquid morph indicator
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Animated value for progress bar
  const progressValue = useSharedValue(progress);

  // Update progress animation
  useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: duration.slow,
      easing: easingFunctions.easeOutCubic,
    });
  }, [progress]);

  // Update indicator position and width with liquid morph
  useEffect(() => {
    if (liquidMorphEnabled) {
      indicatorX.value = withSpring(activeIndex, springConfig.smooth);
      indicatorWidth.value = withSpring(1, springConfig.smooth);
    } else {
      indicatorX.value = withTiming(activeIndex, {
        duration: duration.normal,
        easing: easingFunctions.easeInOut,
      });
      indicatorWidth.value = 1;
    }
  }, [activeIndex, liquidMorphEnabled]);

  // Animated style for the indicator
  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / tabs.length;

    return {
      left: `${interpolate(
        indicatorX.value,
        [0, tabs.length - 1],
        [0, 100 - tabWidth],
        Extrapolate.CLAMP,
      )}%`,
      width: `${tabWidth * indicatorWidth.value}%`,
    };
  });

  // Animated style for progress bar
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  // Get validation indicator color
  const getValidationColor = (
    state?: "valid" | "invalid" | "warning" | "none",
  ) => {
    switch (state) {
      case "valid":
        return colors.success.DEFAULT;
      case "invalid":
        return colors.error.DEFAULT;
      case "warning":
        return colors.warning.DEFAULT;
      case "none":
      default:
        return "transparent";
    }
  };

  // Handle tab press
  const handleTabPress = (index: number) => {
    const tab = tabs[index];

    // Check if tab is accessible
    if (tab.isAccessible === false) {
      haptics.warning();
      return;
    }

    // Haptic feedback
    haptics.selection();

    // Call handler
    onTabPress(index);
  };

  return (
    <View style={[styles.container, { height }, style]}>
      {/* Progress Bar */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <AnimatedLinearGradient
              {...(toLinearGradientProps(gradients.button.primary) as any)}
              style={[styles.progressFill, progressStyle]}
            />
          </View>
        </View>
      )}

      {/* Tabs Container */}
      <View style={styles.tabsContainer}>
        {/* Liquid Morph Indicator */}
        <AnimatedLinearGradient
          {...(toLinearGradientProps(gradients.button.primary) as any)}
          style={[styles.indicator, indicatorStyle]}
        />

        {/* Tabs */}
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const isDisabled = tab.isAccessible === false;

          return (
            <Pressable
              key={tab.id}
              onPress={() => handleTabPress(index)}
              disabled={isDisabled}
              style={[styles.tab, { width: `${100 / tabs.length}%` }]}
              accessible={true}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{
                selected: isActive,
                disabled: isDisabled,
              }}
            >
              <View style={styles.tabContent}>
                {/* Icon */}
                {tab.icon && (
                  <View style={styles.iconContainer}>
                    {typeof tab.icon === "string" ? (
                      <Text
                        style={[
                          styles.iconEmoji,
                          isActive && styles.iconActive,
                        ]}
                      >
                        {tab.icon}
                      </Text>
                    ) : (
                      tab.icon
                    )}
                  </View>
                )}

                {/* Title */}
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                    isDisabled && styles.tabTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {tab.title}
                </Text>

                {/* Validation Indicator */}
                {showValidation &&
                  tab.validationState &&
                  tab.validationState !== "none" && (
                    <View
                      style={[
                        styles.validationDot,
                        {
                          backgroundColor: getValidationColor(
                            tab.validationState,
                          ),
                        },
                      ]}
                    />
                  )}

                {/* Completion Checkmark */}
                {tab.isCompleted && (
                  <View style={styles.completionBadge}>
                    <Text style={styles.completionCheck}>✓</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.background.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  progressContainer: {
    height: 4,
    width: "100%",
    paddingHorizontal: spacing.md,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.glass.background,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  tabContent: {
    alignItems: "center",
    gap: spacing.xs,
    position: "relative",
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  iconEmoji: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.text.muted,
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold as any,
  },
  tabTextDisabled: {
    opacity: 0.4,
  },
  validationDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.background.DEFAULT,
  },
  completionBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  completionCheck: {
    fontSize: 10,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold as any,
  },
});

// Export default
export default DynamicTabBar;
