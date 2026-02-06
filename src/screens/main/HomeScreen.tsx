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
  Text,
  StyleSheet,
  Animated,
  Alert,
  RefreshControl,
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
import { useAchievementStore } from "../../stores/achievementStore";

interface HomeScreenProps {
  onNavigateToTab?: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToTab }) => {
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
    profile,
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
  } = useHomeLogic();

  // Achievement data
  const {
    getRecentAchievements,
    getNearlyCompletedAchievements,
    getTotalBadgesEarned,
  } = useAchievementStore();
  const recentAchievements = getRecentAchievements(3);
  const nearlyComplete = getNearlyCompletedAchievements(3);
  const totalBadges = getTotalBadgesEarned();

  const quickActions = React.useMemo(
    () =>
      createQuickActions({
        isHealthKitAuthorized: healthMetrics?.sources ? true : false,
        isHealthConnectAuthorized: healthMetrics?.sources ? true : false,
        syncHealthData: async () => {},
        syncFromHealthConnect: async () => {},
        onLogWeight: () => setShowWeightModal(true),
        onScanFood: () => onNavigateToTab?.("diet"),
        onLogMeal: () => onNavigateToTab?.("diet"),
        onLogWater: () => onNavigateToTab?.("diet"),
      }),
    [healthMetrics, setShowWeightModal, onNavigateToTab],
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
                userName={profile?.personalInfo?.name ?? ""} // NO FALLBACK - single source
                userInitial={profile?.personalInfo?.name?.charAt(0) ?? ""} // NO FALLBACK
                streak={realStreak}
                onProfilePress={() => onNavigateToTab?.("profile")}
                onStreakPress={() =>
                  Alert.alert("Streak", `${realStreak} day streak! Keep going!`)
                }
              />

              {/* Error Banner */}
              {error && <ErrorBanner error={error} onRetry={handleRefresh} />}

              {/* 2. Motivation Banner */}
              <View style={styles.section}>
                <MotivationBanner />
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
                  onPress={() => onNavigateToTab?.("progress")}
                  onDetailPress={(metric) => {
                    if (metric === "heart")
                      Alert.alert("Heart Rate", "Detailed heart rate data");
                    else if (metric === "sleep")
                      Alert.alert("Sleep", "Detailed sleep analysis");
                  }}
                />
              </View>

              {/* 4. Daily Progress Rings */}
              <View style={styles.section}>
                <DailyProgressRings
                  caloriesBurned={realCaloriesBurned}
                  caloriesGoal={actualCaloriesGoal} // From TDEE/healthMetrics - properly calculated
                  workoutMinutes={workoutMinutes}
                  workoutGoal={
                    calculatedMetrics?.workoutDurationMinutes ??
                    calculatedMetrics?.recommendedCardioMinutes ??
                    30
                  } // User's preferred workout duration from onboarding
                  mealsLogged={caloriesConsumed}
                  mealsGoal={actualCaloriesGoal}
                  steps={healthMetrics?.steps ?? 0} // From Health Connect/HealthKit - TODAY only
                  stepsGoal={healthMetrics?.stepsGoal ?? 10000} // Default 10k steps if not set
                  stepsSource={healthMetrics?.sources?.steps} // Data source attribution
                  onPress={() => onNavigateToTab?.("progress")}
                />
                <EmptyMealsMessage mealsLogged={caloriesConsumed} />
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
                  workoutInfo={todaysWorkoutInfo as any}
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
                    Alert.alert("Hydration", "Detailed hydration tracking")
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
                  unit="kg"
                  onPress={() => onNavigateToTab?.("progress")}
                  onPhotoPress={() =>
                    Alert.alert(
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
                  recentAchievements={recentAchievements}
                  nearlyComplete={nearlyComplete}
                  totalBadges={totalBadges}
                  onViewAll={() => onNavigateToTab?.("achievements")}
                  onAchievementPress={(achievement) => {
                    Alert.alert("Achievement", achievement.title);
                  }}
                />
              </View>

              <View style={styles.section}>
                <EmptyCalendarMessage weekCalendarData={weekCalendarData} />
                {weekCalendarData &&
                  !weekCalendarData.every((d) => !d.hasWorkout) && (
                    <WeeklyMiniCalendar
                      weekData={weekCalendarData}
                      onViewFullCalendar={() => onNavigateToTab?.("fitness")}
                    />
                  )}
              </View>

              {/* Bottom Spacing */}
              <View style={{ height: insets.bottom + rh(90) }} />
            </Animated.ScrollView>
          </Animated.View>
        </SafeAreaView>
      </AuroraBackground>

      {/* Weight Entry Modal */}
      <WeightEntryModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        currentWeight={weightData.currentWeight}
        unit="kg"
        onSuccess={() => {
          // Optionally refresh data after successful weight entry
          console.log("Weight entry successful, refreshing data...");
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
