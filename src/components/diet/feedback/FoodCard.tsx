import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  flatColors as colors,
  spacing,
  flatFontSize as fontSize,
} from "../../../theme/aurora-tokens";
import { Card } from "../../ui";
import { rbr } from "../../../utils/responsive";
import { RecognizedFood } from "../../../services/foodRecognitionService";

interface FoodCardProps {
  food: RecognizedFood;
}

export const FoodCard: React.FC<FoodCardProps> = ({ food }) => {
  return (
    <Card style={styles.foodCard}>
      <View style={styles.foodHeader}>
        <Text style={styles.foodName}>{food.name}</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {food.confidence}% confidence
          </Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Calories</Text>
          <Text style={styles.detailValue}>
            {Math.round(food.nutrition.calories)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Portion</Text>
          <Text style={styles.detailValue}>{food.estimatedGrams}g</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Cuisine</Text>
          <Text style={styles.detailValue}>{food.cuisine}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{food.category}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  foodCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  foodHeader: {
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
  },

  confidenceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rbr(12),
  },

  confidenceText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: "600",
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  detailItem: {
    flex: 1,
    minWidth: "45%",
  },

  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },
});
