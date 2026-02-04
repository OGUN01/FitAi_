import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { DayMeal } from "../../../types/ai";
import { MacroRings } from "./MacroRings";

interface NutritionBreakdownProps {
  meal: DayMeal;
  macroPercentages: {
    protein: number;
    carbs: number;
    fat: number;
  };
  fiber: number;
}

export const NutritionBreakdown: React.FC<NutritionBreakdownProps> = ({
  meal,
  macroPercentages,
  fiber,
}) => {
  return (
    <View style={styles.nutritionRow}>
      {/* Macro Rings */}
      <MacroRings
        meal={meal}
        macroPercentages={macroPercentages}
        fiber={fiber}
      />

      {/* Calories Display */}
      <View style={styles.caloriesContainer}>
        <Text style={styles.caloriesValue}>{meal.totalCalories || 0}</Text>
        <Text style={styles.caloriesLabel}>calories</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.lg,
  },
  caloriesContainer: {
    alignItems: "flex-end",
  },
  caloriesValue: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  caloriesLabel: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
});
