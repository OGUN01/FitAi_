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
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { useDragToReorder, usePinchToZoom } from "../../../gestures/handlers";
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
    const intensityLevel = (day.intensityLevel ?? "rest").toLowerCase();
    const isRestState =
      intensityLevel !== "intense" &&
      intensityLevel !== "high" &&
      intensityLevel !== "moderate" &&
      intensityLevel !== "medium";
    const intensityColor = isRestState
      ? colors.background.tertiary
      : intensityLevel === "intense" || intensityLevel === "high"
        ? colors.primary.DEFAULT // orange
        : colors.warning.DEFAULT; // amber
    const intensityLabel =
      intensityLevel === "intense" || intensityLevel === "high"
        ? "HIGH"
        : intensityLevel === "moderate" || intensityLevel === "medium"
          ? "MOD"
          : "REST";

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

    // ── Pinch-to-collapse-all (Phase 8 — usePinchToZoom repurposed).
    //    A pinch IN (scale < 0.8) collapses every expanded day. The gesture is
    //    composed alongside the day-drag + swipe so existing behavior is
    //    untouched; it only ADDS a collapse-all affordance. Haptic `selection`
    //    fires once on collapse. We use usePinchToZoom for its scale tracking
    //    and route the collapse decision through an onEnd observer composed on
    //    top of the returned gesture. ──
    const { gesture: basePinchGesture, scale: pinchScale } = usePinchToZoom(
      0.5,
      1.5,
      { hapticAtLimits: false },
    );
    const handlePinchCollapse = useCallback(() => {
      if (!onCollapseAll) return;
      onCollapseAll();
      haptics.selection();
    }, [onCollapseAll]);
    // Compose an onEnd observer onto the base pinch: if the final scale is
    // below the collapse threshold, fire the collapse handler. `.onEnd()` runs
    // on the UI thread, so the JS callback is routed via runOnJS (mirrors the
    // pattern in handlers.ts useDragToReorder).
    const pinchGesture = basePinchGesture.onEnd(() => {
      if (pinchScale.value < 0.8) {
        runOnJS(handlePinchCollapse)();
      }
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
        <GestureDetector
          gesture={Gesture.Simultaneous(dayDragGesture, swipeGesture, pinchGesture)}
        >
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
                        </View>
                      </View>
                    )}
                  </KeyboardAvoidingView>
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

        {/* Copy-to-day picker — rendered as an absolute overlay so it does NOT
            push subsequent DayBlocks down (layout shift). Positioned over the
            current day block, above siblings via zIndex. */}
        {showCopyPicker && (
          <View style={styles.copyPickerOverlay} pointerEvents="box-none">
            <Pressable
              style={styles.copyPickerBackdrop}
              onPress={() => {
                haptics.selection();
                setShowCopyPicker(false);
              }}
              accessibilityLabel="Cancel copy"
              accessibilityRole="button"
            />
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
          </View>
        )}
      </Animated.View>
    );
  },
);

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
    paddingVertical: rp(spacing.xxs),
  },
  intensityChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
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
  dayMenu: {
    position: "absolute",
    top: rp(spacing.xs),
    right: rp(spacing.md),
    zIndex: 50,
    elevation: 5,
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
    // Lower than dayMenuList so menu items receive taps on Android.
    zIndex: 40,
  } as ViewStyle,
  dayMenuList: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: rp(spacing.xs),
    minWidth: rw(160),
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    // Explicitly above menuDismiss so taps on items always win on Android.
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
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  // Copy-to picker — absolute overlay so it does not push siblings down.
  copyPickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  copyPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  } as ViewStyle,
  copyPicker: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: rp(spacing.md),
    minWidth: rw(220),
    zIndex: 201,
    elevation: 11,
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
