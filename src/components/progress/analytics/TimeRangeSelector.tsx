import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { THEME } from "../../ui";

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
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
  },
  timeRangeButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  timeRangeIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.xs,
  },
  timeRangeLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  timeRangeLabelActive: {
    color: THEME.colors.white,
  },
});
