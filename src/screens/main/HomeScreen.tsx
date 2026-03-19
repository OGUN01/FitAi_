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

import React from "react";
import {
  View,
  StyleSheet,
  Animated,
  RefreshControl,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { ResponsiveTheme } from "../../utils/constants";
import { rh } from "../../utils/responsive";
import { GuestSignUpScreen } from "./GuestSignUpScreen";
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
} from "./home";
import { WeightEntryModal } from "../../components/progress/WeightEntryModal";
import { useHomeLogic } from "../../hooks/useHomeLogic";
import { useAppStateStore, type DayName } from "../../stores/appStateStore";
import { useAchievementStore } from "../../stores/achievementStore";
import { buildAchievementViewModels } from "../../utils/achievementViewModel";
import { getLocalDayName } from "../../utils/weekUtils";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
interface HomeScreenProps {
  // eslint-disable-next-line no-unused-vars
  onNavigateToTab?: (tab: string, params?: Record<string, unknown>) => void;
}

const DAY_NAMES: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
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
    userAge,
    healthMetrics,
    wearableConnected,
    realCaloriesBurned,
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
    [achievements, userAchievements],
  );
  const achievementPreview = React.useMemo(
    () => achievementItems.slice(0, 6),
    [achievementItems],
  );
  const totalBadges = React.useMemo(
    () =>
      achievementItems.filter((achievement) => achievement.completed).length,
    [achievementItems],
  );

  const quickActions = React.useMemo(
    () =>
      createQuickActions({
        isHealthKitAuthorized: healthMetrics?.sources ? true : false,
        isHealthConnectAuthorized: healthMetrics?.sources ? true : false,
        syncHealthData:
          Platform.OS === "web"
            ? async () => {
                crossPlatformAlert(
                  "Health Sync",
                  "Health sync is only available on iOS/Android. Open the app on your phone to sync.",
                );
              }
            : syncHealthData,
        syncFromHealthConnect:
          Platform.OS === "web"
            ? async () => {
                crossPlatformAlert(
                  "Health Sync",
                  "Health sync is only available on iOS/Android. Open the app on your phone to sync.",
                );
              }
            : async (days: number) => {
                await syncFromHealthConnect(days);
              },
        onLogWeight: () => setShowWeightModal(true),
        onScanFood: () => onNavigateToTab?.("diet", { openScanFood: true }),
        onLogMeal: () => onNavigateToTab?.("diet", { openLogMeal: true }),
        onLogWater: () => onNavigateToTab?.("diet", { openWaterModal: true }),
        onBarcodeScan: () =>
          onNavigateToTab?.("diet", { openBarcodeOptions: true }),
        onScanLabel: () =>
          onNavigateToTab?.("diet", { openLabelScanPrep: true }),
        onRecipes: () => onNavigateToTab?.("diet", { openCreateRecipe: true }),
      }),
    [
      healthMetrics,
      setShowWeightModal,
      onNavigateToTab,
      syncHealthData,
      syncFromHealthConnect,
    ],
  );

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={() => setShowGuestSignUp(false)}
        onSignUpSuccess={() => setShowGuestSignUp(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <AuroraSpinner size="lg" />
        </View>
      </AuroraBackground>
    );
  }

  return (
    <>
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <Animated.View
            style={[styles.animatedContainer, { opacity: fadeAnim }]}
          >
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
                onProfilePress={() => onNavigateToTab?.("profile")}
                onNotificationPress={() =>
                  crossPlatformAlert("Notifications", "No new notifications")
                }
                onStreakPress={() =>
                  crossPlatformAlert(
                    "Streak",
                    `${realStreak} day streak! Keep going!`,
                  )
                }
              />

              {/* Error Banner */}
              {error && <ErrorBanner error={error} onRetry={handleRefresh} />}

              {/* 2. Motivation Banner */}
              <View style={styles.section}>
                <MotivationBanner
                  onPress={() => onNavigateToTab?.("analytics")}
                />
              </View>

              {/* Guest Banner */}
              {isGuestMode && (
                <View style={styles.section}>
                  <GuestPromptBanner
                    onSignUpPress={() => setShowGuestSignUp(true)}
                  />
                </View>
              )}

              {/* 3. Health Intelligence Hub - PREMIUM */}
              <View style={styles.section}>
                <HealthIntelligenceHub
                  sleepHours={healthMetrics?.sleepHours}
                  sleepQuality={healthMetrics?.sleepQuality} // NO FALLBACK - single source
                  restingHeartRate={healthMetrics?.restingHeartRate}
                  hrTrend={
                    healthMetrics?.restingHeartRate &&
                    healthMetrics.restingHeartRate < 65
                      ? "down"
                      : "stable"
                  }
                  steps={healthMetrics?.steps}
                  stepsGoal={healthMetrics?.stepsGoal} // NO HARDCODED - from healthDataStore
                  activeCalories={healthMetrics?.activeCalories} // NO FALLBACK - single source
                  age={userAge}
                  onPress={() => onNavigateToTab?.("analytics")}
                  onDetailPress={(metric) => {
                    if (metric === "heart")
                      crossPlatformAlert(
                        "Heart Rate",
                        "Detailed heart rate data",
                      );
                    else if (metric === "sleep")
                      crossPlatformAlert("Sleep", "Detailed sleep analysis");
                    else if (metric === "quality")
                      crossPlatformAlert(
                        "Sleep Quality",
                        "Sleep quality reflects your recovery readiness",
                      );
                  }}
                />
              </View>

              {/* 4. Daily Progress Rings */}
              <View style={styles.section}>
                <DailyProgressRings
                  caloriesBurned={realCaloriesBurned}
                  caloriesGoal={
                    calculatedMetrics?.calculatedTDEE ?? actualCaloriesGoal
                  } // TDEE for burn goal
                  workoutMinutes={workoutMinutes}
                  workoutGoal={
                    // Single source of truth: today's actual scheduled workout duration.
                    // Falls back to onboarding preference, then AI recommendation, then 30 min.
                    todaysWorkoutInfo.workout?.duration ||
                    calculatedMetrics?.workoutDurationMinutes ||
                    calculatedMetrics?.recommendedCardioMinutes ||
                    30
                  }
                  mealsLogged={caloriesConsumed}
                  mealsGoal={
                    calculatedMetrics?.dailyCalories ?? actualCaloriesGoal
                  } // Intake target for nutrition goal
                  steps={healthMetrics?.steps ?? 0} // From Health Connect/HealthKit - TODAY only
                  stepsGoal={healthMetrics?.stepsGoal ?? 10000} // Default 10k steps if not set
                  stepsSource={healthMetrics?.sources?.steps} // Data source attribution
                  onPress={() => onNavigateToTab?.("analytics")}
                />
                <EmptyMealsMessage
                  mealsLogged={caloriesConsumed}
                  onLogMeal={() =>
                    onNavigateToTab?.("diet", { openLogMeal: true })
                  }
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
                        t === "strength" ||
                        t === "cardio" ||
                        t === "flexibility" ||
                        t === "hiit" ||
                        t === "mixed"
                      )
                        return t;
                      return undefined;
                    })(),
                    workout: todaysWorkoutInfo.workout
                      ? {
                          title: todaysWorkoutInfo.workout.title ?? "",
                          duration: todaysWorkoutInfo.workout.duration ?? 0,
                          estimatedCalories:
                            todaysWorkoutInfo.workout.estimatedCalories ?? 0,
                          exercises:
                            todaysWorkoutInfo.workout.exercises?.length,
                        }
                      : undefined,
                  }}
                  workoutProgress={todaysData?.progress?.workoutProgress} // NO FALLBACK
                  onWorkoutPress={() => onNavigateToTab?.("fitness")}
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
                  onPress={() =>
                    onNavigateToTab?.("diet", { openWaterModal: true })
                  }
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
                  onPress={() => onNavigateToTab?.("progress")}
                  onPhotoPress={() =>
                    crossPlatformAlert(
                      "Progress Photo",
                      "Take or view progress photos",
                    )
                  }
                  onLogWeight={() => setShowWeightModal(true)}
                />
              </View>

              {/* 10. Achievements */}
              <View style={styles.section}>
                <AchievementShowcase
                  achievements={achievementPreview}
                  totalBadges={totalBadges}
                  totalAchievements={achievementItems.length}
                  onViewAll={() => onNavigateToTab?.("achievements")}
                  onAchievementPress={(achievement) => {
                    crossPlatformAlert("Achievement", achievement.title);
                  }}
                />
              </View>

              <View style={styles.section}>
                <EmptyCalendarMessage
                  weekCalendarData={weekCalendarData}
                  onPlanWorkout={() => onNavigateToTab?.("fitness")}
                />
                {weekCalendarData &&
                  !weekCalendarData.every((d) => !d.hasWorkout) && (
                    <WeeklyMiniCalendar
                      weekData={weekCalendarData}
                      onDayPress={(date) => {
                        const dayName = getLocalDayName(date);
                        if (DAY_NAMES.includes(dayName as DayName)) {
                          setSelectedDay(dayName as DayName);
                        }
                        onNavigateToTab?.("fitness");
                      }}
                      onViewFullCalendar={() => onNavigateToTab?.("fitness")}
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
        onClose={() => setShowWeightModal(false)}
        currentWeight={weightData.currentWeight}
        unit={weightUnit}
        onSuccess={() => {
          setShowWeightModal(false);
          handleRefresh();
        }}
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
