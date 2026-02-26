import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw, rp } from "../../../utils/responsive";
import { MealItem } from "../../../types/ai";
import { macroColors } from "../../../hooks/useMealCard";

interface IngredientsListProps {
  foodItems: MealItem[];
  isExpanded: boolean;
  toggleExpanded: () => void;
  mealConfig: { colors: readonly [string, string, ...string[]]; icon: string };
}

export const IngredientsList: React.FC<IngredientsListProps> = ({
  foodItems,
  isExpanded,
  toggleExpanded,
  mealConfig,
}) => {
  if (foodItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.foodItemsSection}>
      {/* Toggle Header */}
      <Pressable style={styles.foodItemsHeader} onPress={toggleExpanded}>
        <View style={styles.foodItemsHeaderLeft}>
          <Ionicons
            name={isExpanded ? "restaurant" : "list-outline"}
            size={rf(16)}
            color={isExpanded ? mealConfig.colors[0] : colors.text.secondary}
          />
          <View>
            <Text
              style={[
                styles.foodItemsTitle,
                isExpanded && { color: mealConfig.colors[0] },
              ]}
            >
              {foodItems.length} Items Included
            </Text>
            {/* Preview of items when collapsed */}
            {!isExpanded && (
              <Text style={styles.foodItemsPreview} numberOfLines={1}>
                {foodItems
                  .slice(0, 3)
                  .map((item) => item.name)
                  .join(", ")}
                {foodItems.length > 3 && "..."}
              </Text>
            )}
          </View>
        </View>
        <View
          style={[
            styles.expandButton,
            isExpanded && {
              backgroundColor: `${mealConfig.colors[0]}20`,
            },
          ]}
        >
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={rf(16)}
            color={isExpanded ? mealConfig.colors[0] : colors.text.secondary}
          />
        </View>
      </Pressable>

      {/* Expanded Food List */}
      {isExpanded && (
        <View style={styles.foodItemsList}>
          {foodItems.map((item, index) => (
            <View
              key={item.id || `item-${index}`}
              style={[
                styles.foodItem,
                index === foodItems.length - 1 && styles.foodItemLast,
              ]}
            >
              {/* Left: Item details */}
              <View style={styles.foodItemLeft}>
                <Text style={styles.foodItemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.foodItemQuantity}>
                  {item.quantity ||
                    `${item.amount || 1} ${item.unit || "serving"}`}
                </Text>
              </View>

              {/* Right: Nutrition info */}
              <View style={styles.foodItemRight}>
                <Text style={styles.foodItemCalories}>
                  {Math.round(item.calories || 0)} cal
                </Text>
                <View style={styles.foodItemMacros}>
                  <Text
                    style={[
                      styles.foodItemMacro,
                      { color: macroColors.protein },
                    ]}
                  >
                    P:{Math.round(item.macros?.protein || 0)}
                  </Text>
                  <Text
                    style={[styles.foodItemMacro, { color: macroColors.carbs }]}
                  >
                    C:{Math.round(item.macros?.carbohydrates || 0)}
                  </Text>
                  <Text
                    style={[styles.foodItemMacro, { color: macroColors.fat }]}
                  >
                    F:{Math.round(item.macros?.fat || 0)}
                  </Text>
                </View>
              </View>

              {/* Logged indicator */}
              {item.isLogged && (
                <View style={styles.loggedIndicator}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(16)}
                    color={colors.success.DEFAULT}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  foodItemsSection: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.backgroundDark,
    overflow: "hidden",
  },
  foodItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  foodItemsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  foodItemsTitle: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  foodItemsPreview: {
    fontSize: typography.fontSize.micro,
    color: colors.text.muted,
    marginTop: rp(2),
    maxWidth: rw(200),
  },
  expandButton: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
  },
  foodItemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  foodItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  foodItemLast: {
    borderBottomWidth: 0,
  },
  foodItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodItemName: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: rp(2),
  },
  foodItemQuantity: {
    fontSize: typography.fontSize.micro,
    color: colors.text.secondary,
  },
  foodItemRight: {
    alignItems: "flex-end",
  },
  foodItemCalories: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: rp(2),
  },
  foodItemMacros: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  foodItemMacro: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.medium,
  },
  loggedIndicator: {
    marginLeft: spacing.sm,
  },
});
