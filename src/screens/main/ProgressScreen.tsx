import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { AuroraSpinner } from '../../components/ui/aurora/AuroraSpinner';
import { ResponsiveTheme } from '../../utils/constants';
import { rh } from '../../utils/responsive';

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
    fadeAnim,
    slideAnim,
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

  const combinedError = progressError || analysisError || statsError;

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
              contentContainerStyle={{ paddingBottom: rh(120) }}
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
              <ProgressHeader
                navigation={navigation}
                trackBStatus={trackBStatus}
                showAnalytics={false}
                setShowAnalytics={() => {}}
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
                progressEntriesLength={progressEntries.length}
                onRefresh={onRefresh}
                onAddEntry={() => setShowWeightModal(true)}
              />

              {(isAuthenticated || hasCalculatedMetrics) && !progressError && (
                <>
                  {/* 1. Hero: Weight Journey with interactive chart */}
                  <WeightJourneySection
                    weightHistory={weightHistory}
                    progressEntries={progressEntries}
                    calculatedMetrics={calculatedMetrics}
                    onLogWeight={() => setShowWeightModal(true)}
                    unit={weightUnit}
                  />

                  {/* 2. Goal Progress — am I getting closer? */}
                  <GoalProgressSection
                    progressStats={progressStats}
                    calculatedMetrics={calculatedMetrics}
                    weeklyProgress={weeklyProgress}
                    weightHistory={weightHistory}
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
        currentWeight={progressStats?.weightChange?.current}
        unit={weightUnit}
        onSuccess={onRefresh}
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
});
