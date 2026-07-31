/**
 * FitnessScreen - World-Class Workout Tab
 *
 * REDESIGNED: Following HomeScreen pattern with modular components
 * Refactored to use useFitnessLogic hook for better maintainability.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { DetentBottomSheet } from '../../components/ui/aurora/DetentBottomSheet';
import { GlassButton } from '../../components/ui/aurora/GlassButton';
import { Pill } from '../../components/onboarding/fresh/Pill';
import { colors, spacing, shadows } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { rh, rf, rp, rbr } from '../../utils/responsive';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PaywallModal from '../../components/subscription/PaywallModal';
import { DayWorkout, WeeklyWorkoutPlan } from '../../types/ai';
import { findCompletedSessionForWorkout } from '../../utils/workoutIdentity';
import { getCurrentWeekStart, getWeekStartForDate } from '../../utils/weekUtils';

// Hook
import { useFitnessLogic, FitnessNavigation } from '../../hooks/useFitnessLogic';
import { useQuickWorkouts } from '../../hooks/useQuickWorkouts';

// Modular Components
import {
  FitnessHeader,
  TodayWorkoutCard,
  WorkoutHistoryList,
  SuggestedWorkouts,
  RecoveryTipsModal,
  MyWorkoutsCard,
} from './fitness';
import { WeekProgressCard } from './fitness/WeekProgressCard';
import { PlanSection } from '../../components/fitness/PlanSection';
import { CustomPlanEmptyState } from '../../components/fitness/CustomPlanEmptyState';
import { GuestSignUpScreen } from './GuestSignUpScreen';
import { DeloadModal } from '../../features/workouts/components/DeloadModal';

import type { DayName } from '../../stores/appStateStore';
import type { CompletedSession } from '../../stores/fitness/types';

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
    index: _index,
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
    const partialCalories = progressEntry?.caloriesBurned ?? completedSession?.caloriesBurned;

    // GAP-15: Derive last-performed date across all weeks for this workout title
    const lastPerformedAt = completedSessions
      .filter((s) => s.workoutSnapshot?.title === workout.title && s.weekStart !== currentWeekStart)
      .sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0]?.completedAt;

    const handleStart = useCallback(() => onStartWorkout(workout), [onStartWorkout, workout]);
    const handleViewDetails = useCallback(() => onViewDetails(workout), [onViewDetails, workout]);

    return (
      <View style={{ marginBottom: isLast ? 0 : rp(spacing.md) }}>
        <TodayWorkoutCard
          workout={workout}
          isRestDay={false}
          isCompleted={isCompleted}
          progress={progress}
          displayCalories={progress > 0 ? partialCalories : undefined}
          lastPerformedAt={lastPerformedAt}
          completedAt={completedSession?.completedAt}
          onStartWorkout={handleStart}
          onViewDetails={handleViewDetails}
          onRecoveryTips={onRecoveryTips}
          selectedDay={selectedDay}
          isToday={isToday}
        />
      </View>
    );
  }
);

interface FitnessScreenProps {
  navigation: FitnessNavigation;
}

const FitnessScreenInner: React.FC<FitnessScreenProps> = ({ navigation }) => {
  const { state, actions, setShowGuestSignUp } = useFitnessLogic(navigation);
  const planError = useFitnessStore((s) => s.planError);
  const setPlanError = useFitnessStore((s) => s.setPlanError);
  const hasHydrated = useFitnessStore((s) => s._hasHydrated);
  const quickWorkouts = useQuickWorkouts(navigation);
  const currentWeekStart = getCurrentWeekStart();

  // Dual plan state
  const activePlanSource = useFitnessStore((s) => s.activePlanSource);
  const setActivePlanSource = useFitnessStore((s) => s.setActivePlanSource);
  const customWeeklyPlan = useFitnessStore((s) => s.customWeeklyPlan);
  const getActivePlan = useFitnessStore((s) => s.getActivePlan);

  // Paywall: AI-generation gate fires triggerPaywall() from this tab
  // (useFitnessLogic.generateWeeklyWorkoutPlan), but no PaywallModal was
  // mounted here — the CTA looked dead for exhausted guests. DietScreen and
  // AnalyticsScreen mount their own; do the same (audit w-qa).
  const showPaywall = useSubscriptionStore((s) => s.showPaywall);
  const paywallReason = useSubscriptionStore((s) => s.paywallReason);
  const dismissPaywall = useSubscriptionStore((s) => s.dismissPaywall);

  // Derive which plan to display based on toggle
  const activePlan = getActivePlan();

  const PLAN_TOGGLE_OPTIONS = useMemo(
    () => [
      { id: 'ai', label: 'AI Plan', value: 'ai' },
      { id: 'custom', label: 'My Plan', value: 'custom' },
    ],
    []
  );

  // Weekly progress for WeekProgressCard — mirrors the stats computation
  // previously inside WeeklyPlanOverview's stats row, now hoisted here so the
  // ring card can render it above the plan toggle. Uses the active plan
  // (AI or custom) so the numbers reflect whichever plan the user is viewing.
  const weekProgress = useMemo(() => {
    const plan = activePlan;
    const totalWorkouts = plan?.workouts?.length || 0;
    const currentPlanIds = new Set((plan?.workouts || []).map((w) => w.id));
    const completedPlannedSessions = state.completedSessions.filter(
      (session) =>
        session.type === 'planned' &&
        session.weekStart === currentWeekStart &&
        currentPlanIds.has(session.workoutId)
    );
    const completedWorkoutIds = new Set(
      completedPlannedSessions.map((session) => session.workoutId)
    );
    const completedWorkouts = completedWorkoutIds.size;
    const completedCalories = completedPlannedSessions.reduce(
      (sum, session) => sum + (session.caloriesBurned ?? 0),
      0
    );
    // Burned-only (audit #9): mixing in estimated calories for remaining
    // workouts presented a pure estimate as fact on Monday morning. Calories
    // SSOT = actual burned values from completed sessions.
    const weeklyCalories = completedCalories;
    const progressPercent =
      totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
    return {
      weekNumber: plan?.weekNumber || 1,
      totalWorkouts,
      completedWorkouts,
      weeklyCalories,
      progressPercent,
    };
  }, [activePlan, state.completedSessions, currentWeekStart]);

  // useCallback for non-map inline callbacks
  const handleRestDayStart = useCallback(() => actions.handleStartSelectedDayWorkout(), [actions]);
  const handleRestDayViewDetails = useCallback(() => actions.handleViewWorkoutDetails(), [actions]);
  const handleGuestBack = useCallback(() => setShowGuestSignUp(false), [setShowGuestSignUp]);
  const handleGuestSignUpSuccess = useCallback(
    () => setShowGuestSignUp(false),
    [setShowGuestSignUp]
  );

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
                tintColor={colors.primary.DEFAULT}
                colors={[colors.primary.DEFAULT]}
              />
            }
          >
            {/* 1. Header */}
            <FitnessHeader
              userName={state.userName || ''}
              onCalendarPress={actions.handleCalendarPress}
            />

            {/* 1.5 Week Progress Ring Card — single source of truth for weekly stats.
                Hidden until hydration completes and a plan exists: a 0/0 dead ring
                above the generate CTA is worse than nothing (audit #1, #13). */}
            {hasHydrated && activePlan && (
              <View style={styles.section}>
                <WeekProgressCard
                  weekNumber={weekProgress.weekNumber}
                  completedWorkouts={weekProgress.completedWorkouts}
                  totalWorkouts={weekProgress.totalWorkouts}
                  weeklyCalories={weekProgress.weeklyCalories}
                  progressPercent={weekProgress.progressPercent}
                />
              </View>
            )}

            {/* 1.6 Plan Source Toggle — no subtitle per spec §6.4.
                Editorial Dark: option sets of 4 or fewer use fresh/Pill. */}
            <View style={styles.planToggleContainer}>
              {PLAN_TOGGLE_OPTIONS.map((opt) => (
                <Pill
                  key={opt.id}
                  label={opt.label}
                  selected={activePlanSource === opt.id}
                  onPress={() => setActivePlanSource(opt.id as 'ai' | 'custom')}
                  testID={`plan-toggle-${opt.id}`}
                />
              ))}
            </View>

            {/* 2. Selected Day's Workout Card (syncs with calendar selection) */}
            {activePlan && (
              <View style={styles.section}>
                {state.selectedDayWorkouts && state.selectedDayWorkouts.length > 0 ? (
                  state.selectedDayWorkouts.map((workout: DayWorkout, index: number) => (
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
                  ))
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

            {/* 3. Weekly Plan Overview OR Empty State.
                AI source: plan strip or generate empty state. Custom source WITH a
                plan: same week strip (audit #4 — custom users previously had no day
                selector at all), regenerate omitted (AI-only action).
                Gated on hydration so returning users never see the "Generate AI Workout"
                empty state flash before the persisted plan loads (audit #13). */}
            {hasHydrated &&
              (activePlanSource === 'ai' ||
                (activePlanSource === 'custom' && customWeeklyPlan)) && (
                <PlanSection
                  weeklyWorkoutPlan={activePlan}
                  workoutProgress={state.workoutProgress}
                  selectedDay={state.selectedDay}
                  onDayPress={actions.setSelectedDay}
                  onViewFullPlan={actions.handleViewFullPlan}
                  onRegeneratePlan={
                    activePlanSource === 'ai' ? actions.handleRegeneratePlan : undefined
                  }
                  isGeneratingPlan={state.isGeneratingPlan}
                  profile={state.profile}
                  onGeneratePlan={actions.generateWeeklyWorkoutPlan}
                />
              )}

            {/* 3.4 Custom plan edit affordance (audit #12) — with a custom plan
                active there was no path back to the builder once the empty state
                unmounted. Slim text CTA under the week strip. */}
            {activePlanSource === 'custom' && customWeeklyPlan && (
              <View style={styles.section}>
                <AnimatedPressable
                  onPress={() => navigation.navigate('WeeklyBuilder')}
                  scaleValue={0.97}
                  hapticFeedback={true}
                  hapticType="light"
                  style={styles.editScheduleButton}
                  accessibilityRole="button"
                  accessibilityLabel="Edit schedule"
                >
                  <Ionicons name="create-outline" size={rf(16)} color={colors.primary.DEFAULT} />
                  <Text style={styles.editScheduleText}>Edit Schedule</Text>
                  <Ionicons name="chevron-forward" size={rf(16)} color={colors.text.secondary} />
                </AnimatedPressable>
              </View>
            )}

            {/* 3.5 Quick Workouts — shown only when today's planned workout is done.
                Hoisted from the page bottom: post-completion is the highest-intent
                moment, suggestions belong directly under the today card (audit #10). */}
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

            {/* 3.6 Plan error — anchored under the plan section it belongs to,
                AI-source only (retry regenerates the AI plan), with dismiss (audit #7). */}
            {planError && activePlanSource === 'ai' && (
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <Ionicons name="alert-circle" size={rf(20)} color={colors.error.DEFAULT} />
                  <Text style={styles.errorTitle}>Plan Generation Failed</Text>
                  <AnimatedPressable
                    onPress={() => setPlanError(null)}
                    scaleValue={0.92}
                    hapticFeedback={true}
                    hapticType="light"
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss plan error"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={rf(18)} color={colors.text.secondary} />
                  </AnimatedPressable>
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
                  <Ionicons name="refresh" size={rf(14)} color={colors.text.primary} />
                  <Text style={styles.errorRetryText}>Retry</Text>
                </AnimatedPressable>
              </View>
            )}

            {/* 4. My Workouts library summary — replaces the old simple button.
                testID `template-library-button` is preserved on the card's
                tappable area (see MyWorkoutsCard).
                Hidden on the custom-plan empty path: with no custom plan AND no
                completed sessions, MyWorkoutsCard's "No Workouts Yet" empty
                state stacks under CustomPlanEmptyState's "No Custom Schedule" —
                two near-identical empty cards competing for the same intent.
                CustomPlanEmptyState is the stronger CTA (Build Schedule), so it
                carries the screen; MyWorkoutsCard returns once sessions exist. */}
            {!(activePlanSource === 'custom' && !customWeeklyPlan) && (
              <View style={styles.section}>
                <MyWorkoutsCard
                  navigation={navigation}
                  onStartWorkout={actions.handleStartSelectedDayWorkout}
                />
              </View>
            )}

            {/* Custom Plan Empty State */}
            {activePlanSource === 'custom' && !customWeeklyPlan && (
              <View style={styles.section}>
                <CustomPlanEmptyState
                  onBuildSchedule={() => navigation.navigate('BuildMethodLanding')}
                  onBrowseTemplates={() => navigation.navigate('TemplateLibrary')}
                />
              </View>
            )}

            {/* 5. Workout History (from real data). Hidden when empty — with zero
                completed workouts the MyWorkoutsCard empty state already carries the
                "start your first workout" CTA; two identical empty cards back to back
                is worse than one (audit #5). */}
            {state.completedWorkouts.length > 0 && (
              <View style={styles.section}>
                <WorkoutHistoryList
                  workouts={state.completedWorkouts}
                  onRepeatWorkout={actions.handleRepeatWorkout}
                  onDeleteWorkout={actions.handleDeleteWorkout}
                  onViewWorkout={actions.handleViewHistoryWorkout}
                  onSeeAll={() => navigation.navigate('WorkoutHistory')}
                />
              </View>
            )}

            {/* Bottom Spacing — SafeAreaView already applies the bottom inset via
                edges=['top','bottom']; only the tab-bar offset is needed (audit #14). */}
            <View style={{ height: rh(120) }} />
          </Animated.ScrollView>
        </Animated.View>

        {/* Workout start confirmation — bottom sheet per Editorial Dark
            (thumb-reachable, swipe-dismissible) instead of a centered dialog. */}
        <DetentBottomSheet
          visible={state.showWorkoutStartDialog}
          onClose={actions.handleWorkoutStartCancel}
          snapPoints={[0.35, 0.5]}
          initialSnapIndex={1}
          testID="workout-start-sheet"
        >
          <View style={styles.startSheetBody}>
            <View
              style={[
                styles.startSheetIcon,
                { backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.12) },
              ]}
            >
              <Ionicons name="barbell" size={rf(28)} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.startSheetTitle}>
              {state.selectedWorkout?.isResuming ??
              (state.selectedWorkout?.resumeExerciseIndex ?? 0) > 0
                ? 'Resume Workout?'
                : 'Start Workout'}
            </Text>
            <Text style={styles.startSheetMessage}>
              {state.selectedWorkout?.isResuming ??
              (state.selectedWorkout?.resumeExerciseIndex ?? 0) > 0
                ? `Pick up "${state.selectedWorkout?.title || ''}" where you left off?`
                : // Guard: no workout selected (e.g. empty-plan "Start a workout")
                  // rendered a bare `""` — fall back to generic copy.
                  state.selectedWorkout?.title
                  ? `"${state.selectedWorkout.title}" — ready when you are.`
                  : 'Ready when you are.'}
            </Text>
            <View style={styles.startSheetActions}>
              <GlassButton
                label="Cancel"
                onPress={actions.handleWorkoutStartCancel}
                variant="secondary"
                hapticType="light"
                style={styles.startSheetBtn}
                testID="workout-start-cancel"
              />
              <GlassButton
                label={
                  state.selectedWorkout?.isResuming ??
                  (state.selectedWorkout?.resumeExerciseIndex ?? 0) > 0
                    ? 'Resume'
                    : 'Begin Workout'
                }
                onPress={actions.handleWorkoutStartConfirm}
                variant="primary"
                hapticType="medium"
                style={styles.startSheetBtn}
                testID="workout-start-confirm"
              />
            </View>
          </View>
        </DetentBottomSheet>

        {/* Guest Sign Up Overlay — rendered last so it sits above all other
            overlays (incl. the workout-start sheet) without relying on zIndex
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

        {/* Subscription paywall for AI-generation limit — mounted here because
            this tab is the source of triggerPaywall() for workout plans. */}
        {showPaywall && (
          <PaywallModal
            visible={showPaywall}
            reason={paywallReason ?? undefined}
            onClose={dismissPaywall}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    marginBottom: rp(4),
  },
  errorTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.error.DEFAULT,
    flex: 1,
  },
  errorMessage: {
    fontSize: rf(13),
    color: colors.error.DEFAULT,
    lineHeight: rf(18),
  },
  errorRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
    marginTop: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    borderRadius: rbr(8),
    backgroundColor: colors.error.DEFAULT,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  errorRetryText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.text.primary,
  },
  guestSignUpOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
  planToggleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.xs),
    marginBottom: rp(spacing.lg),
  },
  startSheetBody: {
    alignItems: 'center',
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.lg),
  },
  startSheetIcon: {
    width: rp(56),
    height: rp(56),
    borderRadius: rbr(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rp(spacing.md),
  },
  startSheetTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: rp(spacing.xs),
  },
  startSheetMessage: {
    fontSize: rf(14),
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: rp(spacing.lg),
  },
  startSheetActions: {
    flexDirection: 'row',
    gap: rp(spacing.sm),
    width: '100%',
  },
  startSheetBtn: {
    flex: 1,
  },
  editScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
    minHeight: 48,
    borderRadius: rbr(12),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.1),
  },
  editScheduleText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
});

export default FitnessScreen;
