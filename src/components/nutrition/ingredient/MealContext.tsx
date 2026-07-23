import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rbr } from "../../../utils/responsive";
import { DayMeal, MealItem } from "../../../types/ai";

interface MealContextProps {
  meal: DayMeal;
  ingredientData: MealItem;
}

export const MealContext: React.FC<MealContextProps> = ({
  meal,
  ingredientData,
}) => {
  return (
    <View style={styles.contextCard}>
      <Text style={styles.sectionTitle}>In This Meal</Text>
      <View style={styles.contextInfo}>
        <Text style={styles.contextText}>🍽️ Part of: {meal.name}</Text>
        <Text style={styles.contextText}>
          📊 Contributes{" "}
          {meal.totalCalories > 0
            ? Math.round((ingredientData.calories / meal.totalCalories) * 100)
            : 0}
          % of total calories
        </Text>
        <Text style={styles.contextText}>
          💪 Provides {Math.round(ingredientData.macros?.protein || 0)}g of the
          meal's {Math.round(meal.totalMacros?.protein || 0)}g protein
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contextCard: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  contextInfo: {
    gap: spacing.sm,
  },
  contextText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
});
