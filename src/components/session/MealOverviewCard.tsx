import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";
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
          <Text style={styles.statValue}>{meal.items.length}</Text>
          <Text style={styles.statLabel}>Ingredients</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mealOverviewCard: {
    padding: THEME.spacing.md,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: THEME.spacing.md,
  },
  mealIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: THEME.spacing.md,
  },
  mealIcon: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  mealDescription: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  mealStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  statItem: {
    alignItems: "center" as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});
