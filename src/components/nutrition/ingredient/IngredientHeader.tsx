import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
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
    marginBottom: THEME.spacing.xl,
  },
  ingredientIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: THEME.spacing.lg,
  },
  iconText: {
    fontSize: 40,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  ingredientCategory: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.primary,
    fontWeight: "600",
    marginBottom: THEME.spacing.xs,
  },
  quantityText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});
