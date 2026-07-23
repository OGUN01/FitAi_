import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { PremiumMealCard } from "./PremiumMealCard";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { getMealTime } from "../../utils/mealSchedule";

interface MealPlanViewProps {
  weeklyMealPlan: any;
  selectedDay: string;
  setSelectedDay: (day: any) => void;
  todaysMeals: any[];
  storeGetMealProgress: (id: string) => any;
  mealSchedule: any;
  handleStartMeal: (meal: any) => void;
  onMealPress?: (meal: any) => void;
  completeMealPreparation: (meal: any) => void;
  macroTargets: {
    protein: number;
    carbs: number;
    fat: number;
  };
  calorieTarget: number;
}

export const MealPlanView: React.FC<MealPlanViewProps> = React.memo(({
  weeklyMealPlan,
  selectedDay,
  setSelectedDay,
  todaysMeals,
  storeGetMealProgress,
  mealSchedule,
  handleStartMeal,
  completeMealPreparation,
  macroTargets,
  calorieTarget,
  onMealPress,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedDay
            ? `${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Meals`
            : "Today's Meals"}
        </Text>
      </View>

      {todaysMeals.length > 0 ? (
        <View style={styles.premiumMealsContainer}>
          {todaysMeals.map((meal) => {
            const progress = storeGetMealProgress(meal.id);
            const mealTime = getMealTime(meal.type as "breakfast" | "lunch" | "dinner" | "snack" | "morning_snack" | "afternoon_snack", mealSchedule);
            return (
              <PremiumMealCard
                key={meal.id}
                meal={meal}
                mealTime={mealTime}
                onPress={() => onMealPress ? onMealPress(meal) : handleStartMeal(meal)}
                onStartMeal={() => handleStartMeal(meal)}
                onCompleteMeal={() => completeMealPreparation(meal)}
                progress={progress?.progress}
                macroTargets={{
                  protein: macroTargets.protein ?? 0,
                  carbs: macroTargets.carbs ?? 0,
                  fat: macroTargets.fat ?? 0,
                  calories: calorieTarget ?? 0,
                }}
                style={{ marginBottom: spacing.md }}
              />
            );
          })}
        </View>
      ) : (
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
        >
          <Text style={styles.emptyMealsText}>
            {weeklyMealPlan
              ? "No meals planned for today"
              : "Generate a meal plan to get started"}
          </Text>
        </GlassCard>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  premiumMealsContainer: { gap: spacing.md },
  emptyMealsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
