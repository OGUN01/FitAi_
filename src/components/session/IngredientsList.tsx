import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";
import { DayMeal } from "../../types/ai";

interface IngredientsListProps {
  meal: DayMeal;
}

export const IngredientsList: React.FC<IngredientsListProps> = ({ meal }) => {
  return (
    <View style={styles.ingredientsSection}>
      <Text style={styles.sectionTitle}>Ingredients Needed</Text>
      {meal.items.map((item, index) => (
        <Card key={index} style={styles.ingredientCard}>
          <View style={styles.ingredientHeader}>
            <Text style={styles.ingredientName}>{item.name}</Text>
            <Text style={styles.ingredientQuantity}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.ingredientDetails}>
            <Text style={styles.ingredientCalories}>{item.calories} cal</Text>
            <Text style={styles.ingredientCategory}>{item.category}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  ingredientsSection: {
    gap: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  ingredientCard: {
    padding: THEME.spacing.md,
  },
  ingredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: THEME.spacing.xs,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "500",
    color: THEME.colors.text,
  },
  ingredientQuantity: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  ingredientDetails: {
    flexDirection: "row",
    gap: THEME.spacing.md,
  },
  ingredientCalories: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  ingredientCategory: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textTransform: "capitalize",
  },
});
