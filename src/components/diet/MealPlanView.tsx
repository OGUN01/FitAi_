import React from "react";
import { View, Text, StyleSheet, ScrollView, StyleProp, ViewStyle } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { PremiumMealCard } from "./PremiumMealCard";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { getMealTime } from "../../utils/mealSchedule";
import { rs, rw, rh, rbr } from "../../utils/responsive";

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
      {weeklyMealPlan && (
        <View style={styles.daySelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].map((day) => {
              const isToday =
                day ===
                new Date()
                  .toLocaleDateString("en-US", { weekday: "long" })
                  .toLowerCase();
              return (
                <AnimatedPressable
                  key={day}
                  style={
                    [
                      styles.dayButton,
                      selectedDay === day
                        ? styles.selectedDayButton
                        : undefined,
                      isToday ? styles.todayDayButton : undefined,
                    ] as StyleProp<ViewStyle>
                  }
                  onPress={() => setSelectedDay(day)}
                  scaleValue={0.95}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      selectedDay === day && styles.selectedDayButtonText,
                    ]}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Text>
                  {isToday && <View style={styles.todayIndicator} />}
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>
      )}

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
  daySelectorContainer: {
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  dayButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    borderRadius: rs(20),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    alignItems: "center",
  },
  todayDayButton: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  todayIndicator: {
    width: rw(6),
    height: rh(6),
    borderRadius: rbr(3),
    backgroundColor: colors.primary,
    position: "absolute",
    bottom: -2,
  },
  selectedDayButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text,
    opacity: 0.75,
  },
  selectedDayButtonText: { color: colors.surface },
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
