// Advanced Analytics Screen
// Comprehensive fitness analytics with insights and predictions

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  RefreshControl,
  Alert 
} from 'react-native';
import { useAnalyticsStore, analyticsHelpers } from '../../stores/analyticsStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import AnalyticsCard from '../../components/analytics/AnalyticsCard';
import InsightCard from '../../components/analytics/InsightCard';
import ProgressChart from '../../components/analytics/ProgressChart';
import PremiumGate from '../../components/subscription/PremiumGate';

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

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAnalytics();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: 'week' | 'month' | 'quarter' | 'year') => {
    if (!isPremium && (period === 'quarter' || period === 'year')) {
      showPaywallModal('advanced_analytics');
      return;
    }
    setPeriod(period);
  };

  const periods = [
    { key: 'week', label: 'Week', premium: false },
    { key: 'month', label: 'Month', premium: false },
    { key: 'quarter', label: 'Quarter', premium: true },
    { key: 'year', label: 'Year', premium: true },
  ] as const;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'workout', label: 'Workout', icon: '💪' },
    { key: 'nutrition', label: 'Nutrition', icon: '🥗' },
    { key: 'wellness', label: 'Wellness', icon: '😌' },
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
          icon="⭐"
          color="purple"
          size="medium"
        />
        
        <AnalyticsCard
          title="Current Streak"
          value={analyticsSummary.currentStreak}
          subtitle="days active"
          icon="🔥"
          color="orange"
          size="medium"
          trend={analyticsSummary.currentStreak > 7 ? 'up' : analyticsSummary.currentStreak > 3 ? 'stable' : 'down'}
          trendValue={`${analyticsSummary.currentStreak} days`}
        />
        
        <AnalyticsCard
          title="Total Workouts"
          value={currentAnalytics?.workout.totalWorkouts || analyticsSummary.totalWorkouts}
          subtitle={`${selectedPeriod} period`}
          icon="🏋️‍♂️"
          color="blue"
          size="medium"
        />
        
        <AnalyticsCard
          title="Trend"
          value={analyticsSummary.recentTrend}
          subtitle="recent performance"
          icon={analyticsSummary.recentTrend === 'Improving' ? '📈' : 
                analyticsSummary.recentTrend === 'Declining' ? '📉' : '➡️'}
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
          💡 Key Insights
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
            🏆 Recent Achievements
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
            icon="📅"
            color="blue"
          />
          
          <AnalyticsCard
            title="Avg Duration"
            value={currentAnalytics?.workout.averageWorkoutDuration.toFixed(0) || '0'}
            subtitle="minutes"
            icon="⏱️"
            color="green"
          />
          
          <AnalyticsCard
            title="Consistency"
            value={currentAnalytics?.workout.consistencyScore || 0}
            subtitle="out of 100"
            icon="🎯"
            color="purple"
          />
          
          <AnalyticsCard
            title="Calories Burned"
            value={currentAnalytics?.workout.caloriesBurnedTotal.toLocaleString() || '0'}
            subtitle="total"
            icon="🔥"
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
            icon="🥗"
            color="green"
          />
          
          <AnalyticsCard
            title="Water Intake"
            value={currentAnalytics?.nutrition.waterIntakeAverage.toFixed(1) || '2.5'}
            subtitle="liters/day"
            icon="💧"
            color="blue"
          />
          
          <AnalyticsCard
            title="Meal Consistency"
            value={currentAnalytics?.nutrition.mealLoggingConsistency || 85}
            subtitle="% logged"
            icon="📝"
            color="purple"
          />
          
          <AnalyticsCard
            title="Variety Score"
            value={currentAnalytics?.nutrition.varietyScore || 85}
            subtitle="out of 100"
            icon="🌈"
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
            icon="😴"
            color="purple"
          />
          
          <AnalyticsCard
            title="Recovery Score"
            value={currentAnalytics?.sleepWellness.recoveryScore || 75}
            subtitle="out of 100"
            icon="⚡"
            color="green"
          />
          
          <AnalyticsCard
            title="Sleep Consistency"
            value={currentAnalytics?.sleepWellness.sleepConsistency || 80}
            subtitle="out of 100"
            icon="🎯"
            color="blue"
          />
          
          <AnalyticsCard
            title="Sleep Debt"
            value={currentAnalytics?.sleepWellness.sleepDebt.toFixed(1) || '0.0'}
            subtitle="hours"
            icon="⏰"
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
                <Text className="text-2xl mr-3">🛏️</Text>
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
                <Text className="text-2xl mr-3">📈</Text>
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
    <ScrollView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Analytics Dashboard
        </Text>
        <Text className="text-gray-600 dark:text-gray-400">
          Your fitness journey insights
        </Text>
      </View>

      {/* Period Selector */}
      <View className="bg-white dark:bg-gray-800 px-6 pb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-3">
            {periods.map(period => (
              <Pressable
                key={period.key}
                onPress={() => handlePeriodChange(period.key)}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  selectedPeriod === period.key
                    ? 'bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <Text className={`font-medium ${
                  selectedPeriod === period.key
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {period.label}
                </Text>
                {period.premium && !isPremium && (
                  <Text className="ml-1 text-yellow-400">👑</Text>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tab Navigation */}
      <View className="bg-white dark:bg-gray-800 px-6 pb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-4">
            {tabs.map(tab => (
              <Pressable
                key={tab.key}
                onPress={() => setSelectedTab(tab.key)}
                className={`px-4 py-2 rounded-lg flex-row items-center ${
                  selectedTab === tab.key
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : ''
                }`}
              >
                <Text className="mr-2">{tab.icon}</Text>
                <Text className={`font-medium ${
                  selectedTab === tab.key
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View className="px-6 pb-8">
        {renderTabContent()}
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;