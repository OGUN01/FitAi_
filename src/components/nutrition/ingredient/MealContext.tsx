import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
          {Math.round((ingredientData.calories / meal.totalCalories) * 100)}% of
          total calories
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
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  contextInfo: {
    gap: ResponsiveTheme.spacing.sm,
  },
  contextText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    lineHeight: 22,
  },
});
