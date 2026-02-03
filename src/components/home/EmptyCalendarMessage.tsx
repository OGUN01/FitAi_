import React from "react";
import { View, Text } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";

interface EmptyCalendarMessageProps {
  weekCalendarData: any[];
}

export const EmptyCalendarMessage: React.FC<EmptyCalendarMessageProps> = ({
  weekCalendarData,
}) => {
  if (!weekCalendarData || weekCalendarData.every((d) => !d.hasWorkout)) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <Text
          style={{
            color: ResponsiveTheme.colors.textSecondary,
            opacity: 0.6,
          }}
        >
          No workouts scheduled
        </Text>
      </View>
    );
  }
  return null;
};
