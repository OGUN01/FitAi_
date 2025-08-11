import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Card, Button, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useProgressData } from '../../hooks/useProgressData';
import { ProgressAnalytics } from '../../components/progress/ProgressAnalytics';
import DataRetrievalService from '../../services/dataRetrieval';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { completionTrackingService } from '../../services/completionTracking';

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Real data from stores
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [realWeeklyData, setRealWeeklyData] = useState<any[]>([]);

  // Activities pagination
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const ACTIVITIES_PER_PAGE = 10;
  const [todaysData, setTodaysData] = useState<any>(null);

  // Authentication and user data
  const { user, isAuthenticated } = useAuth();

  // Store data (not used directly here; we use DataRetrievalService to access stores safely)
  // const { loadData: loadFitnessData } = useFitnessStore();
  // const { loadData: loadNutritionData } = useNutritionStore();

  // Real progress data with Track B integration
  const {
    progressEntries,
    progressLoading,
    progressError,
    loadProgressEntries,
    bodyAnalysis,
    progressStats,
    statsLoading,
    progressGoals,
    createProgressEntry,
    trackBStatus,
    refreshAll,
    clearErrors,
  } = useProgressData();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Function to refresh progress data
  const refreshProgressData = async () => {
    try {
      // Load persisted data into stores
      await DataRetrievalService.loadAllData();

      // Pull real data from centralized retrieval service
      const today = DataRetrievalService.getTodaysData();
      setTodaysData(today);

      const weekly = DataRetrievalService.getWeeklyProgress();
      setWeeklyProgress(weekly);

      const activities = DataRetrievalService.getRecentActivities(50);
      setRecentActivities(activities);

      // Build weekly chart data from activities
      const weekData = generateWeeklyChartData(activities);
      setRealWeeklyData(weekData);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    }
  };

  // Load real data on mount and subscribe to completion events
  useEffect(() => {
    // Initial data load
    refreshProgressData();

    // Load all activities for modal
    loadAllActivities();

    // Subscribe to completion events for real-time updates
    const unsubscribe = completionTrackingService.subscribe((event) => {
      console.log('📊 Progress Tab - Received completion event:', event);

      // Refresh progress data when meals or workouts are completed
      if (event.type === 'meal' || event.type === 'workout') {
        console.log('📊 Progress Tab - Refreshing data due to completion event');
        refreshProgressData();
      }
    });

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Generate weekly chart data from activities
  const generateWeeklyChartData = (activities: any[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = days.map((day) => ({ day, workouts: 0, meals: 0, calories: 0, duration: 0 }));

    activities.forEach((activity) => {
      const activityDate = new Date(activity.completedAt);
      const dayIndex = (activityDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0

      if (activity.type === 'workout') {
        weekData[dayIndex].workouts += 1;
        weekData[dayIndex].calories += activity.calories || 0;
        weekData[dayIndex].duration += activity.duration || 0;
      } else if (activity.type === 'meal') {
        weekData[dayIndex].meals += 1;
        weekData[dayIndex].calories += activity.calories || 0;
      }
    });

    console.log('📊 Generated weekly chart data with meals:', weekData);
    return weekData;
  };

  const periods = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  // Real stats from progress data
  const stats = progressStats
    ? {
        weight: {
          current: progressStats.weightChange.current,
          change: progressStats.weightChange.change,
          unit: 'kg',
          goal: progressGoals?.target_weight_kg || 70.0,
          trend:
            progressStats.weightChange.change < 0
              ? 'decreasing'
              : progressStats.weightChange.change > 0
                ? 'increasing'
                : 'stable',
          weeklyAvg: progressStats.weightChange.current,
        },
        bodyFat: {
          current: progressStats.bodyFatChange.current,
          change: progressStats.bodyFatChange.change,
          unit: '%',
          goal: progressGoals?.target_body_fat_percentage || 15.0,
          trend:
            progressStats.bodyFatChange.change < 0
              ? 'decreasing'
              : progressStats.bodyFatChange.change > 0
                ? 'increasing'
                : 'stable',
          weeklyAvg: progressStats.bodyFatChange.current,
        },
        muscle: {
          current: progressStats.muscleChange.current,
          change: progressStats.muscleChange.change,
          unit: 'kg',
          goal: progressGoals?.target_muscle_mass_kg || 45.0,
          trend:
            progressStats.muscleChange.change < 0
              ? 'decreasing'
              : progressStats.muscleChange.change > 0
                ? 'increasing'
                : 'stable',
          weeklyAvg: progressStats.muscleChange.current,
        },
        bmi: {
          current:
            progressStats.weightChange.current > 0
              ? progressStats.weightChange.current / Math.pow(1.75, 2)
              : 22.4, // Assuming 1.75m height
          change: -0.7, // Calculated based on weight change
          unit: '',
          goal: 21.5,
          trend: progressStats.weightChange.change < 0 ? 'decreasing' : 'increasing',
          weeklyAvg:
            progressStats.weightChange.current > 0
              ? progressStats.weightChange.current / Math.pow(1.75, 2)
              : 22.4,
        },
      }
    : {
        weight: { current: 0, change: 0, unit: 'kg', goal: 70.0, trend: 'stable', weeklyAvg: 0 },
        bodyFat: { current: 0, change: 0, unit: '%', goal: 15.0, trend: 'stable', weeklyAvg: 0 },
        muscle: { current: 0, change: 0, unit: 'kg', goal: 45.0, trend: 'stable', weeklyAvg: 0 },
        bmi: { current: 0, change: 0, unit: '', goal: 21.5, trend: 'stable', weeklyAvg: 0 },
      };

  // Real achievements based on actual user progress
  const achievements = [
    {
      id: 'first-workout',
      title: 'First Workout',
      description: 'Complete your first workout',
      icon: '🏋️',
      date: weeklyProgress?.workoutsCompleted > 0 ? 'Completed' : 'Not yet',
      completed: weeklyProgress?.workoutsCompleted > 0,
      category: 'Milestone',
      points: 25,
      rarity: 'common',
    },
    {
      id: 'first-meal',
      title: 'First Meal',
      description: 'Complete your first meal',
      icon: '🍽️',
      date: weeklyProgress?.mealsCompleted > 0 ? 'Completed' : 'Not yet',
      completed: weeklyProgress?.mealsCompleted > 0,
      category: 'Nutrition',
      points: 15,
      rarity: 'common',
    },
    {
      id: 'meal-streak',
      title: 'Meal Master',
      description: 'Complete 5 meals in a row',
      icon: '🥗',
      date: weeklyProgress?.mealsCompleted >= 5 ? 'Completed' : 'Not yet',
      completed: weeklyProgress?.mealsCompleted >= 5,
      category: 'Nutrition',
      points: 50,
      rarity: 'uncommon',
      progress: weeklyProgress?.mealsCompleted || 0,
      target: 5,
    },
    {
      id: 'nutrition-week',
      title: 'Nutrition Week',
      description: 'Complete 21 meals (full week)',
      icon: '🌟',
      date: weeklyProgress?.mealsCompleted >= 21 ? 'Completed' : 'Not yet',
      completed: weeklyProgress?.mealsCompleted >= 21,
      category: 'Nutrition',
      points: 100,
      rarity: 'rare',
      progress: weeklyProgress?.mealsCompleted || 0,
      target: 21,
    },
    {
      id: 'week-streak',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      date: weeklyProgress?.streak >= 7 ? 'Completed' : 'Not yet',
      completed: weeklyProgress?.streak >= 7,
      category: 'Consistency',
      points: 100,
      rarity: 'uncommon',
      progress: weeklyProgress?.streak || 0,
      target: 7,
    },
    {
      id: 'calorie-crusher',
      title: 'Calorie Crusher',
      description: 'Burn 1000+ calories in workouts',
      icon: '🔥',
      date: DataRetrievalService.getTotalCaloriesBurned() >= 1000 ? 'Completed' : 'Not yet',
      completed: DataRetrievalService.getTotalCaloriesBurned() >= 1000,
      category: 'Fitness',
      points: 150,
      rarity: 'rare',
      progress: DataRetrievalService.getTotalCaloriesBurned(),
      target: 1000,
    },
  ];

  // Use real weekly data from stores
  const weeklyData =
    realWeeklyData.length > 0
      ? realWeeklyData
      : [
          { day: 'Mon', workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: 'Tue', workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: 'Wed', workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: 'Thu', workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: 'Fri', workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: 'Sat', workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: 'Sun', workouts: 0, meals: 0, calories: 0, duration: 0 },
        ];

  const loadAllActivities = () => {
    // Load all activities for the modal
    const allActivitiesData = DataRetrievalService.getRecentActivities(100); // Get more activities
    setAllActivities(allActivitiesData);
    setActivitiesPage(1);
    setHasMoreActivities(allActivitiesData.length >= ACTIVITIES_PER_PAGE);
  };

  const loadMoreActivities = () => {
    if (loadingMoreActivities || !hasMoreActivities) return;

    setLoadingMoreActivities(true);

    // Simulate loading more activities (in real app, this would be an API call)
    setTimeout(() => {
      const startIndex = activitiesPage * ACTIVITIES_PER_PAGE;
      const moreActivities = DataRetrievalService.getRecentActivities(200).slice(
        startIndex,
        startIndex + ACTIVITIES_PER_PAGE
      );

      if (moreActivities.length > 0) {
        setAllActivities((prev) => [...prev, ...moreActivities]);
        setActivitiesPage((prev) => prev + 1);
        setHasMoreActivities(moreActivities.length === ACTIVITIES_PER_PAGE);
      } else {
        setHasMoreActivities(false);
      }

      setLoadingMoreActivities(false);
    }, 1000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      await refreshProgressData();

      // Refresh all activities for modal
      loadAllActivities();

      Alert.alert('Refreshed', 'Progress data has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh progress data');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle adding new progress entry
  const handleAddProgressEntry = async () => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please sign in to track progress.');
      return;
    }

    // For demo purposes, create a sample entry
    const success = await createProgressEntry({
      weight_kg: 72.5,
      body_fat_percentage: 18.2,
      muscle_mass_kg: 42.1,
      measurements: {
        chest: 100,
        waist: 80,
        hips: 95,
        bicep: 35,
        thigh: 55,
        neck: 38,
      },
      notes: 'Weekly progress check',
    });

    if (success) {
      Alert.alert('Success', 'Progress entry added successfully!');
    } else {
      Alert.alert('Error', 'Failed to add progress entry');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ResponsiveTheme.colors.primary}
              colors={[ResponsiveTheme.colors.primary]}
              title=""
              titleColor={ResponsiveTheme.colors.primary}
            />
          }
        >
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Progress</Text>
              <View style={styles.headerButtons}>
                {/* Track B Status Indicator */}
                <TouchableOpacity style={styles.statusButton}>
                  <Text style={styles.statusIcon}>{trackBStatus.isConnected ? '🟢' : '🔴'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.analyticsButton, showAnalytics && styles.analyticsButtonActive]}
                  onPress={() => setShowAnalytics(!showAnalytics)}
                >
                  <Text style={styles.analyticsIcon}>📊</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={handleAddProgressEntry}>
                  <Text style={styles.addIcon}>➕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                  <Text style={styles.shareIcon}>📤</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading State */}
            {(progressLoading || statsLoading) && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
                <Text style={styles.loadingText}>Loading progress data...</Text>
              </View>
            )}

            {/* Error State */}
            {progressError && (
              <Card style={styles.errorCard} variant="outlined">
                <Text style={styles.errorText}>⚠️ {progressError}</Text>
                <Button
                  title="Retry"
                  onPress={refreshAll}
                  variant="outline"
                  size="sm"
                  style={styles.retryButton}
                />
              </Card>
            )}

            {/* No Authentication State */}
            {!isAuthenticated && (
              <Card style={styles.errorCard} variant="outlined">
                <Text style={styles.errorText}>🔐 Please sign in to track your progress</Text>
              </Card>
            )}

            {/* No Data State */}
            {isAuthenticated && progressEntries.length === 0 && !progressLoading && (
              <Card style={styles.errorCard} variant="outlined">
                <Text style={styles.errorText}>📊 No progress data yet</Text>
                <Text style={styles.errorSubtext}>
                  Add your first measurement to start tracking!
                </Text>
                <Button
                  title="Add Entry"
                  onPress={handleAddProgressEntry}
                  variant="primary"
                  size="sm"
                  style={styles.retryButton}
                />
              </Card>
            )}

            {/* Today's Progress */}
            {isAuthenticated && todaysData && !showAnalytics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Progress</Text>
                <Card style={styles.todaysCard} variant="elevated">
                  <View style={styles.todaysHeader}>
                    <Text style={styles.todaysDate}>
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.todaysStats}>
                    {/* Workout Progress */}
                    <View style={styles.todaysStat}>
                      <Text style={styles.todaysStatIcon}>🏋️</Text>
                      <View style={styles.todaysStatContent}>
                        <Text style={styles.todaysStatLabel}>Workout</Text>
                        <Text style={styles.todaysStatValue}>
                          {todaysData.workout
                            ? `${todaysData.progress.workoutProgress}%`
                            : 'Rest Day'}
                        </Text>
                      </View>
                    </View>

                    {/* Meals Progress */}
                    <View style={styles.todaysStat}>
                      <Text style={styles.todaysStatIcon}>🍽️</Text>
                      <View style={styles.todaysStatContent}>
                        <Text style={styles.todaysStatLabel}>Meals</Text>
                        <Text style={styles.todaysStatValue}>
                          {todaysData.progress.mealsCompleted}/{todaysData.progress.totalMeals}
                        </Text>
                      </View>
                    </View>

                    {/* Calories Progress */}
                    <View style={styles.todaysStat}>
                      <Text style={styles.todaysStatIcon}>🔥</Text>
                      <View style={styles.todaysStatContent}>
                        <Text style={styles.todaysStatLabel}>Calories</Text>
                        <Text style={styles.todaysStatValue}>
                          {todaysData.progress.caloriesConsumed}/
                          {todaysData.progress.targetCalories}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </View>
            )}

            {/* Progress Analytics Component */}
            {showAnalytics && <ProgressAnalytics />}

            {/* Period Selector */}
            {!showAnalytics && (
              <View style={styles.section}>
                <View style={styles.periodSelector}>
                  {periods.map((period) => (
                    <TouchableOpacity
                      key={period.id}
                      onPress={() => setSelectedPeriod(period.id)}
                      style={[
                        styles.periodButton,
                        selectedPeriod === period.id && styles.periodButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          selectedPeriod === period.id && styles.periodTextActive,
                        ]}
                      >
                        {period.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Body Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Body Metrics</Text>
              <View style={styles.statsGrid}>
                <Card style={styles.statCard} variant="elevated">
                  <View style={styles.statHeader}>
                    <Text style={styles.statValue}>{stats.weight.current}</Text>
                    <Text style={styles.statUnit}>{stats.weight.unit}</Text>
                    <Text style={styles.trendIcon}>
                      {stats.weight.trend === 'decreasing' ? '📉' : '📈'}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>Weight</Text>
                  <Text
                    style={[
                      styles.statChange,
                      stats.weight.change < 0
                        ? styles.statChangePositive
                        : styles.statChangeNegative,
                    ]}
                  >
                    {stats.weight.change > 0 ? '+' : ''}
                    {stats.weight.change} {stats.weight.unit}
                  </Text>
                  <View style={styles.goalProgress}>
                    <Text style={styles.goalText}>
                      Goal: {stats.weight.goal}
                      {stats.weight.unit}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          (() => {
                            const current = Number(stats.weight.current) || 0;
                            const goal = Number(stats.weight.goal) || 0;
                            if (current <= 0 || !isFinite(current)) {
                              return { width: '0%' };
                            }
                            const raw = ((current - goal) / current) * 100 + 50;
                            const clamped = Math.max(0, Math.min(100, isFinite(raw) ? raw : 0));
                            return { width: `${clamped}%` };
                          })(),
                        ]}
                      />
                    </View>
                  </View>
                </Card>

                <Card style={styles.statCard} variant="elevated">
                  <Text style={styles.statValue}>{stats.bodyFat.current}</Text>
                  <Text style={styles.statUnit}>{stats.bodyFat.unit}</Text>
                  <Text style={styles.statLabel}>Body Fat</Text>
                  <Text
                    style={[
                      styles.statChange,
                      stats.bodyFat.change < 0
                        ? styles.statChangePositive
                        : styles.statChangeNegative,
                    ]}
                  >
                    {stats.bodyFat.change > 0 ? '+' : ''}
                    {stats.bodyFat.change}
                    {stats.bodyFat.unit}
                  </Text>
                </Card>
              </View>

              <View style={styles.statsGrid}>
                <Card style={styles.statCard} variant="elevated">
                  <Text style={styles.statValue}>{stats.muscle.current}</Text>
                  <Text style={styles.statUnit}>{stats.muscle.unit}</Text>
                  <Text style={styles.statLabel}>Muscle Mass</Text>
                  <Text
                    style={[
                      styles.statChange,
                      stats.muscle.change > 0
                        ? styles.statChangePositive
                        : styles.statChangeNegative,
                    ]}
                  >
                    {stats.muscle.change > 0 ? '+' : ''}
                    {stats.muscle.change} {stats.muscle.unit}
                  </Text>
                </Card>

                <Card style={styles.statCard} variant="elevated">
                  <Text style={styles.statValue}>{stats.bmi.current}</Text>
                  <Text style={styles.statUnit}>BMI</Text>
                  <Text style={styles.statLabel}>Body Mass Index</Text>
                  <Text
                    style={[
                      styles.statChange,
                      stats.bmi.change < 0 ? styles.statChangePositive : styles.statChangeNegative,
                    ]}
                  >
                    {stats.bmi.change > 0 ? '+' : ''}
                    {stats.bmi.change}
                  </Text>
                </Card>
              </View>
            </View>

            {/* Weekly Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>This Week's Activity</Text>
              <Card style={styles.chartCard} variant="elevated">
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Activity & Nutrition</Text>
                  <Text style={styles.chartSubtitle}>Last 7 days</Text>
                </View>

                <View style={styles.chart}>
                  {weeklyData.map((day, index) => (
                    <View key={index} style={styles.chartDay}>
                      <View style={styles.chartBars}>
                        <View
                          style={[
                            styles.chartBar,
                            styles.workoutBar,
                            { height: day.workouts * 40 + 10 },
                          ]}
                        />
                        <View
                          style={[styles.chartBar, styles.mealBar, { height: day.meals * 20 + 10 }]}
                        />
                        <View
                          style={[
                            styles.chartBar,
                            styles.calorieBar,
                            { height: day.calories / 10 + 5 },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartDayLabel}>{day.day}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: ResponsiveTheme.colors.primary },
                      ]}
                    />
                    <Text style={styles.legendText}>Workouts</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendText}>Meals</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: ResponsiveTheme.colors.secondary },
                      ]}
                    />
                    <Text style={styles.legendText}>Calories</Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Recent Activities */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                {recentActivities.length > 3 && (
                  <TouchableOpacity
                    onPress={() => {
                      loadAllActivities();
                      setShowAllActivities(true);
                    }}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 3).map((activity, index) => {
                  // Ensure activity name is a string
                  let activityName = activity.name;
                  if (Array.isArray(activityName)) {
                    activityName = activityName.join(', ');
                  } else if (typeof activityName !== 'string') {
                    activityName = String(activityName || 'Unknown Activity');
                  }

                  return (
                    <Card key={activity.id} style={styles.activityCard} variant="outlined">
                      <View style={styles.activityContent}>
                        <View style={styles.activityIcon}>
                          <Text style={styles.activityEmoji}>
                            {activity.type === 'workout' ? '🏋️‍♂️' : '🍽️'}
                          </Text>
                        </View>
                        <View style={styles.activityInfo}>
                          <Text style={styles.activityName}>{activityName}</Text>
                          <Text style={styles.activityDetails}>
                            {activity.type === 'workout'
                              ? `${activity.duration || 'Unknown'} min • ${activity.calories || 0} cal`
                              : `${activity.calories || 0} calories consumed`}
                          </Text>
                          <Text style={styles.activityDate}>
                            {new Date(activity.completedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.activityBadge}>
                          <Text style={styles.activityBadgeText}>✓</Text>
                        </View>
                      </View>
                    </Card>
                  );
                })
              ) : (
                <Card style={styles.emptyCard} variant="outlined">
                  <Text style={styles.emptyText}>No recent activities yet</Text>
                  <Text style={styles.emptySubtext}>
                    Complete workouts and meals to see them here
                  </Text>
                </Card>
              )}
            </View>

            {/* Achievements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Achievements</Text>

              {achievements.map((achievement) => (
                <Card key={achievement.id} style={styles.achievementCard} variant="outlined">
                  <View style={styles.achievementContent}>
                    <View
                      style={[
                        styles.achievementIcon,
                        achievement.completed && styles.achievementIconCompleted,
                      ]}
                    >
                      <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                    </View>

                    <View style={styles.achievementInfo}>
                      <View style={styles.achievementHeader}>
                        <Text style={styles.achievementTitle}>{achievement.title}</Text>
                        <View style={styles.achievementMeta}>
                          <Text style={styles.achievementCategory}>{achievement.category}</Text>
                          <Text style={styles.achievementPoints}>+{achievement.points} pts</Text>
                        </View>
                      </View>
                      <Text style={styles.achievementDescription}>{achievement.description}</Text>

                      {!achievement.completed &&
                      (achievement.progress ?? 0) > 0 &&
                      (achievement.target ?? 0) > 0 ? (
                        <View style={styles.achievementProgress}>
                          <View style={styles.progressBar}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${Math.min(100, Math.max(0, ((achievement.progress || 0) / (achievement.target || 1)) * 100))}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {achievement.progress}/{achievement.target}
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={[
                          styles.rarityBadge,
                          styles[
                            `rarity${achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}`
                          ],
                        ]}
                      >
                        <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.achievementDate,
                        achievement.completed && styles.achievementDateCompleted,
                      ]}
                    >
                      {achievement.date}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>

            {/* Summary Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overall Summary</Text>
              <Card style={styles.summaryCard} variant="elevated">
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {weeklyProgress?.workoutsCompleted || progressStats?.totalWorkouts || 0}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Workouts</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {realWeeklyData.reduce((total, day) => total + day.duration, 0) > 0
                        ? `${Math.round(realWeeklyData.reduce((total, day) => total + day.duration, 0) / 60)}h`
                        : progressStats?.totalDuration
                          ? `${Math.round(progressStats.totalDuration / 60)}h`
                          : '0h'}
                    </Text>
                    <Text style={styles.summaryLabel}>Time Exercised</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {DataRetrievalService.getTotalCaloriesBurned()?.toLocaleString() ||
                        progressStats?.totalCalories?.toLocaleString() ||
                        '0'}
                    </Text>
                    <Text style={styles.summaryLabel}>Calories Burned</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {weeklyProgress?.streak || progressStats?.currentStreak || 0}
                    </Text>
                    <Text style={styles.summaryLabel}>Day Streak</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </Animated.View>

      {/* All Activities Modal */}
      <Modal visible={showAllActivities} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Activities</Text>
            <TouchableOpacity
              onPress={() => setShowAllActivities(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={allActivities}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
            renderItem={({ item: activity }) => {
              // Ensure activity name is a string
              let activityName = activity.name;
              if (Array.isArray(activityName)) {
                activityName = activityName.join(', ');
              } else if (typeof activityName !== 'string') {
                activityName = String(activityName || 'Unknown Activity');
              }

              return (
                <Card style={styles.modalActivityCard} variant="outlined">
                  <View style={styles.activityContent}>
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityEmoji}>
                        {activity.type === 'workout' ? '🏋️‍♂️' : '🍽️'}
                      </Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{activityName}</Text>
                      <Text style={styles.activityDetails}>
                        {activity.type === 'workout'
                          ? `${activity.duration || 'Unknown'} min • ${activity.calories || 0} cal`
                          : `${activity.calories || 0} calories consumed`}
                      </Text>
                      <Text style={styles.activityDate}>
                        {new Date(activity.completedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.activityBadge}>
                      <Text style={styles.activityBadgeText}>✓</Text>
                    </View>
                  </View>
                </Card>
              );
            }}
            onEndReached={loadMoreActivities}
            onEndReachedThreshold={0.1}
            ListFooterComponent={() =>
              loadingMoreActivities ? (
                <View style={styles.loadingFooter}>
                  <ActivityIndicator size="small" color={ResponsiveTheme.colors.primary} />
                  <Text style={styles.loadingText}>Loading more activities...</Text>
                </View>
              ) : !hasMoreActivities && allActivities.length > 0 ? (
                <View style={styles.endFooter}>
                  <Text style={styles.endText}>You've reached the end!</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyModalContainer}>
                <Text style={styles.emptyModalText}>No activities found</Text>
                <Text style={styles.emptyModalSubtext}>
                  Complete workouts and meals to see them here
                </Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  shareButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  shareIcon: {
    fontSize: rf(20),
  },

  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.xs,
  },

  periodButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: 'center',
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  periodButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  periodText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },

  periodTextActive: {
    color: ResponsiveTheme.colors.white,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  statCard: {
    flex: 1,
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  statUnit: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: -ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statChange: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  statChangePositive: {
    color: ResponsiveTheme.colors.success,
  },

  statChangeNegative: {
    color: ResponsiveTheme.colors.error,
  },

  chartCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  chartHeader: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  chartTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  chartSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: rh(100),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  chartDay: {
    alignItems: 'center',
    flex: 1,
  },

  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: rh(80),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  chartBar: {
    width: rw(8),
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginHorizontal: rp(1),
  },

  workoutBar: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  calorieBar: {
    backgroundColor: ResponsiveTheme.colors.secondary,
  },

  chartDayLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.lg,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: rw(8),
    height: rh(8),
    borderRadius: rs(4),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  legendText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  achievementCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
  },

  achievementIcon: {
    width: rw(48),
    height: rh(48),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },

  achievementIconCompleted: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },

  achievementEmoji: {
    fontSize: rf(24),
  },

  achievementInfo: {
    flex: 1,
  },

  achievementTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  achievementDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  achievementProgress: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  achievementDate: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  achievementDateCompleted: {
    color: ResponsiveTheme.colors.success,
  },

  summaryCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.lg,
  },

  summaryItem: {
    width: '45%',
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  summaryLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    textAlign: 'center',
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },

  // Enhanced stat card styles
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  trendIcon: {
    fontSize: rf(16),
    marginLeft: ResponsiveTheme.spacing.xs,
  },

  goalProgress: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  goalText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: rp(4),
  },

  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.border,
    borderRadius: rs(2),
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rs(2),
  },

  // Enhanced achievement styles
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  achievementMeta: {
    alignItems: 'flex-end',
  },

  achievementCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  achievementPoints: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginTop: rp(2),
  },

  rarityBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rs(8),
    minWidth: rw(50),
    alignItems: 'center',
  },

  rarityCommon: {
    backgroundColor: '#E5E7EB',
  },

  rarityUncommon: {
    backgroundColor: '#DBEAFE',
  },

  rarityRare: {
    backgroundColor: '#EDE9FE',
  },

  rarityEpic: {
    backgroundColor: '#FEF3C7',
  },

  rarityText: {
    fontSize: rf(8),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(12),
  },

  statusButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusIcon: {
    fontSize: rf(16),
  },

  addButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addIcon: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.white,
  },

  analyticsButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  analyticsButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  analyticsIcon: {
    fontSize: rf(16),
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
  },

  errorCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  errorSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  retryButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Today's Progress styles
  todaysCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  todaysHeader: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  todaysDate: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
  },

  todaysStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  todaysStat: {
    alignItems: 'center',
    flex: 1,
  },

  todaysStatIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  todaysStatContent: {
    alignItems: 'center',
  },

  todaysStatLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  todaysStatValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
  },

  // Meal bar style for chart
  mealBar: {
    backgroundColor: '#4CAF50',
    marginHorizontal: rp(1),
    borderRadius: rs(2),
  },

  // Activity card styles
  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    padding: ResponsiveTheme.spacing.md,
  },

  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityIcon: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },

  activityEmoji: {
    fontSize: rf(20),
  },

  activityInfo: {
    flex: 1,
  },

  activityName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },

  activityDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
  },

  activityDate: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textTertiary,
  },

  activityBadge: {
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activityBadgeText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(14),
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  emptyCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  emptySubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textTertiary,
    textAlign: 'center',
  },

  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  viewAllText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  modalCloseButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rs(16),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCloseText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  modalContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  modalActivityCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Loading and end states
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.lg,
  },

  loadingText: {
    marginLeft: ResponsiveTheme.spacing.sm,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  endFooter: {
    paddingVertical: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },

  endText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textTertiary,
    fontStyle: 'italic',
  },

  emptyModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.xxl,
  },

  emptyModalText: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  emptyModalSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textTertiary,
    textAlign: 'center',
  },
});
