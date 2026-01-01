import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Card, THEME } from '../ui';
import { useNutritionData } from '../../hooks/useNutritionData';

const { width } = Dimensions.get('window');

interface NutritionAnalyticsProps {
  timeRange?: 'week' | 'month' | 'year';
  onTimeRangeChange?: (range: 'week' | 'month' | 'year') => void;
}

export const NutritionAnalytics: React.FC<NutritionAnalyticsProps> = ({
  timeRange = 'week',
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

  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'year'>(timeRange);
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

  const handleRangeChange = (range: 'week' | 'month' | 'year') => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const timeRanges = [
    { id: 'week', label: 'Week', icon: '📅' },
    { id: 'month', label: 'Month', icon: '🗓️' },
    { id: 'year', label: 'Year', icon: '📆' },
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
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
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
    if (percentage >= 80) return THEME.colors.success;
    if (percentage >= 60) return THEME.colors.warning;
    return THEME.colors.error;
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
                <Text style={styles.progressValue}>{dailyNutrition.calories}</Text>
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
                            nutritionGoals.daily_calories
                          )
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>Goal: {nutritionGoals.daily_calories}</Text>
              </View>

              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{Math.round(dailyNutrition.protein)}g</Text>
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
                            nutritionGoals.macroTargets?.protein ?? 0
                          )
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>Goal: {nutritionGoals.macroTargets?.protein ?? 0}g</Text>
              </View>

              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{Math.round(dailyNutrition.carbs)}g</Text>
                <Text style={styles.progressLabel}>Carbs</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dailyNutrition.carbs, nutritionGoals.macroTargets?.carbohydrates ?? 0)}%`,
                        backgroundColor: getProgressColor(
                          getProgressPercentage(dailyNutrition.carbs, nutritionGoals.macroTargets?.carbohydrates ?? 0)
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>Goal: {nutritionGoals.macroTargets?.carbohydrates ?? 0}g</Text>
              </View>

              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{Math.round(dailyNutrition.fat)}g</Text>
                <Text style={styles.progressLabel}>Fat</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dailyNutrition.fat, nutritionGoals.macroTargets?.fat ?? 0)}%`,
                        backgroundColor: getProgressColor(
                          getProgressPercentage(dailyNutrition.fat, nutritionGoals.macroTargets?.fat ?? 0)
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressTarget}>Goal: {nutritionGoals.macroTargets?.fat ?? 0}g</Text>
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
                🍽️ Start tracking your meals to see personalized nutrition insights!
              </Text>
            ) : (
              <>
                {dailyNutrition.mealsCount > 0 && (
                  <Text style={styles.insightText}>
                    📊 You've logged {dailyNutrition.mealsCount} meal
                    {dailyNutrition.mealsCount > 1 ? 's' : ''} today!
                  </Text>
                )}

                {nutritionGoals &&
                  dailyNutrition.calories > nutritionGoals.daily_calories * 0.8 && (
                    <Text style={styles.insightText}>
                      🎯 Great job! You're on track to meet your calorie goal today.
                    </Text>
                  )}

                {nutritionGoals && dailyNutrition.protein > (nutritionGoals.macroTargets?.protein ?? 0) * 0.8 && (
                  <Text style={styles.insightText}>
                    💪 Excellent protein intake! You're supporting your fitness goals.
                  </Text>
                )}

                {weeklyStats && weeklyStats.totalMeals >= 5 && (
                  <Text style={styles.insightText}>
                    🌟 Consistent tracking! You're building great nutrition habits.
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
    padding: THEME.spacing.lg,
    margin: THEME.spacing.md,
  },

  header: {
    marginBottom: THEME.spacing.lg,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
  },

  timeRangeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: THEME.colors.primary,
  },

  timeRangeIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.xs,
  },

  timeRangeLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: THEME.colors.white,
  },

  section: {
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },

  progressItem: {
    width: '48%',
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  progressValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  progressLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
  },

  progressBar: {
    height: 6,
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: 3,
    marginBottom: THEME.spacing.xs,
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  progressTarget: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },

  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },

  statValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  insightsContainer: {
    gap: THEME.spacing.sm,
  },

  insightText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  loadingText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: THEME.spacing.xl,
  },
});
