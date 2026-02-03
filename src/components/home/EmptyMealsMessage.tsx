import React from "react";
import { View, Text } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";

interface EmptyMealsMessageProps {
  mealsLogged: number;
}

export const EmptyMealsMessage: React.FC<EmptyMealsMessageProps> = ({
  mealsLogged,
}) => {
  if (mealsLogged !== 0) return null;

  return (
    <View
      style={{
        alignItems: "center",
        marginTop: ResponsiveTheme.spacing.sm,
      }}
    >
      <Text
        style={{
          color: ResponsiveTheme.colors.textSecondary,
          opacity: 0.6,
          fontSize: ResponsiveTheme.fontSize.sm,
        }}
      >
        No meals logged today
      </Text>
    </View>
  );
};
