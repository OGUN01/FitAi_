import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { DashboardSkeleton } from '../../components/ui/aurora/DashboardSkeleton';
import { colors } from '../../theme/aurora-tokens';
import { rh } from '../../utils/responsive';
import { mergeWeightSeries } from '../../components/progress/goalProgressUtils';
import { useReducedMotion } from '../../utils/accessibility/hooks';

// Hooks
import { useProgressScreen } from '../../hooks/useProgressScreen';

// Kept components
import { ProgressHeader } from '../../components/progress/ProgressHeader';
import { ProgressErrorStates } from '../../components/progress/ProgressErrorStates';
import { WeightEntryModal } from '../../components/progress/WeightEntryModal';
import { AchievementsSection } from '../../components/progress/AchievementsSection';

// New focused sections
import { WeightJourneySection } from '../../components/progress/WeightJourneySection';
import { GoalProgressSection } from '../../components/progress/GoalProgressSection';
import { WorkoutConsistencySection } from '../../components/progress/WorkoutConsistencySection';

interface ProgressScreenProps {
  navigation?: {
    // eslint-disable-next-line no-unused-vars
    navigate: (screen: string, params?: unknown) => void;
    goBack: () => void;
  };
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { state, computed, actions } = useProgressScreen(navigation);

  const {
    refreshing,
    isLoading,
    showWeightModal,
    progressLoading,
    progressError,
    analysisError,
    statsError,
    isAuthenticated,
    hasCalculatedMetrics,
    trackBStatus,
    progressEntries,
    progressStats,
    calculatedMetrics,
    weeklyProgress,
    weightHistory,
    weightUnit,
  } = state;

  const { achievements, completedAchievementCount, totalAchievementCount } = computed;

  const { onRefresh, setShowWeightModal, handleShareProgress } = actions;

  // getProgressStats reports "No progress entries found" as an error for any
  // account with zero weigh-ins (i.e. every new user). That's an empty state,
  // not a failure — don't show the error panel with a useless Retry; the
  // friendly empty-state panel below handles it.
  const BENIGN_EMPTY_STATS_ERROR = "No progress entries found";
  const combinedError =
    progressError ||
    analysisError ||
    (statsError && statsError !== BENIGN_EMPTY_STATS_ERROR ? statsError : null);

  // Single merged per-day weight series (analytics history + local entries) —
  // shared by the hero chart and the goal card so start/current never diverge
  // for guests (analytics-only series would pin start === current → 0%).
  const mergedWeightSeries = React.useMemo(
    () => mergeWeightSeries(weightHistory, progressEntries),
    [weightHistory, progressEntries],
  );

  // Modal pre-fill: progressStats is auth-only, so without this guests start
  // the dial at the 20kg validation floor. Resolve the real current weight the
  // same way the hero does: latest merged entry, then onboarding weight.
  const resolvedCurrentWeight = React.useMemo(() => {
    if (progressStats?.weightChange?.current != null) {
      return progressStats.weightChange.current;
    }
    if (mergedWeightSeries.length > 0) {
      return mergedWeightSeries[mergedWeightSeries.length - 1].weight;
    }
    return calculatedMetrics?.currentWeightKg ?? undefined;
  }, [
    progressStats?.weightChange?.current,
    mergedWeightSeries,
    calculatedMetrics?.currentWeightKg,
  ]);

  if (isLoading) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView style={styles.scrollView}>
            <DashboardSkeleton
              cardCount={4}
              listItemCount={3}
              showFilterRow
            />
          </ScrollView>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <>
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(400).delay(80)}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={{ paddingBottom: rh(120) }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary.DEFAULT}
                  colors={[colors.primary.DEFAULT]}
                />
              }
            >
              <ProgressHeader
                navigation={navigation}
                trackBStatus={trackBStatus}
                onAddEntry={() => setShowWeightModal(true)}
                onShare={handleShareProgress}
              />

              <ProgressErrorStates
                isLoading={isLoading}
                progressLoading={progressLoading}
                statsLoading={false}
                error={combinedError || null}
                isAuthenticated={isAuthenticated}
                hasCalculatedMetrics={hasCalculatedMetrics}
                onRefresh={onRefresh}
              />

              {(isAuthenticated || hasCalculatedMetrics) && !progressError && (
                <>
                  {/* 1. Hero: Weight Journey with interactive chart */}
                  <WeightJourneySection
                    weightHistory={weightHistory}
                    progressEntries={progressEntries}
                    onLogWeight={() => setShowWeightModal(true)}
                    unit={weightUnit}
                    fallbackCurrentWeightKg={calculatedMetrics?.currentWeightKg ?? null}
                  />

                  {/* 2. Goal Progress — am I getting closer? */}
                  <GoalProgressSection
                    progressStats={progressStats}
                    calculatedMetrics={calculatedMetrics}
                    weeklyProgress={weeklyProgress}
                    weightHistory={mergedWeightSeries}
                    unit={weightUnit}
                  />

                  {/* 3. Workout Consistency calendar heatmap */}
                  <WorkoutConsistencySection streak={weeklyProgress?.streak ?? 0} />

                  {/* 4. Achievements & milestones */}
                  <AchievementsSection
                    achievements={achievements}
                    completedCount={completedAchievementCount}
                    totalCount={totalAchievementCount}
                  />
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </AuroraBackground>

      <WeightEntryModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        currentWeight={resolvedCurrentWeight}
        unit={weightUnit}
        onSuccess={onRefresh}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  scrollView: {
    flex: 1,
  },
});
