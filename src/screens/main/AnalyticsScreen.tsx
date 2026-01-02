/**
 * AnalyticsScreen - Progress Analytics Dashboard
 * 
 * REDESIGNED: Following HomeScreen pattern with modular components
 * 
 * Layout Order:
 * 1. AnalyticsHeader (title with AI badge, period selector)
 * 2. MetricSummaryGrid (2x2 metrics: Weight, Calories, Workouts, Streak)
 * 3. AchievementShowcase (earned badges)
 * 4. TrendCharts (detailed analytics charts)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { ResponsiveTheme } from '../../utils/constants';
import { rh } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

// Stores
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useHealthDataStore } from '../../stores/healthDataStore';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { useUserStore } from '../../stores/userStore';
import { useCalculatedMetrics } from '../../hooks/useCalculatedMetrics';

// Modular Components
import {
  AnalyticsHeader,
  MetricSummaryGrid,
  AchievementShowcase,
  TrendCharts,
  Period,
} from './analytics';

export const AnalyticsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // State
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);

  // Stores
  const { profile } = useUserStore();
  const { metrics: healthMetrics } = useHealthDataStore();
  const { weeklyWorkoutPlan, workoutProgress } = useFitnessStore();
  const { currentStreak } = useAchievementStore();
  const { metrics: calculatedMetrics } = useCalculatedMetrics();
  const {
    initialize: initializeAnalytics,
    refreshAnalytics,
    isInitialized,
  } = useAnalyticsStore();

  // Initialize analytics on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAnalytics();
    }
  }, [isInitialized, initializeAnalytics]);

  // Calculate metrics data - prioritize calculatedMetrics from onboarding
  const metricsData = useMemo(() => {
    // Weight data - prefer calculated metrics from onboarding, fallback to health metrics or profile
    const currentWeight = calculatedMetrics?.currentWeightKg || healthMetrics?.weight || profile?.personalInfo?.weight;
    const targetWeight = calculatedMetrics?.targetWeightKg;
    
    // Calculate completed workouts this period
    const completedWorkouts = Object.values(workoutProgress).filter(
      (p) => p.progress === 100
    ).length;

    // Calculate calories burned from workouts
    const totalCaloriesBurned = weeklyWorkoutPlan?.workouts?.reduce((total, workout) => {
      const progress = workoutProgress[workout.id];
      if (progress && progress.progress === 100) {
        return total + (workout.estimatedCalories || 0);
      }
      return total;
    }, 0) || 0;

    // Calculate weight change toward goal
    const weightChange = currentWeight && targetWeight 
      ? Number((targetWeight - currentWeight).toFixed(1))
      : undefined;

    return {
      weight: currentWeight ? {
        current: currentWeight,
        change: weightChange ?? 0,
        trend: weightChange && weightChange < 0 ? 'down' as const : weightChange && weightChange > 0 ? 'up' as const : 'stable' as const,
        target: targetWeight,
      } : undefined,
      calories: {
        burned: totalCaloriesBurned,
        target: calculatedMetrics?.dailyCalories || undefined,
        change: totalCaloriesBurned > 0 ? 15 : 0,
        trend: totalCaloriesBurned > 0 ? 'up' as const : 'stable' as const,
      },
      workouts: {
        count: completedWorkouts,
        change: completedWorkouts > 0 ? 3 : 0,
        trend: completedWorkouts > 0 ? 'up' as const : 'stable' as const,
      },
      streak: {
        days: currentStreak || 0,
        isActive: (currentStreak || 0) > 0,
      },
      // Add onboarding calculated metrics for display
      bmi: calculatedMetrics?.calculatedBMI,
      bmr: calculatedMetrics?.calculatedBMR,
      tdee: calculatedMetrics?.calculatedTDEE,
      dailyWater: calculatedMetrics?.dailyWaterML,
    };
  }, [healthMetrics, profile, weeklyWorkoutPlan, workoutProgress, currentStreak, calculatedMetrics]);

  // Generate chart data based on period
  const chartData = useMemo(() => {
    const labels = selectedPeriod === 'week' 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : selectedPeriod === 'month'
      ? ['W1', 'W2', 'W3', 'W4']
      : ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];

    // Calculate workout data per day/week
    const workoutData = labels.map((label, index) => {
      // Count workouts for this period
      const count = weeklyWorkoutPlan?.workouts?.filter((w, i) => {
        if (selectedPeriod === 'week') {
          const dayMap: Record<string, number> = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6,
          };
          return dayMap[w.dayOfWeek?.toLowerCase()] === index && 
                 workoutProgress[w.id]?.progress === 100;
        }
        return false;
      }).length || 0;

      return { label, value: count };
    });

    // NO MOCK DATA - Only show actual tracked data
    // Weight and calorie history would come from a dedicated tracking store in production
    // For now, return undefined to show empty states until user logs actual data
    
    return {
      // Weight data - only show if user has logged weight entries
      // TODO: Replace with actual weight history from weightTrackingStore
      weightData: undefined,
      
      // Calorie data - only show if user has logged meals/calories
      // TODO: Replace with actual calorie history from nutritionStore
      calorieData: undefined,
      
      // Workout data - shows actual completed workouts
      workoutData: workoutData.some(d => d.value > 0) ? workoutData : undefined,
    };
  }, [selectedPeriod, weeklyWorkoutPlan, workoutProgress, metricsData, calculatedMetrics]);

  // Handlers
  const handlePeriodChange = useCallback((period: Period) => {
    haptics.light();
    setSelectedPeriod(period);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await refreshAnalytics();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAnalytics]);

  const handleMetricPress = useCallback((metric: string) => {
    haptics.light();
    console.log('Metric pressed:', metric);
  }, []);

  const handleChartPress = useCallback((chartType: string) => {
    haptics.light();
    console.log('Chart pressed:', chartType);
  }, []);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.animatedContainer}>
          <Animated.ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={ResponsiveTheme.colors.primary}
                colors={[ResponsiveTheme.colors.primary]}
              />
            }
          >
            {/* 1. Analytics Header */}
            <AnalyticsHeader
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
            />

            {/* 2. Metric Summary Grid */}
            <MetricSummaryGrid
              data={metricsData}
              period={selectedPeriod}
              onMetricPress={handleMetricPress}
            />

            {/* 3. Achievement Showcase */}
            <AchievementShowcase />

            {/* 4. Trend Charts */}
            <TrendCharts
              weightData={chartData.weightData}
              calorieData={chartData.calorieData}
              workoutData={chartData.workoutData}
              period={selectedPeriod}
              onChartPress={handleChartPress}
            />

            {/* Bottom Spacing */}
            <View style={{ height: insets.bottom + rh(90) }} />
          </Animated.ScrollView>
        </Animated.View>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ResponsiveTheme.spacing.md,
  },
});

export default AnalyticsScreen;
