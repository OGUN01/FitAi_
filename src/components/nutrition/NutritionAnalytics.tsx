import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rh } from "../../utils/responsive";
import { useNutritionData } from "../../hooks/useNutritionData";

const { width } = Dimensions.get("window");

interface NutritionAnalyticsProps {
  timeRange?: "week" | "month" | "year";
  onTimeRangeChange?: (range: "week" | "month" | "year") => void;
}

export const NutritionAnalytics: React.FC<NutritionAnalyticsProps> = ({
  timeRange = "week",
  onTimeRangeChange,
}) => {
  const {
    dailyNutrition,
    nutritionGoals,
    userMeals,
    loadDailyNutrition,
    loadUserMeals,
    statsLoading,
  } = useNutritionData();

  const [selectedRange, setSelectedRange] = useState<"week" | "month" | "year">(
    timeRange,
  );
  const [weeklyStats, setWeeklyStats] = useState<{
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    totalMeals: number;
    daysTracked: number;
  } | null>(null);

  useEffect(() => {
    calculateWeeklyStats();
  }, [userMeals, selectedRange]);

  const handleRangeChange = (range: "week" | "month" | "year") => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const timeRanges = [
    { id: "week", label: "Week", icon: "📅" },
    { id: "month", label: "Month", icon: "🗓️" },
    { id: "year", label: "Year", icon: "📆" },
  ] as const;

  const calculateWeeklyStats = () => {
    if (!userMeals.length) {
      setWeeklyStats(null);
      return;
    }

    // Calculate stats based on recent meals
    const recentMeals = userMeals.slice(0, 7); // Last 7 meals as approximation
    const totalMeals = recentMeals.length;

    if (totalMeals === 0) {
      setWeeklyStats(null);
      return;
    }

    const totals = recentMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.total_calories,
        protein: acc.protein + meal.total_protein,
        carbs: acc.carbs + meal.total_carbs,
        fat: acc.fat + meal.total_fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    setWeeklyStats({
      avgCalories: Math.round(totals.calories / totalMeals),
      avgProtein: Math.round((totals.protein / totalMeals) * 10) / 10,
      avgCarbs: Math.round((totals.carbs / totalMeals) * 10) / 10,
      avgFat: Math.round((totals.fat / totalMeals) * 10) / 10,
      totalMeals,
      daysTracked: Math.min(totalMeals, 7),
    });
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return ResponsiveTheme.colors.success;
    if (percentage >= 60) return ResponsiveTheme.colors.warning;
    return ResponsiveTheme.colors.error;
  };

  if (statsLoading) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.loadingText}>Loading nutrition analytics...</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Analytics</Text>

        {/* Time Range Selector */}
        <View style={styles.timeRangeSelector}>
          {timeRanges.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.timeRangeButton,
                selectedRange === range.id && styles.timeRangeButtonActive,
              ]}
              onPress={() => handleRangeChange(range.id)}
            >
              <Text style={styles.timeRangeIcon}>{range.icon}</Text>
              <Text
                style={[
                  styles.timeRangeLabel,
                  selectedRange === range.id && styles.timeRangeLabelActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Today's Progress */}
        {dailyNutrition && nutritionGoals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <View style={styles.progressGrid}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>
                  {dailyNutrition.calories}
                </Text>
                <Text style={styles.progressLabel}>Calories</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dailyNutrition.calories, nutritionGoals.daily_calories)}%`,
                        backgroundColor: getProgressColor(
                          getProgressPercentage(
                            dailyNutrition.calories,
                            nutritionGoals.daily_calories,
                          ),
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>
                  Goal: {nutritionGoals.daily_calories}
                </Text>
              </View>

              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>
                  {Math.round(dailyNutrition.protein)}g
                </Text>
                <Text style={styles.progressLabel}>Protein</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dailyNutrition.protein, nutritionGoals.macroTargets?.protein ?? 0)}%`,
                        backgroundColor: getProgressColor(
                          getProgressPercentage(
                            dailyNutrition.protein,
                            nutritionGoals.macroTargets?.protein ?? 0,
                          ),
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>
                  Goal: {nutritionGoals.macroTargets?.protein ?? 0}g
                </Text>
              </View>

              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>
                  {Math.round(dailyNutrition.carbs)}g
                </Text>
                <Text style={styles.progressLabel}>Carbs</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dailyNutrition.carbs, nutritionGoals.macroTargets?.carbohydrates ?? 0)}%`,
                        backgroundColor: getProgressColor(
                          getProgressPercentage(
                            dailyNutrition.carbs,
                            nutritionGoals.macroTargets?.carbohydrates ?? 0,
                          ),
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>
                  Goal: {nutritionGoals.macroTargets?.carbohydrates ?? 0}g
                </Text>
              </View>

              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>
                  {Math.round(dailyNutrition.fat)}g
                </Text>
                <Text style={styles.progressLabel}>Fat</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dailyNutrition.fat, nutritionGoals.macroTargets?.fat ?? 0)}%`,
                        backgroundColor: getProgressColor(
                          getProgressPercentage(
                            dailyNutrition.fat,
                            nutritionGoals.macroTargets?.fat ?? 0,
                          ),
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>
                  Goal: {nutritionGoals.macroTargets?.fat ?? 0}g
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Averages */}
        {weeklyStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Averages</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.avgCalories}</Text>
                <Text style={styles.statLabel}>Avg Calories</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.avgProtein}g</Text>
                <Text style={styles.statLabel}>Avg Protein</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.totalMeals}</Text>
                <Text style={styles.statLabel}>Total Meals</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyStats.daysTracked}</Text>
                <Text style={styles.statLabel}>Days Tracked</Text>
              </View>
            </View>
          </View>
        )}

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsContainer}>
            {!dailyNutrition || dailyNutrition.mealsCount === 0 ? (
              <Text style={styles.insightText}>
                🍽️ Start tracking your meals to see personalized nutrition
                insights!
              </Text>
            ) : (
              <>
                {dailyNutrition.mealsCount > 0 && (
                  <Text style={styles.insightText}>
                    📊 You've logged {dailyNutrition.mealsCount} meal
                    {dailyNutrition.mealsCount > 1 ? "s" : ""} today!
                  </Text>
                )}

                {nutritionGoals &&
                  dailyNutrition.calories >
                    nutritionGoals.daily_calories * 0.8 && (
                    <Text style={styles.insightText}>
                      🎯 Great job! You're on track to meet your calorie goal
                      today.
                    </Text>
                  )}

                {nutritionGoals &&
                  dailyNutrition.protein >
                    (nutritionGoals.macroTargets?.protein ?? 0) * 0.8 && (
                    <Text style={styles.insightText}>
                      💪 Excellent protein intake! You're supporting your
                      fitness goals.
                    </Text>
                  )}

                {weeklyStats && weeklyStats.totalMeals >= 5 && (
                  <Text style={styles.insightText}>
                    🌟 Consistent tracking! You're building great nutrition
                    habits.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: ResponsiveTheme.spacing.lg,
    margin: ResponsiveTheme.spacing.md,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: rp(4),
  },

  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  timeRangeIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  timeRangeLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: ResponsiveTheme.colors.white,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  progressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  progressItem: {
    width: "48%",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  progressValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressBar: {
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: rbr(3),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: "100%",
    borderRadius: rbr(3),
  },

  progressTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  statItem: {
    width: "48%",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  insightsContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },

  insightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
  },
});
