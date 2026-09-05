/**
 * ExerciseRow — premium compact exercise card inside an expanded DayBlock.
 *
 * Layout: [drag handle] [icon disc] [name + muscle chips + meta] [sets×reps] [fav] [kebab]
 *
 * Interactions (all tokenized + haptic):
 *  - Long-press = drag-to-reorder (uses useDragToReorder directly, per Phase 3
 *    note: do NOT depend on Phase 1 DragHandleRow).
 *  - Swipe-left = reveal Duplicate / Replace / Delete actions.
 *  - Double-tap = toggle favourite (createDoubleTapGesture) — visual + haptic.
 *  - Tap row = open editor (openEditor({dayIndex, exerciseIndex})).
 *  - Kebab menu = Edit / Duplicate / Move to... / Replace / Remove.
 *
 * Superset indicator: if exercise.supersetId is set, render a purple "SS" chip
 * + a purple left-border rail. Grouped rows (isFirstInSuperset/
 * isLastInSuperset, computed by the parent list) stack flush with flattened
 * abutting corners so the rail reads as one continuous bracket spanning the
 * group rather than independent per-row segments.
 *
 * Thumbnail: category-keyed icon + gradient (see CATEGORY_THUMBNAIL below),
 * resolved from CuratedExercise.category — not a per-exercise GIF (too heavy
 * for a scrollable list of small discs).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { useDragToReorder, createDoubleTapGesture } from "../../../gestures/handlers";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  errorText,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import { CURATED_EXERCISES } from "../../../data/curatedExercises";
import { toggleFavorite as serviceToggleFavorite } from "../../../services/exercisePickerService";
import type { PlannedExercise } from "../../../types/workout";

// AsyncStorage key for favourite exercises (v1: local-only persistence).
// SHARED with exercisePickerService — both read/write this key so the picker
// and the row stay in sync. The service is the persistence SSOT; the local
// module-level cache mirrors it for instant visual re-renders.
const FAV_STORAGE_KEY = "favorite_exercises";

// approximate row height for drag snap math — exported so DayBlock's
// useDragReflow (sibling-row reflow during drag) uses the same slot size.
export const EXERCISE_ROW_HEIGHT = 76;

// ----------------------------------------------------------------------------
// Category-keyed thumbnail (icon + gradient). Every row previously rendered
// the identical primary-gradient disc with a hardcoded "barbell-outline"
// icon regardless of exercise type. A full per-exercise GIF thumbnail (as
// used by ExerciseGifPlayer elsewhere) is deliberately not used here — that
// component loads a remote animated asset per instance, which is too heavy
// for a scrollable list of small 44px discs. Instead the thumbnail is keyed
// off CuratedExercise.category so cardio/core/mobility rows read distinctly
// from strength rows at a glance.
// ----------------------------------------------------------------------------
type ExerciseCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio"
  | "full_body";

const CATEGORY_THUMBNAIL: Record<
  ExerciseCategory,
  { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap }
> = {
  chest: { gradient: [colors.primary.DEFAULT, colors.primary.dark], icon: "barbell-outline" },
  back: { gradient: [colors.info.DEFAULT, colors.info.dark], icon: "body-outline" },
  shoulders: { gradient: [colors.secondary.DEFAULT, colors.secondary.dark], icon: "accessibility-outline" },
  // arms/core intentionally avoid colors.rest and colors.error: this same file
  // uses .rest for rest-day semantics elsewhere and .error for the destructive
  // delete-swipe action + RPE danger dot, so reusing either as a decorative
  // category color would collide with an existing meaning in this component.
  arms: { gradient: [colors.info.DEFAULT, colors.secondary.dark], icon: "fitness-outline" },
  legs: { gradient: [colors.success.DEFAULT, colors.success.dark], icon: "walk-outline" },
  core: { gradient: [colors.warning.DEFAULT, colors.success.dark], icon: "ellipse-outline" },
  cardio: { gradient: [colors.warning.DEFAULT, colors.warning.dark], icon: "heart-outline" },
  full_body: { gradient: [colors.primary.DEFAULT, colors.secondary.dark], icon: "layers-outline" },
};

const DEFAULT_THUMBNAIL = CATEGORY_THUMBNAIL.full_body;

// Module-level id→exercise map (built once) so each row does an O(1) lookup
// instead of a CURATED_EXERCISES.find() linear scan on every render — the
// scan re-ran for every row across every day on every keystroke elsewhere in
// the builder (e.g. Notes text input) before this component was memoized.
const CURATED_EXERCISES_BY_ID: ReadonlyMap<string, (typeof CURATED_EXERCISES)[number]> = new Map(
  CURATED_EXERCISES.map((c) => [c.id, c]),
);

export interface ExerciseRowProps {
  exercise: PlannedExercise;
  dayIndex: number;
  exerciseIndex: number;
  /** Open the exercise editor (tap row). */
  onOpenEditor: (dayIndex: number, exerciseIndex: number) => void;
  /** Duplicate this exercise in-place. */
  onDuplicate: (dayIndex: number, exerciseIndex: number) => void;
  /** Remove this exercise. */
  onRemove: (dayIndex: number, exerciseIndex: number) => void;
  /** Replace this exercise (opens picker in replace mode). */
  onReplace: (dayIndex: number, exerciseIndex: number) => void;
  /** Move this exercise to another day (opens day picker). */
  onMoveTo: (dayIndex: number, exerciseIndex: number) => void;
  /** Reorder within this day (drag end). */
  onReorder: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  /**
   * Live sibling-row offsets during a within-day drag (owned by DayBlock's
   * useDragReflow) — read directly by this row's own drag animated style so
   * non-dragged rows visibly shift out of the way while another row drags
   * over them.
   */
  reflowOffsets: SharedValue<number[]>;
  /** Reports live drag position up to DayBlock for sibling reflow. */
  onDragMove?: (dayIndex: number, fromIndex: number, targetIndex: number) => void;
  /** True when this is the first row of a contiguous superset group (rounds
   *  the top of the connector bracket). Computed by the parent list. */
  isFirstInSuperset?: boolean;
  /** True when this is the last row of a contiguous superset group (rounds
   *  the bottom of the connector bracket). Computed by the parent list. */
  isLastInSuperset?: boolean;
  /** Same as isFirstInSuperset but for a contiguous circuit run (Workout
   * Engine v2 Phase 4B.1 — circuits previously had no visual language
   * anywhere in the app; this establishes one, mirrored in the live
   * session screen so the two never diverge). */
  isFirstInCircuit?: boolean;
  /** Same as isLastInSuperset but for a contiguous circuit run. */
  isLastInCircuit?: boolean;
  /** Test ID prefix. */
  testID?: string;
}

// ----------------------------------------------------------------------------
// Favourites cache (module-level so all rows share one AsyncStorage read)
// ----------------------------------------------------------------------------
let favouriteSet: Set<string> | null = null;
const favouriteListeners = new Set<(ids: Set<string>) => void>();

function loadFavourites(): void {
  AsyncStorage.getItem(FAV_STORAGE_KEY)
    .then((raw: string | null) => {
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      favouriteSet = new Set(ids);
      favouriteListeners.forEach((fn) => fn(favouriteSet!));
    })
    .catch(() => {
      favouriteSet = new Set();
    });
}

/**
 * Toggle favourite state. Phase 8: persistence is delegated to
 * exercisePickerService.toggleFavorite (the single SSOT — same AsyncStorage
 * key). The local module-level cache is updated optimistically for instant
 * visual re-render, then the service call persists. If the service fails, the
 * local cache is rolled back so the UI doesn't lie.
 */
function toggleFavourite(exerciseId: string): void {
  if (!favouriteSet) {
    favouriteSet = new Set();
  }
  const wasFav = favouriteSet.has(exerciseId);
  // Optimistic local update (instant visual feedback)
  if (wasFav) {
    favouriteSet.delete(exerciseId);
  } else {
    favouriteSet.add(exerciseId);
  }
  favouriteListeners.forEach((fn) => fn(new Set(favouriteSet!)));
  // Persist via the picker service (SSOT). Roll back the optimistic cache on
  // failure so the UI reflects the true persisted state.
  serviceToggleFavorite(exerciseId).catch(() => {
    // Roll back — service failed, restore prior state.
    if (wasFav) {
      favouriteSet!.add(exerciseId);
    } else {
      favouriteSet!.delete(exerciseId);
    }
    favouriteListeners.forEach((fn) => fn(new Set(favouriteSet!)));
  });
}

/** Hook into the shared favourite set (re-renders on any toggle). */
function useFavourites(): Set<string> {
  const [, force] = useState(0);
  useEffect(() => {
    if (favouriteSet === null) {
      loadFavourites();
    }
    const listener = () => force((n) => n + 1);
    favouriteListeners.add(listener);
    return () => {
      favouriteListeners.delete(listener);
    };
  }, []);
  return favouriteSet ?? new Set();
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

const ExerciseRowComponent: React.FC<ExerciseRowProps> = ({
  exercise,
  dayIndex,
  exerciseIndex,
  onOpenEditor,
  onDuplicate,
  onRemove,
  onReplace,
  onMoveTo,
  onReorder,
  reflowOffsets,
  onDragMove,
  isFirstInSuperset = false,
  isLastInSuperset = false,
  isFirstInCircuit = false,
  isLastInCircuit = false,
  testID,
}) => {
  const favourites = useFavourites();
  const isFavourite = favourites.has(exercise.exerciseId);

  // Resolve curated metadata (muscle groups, equipment, difficulty)
  const curated = CURATED_EXERCISES_BY_ID.get(exercise.exerciseId);
  const muscleGroups = curated?.muscleGroups ?? [];
  const equipment = curated?.equipment ?? [];
  const difficulty = curated?.difficulty ?? "intermediate";
  const thumbnail =
    (curated?.category && CATEGORY_THUMBNAIL[curated.category]) || DEFAULT_THUMBNAIL;

  // Sets × reps summary
  const setCount = exercise.sets.length;
  const firstReps = exercise.sets[0]?.reps;
  const repsLabel =
    typeof firstReps === "string"
      ? firstReps
      : firstReps != null
        ? String(firstReps)
        : "—";

  // ── Drag-to-reorder (inlined useDragToReorder — Phase 1 DragHandleRow not
  //    available; pattern lifted from CreateWorkoutScreen:61). ──
  const handleDragEnd = useCallback(
    (from: number, to: number) => {
      const clamped = Math.max(0, to);
      if (from !== clamped) {
        onReorder(dayIndex, from, clamped);
      }
    },
    [dayIndex, onReorder],
  );

  const handleDragMove = useCallback(
    (from: number, to: number) => {
      onDragMove?.(dayIndex, from, to);
    },
    [dayIndex, onDragMove],
  );

  const { gesture: dragGesture, translateY, isDragging } = useDragToReorder(
    exerciseIndex,
    {
      itemHeight: EXERCISE_ROW_HEIGHT,
      onDragEnd: handleDragEnd,
      onDragMove: handleDragMove,
      activationDelay: 400,
    },
  );

  const dragAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          translateY.value + (reflowOffsets.value[exerciseIndex] ?? 0),
      },
    ],
    opacity: isDragging.value ? 0.9 : 1,
    zIndex: isDragging.value ? 100 : 0,
    elevation: isDragging.value ? 6 : 0,
  }));

  // ── Swipe-to-reveal actions (left swipe → Duplicate/Replace/Delete) ──
  const swipeX = useSharedValue(0);
  const SWIPE_ACTION_WIDTH = rw(150);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        swipeX.value = Math.max(-SWIPE_ACTION_WIDTH, event.translationX);
      } else if (swipeX.value < 0) {
        swipeX.value = Math.min(0, event.translationX + swipeX.value);
      }
    })
    .onEnd(() => {
      if (swipeX.value < -SWIPE_ACTION_WIDTH / 2) {
        swipeX.value = withSpring(-SWIPE_ACTION_WIDTH, animations.spring.snappy);
        haptics.selection();
      } else {
        swipeX.value = withSpring(0, animations.spring.default);
      }
    });

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const actionOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(swipeX.value, [-SWIPE_ACTION_WIDTH, 0], [1, 0]),
  }));

  // ── Double-tap to favourite ──
  const doubleTapGesture = createDoubleTapGesture(
    () => {
      toggleFavourite(exercise.exerciseId);
      haptics.celebration();
    },
    { hapticFeedback: false }, // we fire celebration manually
  );

  // Bug fix (live-reproduced via Playwright against the web dev server): the
  // GestureDetector below wraps rowInner, which also contains the nested
  // Favourite and Kebab ("More actions") Pressables. RNGH's tap/double-tap
  // recognizers don't automatically yield to those nested Pressables just
  // because they're plain RN Pressables — a tap on "More actions" ALSO
  // satisfies this row's own single-tap gesture. Because that tap gesture is
  // raced against doubleTapGesture inside Gesture.Exclusive, it only
  // resolves ~300ms later (animations.gesture.doubleTapDelay), so it fires
  // as a DELAYED, seemingly-unrelated onOpenEditor call — popping the
  // Exercise Editor Sheet on top of whatever the kebab action just opened.
  // Confirmed live: tapping "More actions" then "Replace" opens the
  // ExercisePickerSheet as expected, but ~300ms later this row's own Editor
  // Sheet ALSO opens on top of it (mid-search), and both sheets render an
  // identically-labeled "Close" (X) button — a user closing the unexpected
  // top sheet reasonably believes they've cancelled the replace, while the
  // picker (and its pickerContext) is still open underneath.
  // (Gesture.Native() — the RNGH-documented way to give nested native
  // touchables responder priority — was tried first but is a no-op on the
  // web target, since react-native-gesture-handler-web's Pressables don't
  // participate in the native responder system Gesture.Native() detects.
  // A plain synchronous flag, set by the nested Pressables themselves and
  // read once at the very start of the row's tap gesture, works on every
  // platform because it doesn't depend on responder-system interop at all.)
  const suppressRowTap = useSharedValue(false);
  const markNestedPressableTap = useCallback(() => {
    suppressRowTap.value = true;
    // Auto-clear shortly after — well past the ~300ms doubleTap disambiguation
    // window this is guarding — so a stray flag can never suppress a later,
    // genuine tap on the row body.
    setTimeout(() => {
      suppressRowTap.value = false;
    }, 500);
  }, [suppressRowTap]);

  // ── Tap to open editor (composed with double-tap so a single tap doesn't
  //    pre-empt the double-tap; Gesture.Exclusive lets the double-tap win). ──
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      if (suppressRowTap.value) return;
      haptics.cardTap();
      onOpenEditor(dayIndex, exerciseIndex);
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, tapGesture);

  // ── Kebab menu ──
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const menuItems = [
    {
      label: "Edit",
      icon: "create-outline" as const,
      onPress: () => {
        setMenuOpen(false);
        onOpenEditor(dayIndex, exerciseIndex);
      },
    },
    {
      label: "Duplicate",
      icon: "copy-outline" as const,
      onPress: () => {
        setMenuOpen(false);
        onDuplicate(dayIndex, exerciseIndex);
      },
    },
    {
      label: "Move to…",
      icon: "arrow-redo-outline" as const,
      onPress: () => {
        setMenuOpen(false);
        onMoveTo(dayIndex, exerciseIndex);
      },
    },
    {
      label: "Replace",
      icon: "swap-horizontal-outline" as const,
      onPress: () => {
        setMenuOpen(false);
        onReplace(dayIndex, exerciseIndex);
      },
    },
    {
      label: "Remove",
      icon: "trash-outline" as const,
      onPress: () => {
        setMenuOpen(false);
        haptics.delete();
        onRemove(dayIndex, exerciseIndex);
      },
      isDestructive: true,
    },
  ];

  const intensityColor =
    exercise.targetRpe != null
      ? exercise.targetRpe >= 8
        ? colors.error.DEFAULT
        : exercise.targetRpe >= 6
          ? colors.warning.DEFAULT
          : colors.success.DEFAULT
      : colors.primary.DEFAULT;

  const supersetActive = Boolean(exercise.supersetId);
  // Circuit visual language (Workout Engine v2 Phase 4B.1) — mirrors the
  // superset treatment exactly (same rail/chip/connector mechanics), just
  // colors.warning.DEFAULT instead of colors.secondary.DEFAULT and a
  // "CIRC" chip instead of "SS", so the two read as siblings, not
  // unrelated concepts. Superset/circuit are mutually exclusive per
  // exercise (the builder enforces this), so exactly one of these is ever
  // true for a given row.
  const circuitActive = Boolean(exercise.circuitId);
  const groupActive = supersetActive || circuitActive;
  const isFirstInGroup = supersetActive ? isFirstInSuperset : isFirstInCircuit;
  const isLastInGroup = supersetActive ? isLastInSuperset : isLastInCircuit;

  // Group connector: grouped rows stack flush (tight margin) with their
  // abutting corners flattened, so the shared left rail (styles.supersetRail/
  // styles.circuitRail) reads as one continuous bracket spanning the group
  // instead of separate per-row rail segments.
  const connectorMarginStyle: ViewStyle = groupActive
    ? { marginBottom: isLastInGroup ? rp(spacing.xs) : rp(2) }
    : {};
  const connectorCornerStyle: ViewStyle = groupActive
    ? {
        borderTopLeftRadius: isFirstInGroup ? borderRadius.lg : 0,
        borderTopRightRadius: isFirstInGroup ? borderRadius.lg : 0,
        borderBottomLeftRadius: isLastInGroup ? borderRadius.lg : 0,
        borderBottomRightRadius: isLastInGroup ? borderRadius.lg : 0,
      }
    : {};

  return (
    <View style={[styles.container, connectorMarginStyle]} testID={testID}>
      {/* Swipe-revealed actions (sit behind the row, revealed on left swipe) */}
      <Animated.View style={[styles.actionsLayer, actionOpacity]} pointerEvents="box-none">
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.info.DEFAULT }]}
          onPress={() => {
            swipeX.value = withSpring(0, animations.spring.default);
            haptics.selection();
            onDuplicate(dayIndex, exerciseIndex);
          }}
          accessibilityRole="button"
          accessibilityLabel="Duplicate exercise"
          accessibilityHint="Creates a copy of this exercise immediately below"
        >
          <Ionicons name="copy-outline" size={rf(18)} color={colors.text.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.warning.DEFAULT }]}
          onPress={() => {
            swipeX.value = withSpring(0, animations.spring.default);
            haptics.selection();
            onReplace(dayIndex, exerciseIndex);
          }}
          accessibilityRole="button"
          accessibilityLabel="Replace exercise"
          accessibilityHint="Opens the exercise picker to swap this exercise"
        >
          <Ionicons name="swap-horizontal-outline" size={rf(18)} color={colors.text.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.error.DEFAULT }]}
          onPress={() => {
            swipeX.value = withSpring(0, animations.spring.default);
            haptics.delete();
            onRemove(dayIndex, exerciseIndex);
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete exercise"
          accessibilityHint="Removes this exercise from the day"
        >
          <Ionicons name="trash-outline" size={rf(18)} color={colors.text.primary} />
        </Pressable>
      </Animated.View>

      {/* The row itself — draggable + swipeable + tappable */}
      <GestureDetector gesture={Gesture.Simultaneous(dragGesture, swipeGesture)}>
        <Animated.View
          style={[styles.row, connectorCornerStyle, dragAnimatedStyle, swipeAnimatedStyle]}
          // NOT role=button: this is a multi-gesture surface (tap / double-tap /
          // long-press / swipe), and the role made RN-web render a real <button>
          // wrapping the favourite + kebab <button>s — invalid nested buttons
          // (React hydration error). Every concrete action has its own labeled
          // button (favourite, kebab, swipe duplicate/replace/delete).
          accessibilityLabel={`${exercise.name}. ${setCount} sets of ${repsLabel}. Double-tap to favorite, swipe left for actions, long-press to drag.`}
        >
          {/* Tap gestures on a separate inner detector so the row body is
              tappable without conflicting with the drag/swipe pan. */}
          <GestureDetector gesture={tapGestures}>
            <Animated.View style={[styles.rowInner, connectorCornerStyle]}>
              {/* Superset left-border indicator (Phase 1 SupersetConnector absent) */}
              {supersetActive && <View style={styles.supersetRail} />}
              {/* Circuit left-border indicator — same mechanic as supersetRail,
                  distinct color, so circuits finally have a visual identity. */}
              {circuitActive && <View style={styles.circuitRail} />}

              {/* Drag handle */}
              <View style={styles.dragHandle} pointerEvents="none">
                <Ionicons
                  name="menu-outline"
                  size={rf(18)}
                  color={colors.text.tertiary}
                />
              </View>

              {/* Thumbnail disc — category-keyed icon + gradient (see
                  CATEGORY_THUMBNAIL above; no per-exercise GIFs here) */}
              <LinearGradient
                colors={thumbnail.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.thumbnail}
              >
                <Ionicons
                  name={thumbnail.icon}
                  size={rf(20)}
                  color={colors.text.primary}
                />
              </LinearGradient>

              {/* Name + meta */}
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  {supersetActive && (
                    <View style={styles.supersetChip}>
                      <Text style={styles.supersetChipText}>SS</Text>
                    </View>
                  )}
                  {circuitActive && (
                    <View style={styles.circuitChip}>
                      <Text style={styles.circuitChipText}>CIRC</Text>
                    </View>
                  )}
                  <View style={[styles.intensityDot, { backgroundColor: intensityColor }]} />
                  {/* adjustsFontSizeToFit/minimumFontScale removed: confirmed
                      (via the Workout Detail screen's Difficulty tile, same
                      class of issue) that React Native Web does not
                      implement adjustsFontSizeToFit — it silently has no
                      effect on web, so this fell straight through to plain
                      numberOfLines={1} ellipsis truncation anyway. Removed
                      the dead props rather than leave them implying a
                      shrink-to-fit behavior that isn't actually happening. */}
                  <Text style={styles.name} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {muscleGroups.slice(0, 2).map((m) => (
                    <View key={m} style={styles.muscleChip}>
                      <Text style={styles.muscleChipText}>{m}</Text>
                    </View>
                  ))}
                  {equipment.length > 0 && (
                    <Text style={styles.metaText} numberOfLines={1}>
                      {equipment[0]} · {difficulty}
                    </Text>
                  )}
                </View>
              </View>

              {/* Sets × reps */}
              <View style={styles.setsCell}>
                <Text style={styles.setsValue} numberOfLines={1}>{setCount}</Text>
                <Text style={styles.setsLabel} numberOfLines={1}>× {repsLabel}</Text>
              </View>

              {/* Favourite */}
              <Pressable
                hitSlop={13}
                onPress={() => {
                  markNestedPressableTap();
                  toggleFavourite(exercise.exerciseId);
                  haptics.celebration();
                }}
                accessibilityRole="button"
                accessibilityLabel={isFavourite ? `Unfavourite ${exercise.name}` : `Favourite ${exercise.name}`}
                accessibilityHint="Double tap to favorite this exercise"
              >
                <Ionicons
                  name={isFavourite ? "heart" : "heart-outline"}
                  size={rf(18)}
                  color={isFavourite ? colors.error.DEFAULT : colors.text.tertiary}
                />
              </Pressable>

              {/* Kebab */}
              <Pressable
                hitSlop={13}
                onPress={() => {
                  markNestedPressableTap();
                  haptics.selection();
                  setMenuOpen((v) => !v);
                }}
                accessibilityRole="button"
                accessibilityLabel="More actions"
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={rf(18)}
                  color={colors.text.secondary}
                />
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>

      {/* Kebab dropdown menu */}
      {menuOpen && (
        <View style={styles.menu} pointerEvents="box-none">
          <Pressable style={styles.menuDismiss} onPress={closeMenu} accessibilityLabel="Close menu" />
          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                style={styles.menuItem}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons
                  name={item.icon}
                  size={rf(16)}
                  color={item.isDestructive ? colors.error.DEFAULT : colors.text.secondary}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    item.isDestructive && { color: errorText },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// Memoized: DayBlock renders one ExerciseRow per exercise across all 7 days.
// Without memo, every row re-rendered (and re-ran the curated-exercise
// lookup) on any single keystroke anywhere in the builder screen.
export const ExerciseRow = React.memo(ExerciseRowComponent);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginBottom: rp(spacing.xs),
  },
  row: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    gap: rp(spacing.xs),
    minHeight: rp(EXERCISE_ROW_HEIGHT),
  },
  supersetRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: rw(3),
    backgroundColor: colors.secondary.DEFAULT,
  },
  // Circuit's rail/chip pair (Workout Engine v2 Phase 4B.1) — identical
  // mechanics to supersetRail/supersetChip, distinct color+label only, so
  // the two group types read as siblings in the builder UI.
  circuitRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: rw(3),
    backgroundColor: colors.warning.DEFAULT,
  },
  dragHandle: {
    width: rw(20),
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  name: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyle["fontWeight"],
    flexShrink: 1,
  },
  supersetChip: {
    backgroundColor: colors.secondary.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xxs),
    paddingVertical: rp(1),
  },
  supersetChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  circuitChip: {
    backgroundColor: colors.warning.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xxs),
    paddingVertical: rp(1),
  },
  circuitChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xxs),
    // Let the equipment·difficulty meta wrap under the muscle chips instead of
    // shrinking to a few px and clipping mid-word on narrow layouts.
    flexWrap: "wrap",
  },
  muscleChip: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(1),
  },
  muscleChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    flexShrink: 1,
  },
  setsCell: {
    alignItems: "center",
    minWidth: rw(44),
  },
  setsValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  setsLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(1),
  },
  intensityDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: borderRadius.full,
    marginRight: 0,
  },
  // Swipe actions (behind row)
  actionsLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  actionBtn: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // Kebab menu
  menu: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 8,
  },
  menuList: {
    position: "absolute",
    top: rp(spacing.sm),
    right: rp(spacing.sm),
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: rp(spacing.xs),
    minWidth: rw(140),
    shadowColor: colors.background.DEFAULT,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    // Explicitly above menuDismiss so taps on items always win on Android.
    zIndex: 41,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: Math.max(rp(44), 44),
  },
  menuIcon: {
    width: rw(18),
  },
  menuLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
    // Lower than menuList so menu items receive taps on Android.
    zIndex: 40,
  },
});

export default ExerciseRow;
