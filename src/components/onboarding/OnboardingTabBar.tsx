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
import { rf, rw, rh } from "../../utils/responsive";
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
              <Ionicons name="checkmark" size={rf(11)} color="#FFFFFF" />
            </View>
          ) : isActive ? (
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
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
              colors={["#6366F1", "#8B5CF6", "#A855F7"]}
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
          {completedCount}/{tabs.length}
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
    backgroundColor: "rgba(10, 10, 25, 0.95)",
    paddingTop: rh(6),
    paddingBottom: rh(10),
    paddingHorizontal: rw(12),
  },

  // Progress Bar
  progressBarWrapper: {
    marginBottom: rh(12),
    paddingHorizontal: rw(4),
  },

  progressBarBg: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 1,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 1,
    overflow: "hidden",
  },

  // Steps Row
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: rw(4),
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
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    backgroundColor: "#10B981",
  },

  // Step Circle
  stepCircle: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    overflow: "hidden",
  },

  stepCircleActive: {
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },

  stepCircleCompleted: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  stepCircleDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },

  activeCircleGradient: {
    width: "100%",
    height: "100%",
    borderRadius: rw(12),
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
    color: "rgba(255, 255, 255, 0.5)",
  },

  stepNumberDisabled: {
    color: "rgba(255, 255, 255, 0.2)",
  },

  // Step Label
  stepLabel: {
    fontSize: rf(9),
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.35)",
    marginTop: rh(5),
    textAlign: "center",
  },

  stepLabelActive: {
    color: "#A78BFA",
    fontWeight: "600",
  },

  stepLabelCompleted: {
    color: "#10B981",
  },

  stepLabelDisabled: {
    color: "rgba(255, 255, 255, 0.15)",
  },

  // Step Counter
  stepCounter: {
    alignItems: "center",
    marginTop: rh(8),
  },

  stepCounterText: {
    fontSize: rf(9),
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "500",
    letterSpacing: 1,
  },
});

export default OnboardingTabBar;
