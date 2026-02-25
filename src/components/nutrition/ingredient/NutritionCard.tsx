import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
import { MealItem } from "../../../types/ai";

interface NutritionRowProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  percentage?: number;
}

const NutritionRow: React.FC<NutritionRowProps> = ({
  label,
  value,
  unit,
  color,
  percentage,
}) => (
  <View style={styles.nutritionRow}>
    <Text style={styles.nutritionLabel}>{label}</Text>
    <View style={styles.nutritionValueContainer}>
      <Text style={[styles.nutritionValue, { color }]}>
        {Math.round(value * 10) / 10}
        {unit}
      </Text>
      {percentage && percentage > 0 && (
        <View style={styles.percentageContainer}>
          <View
            style={[styles.percentageBar, { backgroundColor: color + "20" }]}
          >
            <View
              style={[
                styles.percentageFill,
                {
                  backgroundColor: color,
                  width: `${Math.min(percentage, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
        </View>
      )}
    </View>
  </View>
);

interface NutritionCardProps {
  ingredientData: MealItem;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  ingredientData,
}) => {
  return (
    <View style={styles.nutritionCard}>
      <Text style={styles.sectionTitle}>Nutrition Facts</Text>

      <View style={styles.calorieSection}>
        <Text style={styles.calorieLabel}>Calories</Text>
        <Text style={styles.calorieValue}>
          {Math.round(ingredientData.calories)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.macroSection}>
        <NutritionRow
          label="Protein"
          value={ingredientData.macros?.protein || 0}
          unit="g"
          color="#4ECDC4"
          percentage={
            (((ingredientData.macros?.protein || 0) * 4) /
              ingredientData.calories) *
            100
          }
        />
        <NutritionRow
          label="Carbohydrates"
          value={ingredientData.macros?.carbohydrates || 0}
          unit="g"
          color="#45B7D1"
          percentage={
            (((ingredientData.macros?.carbohydrates || 0) * 4) /
              ingredientData.calories) *
            100
          }
        />
        <NutritionRow
          label="Fat"
          value={ingredientData.macros?.fat || 0}
          unit="g"
          color="#96CEB4"
          percentage={
            (((ingredientData.macros?.fat || 0) * 9) /
              ingredientData.calories) *
            100
          }
        />
        <NutritionRow
          label="Fiber"
          value={ingredientData.macros?.fiber || 0}
          unit="g"
          color="#FF8A5C"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nutritionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  calorieSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  calorieLabel: {
    fontSize: THEME.fontSize.lg,
    fontWeight: "600",
    color: THEME.colors.text,
  },
  calorieValue: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: "700",
    color: "#FF6B6B",
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  macroSection: {
    gap: THEME.spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: THEME.spacing.sm,
  },
  nutritionLabel: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: "500",
    flex: 1,
  },
  nutritionValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "flex-end",
  },
  nutritionValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: "700",
    marginRight: THEME.spacing.md,
  },
  percentageContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  percentageBar: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    marginRight: THEME.spacing.sm,
  },
  percentageFill: {
    height: "100%",
    borderRadius: 3,
  },
  percentageText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    width: 30,
  },
});
