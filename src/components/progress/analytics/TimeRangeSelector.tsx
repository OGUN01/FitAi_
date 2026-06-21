import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';
import { rf, rp } from "../../../utils/responsive";


interface TimeRange {
  id: "week" | "month" | "year";
  label: string;
  icon: string;
}

interface TimeRangeSelectorProps {
  selectedRange: "week" | "month" | "year";
  onRangeChange: (range: "week" | "month" | "year") => void;
}

const timeRanges: readonly TimeRange[] = [
  { id: "week", label: "Week", icon: "📅" },
  { id: "month", label: "Month", icon: "🗓️" },
  { id: "year", label: "Year", icon: "📆" },
] as const;

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  return (
    <View style={styles.timeRangeSelector}>
      {timeRanges.map((range) => (
        <TouchableOpacity
          key={range.id}
          style={[
            styles.timeRangeButton,
            selectedRange === range.id && styles.timeRangeButtonActive,
          ]}
          onPress={() => onRangeChange(range.id)}
        >
          <Text style={styles.timeRangeIcon}>{range.icon}</Text>
          <Text
            style={[
              styles.timeRangeLabel,
              selectedRange === range.id && styles.timeRangeLabelActive,
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: rp(4),
  },
  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeIcon: {
    fontSize: rf(16),
    marginRight: spacing.xs,
  },
  timeRangeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  timeRangeLabelActive: {
    color: colors.white,
  },
});
