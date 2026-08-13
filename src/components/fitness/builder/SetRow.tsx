/**
 * SetRow — single set row inside the ExerciseEditorSheet's sets list.
 *
 * Layout (left → right):
 *   [drag handle] [set # badge] [reps input] [weight input] [set-type chip] [delete X]
 *
 * Below the row, conditionally:
 *   - setType === 'drop'     → 2 extra inputs (dropWeightKg, dropReps)
 *   - setType === 'superset'  → group-id text input (auto-generated UUID-friendly id)
 *   - setType === 'circuit'   → group-id text input
 *
 * Interactions (all tokenized + haptic):
 *  - Long-press drag handle = reorder sets within the exercise (useDragToReorder).
 *  - Tap set-type chip = cycle normal→warmup→failure→drop→superset→circuit→normal
 *    with `selection` haptic + tokenized color per type.
 *  - Delete X = `warning` haptic + onDelete().
 *  - Add/remove animated via Reanimated `SlideInRight` / `SlideOutLeft` + `Layout`.
 *
 * Reduce-motion is respected on the layout animations (entrance/exit fall back to
 * a plain fade so reduce-motion users don't see sliding).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ViewStyle,
  KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  SlideInRight,
  SlideOutLeft,
  Layout,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
} from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { useDragToReorder } from "../../../gestures/handlers";
import { animations, duration } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import {
  colors,
  flatColors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw, rs } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { useProfileStore } from "../../../stores/profileStore";
import {
  convertWeight,
  parseLocalFloat,
  toDisplayWeight,
  type WeightUnit,
} from "../../../utils/units";
import type { PlannedSet } from "../../../types/workout";

// ============================================================================
// TYPES
// ============================================================================

/** All possible set types in the cycle order. */
const SET_TYPE_CYCLE: PlannedSet["setType"][] = [
  "normal",
  "warmup",
  "failure",
  "drop",
  "superset",
  "circuit",
];

/** Per-type color + label metadata, sourced from aurora tokens / flatColors. */
const SET_TYPE_META: Record<
  PlannedSet["setType"],
  { label: string; color: string; bgTint: string }
> = {
  normal: { label: "Normal", color: flatColors.neutral, bgTint: hexToRgba(flatColors.neutral, 0.18) },
  warmup: { label: "Warmup", color: flatColors.amber, bgTint: hexToRgba(flatColors.amber, 0.18) },
  failure: { label: "Failure", color: colors.error.DEFAULT, bgTint: hexToRgba(colors.error.DEFAULT, 0.18) },
  drop: { label: "Drop", color: flatColors.purple, bgTint: hexToRgba(flatColors.purple, 0.18) },
  superset: { label: "Superset", color: flatColors.cyan, bgTint: hexToRgba(flatColors.cyan, 0.18) },
  circuit: { label: "Circuit", color: flatColors.teal, bgTint: hexToRgba(flatColors.teal, 0.18) },
};

export interface SetRowProps {
  /** The set being edited. */
  set: PlannedSet;
  /** 1-based set number for the badge. */
  setNumber: number;
  /** Total sets in the parent list (clamps the drag target). */
  totalCount: number;
  /** Fires with the updated set on any field change. */
  onChange: (updated: PlannedSet) => void;
  /** Fires when the delete X is pressed. */
  onDelete: () => void;
  /** Fires on drag end with from/to indices (1-based setNumber space). */
  onReorder: (from: number, to: number) => void;
  /**
   * Live sibling-row offsets during a set drag (owned by the parent's
   * useDragReflow, indexed 0-based i.e. `setNumber - 1`) — read directly by
   * this row's own drag animated style so other sets visibly shift out of
   * the way while one is being dragged.
   */
  reflowOffsets: SharedValue<number[]>;
  /** Reports live drag position up to the parent for sibling reflow (0-based). */
  onDragMove?: (fromIndex: number, targetIndex: number) => void;
  /** Test ID prefix. */
  testID?: string;
}

// Approximate row height — used by useDragToReorder for snap math. Tuned to the
// collapsed (non-drop) row height; extra rows below don't affect snap target
// math materially because we reorder by set index, not absolute pixel offset.
// Exported so the parent's useDragReflow (sibling-row reflow) uses the same
// slot size.
export const SET_ROW_HEIGHT = 64;

// ============================================================================
// COMPONENT
// ============================================================================

export const SetRow: React.FC<SetRowProps> = ({
  set,
  setNumber,
  totalCount,
  onChange,
  onDelete,
  onReorder,
  reflowOffsets,
  onDragMove,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // ── Weight units ──
  // Weights are STORED as kg (PlannedSet.weightKg / dropWeightKg) and
  // displayed in the user's preferred unit. Imperial users type pounds;
  // we convert to kg on commit so persistence stays metric.
  // (Two-step select → derive, matching WorkoutSessionScreen — the jest
  // profileStore mock ignores selectors, so a one-step selector would
  // receive the whole state object in tests.)
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const userUnits: WeightUnit = personalInfo?.units === "imperial" ? "lbs" : "kg";

  /** kg → display string in the user's unit (1-decimal precision). */
  const toDisplay = useCallback(
    (kg: number | null | undefined): string => {
      if (kg == null) return "";
      const v = toDisplayWeight(kg, userUnits);
      if (v == null) return "";
      return String(Math.round(v * 10) / 10);
    },
    [userUnits],
  );

  /** Display string in the user's unit → kg for storage. */
  const fromDisplay = useCallback(
    (text: string): number | undefined => {
      const trimmed = text.trim();
      if (trimmed === "") return undefined;
      const asNum = parseLocalFloat(trimmed);
      if (Number.isNaN(asNum)) return undefined;
      // Round to 2 decimals kg so lbs round-trips don't drift.
      return Math.round(convertWeight(asNum, userUnits, "kg") * 100) / 100;
    },
    [userUnits],
  );

  // ── Local input state ──
  // We mirror reps/weight as strings so the user can type "8-12" ranges and
  // intermediate states like "" without the parent PlannedSet coercing to a
  // number. On blur / submit we reconcile back into the PlannedSet shape.
  const [repsText, setRepsText] = useState<string>(
    typeof set.reps === "string" ? set.reps : set.reps != null ? String(set.reps) : "",
  );
  const [weightText, setWeightText] = useState<string>(() =>
    toDisplay(set.weightKg),
  );
  const [dropWeightText, setDropWeightText] = useState<string>(() =>
    toDisplay(set.dropWeightKg),
  );
  const [dropRepsText, setDropRepsText] = useState<string>(
    set.dropReps != null ? String(set.dropReps) : "",
  );
  // NOTE: supersetId / circuitId live on PlannedExercise, NOT on PlannedSet.
  // The set-type chip here only cycles the setType; the exercise-level
  // Superset/Circuit section in ExerciseEditorSheet owns the group id.

  // Keep local text in sync if the parent set reference changes externally
  // (e.g. undo, AI fill). We compare against the canonical values so we don't
  // clobber in-flight typing.
  useEffect(() => {
    const canonicalReps =
      typeof set.reps === "string" ? set.reps : set.reps != null ? String(set.reps) : "";
    if (canonicalReps !== repsText && set.reps !== parseRepsOrNumber(repsText)) {
      setRepsText(canonicalReps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.reps]);

  useEffect(() => {
    const canonicalWeight = toDisplay(set.weightKg);
    if (canonicalWeight !== weightText && set.weightKg !== fromDisplay(weightText)) {
      setWeightText(canonicalWeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.weightKg, userUnits]);

  useEffect(() => {
    if (set.setType !== "drop") return;
    const canonical = toDisplay(set.dropWeightKg);
    if (canonical !== dropWeightText && set.dropWeightKg !== fromDisplay(dropWeightText)) {
      setDropWeightText(canonical);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.dropWeightKg, set.setType, userUnits]);

  useEffect(() => {
    if (set.setType !== "drop") return;
    const canonical = set.dropReps != null ? String(set.dropReps) : "";
    if (canonical !== dropRepsText && set.dropReps !== parseNumberOrNull(dropRepsText)) {
      setDropRepsText(canonical);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.dropReps, set.setType]);

  // ── Drag-to-reorder ──
  const handleDragEnd = useCallback(
    (from: number, to: number) => {
      const clamped = Math.max(0, Math.min(totalCount - 1, to));
      if (from !== clamped) {
        // Convert 0-based itemIndex to 1-based setNumber space.
        onReorder(from + 1, clamped + 1);
      }
    },
    [totalCount, onReorder],
  );

  const { gesture: dragGesture, translateY, isDragging } = useDragToReorder(
    setNumber - 1,
    {
      itemHeight: SET_ROW_HEIGHT,
      activationDelay: animations.gesture.longPressDuration - 100,
      onDragEnd: handleDragEnd,
      onDragMove,
      hapticFeedback: true,
    },
  );

  const dragAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          translateY.value + (reflowOffsets.value[setNumber - 1] ?? 0),
      },
    ],
    opacity: isDragging.value ? 0.92 : 1,
    zIndex: isDragging.value ? 100 : 0,
    elevation: isDragging.value ? 6 : 0,
    ...(isDragging.value
      ? {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: rs(4) },
          shadowOpacity: 0.3,
          shadowRadius: rs(8),
        }
      : {}),
  }));

  // Entrance/exit animations: reduce-motion falls back to a short fade so users
  // who disable motion don't see a slide. `springify()` is called with no
  // config (Reanimated v3 layout builders don't accept a spring config object
  // as a positional arg — the builder API uses chained `.damping()/.stiffness()`
  // methods; the defaults are tuned for UI motion).
  const entering = reduceMotion
    ? FadeIn.duration(duration.quick)
    : SlideInRight.springify().duration(duration.normal);
  const exiting = reduceMotion
    ? FadeOut.duration(duration.quick)
    : SlideOutLeft.springify().duration(duration.normal);

  // ── Field update helpers ──
  const patch = useCallback(
    (partial: Partial<PlannedSet>) => {
      onChange({ ...set, ...partial });
    },
    [onChange, set],
  );

  const commitReps = useCallback(() => {
    const trimmed = repsText.trim();
    if (trimmed === "") {
      patch({ reps: 0 });
      return;
    }
    // Range string ("8-12") stays a string; pure number becomes a number.
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && !trimmed.includes("-")) {
      patch({ reps: asNum });
    } else {
      patch({ reps: trimmed });
    }
  }, [repsText, patch]);

  const commitWeight = useCallback(() => {
    patch({ weightKg: fromDisplay(weightText) });
  }, [weightText, fromDisplay, patch]);

  const commitDropWeight = useCallback(() => {
    patch({ dropWeightKg: fromDisplay(dropWeightText) });
  }, [dropWeightText, fromDisplay, patch]);

  const commitDropReps = useCallback(() => {
    const trimmed = dropRepsText.trim();
    if (trimmed === "") {
      patch({ dropReps: undefined });
      return;
    }
    const asNum = parseInt(trimmed, 10);
    patch({ dropReps: Number.isNaN(asNum) ? undefined : asNum });
  }, [dropRepsText, patch]);

  // ── Set-type cycle (normal→warmup→failure→drop→superset→circuit→normal) ──
  // The group id (supersetId/circuitId) lives on PlannedExercise, not on the
  // set — it is owned by the editor's Superset/Circuit section. The chip here
  // only cycles the setType.
  const cycleSetType = useCallback(() => {
    const currentIdx = SET_TYPE_CYCLE.indexOf(set.setType);
    const nextIdx = (currentIdx + 1) % SET_TYPE_CYCLE.length;
    const nextType = SET_TYPE_CYCLE[nextIdx];
    haptics.selection();
    patch({ setType: nextType });
  }, [set.setType, patch]);

  // ── Delete ──
  const handleDelete = useCallback(() => {
    haptics.warning();
    onDelete();
  }, [onDelete]);

  const typeMeta = SET_TYPE_META[set.setType];
  const isDrop = set.setType === "drop";

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      layout={Layout.springify()}
      style={styles.outer}
      testID={testID}
    >
      <GestureDetector gesture={dragGesture}>
        <Animated.View
          style={[styles.row, dragAnimatedStyle]}
          accessibilityRole="button"
          accessibilityLabel={`Set ${setNumber}, ${typeMeta.label}, ${repsText || "—"} reps${
            weightText ? `, ${weightText} ${userUnits}` : ""
          }`}
          accessibilityHint="Long-press the drag handle to reorder this set"
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} pointerEvents="box-none">
            <Ionicons
              name="menu-outline"
              size={rf(20)}
              color={colors.text.tertiary}
            />
          </View>

          {/* Set number badge */}
          <View
            style={styles.setNumberBadge}
            accessibilityRole="text"
            accessibilityLabel={`Set ${setNumber}`}
          >
            <Text style={styles.setNumberText}>{setNumber}</Text>
          </View>

          {/* Reps input */}
          <LabeledInput
            label="Reps"
            value={repsText}
            onChangeText={setRepsText}
            onEndEditing={commitReps}
            placeholder="8-12"
            keyboardType="numeric"
            accessibilityLabel={`Reps for set ${setNumber}`}
            style={styles.repsInput}
          />

          {/* Weight input */}
          <LabeledInput
            label={userUnits}
            value={weightText}
            onChangeText={setWeightText}
            onEndEditing={commitWeight}
            placeholder="—"
            keyboardType="numeric"
            accessibilityLabel={`Weight in ${userUnits === "lbs" ? "pounds" : "kilograms"} for set ${setNumber}`}
            style={styles.weightInput}
          />

          {/* Set-type chip */}
          <Pressable
            onPress={cycleSetType}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Set type: ${typeMeta.label}. Tap to cycle.`}
            accessibilityHint="Cycles through Normal, Warmup, Failure, Drop, Superset, Circuit"
          >
            <View
              style={[
                styles.typeChip,
                { backgroundColor: typeMeta.bgTint, borderColor: typeMeta.color },
              ]}
            >
              <Text style={[styles.typeChipText, { color: typeMeta.color }]}>
                {typeMeta.label}
              </Text>
            </View>
          </Pressable>

          {/* Delete */}
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Delete set ${setNumber}`}
            style={styles.deleteBtn}
          >
            <Ionicons
              name="close"
              size={rf(16)}
              color={colors.text.tertiary}
            />
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* Drop-set extra inputs (only shown when this set is a drop set). The
          superset/circuit group id lives on PlannedExercise and is owned by
          the editor's Superset/Circuit section, so there's no extra row here
          for those set types. */}
      {isDrop && (
        <Animated.View
          entering={reduceMotion ? FadeIn.duration(duration.quick) : SlideInRight.springify()}
          exiting={reduceMotion ? FadeOut.duration(duration.quick) : SlideOutLeft.springify()}
          layout={Layout.springify()}
          style={styles.extraRow}
        >
          <Text style={styles.extraLabel}>Drop to:</Text>
          <LabeledInput
            label={userUnits}
            value={dropWeightText}
            onChangeText={setDropWeightText}
            onEndEditing={commitDropWeight}
            placeholder="—"
            keyboardType="numeric"
            accessibilityLabel={`Drop set weight in ${userUnits === "lbs" ? "pounds" : "kilograms"}`}
            style={styles.dropWeightInput}
          />
          <LabeledInput
            label="Reps"
            value={dropRepsText}
            onChangeText={setDropRepsText}
            onEndEditing={commitDropReps}
            placeholder="—"
            keyboardType="numeric"
            accessibilityLabel="Drop set reps"
            style={styles.dropRepsInput}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// LABELED INPUT (small text field with a caption above)
// ============================================================================

interface LabeledInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onEndEditing: () => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  value,
  onChangeText,
  onEndEditing,
  placeholder,
  keyboardType = "default",
  accessibilityLabel,
  style,
}) => (
  <View style={[styles.labeledInput, style]}>
    <Text style={styles.labeledInputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onEndEditing={onEndEditing}
      placeholder={placeholder}
      placeholderTextColor={colors.text.tertiary}
      keyboardType={keyboardType}
      style={styles.labeledInputField}
      accessibilityLabel={accessibilityLabel}
      returnKeyType="done"
      selectTextOnFocus
    />
  </View>
);

// ============================================================================
// PARSERS
// ============================================================================

/** Parse a reps string that may be "8-12" (range) or "8" (number). */
function parseRepsOrNumber(text: string): number | string {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  if (trimmed.includes("-")) return trimmed;
  const n = Number(trimmed);
  return Number.isNaN(n) ? trimmed : n;
}

function parseNumberOrNull(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  outer: {
    marginBottom: rp(spacing.xs),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    gap: rp(spacing.xs),
    minHeight: rp(SET_ROW_HEIGHT),
  },
  dragHandle: {
    width: rw(24),
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberBadge: {
    width: rw(28),
    height: rw(28),
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as TextStyleWeight,
  },
  labeledInput: {
    flex: 1,
  },
  labeledInputLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginBottom: rp(2),
  },
  labeledInputField: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
    paddingVertical: rp(spacing.xxs),
    paddingHorizontal: rp(spacing.xs),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    minWidth: 0,
  },
  repsInput: {
    flex: 1.1,
  },
  weightInput: {
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    minHeight: Math.max(rp(28), 44),
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  },
  deleteBtn: {
    width: Math.max(rw(28), 44),
    height: Math.max(rw(28), 44),
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
  },
  // Extra rows (drop set / superset / circuit)
  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(spacing.xxs),
    marginLeft: rp(24 + 28 + spacing.xs), // indent past handle + badge (rp-scaled)
    gap: rp(spacing.xs),
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  extraLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  },
  dropWeightInput: {
    flex: 1,
  },
  dropRepsInput: {
    flex: 1,
  },
});

// Cast helper for `fontWeight` which RN types as a specific union.
type TextStyleWeight = "300" | "400" | "500" | "600" | "700" | "800" | "900" | "bold" | "normal";

export default SetRow;
