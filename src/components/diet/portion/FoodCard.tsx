import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { Card } from "../../ui";
import { RecognizedFood } from "../../../services/foodRecognitionService";
import { rbr } from "../../../utils/responsive";

interface FoodCardProps {
  food: RecognizedFood;
  previewNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const FoodCard: React.FC<FoodCardProps> = ({
  food,
  previewNutrition,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.foodName}>{food.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            AI Estimate: {food.estimatedGrams}g
          </Text>
        </View>
      </View>

      <View style={styles.nutritionPreview}>
        <Text style={styles.previewTitle}>Updated Nutrition:</Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>
              {previewNutrition.calories}
            </Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>
              {previewNutrition.protein}g
            </Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>{previewNutrition.carbs}g</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>{previewNutrition.fat}g</Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  foodName: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rbr(12),
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },
  nutritionPreview: {
    marginTop: spacing.md,
  },
  previewTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  nutritionItem: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  nutritionValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "700",
  },
});
