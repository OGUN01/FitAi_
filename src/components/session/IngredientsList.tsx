import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from '../../utils/responsive';
import { DayMeal } from "../../types/ai";

interface IngredientsListProps {
  meal: DayMeal;
}

export const IngredientsList: React.FC<IngredientsListProps> = ({ meal }) => {
  return (
    <View style={styles.ingredientsSection}>
      <Text style={styles.sectionTitle}>Ingredients Needed</Text>
      {(meal.items ?? []).map((item, index) => (
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
    gap: ResponsiveTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  ingredientCard: {
    padding: ResponsiveTheme.spacing.md,
  },
  ingredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  ingredientName: {
    fontSize: rf(16),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
  },
  ingredientQuantity: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  ingredientDetails: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  ingredientCalories: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  ingredientCategory: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "capitalize",
  },
});
