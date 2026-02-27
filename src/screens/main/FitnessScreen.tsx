/**
 * FitnessScreen - World-Class Workout Tab
 *
 * REDESIGNED: Following HomeScreen pattern with modular components
 * Refactored to use useFitnessLogic hook for better maintainability.
 */

import React, { useMemo } from "react";
import { View, StyleSheet, RefreshControl, Text, Platform } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { WorkoutStartDialog } from "../../components/ui/CustomDialog";
import { ResponsiveTheme } from "../../utils/constants";
import { rh, rf, rp, rbr } from "../../utils/responsive";
import { useFitnessStore } from "../../stores/fitnessStore";
import { DayWorkout } from "../../types/ai";

// Hook
import { useFitnessLogic } from "../../hooks/useFitnessLogic";

// Modular Components
import {
  FitnessHeader,
  TodayWorkoutCard,
  WorkoutHistoryList,
  SuggestedWorkouts,
  RecoveryTipsModal,
} from "./fitness";
import { PlanSection } from "../../components/fitness/PlanSection";
import { WeeklyCalendar } from "../../components/fitness/WeeklyCalendar";
import { GuestSignUpScreen } from "./GuestSignUpScreen";

import { FitnessNavigation } from "../../hooks/useFitnessLogic";

interface FitnessScreenProps {
  navigation: FitnessNavigation;
}

export const FitnessScreen: React.FC<FitnessScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, actions, setShowGuestSignUp } = useFitnessLogic(navigation);
  const planError = useFitnessStore((s) => s.planError);

  const calendarWorkoutData = useMemo(() => {
    const data: Record<string, { hasWorkout: boolean; isCompleted: boolean; isRestDay: boolean }> = {};
    const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const restDayIndices = state.weeklyWorkoutPlan?.restDays || [];
    for (const dayKey of dayKeys) {
      const workout = state.weeklyWorkoutPlan?.workouts?.find((w) => w.dayOfWeek === dayKey);
      const dayIndex = dayKeys.indexOf(dayKey);
      const isRestDay = restDayIndices.includes(dayIndex);
      const progress = workout ? (state.workoutProgress[workout.id]?.progress ?? 0) : 0;
      data[dayKey] = {
        hasWorkout: !!workout && !isRestDay,
        isCompleted: progress === 100,
        isRestDay,
      };
    }
    return data;
  }, [state.weeklyWorkoutPlan, state.workoutProgress]);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Animated.View
          entering={Platform.OS !== 'web' ? FadeIn.duration(300) : undefined}
          style={styles.animatedContainer}
        >
          <Animated.ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={actions.handleRefresh}
                tintColor={ResponsiveTheme.colors.primary}
                colors={[ResponsiveTheme.colors.primary]}
              />
            }
          >
            {/* 1. Header */}
            <FitnessHeader
              userName={state.userName || ""}
              weekNumber={state.weeklyWorkoutPlan?.weekNumber || 1}
              totalWorkouts={state.weekStats.totalWorkouts}
              completedWorkouts={state.weekStats.completedCount}
              onCalendarPress={actions.handleCalendarPress}
            />

            {/* 1b. Weekly Calendar */}
            <WeeklyCalendar
              selectedDay={state.selectedDay}
              onDaySelect={actions.setSelectedDay}
              workoutData={calendarWorkoutData}
            />

            {/* 2. Selected Day's Workout Card (syncs with calendar selection) */}
            {state.weeklyWorkoutPlan && (
              <View style={styles.section}>
                <TodayWorkoutCard
                  workout={state.selectedDayWorkout as DayWorkout | null}
                  isRestDay={state.isSelectedDayRestDay || (!state.selectedDayWorkout && !!state.weeklyWorkoutPlan)}
                  isCompleted={state.selectedDayProgress === 100}
                  progress={state.selectedDayProgress || 0}
                  onStartWorkout={actions.handleStartSelectedDayWorkout}
                  onViewDetails={actions.handleViewWorkoutDetails}
                  onRecoveryTips={actions.handleRecoveryTips}
                  selectedDay={state.selectedDay}
                  isToday={state.isSelectedDayToday}
                />
              </View>
            )}

            {/* 3. Error State */}
            {planError && !state.weeklyWorkoutPlan && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Plan Generation Failed</Text>
                <Text style={styles.errorMessage}>{planError}</Text>
              </View>
            )}

            {/* 3. Weekly Plan Overview OR Empty State */}
            <PlanSection
              weeklyWorkoutPlan={state.weeklyWorkoutPlan}
              workoutProgress={state.workoutProgress}
              selectedDay={state.selectedDay}
              onDayPress={actions.setSelectedDay}
              onViewFullPlan={actions.handleViewFullPlan}
              onRegeneratePlan={actions.handleRegeneratePlan}
              isGeneratingPlan={state.isGeneratingPlan}
              profile={state.profile}
              onGeneratePlan={actions.generateWeeklyWorkoutPlan}
            />

            {/* 4. Workout History (from real data) */}
            <View style={styles.section}>
              <WorkoutHistoryList
                workouts={state.completedWorkouts}
                onRepeatWorkout={actions.handleRepeatWorkout}
                onDeleteWorkout={actions.handleDeleteWorkout}
                onViewWorkout={actions.handleViewHistoryWorkout}
              />
            </View>

            {/* 5. Suggested Workouts (if plan exists and has upcoming) */}
            {state.suggestedWorkouts.length > 0 && (
              <View style={styles.sectionNoHorizontalPadding}>
                <SuggestedWorkouts
                  workouts={state.suggestedWorkouts}
                  onStartWorkout={actions.handleStartSuggestedWorkout}
                />
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: insets.bottom + rh(120) }} />
          </Animated.ScrollView>
        </Animated.View>

        {/* Guest Sign Up Overlay */}
        {state.showGuestSignUp && (
          <View style={styles.guestSignUpOverlay}>
            <GuestSignUpScreen
              onBack={() => setShowGuestSignUp(false)}
              onSignUpSuccess={() => setShowGuestSignUp(false)}
            />
          </View>
        )}

        <WorkoutStartDialog
          visible={state.showWorkoutStartDialog}
          workoutTitle={state.selectedWorkout?.title || ""}
          onCancel={actions.handleWorkoutStartCancel}
          onConfirm={actions.handleWorkoutStartConfirm}
        />

        {/* Recovery Tips Modal */}
        <RecoveryTipsModal
          visible={state.showRecoveryTipsModal}
          onClose={actions.handleCloseRecoveryTips}
        />
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
    paddingBottom: rp(20),
  },
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionNoHorizontalPadding: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  errorCard: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  errorTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.error,
    marginBottom: rp(4),
  },
  errorMessage: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.error,
    lineHeight: rf(18),
  },
  guestSignUpOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
});

export default FitnessScreen;
