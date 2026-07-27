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
      <Text style={styles.sectionTitle} numberOfLines={1}>Ingredients</Text>

      {foods.length > 0 ? (
        foods.map((food) => (
          <Card key={food.id} style={styles.foodCard}>
            <View
              style={styles.foodRow}
              accessibilityRole="summary"
              accessibilityLabel={`${food.name}, ${food.quantity} ${food.unit}, ${food.calories} calories`}
            >
              <Text
                style={styles.foodName}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {food.name}
              </Text>
              <View style={styles.foodRight}>
                <Text style={styles.foodQuantity} numberOfLines={1}>
                  {food.quantity} {food.unit}
                </Text>
                <Text
                  style={styles.foodCalories}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {food.calories} cal
                </Text>
              </View>
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
              No ingredients recorded for this meal.
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

  foodRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },

  foodName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },

  foodRight: {
    flexShrink: 0,
    alignItems: "flex-end" as const,
    minWidth: rf(72),
  },

  foodQuantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },

  foodCalories: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
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
