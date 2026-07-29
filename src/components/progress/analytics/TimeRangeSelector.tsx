/**
 * TimeRangeSelector (analytics) - Aurora 2026
 *
 * Sliding segmented control on surface.2 track, Manrope type,
 * no emojis, no drop shadows.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  colors,
  surface,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { haptics } from "../../../utils/haptics";

interface TimeRange {
  id: "week" | "month" | "year";
  label: string;
}

const timeRanges: readonly TimeRange[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
] as const;

interface TimeRangeSelectorProps {
  selectedRange: "week" | "month" | "year";
  onRangeChange: (range: "week" | "month" | "year") => void;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  return (
    <View style={styles.timeRangeSelector}>
      {timeRanges.map((range) => {
        const active = selectedRange === range.id;
        return (
          <TouchableOpacity
            key={range.id}
            style={[
              styles.timeRangeButton,
              active && styles.timeRangeButtonActive,
            ]}
            onPress={() => {
              haptics.light();
              onRangeChange(range.id);
            }}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={range.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.timeRangeLabel,
                active && styles.timeRangeLabelActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: surface[2],
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  timeRangeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 36,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  timeRangeLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  timeRangeLabelActive: {
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
});

export default TimeRangeSelector;
