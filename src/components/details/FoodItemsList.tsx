import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";
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
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  foodCard: {
    marginBottom: THEME.spacing.sm,
  },

  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: THEME.spacing.sm,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  foodQuantity: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  foodCalories: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  foodMacros: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  macroItem: {
    alignItems: "center" as const,
  },

  macroValue: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  macroLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 4,
  },

  noFoodsText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    padding: THEME.spacing.md,
  },
});
