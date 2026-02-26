import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';
import { FoodItem } from "../../hooks/useMealDetailLogic";

interface FoodItemsListProps {
  foods: FoodItem[];
}

export const FoodItemsList: React.FC<FoodItemsListProps> = ({ foods }) => {
  return (
    <View style={styles.foodSection}>
      <Text style={styles.sectionTitle}>Food Items</Text>

      {foods.length > 0 ? (
        foods.map((food) => (
          <Card key={food.id} style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodQuantity}>
                  {food.quantity} {food.unit}
                </Text>
              </View>
              <Text style={styles.foodCalories}>{food.calories} cal</Text>
            </View>

            <View style={styles.foodMacros}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{food.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{food.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{food.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
              {food.fiber !== undefined && food.fiber > 0 && (
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{food.fiber}g</Text>
                  <Text style={styles.macroLabel}>Fiber</Text>
                </View>
              )}
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.foodCard}>
          <Text style={styles.noFoodsText}>
            No food items recorded for this meal.
          </Text>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  foodSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  foodCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  foodQuantity: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  foodCalories: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  foodMacros: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  macroItem: {
    alignItems: "center" as const,
  },

  macroValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs / 4,
  },

  noFoodsText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    padding: ResponsiveTheme.spacing.md,
  },
});
