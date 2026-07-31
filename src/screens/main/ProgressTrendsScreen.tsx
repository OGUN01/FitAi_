import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { EmptyState } from "../../components/ui/aurora/EmptyState";
import { colors, spacing } from "../../theme/aurora-tokens";
import { rh, rw } from "../../utils/responsive";

// Hook
import { useProgressTrendsLogic } from "../../hooks/useProgressTrendsLogic";
import { useProfileStore } from "../../stores/profileStore";
import { useAnalyticsStore } from "../../stores/analyticsStore";

// Components
import { PeriodSelector } from "./analytics/PeriodSelector";
import { SimpleTrendCard } from "./analytics/SimpleTrendCard";
import { SummaryCard } from "./analytics/SummaryCard";
import { GoalProgressCard } from "./analytics/GoalProgressCard";
import { ProgressTrendsHeader } from "./analytics/ProgressTrendsHeader";
import { toDisplayWeight, type WeightUnit } from "../../utils/units";

interface ProgressTrendsScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export const ProgressTrendsScreen: React.FC<ProgressTrendsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const {
    selectedPeriod,
    refreshing,
    loading,
    loadError,
    metricsHistory,
    calculatedMetrics,
    weightTrend,
    calorieTrend,
    workoutTrend,
    handleRefresh,
    handlePeriodChange,
  } = useProgressTrendsLogic();
  // SSOT: read profile data directly from profileStore
  const { personalInfo: profilePersonalInfo, bodyAnalysis } = useProfileStore();
  // SSOT: weight history from analyticsStore (same source as Analytics tab)
  const weightHistory = useAnalyticsStore((s) => s.weightHistory);
  const weightUnit: WeightUnit =
    profilePersonalInfo?.units === "imperial" ? "lbs" : "kg";
  const displayWeightTrend = React.useMemo(() => {
    if (!weightTrend) return null;

    return {
      ...weightTrend,
      data: weightTrend.data.map(
        (value) => toDisplayWeight(value, weightUnit) ?? value,
      ),
      min: toDisplayWeight(weightTrend.min, weightUnit) ?? weightTrend.min,
      max: toDisplayWeight(weightTrend.max, weightUnit) ?? weightTrend.max,
      avg: toDisplayWeight(weightTrend.avg, weightUnit) ?? weightTrend.avg,
      change:
        weightUnit === "lbs"
          ? (toDisplayWeight(weightTrend.change, weightUnit) ??
            weightTrend.change)
          : weightTrend.change,
    };
  }, [weightTrend, weightUnit]);

  return (
    <AuroraBackground style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <ProgressTrendsHeader onBack={() => navigation?.goBack()} />

        <View style={styles.periodSelectorContainer}>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + rh(20) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.DEFAULT}
              colors={[colors.primary.DEFAULT]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <AuroraSpinner size="lg" />
            </View>
          ) : loadError && metricsHistory.length === 0 ? (
            <View style={styles.errorWrap}>
              <EmptyState
                icon="cloud-offline-outline"
                iconColor={colors.error.DEFAULT}
                title="Couldn't load trends"
                subtitle="Check your connection and pull down to refresh."
              />
            </View>
          ) : (
            <>
              <SummaryCard
                selectedPeriod={selectedPeriod}
                workoutTrend={workoutTrend}
                metricsHistory={metricsHistory}
              />

              <SimpleTrendCard
                title="Weight Trend"
                icon="scale-outline"
                trend={displayWeightTrend}
                unit={weightUnit}
                color={colors.success.DEFAULT}
              />

              <SimpleTrendCard
                title="Calorie Intake"
                icon="flame-outline"
                trend={calorieTrend}
                unit="kcal"
                color={colors.warning.DEFAULT}
              />

              <GoalProgressCard
                calculatedMetrics={calculatedMetrics}
                profilePersonalInfo={profilePersonalInfo}
                bodyAnalysis={bodyAnalysis}
                weightHistory={weightHistory}
                unit={weightUnit}
              />
            </>
          )}
        </ScrollView>
      </View>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  periodSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: rh(15),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: rh(15),
  },
  loadingContainer: {
    minHeight: rh(400),
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: rh(40),
  },
});

export default ProgressTrendsScreen;
