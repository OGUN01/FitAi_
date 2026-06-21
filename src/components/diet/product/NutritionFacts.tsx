import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
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
        <Text style={styles.nutritionValue}>{Number(nutrition.calories).toFixed(0)}</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Protein</Text>
        <Text style={styles.nutritionValue}>{Number(nutrition.protein).toFixed(1)}g</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Carbs</Text>
        <Text style={styles.nutritionValue}>{Number(nutrition.carbs).toFixed(1)}g</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Fat</Text>
        <Text style={styles.nutritionValue}>{Number(nutrition.fat).toFixed(1)}g</Text>
      </View>
      <View style={styles.nutritionItem}>
        <Text style={styles.nutritionLabel}>Fiber</Text>
        <Text style={styles.nutritionValue}>{Number(nutrition.fiber).toFixed(1)}g</Text>
      </View>
      {nutrition.sugar !== undefined && (
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Sugar</Text>
          <Text style={styles.nutritionValue}>{Number(nutrition.sugar).toFixed(1)}g</Text>
        </View>
      )}
      {nutrition.sodium !== undefined && (
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Sodium</Text>
          <Text style={styles.nutritionValue}>{Number(nutrition.sodium).toFixed(2)}g</Text>
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  nutritionContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  nutritionItem: {
    width: "48%",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  nutritionValue: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.text,
  },
});
