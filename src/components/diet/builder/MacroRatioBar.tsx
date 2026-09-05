/**
 * MacroRatioBar — tiny single-row, 3-segment horizontal bar showing a meal
 * slot's macro composition (protein / carbs / fat) as a proportion of its
 * total calories (protein×4 / carbs×4 / fat×9, normalized to 100%).
 *
 * The one genuinely new visual idiom in the Meal Builder (per the Phase 5
 * plan) — nothing in the workout builder has an analogue (push/pull ratio is
 * a single number, not a composition). Borrows its staggered-fill animation
 * from WeeklyInsightsPanel's CoverageBar (`withDelay(i*150, withTiming(...))`).
 *
 * Colors are the exact macro palette (MACRO_PILL_COLORS) — never invented.
 */
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { MACRO_PILL_COLORS } from "../macroColors";
import { surface, borderRadius } from "../../../theme/aurora-tokens";
import { rp } from "../../../utils/responsive";

export interface MacroRatioBarProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Bar height in px. @default 4 */
  height?: number;
  testID?: string;
}

interface Segment {
  key: "protein" | "carbs" | "fat";
  pct: number;
  color: string;
}

function buildSegments(proteinG: number, carbsG: number, fatG: number): Segment[] {
  const proteinKcal = Math.max(0, proteinG) * 4;
  const carbsKcal = Math.max(0, carbsG) * 4;
  const fatKcal = Math.max(0, fatG) * 9;
  const total = proteinKcal + carbsKcal + fatKcal;
  if (total <= 0) {
    return [
      { key: "protein", pct: 0, color: MACRO_PILL_COLORS.protein },
      { key: "carbs", pct: 0, color: MACRO_PILL_COLORS.carbs },
      { key: "fat", pct: 0, color: MACRO_PILL_COLORS.fat },
    ];
  }
  return [
    { key: "protein", pct: (proteinKcal / total) * 100, color: MACRO_PILL_COLORS.protein },
    { key: "carbs", pct: (carbsKcal / total) * 100, color: MACRO_PILL_COLORS.carbs },
    { key: "fat", pct: (fatKcal / total) * 100, color: MACRO_PILL_COLORS.fat },
  ];
}

const SegmentFill: React.FC<{ segment: Segment; index: number }> = ({ segment, index }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withTiming(segment.pct, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [segment.pct, index, progress]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  if (segment.pct <= 0) return null;

  return (
    <Animated.View
      style={[styles.segment, style, { backgroundColor: segment.color }]}
    />
  );
};

export const MacroRatioBar: React.FC<MacroRatioBarProps> = ({
  proteinG,
  carbsG,
  fatG,
  height = 4,
  testID,
}) => {
  const segments = buildSegments(proteinG, carbsG, fatG);
  const isEmpty = segments.every((s) => s.pct <= 0);

  return (
    <View
      style={[styles.track, { height: rp(height) }]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Macro ratio: protein, carbs, fat"
    >
      {isEmpty ? null : segments.map((segment, index) => (
        <SegmentFill key={segment.key} segment={segment} index={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    width: "100%",
    borderRadius: borderRadius.full,
    overflow: "hidden",
    backgroundColor: surface[2],
  },
  segment: {
    height: "100%",
  },
});

export default MacroRatioBar;
