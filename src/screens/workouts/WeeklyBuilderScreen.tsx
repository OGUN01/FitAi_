/**
 * WeeklyBuilderScreen — premium weekly schedule builder (Phase 3).
 *
 * Replaces ScheduleBuilderScreen in routing. Full-screen AuroraBackground
 * theme="space" with a compact top row, a flat day strip (selected = filled
 * primary circle, has-workout = dot indicator), 7 DayBlock components in a
 * ScrollView, and a floating BuilderSummaryFooter at the bottom (sticky).
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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, FadeInUp } from "react-native-reanimated";
import { AuroraBackground, AuroraSpinner } from "../../components/ui/aurora";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { CustomDialog } from "../../components/ui/CustomDialog";
import { DayBlock } from "../../components/fitness/builder/DayBlock";
import { ExercisePickerSheet } from "../../components/fitness/builder/ExercisePickerSheet";
import { ExerciseEditorSheet } from "../../components/fitness/builder/ExerciseEditorSheet";
import { BuilderSummaryFooter } from "../../components/fitness/builder/BuilderSummaryFooter";
import { InlineValidationBanner } from "../../components/fitness/builder/InlineValidationBanner";
import { WeeklyInsightsPanel } from "../../components/fitness/builder/WeeklyInsightsPanel";
import { NaturalLanguageEditBar } from "../../components/fitness/builder/NaturalLanguageEditBar";
import { useWorkoutBuilderStore, DAYS_OF_WEEK } from "../../stores/workoutBuilderStore";
import { useProfileStore } from "../../stores/profileStore";
import { validatePlan, type ValidationProfile } from "../../services/builderValidationService";
import type { WorkoutTemplate } from "../../services/workoutTemplateService";
import { buildDayWorkoutFromTemplate } from "../../utils/workoutBuilders";
import { fromTemplateExercise } from "../../types/workout";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { usePullToRefresh } from "../../gestures/handlers";
import { haptics } from "../../utils/haptics";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { hexToRgba } from "../../utils/colors";
import { rp, rf, rw } from "../../utils/responsive";

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  /**
   * Template passed by TemplateLibraryScreen's "Use in Schedule" action.
   * Seeded into the first empty day of the draft once hydration completes.
   */
  sourceTemplate?: WorkoutTemplate;
}

const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function WeeklyBuilderScreen({ navigation, sourceTemplate }: Props) {
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
  // Tracks hydration COMPLETION (not just kickoff) so the sourceTemplate
  // seed below never races hydrateFromCustomPlan's draft write.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrateFromCustomPlan()
      .catch((err) => {
        console.error("[WeeklyBuilderScreen] hydrate failed:", err);
      })
      .finally(() => setHydrated(true));
  }, [hydrateFromCustomPlan]);

  // ── Seed from TemplateLibrary "Use in Schedule" ──
  // Runs once per activation, after hydration, so the seed lands on the
  // freshly hydrated draft (never on a stale one that hydrate then wipes).
  const seededTemplateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !draft || !sourceTemplate) return;
    if (seededTemplateRef.current === sourceTemplate.id) return;
    seededTemplateRef.current = sourceTemplate.id;

    const emptyIdx = draft.workouts.findIndex(
      (d) => (d.plannedExercises?.length ?? d.exercises?.length ?? 0) === 0,
    );
    if (emptyIdx === -1) {
      crossPlatformAlert(
        "Week Is Full",
        "Every day this week already has a workout. Clear a day first, then use the template again.",
      );
      return;
    }

    const dayWorkout = buildDayWorkoutFromTemplate(sourceTemplate, {
      dayOfWeek: draft.workouts[emptyIdx].dayOfWeek,
      isExtra: false,
    });
    // The builder's primary structure is plannedExercises — populate it too
    // (buildDayWorkoutFromTemplate only fills the simple exercises shape).
    dayWorkout.plannedExercises = sourceTemplate.exercises.map(fromTemplateExercise);
    updateDay(emptyIdx, dayWorkout);
    setSelectedDay(emptyIdx);
    setExpandedDay(emptyIdx);
    computeInsights(userWeightKg).catch(() => {
      /* logged in store */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, draft, sourceTemplate]);

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

  // ── Jump-to-day on day strip tap ──
  const handleDaySelect = useCallback(
    (idx: number) => {
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
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <View style={styles.topRow}>
            <AnimatedPressable
              onPress={handleBack}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back (discard or keep changes)"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
            </AnimatedPressable>
            <Text style={styles.stepEyebrow}>WEEKLY BUILDER</Text>
            <View style={styles.topRowSpacer} />
          </View>
          <View style={styles.centered}>
            <AuroraSpinner size="lg" />
            <Text style={styles.loadingText}>Loading your weekly schedule…</Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        {/* Compact top row — plain back + eyebrow */}
        <View style={styles.topRow}>
          <AnimatedPressable
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back (discard or keep changes)"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.stepEyebrow}>WEEKLY BUILDER</Text>
          <View style={styles.topRowSpacer} />
        </View>

        <GestureDetector gesture={pullToRefreshGesture}>
          <Animated.View style={[styles.scrollWrap, pullAnimatedStyle]}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View entering={FadeInUp.delay(60).duration(450)}>
                <Text style={styles.title}>Weekly schedule</Text>
                <Text style={styles.subtitle}>
                  Tap a day to edit. Drag to reorder. Pinch a day to collapse all.
                </Text>
              </Animated.View>

              {/* Flat day strip — selected = filled primary, has-workout = dot */}
              <View style={styles.dayStrip}>
                {DAYS_OF_WEEK.map((_, idx) => {
                  const day = draft.workouts[idx];
                  const hasWorkout = (day?.plannedExercises?.length ?? 0) > 0;
                  const selected = selectedDayIndex === idx;
                  return (
                    <AnimatedPressable
                      key={`day-strip-${idx}`}
                      onPress={() => handleDaySelect(idx)}
                      scaleValue={0.95}
                      springConfig="smooth"
                      hapticType="light"
                      accessibilityRole="button"
                      accessibilityLabel={`Jump to ${DAYS_OF_WEEK[idx]}`}
                      accessibilityState={{ selected }}
                      style={styles.dayStripItem}
                    >
                      <View
                        style={[
                          styles.dayDisc,
                          selected
                            ? styles.dayDiscSelected
                            : hasWorkout
                              ? styles.dayDiscHasWorkout
                              : styles.dayDiscEmpty,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayDiscText,
                            selected
                              ? styles.dayDiscTextSelected
                              : hasWorkout
                                ? styles.dayDiscTextHasWorkout
                                : styles.dayDiscTextEmpty,
                          ]}
                        >
                          {DAY_INITIALS[idx]}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.dayShort,
                          selected && styles.dayShortSelected,
                        ]}
                      >
                        {DAY_SHORT[idx]}
                      </Text>
                      <View
                        style={[
                          styles.dayDot,
                          hasWorkout ? styles.dayDotOn : styles.dayDotOff,
                        ]}
                      />
                    </AnimatedPressable>
                  );
                })}
              </View>

              {/* Pull-to-refresh indicator (Phase 8) */}
              <View
                style={styles.refreshIndicator}
                pointerEvents="none"
                accessibilityLiveRegion="polite"
              >
                {pullIsRefreshing.value ? (
                  <Text style={styles.refreshText}>Recalculating insights…</Text>
                ) : (
                  <Text style={styles.refreshText}>Pull to refresh</Text>
                )}
              </View>

              {/* Phase 9 — Natural language AI edit bar */}
              <NaturalLanguageEditBar />

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
      <View style={styles.pickerLayer}>
        <ExercisePickerSheet />
      </View>

      {/* Exercise editor — Phase 5 overlay. Mounted once at screen level and
          driven by editorOpen/editorContext on the workoutBuilderStore. */}
      <View style={styles.editorLayer}>
        <ExerciseEditorSheet />
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  backBtn: {
    width: rw(44),
    height: rw(44),
    alignItems: "center",
    justifyContent: "center",
  },
  topRowSpacer: {
    width: rw(44),
  },
  stepEyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(28),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    lineHeight: rf(34),
    letterSpacing: -0.3,
    marginBottom: rp(spacing.sm),
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: rp(spacing.lg),
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.md),
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    marginTop: rp(spacing.sm),
  },
  scroll: {
    flex: 1,
  },
  scrollWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
  },
  // ── Day strip ──
  dayStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },
  dayStripItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: rp(spacing.xs),
    minHeight: 44,
  },
  dayDisc: {
    width: rw(40),
    height: rw(40),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDiscSelected: {
    backgroundColor: colors.primary,
  },
  dayDiscHasWorkout: {
    backgroundColor: hexToRgba(colors.primary, 0.12),
  },
  dayDiscEmpty: {
    backgroundColor: hexToRgba(colors.white, 0.06),
  },
  dayDiscText: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },
  dayDiscTextSelected: {
    color: colors.white,
  },
  dayDiscTextHasWorkout: {
    color: colors.primary,
  },
  dayDiscTextEmpty: {
    color: colors.textTertiary,
  },
  dayShort: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textTertiary,
    marginTop: rp(spacing.xs),
    letterSpacing: 0.6,
  },
  dayShortSelected: {
    color: colors.primary,
  },
  dayDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: borderRadius.full,
    marginTop: rp(spacing.xs),
  },
  dayDotOn: {
    backgroundColor: colors.primary,
  },
  dayDotOff: {
    backgroundColor: hexToRgba(colors.white, 0.12),
  },
  refreshIndicator: {
    height: rp(40),
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  refreshText: {
    color: colors.textSecondary,
    fontSize: rf(12),
  },
  footerSpacer: {
    height: rp(180),
  },
  pickerLayer: {
    zIndex: 1200,
    elevation: 1200,
  },
  editorLayer: {
    zIndex: 1300,
    elevation: 1300,
  },
});
