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

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { haptics } from "../../utils/haptics";
import { ResponsiveTheme } from "../../utils/constants";
import { rh } from "../../utils/responsive";
import { useDashboardIntegration } from "../../utils/integration";
import { useAuth } from "../../hooks/useAuth";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import DataRetrievalService from "../../services/dataRetrieval";
import {
  useFitnessStore,
  useNutritionStore,
  useAchievementStore,
  useHealthDataStore,
  useAnalyticsStore,
  useSubscriptionStore,
  useUserStore,
  useHydrationStore,
} from "../../stores";
import { GuestSignUpScreen } from "./GuestSignUpScreen";
import { Ionicons } from "@expo/vector-icons";

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
  SyncStatusIndicator,
} from "./home";
import { completionTrackingService } from "../../services/completionTracking";

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
  const {
    loadData: loadNutritionData,
    dailyMeals,
    weeklyMealPlan,
  } = useNutritionStore();
  const { currentStreak: achievementStreak } = useAchievementStore();
  const {
    metrics: healthMetrics,
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    initializeHealthKit,
    syncHealthData,
    initializeHealthConnect,
    syncFromHealthConnect,
    settings: healthSettings,
  } = useHealthDataStore();
  const {
    isInitialized: analyticsInitialized,
    initialize: initializeAnalytics,
    refreshAnalytics,
  } = useAnalyticsStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [todaysData, setTodaysData] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // HYDRATION - Single Source of Truth from hydrationStore
  const {
    waterIntakeML,
    dailyGoalML: waterGoal,
    addWater: hydrationAddWater,
    setDailyGoal: setHydrationGoal,
    checkAndResetIfNewDay,
  } = useHydrationStore();

  // Get calculated metrics for initializing hydration goal
  const { metrics: calculatedMetrics, hasCalculatedMetrics } =
    useCalculatedMetrics();

  // Sync hydration goal from calculated metrics on mount
  useEffect(() => {
    if (calculatedMetrics?.dailyWaterML) {
      setHydrationGoal(calculatedMetrics.dailyWaterML);
    }
    // Check for daily reset
    checkAndResetIfNewDay();
  }, [calculatedMetrics?.dailyWaterML]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        await DataRetrievalService.loadAllData();
        setTodaysData(DataRetrievalService.getTodaysData());
        setWeeklyProgress(DataRetrievalService.getWeeklyProgress());

        // Auto-sync health data from wearables on app launch
        if (Platform.OS === "ios" && healthSettings.healthKitEnabled) {
          if (isHealthKitAuthorized) {
            console.log("[HEALTH] Auto-syncing from HealthKit...");
            syncHealthData();
          } else {
            console.log("[HEALTH] Initializing HealthKit...");
            initializeHealthKit();
          }
        } else if (
          Platform.OS === "android" &&
          healthSettings.healthConnectEnabled
        ) {
          if (isHealthConnectAuthorized) {
            console.log(
              "[HEALTH] Auto-syncing from Health Connect (7 days)...",
            );
            syncFromHealthConnect(7);
          } else {
            console.log("[HEALTH] Initializing Health Connect...");
            initializeHealthConnect();
          }
        }

        analyticsInitialized ? refreshAnalytics() : initializeAnalytics();
        initializeSubscription();
      } catch (err) {
        console.error("Load error:", err);
      }
    };

    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Subscribe to completion events for real-time UI updates
    // This ensures HomeScreen refreshes when workouts/meals are completed on other screens
    console.log("[EVENT] HomeScreen: Setting up completion event listener");
    const unsubscribe = completionTrackingService.subscribe((event) => {
      console.log("[EVENT] HomeScreen: Received completion event:", event);
      // Refresh data when completion events occur
      setTodaysData(DataRetrievalService.getTodaysData());
      setWeeklyProgress(DataRetrievalService.getWeeklyProgress());
    });

    return () => {
      console.log("[EVENT] HomeScreen: Unsubscribing from completion events");
      unsubscribe();
    };
  }, []);

  // Memoized values
  const userStats = useMemo(() => getUserStats() || {}, [getUserStats]);
  // Combine app-tracked calories with wearable calories (use wearable as primary if connected)
  const appCaloriesBurned = useMemo(
    () => DataRetrievalService.getTotalCaloriesBurned(),
    [todaysData],
  );
  const wearableConnected = isHealthKitAuthorized || isHealthConnectAuthorized;
  const realCaloriesBurned = useMemo(() => {
    // Google Fit writes its "Cal" value to TotalCaloriesBurned in Health Connect
    // ActiveCaloriesBurned is often empty/0 as most apps don't write to it separately
    if (wearableConnected) {
      // Use totalCalories first (this is what Google Fit's "Cal" actually is)
      if (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0) {
        return healthMetrics.totalCalories;
      }
      // Fall back to activeCalories if available
      if (healthMetrics?.activeCalories && healthMetrics.activeCalories > 0) {
        return healthMetrics.activeCalories;
      }
    }
    return appCaloriesBurned;
  }, [
    wearableConnected,
    healthMetrics?.totalCalories,
    healthMetrics?.activeCalories,
    appCaloriesBurned,
  ]);

  // Calculate actual calories goal - use healthMetrics goal or fall back to TDEE from onboarding
  const actualCaloriesGoal = useMemo(() => {
    // Priority: healthMetrics.caloriesGoal > calculatedMetrics.calculatedTDEE > calculatedMetrics.dailyCalories > 0
    if (healthMetrics?.caloriesGoal && healthMetrics.caloriesGoal > 0) {
      return healthMetrics.caloriesGoal;
    }
    if (
      calculatedMetrics?.calculatedTDEE &&
      calculatedMetrics.calculatedTDEE > 0
    ) {
      return calculatedMetrics.calculatedTDEE;
    }
    if (
      calculatedMetrics?.dailyCalories &&
      calculatedMetrics.dailyCalories > 0
    ) {
      return calculatedMetrics.dailyCalories;
    }
    return 0; // No fallback - show 0 if no goal available
  }, [
    healthMetrics?.caloriesGoal,
    calculatedMetrics?.calculatedTDEE,
    calculatedMetrics?.dailyCalories,
  ]);
  // SINGLE SOURCE OF TRUTH: achievementStore.currentStreak - NO FALLBACK CHAIN
  const realStreak = achievementStreak;
  const todaysWorkoutInfo = useMemo(
    () => DataRetrievalService.getTodaysWorkoutForHome(),
    [todaysData],
  );

  // User age for heart rate zones
  const userAge = useMemo(() => {
    return profile?.personalInfo?.age; // NO FALLBACK - single source of truth
  }, [profile]);

  // Weight data for body progress - use calculatedMetrics from onboarding
  const weightData = useMemo(() => {
    // SINGLE SOURCE - profileStore.bodyMetrics is the truth
    const currentWeight = profile?.bodyMetrics?.current_weight_kg;
    const goalWeight = profile?.bodyMetrics?.target_weight_kg;
    const startingWeight =
      profile?.bodyMetrics?.current_weight_kg ?? currentWeight;

    return {
      currentWeight,
      goalWeight,
      startingWeight,
      // NO MOCK DATA - only show weight history if real data exists
      // In production, this would come from a dedicated weight tracking store
      weightHistory: currentWeight
        ? [
            {
              date: new Date().toISOString().split("T")[0],
              weight: currentWeight,
            },
          ]
        : [],
    };
  }, [healthMetrics, userProfile, calculatedMetrics]);

  // Meal count
  const mealsLogged = useMemo(() => {
    const today = new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const todaysMeals =
      weeklyMealPlan?.meals?.filter(
        (m: any) => m.dayOfWeek?.toLowerCase() === today,
      ) ||
      dailyMeals ||
      [];
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
      if (Platform.OS === "ios" && isHealthKitAuthorized) {
        await syncHealthData(true);
      } else if (Platform.OS === "android" && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadFitnessData,
    loadNutritionData,
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    syncHealthData,
    syncFromHealthConnect,
  ]);

  // Handle water intake - Uses hydrationStore (single source of truth)
  const handleAddWater = useCallback(
    (amount: number) => {
      haptics.medium();
      hydrationAddWater(amount); // Store handles capping at 150% of goal
    },
    [hydrationAddWater],
  );

  // Quick actions (no redundant badges)
  // Quick Actions - Unique actions NOT in navigation bar
  const quickActions = useMemo(
    () => [
      {
        id: "log-weight",
        label: "Log Weight",
        icon: "scale-outline" as keyof typeof Ionicons.glyphMap,
        color: "#9C27B0",
        onPress: () => Alert.alert("Log Weight", "Add your current weight"),
      },
      {
        id: "progress-photo",
        label: "Photo",
        icon: "camera-outline" as keyof typeof Ionicons.glyphMap,
        color: "#FF6B6B",
        onPress: () =>
          Alert.alert("Progress Photo", "Take or view progress photos"),
      },
      {
        id: "log-sleep",
        label: "Sleep",
        icon: "moon-outline" as keyof typeof Ionicons.glyphMap,
        color: "#667eea",
        onPress: () => Alert.alert("Log Sleep", "Track your sleep quality"),
      },
      {
        id: "health-sync",
        label: "Sync",
        icon: "sync-outline" as keyof typeof Ionicons.glyphMap,
        color: "#4CAF50",
        onPress: async () => {
          haptics.medium();
          if (Platform.OS === "ios" && isHealthKitAuthorized) {
            await syncHealthData(true);
            Alert.alert("Synced", "Health data synced successfully");
          } else if (Platform.OS === "android" && isHealthConnectAuthorized) {
            await syncFromHealthConnect(7);
            Alert.alert("Synced", "Health data synced successfully");
          } else {
            Alert.alert("Health Sync", "Connect to Health app in settings");
          }
        },
      },
    ],
    [
      isHealthKitAuthorized,
      isHealthConnectAuthorized,
      syncHealthData,
      syncFromHealthConnect,
    ],
  );

  // Weekly calendar data
  const weekCalendarData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = date
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const workout = weeklyWorkoutPlan?.workouts?.find(
        (w: any) => w.dayOfWeek?.toLowerCase() === dayName,
      );

      return {
        date,
        hasWorkout: !!workout && !workout.isRestDay,
        workoutCompleted: workout?.completed || false,
        isRestDay: workout?.isRestDay || i === 0,
      };
    });
  }, [weeklyWorkoutPlan]);

  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={() => setShowGuestSignUp(false)}
        onSignUpSuccess={() => setShowGuestSignUp(false)}
      />
    );
  }

  return (
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
                mealsLogged={mealsLogged}
                mealsGoal={calculatedMetrics?.mealsPerDay ?? 3} // Default 3 meals if not set
                steps={healthMetrics?.steps ?? 0} // From Health Connect/HealthKit - TODAY only
                stepsGoal={healthMetrics?.stepsGoal ?? 10000} // Default 10k steps if not set
                stepsSource={healthMetrics?.sources?.steps} // Data source attribution
                onPress={() => onNavigateToTab?.("progress")}
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
                  Alert.alert("Progress Photo", "Take or view progress photos")
                }
                onLogWeight={() =>
                  Alert.alert("Log Weight", "Add weight entry")
                }
              />
            </View>

            {/* 10. Weekly Calendar */}
            <View style={styles.section}>
              <WeeklyMiniCalendar
                weekData={weekCalendarData}
                onViewFullCalendar={() => onNavigateToTab?.("fitness")}
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
