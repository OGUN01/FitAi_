import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rbr } from "../../../utils/responsive";
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
  // Percentage of calories each macro contributes — guarded against
  // divide-by-zero so a 0-calorie ingredient renders nothing instead of
  // NaN/Infinity.
  const macroPercent = (grams: number, kcalPerGram: number) => {
    const cals = ingredientData.calories;
    if (!cals || !Number.isFinite(cals) || cals <= 0) return undefined;
    return ((grams * kcalPerGram) / cals) * 100;
  };

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
          percentage={macroPercent(ingredientData.macros?.protein || 0, 4)}
        />
        <NutritionRow
          label="Carbohydrates"
          value={ingredientData.macros?.carbohydrates || 0}
          unit="g"
          color="#45B7D1"
          percentage={macroPercent(ingredientData.macros?.carbohydrates || 0, 4)}
        />
        <NutritionRow
          label="Fat"
          value={ingredientData.macros?.fat || 0}
          unit="g"
          color="#96CEB4"
          percentage={macroPercent(ingredientData.macros?.fat || 0, 9)}
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
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  calorieSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  calorieLabel: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  calorieValue: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.errorLight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  macroSection: {
    gap: spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  nutritionLabel: {
    fontSize: fontSize.md,
    color: colors.text,
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
    fontSize: fontSize.md,
    fontWeight: "700",
    marginRight: spacing.md,
  },
  percentageContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  percentageBar: {
    height: 6,
    flex: 1,
    borderRadius: rbr(3),
    marginRight: spacing.sm,
  },
  percentageFill: {
    height: "100%",
    borderRadius: rbr(3),
  },
  percentageText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    width: 30,
  },
});
