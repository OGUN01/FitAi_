import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
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
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  contextInfo: {
    gap: THEME.spacing.sm,
  },
  contextText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    lineHeight: 22,
  },
});
