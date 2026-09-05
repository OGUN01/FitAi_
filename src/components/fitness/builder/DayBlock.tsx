/**
 * DayBlock — collapsible day block in the WeeklyBuilderScreen.
 *
 * Collapsed: day name, workout title OR "Rest Day", duration, exercise count,
 * intensity color chip, progress chip, animated expand chevron.
 *
 * Expanded: ExerciseRow list (warmup → main → superset indicators → cooldown),
 * "Add Exercise" GlassButton, Notes TextInput, rest timer indicator, and a
 * kebab menu with Duplicate-day action.
 *
 * Interactions:
 *  - Tap header = toggle expand (spring chevron rotation).
 *  - Long-press header = drag-to-reorder DAYS (useDragToReorder).
 *  - Swipe header left = reveal "Copy to…" action.
 *
 * Uses Reanimated layout animations (FadeInUp, Layout) for expand/collapse.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInUp,
  SlideInRight,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  withTiming,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { useDragToReorder, useDragReflow, usePinchToZoom } from "../../../gestures/handlers";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { hexToRgba } from "../../../utils/colors";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
  errorText,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import type { DayWorkout } from "../../../types/ai";
import type { PlannedExercise } from "../../../types/workout";
import { ExerciseRow, EXERCISE_ROW_HEIGHT } from "./ExerciseRow";
import { CardioBlockEditor } from "./CardioBlockEditor";

export interface DayBlockProps {
  dayIndex: number;
  day: DayWorkout;
  isExpanded: boolean;
  /**
   * Toggle this day's expanded state. Takes dayIndex (not a bound closure) so
   * the parent can pass one stable useCallback reference for all 7 DayBlocks
   * instead of a fresh `() => toggleExpand(idx)` arrow per row per render —
   * that pattern defeated this component's React.memo on every single edit
   * anywhere in the plan (any one row's Notes keystroke re-rendered all 7).
   */
  onToggleExpand: (dayIndex: number) => void;
  /** Open the exercise picker for this day. */
  onAddExercise: (dayIndex: number) => void;
  /** Open the exercise editor. */
  onOpenEditor: (dayIndex: number, exerciseIndex: number) => void;
  /** Duplicate an exercise in this day. */
  onDuplicateExercise: (dayIndex: number, exerciseIndex: number) => void;
  /** Remove an exercise. */
  onRemoveExercise: (dayIndex: number, exerciseIndex: number) => void;
  /** Replace an exercise (opens picker). */
  onReplaceExercise: (dayIndex: number, exerciseIndex: number) => void;
  /** Move an exercise to another day (opens day picker). */
  onMoveExerciseTo: (dayIndex: number, exerciseIndex: number) => void;
  /** Reorder exercise within this day. */
  onReorderExercise: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  /** Duplicate the whole day to another day index. */
  onDuplicateDay: (fromIndex: number, toIndex: number) => void;
  /** Clear all exercises from this day. */
  onClearDay: (dayIndex: number) => void;
  /** Update day-level notes. */
  onUpdateNotes: (dayIndex: number, notes: string) => void;
  /** Drag-handle reorder of the day itself (workout across days). */
  onReorderDay: (fromIndex: number, toIndex: number) => void;
  /**
   * Live sibling-day offsets during a day-drag (owned by WeeklyBuilderScreen's
   * useDragReflow) — read directly by this block's own drag animated style so
   * other DayBlocks visibly shift out of the way while this one (or another)
   * is being dragged.
   */
  dayReflowOffsets: SharedValue<number[]>;
  /** Reports live day-drag position up to WeeklyBuilderScreen for sibling reflow. */
  onDayDragMove?: (fromIndex: number, targetIndex: number) => void;
  /**
   * Fired when a pinch-IN gesture (scale < 0.8) is detected on this day block —
   * the caller collapses ALL expanded days (setExpandedDay(null)). Phase 8
   * gesture wiring (additive — does not affect existing expand/drag behavior).
   */
  onCollapseAll?: () => void;
  /** Test ID prefix. */
  testID?: string;
}

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

// Exported so WeeklyBuilderScreen's useDragReflow (day-level sibling reflow
// during the day-drag gesture) uses the same slot size.
export const DAY_HEADER_HEIGHT = 68;

export const DayBlock: React.FC<DayBlockProps> = React.memo(
  ({
    dayIndex,
    day,
    isExpanded,
    onToggleExpand,
    onAddExercise,
    onOpenEditor,
    onDuplicateExercise,
    onRemoveExercise,
    onReplaceExercise,
    onMoveExerciseTo,
    onReorderExercise,
    onDuplicateDay,
    onClearDay,
    onUpdateNotes,
    onReorderDay,
    dayReflowOffsets,
    onDayDragMove,
    onCollapseAll,
    testID,
  }) => {
    const dayLabel = DAY_LABELS[dayIndex] ?? day.dayOfWeek;
    const dayShort = DAY_SHORT[dayIndex] ?? day.dayOfWeek.slice(0, 3).toUpperCase();
    const exercises = day.plannedExercises ?? [];
    const exerciseCount = exercises.length;
    const isRestDay = exerciseCount === 0;
    const workoutTitle = isRestDay ? "Rest Day" : day.title || "Custom Workout";

    // ── Intensity chip color ──
    // Rest state uses backgroundTertiary + primary text color so white-on-grey
    // (~2.5:1) doesn't fail WCAG AA; high/mod keep their tinted chips with
    // primary text which meets AA on saturated orange/amber backgrounds.
    //
    // BUG FIX: `day.intensityLevel` is set at plan-generation time and never
    // updated by the manual builder's addExercise action — a day created as
    // an empty rest day (intensityLevel defaults to "rest") kept showing a
    // "REST" chip even after the user added its first exercise, since the
    // string itself never changed. `isRestDay` (derived fresh from
    // `exercises.length` above) is the authoritative signal for whether a
    // day is actually a rest day; only fall through to the stored
    // intensityLevel string once the day genuinely has exercises.
    const intensityLevel = (day.intensityLevel ?? "rest").toLowerCase();
    const isRestState =
      isRestDay ||
      (intensityLevel !== "intense" &&
        intensityLevel !== "high" &&
        intensityLevel !== "moderate" &&
        intensityLevel !== "medium");
    const intensityColor = isRestState
      ? colors.background.tertiary
      : intensityLevel === "intense" || intensityLevel === "high"
        ? colors.primary.DEFAULT // orange
        : colors.warning.DEFAULT; // amber
    const intensityLabel = isRestDay
      ? "REST"
      : intensityLevel === "intense" || intensityLevel === "high"
        ? "HIGH"
        : "MOD";

    // ── Drag-to-reorder DAYS (long-press on header) ──
    const handleDragEnd = useCallback(
      (from: number, to: number) => {
        const clamped = Math.max(0, Math.min(6, to));
        if (from !== clamped) {
          onReorderDay(from, clamped);
        }
      },
      [onReorderDay],
    );

    const handleDayDragMove = useCallback(
      (from: number, to: number) => {
        onDayDragMove?.(from, to);
      },
      [onDayDragMove],
    );

    const { gesture: dayDragGesture, translateY: dayTranslateY, isDragging: dayIsDragging } =
      useDragToReorder(dayIndex, {
        itemHeight: DAY_HEADER_HEIGHT,
        onDragEnd: handleDragEnd,
        onDragMove: handleDayDragMove,
        activationDelay: 450,
      });

    const dayDragStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateY:
            dayTranslateY.value + (dayReflowOffsets.value[dayIndex] ?? 0),
        },
      ],
      opacity: dayIsDragging.value ? 0.9 : 1,
      zIndex: dayIsDragging.value ? 100 : 0,
      elevation: dayIsDragging.value ? 8 : 0,
    }));

    // ── Swipe-to-reveal "Copy to…" action ──
    const swipeX = useSharedValue(0);
    const COPY_WIDTH = rw(110);
    const swipeGesture = Gesture.Pan()
      .activeOffsetX([-12, 12])
      .onUpdate((event) => {
        if (event.translationX < 0) {
          swipeX.value = Math.max(-COPY_WIDTH, event.translationX);
        }
      })
      .onEnd(() => {
        if (swipeX.value < -COPY_WIDTH / 2) {
          swipeX.value = withSpring(-COPY_WIDTH, animations.spring.snappy);
          haptics.selection();
        } else {
          swipeX.value = withSpring(0, animations.spring.default);
        }
      });

    const swipeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: swipeX.value }],
    }));

    const copyOpacity = useAnimatedStyle(() => ({
      opacity: interpolate(swipeX.value, [-COPY_WIDTH, 0], [1, 0]),
    }));

    // ── Pinch-to-collapse-all (Phase 8 — usePinchToZoom repurposed).
    //    A pinch IN (scale < 0.8) collapses every expanded day. The gesture is
    //    composed alongside the day-drag + swipe so existing behavior is
    //    untouched; it only ADDS a collapse-all affordance. Haptic `selection`
    //    fires once on collapse. We use usePinchToZoom for its scale tracking
    //    and route the collapse decision through an onEnd observer composed on
    //    top of the returned gesture. ──
    const handlePinchCollapse = useCallback(
      (finalScale: number) => {
        if (!onCollapseAll || finalScale >= 0.8) return;
        onCollapseAll();
        haptics.selection();
      },
      [onCollapseAll],
    );
    // Was re-chaining a second .onEnd() onto usePinchToZoom's returned
    // gesture to observe the collapse threshold — but RNGH's .onEnd()
    // ASSIGNS the handler, it doesn't compose multiple registrations, so
    // that silently REPLACED (not augmented) the hook's own snap-to-limit
    // logic, and mixed worklet closures from two different module scopes on
    // the same gesture (this file's replacement onEnd vs handlers.ts's
    // onUpdate/onFinalize), which is the likely source of the
    // "some callbacks are worklets and some are not" warning seen in QA.
    // Fixed by passing the collapse check in as usePinchToZoom's own onEnd
    // callback instead, so there's exactly one onEnd registration.
    const { gesture: pinchGesture } = usePinchToZoom(0.5, 1.5, {
      hapticAtLimits: false,
      onEnd: handlePinchCollapse,
    });

    // ── Expand chevron rotation ──
    const chevronRotation = useSharedValue(isExpanded ? 1 : 0);
    // keep in sync with prop (useEffect-free via direct assignment on render path
    // would cause re-render warnings, so we drive it through withTiming on change)
    chevronRotation.value = withTiming(isExpanded ? 1 : 0, {
      duration: animations.duration.quick,
    });
    const chevronStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${interpolate(chevronRotation.value, [0, 1], [0, 180])}deg` }],
    }));

    // ── Header tap = toggle expand (single tap) ──
    // NOTE: previously attempted via Gesture.Tap() but the runOnJS helper was a
    // dead stub. Header now uses a Pressable (see render) which coexists with
    // the day-drag long-press + swipe composed gestures.

    const [menuOpen, setMenuOpen] = useState(false);
    const [showCopyPicker, setShowCopyPicker] = useState(false);
    const [clearDayConfirmOpen, setClearDayConfirmOpen] = useState(false);

    const handleHeaderPress = useCallback(() => {
      haptics.selection();
      onToggleExpand(dayIndex);
    }, [onToggleExpand, dayIndex]);

    const planned: PlannedExercise[] = exercises;

    // ── Sibling reflow for within-day exercise drag (see ExerciseRow's
    //    useDragToReorder onDragMove wiring below). ──
    const {
      offsets: exerciseReflowOffsets,
      reportDragMove: reportExerciseDragMove,
      resetOffsets: resetExerciseReflowOffsets,
    } = useDragReflow(planned.length, EXERCISE_ROW_HEIGHT);

    const handleExerciseDragMove = useCallback(
      (_dIdx: number, from: number, to: number) => {
        reportExerciseDragMove(from, to);
      },
      [reportExerciseDragMove],
    );

    const handleExerciseReorder = useCallback(
      (dIdx: number, from: number, to: number) => {
        resetExerciseReflowOffsets();
        onReorderExercise(dIdx, from, to);
      },
      [onReorderExercise, resetExerciseReflowOffsets],
    );

    return (
      <Animated.View
        entering={FadeInUp.springify().delay(dayIndex * 40)}
        layout={Layout.springify()}
        style={[styles.blockWrap, dayDragStyle]}
        testID={testID}
      >
        <GestureDetector
          gesture={Gesture.Simultaneous(dayDragGesture, swipeGesture, pinchGesture)}
        >
          <Animated.View style={swipeStyle}>
            <View style={styles.card}>
              {/* ── Header (tap to expand, long-press to drag, swipe to copy) ── */}
              <Pressable
                onPress={handleHeaderPress}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel}. ${workoutTitle}. ${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}.`}
                accessibilityHint="Tap to expand or collapse. Long-press to drag this day. Pinch in to collapse all days."
                accessibilityState={{ expanded: isExpanded }}
                style={styles.header}
              >
                {/* Day short label badge */}
                <View style={styles.dayBadge}>
                  <Text style={styles.dayShort}>{dayShort}</Text>
                </View>

                {/* Title + meta */}
                <View style={styles.headerInfo}>
                  <Text style={styles.dayTitle} numberOfLines={1}>
                    {workoutTitle}
                  </Text>
                  <View style={styles.headerMeta}>
                    <View style={[styles.intensityChip, { backgroundColor: intensityColor }]}>
                      <Text style={styles.intensityChipText}>{intensityLabel}</Text>
                    </View>
                    {!isRestDay && (
                      <>
                        <Text style={styles.metaText}>
                          {exerciseCount} ex{exerciseCount !== 1 ? "s" : ""}
                        </Text>
                        {day.duration != null && day.duration > 0 && (
                          <Text style={styles.metaText}>· {day.duration} min</Text>
                        )}
                      </>
                    )}
                  </View>
                </View>

                {/* Expand chevron */}
                <Animated.View style={styles.chevronWrap}>
                  <Ionicons
                    name="chevron-down"
                    size={rf(20)}
                    color={colors.text.secondary}
                  />
                </Animated.View>
              </Pressable>

              {/* ── Expanded content ── */}
              {isExpanded && (
                <Animated.View
                  entering={SlideInRight.springify()}
                  layout={Layout.springify()}
                  style={styles.expanded}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.expandedKAV}
                  >
                    {planned.length === 0 ? (
                      <Text style={styles.emptyHint}>
                        No exercises yet. Tap "Add Exercise" below.
                      </Text>
                    ) : (
                      <View style={styles.exerciseList}>
                        {planned.map((ex, idx) => {
                          // Superset grouping is a contiguous run of rows sharing
                          // the same supersetId. First/last-in-group flags let
                          // ExerciseRow render a continuous bracket (flush
                          // stacking + flattened abutting corners) instead of
                          // independent per-row rails, so the group reads as one
                          // visual unit.
                          const prevSupersetId = planned[idx - 1]?.supersetId;
                          const nextSupersetId = planned[idx + 1]?.supersetId;
                          const isFirstInSuperset =
                            !!ex.supersetId && ex.supersetId !== prevSupersetId;
                          const isLastInSuperset =
                            !!ex.supersetId && ex.supersetId !== nextSupersetId;
                          // Circuit grouping mirrors superset grouping exactly
                          // (contiguous run of equal circuitId) — see
                          // src/utils/workoutGrouping.ts for the shared
                          // traversal logic this visual grouping matches.
                          const prevCircuitId = planned[idx - 1]?.circuitId;
                          const nextCircuitId = planned[idx + 1]?.circuitId;
                          const isFirstInCircuit =
                            !!ex.circuitId && ex.circuitId !== prevCircuitId;
                          const isLastInCircuit =
                            !!ex.circuitId && ex.circuitId !== nextCircuitId;
                          return (
                            <ExerciseRow
                              key={`${ex.exerciseId}_${idx}`}
                              exercise={ex}
                              dayIndex={dayIndex}
                              exerciseIndex={idx}
                              isFirstInSuperset={isFirstInSuperset}
                              isLastInSuperset={isLastInSuperset}
                              isFirstInCircuit={isFirstInCircuit}
                              isLastInCircuit={isLastInCircuit}
                              onOpenEditor={onOpenEditor}
                              onDuplicate={onDuplicateExercise}
                              onRemove={onRemoveExercise}
                              onReplace={onReplaceExercise}
                              onMoveTo={onMoveExerciseTo}
                              onReorder={handleExerciseReorder}
                              reflowOffsets={exerciseReflowOffsets}
                              onDragMove={handleExerciseDragMove}
                              testID={`${testID}-ex-${idx}`}
                            />
                          );
                        })}
                      </View>
                    )}

                    {/* Add Exercise */}
                    <GlassButton
                      label="Add Exercise"
                      icon="add-circle-outline"
                      onPress={() => {
                        haptics.buttonPress();
                        onAddExercise(dayIndex);
                      }}
                      variant="primary"
                      fullWidth
                      style={styles.addBtn}
                    />

                    {/* Cardio blocks + scheduled time (Phase B) — first-class
                        cardio activity ("6 am, 30 min running") + a per-day
                        time picker. Live-edits the draft via store actions. */}
                    <CardioBlockEditor
                      dayIndex={dayIndex}
                      cardioBlocks={day.cardioBlocks}
                      scheduledTime={day.scheduledTime}
                      testID={`${testID}-cardio`}
                    />

                    {/* Notes */}
                    <View style={styles.notesSection}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <TextInput
                        style={styles.notesInput}
                        value={day.description ?? ""}
                        placeholder="Add notes for this day…"
                        placeholderTextColor={colors.text.tertiary}
                        multiline
                        onChangeText={(text) => onUpdateNotes(dayIndex, text)}
                        accessibilityLabel={`Notes for ${dayLabel}`}
                      />
                    </View>

                    {/* Rest timer indicator (display-only for v1) */}
                    {planned.length > 0 && (
                      <View style={styles.restTimerRow}>
                        <Ionicons name="timer-outline" size={rf(14)} color={colors.text.tertiary} />
                        <Text style={styles.restTimerText}>
                          Rest: {planned[0]?.restSeconds ?? 60}s between sets
                        </Text>
                      </View>
                    )}

                    {/* Day actions (kebab menu trigger) */}
                    <View style={styles.dayActions}>
                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          haptics.selection();
                          setMenuOpen((v) => !v);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Day actions"
                        style={styles.kebabBtn}
                      >
                        <Ionicons name="ellipsis-horizontal" size={rf(18)} color={colors.text.secondary} />
                      </Pressable>
                    </View>

                    {menuOpen && (
                      <View style={styles.dayMenu} pointerEvents="box-none">
                        <Pressable
                          style={styles.menuDismiss}
                          onPress={() => setMenuOpen(false)}
                          accessibilityLabel="Close menu"
                        />
                        <View style={styles.dayMenuList}>
                          {DAY_LABELS.map((label, targetIdx) => {
                            if (targetIdx === dayIndex) return null;
                            return (
                              <Pressable
                                key={label}
                                style={styles.dayMenuItem}
                                onPress={() => {
                                  setMenuOpen(false);
                                  haptics.success();
                                  onDuplicateDay(dayIndex, targetIdx);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`Copy ${dayLabel} to ${label}`}
                              >
                                <Ionicons
                                  name="copy-outline"
                                  size={rf(14)}
                                  color={colors.text.secondary}
                                  style={styles.dayMenuIcon}
                                />
                                <Text style={styles.dayMenuLabel}>
                                  Copy to {label}
                                </Text>
                              </Pressable>
                            );
                          })}
                          <Pressable
                            style={[styles.dayMenuItem, { borderTopWidth: 1, borderTopColor: border.subtle }]}
                            onPress={() => {
                              setMenuOpen(false);
                              haptics.warning();
                              setClearDayConfirmOpen(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Clear ${dayLabel}`}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={rf(14)}
                              color={colors.error.DEFAULT}
                              style={styles.dayMenuIcon}
                            />
                            <Text style={[styles.dayMenuLabel, { color: errorText }]}>
                              Clear Day
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </KeyboardAvoidingView>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Swipe-revealed "Copy to…" action (behind the header) */}
        <Animated.View style={[styles.copyAction, copyOpacity]} pointerEvents="box-none">
          <Pressable
            style={styles.copyBtn}
            onPress={() => {
              swipeX.value = withSpring(0, animations.spring.default);
              setShowCopyPicker(true);
              haptics.selection();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Copy ${dayLabel} to another day`}
          >
            <Ionicons name="copy-outline" size={rf(18)} color={colors.text.primary} />
            <Text style={styles.copyBtnText}>Copy to…</Text>
          </Pressable>
        </Animated.View>

        {/* Copy-to-day picker — bottom sheet per Editorial Dark (was a
            centered absolute overlay with backdrop). */}
        {showCopyPicker && (
          <DetentBottomSheet
            visible={showCopyPicker}
            onClose={() => setShowCopyPicker(false)}
            snapPoints={[0.4, 0.6]}
            initialSnapIndex={0}
            testID={`${testID}-copy-picker`}
          >
            <View style={styles.copyPicker}>
              <Text style={styles.copyPickerTitle}>Copy {dayLabel} to:</Text>
              {DAY_LABELS.map((label, targetIdx) => {
                if (targetIdx === dayIndex) return null;
                return (
                  <Pressable
                    key={label}
                    style={styles.copyPickerItem}
                    onPress={() => {
                      setShowCopyPicker(false);
                      haptics.success();
                      onDuplicateDay(dayIndex, targetIdx);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Copy to ${label}`}
                  >
                    <Text style={styles.copyPickerItemText}>{label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.copyPickerCancel}
                onPress={() => {
                  haptics.selection();
                  setShowCopyPicker(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel copy"
              >
                <Text style={styles.copyPickerCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </DetentBottomSheet>
        )}

        {/*
          Clear Day confirmation — mirrors the Deload Week confirm pattern in
          BuilderSummaryFooter (icon + title + message + Cancel/Confirm
          GlassButton row) since clearing a day is a fully destructive,
          irreversible action with no undo stack.
        */}
        <DetentBottomSheet
          visible={clearDayConfirmOpen}
          onClose={() => setClearDayConfirmOpen(false)}
          snapPoints={[0.4, 0.6]}
          initialSnapIndex={1}
          testID={`${testID}-clear-day-sheet`}
        >
          <View style={styles.sheetBody}>
            <View style={[styles.sheetIcon, { backgroundColor: hexToRgba(colors.error.DEFAULT, 0.12) }]}>
              <Ionicons name="trash-outline" size={rf(28)} color={colors.error.DEFAULT} />
            </View>
            <Text style={styles.sheetTitle}>Clear {dayLabel}?</Text>
            <Text style={styles.sheetMessage}>
              This removes all {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} from this day. This can't be undone.
            </Text>
            <View style={styles.sheetActions}>
              <GlassButton
                label="Cancel"
                onPress={() => setClearDayConfirmOpen(false)}
                variant="secondary"
                hapticType="light"
                style={styles.sheetActionBtn}
                testID={`${testID}-clear-day-cancel`}
              />
              <GlassButton
                label="Clear Day"
                onPress={() => {
                  setClearDayConfirmOpen(false);
                  onClearDay(dayIndex);
                }}
                variant="primary"
                hapticType="medium"
                style={styles.sheetActionBtn}
                testID={`${testID}-clear-day-confirm`}
              />
            </View>
          </View>
        </DetentBottomSheet>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  blockWrap: {
    position: "relative",
    marginBottom: rp(spacing.sm),
  },
  // Flat surface + hairline (was GlassCard elevation 3-4 — glass/elevation
  // replaced by a flat step + 1px border per Editorial Dark).
  card: {
    overflow: "hidden",
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: rp(DAY_HEADER_HEIGHT),
  },
  dayBadge: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  dayShort: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as TextStyle["fontWeight"],
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  dayTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle["fontWeight"],
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xxs),
  },
  intensityChip: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(spacing.xxs),
  },
  intensityChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as TextStyle["fontWeight"],
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  chevronWrap: {
    padding: rp(spacing.xs),
  },
  expanded: {
    paddingHorizontal: rp(spacing.md),
    paddingBottom: rp(spacing.md),
    paddingTop: rp(spacing.xs),
    position: "relative",
  } as ViewStyle,
  // KAV wraps the entire expanded section so the keyboard never covers the
  // notes input OR the buttons below it (Add Exercise / kebab). Previously it
  // only wrapped the notes input, leaving the rest of the expanded content
  // un-offset when the keyboard opened.
  expandedKAV: {
    flex: 1,
  } as ViewStyle,
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    paddingVertical: rp(spacing.md),
  },
  exerciseList: {
    marginBottom: rp(spacing.sm),
  },
  addBtn: {
    marginBottom: rp(spacing.sm),
  },
  notesSection: {
    marginBottom: rp(spacing.sm),
  },
  notesLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle["fontWeight"],
    marginBottom: rp(spacing.xs),
  },
  notesInput: {
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    minHeight: rp(60),
    maxHeight: rp(160),
    textAlignVertical: "top",
  },
  restTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
  },
  restTimerText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  dayActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  kebabBtn: {
    width: Math.max(rw(36), 44),
    height: Math.max(rw(36), 44),
    alignItems: "center",
    justifyContent: "center",
  },
  // BUG FIX: `dayMenu` previously only set top/right (no left/bottom), so on
  // web it shrink-wrapped to its content instead of filling the screen —
  // `menuDismiss`'s absoluteFillObject then only covered that small
  // shrink-wrapped box (roughly the dropdown's own footprint) rather than
  // acting as a real backdrop. A tap on unrelated content elsewhere on
  // screen (outside that small box) never reached menuDismiss at all, so
  // the open menu could visually sit on top of and intercept taps on
  // whatever rendered below it (e.g. "Add Cardio") until a tap that
  // happened to land inside the small dismiss box closed it. Fixed to
  // mirror ExerciseRow.tsx's identical kebab-menu pattern, which already
  // gets this right: the OUTER container fills the full screen (so
  // menuDismiss is a true backdrop), and the visible dropdown box is
  // positioned via `dayMenuList`'s own `position: absolute` instead.
  dayMenu: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
    // Lower than dayMenuList so menu items receive taps on Android.
    zIndex: 40,
  } as ViewStyle,
  dayMenuList: {
    position: "absolute",
    top: rp(spacing.xs),
    right: rp(spacing.md),
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    paddingVertical: rp(spacing.xs),
    minWidth: rw(160),
    // Shadow stack removed (shadow discipline) — separation comes from the
    // hairline + surface step. zIndex kept so taps on items win on Android.
    zIndex: 41,
  },
  dayMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: Math.max(rp(44), 44),
  },
  dayMenuIcon: {
    width: rw(16),
  },
  dayMenuLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  // Swipe "Copy to…" action
  copyAction: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: "center",
    paddingRight: rp(spacing.sm),
  },
  copyBtn: {
    backgroundColor: colors.info.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  copyBtnText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle["fontWeight"],
  },
  // Copy-to picker body — rendered inside a DetentBottomSheet (the sheet
  // supplies the surface, backdrop, and dismiss behavior).
  copyPicker: {
    paddingBottom: rp(spacing.md),
  },
  copyPickerTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle["fontWeight"],
    marginBottom: rp(spacing.sm),
  },
  copyPickerItem: {
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(44), 44),
    justifyContent: "center",
  },
  copyPickerItemText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  copyPickerCancel: {
    marginTop: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    alignItems: "center",
  },
  copyPickerCancelText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
  },
  // Clear-day confirmation sheet body — mirrors BuilderSummaryFooter's
  // deload-confirm sheet tokens for visual consistency across the builder.
  sheetBody: {
    alignItems: "center",
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xl),
    gap: rp(spacing.sm),
  },
  sheetIcon: {
    width: rf(56),
    height: rf(56),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as TextStyle["fontWeight"],
    textAlign: "center",
  },
  sheetMessage: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    textAlign: "center",
    lineHeight: rf(22),
  },
  sheetActions: {
    flexDirection: "column",
    gap: rp(spacing.sm),
    width: "100%",
    marginTop: rp(spacing.sm),
  },
  sheetActionBtn: {
    width: "100%",
  },
});

export default DayBlock;
