import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { Card } from "../../ui";
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

  confidenceBadge: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: 12,
  },

  confidenceText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.white,
    fontWeight: "600",
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  detailItem: {
    flex: 1,
    minWidth: "45%",
  },

  detailLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  detailValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "600",
  },
});
