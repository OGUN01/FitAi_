import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
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
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  foodCard: {
    marginBottom: spacing.sm,
  },

  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },

  foodQuantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  foodCalories: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  foodMacros: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  macroItem: {
    alignItems: "center" as const,
  },

  macroValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  macroLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 4,
  },

  noFoodsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    padding: spacing.md,
  },
});
