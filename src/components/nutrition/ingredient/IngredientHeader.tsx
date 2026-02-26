import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rbr, rw, rh } from "../../../utils/responsive";
import { MealItem } from "../../../types/ai";

interface IngredientHeaderProps {
  ingredientData: MealItem;
}

export const IngredientHeader: React.FC<IngredientHeaderProps> = ({
  ingredientData,
}) => {
  return (
    <View style={styles.ingredientHeader}>
      <View style={styles.ingredientIcon}>
        <Text style={styles.iconText}>🥘</Text>
      </View>
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName}>{ingredientData.name}</Text>
        <Text style={styles.ingredientCategory}>AI-Generated Ingredient</Text>
        <Text style={styles.quantityText}>
          {ingredientData.quantity}
          {ingredientData.unit || "g"} in this meal
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  ingredientIcon: {
    width: rw(80),
    height: rh(80),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.lg,
  },
  iconText: {
    fontSize: rf(40),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  ingredientCategory: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    fontWeight: "600",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  quantityText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
