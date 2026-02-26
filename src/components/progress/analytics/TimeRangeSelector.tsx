import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ResponsiveTheme } from '../../../utils/constants';
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
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: rp(4),
  },
  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  timeRangeButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  timeRangeIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },
  timeRangeLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  timeRangeLabelActive: {
    color: ResponsiveTheme.colors.white,
  },
});
