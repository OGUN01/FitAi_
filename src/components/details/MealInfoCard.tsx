import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
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
    marginVertical: spacing.md,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  mealInfo: {
    flex: 1,
  },

  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.xs,
  },

  mealIcon: {
    fontSize: rf(24),
    marginRight: spacing.sm,
  },

  mealName: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  completedBadge: {
    fontSize: fontSize.lg,
    color: colors.success,
    marginLeft: spacing.sm,
  },

  mealTime: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  caloriesContainer: {
    alignItems: "center" as const,
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },

  caloriesValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  caloriesLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs / 2,
  },

  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  statItem: {
    alignItems: "center" as const,
  },

  statValue: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
});
