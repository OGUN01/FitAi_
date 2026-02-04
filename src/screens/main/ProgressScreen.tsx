import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { ResponsiveTheme } from "../../utils/constants";

// Hooks
import { useProgressScreen } from "../../hooks/useProgressScreen";

// Components
import { ProgressHeader } from "../../components/progress/ProgressHeader";
import { ProgressErrorStates } from "../../components/progress/ProgressErrorStates";
import { TodaysProgressCard } from "../../components/progress/TodaysProgressCard";
import { WearableActivityCard } from "../../components/progress/WearableActivityCard";
import { ProgressAnalytics } from "../../components/progress/ProgressAnalytics";
import { PeriodSelector } from "../../components/progress/PeriodSelector";
import { BodyMetricsSection } from "../../components/progress/BodyMetricsSection";
import { WeeklyChartSection } from "../../components/progress/WeeklyChartSection";
import { RecentActivitiesSection } from "../../components/progress/RecentActivitiesSection";
import { AchievementsSection } from "../../components/progress/AchievementsSection";
import { SummaryStatsSection } from "../../components/progress/SummaryStatsSection";
import { ActivitiesModal } from "../../components/progress/ActivitiesModal";
import { WeightEntryModal } from "../../components/progress/WeightEntryModal";

interface ProgressScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { state, computed, actions } = useProgressScreen(navigation);

  const {
    selectedPeriod,
    refreshing,
    isLoading,
    showWeightModal,
    showAnalytics,
    showAllActivities,
    weeklyProgress,
    recentActivities,
    realWeeklyData,
    allActivities,
    loadingMoreActivities,
    hasMoreActivities,
    todaysData,
    isAuthenticated,
    healthMetrics,
    syncError,
    isWearableConnected,
    progressLoading,
    progressError,
    analysisError,
    statsError,
    statsLoading,
    progressStats,
    calculatedMetrics,
    hasCalculatedMetrics,
    fadeAnim,
    slideAnim,
    trackBStatus,
    progressEntries,
  } = state;

  const { periods, stats, achievements, weeklyData } = computed;

  const {
    setSelectedPeriod,
    setShowAnalytics,
    setShowAllActivities,
    onRefresh,
    handleAddProgressEntry,
    handleShareProgress,
    loadMoreActivities,
    setShowWeightModal,
  } = actions;

  const combinedError =
    progressError || analysisError || statsError || syncError;

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
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
                />
              }
            >
              <View>
                <ProgressHeader
                  navigation={navigation}
                  trackBStatus={trackBStatus}
                  showAnalytics={showAnalytics}
                  setShowAnalytics={setShowAnalytics}
                  onAddEntry={handleAddProgressEntry}
                  onShare={handleShareProgress}
                />

                <ProgressErrorStates
                  isLoading={isLoading}
                  progressLoading={progressLoading}
                  statsLoading={statsLoading}
                  error={combinedError || null}
                  isAuthenticated={isAuthenticated}
                  hasCalculatedMetrics={hasCalculatedMetrics}
                  progressEntriesLength={progressEntries.length}
                  onRefresh={onRefresh}
                  onAddEntry={handleAddProgressEntry}
                />

                {(isAuthenticated || calculatedMetrics?.calculatedBMI) &&
                  !progressError && (
                    <>
                      {!showAnalytics && todaysData && (
                        <TodaysProgressCard
                          todaysData={todaysData}
                          calculatedMetrics={calculatedMetrics}
                        />
                      )}

                      {isWearableConnected && !showAnalytics && (
                        <WearableActivityCard healthMetrics={healthMetrics} />
                      )}

                      {showAnalytics && <ProgressAnalytics />}

                      {!showAnalytics && (
                        <PeriodSelector
                          periods={periods}
                          selectedPeriod={selectedPeriod}
                          onSelect={setSelectedPeriod}
                        />
                      )}

                      <BodyMetricsSection
                        stats={stats}
                        progressEntries={progressEntries}
                      />

                      <WeeklyChartSection weeklyData={weeklyData} />

                      <RecentActivitiesSection
                        recentActivities={recentActivities}
                        onViewAll={() => {
                          actions.loadMoreActivities();
                          setShowAllActivities(true);
                        }}
                      />

                      <AchievementsSection achievements={achievements} />

                      <SummaryStatsSection
                        weeklyProgress={weeklyProgress}
                        realWeeklyData={realWeeklyData}
                        progressStats={progressStats}
                      />
                    </>
                  )}

                <View style={styles.bottomSpacing} />
              </View>
            </ScrollView>
          </Animated.View>

          <ActivitiesModal
            visible={showAllActivities}
            onClose={() => setShowAllActivities(false)}
            activities={allActivities}
            onLoadMore={loadMoreActivities}
            loadingMore={loadingMoreActivities}
            hasMore={hasMoreActivities}
          />
        </View>
      </AuroraBackground>

      <WeightEntryModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        currentWeight={progressStats?.weightChange?.current}
        unit="kg"
        onSuccess={() => {
          onRefresh();
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
  scrollView: {
    flex: 1,
  },
  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },
});
