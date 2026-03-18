import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { rh, rw } from "../../utils/responsive";

// Hook
import { useProgressTrendsLogic } from "../../hooks/useProgressTrendsLogic";
import { useProfileStore } from "../../stores/profileStore";

// Components
import { PeriodSelector } from "./analytics/PeriodSelector";
import { SimpleTrendCard } from "./analytics/SimpleTrendCard";
import { SummaryCard } from "./analytics/SummaryCard";
import { GoalProgressCard } from "./analytics/GoalProgressCard";
import { ProgressTrendsHeader } from "./analytics/ProgressTrendsHeader";

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
              tintColor={ResponsiveTheme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <SummaryCard
            selectedPeriod={selectedPeriod}
            workoutTrend={workoutTrend}
            metricsHistory={metricsHistory}
          />

          <SimpleTrendCard
            title="Weight Trend"
            icon="scale-outline"
            trend={weightTrend}
            unit="kg"
            color={ResponsiveTheme.colors.success}
            ctaLabel="Log Weight"
          />

          <SimpleTrendCard
            title="Calorie Intake"
            icon="flame-outline"
            trend={calorieTrend}
            unit="kcal"
            color={ResponsiveTheme.colors.warning}
            ctaLabel="Log Meal"
          />

          <GoalProgressCard
            calculatedMetrics={calculatedMetrics}
            profilePersonalInfo={profilePersonalInfo}
            bodyAnalysis={bodyAnalysis}
          />
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
    paddingHorizontal: rw(20),
    marginBottom: rh(15),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rw(20),
    gap: rh(15),
  },
});

export default ProgressTrendsScreen;
