/**
 * PeriodSelector Component
 * Animated segmented control for time period selection
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";

export type Period = "week" | "month" | "year";

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const selectedIndex = PERIODS.findIndex((p) => p.key === selectedPeriod);

  // Calculate segment width based on container
  const padding = rp(4);
  const segmentWidth =
    containerWidth > 0 ? (containerWidth - padding * 2) / PERIODS.length : 0;

  // Animate position
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(selectedIndex * segmentWidth, {
        damping: 20,
        stiffness: 150,
      });
    }
  }, [selectedIndex, segmentWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    // Immediately set position on layout
    const seg = (width - padding * 2) / PERIODS.length;
    translateX.value = selectedIndex * seg;
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Sliding Indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.indicatorGradient}
        />
      </Animated.View>

      {/* Period Buttons */}
      {PERIODS.map((period, index) => (
        <View key={period.key} style={styles.buttonWrapper}>
          <AnimatedPressable
            style={styles.button}
            onPress={() => onPeriodChange(period.key)}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="light"
          >
            <Text
              style={[
                styles.buttonText,
                selectedPeriod === period.key && styles.buttonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HORIZONTAL_PADDING = ResponsiveTheme.spacing.lg * 2; // Account for parent padding

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: rp(4),
    position: "relative",
    width: SCREEN_WIDTH - HORIZONTAL_PADDING,
  },
  indicator: {
    position: "absolute",
    top: rp(4),
    left: rp(4),
    bottom: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },
  indicatorGradient: {
    flex: 1,
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 1,
  },
  buttonText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  buttonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default PeriodSelector;
