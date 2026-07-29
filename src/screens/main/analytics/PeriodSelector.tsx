/**
 * PeriodSelector Component
 * Sliding segmented control with an animated indicator (Reanimated).
 * Aurora 2026: surface.1 track, surface.2 indicator, border.subtle hairline.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  surface,
  border as borderTokens,
  borderRadius,
  colors,
  typography,
} from "../../../theme/aurora-tokens";
import { rf, rp } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

export type Period = "week" | "month" | "quarter" | "year";

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

const TRACK_PADDING = rp(4);

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const selectedIndex = PERIODS.findIndex((p) => p.key === selectedPeriod);

  const segmentWidth =
    containerWidth > 0
      ? (containerWidth - TRACK_PADDING * 2) / PERIODS.length
      : 0;

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
    const seg = (width - TRACK_PADDING * 2) / PERIODS.length;
    translateX.value = selectedIndex * seg;
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Sliding Indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {/* Period Buttons */}
      {PERIODS.map((period) => (
        <View key={period.key} style={styles.buttonWrapper}>
          <AnimatedPressable
            style={styles.button}
            onPress={() => {
              haptics.selection();
              onPeriodChange(period.key);
            }}
            scaleValue={0.97}
            hapticFeedback={false}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPeriod === period.key }}
            accessibilityLabel={period.label}
          >
            <Text
              style={[
                styles.buttonText,
                selectedPeriod === period.key && styles.buttonTextActive,
              ]}
              numberOfLines={1}
            >
              {period.label}
            </Text>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: TRACK_PADDING,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: borderRadius.md,
    backgroundColor: surface[2],
    borderWidth: 1,
    borderColor: borderTokens.DEFAULT,
  },
  buttonWrapper: {
    flex: 1,
    zIndex: 1,
  },
  button: {
    flex: 1,
    paddingVertical: rp(10),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  buttonText: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: rf(13),
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },
  buttonTextActive: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    color: colors.text.primary,
  },
});

export default PeriodSelector;
