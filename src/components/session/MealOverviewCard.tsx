import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw, rh } from '../../utils/responsive';
import { DayMeal } from "../../types/ai";

interface MealOverviewCardProps {
  meal: DayMeal;
  getMealTypeIcon: (type: string) => string;
  getDifficultyColor: (difficulty: string) => string;
}

export const MealOverviewCard: React.FC<MealOverviewCardProps> = ({
  meal,
  getMealTypeIcon,
  getDifficultyColor,
}) => {
  return (
    <Card style={styles.mealOverviewCard} variant="elevated">
      <View style={styles.mealHeader}>
        <View style={styles.mealIconContainer}>
          <Text style={styles.mealIcon}>{getMealTypeIcon(meal.type)}</Text>
        </View>
        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealDescription}>{meal.description}</Text>
        </View>
      </View>

      <View style={styles.mealStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.totalCalories}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.preparationTime}min</Text>
          <Text style={styles.statLabel}>Prep Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              { color: getDifficultyColor(meal.difficulty) },
            ]}
          >
            {meal.difficulty}
          </Text>
          <Text style={styles.statLabel}>Difficulty</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{meal.items?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Ingredients</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mealOverviewCard: {
    padding: spacing.md,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.md,
  },
  mealIconContainer: {
    width: rw(60),
    height: rh(60),
    borderRadius: rbr(30),
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: spacing.md,
  },
  mealIcon: {
    fontSize: rf(28),
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealName: {
    fontSize: rf(20),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  mealDescription: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
  },
  mealStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: "center" as const,
  },
  statValue: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text,
  },
  statLabel: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
});
