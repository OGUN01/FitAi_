import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { TabValidationResult } from "../../types/onboarding";
import { animations } from "../../theme/animations";

// ============================================================================
// TYPES
// ============================================================================

export interface TabConfig {
  id: number;
  title: string;
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

export const ONBOARDING_TABS: Omit<
  TabConfig,
  "isCompleted" | "isAccessible" | "validationResult"
>[] = [
  { id: 1, title: "Personal", iconName: "person" },
  { id: 2, title: "Diet", iconName: "nutrition" },
  { id: 3, title: "Body", iconName: "body" },
  { id: 4, title: "Workout", iconName: "barbell" },
  { id: 5, title: "Review", iconName: "checkmark-done" },
];

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

interface StepIndicatorProps {
  tab: TabConfig;
  isActive: boolean;
  isCompleted: boolean;
  isAccessible: boolean;
  onPress: () => void;
  index: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  tab,
  isActive,
  isCompleted,
  isAccessible,
  onPress,
  index,
  totalSteps,
}) => {
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withSpring(isActive ? 1 : 0, {
      damping: 12,
      stiffness: 120,
    });
  }, [isActive]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(animValue.value, [0, 1], [1, 1.08]) }],
  }));

  const isDisabled = !isAccessible && !isCompleted && !isActive;

  return (
    <View style={styles.stepWrapper}>
      {/* Connection Line - Left side */}
      {index > 0 && (
        <View
          style={[
            styles.connectionLine,
            styles.connectionLineLeft,
            (isCompleted || isActive) && styles.connectionLineActive,
          ]}
        />
      )}

      <Animated.View style={animatedCircleStyle}>
        <TouchableOpacity
          style={[
            styles.stepCircle,
            isActive && styles.stepCircleActive,
            isCompleted && styles.stepCircleCompleted,
            isDisabled && styles.stepCircleDisabled,
          ]}
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          {isCompleted ? (
            <View style={styles.checkmarkBg}>
              <Ionicons name="checkmark" size={rf(11)} color={ResponsiveTheme.colors.white} />
            </View>
          ) : isActive ? (
            <LinearGradient
              colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.accent]}
              style={styles.activeCircleGradient}
            >
              <Text style={styles.stepNumber}>{tab.id}</Text>
            </LinearGradient>
          ) : (
            <Text
              style={[
                styles.stepNumber,
                isDisabled && styles.stepNumberDisabled,
              ]}
            >
              {tab.id}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Label */}
      <Text
        style={[
          styles.stepLabel,
          isActive && styles.stepLabelActive,
          isCompleted && styles.stepLabelCompleted,
          isDisabled && styles.stepLabelDisabled,
        ]}
        numberOfLines={1}
      >
        {tab.title}
      </Text>

      {/* Connection Line - Right side */}
      {index < totalSteps - 1 && (
        <View
          style={[
            styles.connectionLine,
            styles.connectionLineRight,
            isCompleted && styles.connectionLineActive,
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
  const progressAnim = useSharedValue(0);
  const completedCount = tabs.filter((t) => t.isCompleted).length;

  useEffect(() => {
    progressAnim.value = withTiming(completionPercentage, { duration: 500 });
  }, [completionPercentage]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Subtle Progress Bar at Top */}
      <View style={styles.progressBarWrapper}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[styles.progressBarFill, animatedProgressStyle]}
          >
            <LinearGradient
              colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.accent, ResponsiveTheme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      {/* Step Indicators */}
      <View style={styles.stepsRow}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isCompleted = tab.isCompleted;
          const isAccessible = tab.isAccessible;

          return (
            <StepIndicator
              key={tab.id}
              tab={tab}
              isActive={isActive}
              isCompleted={isCompleted}
              isAccessible={isAccessible}
              onPress={() =>
                (isAccessible || isCompleted || isActive) && onTabPress(tab.id)
              }
              index={index}
              totalSteps={tabs.length}
            />
          );
        })}
      </View>

      {/* Minimal Step Counter */}
      <View style={styles.stepCounter}>
        <Text style={styles.stepCounterText}>
          {activeTab}/{tabs.length}
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
    backgroundColor: `${ResponsiveTheme.colors.background}F2`,
    paddingTop: rp(6),
    paddingBottom: rp(10),
    paddingHorizontal: rp(12),
  },

  // Progress Bar
  progressBarWrapper: {
    marginBottom: rp(12),
    paddingHorizontal: rp(4),
  },

  progressBarBg: {
    height: rp(2),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    borderRadius: rbr(1),
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    borderRadius: rbr(1),
    overflow: "hidden",
  },

  // Steps Row
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: rp(4),
  },

  stepWrapper: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },

  // Connection Lines
  connectionLine: {
    position: "absolute",
    top: rw(11),
    height: rp(2),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    zIndex: 0,
  },

  connectionLineLeft: {
    left: 0,
    right: "50%",
    marginRight: rw(11),
  },

  connectionLineRight: {
    left: "50%",
    right: 0,
    marginLeft: rw(11),
  },

  connectionLineActive: {
    backgroundColor: ResponsiveTheme.colors.successAlt,
  },

  // Step Circle
  stepCircle: {
    width: rw(24),
    height: rw(24),
    borderRadius: rbr(12),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderWidth: 1.5,
    borderColor: ResponsiveTheme.colors.glassHighlight,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    overflow: "hidden",
  },

  stepCircleActive: {
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: rp(10),
    boxShadow: `0px 0px ${rp(10)}px ${ResponsiveTheme.colors.primary}80`,
    elevation: 6,
  },

  stepCircleCompleted: {
    backgroundColor: ResponsiveTheme.colors.successAlt,
    borderColor: ResponsiveTheme.colors.successAlt,
  },

  stepCircleDisabled: {
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderColor: ResponsiveTheme.colors.glassSurface,
  },

  activeCircleGradient: {
    width: "100%",
    height: "100%",
    borderRadius: rbr(12),
    justifyContent: "center",
    alignItems: "center",
  },

  checkmarkBg: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  stepNumber: {
    fontSize: rf(10),
    fontWeight: "700",
    color: `${ResponsiveTheme.colors.white}80`,
  },

  stepNumberDisabled: {
    color: `${ResponsiveTheme.colors.white}33`,
  },

  // Step Label
  stepLabel: {
    fontSize: rf(9),
    fontWeight: "500",
    color: `${ResponsiveTheme.colors.white}8C`,
    marginTop: rp(5),
    textAlign: "center",
  },

  stepLabelActive: {
    color: ResponsiveTheme.colors.info,
    fontWeight: "600",
  },

  stepLabelCompleted: {
    color: ResponsiveTheme.colors.successAlt,
  },

  stepLabelDisabled: {
    color: `${ResponsiveTheme.colors.white}59`,
  },

  // Step Counter
  stepCounter: {
    alignItems: "center",
    marginTop: rp(8),
  },

  stepCounterText: {
    fontSize: rf(9),
    color: `${ResponsiveTheme.colors.white}66`,
    fontWeight: "500",
    letterSpacing: 1,
  },
});

export default OnboardingTabBar;
