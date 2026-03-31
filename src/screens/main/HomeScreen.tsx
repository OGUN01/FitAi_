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

import React, { useCallback } from 'react';
import { View, StyleSheet, Animated, RefreshControl, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { AuroraSpinner } from '../../components/ui/aurora/AuroraSpinner';
import { ResponsiveTheme } from '../../utils/constants';
import { rh } from '../../utils/responsive';
import { GuestSignUpScreen } from './GuestSignUpScreen';
import {
  HomeHeader,
  GuestPromptBanner,
  MotivationBanner,
  DailyProgressRings,
  TodaysFocus,
  QuickActions,
  WeeklyMiniCalendar,
  HealthIntelligenceHub,
  HydrationTracker,
  BodyProgressCard,
  SyncStatusIndicator,
  ErrorBanner,
  EmptyMealsMessage,
  EmptyCalendarMessage,
  createQuickActions,
  AchievementShowcase,
} from './home';
import { WeightEntryModal } from '../../components/progress/WeightEntryModal';
import { useHomeLogic } from '../../hooks/useHomeLogic';
import { useAppStateStore, type DayName } from '../../stores/appStateStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { buildAchievementViewModels } from '../../utils/achievementViewModel';
import { getLocalDayName } from '../../utils/weekUtils';

import { crossPlatformAlert } from '../../utils/crossPlatformAlert';
interface HomeScreenProps {
  // eslint-disable-next-line no-unused-vars
  onNavigateToTab?: (tab: string, params?: Record<string, unknown>) => void;
}

const DAY_NAMES: DayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToTab }) => {
  const { setSelectedDay } = useAppStateStore();
  const insets = useSafeAreaInsets();
  const {
    isLoading,
    error,
    refreshing,
    showGuestSignUp,
    showWeightModal,
    setShowGuestSignUp,
    setShowWeightModal,
    fadeAnim,
    userName,
    isGuestMode,
    realStreak,
    healthMetrics,
    wearableConnected,
    realCaloriesBurned,
    currentSteps,
    currentStepsSource,
    actualCaloriesGoal,
    todaysWorkoutInfo,
    todaysData,
    caloriesConsumed,
    workoutMinutes,
    weekCalendarData,
    waterIntakeML,
    waterGoal,
    weightData,
    calculatedMetrics,
    workoutPreferences,
    handleRefresh,
    handleAddWater,
    weightUnit,
    syncHealthData,
    syncFromHealthConnect,
  } = useHomeLogic();

  // Achievement data
  const achievements = useAchievementStore((s) => s.achievements);
  const userAchievements = useAchievementStore((s) => s.userAchievements);
  const achievementItems = React.useMemo(
    () => buildAchievementViewModels(achievements, userAchievements),
    [achievements, userAchievements]
  );
  const achievementPreview = React.useMemo(() => achievementItems.slice(0, 6), [achievementItems]);
  const totalBadges = React.useMemo(
    () => achievementItems.filter((achievement) => achievement.completed).length,
    [achievementItems]
  );

  // --- useCallback: child component prop callbacks ---
  const handleGuestBack = useCallback(() => setShowGuestSignUp(false), []);
  const handleGuestSignUpSuccess = useCallback(() => setShowGuestSignUp(false), []);
  const handleProfilePress = useCallback(() => onNavigateToTab?.('profile'), [onNavigateToTab]);
  const handleNotificationPress = useCallback(
    () => onNavigateToTab?.('profile', { settingsScreen: 'notifications' }),
    [onNavigateToTab]
  );
  const handleStreakPress = useCallback(() => onNavigateToTab?.('achievements'), [onNavigateToTab]);
  const handleMotivationPress = useCallback(() => onNavigateToTab?.('analytics'), [onNavigateToTab]);
  const handleGuestSignUpPress = useCallback(() => setShowGuestSignUp(true), []);
  const handleHealthHubPress = useCallback(() => onNavigateToTab?.('analytics'), [onNavigateToTab]);
  const handleRingsPress = useCallback(() => onNavigateToTab?.('analytics'), [onNavigateToTab]);
  const handleLogMealPress = useCallback(
    () => onNavigateToTab?.('diet', { openLogMeal: true }),
    [onNavigateToTab]
  );
  const handleWorkoutPress = useCallback(() => onNavigateToTab?.('fitness'), [onNavigateToTab]);
  const handleHydrationPress = useCallback(
    () => onNavigateToTab?.('diet', { openWaterModal: true }),
    [onNavigateToTab]
  );
  const handleBodyProgressPress = useCallback(() => onNavigateToTab?.('progress'), [onNavigateToTab]);
  const handleLogWeight = useCallback(() => setShowWeightModal(true), []);
  const handleViewAllAchievements = useCallback(() => onNavigateToTab?.('achievements'), [onNavigateToTab]);
  const handlePlanWorkout = useCallback(() => onNavigateToTab?.('fitness'), [onNavigateToTab]);
  const handleDayPress = useCallback(
    (date: Date) => {
      const dayName = getLocalDayName(date);
      if (DAY_NAMES.includes(dayName as DayName)) {
        setSelectedDay(dayName as DayName);
      }
      onNavigateToTab?.('fitness');
    },
    [setSelectedDay, onNavigateToTab]
  );
  const handleViewFullCalendar = useCallback(() => onNavigateToTab?.('fitness'), [onNavigateToTab]);
  const handleWeightModalClose = useCallback(() => setShowWeightModal(false), []);
  const handleWeightModalSuccess = useCallback(() => {
    setShowWeightModal(false);
    handleRefresh();
  }, [handleRefresh]);

  const quickActions = React.useMemo(
    () =>
      createQuickActions({
        isHealthKitAuthorized: healthMetrics?.sources ? true : false,
        isHealthConnectAuthorized: healthMetrics?.sources ? true : false,
        syncHealthData:
          Platform.OS === 'web'
            ? async () => {
                crossPlatformAlert(
                  'Health Sync',
                  'Health sync is only available on iOS/Android. Open the app on your phone to sync.'
                );
              }
            : syncHealthData,
        syncFromHealthConnect:
          Platform.OS === 'web'
            ? async () => {
                crossPlatformAlert(
                  'Health Sync',
                  'Health sync is only available on iOS/Android. Open the app on your phone to sync.'
                );
              }
            : async (days: number) => {
                await syncFromHealthConnect(days);
              },
        onLogWeight: () => setShowWeightModal(true),
        onScanFood: () => onNavigateToTab?.('diet', { openScanFood: true }),
        onLogMeal: () => onNavigateToTab?.('diet', { openLogMeal: true }),
        onLogWater: () => onNavigateToTab?.('diet', { openWaterModal: true }),
        onBarcodeScan: () => onNavigateToTab?.('diet', { openBarcodeOptions: true }),
        onScanLabel: () => onNavigateToTab?.('diet', { openLabelScanPrep: true }),
        onRecipes: () => onNavigateToTab?.('diet', { openCreateRecipe: true }),
      }),
    [healthMetrics, setShowWeightModal, onNavigateToTab, syncHealthData, syncFromHealthConnect]
  );

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={handleGuestBack}
        onSignUpSuccess={handleGuestSignUpSuccess}
      />
    );
  }

  if (isLoading) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <AuroraSpinner size="lg" />
        </View>
      </AuroraBackground>
    );
  }

  return (
    <>
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
                userName={userName} // SSOT: from profileStore via useHomeLogic
                userInitial={userName.charAt(0)}
                streak={realStreak}
                onProfilePress={handleProfilePress}
                onNotificationPress={handleNotificationPress}
                onStreakPress={handleStreakPress}
              />

              {/* Error Banner */}
              {error && <ErrorBanner error={error} onRetry={handleRefresh} />}

              {/* 2. Motivation Banner */}
              <View style={styles.section}>
                <MotivationBanner onPress={handleMotivationPress} />
              </View>

              {/* Guest Banner */}
              {isGuestMode && (
                <View style={styles.section}>
                  <GuestPromptBanner onSignUpPress={handleGuestSignUpPress} />
                </View>
              )}

              {/* 3. Health Intelligence Hub - PREMIUM */}
              <View style={styles.section}>
                <HealthIntelligenceHub
                  sleepHours={healthMetrics?.sleepHours}
                  sleepQuality={healthMetrics?.sleepQuality} // NO FALLBACK - single source
                  restingHeartRate={healthMetrics?.restingHeartRate}
                  hrTrend={
                    healthMetrics?.restingHeartRate && healthMetrics.restingHeartRate < 65
                      ? 'down'
                      : 'stable'
                  }
                  steps={healthMetrics?.steps}
                  stepsGoal={healthMetrics?.stepsGoal} // NO HARDCODED - from healthDataStore
                  activeCalories={healthMetrics?.activeCalories} // NO FALLBACK - single source
                  onPress={handleHealthHubPress}
                  onDetailPress={handleHealthHubPress}
                />
              </View>

              {/* 4. Daily Progress Rings */}
              <View style={styles.section}>
                <DailyProgressRings
                  caloriesBurned={realCaloriesBurned}
                  caloriesGoal={
                    // Active calorie goal = TDEE - BMR (calories from activity only, not resting metabolism).
                    // Using full TDEE as a Move goal is unachievable since BMR accounts for most of it.
                    (calculatedMetrics?.calculatedTDEE && calculatedMetrics?.calculatedBMR)
                      ? Math.round(calculatedMetrics.calculatedTDEE - calculatedMetrics.calculatedBMR)
                      : actualCaloriesGoal
                  }
                  workoutMinutes={workoutMinutes}
                  workoutGoal={
                    // Single source of truth: today's actual scheduled workout duration.
                    // Falls back to live profileStore preference, then AI recommendation, then 30 min.
                    todaysWorkoutInfo.workout?.duration ||
                    workoutPreferences?.time_preference ||
                    calculatedMetrics?.workoutDurationMinutes ||
                    calculatedMetrics?.recommendedCardioMinutes ||
                    30
                  }
                  mealsLogged={caloriesConsumed}
                  mealsGoal={calculatedMetrics?.dailyCalories ?? actualCaloriesGoal} // Intake target for nutrition goal
                  steps={currentSteps} // Only use wearable steps when the synced snapshot is from today
                  stepsGoal={healthMetrics?.stepsGoal ?? 10000} // Default 10k steps if not set
                  stepsSource={currentStepsSource} // Hide stale source attribution with stale metrics
                  onPress={handleRingsPress}
                />
                <EmptyMealsMessage
                  mealsLogged={caloriesConsumed}
                  onLogMeal={handleLogMealPress}
                />
                {/* Wearable Sync Status */}
                {wearableConnected && (
                  <View style={{ marginTop: ResponsiveTheme.spacing.sm }}>
                    <SyncStatusIndicator />
                  </View>
                )}
              </View>

              {/* 5. Today's Workout */}
              <View style={styles.section}>
                <TodaysFocus
                  workoutInfo={{
                    hasWeeklyPlan: todaysWorkoutInfo.hasWeeklyPlan,
                    isRestDay: todaysWorkoutInfo.isRestDay,
                    isCompleted: todaysWorkoutInfo.isCompleted,
                    hasWorkout: todaysWorkoutInfo.hasWorkout,
                    dayStatus: todaysWorkoutInfo.dayStatus,
                    workoutType: (() => {
                      const t = todaysWorkoutInfo.workoutType;
                      if (
                        t === 'strength' ||
                        t === 'cardio' ||
                        t === 'flexibility' ||
                        t === 'hiit' ||
                        t === 'mixed'
                      )
                        return t;
                      return undefined;
                    })(),
                    workout: todaysWorkoutInfo.workout
                      ? {
                          title: todaysWorkoutInfo.workout.title ?? '',
                          duration: todaysWorkoutInfo.workout.duration ?? 0,
                          estimatedCalories: todaysWorkoutInfo.workout.estimatedCalories ?? 0,
                          exercises: todaysWorkoutInfo.workout.exercises?.length,
                        }
                      : undefined,
                  }}
                  workoutProgress={todaysData?.progress?.workoutProgress} // NO FALLBACK
                  onWorkoutPress={handleWorkoutPress}
                />
              </View>
              {/* 6. Quick Actions - Unique utilities */}
              <View style={styles.quickActionsSection}>
                <QuickActions actions={quickActions} />
              </View>

              {/* 7. Hydration Tracker - PREMIUM (uses hydrationStore) */}
              <View style={styles.section}>
                <HydrationTracker
                  currentIntake={waterIntakeML}
                  dailyGoal={waterGoal ?? 0}
                  onAddWater={handleAddWater}
                  onPress={handleHydrationPress}
                />
              </View>

              {/* 9. Body Progress - PREMIUM */}
              <View style={styles.section}>
                <BodyProgressCard
                  currentWeight={weightData.currentWeight}
                  goalWeight={weightData.goalWeight}
                  startingWeight={weightData.startingWeight}
                  weightHistory={weightData.weightHistory}
                  unit={weightUnit}
                  onPress={handleBodyProgressPress}
                  onLogWeight={handleLogWeight}
                />
              </View>

              {/* 10. Achievements */}
              <View style={styles.section}>
                <AchievementShowcase
                  achievements={achievementPreview}
                  totalBadges={totalBadges}
                  totalAchievements={achievementItems.length}
                  onViewAll={handleViewAllAchievements}
                  onAchievementPress={handleViewAllAchievements}
                />
              </View>

              <View style={styles.section}>
                <EmptyCalendarMessage
                  weekCalendarData={weekCalendarData}
                  onPlanWorkout={handlePlanWorkout}
                />
                {weekCalendarData && !weekCalendarData.every((d) => !d.hasWorkout) && (
                  <WeeklyMiniCalendar
                    weekData={weekCalendarData}
                    onDayPress={handleDayPress}
                    onViewFullCalendar={handleViewFullCalendar}
                  />
                )}
              </View>

              {/* Bottom Spacing */}
              <View style={{ height: insets.bottom + rh(100) }} />
            </Animated.ScrollView>
          </Animated.View>
        </SafeAreaView>
      </AuroraBackground>

      {/* Weight Entry Modal */}
      <WeightEntryModal
        visible={showWeightModal}
        onClose={handleWeightModalClose}
        currentWeight={weightData.currentWeight}
        unit={weightUnit}
        onSuccess={handleWeightModalSuccess}
      />
    </>
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
    paddingBottom: rh(120),
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
