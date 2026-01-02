/**
 * HomeScreen - World-Class Fitness Dashboard
 * 
 * PREMIUM FEATURES:
 * - Health Intelligence Hub (Recovery Score, HR, Sleep)
 * - Smart AI Coaching (Personalized recommendations)
 * - Hydration Tracker (Water intake with visuals)
 * - Body Progress (Weight trend & goal countdown)
 * 
 * Layout Order:
 * 1. Header (greeting, streak, notifications)
 * 2. Motivation Banner (time-based quotes)
 * 3. Health Intelligence Hub (recovery, vitals)
 * 4. Daily Progress Rings (Move/Exercise/Meals)
 * 5. Smart Coaching (AI recommendations)
 * 6. Today's Workout
 * 7. Quick Actions
 * 8. Hydration Tracker
 * 9. Body Progress
 * 10. Achievements
 * 11. Weekly Calendar
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { haptics } from '../../utils/haptics';
import { ResponsiveTheme } from '../../utils/constants';
import { rh } from '../../utils/responsive';
import { useDashboardIntegration } from '../../utils/integration';
import { useAuth } from '../../hooks/useAuth';
import { useCalculatedMetrics } from '../../hooks/useCalculatedMetrics';
import DataRetrievalService from '../../services/dataRetrieval';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { useHealthDataStore } from '../../stores/healthDataStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useUserStore } from '../../stores/userStore';
import { GuestSignUpScreen } from './GuestSignUpScreen';
import { Ionicons } from '@expo/vector-icons';

import {
  HomeHeader,
  GuestPromptBanner,
  MotivationBanner,
  DailyProgressRings,
  TodaysFocus,
  QuickActions,
  WeeklyMiniCalendar,
  // Premium Features
  HealthIntelligenceHub,
  HydrationTracker,
  BodyProgressCard,
} from './home';

interface HomeScreenProps {
  onNavigateToTab?: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToTab }) => {
  const insets = useSafeAreaInsets();
  const { getUserStats, profile } = useDashboardIntegration();
  const { isGuestMode } = useAuth();
  const userProfile = useUserStore((state) => state.profile);

  // Stores
  const { loadData: loadFitnessData, weeklyWorkoutPlan } = useFitnessStore();
  const { loadData: loadNutritionData, dailyMeals, weeklyMealPlan } = useNutritionStore();
  const { currentStreak: achievementStreak } = useAchievementStore();
  const { 
    metrics: healthMetrics, 
    isHealthKitAuthorized, 
    isHealthConnectAuthorized, 
    initializeHealthKit, 
    syncHealthData, 
    initializeHealthConnect, 
    syncFromHealthConnect, 
    settings: healthSettings 
  } = useHealthDataStore();
  const { isInitialized: analyticsInitialized, initialize: initializeAnalytics, refreshAnalytics } = useAnalyticsStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [todaysData, setTodaysData] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Hydration state - NO HARDCODED FALLBACKS
  // Get water goal from onboarding calculations (climate-adjusted)
  const {
    metrics: calculatedMetrics,
    getWaterGoalLiters,
    hasCalculatedMetrics,
  } = useCalculatedMetrics();
  
  const [waterIntake, setWaterIntake] = useState(0);
  // Water goal from calculated metrics (in ml) - NO HARDCODED DEFAULT
  // If null, UI should show "Complete onboarding" message
  const waterGoal = calculatedMetrics?.dailyWaterML ?? null;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        await DataRetrievalService.loadAllData();
        setTodaysData(DataRetrievalService.getTodaysData());
        setWeeklyProgress(DataRetrievalService.getWeeklyProgress());
        
        if (Platform.OS === 'ios' && healthSettings.healthKitEnabled) {
          isHealthKitAuthorized ? syncHealthData() : initializeHealthKit();
        } else if (Platform.OS === 'android' && healthSettings.healthConnectEnabled) {
          isHealthConnectAuthorized ? syncFromHealthConnect(7) : initializeHealthConnect();
        }
        
        analyticsInitialized ? refreshAnalytics() : initializeAnalytics();
        initializeSubscription();
      } catch (err) {
        console.error('Load error:', err);
      }
    };

    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, []);

  // Memoized values
  const userStats = useMemo(() => getUserStats() || {}, [getUserStats]);
  const realCaloriesBurned = useMemo(() => DataRetrievalService.getTotalCaloriesBurned(), [todaysData]);
  const realStreak = useMemo(() => weeklyProgress?.streak || achievementStreak || userStats?.currentStreak || 0, [weeklyProgress, achievementStreak, userStats]);
  const todaysWorkoutInfo = useMemo(() => DataRetrievalService.getTodaysWorkoutForHome(), [todaysData]);

  // User age for heart rate zones
  const userAge = useMemo(() => {
    return userProfile?.personalInfo?.age || profile?.personalInfo?.age || 30;
  }, [userProfile, profile]);

  // Weight data for body progress - use calculatedMetrics from onboarding
  const weightData = useMemo(() => {
    const currentWeight = calculatedMetrics?.currentWeightKg || healthMetrics?.weight || userProfile?.personalInfo?.weight;
    const goalWeight = calculatedMetrics?.targetWeightKg || userProfile?.fitnessGoals?.targetWeight;
    const startingWeight = userProfile?.personalInfo?.weight || currentWeight;
    
    return {
      currentWeight,
      goalWeight,
      startingWeight,
      // NO MOCK DATA - only show weight history if real data exists
      // In production, this would come from a dedicated weight tracking store
      weightHistory: currentWeight ? [
        { date: new Date().toISOString().split('T')[0], weight: currentWeight },
      ] : [],
    };
  }, [healthMetrics, userProfile, calculatedMetrics]);

  // Meal count
  const mealsLogged = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todaysMeals = weeklyMealPlan?.meals?.filter((m: any) => m.dayOfWeek?.toLowerCase() === today) || dailyMeals || [];
    return todaysMeals.length;
  }, [weeklyMealPlan, dailyMeals]);

  // Workout minutes
  const workoutMinutes = useMemo(() => {
    return todaysWorkoutInfo.workout?.duration || 0;
  }, [todaysWorkoutInfo]);


  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await Promise.all([loadFitnessData(), loadNutritionData()]);
      setTodaysData(DataRetrievalService.getTodaysData());
      setWeeklyProgress(DataRetrievalService.getWeeklyProgress());
      
      // Sync health data on refresh
      if (Platform.OS === 'ios' && isHealthKitAuthorized) {
        await syncHealthData(true);
      } else if (Platform.OS === 'android' && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadFitnessData, loadNutritionData, isHealthKitAuthorized, isHealthConnectAuthorized, syncHealthData, syncFromHealthConnect]);

  // Handle water intake
  const handleAddWater = useCallback((amount: number) => {
    haptics.medium();
    setWaterIntake(prev => Math.min(prev + amount, waterGoal * 1.5)); // Cap at 150% of goal
  }, [waterGoal]);

  // Quick actions (no redundant badges)
  // Quick Actions - Unique actions NOT in navigation bar
  const quickActions = useMemo(() => [
    { 
      id: 'log-weight', 
      label: 'Log Weight', 
      icon: 'scale-outline' as keyof typeof Ionicons.glyphMap, 
      color: '#9C27B0', 
      onPress: () => Alert.alert('Log Weight', 'Add your current weight') 
    },
    { 
      id: 'progress-photo', 
      label: 'Photo', 
      icon: 'camera-outline' as keyof typeof Ionicons.glyphMap, 
      color: '#FF6B6B', 
      onPress: () => Alert.alert('Progress Photo', 'Take or view progress photos') 
    },
    { 
      id: 'log-sleep', 
      label: 'Sleep', 
      icon: 'moon-outline' as keyof typeof Ionicons.glyphMap, 
      color: '#667eea', 
      onPress: () => Alert.alert('Log Sleep', 'Track your sleep quality') 
    },
    { 
      id: 'health-sync', 
      label: 'Sync', 
      icon: 'sync-outline' as keyof typeof Ionicons.glyphMap, 
      color: '#4CAF50', 
      onPress: async () => {
        haptics.medium();
        if (Platform.OS === 'ios' && isHealthKitAuthorized) {
          await syncHealthData(true);
          Alert.alert('Synced', 'Health data synced successfully');
        } else if (Platform.OS === 'android' && isHealthConnectAuthorized) {
          await syncFromHealthConnect(7);
          Alert.alert('Synced', 'Health data synced successfully');
        } else {
          Alert.alert('Health Sync', 'Connect to Health app in settings');
        }
      }
    },
  ], [isHealthKitAuthorized, isHealthConnectAuthorized, syncHealthData, syncFromHealthConnect]);

  // Weekly calendar data
  const weekCalendarData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workout = weeklyWorkoutPlan?.workouts?.find((w: any) => w.dayOfWeek?.toLowerCase() === dayName);
      
      return {
        date,
        hasWorkout: !!workout && !workout.isRestDay,
        workoutCompleted: workout?.completed || false,
        isRestDay: workout?.isRestDay || i === 0,
      };
    });
  }, [weeklyWorkoutPlan]);


  if (showGuestSignUp) {
    return <GuestSignUpScreen onBack={() => setShowGuestSignUp(false)} onSignUpSuccess={() => setShowGuestSignUp(false)} />;
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
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
            {/* 1. Header */}
            <HomeHeader
              userName={profile?.personalInfo?.name || userProfile?.personalInfo?.name || 'Champion'}
              userInitial={(profile?.personalInfo?.name || userProfile?.personalInfo?.name || 'C').charAt(0)}
              streak={realStreak}
              onProfilePress={() => onNavigateToTab?.('profile')}
              onStreakPress={() => Alert.alert('Streak', `${realStreak} day streak! Keep going!`)}
            />

            {/* 2. Motivation Banner */}
            <View style={styles.section}>
              <MotivationBanner />
            </View>

            {/* Guest Banner */}
            {isGuestMode && (
              <View style={styles.section}>
                <GuestPromptBanner onSignUpPress={() => setShowGuestSignUp(true)} />
              </View>
            )}

            {/* 3. Health Intelligence Hub - PREMIUM */}
            <View style={styles.section}>
              <HealthIntelligenceHub
                sleepHours={healthMetrics?.sleepHours}
                sleepQuality={healthMetrics?.sleepQuality || 'good'}
                restingHeartRate={healthMetrics?.restingHeartRate}
                hrTrend={healthMetrics?.restingHeartRate && healthMetrics.restingHeartRate < 65 ? 'down' : 'stable'}
                steps={healthMetrics?.steps || 0}
                stepsGoal={10000}
                activeCalories={healthMetrics?.activeCalories || realCaloriesBurned}
                age={userAge}
                onPress={() => onNavigateToTab?.('progress')}
                onDetailPress={(metric) => {
                  if (metric === 'heart') Alert.alert('Heart Rate', 'Detailed heart rate data');
                  else if (metric === 'sleep') Alert.alert('Sleep', 'Detailed sleep analysis');
                }}
              />
            </View>

            {/* 4. Daily Progress Rings */}
            <View style={styles.section}>
              <DailyProgressRings
                caloriesBurned={realCaloriesBurned}
                caloriesGoal={500}
                workoutMinutes={workoutMinutes}
                workoutGoal={30}
                mealsLogged={mealsLogged}
                mealsGoal={4}
                onPress={() => onNavigateToTab?.('progress')}
              />
            </View>

            {/* 5. Today's Workout */}
            <View style={styles.section}>
              <TodaysFocus
                workoutInfo={todaysWorkoutInfo}
                workoutProgress={todaysData?.progress?.workoutProgress || 0}
                onWorkoutPress={() => onNavigateToTab?.('fitness')}
              />
            </View>

            {/* 6. Quick Actions - Unique utilities */}
            <View style={styles.quickActionsSection}>
              <QuickActions actions={quickActions} />
            </View>

            {/* 7. Hydration Tracker - PREMIUM */}
            <View style={styles.section}>
              <HydrationTracker
                currentIntake={waterIntake}
                dailyGoal={waterGoal}
                onAddWater={handleAddWater}
                onPress={() => Alert.alert('Hydration', 'Detailed hydration tracking')}
              />
            </View>

            {/* 9. Body Progress - PREMIUM */}
            <View style={styles.section}>
              <BodyProgressCard
                currentWeight={weightData.currentWeight}
                goalWeight={weightData.goalWeight}
                startingWeight={weightData.startingWeight}
                weightHistory={weightData.weightHistory}
                unit="kg"
                onPress={() => onNavigateToTab?.('progress')}
                onPhotoPress={() => Alert.alert('Progress Photo', 'Take or view progress photos')}
                onLogWeight={() => Alert.alert('Log Weight', 'Add weight entry')}
              />
            </View>

            {/* 10. Weekly Calendar */}
            <View style={styles.section}>
              <WeeklyMiniCalendar
                weekData={weekCalendarData}
                onViewFullCalendar={() => onNavigateToTab?.('fitness')}
              />
            </View>

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
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  quickActionsSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
});

export default HomeScreen;
