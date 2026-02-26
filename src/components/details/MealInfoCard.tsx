import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';
import { rf } from '../../utils/responsive';
import { MealData } from "../../hooks/useMealDetailLogic";

interface MealInfoCardProps {
  meal: MealData;
  mealIcon: string;
  formattedDate: string;
}

export const MealInfoCard: React.FC<MealInfoCardProps> = ({
  meal,
  mealIcon,
  formattedDate,
}) => {
  return (
    <Card style={styles.mealCard} variant="elevated">
      <View style={styles.mealHeader}>
        <View style={styles.mealInfo}>
          <View style={styles.mealTitleRow}>
            <Text style={styles.mealIcon}>{mealIcon}</Text>
            <Text style={styles.mealName}>{meal.name}</Text>
            {meal.isCompleted && <Text style={styles.completedBadge}>✓</Text>}
          </View>
          <Text style={styles.mealTime}>
            {meal.time ? `${meal.time} • ` : ""}
            {formattedDate}
          </Text>
        </View>

        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesValue}>{meal.totalCalories}</Text>
          <Text style={styles.caloriesLabel}>calories</Text>
        </View>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.totalProtein}g</Text>
          <Text style={styles.statLabel}>Protein</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.totalCarbs}g</Text>
          <Text style={styles.statLabel}>Carbs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.totalFat}g</Text>
          <Text style={styles.statLabel}>Fat</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.foods.length}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mealCard: {
    marginVertical: ResponsiveTheme.spacing.md,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealInfo: {
    flex: 1,
  },

  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  mealName: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  completedBadge: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.success,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  mealTime: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },

  caloriesContainer: {
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },

  caloriesValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  caloriesLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    marginTop: ResponsiveTheme.spacing.xs / 2,
  },

  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  statItem: {
    alignItems: "center" as const,
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs / 2,
  },
});
