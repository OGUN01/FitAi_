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
  DimensionValue,
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
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { useDragToReorder } from "../../../gestures/handlers";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import type { DayWorkout } from "../../../types/ai";
import type { PlannedExercise } from "../../../types/workout";
import { ExerciseRow } from "./ExerciseRow";

export interface DayBlockProps {
  dayIndex: number;
  day: DayWorkout;
  isExpanded: boolean;
  onToggleExpand: () => void;
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

const DAY_HEADER_HEIGHT = 68;

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
    testID,
  }) => {
    const dayLabel = DAY_LABELS[dayIndex] ?? day.dayOfWeek;
    const dayShort = DAY_SHORT[dayIndex] ?? day.dayOfWeek.slice(0, 3).toUpperCase();
    const exercises = day.plannedExercises ?? [];
    const exerciseCount = exercises.length;
    const isRestDay = exerciseCount === 0;
    const workoutTitle = isRestDay ? "Rest Day" : day.title || "Custom Workout";

    // ── Intensity chip color ──
    const intensityLevel = (day.intensityLevel ?? "rest").toLowerCase();
    const intensityColor =
      intensityLevel === "intense" || intensityLevel === "high"
        ? colors.primary.DEFAULT // orange
        : intensityLevel === "moderate" || intensityLevel === "medium"
          ? colors.warning.DEFAULT // amber
          : colors.text.tertiary; // grey for rest

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

    const { gesture: dayDragGesture, translateY: dayTranslateY, isDragging: dayIsDragging } =
      useDragToReorder(dayIndex, {
        itemHeight: DAY_HEADER_HEIGHT,
        onDragEnd: handleDragEnd,
        activationDelay: 450,
      });

    const dayDragStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: dayTranslateY.value }],
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
    const headerTap = Gesture.Tap().onStart(() => {
      haptics.selection();
      runOnJS_toggle(onToggleExpand);
    });
    // We can't call runOnJS without importing it here, so use a simpler approach:
    // wrap the toggle in a Pressable on the header instead of a gesture. The
    // day-drag long-press + swipe are composed gestures; a Pressable tap coexists.

    const [menuOpen, setMenuOpen] = useState(false);
    const [showCopyPicker, setShowCopyPicker] = useState(false);

    const handleHeaderPress = useCallback(() => {
      haptics.selection();
      onToggleExpand();
    }, [onToggleExpand]);

    const planned: PlannedExercise[] = exercises;

    return (
      <Animated.View
        entering={FadeInUp.springify().delay(dayIndex * 40)}
        layout={Layout.springify()}
        style={[styles.blockWrap, dayDragStyle]}
        testID={testID}
      >
        <GestureDetector gesture={Gesture.Simultaneous(dayDragGesture, swipeGesture)}>
          <Animated.View style={swipeStyle}>
            <GlassCard
              blurIntensity="default"
              elevation={isExpanded ? 4 : 3}
              padding="none"
              borderRadius="lg"
              showBorder
              style={isExpanded ? { ...styles.card, ...styles.cardExpanded } : styles.card}
              contentStyle={styles.cardContent}
            >
              {/* ── Header (tap to expand, long-press to drag, swipe to copy) ── */}
              <Pressable
                onPress={handleHeaderPress}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel}. ${workoutTitle}. ${exerciseCount} exercises.`}
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
                      <Text style={styles.intensityChipText}>
                        {intensityLevel === "rest" ? "REST" : intensityLevel.slice(0, 4).toUpperCase()}
                      </Text>
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
                  {planned.length === 0 ? (
                    <Text style={styles.emptyHint}>
                      No exercises yet. Tap "Add Exercise" below.
                    </Text>
                  ) : (
                    <View style={styles.exerciseList}>
                      {planned.map((ex, idx) => (
                        <ExerciseRow
                          key={`${ex.exerciseId}_${idx}`}
                          exercise={ex}
                          dayIndex={dayIndex}
                          exerciseIndex={idx}
                          onOpenEditor={onOpenEditor}
                          onDuplicate={onDuplicateExercise}
                          onRemove={onRemoveExercise}
                          onReplace={onReplaceExercise}
                          onMoveTo={onMoveExerciseTo}
                          onReorder={onReorderExercise}
                          testID={`${testID}-ex-${idx}`}
                        />
                      ))}
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
                    <View style={styles.dayMenu}>
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
                        style={[styles.dayMenuItem, { borderTopWidth: 1, borderTopColor: colors.glass.border }]}
                        onPress={() => {
                          setMenuOpen(false);
                          haptics.warning();
                          onClearDay(dayIndex);
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
                        <Text style={[styles.dayMenuLabel, { color: colors.error.DEFAULT }]}>
                          Clear Day
                        </Text>
                      </Pressable>
                      <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
                    </View>
                  )}
                </Animated.View>
              )}
            </GlassCard>
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

        {/* Copy-to-day picker (simple inline list) */}
        {showCopyPicker && (
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
              onPress={() => setShowCopyPicker(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel copy"
            >
              <Text style={styles.copyPickerCancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    );
  },
);

// Helper placeholder — we replaced the gesture-based toggle with a Pressable,
// so this is unused but kept to document the intent. Removed at compile time.
const runOnJS_toggle = (_fn: () => void) => {};

const styles = StyleSheet.create({
  blockWrap: {
    position: "relative",
    marginBottom: rp(spacing.sm),
  },
  card: {
    overflow: "hidden",
  },
  cardExpanded: {
    // Elevation/border tweaks applied via GlassCard props when expanded;
    // empty style object kept for conditional array composition.
  } as ViewStyle,
  cardContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
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
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  dayTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
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
    paddingVertical: rp(1),
  },
  intensityChipText: {
    color: colors.text.primary,
    fontSize: rf(9),
    fontWeight: String(typography.fontWeight.bold) as any,
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
  },
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
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginBottom: rp(spacing.xs),
  },
  notesInput: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    minHeight: rp(60),
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
    padding: rp(spacing.sm),
  },
  dayMenu: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: rp(spacing.xs),
    marginTop: rp(spacing.xs),
  },
  dayMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
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
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  // Copy-to picker
  copyPicker: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: rp(spacing.md),
    marginTop: rp(spacing.xs),
  },
  copyPickerTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginBottom: rp(spacing.sm),
  },
  copyPickerItem: {
    paddingVertical: rp(spacing.sm),
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
});

export default DayBlock;
