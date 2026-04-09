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
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import {
  WorkoutStartDialog,
  WorkoutDetailsDialog,
} from "../../components/ui/CustomDialog";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ResponsiveTheme } from "../../utils/constants";
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
} from "./fitness";
import { PlanSection } from "../../components/fitness/PlanSection";
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
      <View style={{ marginBottom: isLast ? 0 : 16 }}>
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

  // ========== SCREEN DEBUG LOG ==========
  React.useEffect(() => {
    console.warn(`\n${'='.repeat(60)}`);
    console.warn(`🏋️ [SCREEN DEBUG] FitnessScreen MOUNTED`);
    console.warn(`${'='.repeat(60)}`);
    console.warn(`📋 Has Plan: ${!!state.weeklyWorkoutPlan} | Plan Error: ${planError || 'None'}`);
    console.warn(`📅 Selected Day: ${state.selectedDay} | Is Generating: ${state.isGeneratingPlan}`);
    console.warn(`📊 Completed Sessions: ${state.completedSessions?.length || 0}`);
    console.warn(`💪 Workout Progress Keys: [${Object.keys(state.workoutProgress || {}).join(', ')}]`);
    console.warn(`${'='.repeat(60)}\n`);
  }, []);

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

  const calendarWorkoutData = useMemo(() => {
    const data: Record<
      string,
      { hasWorkout: boolean; isCompleted: boolean; isRestDay: boolean }
    > = {};
    const dayKeys = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const restDayIndices = activePlan?.restDays || [];
    for (const dayKey of dayKeys) {
      const workout = activePlan?.workouts?.find(
        (w) => w.dayOfWeek === dayKey,
      );
      const dayIndex = dayKeys.indexOf(dayKey);
      // Handle both number indices (Monday=0) and string day names from AI
      const isRestDay = restDayIndices.some((d: number | string) =>
        typeof d === "string" ? d === dayKey : d === dayIndex,
      );
      const completedSession = workout
        ? findCompletedSessionForWorkout({
            completedSessions: state.completedSessions,
            workout,
            plan: activePlan,
            weekStart: currentWeekStart,
          })
        : null;
      data[dayKey] = {
        hasWorkout: !!workout && !isRestDay,
        isCompleted: !!completedSession,
        isRestDay,
      };
    }
    return data;
  }, [
    activePlan,
    state.workoutProgress,
    state.completedSessions,
    currentWeekStart,
  ]);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
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
                tintColor={ResponsiveTheme.colors.primary}
                colors={[ResponsiveTheme.colors.primary]}
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
                <Pressable
                  style={styles.customPlanCta}
                  onPress={() => navigation.navigate("ScheduleBuilder")}
                  testID="build-custom-schedule-button"
                >
                  <Text style={styles.customPlanCtaTitle}>
                    No Custom Schedule Yet
                  </Text>
                  <Text style={styles.customPlanCtaSubtitle}>
                    Build your own weekly workout schedule with your saved
                    templates or pick exercises for each day.
                  </Text>
                  <Text style={styles.customPlanCtaAction}>
                    Build My Schedule →
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 3. Error State */}
            {planError && !activePlan && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Plan Generation Failed</Text>
                <Text style={styles.errorMessage}>{planError}</Text>
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

            {/* Custom Workouts entry point */}
            <View style={styles.section}>
              <Pressable
                style={styles.templateLibraryButton}
                onPress={() => navigation.navigate("TemplateLibrary")}
                testID="template-library-button"
              >
                <Text style={styles.templateLibraryText}>My Workouts</Text>
                <Text style={styles.templateLibraryArrow}>→</Text>
              </Pressable>
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
                  isGenerating={quickWorkouts.isGenerating}
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
              onBack={handleGuestBack}
              onSignUpSuccess={handleGuestSignUpSuccess}
            />
          </View>
        )}

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

        {/* Recovery Tips Modal */}
        <RecoveryTipsModal
          visible={state.showRecoveryTipsModal}
          onClose={actions.handleCloseRecoveryTips}
        />

        {/* Workout Details Modal */}
        <WorkoutDetailsDialog
          visible={!!state.workoutDetailsWorkout}
          title={state.workoutDetailsWorkout?.title ?? ""}
          description={state.workoutDetailsWorkout?.description}
          duration={state.workoutDetailsWorkout?.duration ?? 0}
          calories={
            state.workoutDetailsWorkout
              ? (state.workoutProgress[state.workoutDetailsWorkout.id]
                  ?.caloriesBurned ??
                findCompletedSessionForWorkout({
                  completedSessions: state.completedSessions,
                  workout: state.workoutDetailsWorkout,
                  plan: state.weeklyWorkoutPlan,
                  weekStart: currentWeekStart,
                })?.caloriesBurned ??
                state.workoutDetailsWorkout.estimatedCalories)
              : undefined
          }
          exerciseCount={state.workoutDetailsWorkout?.exercises?.length ?? 0}
          onClose={actions.handleCloseWorkoutDetails}
        />

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
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  templateLibraryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    borderRadius: rbr(12),
    paddingVertical: rp(14),
    paddingHorizontal: rp(16),
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  templateLibraryText: {
    fontSize: rf(15),
    fontWeight: "600" as const,
    color: "#4CAF50",
  },
  templateLibraryArrow: {
    fontSize: rf(18),
    color: "#4CAF50",
  },
  planToggleContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: rp(12),
  },
  customPlanCta: {
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderRadius: rbr(16),
    padding: rp(20),
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.2)",
    borderStyle: "dashed" as const,
    alignItems: "center" as const,
  },
  customPlanCtaTitle: {
    fontSize: rf(16),
    fontWeight: "700" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(8),
  },
  customPlanCtaSubtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: rf(18),
    marginBottom: rp(12),
  },
  customPlanCtaAction: {
    fontSize: rf(15),
    fontWeight: "600" as const,
    color: "#4CAF50",
  },
});

export default FitnessScreen;
