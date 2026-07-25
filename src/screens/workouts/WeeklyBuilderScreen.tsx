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
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground, GlassHeader } from "../../components/ui/aurora";
import { SegmentedControl, SegmentOption } from "../../components/ui/SegmentedControl";
import { CustomDialog } from "../../components/ui/CustomDialog";
import { DayBlock } from "../../components/fitness/builder/DayBlock";
import { BuilderSummaryFooter } from "../../components/fitness/builder/BuilderSummaryFooter";
import { useWorkoutBuilderStore, DAYS_OF_WEEK } from "../../stores/workoutBuilderStore";
import { useProfileStore } from "../../stores/profileStore";
import { haptics } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";
import type { PlannedExercise } from "../../types/workout";

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
  const reorderExercise = useWorkoutBuilderStore((s) => s.reorderExercise);
  const duplicateDay = useWorkoutBuilderStore((s) => s.duplicateDay);
  const clearDay = useWorkoutBuilderStore((s) => s.clearDay);
  const updateDay = useWorkoutBuilderStore((s) => s.updateDay);
  const computeInsights = useWorkoutBuilderStore((s) => s.computeInsights);
  const discard = useWorkoutBuilderStore((s) => s.discard);

  // ── User weight (for insights calorie calc) ──
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const userWeightKg = bodyAnalysis?.current_weight_kg ?? null;

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
      const day = draft?.workouts[dayIndex];
      const ex = day?.plannedExercises?.[exerciseIndex];
      if (!ex) return;
      const clone: PlannedExercise = {
        ...JSON.parse(JSON.stringify(ex)),
        sets: ex.sets.map((s) => ({ ...s, setNumber: s.setNumber })),
      };
      addExercise(dayIndex, clone);
      haptics.success();
    },
    [draft, addExercise],
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

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                testID={`day-block-${idx}`}
              />
            </View>
          ))}
          {/* Spacer so the last day isn't hidden behind the footer */}
          <View style={styles.footerSpacer} />
        </ScrollView>

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

      {/* NOTE: The exercise picker (Phase 4) and exercise editor (Phase 5) are
          driven by pickerOpen/editorOpen store flags. They are not rendered
          here — Phase 4/5 will mount them as overlays. For now, picker/editor
          state is set on the store so the flows are wired end-to-end. */}
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
  scrollContent: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
  },
  footerSpacer: {
    height: rp(140),
  },
});
