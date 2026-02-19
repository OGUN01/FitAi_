import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rh, rw, rp } from "../../../utils/responsive";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionSummaryProps {
  nutrition: NutritionData;
}

export const NutritionSummary: React.FC<NutritionSummaryProps> = ({
  nutrition,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Nutrition Summary</Text>
      <View style={styles.nutritionGrid}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={styles.nutritionValue}>
            {Math.round(nutrition.calories)}
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>
            {Math.round(nutrition.protein)}g
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={styles.nutritionValue}>
            {Math.round(nutrition.carbs)}g
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fat</Text>
          <Text style={styles.nutritionValue}>
            {Math.round(nutrition.fat)}g
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: rh(20),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(12),
  },
  nutritionItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rf(12),
    padding: rp(12),
    alignItems: "center" as const,
  },
  nutritionLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(4),
  },
  nutritionValue: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
});
