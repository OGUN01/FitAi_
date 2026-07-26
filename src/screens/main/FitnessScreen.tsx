/**
 * FitnessScreen - World-Class Workout Tab
 *
 * REDESIGNED: Following HomeScreen pattern with modular components
 * Refactored to use useFitnessLogic hook for better maintainability.
 */

import React, { useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Text,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import {
  WorkoutStartDialog,
} from "../../components/ui/CustomDialog";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { colors, spacing, shadows } from "../../theme/aurora-tokens";
import { hexToRgba } from "../../utils/colors";
import { rh, rf, rp, rbr } from "../../utils/responsive";
import { useFitnessStore } from "../../stores/fitnessStore";
import { DayWorkout } from "../../types/ai";
import { findCompletedSessionForWorkout } from "../../utils/workoutIdentity";
import {
  getCurrentWeekStart,
  getWeekStartForDate,
} from "../../utils/weekUtils";

// Hook
import { useFitnessLogic } from "../../hooks/useFitnessLogic";
import { useQuickWorkouts } from "../../hooks/useQuickWorkouts";

// Modular Components
import {
  FitnessHeader,
  TodayWorkoutCard,
  WorkoutHistoryList,
  SuggestedWorkouts,
  RecoveryTipsModal,
  MyWorkoutsCard,
} from "./fitness";
import { PlanSection } from "../../components/fitness/PlanSection";
import { CustomPlanEmptyState } from "../../components/fitness/CustomPlanEmptyState";
import { GuestSignUpScreen } from "./GuestSignUpScreen";
import { DeloadModal } from "../../features/workouts/components/DeloadModal";

import { FitnessNavigation } from "../../hooks/useFitnessLogic";
import type { DayName } from "../../stores/appStateStore";
import type { CompletedSession } from "../../stores/fitness/types";
import type { WeeklyWorkoutPlan } from "../../types/ai";

/** Memoized sub-component for each workout card inside the .map() loop */
interface WorkoutCardItemProps {
  workout: DayWorkout;
  index: number;
  isLast: boolean;
  completedSessions: CompletedSession[];
  weeklyWorkoutPlan: WeeklyWorkoutPlan | null;
  currentWeekStart: string;
  workoutProgress: Record<
    string,
    { progress?: number; caloriesBurned?: number; completedAt?: string }
  >;
  onStartWorkout: (workout: DayWorkout) => void;
  onViewDetails: (workout: DayWorkout) => void;
  onRecoveryTips: () => void;
  selectedDay: DayName;
  isToday: boolean;
}

const WorkoutCardItem = React.memo<WorkoutCardItemProps>(
  ({
    workout,
    index,
    isLast,
    completedSessions,
    weeklyWorkoutPlan,
    currentWeekStart,
    workoutProgress,
    onStartWorkout,
    onViewDetails,
    onRecoveryTips,
    selectedDay,
    isToday,
  }) => {
    const completedSession = findCompletedSessionForWorkout({
      completedSessions,
      workout,
      plan: weeklyWorkoutPlan,
      weekStart: currentWeekStart,
    });
    const isCompleted = !!completedSession;
    const progressEntry = workoutProgress[workout.id];
    const hasStaleCompletedProgress =
      progressEntry?.progress === 100 &&
      !!progressEntry.completedAt &&
      getWeekStartForDate(progressEntry.completedAt) !== currentWeekStart;
    const progress = isCompleted
      ? 100
      : hasStaleCompletedProgress
        ? 0
        : Math.min(progressEntry?.progress || 0, 99);
    const partialCalories =
      progressEntry?.caloriesBurned ?? completedSession?.caloriesBurned;

    // GAP-15: Derive last-performed date across all weeks for this workout title
    const lastPerformedAt = completedSessions
      .filter(
        (s) =>
          s.workoutSnapshot?.title === workout.title &&
          s.weekStart !== currentWeekStart,
      )
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      [0]?.completedAt;

    const handleStart = useCallback(
      () => onStartWorkout(workout),
      [onStartWorkout, workout],
    );
    const handleViewDetails = useCallback(
      () => onViewDetails(workout),
      [onViewDetails, workout],
    );

    return (
      <View style={{ marginBottom: isLast ? 0 : rp(spacing.md) }}>
        <TodayWorkoutCard
          workout={workout}
          isRestDay={false}
          isCompleted={isCompleted}
          progress={progress}
          displayCalories={progress > 0 ? partialCalories : undefined}
          lastPerformedAt={lastPerformedAt}
          onStartWorkout={handleStart}
          onViewDetails={handleViewDetails}
          onRecoveryTips={onRecoveryTips}
          selectedDay={selectedDay}
          isToday={isToday}
        />
      </View>
    );
  },
);

interface FitnessScreenProps {
  navigation: FitnessNavigation;
}

const FitnessScreenInner: React.FC<FitnessScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state, actions, setShowGuestSignUp } = useFitnessLogic(navigation);
  const planError = useFitnessStore((s) => s.planError);
  const quickWorkouts = useQuickWorkouts(navigation);
  const currentWeekStart = getCurrentWeekStart();

  // Dual plan state
  const activePlanSource = useFitnessStore((s) => s.activePlanSource);
  const setActivePlanSource = useFitnessStore((s) => s.setActivePlanSource);
  const customWeeklyPlan = useFitnessStore((s) => s.customWeeklyPlan);
  const getActivePlan = useFitnessStore((s) => s.getActivePlan);

  // Derive which plan to display based on toggle
  const activePlan = getActivePlan();

  const PLAN_TOGGLE_OPTIONS = useMemo(
    () => [
      { id: "ai", label: "AI Plan", value: "ai" },
      { id: "custom", label: "My Plan", value: "custom" },
    ],
    [],
  );

  // useCallback for non-map inline callbacks
  const handleRestDayStart = useCallback(
    () => actions.handleStartSelectedDayWorkout(),
    [actions],
  );
  const handleRestDayViewDetails = useCallback(
    () => actions.handleViewWorkoutDetails(),
    [actions],
  );
  const handleGuestBack = useCallback(
    () => setShowGuestSignUp(false),
    [setShowGuestSignUp],
  );
  const handleGuestSignUpSuccess = useCallback(
    () => setShowGuestSignUp(false),
    [setShowGuestSignUp],
  );

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
                refreshing={state.refreshing}
                onRefresh={actions.handleRefresh}
                tintColor={colors.primary.DEFAULT}
                colors={[colors.primary.DEFAULT]}
              />
            }
          >
            {/* 1. Header */}
            <FitnessHeader
              userName={state.userName || ""}
              weekNumber={activePlan?.weekNumber || 1}
              totalWorkouts={state.weekStats.totalWorkouts}
              completedWorkouts={state.weekStats.completedCount}
              onCalendarPress={actions.handleCalendarPress}
            />

            {/* 1.5 Plan Source Toggle */}
            <View style={styles.planToggleContainer}>
              <SegmentedControl
                options={PLAN_TOGGLE_OPTIONS}
                selectedId={activePlanSource}
                onSelect={(id) => setActivePlanSource(id as "ai" | "custom")}
              />
            </View>

            {/* 2. Selected Day's Workout Card (syncs with calendar selection) */}
            {activePlan && (
              <View style={styles.section}>
                {state.selectedDayWorkouts &&
                state.selectedDayWorkouts.length > 0 ? (
                  state.selectedDayWorkouts.map(
                    (workout: DayWorkout, index: number) => (
                      <WorkoutCardItem
                        key={workout.id || index}
                        workout={workout}
                        index={index}
                        isLast={index === state.selectedDayWorkouts.length - 1}
                        completedSessions={state.completedSessions}
                        weeklyWorkoutPlan={activePlan}
                        currentWeekStart={currentWeekStart}
                        workoutProgress={state.workoutProgress}
                        onStartWorkout={actions.handleStartSelectedDayWorkout}
                        onViewDetails={actions.handleViewWorkoutDetails}
                        onRecoveryTips={actions.handleRecoveryTips}
                        selectedDay={state.selectedDay}
                        isToday={state.isSelectedDayToday}
                      />
                    ),
                  )
                ) : (
                  <TodayWorkoutCard
                    workout={null}
                    isRestDay={state.isSelectedDayRestDay}
                    isCompleted={false}
                    progress={0}
                    onStartWorkout={handleRestDayStart}
                    onViewDetails={handleRestDayViewDetails}
                    onRecoveryTips={actions.handleRecoveryTips}
                    selectedDay={state.selectedDay}
                    isToday={state.isSelectedDayToday}
                  />
                )}
              </View>
            )}

            {/* Custom Plan Empty State */}
            {activePlanSource === "custom" && !customWeeklyPlan && (
              <View style={styles.section}>
                <CustomPlanEmptyState
                  onBuildSchedule={() =>
                    navigation.navigate("BuildMethodLanding")
                  }
                  onBrowseTemplates={() =>
                    navigation.navigate("TemplateLibrary")
                  }
                />
              </View>
            )}

            {/* 3. Error State — shown whenever a plan error exists so
                regeneration failures surface even when a plan is present. */}
            {planError && (
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <Ionicons
                    name="alert-circle"
                    size={rf(20)}
                    color={colors.error.DEFAULT}
                  />
                  <Text style={styles.errorTitle}>Plan Generation Failed</Text>
                </View>
                <Text style={styles.errorMessage}>{planError}</Text>
                <AnimatedPressable
                  onPress={actions.handleRegeneratePlan}
                  scaleValue={0.96}
                  hapticFeedback={true}
                  hapticType="medium"
                  style={styles.errorRetryButton}
                  accessibilityRole="button"
                  accessibilityLabel="Retry plan generation"
                >
                  <Ionicons
                    name="refresh"
                    size={rf(14)}
                    color={colors.text.primary}
                  />
                  <Text style={styles.errorRetryText}>Retry</Text>
                </AnimatedPressable>
              </View>
            )}

            {/* 3. Weekly Plan Overview OR Empty State (AI plan only — custom plan has its own CTA above) */}
            {activePlanSource === "ai" && (
              <PlanSection
                weeklyWorkoutPlan={activePlan}
                workoutProgress={state.workoutProgress}
                selectedDay={state.selectedDay}
                onDayPress={actions.setSelectedDay}
                onViewFullPlan={actions.handleViewFullPlan}
                onRegeneratePlan={actions.handleRegeneratePlan}
                isGeneratingPlan={state.isGeneratingPlan}
                profile={state.profile}
                onGeneratePlan={actions.generateWeeklyWorkoutPlan}
              />
            )}

            {/* My Workouts library summary — replaces the old simple button.
                testID `template-library-button` is preserved on the card's
                tappable area (see MyWorkoutsCard). */}
            <View style={styles.section}>
              <MyWorkoutsCard navigation={navigation} />
            </View>

            {/* 4. Workout History (from real data) */}
            <View style={styles.section}>
              <WorkoutHistoryList
                workouts={state.completedWorkouts}
                onRepeatWorkout={actions.handleRepeatWorkout}
                onDeleteWorkout={actions.handleDeleteWorkout}
                onViewWorkout={actions.handleViewHistoryWorkout}
              />
            </View>

            {/* 5. Quick Workouts (shown only when today's planned workout is done) */}
            {quickWorkouts.isVisible && (
              <View style={styles.sectionNoHorizontalPadding}>
                <SuggestedWorkouts
                  workouts={quickWorkouts.suggestions}
                  onStartWorkout={quickWorkouts.startQuickWorkout}
                  onResumeWorkout={quickWorkouts.resumeQuickWorkout}
                  getTemplateStatus={quickWorkouts.getTemplateStatus}
                  getCompletedCalories={quickWorkouts.getCompletedCalories}
                  isGenerating={quickWorkouts.isGenerating}
                />
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: insets.bottom + rh(120) }} />
          </Animated.ScrollView>
        </Animated.View>

        <WorkoutStartDialog
          visible={state.showWorkoutStartDialog}
          workoutTitle={state.selectedWorkout?.title || ""}
          isResuming={
            state.selectedWorkout?.isResuming ??
            (state.selectedWorkout?.resumeExerciseIndex ?? 0) > 0
          }
          onCancel={actions.handleWorkoutStartCancel}
          onConfirm={actions.handleWorkoutStartConfirm}
        />

        {/* Guest Sign Up Overlay — rendered last so it sits above all other
            overlays (incl. WorkoutStartDialog) without relying on zIndex
            stacking alone. */}
        {state.showGuestSignUp && (
          <View style={styles.guestSignUpOverlay}>
            <GuestSignUpScreen
              onBack={handleGuestBack}
              onSignUpSuccess={handleGuestSignUpSuccess}
            />
          </View>
        )}

        {/* Recovery Tips Modal */}
        <RecoveryTipsModal
          visible={state.showRecoveryTipsModal}
          onClose={actions.handleCloseRecoveryTips}
        />

        {/* Workout Details — Phase 8: now a full screen (WorkoutDetailScreen)
            registered as the `workoutDetailSession` overlay. The legacy
            WorkoutDetailsDialog modal was removed; handleViewWorkoutDetails
            navigates to "WorkoutDetail". The `workoutDetailsWorkout` state is
            retained for callers that read it, but no modal is rendered here. */}

        {state.proactiveDeload && (
          <DeloadModal
            visible={state.proactiveDeload.visible}
            variant="proactive"
            message={state.proactiveDeload.message}
            onAccept={actions.dismissProactiveDeload}
            onDismiss={actions.dismissProactiveDeload}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

export const FitnessScreen = React.memo(FitnessScreenInner);

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
    paddingBottom: rp(20),
  },
  section: {
    paddingHorizontal: rp(spacing.lg),
    marginBottom: rp(spacing.lg),
  },
  sectionNoHorizontalPadding: {
    marginBottom: rp(spacing.lg),
  },
  errorCard: {
    marginHorizontal: rp(spacing.lg),
    marginBottom: rp(spacing.lg),
    padding: rp(spacing.md),
    backgroundColor: hexToRgba(colors.error.DEFAULT, 0.12),
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: hexToRgba(colors.error.DEFAULT, 0.35),
    ...shadows.level2,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(4),
  },
  errorTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.error.DEFAULT,
    flex: 1,
  },
  errorMessage: {
    fontSize: rf(13),
    color: colors.error.DEFAULT,
    lineHeight: rf(18),
  },
  errorRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    borderRadius: rbr(8),
    backgroundColor: colors.error.DEFAULT,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  errorRetryText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.text.primary,
  },
  guestSignUpOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
  planToggleContainer: {
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.xs),
    marginBottom: rp(12),
  },
});

export default FitnessScreen;
