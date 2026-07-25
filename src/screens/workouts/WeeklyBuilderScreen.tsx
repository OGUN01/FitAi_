/**
 * WeeklyBuilderScreen — premium weekly schedule builder (Phase 3).
 *
 * Replaces ScheduleBuilderScreen in routing. Full-screen AuroraBackground
 * theme="space" with:
 *  - GlassHeader: back chevron + "Weekly Schedule" title
 *  - SegmentedControl day picker (Mon–Sun) at top — default to SegmentedControl
 *    to avoid Phase 1 MagneticTabIndicator dep.
 *  - 7 DayBlock components in a ScrollView (v1; FlatList swap-in later)
 *  - Floating BuilderSummaryFooter at bottom (sticky)
 *
 * On mount: hydrateFromCustomPlan().
 * Save button (footer): save() + confetti + navigate back.
 * Back button: if draftDirty, show CustomDialog "Discard changes?" — only
 * discard on confirm.
 *
 * Uses useMoveExerciseBetweenDays for cross-day exercise drag (the hook is
 * available in handlers.ts; v1 ships within-day reorder via ExerciseRow's
 * useDragToReorder, and the cross-day hook is available for Phase 8 polish
 * wiring once DayBlock layout rects are measured).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AuroraBackground, GlassHeader } from "../../components/ui/aurora";
import { SegmentedControl, SegmentOption } from "../../components/ui/SegmentedControl";
import { CustomDialog } from "../../components/ui/CustomDialog";
import { DayBlock } from "../../components/fitness/builder/DayBlock";
import { ExercisePickerSheet } from "../../components/fitness/builder/ExercisePickerSheet";
import { ExerciseEditorSheet } from "../../components/fitness/builder/ExerciseEditorSheet";
import { BuilderSummaryFooter } from "../../components/fitness/builder/BuilderSummaryFooter";
import { InlineValidationBanner } from "../../components/fitness/builder/InlineValidationBanner";
import { WeeklyInsightsPanel } from "../../components/fitness/builder/WeeklyInsightsPanel";
import { useWorkoutBuilderStore, DAYS_OF_WEEK } from "../../stores/workoutBuilderStore";
import { useProfileStore } from "../../stores/profileStore";
import { validatePlan, type ValidationProfile } from "../../services/builderValidationService";
import { usePullToRefresh } from "../../gestures/handlers";
import { haptics } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const DAY_SEGMENT_OPTIONS: SegmentOption[] = DAYS_OF_WEEK.map((day, i) => ({
  id: String(i),
  label: day.slice(0, 3).toUpperCase(),
  value: i,
}));

export default function WeeklyBuilderScreen({ navigation }: Props) {
  // ── Store subscriptions ──
  const draft = useWorkoutBuilderStore((s) => s.draft);
  const draftDirty = useWorkoutBuilderStore((s) => s.draftDirty);
  const expandedDayIndex = useWorkoutBuilderStore((s) => s.expandedDayIndex);
  const selectedDayIndex = useWorkoutBuilderStore((s) => s.selectedDayIndex);

  const hydrateFromCustomPlan = useWorkoutBuilderStore((s) => s.hydrateFromCustomPlan);
  const setExpandedDay = useWorkoutBuilderStore((s) => s.setExpandedDay);
  const setSelectedDay = useWorkoutBuilderStore((s) => s.setSelectedDay);
  const openPicker = useWorkoutBuilderStore((s) => s.openPicker);
  const openEditor = useWorkoutBuilderStore((s) => s.openEditor);
  const addExercise = useWorkoutBuilderStore((s) => s.addExercise);
  const removeExercise = useWorkoutBuilderStore((s) => s.removeExercise);
  const duplicateExercise = useWorkoutBuilderStore((s) => s.duplicateExercise);
  const reorderExercise = useWorkoutBuilderStore((s) => s.reorderExercise);
  const duplicateDay = useWorkoutBuilderStore((s) => s.duplicateDay);
  const clearDay = useWorkoutBuilderStore((s) => s.clearDay);
  const updateDay = useWorkoutBuilderStore((s) => s.updateDay);
  const computeInsights = useWorkoutBuilderStore((s) => s.computeInsights);
  const setValidationWarnings = useWorkoutBuilderStore((s) => s.setValidationWarnings);
  const discard = useWorkoutBuilderStore((s) => s.discard);

  // ── User weight (for insights calorie calc) ──
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const userWeightKg = bodyAnalysis?.current_weight_kg ?? null;

  // ── Safety profile (for validation's safety_constraint checks) ──
  // Derived from BodyAnalysisData (pregnancy / injuries / medical conditions).
  // Memoized so the validation effect's dependency only changes when the
  // underlying values actually change (not on every bodyAnalysis reference swap).
  const safetyProfile = useMemo<ValidationProfile | null>(() => {
    if (!bodyAnalysis) return null;
    return {
      pregnancyStatus: bodyAnalysis.pregnancy_status ?? undefined,
      pregnancyTrimester: bodyAnalysis.pregnancy_trimester,
      injuries: bodyAnalysis.physical_limitations,
      medicalConditions: bodyAnalysis.medical_conditions,
    };
  }, [bodyAnalysis]);

  // ── Scroll refs for jump-to-day ──
  const scrollRef = useRef<ScrollView>(null);
  const dayBlockOffsets = useRef<number[]>([]);

  // ── Mount: hydrate ──
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrateFromCustomPlan().catch((err) => {
      console.error("[WeeklyBuilderScreen] hydrate failed:", err);
    });
  }, [hydrateFromCustomPlan]);

  // Recompute insights when user weight becomes available (after hydration)
  useEffect(() => {
    if (!draft || userWeightKg == null) return;
    computeInsights(userWeightKg).catch(() => {
      /* logged in store */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userWeightKg]);

  // ── Validation: re-run on every draft change + when safety profile changes ──
  // The store fires computeInsights on every mutation (insights panel reads
  // that), but validation warnings are a separate concern — we compute them
  // here and push to the store so InlineValidationBanner can subscribe.
  useEffect(() => {
    if (!draft) {
      setValidationWarnings([]);
      return;
    }
    try {
      const warnings = validatePlan(draft, { profile: safetyProfile });
      setValidationWarnings(warnings);
    } catch (err) {
      console.error("[WeeklyBuilderScreen] validatePlan failed:", err);
      setValidationWarnings([]);
    }
  }, [draft, safetyProfile, setValidationWarnings]);

  // Ensure insights compute on mount once a hydrated draft is present. The
  // store's mutations (addExercise, removeExercise, etc.) already call
  // computeInsights, and hydrateFromCustomPlan kicks it on hydrate — this is
  // a safety net for the case where hydrate completes but the user-weight
  // effect hasn't fired yet. Runs only when draft goes from null → non-null.
  const didInitialInsightsKickRef = useRef(false);
  useEffect(() => {
    if (!draft || didInitialInsightsKickRef.current) return;
    didInitialInsightsKickRef.current = true;
    computeInsights(userWeightKg).catch(() => {
      /* logged in store */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // ── Back-with-discard-confirm ──
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);

  const handleBack = useCallback(() => {
    if (draftDirty) {
      setDiscardDialogVisible(true);
      return;
    }
    discard();
    navigation.goBack();
  }, [draftDirty, discard, navigation]);

  const handleConfirmDiscard = useCallback(() => {
    setDiscardDialogVisible(false);
    discard();
    navigation.goBack();
  }, [discard, navigation]);

  // ── Day expand/collapse ──
  const toggleExpand = useCallback(
    (idx: number) => {
      setExpandedDay(expandedDayIndex === idx ? null : idx);
    },
    [expandedDayIndex, setExpandedDay],
  );

  // ── Exercise actions ──
  const handleAddExercise = useCallback(
    (dayIndex: number) => {
      openPicker({ dayIndex });
    },
    [openPicker],
  );

  const handleOpenEditor = useCallback(
    (dayIndex: number, exerciseIndex: number) => {
      openEditor({ dayIndex, exerciseIndex });
    },
    [openEditor],
  );

  const handleDuplicateExercise = useCallback(
    (dayIndex: number, exerciseIndex: number) => {
      // Phase 8: delegate to the store's canonical duplicateExercise action
      // (single SSOT — inserts the clone immediately after the source).
      duplicateExercise(dayIndex, exerciseIndex);
      haptics.success();
    },
    [duplicateExercise],
  );

  const handleRemoveExercise = useCallback(
    (dayIndex: number, exerciseIndex: number) => {
      removeExercise(dayIndex, exerciseIndex);
    },
    [removeExercise],
  );

  const handleReplaceExercise = useCallback(
    (dayIndex: number, exerciseIndex: number) => {
      // Replace = remove then open picker in that slot
      removeExercise(dayIndex, exerciseIndex);
      openPicker({ dayIndex, slotIndex: exerciseIndex });
    },
    [removeExercise, openPicker],
  );

  const handleMoveExerciseTo = useCallback(
    (_dayIndex: number, _exerciseIndex: number) => {
      // v1: cross-day move store action exists; the target-day picker UI is
      // deferred to Phase 8. No-op + haptic so the menu item feels responsive.
      haptics.selection();
    },
    [],
  );

  const handleReorderExercise = useCallback(
    (dayIndex: number, fromIndex: number, toIndex: number) => {
      reorderExercise(dayIndex, fromIndex, toIndex);
    },
    [reorderExercise],
  );

  const handleDuplicateDay = useCallback(
    (fromIndex: number, toIndex: number) => {
      duplicateDay(fromIndex, toIndex);
      setExpandedDay(toIndex);
    },
    [duplicateDay, setExpandedDay],
  );

  const handleClearDay = useCallback(
    (dayIndex: number) => {
      clearDay(dayIndex);
    },
    [clearDay],
  );

  const handleUpdateNotes = useCallback(
    (dayIndex: number, notes: string) => {
      const day = draft?.workouts[dayIndex];
      if (!day) return;
      updateDay(dayIndex, { ...day, description: notes });
    },
    [draft, updateDay],
  );

  // ── Day reorder (workout across days) ──
  const handleReorderDay = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!draft) return;
      if (fromIndex === toIndex) return;
      const workouts = [...draft.workouts];
      const [moved] = workouts.splice(fromIndex, 1);
      workouts.splice(toIndex, 0, moved);
      // Reassign dayOfWeek to match the new slot so labels stay correct
      const reassigned = workouts.map((w, i) => ({
        ...w,
        dayOfWeek: DAYS_OF_WEEK[i],
      }));
      useWorkoutBuilderStore.setState((state) => ({
        draft: state.draft ? { ...state.draft, workouts: reassigned } : null,
        draftDirty: true,
      }));
      void computeInsights(userWeightKg);
      haptics.dragDrop();
    },
    [draft, computeInsights, userWeightKg],
  );

  // ── Saved (footer callback) ──
  const handleSaved = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Jump-to-day on segmented tap ──
  const handleDaySelect = useCallback(
    (id: string) => {
      const idx = parseInt(id, 10);
      if (Number.isNaN(idx)) return;
      setSelectedDay(idx);
      setExpandedDay(idx);
      const y = dayBlockOffsets.current[idx] ?? 0;
      scrollRef.current?.scrollTo({ y, animated: true });
      haptics.tabSwitch();
    },
    [setSelectedDay, setExpandedDay],
  );

  const handleDayBlockLayout = useCallback(
    (idx: number, y: number) => {
      dayBlockOffsets.current[idx] = y;
    },
    [],
  );

  // ── Phase 8 gesture wiring ──
  // Pull-to-refresh on the day list: recompute insights + success haptic.
  // usePullToRefresh drives the rubber-band pull + spinner; we hand it a
  // refresh callback that recomputes insights (the SSOT for the footer +
  // insights panel). Haptic `success` fires on completion (refreshComplete is
  // wired inside the hook itself).
  const handleRefresh = useCallback(async () => {
    await computeInsights(userWeightKg);
    haptics.success();
  }, [computeInsights, userWeightKg]);

  const { gesture: pullToRefreshGesture, translateY: pullTranslateY, isRefreshing: pullIsRefreshing } =
    usePullToRefresh({
      onRefresh: handleRefresh,
      threshold: 80,
      refreshingHeight: 60,
    });

  const pullAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullTranslateY.value }],
  }));

  // Collapse-all (pinch-to-collapse on any DayBlock fires this).
  const handleCollapseAll = useCallback(() => {
    setExpandedDay(null);
  }, [setExpandedDay]);

  // ── Loading state ──
  if (!draft) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex} edges={["top"]}>
          <GlassHeader title="Weekly Schedule" onBack={handleBack} />
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <GlassHeader
          title="Weekly Schedule"
          onBack={handleBack}
          backAccessibilityLabel="Go back (discard or keep changes)"
        />

        {/* Day picker — jump-to-day segmented control */}
        <View style={styles.pickerWrap}>
          <SegmentedControl
            options={DAY_SEGMENT_OPTIONS}
            selectedId={String(selectedDayIndex)}
            onSelect={handleDaySelect}
          />
        </View>

        <GestureDetector gesture={pullToRefreshGesture}>
          <Animated.View style={[styles.scrollWrap, pullAnimatedStyle]}>
            {/* Pull-to-refresh indicator (Phase 8) */}
            <View style={styles.refreshIndicator} pointerEvents="none">
              {pullIsRefreshing.value ? (
                <Text style={styles.refreshText}>Recalculating insights…</Text>
              ) : (
                <Text style={styles.refreshText}>Pull to refresh</Text>
              )}
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Inline validation — surfaces warnings above the day list (Phase 6) */}
              <InlineValidationBanner />

              {draft.workouts.map((day, idx) => (
                <View
                  key={`${day.id}_${idx}`}
                  onLayout={(e: LayoutChangeEvent) =>
                    handleDayBlockLayout(idx, e.nativeEvent.layout.y)
                  }
                >
                  <DayBlock
                    dayIndex={idx}
                    day={day}
                    isExpanded={expandedDayIndex === idx}
                    onToggleExpand={() => toggleExpand(idx)}
                    onAddExercise={handleAddExercise}
                    onOpenEditor={handleOpenEditor}
                    onDuplicateExercise={handleDuplicateExercise}
                    onRemoveExercise={handleRemoveExercise}
                    onReplaceExercise={handleReplaceExercise}
                    onMoveExerciseTo={handleMoveExerciseTo}
                    onReorderExercise={handleReorderExercise}
                    onDuplicateDay={handleDuplicateDay}
                    onClearDay={handleClearDay}
                    onUpdateNotes={handleUpdateNotes}
                    onReorderDay={handleReorderDay}
                    onCollapseAll={handleCollapseAll}
                    testID={`day-block-${idx}`}
                  />
                </View>
              ))}

              {/* Weekly insights — radar + stat grid + coverage bars (Phase 6) */}
              <WeeklyInsightsPanel />

              {/* Spacer so the last day isn't hidden behind the footer */}
              <View style={styles.footerSpacer} />
            </ScrollView>
          </Animated.View>
        </GestureDetector>

        <BuilderSummaryFooter onSaved={handleSaved} testID="builder-footer" />
      </SafeAreaView>

      {/* Discard-changes confirm dialog */}
      <CustomDialog
        visible={discardDialogVisible}
        title="Discard changes?"
        message="You have unsaved edits to your weekly schedule. Discarding will lose them."
        type="warning"
        actions={[
          {
            text: "Keep Editing",
            onPress: () => setDiscardDialogVisible(false),
            style: "cancel",
            variant: "secondary",
          },
          {
            text: "Discard",
            onPress: handleConfirmDiscard,
            style: "destructive",
            variant: "primary",
          },
        ]}
        onDismiss={() => setDiscardDialogVisible(false)}
      />

      {/* Exercise picker — Phase 4 overlay. Mounted once at screen level and
          driven by pickerOpen/pickerContext on the workoutBuilderStore. */}
      <ExercisePickerSheet />

      {/* Exercise editor — Phase 5 overlay. Mounted once at screen level and
          driven by editorOpen/editorContext on the workoutBuilderStore. */}
      <ExerciseEditorSheet />
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
  },
  pickerWrap: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xs),
  },
  scroll: {
    flex: 1,
  },
  scrollWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
  },
  refreshIndicator: {
    height: rp(40),
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  refreshText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  footerSpacer: {
    height: rp(140),
  },
});
