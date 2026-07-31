/**
 * HomeScreen - World-Class Fitness Dashboard
 *
 * PREMIUM FEATURES:
 * - Health Intelligence Hub (Recovery Score, HR, Sleep)
 * - Body Progress (Weight trend & goal countdown)
 *
 * Layout Order:
 * 1. Header (greeting, streak)
 * 2. TodayHero (coach line + workout CTA)
 * 3. Daily Progress Rings (Move/Exercise/Meals/Steps)
 * 4. Health Intelligence Hub (recovery, vitals)
 * 5. Quick Actions
 * 6. Body Progress
 * 7. Weekly Calendar
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { colors, spacing } from '../../theme/aurora-tokens';
import { rh, rp } from '../../utils/responsive';
import { GuestSignUpScreen } from './GuestSignUpScreen';
import {
  HomeHeader,
  GuestPromptBanner,
  TodayHero,
  DailyProgressRings,
  QuickActions,
  WeeklyMiniCalendar,
  HealthIntelligenceHub,
  BodyProgressCard,
  SyncStatusIndicator,
  ErrorBanner,
  EmptyMealsMessage,
  EmptyCalendarMessage,
  createQuickActions,
  HomeSkeleton,
} from './home';
import { WeightEntryModal } from '../../components/progress/WeightEntryModal';
import { useHomeLogic } from '../../hooks/useHomeLogic';
import { useHealthIntelligenceLogic } from '../../hooks/useHealthIntelligenceLogic';
import { useAppStateStore, type DayName } from '../../stores/appStateStore';
import { getLocalDayName } from '../../utils/weekUtils';

interface HomeScreenProps {
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
    todaysWorkoutInfo,
    todaysData,
    caloriesConsumed,
    workoutMinutes,
    weekCalendarData,
    weightData,
    calculatedMetrics,
    workoutPreferences,
    handleRefresh,
    weightUnit,
  } = useHomeLogic();

  // --- useCallback: child component prop callbacks ---
  const handleGuestBack = useCallback(() => setShowGuestSignUp(false), []);
  const handleGuestSignUpSuccess = useCallback(() => setShowGuestSignUp(false), []);
  const handleProfilePress = useCallback(() => onNavigateToTab?.('profile'), [onNavigateToTab]);
  const handleStreakPress = useCallback(() => onNavigateToTab?.('achievements'), [onNavigateToTab]);
  const handleGuestSignUpPress = useCallback(() => setShowGuestSignUp(true), []);
  const handleHealthHubPress = useCallback(() => onNavigateToTab?.('analytics'), [onNavigateToTab]);
  // The no-data placeholder's "Connect Health Data" CTA must land where a user
  // can actually connect — the wearable connection settings screen — not the
  // analytics tab (which has no connect affordance). ProfileScreen consumes
  // route.params.settingsScreen and opens that settings screen directly.
  const handleConnectHealthPress = useCallback(
    () => onNavigateToTab?.('profile', { settingsScreen: 'wearables' }),
    [onNavigateToTab]
  );
  const handleRingsPress = useCallback(() => onNavigateToTab?.('analytics'), [onNavigateToTab]);
  const handleLogMealPress = useCallback(
    () => onNavigateToTab?.('diet', { openLogMeal: true }),
    [onNavigateToTab]
  );
  const handleWorkoutPress = useCallback(() => onNavigateToTab?.('fitness'), [onNavigateToTab]);
  const handleBodyProgressPress = useCallback(
    () => onNavigateToTab?.('progress'),
    [onNavigateToTab]
  );
  const handleLogWeight = useCallback(() => setShowWeightModal(true), []);
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
        onLogWeight: () => setShowWeightModal(true),
        onLogMeal: () => onNavigateToTab?.('diet', { openLogMeal: true }),
        onLogWater: () => onNavigateToTab?.('diet', { openWaterModal: true }),
        onBarcodeScan: () => onNavigateToTab?.('diet', { openBarcodeOptions: true }),
        onScanLabel: () => onNavigateToTab?.('diet', { openLabelScanPrep: true }),
      }),
    [setShowWeightModal, onNavigateToTab]
  );

  // Reanimated entrance fade — shared value driven from useHomeLogic.
  // NOTE: This hook MUST run before ALL early returns below (showGuestSignUp,
  // isLoading). React requires hooks unconditionally + same order every render.
  // Calling useAnimatedStyle after an early return caused "Rendered more hooks
  // than during the previous render" when showGuestSignUp or isLoading flipped
  // → hook count mismatch → HomeScreen crash for every logged-in user.
  // See src/docs/VERIFIED-FINDINGS.md "P0-4". Regression-guarded by
  // src/__tests__/screens/HomeScreen.hookInvariant.test.tsx.
  // TodayHero workout info — flat shape matching TodayHeroProps.workoutInfo.
  // Replaces the prior TodaysFocus memo (TodaysFocus card is dropped; TodayHero
  // owns the workout CTA now). workoutType narrowed to TodayHero's strict union.
  const todayHeroWorkoutInfo = React.useMemo(() => {
    const t = todaysWorkoutInfo.workoutType;
    const mappedType: 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'mixed' | undefined =
      t === 'strength' || t === 'cardio' || t === 'flexibility' || t === 'hiit' || t === 'mixed'
        ? t
        : undefined;
    return {
      hasWeeklyPlan: todaysWorkoutInfo.hasWeeklyPlan,
      isRestDay: todaysWorkoutInfo.isRestDay,
      isCompleted: todaysWorkoutInfo.isCompleted,
      hasWorkout: todaysWorkoutInfo.hasWorkout,
      workoutType: mappedType,
      workoutTitle: todaysWorkoutInfo.workout?.title,
      duration: todaysWorkoutInfo.workout?.duration,
      exerciseCount: todaysWorkoutInfo.workout?.exercises?.length,
      estimatedCalories: todaysWorkoutInfo.workout?.estimatedCalories,
    };
  }, [todaysWorkoutInfo]);

  // Coach insight + recovery color for TodayHero. Same hook HealthIntelligenceHub
  // uses (pure derived memo, cheap). When no wearable data, returns a graceful
  // placeholder insight + muted color — TodayHero still reads meaningfully.
  const {
    insightText: heroInsightText,
    recoveryColor: heroRecoveryColor,
    hasRealData: hasRealHealthData,
  } = useHealthIntelligenceLogic({
    sleepHours: healthMetrics?.sleepHours,
    sleepQuality: healthMetrics?.sleepQuality,
    restingHeartRate: healthMetrics?.restingHeartRate,
    steps: currentSteps,
    stepsGoal: healthMetrics?.stepsGoal,
    activeCalories: healthMetrics?.activeCalories,
  });

  // TodayHero coach line. When real wearable data exists, use the recovery
  // insight (it's personalized + true). When no data, the hook's fallback reads
  // as a sync chore — replace with a warm, CTA-tied welcome instead so the first
  // impression is an invitation, not a demand. No name prefix here — the header
  // directly above already greets the user by name.
  const heroInsightLine = React.useMemo(() => {
    if (hasRealHealthData) return heroInsightText;
    if (!todaysWorkoutInfo.hasWeeklyPlan)
      return 'Your personalized plan is one tap away. Let’s make today count.';
    if (todaysWorkoutInfo.isRestDay)
      return 'Rest day. Recovery is where the growth happens — take it easy today.';
    if (todaysWorkoutInfo.isCompleted)
      return 'Workout done. Momentum is on your side — soak it in.';
    if (todaysWorkoutInfo.hasWorkout) return 'Today’s workout is ready. Small start, big payoff.';
    return 'Let’s pick up where you left off.';
  }, [hasRealHealthData, heroInsightText, todaysWorkoutInfo]);

  // Insight accent dot only when the line is a real recovery insight (colored);
  // for the warm welcome fallbacks, no dot — keep it pure typography.
  const heroInsightDotColor = hasRealHealthData ? heroRecoveryColor : undefined;

  // Context-bar day label: workout type or rest, appended to the date.
  const dayLabel = React.useMemo(() => {
    if (!todaysWorkoutInfo.hasWeeklyPlan) return undefined;
    if (todaysWorkoutInfo.isRestDay) return 'Rest Day';
    if (!todaysWorkoutInfo.hasWorkout) return undefined;
    const t = todaysWorkoutInfo.workoutType;
    if (t === 'none' || t === 'rest' || t === 'workout') return 'Workout Day';
    return `${t[0].toUpperCase()}${t.slice(1)} Day`;
  }, [todaysWorkoutInfo]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen onBack={handleGuestBack} onSignUpSuccess={handleGuestSignUpSuccess} />
    );
  }

  if (isLoading) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <Animated.ScrollView contentContainerStyle={{ paddingTop: insets.top + rp(8) }}>
            <HomeSkeleton />
          </Animated.ScrollView>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <>
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <Animated.View style={[styles.animatedContainer, fadeStyle]}>
            <Animated.ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary.DEFAULT}
                  colors={[colors.primary.DEFAULT]}
                />
              }
            >
              {/* 1. Context Bar */}
              <HomeHeader
                userName={userName} // SSOT: from profileStore via useHomeLogic
                userInitial={userName.charAt(0)}
                streak={realStreak}
                onProfilePress={handleProfilePress}
                onStreakPress={handleStreakPress}
                dayLabel={dayLabel} // contextual: "Strength Day" / "Rest Day" / undefined
              />

              {/* Error Banner */}
              {error && <ErrorBanner error={error} onRetry={handleRefresh} />}

              {/* TodayHero — flat editorial hook + the single solid CTA */}
              <TodayHero
                insightText={heroInsightLine}
                insightColor={heroInsightDotColor}
                workoutInfo={todayHeroWorkoutInfo}
                workoutProgress={todaysData?.progress?.workoutProgress}
                onPress={handleWorkoutPress}
              />

              {/* Guest Banner */}
              {isGuestMode && (
                <View style={styles.section}>
                  <GuestPromptBanner onSignUpPress={handleGuestSignUpPress} />
                </View>
              )}

              {/* 2. Daily Progress Rings — premium hero */}
              <View style={styles.ringsSection}>
                <DailyProgressRings
                  caloriesBurned={realCaloriesBurned}
                  caloriesGoal={
                    // Active calorie goal = TDEE - BMR (calories from activity only, not resting metabolism).
                    // Using full TDEE as a Move goal is unachievable since BMR accounts for most of it.
                    // No hardcoded fallback — 0 reveals missing data.
                    calculatedMetrics?.calculatedTDEE && calculatedMetrics?.calculatedBMR
                      ? Math.round(
                          calculatedMetrics.calculatedTDEE - calculatedMetrics.calculatedBMR
                        )
                      : 0
                  }
                  workoutMinutes={workoutMinutes}
                  workoutGoal={
                    // Single source of truth: today's actual scheduled workout duration,
                    // then profileStore preference, then calculated metric. No hardcoded fallback.
                    todaysWorkoutInfo.workout?.duration ??
                    workoutPreferences?.time_preference ??
                    calculatedMetrics?.workoutDurationMinutes ??
                    calculatedMetrics?.recommendedCardioMinutes ??
                    0
                  }
                  mealsLogged={caloriesConsumed}
                  mealsGoal={calculatedMetrics?.dailyCalories ?? 0} // Intake target for nutrition goal — no fallback
                  steps={currentSteps} // Only use wearable steps when the synced snapshot is from today
                  stepsGoal={healthMetrics?.stepsGoal ?? 0} // No hardcoded fallback - 0 reveals missing data
                  onPress={handleRingsPress}
                />
                <EmptyMealsMessage mealsLogged={caloriesConsumed} onLogMeal={handleLogMealPress} />
                {/* Wearable Sync Status */}
                {wearableConnected && (
                  <View style={{ marginTop: rp(spacing.sm) }}>
                    <SyncStatusIndicator />
                  </View>
                )}
              </View>

              {/* 3. Health Intelligence — minimalist companion (paired tight below rings) */}
              <View style={styles.pairSection}>
                <HealthIntelligenceHub
                  sleepHours={healthMetrics?.sleepHours}
                  sleepQuality={healthMetrics?.sleepQuality} // NO FALLBACK - single source
                  restingHeartRate={healthMetrics?.restingHeartRate}
                  // No real trend available from a single snapshot — omit hrTrend
                  // so MetricItem doesn't render a misleading trend arrow based
                  // on a <65 bpm threshold masquerading as "trending down".
                  steps={currentSteps} // Freshness-gated (today's synced snapshot only)
                  stepsGoal={healthMetrics?.stepsGoal} // NO HARDCODED - from healthDataStore
                  activeCalories={healthMetrics?.activeCalories} // NO FALLBACK - single source
                  onPress={handleHealthHubPress}
                  onConnectPress={handleConnectHealthPress}
                  // All per-metric detail taps route to the same analytics tab —
                  // omitted onDetailPress so individual metric taps don't imply
                  // distinct destinations.
                />
              </View>

              {/* 4. Quick Log Row */}
              <View style={styles.quickActionsSection}>
                <QuickActions actions={quickActions} />
              </View>

              {/* 6. Body Progress */}
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

              {/* 7. Week Strip */}
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
    backgroundColor: colors.background.DEFAULT,
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
    paddingHorizontal: rp(spacing.md),
    marginBottom: rp(spacing.md),
  },
  // ringsSection — tight gap below Rings so Rings + Health Intelligence read
  // as a pair, not two strangers. Uses sm (8) instead of md (16) between them.
  ringsSection: {
    paddingHorizontal: rp(spacing.md),
    marginBottom: rp(spacing.sm),
  },
  // pairSection — standard md (16) gap below the hub so it doesn't crowd the
  // quick-action row; the tight sm (8) pair gap lives on ringsSection above.
  pairSection: {
    paddingHorizontal: rp(spacing.md),
    marginBottom: rp(spacing.md),
  },
  quickActionsSection: {
    marginBottom: rp(spacing.md),
  },
});

export default HomeScreen;
