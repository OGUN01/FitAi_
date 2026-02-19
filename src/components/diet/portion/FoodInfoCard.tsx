import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../ui";
import { ResponsiveTheme } from "../../../utils/constants";
import { RecognizedFood } from "../../../services/foodRecognitionService";

interface FoodInfoCardProps {
  currentFood: RecognizedFood;
  previewNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const FoodInfoCard: React.FC<FoodInfoCardProps> = ({
  currentFood,
  previewNutrition,
}) => {
  return (
    <Card style={styles.foodCard}>
      <View style={styles.foodHeader}>
        <Text style={styles.foodName}>{currentFood.name}</Text>
        <View style={styles.originalBadge}>
          <Text style={styles.originalText}>
            AI Estimate: {currentFood.estimatedGrams}g
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
  foodCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  foodName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  originalBadge: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: 12,
  },
  originalText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: "600",
  },
  nutritionPreview: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  previewTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },
  nutritionItem: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center" as const,
  },
  nutritionLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  nutritionValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "700",
  },
});
