import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
import type { ScannedProduct } from "../../../services/barcodeService";

interface NutritionFactsProps {
  nutrition: ScannedProduct["nutrition"];
}

export const NutritionFacts: React.FC<NutritionFactsProps> = ({
  nutrition,
}) => (
  <View style={styles.nutritionContainer}>
    <Text style={styles.sectionTitle}>Nutrition Facts (per 100g)</Text>
    <View style={styles.nutritionGrid}>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Calories</Text>
        <Text style={styles.nutritionValue}>{nutrition.calories}</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Protein</Text>
        <Text style={styles.nutritionValue}>{nutrition.protein}g</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Carbs</Text>
        <Text style={styles.nutritionValue}>{nutrition.carbs}g</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Fat</Text>
        <Text style={styles.nutritionValue}>{nutrition.fat}g</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Fiber</Text>
        <Text style={styles.nutritionValue}>{nutrition.fiber}g</Text>
      </View>
      {nutrition.sugar !== undefined && (
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Sugar</Text>
          <Text style={styles.nutritionValue}>{nutrition.sugar}g</Text>
        </View>
      )}
      {nutrition.sodium !== undefined && (
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Sodium</Text>
          <Text style={styles.nutritionValue}>{nutrition.sodium}g</Text>
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  nutritionContainer: {
    padding: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  nutritionItem: {
    width: "48%",
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },
  nutritionValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
  },
});
