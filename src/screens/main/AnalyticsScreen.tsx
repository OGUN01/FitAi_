// Advanced Analytics Screen
// Comprehensive fitness analytics with insights and predictions

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { MiniProgressRing } from '../../components/ui/aurora/ProgressRing';
import { gradients, toLinearGradientProps } from '../../theme/gradients';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const AnalyticsScreen: React.FC = () => {
  const {
    isLoading,
    currentAnalytics,
    analyticsSummary,
    selectedPeriod,
    chartData,
    initialize,
    setPeriod,
    refreshAnalytics,
    getTopInsights,
    getImprovementAreas,
    getPositiveTrends,
    getNegativeTrends,
    getAchievements,
  } = useAnalyticsStore();

  const { checkPremiumAccess, showPaywallModal } = useSubscriptionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'workout' | 'nutrition' | 'wellness'>('overview');

  const isPremium = checkPremiumAccess('advanced_analytics');

  // Animation refs for micro-interactions
  const segmentIndicatorPosition = useRef(new Animated.Value(0)).current;
  const metricCard1Value = useRef(new Animated.Value(0)).current;
  const metricCard2Value = useRef(new Animated.Value(0)).current;
  const metricCard3Value = useRef(new Animated.Value(0)).current;
  const metricCard4Value = useRef(new Animated.Value(0)).current;
  const chart1Progress = useRef(new Animated.Value(0)).current;
  const chart2Progress = useRef(new Animated.Value(0)).current;
  const chart3Progress = useRef(new Animated.Value(0)).current;
  const chart4Progress = useRef(new Animated.Value(0)).current;
  const achievementScale1 = useRef(new Animated.Value(0)).current;
  const achievementScale2 = useRef(new Animated.Value(0)).current;
  const achievementScale3 = useRef(new Animated.Value(0)).current;
  const trendArrowRotate = useRef(new Animated.Value(0)).current;
  const exportIconDownload = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Micro-interaction: Metric cards count-up animation on mount
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(metricCard1Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(metricCard2Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(metricCard3Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(metricCard4Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Micro-interaction: Animate metric cards on period change
  useEffect(() => {
    // Reset and re-animate when period changes
    metricCard1Value.setValue(0);
    metricCard2Value.setValue(0);
    metricCard3Value.setValue(0);
    metricCard4Value.setValue(0);

    Animated.stagger(100, [
      Animated.timing(metricCard1Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(metricCard2Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(metricCard3Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(metricCard4Value, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selectedPeriod]);

  // Micro-interaction: Chart draw animations on mount
  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(chart1Progress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
      Animated.timing(chart2Progress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
      Animated.timing(chart3Progress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
      Animated.timing(chart4Progress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Micro-interaction: Achievement badges pop-in animation
  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(achievementScale1, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(achievementScale2, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(achievementScale3, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Micro-interaction: Trend arrow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(trendArrowRotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(trendArrowRotate, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAnalytics();
    setRefreshing(false);
  };

  const handleExport = () => {
    // Trigger download animation
    Animated.sequence([
      Animated.timing(exportIconDownload, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(exportIconDownload, {
        toValue: 0,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert('Export Progress', 'Export feature coming soon!');
  };

  const handlePeriodChange = (period: 'week' | 'month' | 'quarter' | 'year') => {
    if (!isPremium && (period === 'quarter' || period === 'year')) {
      showPaywallModal('advanced_analytics');
      return;
    }
    setPeriod(period);

    // Animate sliding indicator
    const index = ['week', 'month', 'year'].indexOf(period);
    if (index !== -1) {
      Animated.spring(segmentIndicatorPosition, {
        toValue: index,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const periods = [
    { key: 'week', label: 'Week', premium: false },
    { key: 'month', label: 'Month', premium: false },
    { key: 'quarter', label: 'Quarter', premium: true },
    { key: 'year', label: 'Year', premium: true },
  ] as const;

  const tabs = [
    { key: 'overview', label: 'Overview', iconName: 'stats-chart-outline' },
    { key: 'workout', label: 'Workout', iconName: 'barbell-outline' },
    { key: 'nutrition', label: 'Nutrition', iconName: 'nutrition-outline' },
    { key: 'wellness', label: 'Wellness', iconName: 'happy-outline' },
  ] as const;

  if (isLoading && !currentAnalytics) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          Generating your analytics...
        </Text>
      </View>
    );
  }

  const renderOverviewTab = () => (
    <View className="space-y-6">
      {/* Key Metrics Grid */}
      <View className="grid grid-cols-2 gap-4">
        <AnalyticsCard
          title="Overall Score"
          value={currentAnalytics?.overallScore || analyticsSummary.averageScore}
          subtitle="out of 100"
          iconName="star-outline"
          color="purple"
          size="medium"
        />
        
        <AnalyticsCard
          title="Current Streak"
          value={analyticsSummary.currentStreak}
          subtitle="days active"
          iconName="flame-outline"
          color="orange"
          size="medium"
          trend={analyticsSummary.currentStreak > 7 ? 'up' : analyticsSummary.currentStreak > 3 ? 'stable' : 'down'}
          trendValue={`${analyticsSummary.currentStreak} days`}
        />
        
        <AnalyticsCard
          title="Total Workouts"
          value={currentAnalytics?.workout.totalWorkouts || analyticsSummary.totalWorkouts}
          subtitle={`${selectedPeriod} period`}
          iconName="barbell-outline"
          color="blue"
          size="medium"
        />
        
        <AnalyticsCard
          title="Trend"
          value={analyticsSummary.recentTrend}
          subtitle="recent performance"
          iconName={analyticsSummary.recentTrend === 'Improving' ? 'trending-up-outline' :
                analyticsSummary.recentTrend === 'Declining' ? 'trending-down-outline' : 'arrow-forward-outline'}
          color={analyticsSummary.recentTrend === 'Improving' ? 'green' : 
                 analyticsSummary.recentTrend === 'Declining' ? 'red' : 'gray'}
          size="medium"
        />
      </View>

      {/* Performance Chart */}
      <PremiumGate
        feature="advanced_analytics"
        upgradeText="Unlock Advanced Charts"
        upgradeDescription="Get detailed performance charts and trends with Premium"
      >
        <ProgressChart
          title="Performance Score"
          data={chartData.performanceScore}
          type="area"
          color="#8B5CF6"
          height={220}
          unit=""
          gradientColors={['#8B5CF6', '#A78BFA']}
        />
      </PremiumGate>

      {/* Top Insights */}
      <View>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Key Insights
        </Text>
        
        <View className="space-y-3">
          {getTopInsights().slice(0, 3).map((insight, index) => (
            <InsightCard
              key={index}
              type="positive"
              title="Great Progress!"
              description={insight}
              category="Performance"
              confidence={85 + index * 5}
            />
          ))}
          
          {getImprovementAreas().slice(0, 2).map((improvement, index) => (
            <InsightCard
              key={`improvement-${index}`}
              type="neutral"
              title="Improvement Opportunity"
              description={improvement}
              category="Optimization"
              actionText="Learn More"
              onAction={() => Alert.alert('Improvement Tip', improvement)}
            />
          ))}
        </View>
      </View>

      {/* Achievements */}
      {getAchievements().length > 0 && (
        <View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Achievements
          </Text>
          
          <View className="space-y-3">
            {getAchievements().map((achievement, index) => (
              <InsightCard
                key={index}
                type="achievement"
                title="Achievement Unlocked!"
                description={achievement}
                category="Milestone"
              />
            ))}
          </View>
        </View>
      )}

      {/* AI Recommendation */}
      <View className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
        <Text className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
          🤖 AI Recommendation
        </Text>
        <Text className="text-blue-700 dark:text-blue-300 leading-relaxed">
          {analyticsHelpers.getPersonalizedRecommendation()}
        </Text>
      </View>
    </View>
  );

  const renderWorkoutTab = () => (
    <PremiumGate
      feature="advanced_analytics"
      upgradeText="Unlock Detailed Workout Analytics"
      upgradeDescription="Get comprehensive workout analysis, trends, and insights"
    >
      <View className="space-y-6">
        {/* Workout Metrics */}
        <View className="grid grid-cols-2 gap-4">
          <AnalyticsCard
            title="Weekly Average"
            value={currentAnalytics?.workout.averageWorkoutsPerWeek.toFixed(1) || '0'}
            subtitle="workouts"
            iconName="calendar-outline"
            color="blue"
          />
          
          <AnalyticsCard
            title="Avg Duration"
            value={currentAnalytics?.workout.averageWorkoutDuration.toFixed(0) || '0'}
            subtitle="minutes"
            iconName="timer-outline"
            color="green"
          />
          
          <AnalyticsCard
            title="Consistency"
            value={currentAnalytics?.workout.consistencyScore || 0}
            subtitle="out of 100"
            iconName="target-outline"
            color="purple"
          />
          
          <AnalyticsCard
            title="Calories Burned"
            value={currentAnalytics?.workout.caloriesBurnedTotal.toLocaleString() || '0'}
            subtitle="total"
            iconName="flame-outline"
            color="orange"
          />
        </View>

        {/* Workout Frequency Chart */}
        <ProgressChart
          title="Workout Frequency"
          data={chartData.workoutFrequency}
          type="bar"
          color="#3B82F6"
          height={200}
          unit=" workouts"
        />

        {/* Calories Burned Chart */}
        <ProgressChart
          title="Calories Burned"
          data={chartData.caloriesBurned}
          type="area"
          color="#F59E0B"
          height={200}
          unit=" cal"
        />

        {/* Workout Type Distribution */}
        {currentAnalytics?.workout.workoutTypeDistribution && (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Workout Type Distribution
            </Text>
            
            <View className="space-y-3">
              {Object.entries(currentAnalytics.workout.workoutTypeDistribution).map(([type, percentage]) => (
                <View key={type} className="flex-row items-center">
                  <Text className="w-20 text-sm text-gray-600 dark:text-gray-400">
                    {type}
                  </Text>
                  <View className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 mx-3">
                    <View 
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </View>
                  <Text className="text-sm font-medium text-gray-900 dark:text-white w-12">
                    {percentage}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </PremiumGate>
  );

  const renderNutritionTab = () => (
    <PremiumGate
      feature="advanced_analytics"
      upgradeText="Unlock Nutrition Analytics"
      upgradeDescription="Get detailed nutrition analysis and macro insights"
    >
      <View className="space-y-6">
        {/* Nutrition Metrics */}
        <View className="grid grid-cols-2 gap-4">
          <AnalyticsCard
            title="Nutrition Score"
            value={currentAnalytics?.nutrition.nutritionScore || 75}
            subtitle="out of 100"
            iconName="nutrition-outline"
            color="green"
          />
          
          <AnalyticsCard
            title="Water Intake"
            value={currentAnalytics?.nutrition.waterIntakeAverage.toFixed(1) || '2.5'}
            subtitle="liters/day"
            iconName="water-outline"
            color="blue"
          />
          
          <AnalyticsCard
            title="Meal Consistency"
            value={currentAnalytics?.nutrition.mealLoggingConsistency || 85}
            subtitle="% logged"
            iconName="document-text-outline"
            color="purple"
          />
          
          <AnalyticsCard
            title="Variety Score"
            value={currentAnalytics?.nutrition.varietyScore || 85}
            subtitle="out of 100"
            icon="color-palette-outline"
            color="orange"
          />
        </View>

        {/* Water Intake Chart */}
        <ProgressChart
          title="Daily Water Intake"
          data={chartData.waterIntake}
          type="line"
          color="#06B6D4"
          height={200}
          unit="L"
        />

        {/* Macro Distribution */}
        {currentAnalytics?.nutrition.averageMacros && (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Daily Macro Averages
            </Text>
            
            <View className="grid grid-cols-2 gap-4">
              <View className="items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Text className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {currentAnalytics.nutrition.averageMacros.protein}g
                </Text>
                <Text className="text-sm text-red-700 dark:text-red-300">
                  Protein
                </Text>
              </View>
              
              <View className="items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Text className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {currentAnalytics.nutrition.averageMacros.carbs}g
                </Text>
                <Text className="text-sm text-yellow-700 dark:text-yellow-300">
                  Carbs
                </Text>
              </View>
              
              <View className="items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {currentAnalytics.nutrition.averageMacros.fat}g
                </Text>
                <Text className="text-sm text-purple-700 dark:text-purple-300">
                  Fat
                </Text>
              </View>
              
              <View className="items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {currentAnalytics.nutrition.averageMacros.fiber}g
                </Text>
                <Text className="text-sm text-green-700 dark:text-green-300">
                  Fiber
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </PremiumGate>
  );

  const renderWellnessTab = () => (
    <PremiumGate
      feature="advanced_analytics"
      upgradeText="Unlock Wellness Analytics"
      upgradeDescription="Get sleep, recovery, and wellness insights"
    >
      <View className="space-y-6">
        {/* Wellness Metrics */}
        <View className="grid grid-cols-2 gap-4">
          <AnalyticsCard
            title="Avg Sleep"
            value={currentAnalytics?.sleepWellness.averageSleepHours.toFixed(1) || '8.0'}
            subtitle="hours/night"
            iconName="moon-outline"
            color="purple"
          />
          
          <AnalyticsCard
            title="Recovery Score"
            value={currentAnalytics?.sleepWellness.recoveryScore || 75}
            subtitle="out of 100"
            iconName="flash-outline"
            color="green"
          />
          
          <AnalyticsCard
            title="Sleep Consistency"
            value={currentAnalytics?.sleepWellness.sleepConsistency || 80}
            subtitle="out of 100"
            iconName="target-outline"
            color="blue"
          />
          
          <AnalyticsCard
            title="Sleep Debt"
            value={currentAnalytics?.sleepWellness.sleepDebt.toFixed(1) || '0.0'}
            subtitle="hours"
            iconName="alarm-outline"
            color={currentAnalytics?.sleepWellness.sleepDebt && currentAnalytics.sleepWellness.sleepDebt > 5 ? 'red' : 'gray'}
          />
        </View>

        {/* Sleep Pattern Chart */}
        <ProgressChart
          title="Sleep Pattern"
          data={chartData.sleepPattern.map(point => ({ x: point.date, y: point.hours }))}
          type="line"
          color="#8B5CF6"
          height={200}
          unit=" hrs"
        />

        {/* Wellness Insights */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Wellness Insights
          </Text>
          
          <View className="space-y-4">
            <View className="flex-row items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <View className="flex-row items-center">
                <Ionicons name="bed-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={{ marginRight: rp(12) }} />
                <View>
                  <Text className="font-medium text-blue-800 dark:text-blue-200">
                    Optimal Bedtime
                  </Text>
                  <Text className="text-blue-600 dark:text-blue-400 text-sm">
                    {currentAnalytics?.sleepWellness.optimalBedtime || '22:30'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="flex-row items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <View className="flex-row items-center">
                <Ionicons name="trending-up-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={{ marginRight: rp(12) }} />
                <View>
                  <Text className="font-medium text-green-800 dark:text-green-200">
                    Sleep Quality Trend
                  </Text>
                  <Text className="text-green-600 dark:text-green-400 text-sm capitalize">
                    {currentAnalytics?.sleepWellness.sleepQualityTrend || 'stable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </PremiumGate>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'workout':
        return renderWorkoutTab();
      case 'nutrition':
        return renderNutritionTab();
      case 'wellness':
        return renderWellnessTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ResponsiveTheme.colors.primary}
              colors={[ResponsiveTheme.colors.primary]}
            />
          }
        >
          {/* Header - Aurora Design */}
          <View style={styles.header}>
            <Text style={styles.title}>Progress Analytics</Text>

            {/* SegmentedControl (Week/Month/Year) with Sliding Indicator */}
            <View style={styles.segmentedControl}>
              {/* Sliding Indicator Background */}
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    transform: [
                      {
                        translateX: segmentIndicatorPosition.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [0, rw(110), rw(220)], // Each segment ~110 responsive width units
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  {...(toLinearGradientProps(gradients.button.primary) as any)}
                  style={styles.slidingIndicatorGradient}
                />
              </Animated.View>

              {/* Buttons */}
              {['Week', 'Month', 'Year'].map((period) => (
                <AnimatedPressable
                  key={period}
                  style={styles.segmentButton}
                  onPress={() => handlePeriodChange(period.toLowerCase() as any)}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedPeriod === period.toLowerCase() && styles.segmentTextActive,
                    ]}
                  >
                    {period}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* 2x2 Metric Summary Cards - Aurora Design */}
          <View style={styles.section}>
            <View style={styles.metricGrid}>
              {/* Weight Progress Card with count-up animation */}
              <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
                <View style={styles.metricContent}>
                  <Animated.Text style={styles.metricValue}>
                    {metricCard1Value.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0.0', '72.5'],
                    })}
                  </Animated.Text>
                  <Text style={styles.metricLabel}>Weight (kg)</Text>
                  <View style={styles.trendContainer}>
                    <Animated.Text
                      style={[
                        styles.trendArrow,
                        { color: '#10b981' },
                        {
                          transform: [
                            {
                              rotate: trendArrowRotate.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '5deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      ↓
                    </Animated.Text>
                    <Text style={[styles.trendText, { color: '#10b981' }]}>-2.3 kg</Text>
                  </View>
                  {/* Mini Sparkline - Simple bars */}
                  <View style={styles.miniChart}>
                    {[40, 55, 45, 60, 50, 70, 65].map((height, i) => (
                      <View key={i} style={[styles.miniBar, { height: `${height}%` }]} />
                    ))}
                  </View>
                </View>
              </GlassCard>

              {/* Calories Burned Card with count-up animation */}
              <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
                <View style={styles.metricContent}>
                  <Animated.Text style={styles.metricValue}>
                    {metricCard2Value.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0K', '12.5K'],
                    })}
                  </Animated.Text>
                  <Text style={styles.metricLabel}>Calories Burned</Text>
                  <View style={styles.trendContainer}>
                    <Animated.Text
                      style={[
                        styles.trendArrow,
                        { color: '#10b981' },
                        {
                          transform: [
                            {
                              rotate: trendArrowRotate.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '-5deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      ↑
                    </Animated.Text>
                    <Text style={[styles.trendText, { color: '#10b981' }]}>+15%</Text>
                  </View>
                  {/* Mini Area Chart - Simplified */}
                  <View style={styles.miniChart}>
                    {[30, 45, 35, 60, 50, 75, 70].map((height, i) => (
                      <View key={i} style={[styles.miniBar, { height: `${height}%`, opacity: 0.7 }]} />
                    ))}
                  </View>
                </View>
              </GlassCard>

              {/* Workouts Completed Card with count-up animation */}
              <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
                <View style={styles.metricContent}>
                  <Animated.Text style={styles.metricValue}>
                    {metricCard3Value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 18],
                    }).interpolate((value) => Math.round(value).toString())}
                  </Animated.Text>
                  <Text style={styles.metricLabel}>Workouts</Text>
                  <View style={styles.trendContainer}>
                    <Animated.Text
                      style={[
                        styles.trendArrow,
                        { color: '#10b981' },
                        {
                          transform: [
                            {
                              rotate: trendArrowRotate.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '-5deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      ↑
                    </Animated.Text>
                    <Text style={[styles.trendText, { color: '#10b981' }]}>+3</Text>
                  </View>
                  {/* Mini Bar Chart */}
                  <View style={styles.miniChart}>
                    {[50, 60, 40, 70, 55, 80, 75].map((height, i) => (
                      <View key={i} style={[styles.miniBar, { height: `${height}%` }]} />
                    ))}
                  </View>
                </View>
              </GlassCard>

              {/* Active Streak Card with count-up animation */}
              <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
                <View style={styles.metricContent}>
                  <MiniProgressRing
                    progress={metricCard4Value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 70],
                    })}
                    size={60}
                    strokeWidth={5}
                    gradient={{
                      colors: ['#FF6B6B', '#FF8E53'],
                      start: { x: 0, y: 0 },
                      end: { x: 1, y: 1 },
                    }}
                  >
                    <Animated.Text style={styles.streakNumber}>
                      {metricCard4Value.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 7],
                      }).interpolate((value) => Math.round(value).toString())}
                    </Animated.Text>
                  </MiniProgressRing>
                  <Text style={styles.metricLabel}>Day Streak</Text>
                  <Text style={styles.streakSubtext}>Keep it up!</Text>
                </View>
              </GlassCard>
            </View>
          </View>

          {/* Achievements - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsScrollContent}
            >
              {[
                { id: 1, iconName: 'flame-outline', title: '7-Day Streak', subtitle: 'Keep going!', animation: achievementScale1 },
                { id: 2, iconName: 'walk-outline', title: 'First 5K', subtitle: 'Completed', animation: achievementScale2 },
                { id: 3, iconName: 'scale-outline', title: 'Weight Goal', subtitle: '-5kg reached', animation: achievementScale3 },
                { id: 4, iconName: 'barbell-outline', title: '50 Workouts', subtitle: 'Milestone', animation: achievementScale1 },
              ].map((achievement) => (
                <Animated.View
                  key={achievement.id}
                  style={{
                    transform: [{ scale: achievement.animation }],
                  }}
                >
                  <GlassCard
                    elevation={2}
                    blurIntensity="medium"
                    padding="md"
                    borderRadius="lg"
                    style={styles.achievementCard}
                  >
                    <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementSubtitle}>{achievement.subtitle}</Text>
                  </GlassCard>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          {/* Export Progress Button - Aurora Design */}
          <View style={styles.section}>
            <AnimatedPressable
              style={styles.exportButton}
              onPress={handleExport}
              scaleValue={0.95}
              hapticFeedback={true}
              hapticType="medium"
            >
              <View style={styles.exportButtonContent}>
                <Animated.Text
                  style={[
                    styles.exportButtonIcon,
                    {
                      transform: [
                        {
                          translateY: exportIconDownload.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 8],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  Analytics
                </Animated.Text>
                <Text style={styles.exportButtonText}>Export Progress</Text>
              </View>
            </AnimatedPressable>
          </View>

          {/* Detailed Charts Placeholders - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Analytics</Text>

            {/* Weight Trend Chart - Interactive Line Chart */}
            <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.chartCard}>
              <Text style={styles.chartTitle}>Weight Progress</Text>

              {/* Chart Legend */}
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF6B9D' }]} />
                  <Text style={styles.legendText}>Current</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4ECDC4', opacity: 0.5 }]} />
                  <Text style={styles.legendText}>Target</Text>
                </View>
              </View>

              {/* Line Chart Container */}
              <View style={styles.lineChartContainer}>
                {[
                  { x: 0, y: 76, label: 'W1' },
                  { x: 25, y: 75.5, label: 'W2' },
                  { x: 50, y: 74, label: 'W3' },
                  { x: 75, y: 73.5, label: 'W4' },
                  { x: 100, y: 72.5, label: 'W5' },
                ].map((point, index, arr) => {
                  const yPercent = ((78 - point.y) / 9) * 100;
                  return (
                    <View key={index} style={[styles.lineChartPoint, { left: `${point.x}%`, bottom: `${yPercent}%` }]}>
                      <View style={styles.lineChartDot} />
                      {index < arr.length - 1 && (
                        <View style={[styles.lineChartLine, {
                          width: `${arr[index + 1].x - point.x}%`,
                          transform: [{
                            rotate: `${Math.atan2(((78 - arr[index + 1].y) / 9) * 100 - yPercent, arr[index + 1].x - point.x)}rad`
                          }]
                        }]} />
                      )}
                    </View>
                  );
                })}
                {/* X-axis labels */}
                <View style={styles.xAxisContainer}>
                  {['W1', 'W2', 'W3', 'W4', 'W5'].map((label, i) => (
                    <Text key={i} style={styles.xAxisLabel}>{label}</Text>
                  ))}
                </View>
              </View>
            </GlassCard>

            {/* Calorie Breakdown Chart - Stacked Area Chart */}
            <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.chartCard}>
              <Text style={styles.chartTitle}>Calorie Analysis</Text>

              {/* Chart Legend */}
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Consumed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendText}>Burned</Text>
                </View>
              </View>

              {/* Stacked Area Chart */}
              <View style={styles.areaChartContainer}>
                {[
                  { day: 'Mon', consumed: 2100, burned: 2300 },
                  { day: 'Tue', consumed: 1950, burned: 2150 },
                  { day: 'Wed', consumed: 2250, burned: 2400 },
                  { day: 'Thu', consumed: 2000, burned: 2200 },
                  { day: 'Fri', consumed: 2100, burned: 2350 },
                  { day: 'Sat', consumed: 2300, burned: 2500 },
                  { day: 'Sun', consumed: 2050, burned: 2250 },
                ].map((data, index) => {
                  const consumedHeight = (data.consumed / 3000) * 100;
                  const burnedHeight = (data.burned / 3000) * 100;
                  return (
                    <View key={index} style={styles.areaChartBar}>
                      <View style={[styles.areaChartSegment, { height: `${burnedHeight}%`, backgroundColor: 'rgba(245, 158, 11, 0.5)' }]} />
                      <View style={[styles.areaChartSegment, { height: `${consumedHeight}%`, backgroundColor: 'rgba(16, 185, 129, 0.5)', position: 'absolute', bottom: 0 }]} />
                      <Text style={styles.areaChartLabel}>{data.day}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* Workout Frequency Chart - Bar Chart */}
            <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.chartCard}>
              <Text style={styles.chartTitle}>Workout Consistency</Text>

              {/* Bar Chart */}
              <View style={styles.barChartContainer}>
                {[
                  { day: 'Mon', count: 1 },
                  { day: 'Tue', count: 2 },
                  { day: 'Wed', count: 1 },
                  { day: 'Thu', count: 3 },
                  { day: 'Fri', count: 2 },
                  { day: 'Sat', count: 1 },
                  { day: 'Sun', count: 0 },
                ].map((data, index) => {
                  const height = (data.count / 3) * 100;
                  return (
                    <View key={index} style={styles.barChartItem}>
                      <View style={styles.barChartBarContainer}>
                        <View style={[styles.barChartBar, { height: `${Math.max(height, 10)}%` }]}>
                          <LinearGradient
                            colors={['#FF6B9D', '#C44569']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.barChartBarGradient}
                          />
                        </View>
                      </View>
                      <Text style={styles.barChartLabel}>{data.day}</Text>
                      <Text style={styles.barChartValue}>{data.count}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>

            {/* Body Measurements Chart - Multi-Line Chart */}
            <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.chartCard}>
              <Text style={styles.chartTitle}>Body Composition Trend</Text>

              {/* Chart Legend */}
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF6B9D' }]} />
                  <Text style={styles.legendText}>Body Fat %</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
                  <Text style={styles.legendText}>Muscle Mass</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FFA726' }]} />
                  <Text style={styles.legendText}>BMI</Text>
                </View>
              </View>

              {/* Multi-Line Chart */}
              <View style={styles.multiLineChartContainer}>
                {[
                  { week: 'W1', bodyFat: 22, muscle: 35, bmi: 24.5 },
                  { week: 'W2', bodyFat: 21.5, muscle: 36, bmi: 24.2 },
                  { week: 'W3', bodyFat: 21, muscle: 37, bmi: 24.0 },
                  { week: 'W4', bodyFat: 20.5, muscle: 38, bmi: 23.8 },
                  { week: 'W5', bodyFat: 20, muscle: 39, bmi: 23.5 },
                ].map((point, index) => {
                  const bodyFatY = ((25 - point.bodyFat) / 10) * 100;
                  const muscleY = ((45 - point.muscle) / 15) * 100;
                  const bmiY = ((27 - point.bmi) / 5) * 100;
                  const xPos = (index / 4) * 100;
                  return (
                    <View key={index} style={[styles.multiLineChartPointGroup, { left: `${xPos}%` }]}>
                      <View style={[styles.multiLineChartDot, { backgroundColor: '#FF6B9D', bottom: `${bodyFatY}%` }]} />
                      <View style={[styles.multiLineChartDot, { backgroundColor: '#4ECDC4', bottom: `${muscleY}%` }]} />
                      <View style={[styles.multiLineChartDot, { backgroundColor: '#FFA726', bottom: `${bmiY}%` }]} />
                    </View>
                  );
                })}
                {/* X-axis labels */}
                <View style={styles.xAxisContainer}>
                  {['W1', 'W2', 'W3', 'W4', 'W5'].map((label, i) => (
                    <Text key={i} style={styles.xAxisLabel}>{label}</Text>
                  ))}
                </View>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  // Header Styles
  header: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // SegmentedControl Styles
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: rp(4),
    gap: rp(4),
    position: 'relative',
  },

  slidingIndicator: {
    position: 'absolute',
    top: rp(4),
    left: rp(4),
    width: '31%', // Approximately 1/3 width minus gap
    bottom: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: 'hidden',
    zIndex: 0,
  },

  slidingIndicatorGradient: {
    width: '100%',
    height: '100%',
  },

  segmentButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  segmentButtonActive: {
    // Active state handled by sliding indicator
  },

  segmentButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  segmentText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
  },

  segmentTextActive: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },

  // Section Styles
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Metric Cards Grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },

  metricCard: {
    width: '48%',
    minHeight: rh(140),
  },

  metricContent: {
    alignItems: 'center',
  },

  metricValue: {
    fontSize: ResponsiveTheme.fontSize.xxxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  trendArrow: {
    fontSize: rf(18),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  trendText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: rh(30),
    width: '100%',
    gap: rp(2),
    marginTop: ResponsiveTheme.spacing.sm,
  },

  miniBar: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rp(2),
    opacity: 0.8,
  },

  streakNumber: {
    fontSize: rf(20),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  streakSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  // Achievements Styles
  achievementsScrollContent: {
    paddingRight: ResponsiveTheme.spacing.lg,
  },

  achievementCard: {
    width: rw(140),
    marginRight: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  achievementEmoji: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  achievementTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: 'center',
  },

  achievementSubtitle: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Export Button Styles
  exportButton: {
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  exportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportButtonIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  exportButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
  },

  // Chart Card Styles
  chartCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    minHeight: rh(150),
  },

  chartTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  chartPlaceholder: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  // Chart Legend Styles
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },

  legendDot: {
    width: rw(10),
    height: rh(10),
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  legendText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Line Chart Styles
  lineChartContainer: {
    height: rh(200),
    position: 'relative',
    marginTop: ResponsiveTheme.spacing.md,
  },

  lineChartPoint: {
    position: 'absolute',
    width: rw(10),
    height: rh(10),
  },

  lineChartDot: {
    width: rw(10),
    height: rh(10),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: '#FF6B9D',
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.white,
  },

  lineChartLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#FF6B9D',
    top: rh(4),
    left: rw(5),
  },

  xAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: -ResponsiveTheme.spacing.lg,
    left: 0,
    right: 0,
  },

  xAxisLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Area Chart Styles
  areaChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: rh(180),
    marginTop: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  areaChartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginHorizontal: rp(2),
  },

  areaChartSegment: {
    width: '100%',
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xs,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xs,
  },

  areaChartLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Bar Chart Styles
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: rh(180),
    marginTop: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  barChartItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: rp(2),
  },

  barChartBarContainer: {
    width: '100%',
    height: rh(140),
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  barChartBar: {
    width: '80%',
    borderRadius: ResponsiveTheme.borderRadius.sm,
    overflow: 'hidden',
    minHeight: rh(10),
  },

  barChartBarGradient: {
    width: '100%',
    height: '100%',
  },

  barChartLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  barChartValue: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    marginTop: rp(2),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  // Multi-Line Chart Styles
  multiLineChartContainer: {
    height: rh(200),
    position: 'relative',
    marginTop: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  multiLineChartPointGroup: {
    position: 'absolute',
    width: rw(12),
    height: '100%',
  },

  multiLineChartDot: {
    position: 'absolute',
    width: rw(8),
    height: rh(8),
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.white,
  },
});

export default AnalyticsScreen;