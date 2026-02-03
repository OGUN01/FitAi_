import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";
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
    marginVertical: THEME.spacing.md,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },

  mealInfo: {
    flex: 1,
  },

  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: THEME.spacing.xs,
  },

  mealIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },

  mealName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  completedBadge: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.success,
    marginLeft: THEME.spacing.sm,
  },

  mealTime: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  caloriesContainer: {
    alignItems: "center" as const,
    backgroundColor: THEME.colors.primary + "20",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  caloriesValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  caloriesLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    marginTop: THEME.spacing.xs / 2,
  },

  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  statItem: {
    alignItems: "center" as const,
  },

  statValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },
});
