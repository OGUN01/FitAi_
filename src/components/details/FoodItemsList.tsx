import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rf, rw } from '../../utils/responsive';
import { FoodItem } from "../../hooks/useMealDetailLogic";

interface FoodItemsListProps {
  foods: FoodItem[];
}

export const FoodItemsList: React.FC<FoodItemsListProps> = ({ foods }) => {
  return (
    <View style={styles.foodSection}>
      <Text style={styles.sectionTitle} numberOfLines={1}>Food Items</Text>

      {foods.length > 0 ? (
        foods.map((food) => (
          <Card key={food.id} style={styles.foodCard}>
            <View
              style={styles.foodHeader}
              accessibilityRole="summary"
              accessibilityLabel={`${food.name}, ${food.quantity} ${food.unit}, ${food.calories} calories`}
            >
              <View style={styles.foodInfo}>
                <Text
                  style={styles.foodName}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {food.name}
                </Text>
                <Text style={styles.foodQuantity} numberOfLines={1}>
                  {food.quantity} {food.unit}
                </Text>
              </View>
              <View style={styles.foodCaloriesWrap}>
                <Text
                  style={styles.foodCalories}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {food.calories}
                </Text>
                <Text style={styles.foodCaloriesUnit} numberOfLines={1}>cal</Text>
              </View>
            </View>

            <View style={styles.foodMacros}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {food.protein}g
                </Text>
                <Text style={styles.macroLabel} numberOfLines={1}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {food.carbs}g
                </Text>
                <Text style={styles.macroLabel} numberOfLines={1}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {food.fat}g
                </Text>
                <Text style={styles.macroLabel} numberOfLines={1}>Fat</Text>
              </View>
              {food.fiber !== undefined && food.fiber > 0 ? (
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {food.fiber}g
                  </Text>
                  <Text style={styles.macroLabel} numberOfLines={1}>Fiber</Text>
                </View>
              ) : null}
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.foodCard}>
          <View style={styles.noFoodsWrap}>
            <Ionicons
              name="restaurant-outline"
              size={rf(28)}
              color={colors.textSecondary}
            />
            <Text style={styles.noFoodsText}>
              No food items recorded for this meal.
            </Text>
          </View>
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
    minWidth: 0,
    marginRight: spacing.sm,
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

  foodCaloriesWrap: {
    flexShrink: 0,
    alignItems: "flex-end" as const,
    minWidth: rf(48),
  },

  foodCalories: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },

  foodCaloriesUnit: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  foodMacros: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: spacing.sm,
    borderTopWidth: Math.max(rw(1), 1),
    borderTopColor: colors.border,
  },

  macroItem: {
    flex: 1,
    alignItems: "center" as const,
    paddingHorizontal: spacing.xs / 2,
  },

  macroValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  macroLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 4,
  },

  noFoodsWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  noFoodsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
