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

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { EmptyState } from "../../components/ui/aurora/EmptyState";
import { GlassButton } from "../../components/ui/aurora/GlassButton";
import { colors, surface, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { hexToRgba } from "../../utils/colors";

// Subscription gate
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { usePaywall } from "../../hooks/usePaywall";
import PaywallModal from "../../components/subscription/PaywallModal";

// Stores
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { useFitnessStore } from "../../stores/fitnessStore";
import { useAuthStore } from "../../stores/authStore";
import { useProfileStore } from "../../stores/profileStore";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { analyticsDataService } from "../../services/analyticsData";
import { resolveCurrentWeight } from "../../services/currentWeight";
import { type WeightUnit, toDisplayWeight } from "../../utils/units";
import { useAchievementStore } from "../../stores/achievementStore";
import {
  getCurrentWeekStart,
  getLocalDateString,
  getWeekStartForDate,
} from "../../utils/weekUtils";

// Modular Components
import {
  AnalyticsHeader,
  MetricSummaryGrid,
  AchievementShowcase,
  TrendCharts,
  Period,
} from "./analytics";
import type { MetricData } from "./analytics";

interface AnalyticsScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  // Subscription gate — analytics is a premium feature.
  // Two conditions must hold: the plan's feature flag grants analytics AND
  // the subscription is currently active (isPremium). This prevents a lapsed
  // premium user (currentPeriodEnd in the past, but stale in-memory
  // features.analytics === true before fetchSubscriptionStatus refreshes)
  // from seeing premium analytics. Mirrors the defense-in-depth check in
  // subscriptionStore.canUseFeature / isPremium.
  const featuresAnalytics = useSubscriptionStore((s) => s.features.analytics);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const subscriptionInitialized = useSubscriptionStore((s) => s.isInitialized);
  const isGuestMode = useAuthStore((s) => s.isGuestMode);
  const authUserId = useAuthStore((s) => s.user?.id);
  // Before initialization completes, features defaults to FREE_FEATURES, so
  // analyticsEnabled would be false and flash the locked screen for premium
  // users. Treat the pre-init state as "access undetermined" -> show locked
  // screen only after init; the locked screen's upgrade CTA still works.
  // Guests/signed-out users never run initializeSubscription() (App.tsx clears
  // the store instead), so isInitialized stays false forever — don't strand
  // them on "Loading your subscription..." with no CTA; show the locked screen.
  const analyticsEnabled = featuresAnalytics && isPremium();
  const showLockedInitializing =
    !subscriptionInitialized && !!authUserId && !isGuestMode;
  const { triggerPaywall, showPaywall, paywallReason, dismiss } = usePaywall();

  // State
  // NOTE: selectedPeriod is intentionally NOT local state — we read it from
  // analyticsStore so the user's choice persists across tab switches.
  const [refreshing, setRefreshing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadedHistoryPeriodDays, setLoadedHistoryPeriodDays] = useState<
    number | null
  >(null);

  // Stores
  // SSOT: weight/target come from profileStore.bodyAnalysis — userStore.profile is NOT used here
  // Field-level selectors (instead of destructuring the whole store) so this
  // screen doesn't re-render on unrelated field changes elsewhere in the store.
  const user = useAuthStore((s) => s.user);
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const { metrics: calculatedMetrics } = useCalculatedMetrics();

  // Stored weights are metric (kg); convert to the user's unit at display time.
  const weightUnit: WeightUnit =
    personalInfo?.units === "imperial" ? "lbs" : "kg";
  const {
    initialize: initializeAnalytics,
    refreshAnalytics,
    isInitialized,
    isLoading: isAnalyticsLoading,
    // SSOT fix: selectedPeriod persisted in store — survives tab switches
    selectedPeriod,
    setPeriod: setSelectedPeriod,
    // SSOT fix: history cached in store — survives tab switches
    weightHistory,
    calorieHistory,
    setHistoryData,
  } = useAnalyticsStore();
  const hasCachedHistory = weightHistory.length > 0 || calorieHistory.length > 0;
  const initializeAchievements = useAchievementStore((s) => s.initialize);
  const areAchievementsLoading = useAchievementStore((s) => s.isLoading);
  const areAchievementsInitialized = useAchievementStore(
    (s) => s.isInitialized,
  );
  // SSOT fix: streak comes from achievementStore.currentStreak which is computed
  // from completedSessions via updateCurrentStreak(). DataRetrievalService.getWeeklyProgress()
  // returned a stale value derived from workoutProgress (can lag after plan regeneration).
  const currentStreak = useAchievementStore((s) => s.currentStreak);

  // Initialize analytics on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAnalytics();
    }
  }, [isInitialized, initializeAnalytics]);

  useEffect(() => {
    if (!user?.id || areAchievementsInitialized) {
      return;
    }

    initializeAchievements(user.id).catch((error) => {
      console.error(
        "[AnalyticsScreen] Failed to initialize achievements:",
        error,
      );
    });
  }, [user?.id, areAchievementsInitialized, initializeAchievements]);

  // Compute period days from selected period
  const periodDays = useMemo(() => {
    switch (selectedPeriod) {
      case "week":
        return 7;
      case "month":
        return 30;
      case "quarter":
        return 90;
      default:
        return 365;
    }
  }, [selectedPeriod]);

  const isHistoryCurrent = loadedHistoryPeriodDays === periodDays;

  // Shared data loader used by both useEffect and handleRefresh
  const loadHistoryData = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!user?.id) {
      setIsDataLoading(false);
      setLoadedHistoryPeriodDays(null);
      return;
    }

    const showLoading =
      options?.showLoading ??
      (!hasCachedHistory || loadedHistoryPeriodDays !== periodDays);

    try {
      if (showLoading) {
        setIsDataLoading(true);
      }
      setDataError(null);
      const [weightData, calorieData] = await Promise.all([
        analyticsDataService.getWeightHistory(user.id, periodDays),
        analyticsDataService.getCalorieHistory(user.id, periodDays),
      ]);

      // SSOT fix: write fetched history into the store instead of local state
      // so the Analytics tab shows cached data immediately on the next mount.
      setHistoryData(weightData, calorieData);
      setLoadedHistoryPeriodDays(periodDays);
    } catch (error) {
      console.error("Failed to load analytics history:", error);
      setDataError("Failed to load analytics data. Pull to refresh.");
    } finally {
      if (showLoading) {
        setIsDataLoading(false);
      }
    }
  }, [
    hasCachedHistory,
    loadedHistoryPeriodDays,
    periodDays,
    setHistoryData,
    user?.id,
  ]);

  // Load weight and calorie history from Supabase
  useEffect(() => {
    loadHistoryData({
      showLoading: !hasCachedHistory || loadedHistoryPeriodDays !== periodDays,
    });
  }, [hasCachedHistory, loadHistoryData, loadedHistoryPeriodDays, periodDays]);

  const periodBoundaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(`${getCurrentWeekStart()}T00:00:00`);

    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 29);
    monthStart.setHours(0, 0, 0, 0);

    const quarterStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    quarterStart.setHours(0, 0, 0, 0);

    const yearStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    yearStart.setHours(0, 0, 0, 0);

    return {
      today,
      weekStart,
      monthStart,
      quarterStart,
      yearStart,
    };
  }, []);

  const isInSelectedPeriod = useCallback(
    (dateValue: string) => {
      const dateKey = getLocalDateString(dateValue);
      switch (selectedPeriod) {
        case "week":
          return getWeekStartForDate(dateValue) === getCurrentWeekStart();
        case "month":
          return dateKey >= getLocalDateString(periodBoundaries.monthStart);
        case "quarter":
          return dateKey >= getLocalDateString(periodBoundaries.quarterStart);
        default:
          return dateKey >= getLocalDateString(periodBoundaries.yearStart);
      }
    },
    [periodBoundaries, selectedPeriod],
  );

  // Calculate metrics data - prioritize calculatedMetrics from onboarding
  const metricsData = useMemo((): MetricData => {
    const resolvedCurrentWeight = resolveCurrentWeight({
      weightHistory,
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    });

    // Weight data - prefer calculated metrics from onboarding, fallback to health metrics or profile
    // Weight: prefer calculatedMetrics, then profileStore.bodyAnalysis (source of truth from onboarding)
    const currentWeight =
      calculatedMetrics?.currentWeightKg &&
      calculatedMetrics.currentWeightKg > 0
        ? calculatedMetrics.currentWeightKg
        : resolvedCurrentWeight.value ?? undefined;
    const targetWeight =
      calculatedMetrics?.targetWeightKg ||
      (bodyAnalysis?.target_weight_kg && bodyAnalysis.target_weight_kg > 0
        ? bodyAnalysis.target_weight_kg
        : undefined);

    // Calculate completed workouts WITHIN the selected period
    // Filter by completedAt timestamp falling within periodDays window
    const completedWorkouts = completedSessions.filter((s) =>
      isInSelectedPeriod(s.completedAt),
    ).length;

    // SSOT fix: calories consumed comes from nutritionStore which aggregates
    // both completed weekly-plan meals AND manually logged daily meals.
    // Previously DataRetrievalService.getTodaysData() was used but it only
    // counted weekly-plan completions, ignoring meal_logs / barcode scans.
    const caloriesConsumed = calorieHistory
      .filter((entry) => isInSelectedPeriod(entry.date))
      .reduce((sum, entry) => sum + (entry.consumed || 0), 0);

    // SSOT: this card is intake-only because its trend/history/target all use
    // calorie consumption semantics. Burned calories belong in a separate fact.
    const displayCalories = caloriesConsumed;

    // SSOT fix: streak derived from achievementStore.currentStreak which counts
    // consecutive workout days from completedSessions. DataRetrievalService was stale.
    const streak = currentStreak;

    // Weight change: derive from Supabase history (oldest → newest in period)
    // Positive = gained weight, negative = lost weight
    // Fallback shows remaining to goal: target - current (negative = target lower than current = needs to lose)
    const hasWeightTrendData = weightHistory.length >= 2;
    const weightChange =
      hasWeightTrendData
        ? Number(
            (
              weightHistory[weightHistory.length - 1].weight -
              weightHistory[0].weight
            ).toFixed(1),
          )
        : undefined;

    // Weight trend: negative change (losing weight / below goal) = "down" = green (good for weight-loss goals)
    const weightTrend =
      hasWeightTrendData && weightChange !== undefined
        ? weightChange < 0
          ? ("down" as const)
          : weightChange > 0
            ? ("up" as const)
            : ("stable" as const)
        : undefined;

    // Calorie change: percentage change from start to end of period
    const periodCalorieHistory = calorieHistory.filter((entry) =>
      isInSelectedPeriod(entry.date),
    );
    const calorieChange =
      periodCalorieHistory.length >= 2
        ? (() => {
            const first = periodCalorieHistory[0].consumed;
            const last =
              periodCalorieHistory[periodCalorieHistory.length - 1].consumed;
            if (first === 0) return undefined;
            return Math.round(((last - first) / first) * 100);
          })()
        : undefined;

    return {
      weight: currentWeight
        ? {
            current: currentWeight,
            change: weightChange,
            trend: weightTrend,
            target: targetWeight,
            hasTrendData: hasWeightTrendData,
          }
        : undefined,
      calories: {
        consumed: displayCalories,
        target: calculatedMetrics?.dailyCalories || undefined,
        change: calorieChange,
        // Trend must agree with the sign of `change` (the displayed %) —
        // never derive it from an unrelated fact like "was anything logged".
        trend:
          calorieChange === undefined
            ? ("stable" as const)
            : calorieChange > 0
              ? ("up" as const)
              : calorieChange < 0
                ? ("down" as const)
                : ("stable" as const),
        period: selectedPeriod,
        hasData: periodCalorieHistory.some((entry) => (entry.consumed || 0) > 0),
      },
      workouts: {
        count: completedWorkouts,
        change: undefined,
        // No real period-over-period comparison exists for workouts (change
        // is always undefined), so don't attach a vacuous "up" trend flag —
        // StatCell requires both trend + trendValue truthy to render, but a
        // future trendValue addition would otherwise ship a fake indicator.
        trend: undefined,
      },
      streak: {
        days: streak,
        isActive: streak > 0,
      },
      // SSOT fix: BMI/BMR/TDEE come ONLY from useCalculatedMetrics (which reads
      // advanced_review from Supabase). We do NOT recompute them inline here —
      // that would duplicate the Mifflin–St Jeor formula and risk divergence.
      // If calculatedMetrics is null (not loaded yet), show undefined in the UI.
      bmi:
        calculatedMetrics?.calculatedBMI && calculatedMetrics.calculatedBMI > 0
          ? calculatedMetrics.calculatedBMI
          : undefined,
      bmr:
        calculatedMetrics?.calculatedBMR && calculatedMetrics.calculatedBMR > 0
          ? calculatedMetrics.calculatedBMR
          : undefined,
      tdee:
        calculatedMetrics?.calculatedTDEE &&
        calculatedMetrics.calculatedTDEE > 0
          ? calculatedMetrics.calculatedTDEE
          : undefined,
      dailyWater: calculatedMetrics?.dailyWaterML,
    };
  }, [
    bodyAnalysis,
    completedSessions,
    calculatedMetrics,
    weightHistory,
    calorieHistory,
    periodDays,
    isInSelectedPeriod,
    currentStreak,
  ]);

  // Calorie breakdown by session type — for breakdown display only, not part of MetricData
  const calBreakdown = useMemo(() => {
    return {
      extra: completedSessions
        .filter((s) => s.type === "extra" && isInSelectedPeriod(s.completedAt))
        .reduce((sum, s) => sum + s.caloriesBurned, 0),
      planned: completedSessions
        .filter(
          (s) => s.type === "planned" && isInSelectedPeriod(s.completedAt),
        )
        .reduce((sum, s) => sum + s.caloriesBurned, 0),
    };
  }, [completedSessions, isInSelectedPeriod]);

  // Generate chart data based on period
  const chartData = useMemo(() => {
    // Weight chart: always from Supabase history (kg) — converted once to the
    // user's display unit so axis/tooltip/trend copy match the unit suffix.
    const weightChartData =
      weightHistory.length > 0
        ? weightHistory.map((w) => ({
            label: new Date(w.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            value: toDisplayWeight(w.weight, weightUnit) ?? w.weight,
          }))
        : (() => {
            const fallbackWeight =
              calculatedMetrics?.currentWeightKg &&
              calculatedMetrics.currentWeightKg > 0
                ? calculatedMetrics.currentWeightKg
                : resolveCurrentWeight({
                    weightHistory,
                    bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
                  }).value ?? undefined;
            return fallbackWeight
              ? [
                  {
                    label: new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    }),
                    value:
                      toDisplayWeight(fallbackWeight, weightUnit) ??
                      fallbackWeight,
                  },
                ]
              : undefined;
          })();

    // Calorie chart: filter out zero-value days to avoid misleading empty bars
    const calorieChartData =
      calorieHistory.length > 0
        ? calorieHistory
            .filter((c) => c.consumed > 0)
            .map((c) => ({
              label: new Date(c.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              value: c.consumed,
            }))
        : undefined;

    // Workout chart: period-aware bucketing from completedSessions
    let workoutData: Array<{ label: string; value: number }> = [];

    if (selectedPeriod === "week") {
      // Show each day of the current week (Mon-Sun)
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const startOfWeek = new Date(`${getCurrentWeekStart()}T00:00:00`);
      workoutData = dayLabels.map((label, index) => {
        const bucketDate = new Date(startOfWeek);
        bucketDate.setDate(startOfWeek.getDate() + index);
        const bucketDateKey = getLocalDateString(bucketDate);
        const count = completedSessions.filter((s) => {
          return getLocalDateString(s.completedAt) === bucketDateKey;
        }).length;
        return { label, value: count };
      });
    } else if (selectedPeriod === "month") {
      workoutData = Array.from({ length: 5 }, (_, index) => {
        const bucketStart = new Date(periodBoundaries.monthStart);
        bucketStart.setDate(periodBoundaries.monthStart.getDate() + index * 6);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketStart.getDate() + 6);
        if (index === 4) {
          bucketEnd.setTime(
            periodBoundaries.today.getTime() + 24 * 60 * 60 * 1000,
          );
        }

        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const d = new Date(s.completedAt);
          return d >= bucketStart && d < bucketEnd;
        }).length;
        return {
          label: bucketStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: count,
        };
      });
    } else if (selectedPeriod === "quarter") {
      const monthLabels = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(
          periodBoundaries.quarterStart.getFullYear(),
          periodBoundaries.quarterStart.getMonth() + i,
          1,
        );
        return d.toLocaleDateString("en-US", { month: "short" });
      });
      workoutData = monthLabels.map((label, i) => {
        const d = new Date(
          periodBoundaries.quarterStart.getFullYear(),
          periodBoundaries.quarterStart.getMonth() + i,
          1,
        );
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const cd = new Date(s.completedAt);
          return cd >= monthStart && cd < monthEnd;
        }).length;
        return { label, value: count };
      });
    } else if (selectedPeriod === "year") {
      const yearLabels = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(
          periodBoundaries.yearStart.getFullYear(),
          periodBoundaries.yearStart.getMonth() + i * 2,
          1,
        );
        return d.toLocaleDateString("en-US", { month: "short" });
      });
      workoutData = yearLabels.map((label, i) => {
        const monthStart = new Date(
          periodBoundaries.yearStart.getFullYear(),
          periodBoundaries.yearStart.getMonth() + i * 2,
          1,
        );
        const monthEnd = new Date(
          periodBoundaries.yearStart.getFullYear(),
          periodBoundaries.yearStart.getMonth() + i * 2 + 2,
          1,
        );
        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const cd = new Date(s.completedAt);
          return cd >= monthStart && cd < monthEnd;
        }).length;
        return { label, value: count };
      });
    }

    return {
      // Weight data - from Supabase analytics_metrics
      weightData: weightChartData,

      // Calorie data - from Supabase analytics_metrics (non-zero only)
      calorieData:
        calorieChartData && calorieChartData.length > 0
          ? calorieChartData
          : undefined,

      // Workout data - period-aware bucketing
      workoutData: workoutData.some((d) => d.value > 0)
        ? workoutData
        : undefined,
    };
  }, [
    selectedPeriod,
    completedSessions,
    calculatedMetrics,
    bodyAnalysis,
    weightHistory,
    calorieHistory,
    periodBoundaries,
    weightUnit,
  ]);

  // Handlers
  const handlePeriodChange = useCallback(
    (period: Period) => {
      haptics.light();
      // SSOT: setPeriod writes to analyticsStore which persists across tab switches
      setSelectedPeriod(period);
    },
    [setSelectedPeriod],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setDataError(null);
    haptics.light();
    try {
      await refreshAnalytics();
      await loadHistoryData({ showLoading: false });
    } catch (error) {
      console.error("Refresh error:", error);
      setDataError("Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshAnalytics, loadHistoryData]);

  const handleMetricPress = useCallback(
    (metric: string) => {
      haptics.light();
      // Navigate to the most relevant screen for each metric
      if (
        metric === "weight" ||
        metric === "streak" ||
        metric === "bmi" ||
        metric === "bmr" ||
        metric === "tdee"
      ) {
        navigation?.navigate("Progress");
      } else if (metric === "workouts") {
        navigation?.navigate("Workout");
      } else if (metric === "calories" || metric === "water") {
        navigation?.navigate(
          "Diet",
          metric === "water" ? { openWaterModal: true } : { openLogMeal: true },
        );
      }
    },
    [navigation],
  );

  const handleChartPress = useCallback(
    (chartType: string) => {
      haptics.light();
      if (chartType === "weight") {
        navigation?.navigate("Progress");
      } else if (chartType === "workouts") {
        navigation?.navigate("ProgressTrends");
      } else if (chartType === "calories") {
        navigation?.navigate("ProgressTrends");
      }
    },
    [navigation],
  );

  // Navigation handlers
  const handleProgressPress = useCallback(() => {
    haptics.light();
    navigation?.navigate("Progress");
  }, [navigation]);

  // Show loading state for initial load
  const showLoading =
    !refreshing && !dataError && (isDataLoading || isAnalyticsLoading || !isHistoryCurrent);

  if (!analyticsEnabled) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.lockedContainer}>
            <View
              style={styles.lockedIconContainer}
              accessibilityRole="image"
              accessibilityLabel="Analytics is a premium feature"
            >
              <Ionicons
                name="analytics-outline"
                size={rf(40)}
                color={colors.primary.light}
              />
            </View>
            <Text style={styles.lockedTitle} numberOfLines={1}>Premium Feature</Text>
            <Text style={styles.lockedDescription} numberOfLines={4}>
              {showLockedInitializing
                ? "Loading your subscription..."
                : "Detailed analytics and trend charts are available on Basic and Pro plans."}
            </Text>
            {!showLockedInitializing && (
            <GlassButton
              label="Upgrade to Unlock"
              onPress={() => triggerPaywall("Unlock detailed analytics with a premium plan")}
              variant="primary"
              style={styles.lockedUpgradeButton}
            />
            )}
          </View>
          {/* PaywallModal is NOT mounted globally (only DietScreen +
              SubscriptionManagement mount it) — without this local mount the
              Upgrade CTA set showPaywall in the store but rendered nothing. */}
          <PaywallModal
            visible={showPaywall}
            onClose={dismiss}
            reason={paywallReason ?? undefined}
          />
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      {/* edges={["bottom"]} — top inset is applied explicitly in AnalyticsHeader
          (paddingTop = insets.top + spacing.md) so the title clears the status
          bar reliably. edges={["top"]} here would double-pad the top. */}
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Animated.View
          entering={Platform.OS !== "web" ? FadeIn.duration(300) : undefined}
          style={styles.animatedContainer}
        >
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
            {/* 1. Analytics Header */}
            <AnalyticsHeader
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
              onProgressPress={navigation ? handleProgressPress : undefined}
            />

            {/* Loading State */}
            {showLoading && (
              <View style={styles.loadingContainer}>
                <AuroraSpinner size="lg" />
                <Text style={styles.loadingText} numberOfLines={1}>Loading analytics...</Text>
              </View>
            )}

            {/* Bottom content placeholder removed — see bottom spacing below */}

            {/* Error State */}
            {dataError && !showLoading && (
              <EmptyState
                icon="alert-circle-outline"
                title="Couldn't load analytics"
                subtitle={dataError}
                ctaText="Retry"
                onCta={handleRefresh}
                style={styles.errorState}
              />
            )}

            {/* Content - only show when not in initial loading */}
            {!showLoading && (
              <>
                {/* 2. Metric Summary Grid */}
                <View style={styles.sectionContainer}>
                  <MetricSummaryGrid
                    data={metricsData}
                    period={selectedPeriod}
                    onMetricPress={handleMetricPress}
                    weightUnit={weightUnit}
                  />
                </View>

                {/* Calorie Breakdown: Planned + Extra */}
                {calBreakdown.extra > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.calorieBreakdown}>
                      <Text style={styles.breakdownTitle} numberOfLines={1}>
                        Calorie Breakdown
                      </Text>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel} numberOfLines={1}>Plan workouts</Text>
                        <Text style={styles.breakdownValue} numberOfLines={1}>
                          {calBreakdown.planned} kcal
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel} numberOfLines={1}>
                          Extra workouts
                        </Text>
                        <Text
                          style={[styles.breakdownValue, styles.breakdownExtra]}
                          numberOfLines={1}
                        >
                          {calBreakdown.extra} kcal
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 3. Achievement Showcase */}
                <View style={styles.sectionContainer}>
                  <AchievementShowcase
                    isLoading={areAchievementsLoading}
                    isInitialized={areAchievementsInitialized}
                  />
                </View>

                {/* 4. Trend Charts */}
                <View style={styles.sectionContainer}>
                  <TrendCharts
                    weightData={chartData.weightData}
                    calorieData={chartData.calorieData}
                    workoutData={chartData.workoutData}
                    period={selectedPeriod}
                    weightUnit={weightUnit}
                    onChartPress={handleChartPress}
                  />
                </View>
              </>
            )}

            {/* Bottom spacing — rely on scrollContent.paddingBottom only
                (was previously double-counted with an inline spacer View). */}
          </Animated.ScrollView>
        </Animated.View>
      </SafeAreaView>
    </AuroraBackground>
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
  sectionContainer: {
    position: "relative" as const,
  },
  loadingContainer: {
    minHeight: rh(400),
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
  },
  errorState: {
    paddingVertical: spacing.xxl,
  },
  calorieBreakdown: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    fontSize: rf(13),
    color: colors.text.secondary,
  },
  breakdownValue: {
    fontSize: rf(13),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    fontVariant: ["tabular-nums"],
  },
  breakdownExtra: {
    color: colors.success.DEFAULT,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rw(32),
  },
  lockedIconContainer: {
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.15),
    borderRadius: rw(40),
    padding: rw(20),
    marginBottom: rh(20),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.3),
  },
  lockedTitle: {
    fontSize: rf(22),
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text.primary,
    marginBottom: rh(10),
    textAlign: "center",
  },
  lockedDescription: {
    fontSize: rf(14),
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: rh(28),
  },
  // GlassButton's `fullWidth` prop uses flex:1, which is correct for a row
  // of buttons sharing space but expands to fill all remaining vertical
  // space when the only child of a centered flex:1 column (lockedContainer)
  // — alignSelf:'stretch' fills the cross-axis (width, here) without
  // growing the main axis.
  lockedUpgradeButton: {
    alignSelf: "stretch",
  },
});

export default AnalyticsScreen;
