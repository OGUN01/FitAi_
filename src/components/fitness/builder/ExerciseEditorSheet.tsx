/**
 * ExerciseEditorSheet — Phase 5 exercise editor sheet.
 *
 * One beautiful scrollable sheet to edit everything about a planned exercise.
 * Mounted ONCE at the WeeklyBuilderScreen level; visibility is driven by the
 * `workoutBuilderStore.editorOpen` flag and `editorContext` ({dayIndex,
 * exerciseIndex}).
 *
 * Sections (collapsible via SectionHeader with animated chevron):
 *   a. Header       — editable name, muscle/equipment/difficulty chips
 *   b. Sets         — list of SetRow + "Add Set" GlassButton
 *   c. Rest timer   — Slider (15-300s) + RestTimerRadial preview
 *   d. RPE          — Slider 1-10 with labels
 *   e. Tempo        — 4-digit "E-P-C-P" input + tooltip
 *   f. Intensity    — SegmentedControl for default set type of NEW sets
 *   g. Superset/Circuit — SegmentedControl None/Superset/Circuit + group picker
 *   h. Notes        — multiline auto-grow TextInput
 *   i. Alternative  — placeholder "Change" button (Phase 4 picker not ready)
 *   j. PR           — read-only display from exercise_prs (analyticsStore)
 *   k. History      — mini AnimatedChart of last 10 sessions volume
 *
 * Save is implicit — every change writes through to the store via
 * `updateExercise(dayIndex, exerciseIndex, updated)`. Close button calls
 * `closeEditor()` and fires a `success` haptic. If a set weight exceeds the
 * existing PR, a Confetti burst + `celebration` haptic fires on close.
 *
 * Reduce-motion is respected on the section chevron rotation and any
 * spring-based decorative motion.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { Slider } from "../../ui/Slider";
import { SegmentedControl, SegmentOption } from "../../ui/SegmentedControl";
import { RestTimerRadial } from "../../ui/aurora/RestTimerRadial";
import { Confetti } from "../../ui/aurora/Confetti";
import { AnimatedChart } from "../../charts/AnimatedChart";
import { SetRow } from "./SetRow";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { useAnalyticsStore } from "../../../stores/analyticsStore";
import { CURATED_EXERCISES } from "../../../data/curatedExercises";
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
import type { PlannedExercise, PlannedSet } from "../../../types/workout";

// ============================================================================
// CONSTANTS
// ============================================================================

const REST_MIN = 15;
const REST_MAX = 300;
const RPE_MIN = 1;
const RPE_MAX = 10;
const DEFAULT_TEMPO = "2-0-2-0";
const DEFAULT_REST = 60;

const DEFAULT_SET_TYPE_OPTIONS: SegmentOption[] = [
  { id: "normal", label: "Normal", value: "normal" },
  { id: "warmup", label: "Warmup", value: "warmup" },
  { id: "failure", label: "Failure", value: "failure" },
  { id: "drop", label: "Drop", value: "drop" },
];

const SUPERSET_MODE_OPTIONS: SegmentOption[] = [
  { id: "none", label: "None", value: "none" },
  { id: "superset", label: "Superset", value: "superset" },
  { id: "circuit", label: "Circuit", value: "circuit" },
];

const RPE_LABELS: Record<number, string> = {
  1: "Very Easy",
  2: "Easy",
  3: "Moderate",
  4: "Somewhat Hard",
  5: "Hard",
  6: "Hard+",
  7: "Very Hard",
  8: "Extremely Hard",
  9: "Near Max",
  10: "Max Effort",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ExerciseEditorSheet: React.FC<{ testID?: string }> = ({
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // ── Store subscriptions ──
  const editorOpen = useWorkoutBuilderStore((s) => s.editorOpen);
  const editorContext = useWorkoutBuilderStore((s) => s.editorContext);
  const draft = useWorkoutBuilderStore((s) => s.draft);
  const closeEditor = useWorkoutBuilderStore((s) => s.closeEditor);
  const updateExercise = useWorkoutBuilderStore((s) => s.updateExercise);

  // ── Analytics (PR + history) ──
  const personalRecords = useAnalyticsStore((s) => s.personalRecords);
  const exerciseVolumeHistory = useAnalyticsStore((s) => s.exerciseVolumeHistory);

  // ── Resolve the exercise being edited ──
  const exercise = useMemo<PlannedExercise | null>(() => {
    if (!editorContext || !draft) return null;
    const day = draft.workouts[editorContext.dayIndex];
    const ex = day?.plannedExercises?.[editorContext.exerciseIndex];
    return ex ?? null;
  }, [editorContext, draft]);

  // ── Curated metadata (muscle groups, equipment, difficulty) ──
  const curated = useMemo(() => {
    if (!exercise) return null;
    return CURATED_EXERCISES.find((c) => c.id === exercise.exerciseId) ?? null;
  }, [exercise]);

  // ── PR for this exercise ──
  const pr = useMemo(() => {
    if (!exercise) return null;
    return (
      personalRecords.find(
        (p) => p.exerciseId === exercise.exerciseId && p.weightKg > 0,
      ) ?? null
    );
  }, [personalRecords, exercise]);

  // ── History mini-chart: last 10 sessions total volume for this exercise ──
  const historyPoints = useMemo(() => {
    if (!exercise) return [];
    return exerciseVolumeHistory
      .filter((h) => h.exerciseId === exercise.exerciseId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);
  }, [exerciseVolumeHistory, exercise]);

  // ── Sibling exercises (for superset/circuit grouping picker) ──
  const siblingExercises = useMemo<PlannedExercise[]>(() => {
    if (!editorContext || !draft) return [];
    const day = draft.workouts[editorContext.dayIndex];
    if (!day?.plannedExercises) return [];
    return day.plannedExercises.filter(
      (_, i) => i !== editorContext.exerciseIndex,
    );
  }, [editorContext, draft]);

  // ── Local state: name, notes, tempo ──
  // These mirror the PlannedExercise fields but allow free typing without
  // re-rendering the whole sheet on each keystroke (commit on blur / submit).
  const [nameText, setNameText] = useState<string>(exercise?.name ?? "");
  const [notesText, setNotesText] = useState<string>(exercise?.notes ?? "");
  const [tempoText, setTempoText] = useState<string>(exercise?.tempo ?? DEFAULT_TEMPO);

  // Sync local text when the exercise reference changes (open editor on a
  // different exercise, or external undo). We compare canonical values so we
  // don't clobber in-flight typing.
  useEffect(() => {
    if (!editorOpen) return;
    if (!exercise) return;
    if (exercise.name !== nameText) setNameText(exercise.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, editorOpen]);

  useEffect(() => {
    if (!editorOpen) return;
    if (!exercise) return;
    const canonicalNotes = exercise.notes ?? "";
    if (canonicalNotes !== notesText) setNotesText(canonicalNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, editorOpen]);

  useEffect(() => {
    if (!editorOpen) return;
    if (!exercise) return;
    const canonicalTempo = exercise.tempo ?? DEFAULT_TEMPO;
    if (canonicalTempo !== tempoText) setTempoText(canonicalTempo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, editorOpen]);

  // ── Collapsible sections ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((key: string) => {
    haptics.selection();
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Confetti / PR celebration ──
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const prevMaxWeightRef = useRef<number | null>(null);
  useEffect(() => {
    // Track the max weight across sets when the editor opens; if the user
    // raises it above the existing PR, fire confetti on close.
    if (!editorOpen || !exercise) {
      prevMaxWeightRef.current = null;
      return;
    }
    const maxWeight = exercise.sets.reduce(
      (max, s) => Math.max(max, s.weightKg ?? 0),
      0,
    );
    if (prevMaxWeightRef.current === null) {
      prevMaxWeightRef.current = maxWeight;
    }
  }, [editorOpen, exercise]);

  // ── Patch helper: write through to the store ──
  const patchExercise = useCallback(
    (partial: Partial<PlannedExercise>) => {
      if (!editorContext || !exercise) return;
      const updated: PlannedExercise = { ...exercise, ...partial };
      updateExercise(editorContext.dayIndex, editorContext.exerciseIndex, updated);
    },
    [editorContext, exercise, updateExercise],
  );

  // ── Set operations ──
  const handleSetChange = useCallback(
    (index: number, updated: PlannedSet) => {
      if (!exercise) return;
      const sets = [...exercise.sets];
      sets[index] = updated;
      patchExercise({ sets });
    },
    [exercise, patchExercise],
  );

  const handleSetDelete = useCallback(
    (index: number) => {
      if (!exercise) return;
      const sets = exercise.sets.filter((_, i) => i !== index);
      // Re-number sets so setNumber stays sequential.
      const renumbered = sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
      patchExercise({ sets: renumbered });
    },
    [exercise, patchExercise],
  );

  const handleSetReorder = useCallback(
    (fromOneBased: number, toOneBased: number) => {
      if (!exercise) return;
      const from = fromOneBased - 1;
      const to = toOneBased - 1;
      if (from === to) return;
      const sets = [...exercise.sets];
      const [moved] = sets.splice(from, 1);
      sets.splice(to, 0, moved);
      const renumbered = sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
      patchExercise({ sets: renumbered });
    },
    [exercise, patchExercise],
  );

  const handleAddSet = useCallback(() => {
    if (!exercise) return;
    haptics.buttonPress();
    const defaultSetType: PlannedSet["setType"] =
      (exercise.sets[0]?.setType as PlannedSet["setType"] | undefined) ?? "normal";
    const newSet: PlannedSet = {
      setNumber: exercise.sets.length + 1,
      reps: "8-12",
      weightKg: exercise.sets[exercise.sets.length - 1]?.weightKg,
      setType: defaultSetType,
    };
    patchExercise({ sets: [...exercise.sets, newSet] });
  }, [exercise, patchExercise]);

  // ── Field commits (blur / submit) ──
  const commitName = useCallback(() => {
    const trimmed = nameText.trim();
    if (trimmed === "") {
      // Revert to canonical if user clears — names must not be empty.
      setNameText(exercise?.name ?? "");
      return;
    }
    if (trimmed !== exercise?.name) {
      patchExercise({ name: trimmed });
    }
  }, [nameText, exercise, patchExercise]);

  const commitNotes = useCallback(() => {
    if (notesText !== (exercise?.notes ?? "")) {
      patchExercise({ notes: notesText });
    }
  }, [notesText, exercise, patchExercise]);

  const commitTempo = useCallback(() => {
    const trimmed = tempoText.trim();
    // Validate "E-P-C-P" pattern: 4 non-negative integers separated by dashes.
    const parts = trimmed.split("-").map((p) => p.trim());
    const isValid =
      parts.length === 4 && parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0);
    if (!isValid) {
      // Revert to canonical.
      setTempoText(exercise?.tempo ?? DEFAULT_TEMPO);
      haptics.warning();
      return;
    }
    if (trimmed !== (exercise?.tempo ?? DEFAULT_TEMPO)) {
      patchExercise({ tempo: trimmed });
    }
  }, [tempoText, exercise, patchExercise]);

  // ── Rest timer slider ──
  const handleRestChange = useCallback(
    (value: number) => {
      patchExercise({ restSeconds: Math.round(value) });
    },
    [patchExercise],
  );

  // ── RPE slider ──
  const handleRpeChange = useCallback(
    (value: number) => {
      patchExercise({ targetRpe: Math.round(value) });
    },
    [patchExercise],
  );

  // ── Default set type for new sets (SegmentedControl) ──
  const defaultSetTypeId = useMemo(() => {
    const t = exercise?.sets[0]?.setType ?? "normal";
    return DEFAULT_SET_TYPE_OPTIONS.some((o) => o.id === t) ? t : "normal";
  }, [exercise]);

  const handleDefaultSetType = useCallback(
    (id: string) => {
      if (!exercise || exercise.sets.length === 0) return;
      const newType = id as PlannedSet["setType"];
      // Apply the chosen type to all existing sets of the "default" kind (i.e.
      // sets that were normal/warmup/failure/drop — we don't overwrite
      // explicit superset/circuit sets).
      const updatedSets = exercise.sets.map((s) =>
        s.setType === "superset" || s.setType === "circuit"
          ? s
          : { ...s, setType: newType },
      );
      patchExercise({ sets: updatedSets });
    },
    [exercise, patchExercise],
  );

  // ── Superset / Circuit mode (None/Superset/Circuit) ──
  const groupMode = useMemo<string>(() => {
    if (!exercise) return "none";
    if (exercise.supersetId) return "superset";
    if (exercise.circuitId) return "circuit";
    return "none";
  }, [exercise]);

  const handleGroupMode = useCallback(
    (id: string) => {
      if (!exercise) return;
      if (id === "none") {
        patchExercise({ supersetId: undefined, circuitId: undefined });
      } else if (id === "superset") {
        const newId = exercise.supersetId ?? `ss_${Date.now().toString(36)}`;
        patchExercise({ supersetId: newId, circuitId: undefined });
      } else if (id === "circuit") {
        const newId = exercise.circuitId ?? `circuit_${Date.now().toString(36)}`;
        patchExercise({ circuitId: newId, supersetId: undefined });
      }
    },
    [exercise, patchExercise],
  );

  // ── Group with sibling exercise (superset/circuit target picker) ──
  const handleGroupWithSibling = useCallback(
    (siblingExerciseId: string, siblingName: string) => {
      if (!exercise) return;
      // Assign the same group id to both exercises. We only write our own
      // exercise here; the sibling's update is the caller's responsibility
      // (Phase 8 will wire cross-exercise grouping). For v1 we just stamp our
      // own group id so the UI reflects the intent.
      const groupId =
        groupMode === "superset"
          ? exercise.supersetId ?? `ss_${Date.now().toString(36)}`
          : exercise.circuitId ?? `circuit_${Date.now().toString(36)}`;
      haptics.selection();
      console.log(
        "[ExerciseEditorSheet] group with sibling:",
        siblingExerciseId,
        siblingName,
        "→ groupId:",
        groupId,
      );
      if (groupMode === "superset") {
        patchExercise({ supersetId: groupId });
      } else if (groupMode === "circuit") {
        patchExercise({ circuitId: groupId });
      }
    },
    [exercise, groupMode, patchExercise],
  );

  // ── Close: PR celebration if a set weight beats the existing PR ──
  const handleClose = useCallback(() => {
    if (exercise && pr) {
      const maxWeight = exercise.sets.reduce(
        (max, s) => Math.max(max, s.weightKg ?? 0),
        0,
      );
      if (maxWeight > pr.weightKg && maxWeight > 0) {
        setConfettiTrigger(true);
        haptics.celebration();
        // Defer the actual close so the confetti has time to render.
        setTimeout(() => {
          setConfettiTrigger(false);
          closeEditor();
        }, 1200);
        return;
      }
    }
    if (exercise && !pr) {
      // No existing PR — if the user set a meaningful weight, celebrate too.
      const maxWeight = exercise.sets.reduce(
        (max, s) => Math.max(max, s.weightKg ?? 0),
        0,
      );
      if (maxWeight > 0 && prevMaxWeightRef.current === 0) {
        setConfettiTrigger(true);
        haptics.celebration();
        setTimeout(() => {
          setConfettiTrigger(false);
          closeEditor();
        }, 1200);
        return;
      }
    }
    haptics.success();
    closeEditor();
  }, [exercise, pr, closeEditor]);

  // ── History chart values ──
  const historyCurrent = historyPoints[historyPoints.length - 1]?.totalVolume ?? 0;
  const historyTarget =
    historyPoints.length > 1
      ? historyPoints[historyPoints.length - 1].totalVolume
      : historyCurrent * 1.1;

  // ── Render nothing if there's no exercise to edit ──
  if (!exercise) {
    return (
      <DetentBottomSheet
        visible={editorOpen}
        onClose={handleClose}
        snapPoints={[0.5, 0.95]}
        initialSnapIndex={1}
        testID={testID}
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No exercise selected.</Text>
        </View>
      </DetentBottomSheet>
    );
  }

  const restSeconds = exercise.restSeconds ?? DEFAULT_REST;
  const targetRpe = exercise.targetRpe ?? 5;
  const muscleGroups = curated?.muscleGroups ?? [];
  const equipment = curated?.equipment ?? [];
  const difficulty = curated?.difficulty ?? "intermediate";

  return (
    <DetentBottomSheet
      visible={editorOpen}
      onClose={handleClose}
      snapPoints={[0.5, 0.95]}
      initialSnapIndex={1}
      testID={testID}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header: editable name + metadata chips ── */}
        <Section title="Exercise">
          <View style={styles.headerRow}>
            <TextInput
              value={nameText}
              onChangeText={setNameText}
              onEndEditing={commitName}
              placeholder="Exercise name"
              placeholderTextColor={colors.text.tertiary}
              style={styles.nameInput}
              accessibilityLabel="Exercise name"
              returnKeyType="done"
              selectTextOnFocus
            />
          </View>
          {(muscleGroups.length > 0 || equipment.length > 0) && (
            <View style={styles.chipRow}>
              {muscleGroups.slice(0, 4).map((m) => (
                <View key={`mg_${m}`} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{m}</Text>
                </View>
              ))}
              {equipment.slice(0, 2).map((e) => (
                <View key={`eq_${e}`} style={styles.equipChip}>
                  <Text style={styles.equipChipText}>{e}</Text>
                </View>
              ))}
              <View style={styles.difficultyChip}>
                <Text style={styles.difficultyChipText}>{difficulty}</Text>
              </View>
            </View>
          )}
        </Section>

        {/* ── Sets ── */}
        <Section
          title="Sets"
          collapsible
          collapsed={collapsed.sets}
          onToggle={() => toggleSection("sets")}
        >
          {!collapsed.sets && (
            <View style={styles.setsList}>
              {exercise.sets.map((s, i) => (
                <SetRow
                  key={`set_${s.setNumber}_${i}`}
                  set={s}
                  setNumber={i + 1}
                  totalCount={exercise.sets.length}
                  onChange={(updated) => handleSetChange(i, updated)}
                  onDelete={() => handleSetDelete(i)}
                  onReorder={handleSetReorder}
                  testID={`editor-set-row-${i}`}
                />
              ))}
              <AnimatedPressable
                onPress={handleAddSet}
                springConfig="snappy"
                hapticType="light"
                style={styles.addSetBtn}
                accessibilityRole="button"
                accessibilityLabel="Add set"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={rf(20)}
                  color={colors.primary.DEFAULT}
                />
                <Text style={styles.addSetLabel}>Add Set</Text>
              </AnimatedPressable>
            </View>
          )}
        </Section>

        {/* ── Rest timer ── */}
        <Section
          title="Rest Timer"
          collapsible
          collapsed={collapsed.rest}
          onToggle={() => toggleSection("rest")}
        >
          {!collapsed.rest && (
            <View style={styles.restRow}>
              <View style={styles.restSliderWrap}>
                <Slider
                  value={restSeconds}
                  onValueChange={handleRestChange}
                  minimumValue={REST_MIN}
                  maximumValue={REST_MAX}
                  step={5}
                  label="Rest (seconds)"
                  formatValue={(v) => `${Math.round(v)}s`}
                />
              </View>
              <View style={styles.restPreviewWrap}>
                <RestTimerRadial
                  durationSeconds={restSeconds}
                  autoStart={false}
                  size={rs(120)}
                  strokeWidth={8}
                  style={styles.restPreview}
                />
              </View>
            </View>
          )}
        </Section>

        {/* ── RPE ── */}
        <Section
          title="RPE (Rate of Perceived Exertion)"
          collapsible
          collapsed={collapsed.rpe}
          onToggle={() => toggleSection("rpe")}
        >
          {!collapsed.rpe && (
            <View style={styles.rpeWrap}>
              <Text style={styles.rpeValueLabel}>
                {targetRpe} — {RPE_LABELS[targetRpe] ?? "Moderate"}
              </Text>
              <Slider
                value={targetRpe}
                onValueChange={handleRpeChange}
                minimumValue={RPE_MIN}
                maximumValue={RPE_MAX}
                step={1}
                label="Target RPE"
                formatValue={(v) => String(Math.round(v))}
              />
            </View>
          )}
        </Section>

        {/* ── Tempo ── */}
        <Section
          title="Tempo"
          collapsible
          collapsed={collapsed.tempo}
          onToggle={() => toggleSection("tempo")}
        >
          {!collapsed.tempo && (
            <View style={styles.tempoWrap}>
              <View style={styles.tempoInputRow}>
                <TextInput
                  value={tempoText}
                  onChangeText={setTempoText}
                  onEndEditing={commitTempo}
                  placeholder={DEFAULT_TEMPO}
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.tempoInput}
                  accessibilityLabel="Tempo, eccentric-pause-concentric-pause"
                  keyboardType="numeric"
                  returnKeyType="done"
                  selectTextOnFocus
                />
                <TempoTooltip />
              </View>
              <Text style={styles.tempoCaption}>
                Format: Eccentric - Pause - Concentric - Pause (seconds)
              </Text>
            </View>
          )}
        </Section>

        {/* ── Intensity / Default set type ── */}
        <Section
          title="Intensity (default set type)"
          collapsible
          collapsed={collapsed.intensity}
          onToggle={() => toggleSection("intensity")}
        >
          {!collapsed.intensity && (
            <View style={styles.segmentWrap}>
              <SegmentedControl
                options={DEFAULT_SET_TYPE_OPTIONS}
                selectedId={defaultSetTypeId}
                onSelect={handleDefaultSetType}
              />
            </View>
          )}
        </Section>

        {/* ── Superset / Circuit ── */}
        <Section
          title="Superset / Circuit"
          collapsible
          collapsed={collapsed.group}
          onToggle={() => toggleSection("group")}
        >
          {!collapsed.group && (
            <View style={styles.segmentWrap}>
              <SegmentedControl
                options={SUPERSET_MODE_OPTIONS}
                selectedId={groupMode}
                onSelect={handleGroupMode}
              />
              {groupMode !== "none" && (
                <View style={styles.siblingPickerWrap}>
                  <Text style={styles.siblingPickerLabel}>
                    {groupMode === "superset"
                      ? "Group with (same day):"
                      : "Circuit with (same day):"}
                  </Text>
                  {siblingExercises.length === 0 ? (
                    <Text style={styles.siblingEmpty}>
                      No other exercises in this day yet.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.siblingScroll}
                    >
                      {siblingExercises.map((sib) => (
                        <Pressable
                          key={sib.exerciseId}
                          onPress={() =>
                            handleGroupWithSibling(sib.exerciseId, sib.name)
                          }
                          style={({ pressed }) => [
                            styles.siblingChip,
                            pressed && styles.siblingChipPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Group with ${sib.name}`}
                        >
                          <Text style={styles.siblingChipText}>{sib.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                  <Text style={styles.groupIdDisplay}>
                    Group id:{" "}
                    {groupMode === "superset"
                      ? exercise.supersetId ?? "—"
                      : exercise.circuitId ?? "—"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Section>

        {/* ── Notes ── */}
        <Section
          title="Notes"
          collapsible
          collapsed={collapsed.notes}
          onToggle={() => toggleSection("notes")}
        >
          {!collapsed.notes && (
            <TextInput
              value={notesText}
              onChangeText={setNotesText}
              onEndEditing={commitNotes}
              placeholder="Add notes for this exercise…"
              placeholderTextColor={colors.text.tertiary}
              style={styles.notesInput}
              accessibilityLabel="Exercise notes"
              multiline
              textAlignVertical="top"
            />
          )}
        </Section>

        {/* ── Alternative exercise ── */}
        <Section
          title="Alternative Exercise"
          collapsible
          collapsed={collapsed.alt}
          onToggle={() => toggleSection("alt")}
        >
          {!collapsed.alt && (
            <View style={styles.altRow}>
              <Text style={styles.altLabel}>
                {exercise.alternativeExerciseId
                  ? "Alternative set"
                  : "No alternative set"}
              </Text>
              <GlassButton
                label="Change"
                onPress={() => {
                  // Phase 4 ExercisePickerSheet is not wired yet; log so the
                  // flow is traceable without silently no-op'ing.
                  console.log(
                    "[ExerciseEditorSheet] alternative picker not wired (Phase 4)",
                  );
                  haptics.selection();
                }}
                variant="secondary"
                style={styles.altBtn}
              />
            </View>
          )}
        </Section>

        {/* ── Personal record ── */}
        <Section
          title="Personal Record"
          collapsible
          collapsed={collapsed.pr}
          onToggle={() => toggleSection("pr")}
        >
          {!collapsed.pr && (
            <View style={styles.prRow}>
              {pr ? (
                <>
                  <Ionicons
                    name="trophy"
                    size={rf(20)}
                    color={flatColors.gold}
                  />
                  <Text style={styles.prText}>
                    PR: {pr.weightKg}kg × {pr.reps}
                  </Text>
                </>
              ) : (
                <Text style={styles.prEmpty}>No PR yet</Text>
              )}
            </View>
          )}
        </Section>

        {/* ── History mini-chart ── */}
        <Section
          title="History (last 10 sessions)"
          collapsible
          collapsed={collapsed.history}
          onToggle={() => toggleSection("history")}
        >
          {!collapsed.history && (
            <View style={styles.historyWrap}>
              {historyPoints.length === 0 ? (
                <Text style={styles.historyEmpty}>No history yet</Text>
              ) : (
                <AnimatedChart
                  currentValue={historyCurrent}
                  targetValue={historyTarget}
                  currentLabel="Latest"
                  targetLabel="Target"
                  unit="kg"
                  width={rw(280)}
                  height={rw(180)}
                />
              )}
            </View>
          )}
        </Section>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Confetti overlay (PR celebration) */}
      <Confetti
        trigger={confettiTrigger}
        particleCount={30}
        origin={{ x: 0, y: 0 }}
        style={styles.confettiOverlay}
      />
    </DetentBottomSheet>
  );
};

// ============================================================================
// SECTION (collapsible header + body)
// ============================================================================

interface SectionProps {
  title: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  collapsible = false,
  collapsed = false,
  onToggle,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const chevronRotation = useSharedValue(collapsed ? -90 : 0);

  // Animate the chevron rotation when collapsed changes.
  React.useEffect(() => {
    chevronRotation.value = collapsed
      ? (reduceMotion ? 0 : withTiming(-90, { duration: duration.quick }))
      : (reduceMotion ? 0 : withTiming(0, { duration: duration.quick }));
  }, [collapsed, reduceMotion, chevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  if (!collapsible) {
    return (
      <GlassCard
        elevation={2}
        padding="md"
        borderRadius="lg"
        style={styles.sectionCard}
        contentStyle={styles.sectionContent}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
      </GlassCard>
    );
  }

  return (
    <GlassCard
      elevation={2}
      padding="md"
      borderRadius="lg"
      style={styles.sectionCard}
      contentStyle={styles.sectionContent}
    >
      <AnimatedPressable
        onPress={onToggle}
        springConfig="snappy"
        hapticType="light"
        style={styles.sectionHeader}
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${title} section`}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Animated.View style={chevronStyle} pointerEvents="none">
          <Ionicons
            name="chevron-down"
            size={rf(18)}
            color={colors.text.secondary}
          />
        </Animated.View>
      </AnimatedPressable>
      {!collapsed && (
        <Animated.View
          entering={reduceMotion ? FadeIn.duration(duration.quick) : FadeIn.duration(duration.normal)}
          exiting={reduceMotion ? undefined : FadeOut.duration(duration.quick)}
          layout={Layout.springify()}
        >
          {children}
        </Animated.View>
      )}
    </GlassCard>
  );
};

// ============================================================================
// TEMPO TOOLTIP (info icon → popover)
// ============================================================================

const TempoTooltip: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.tooltipWrap}>
      <Pressable
        onPress={() => {
          haptics.selection();
          setOpen((v) => !v);
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Tempo explanation"
      >
        <Ionicons
          name="information-circle-outline"
          size={rf(18)}
          color={colors.text.tertiary}
        />
      </Pressable>
      {open && (
        <View style={styles.tooltipBubble}>
          <Text style={styles.tooltipTitle}>Tempo Format</Text>
          <Text style={styles.tooltipBody}>
            {"4 numbers (seconds):\n• Eccentric (lowering)\n• Pause at bottom\n• Concentric (lifting)\n• Pause at top"}
          </Text>
          <Text style={styles.tooltipExample}>
            Example: 2-0-2-0 = 2s down, no pause, 2s up, no pause.
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: rp(spacing.xl),
    gap: rp(spacing.xs),
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.xl),
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
  },
  sectionCard: {
    marginBottom: 0,
  },
  sectionContent: {
    gap: rp(spacing.xs),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rp(spacing.xxs),
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  },
  // Header section
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  nameInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as TextStyleWeight,
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.sm),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  muscleChip: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(2),
  },
  muscleChipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.medium) as TextStyleWeight,
  },
  equipChip: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(2),
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  equipChipText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  difficultyChip: {
    backgroundColor: flatColors.amber,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(2),
  },
  difficultyChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  },
  // Sets
  setsList: {
    gap: rp(spacing.xxs),
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary.DEFAULT,
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 107, 53, 0.08)",
  },
  addSetLabel: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  },
  // Rest timer
  restRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
  },
  restSliderWrap: {
    flex: 1,
  },
  restPreviewWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  restPreview: {
    marginBottom: rp(spacing.xl),
  },
  // RPE
  rpeWrap: {
    gap: rp(spacing.xs),
  },
  rpeValueLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
    textAlign: "center",
  },
  // Tempo
  tempoWrap: {
    gap: rp(spacing.xxs),
  },
  tempoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  tempoInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
    textAlign: "center",
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    letterSpacing: 2,
  },
  tempoCaption: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    textAlign: "center",
  },
  // Segmented control wrap
  segmentWrap: {
    gap: rp(spacing.sm),
  },
  // Superset / Circuit sibling picker
  siblingPickerWrap: {
    gap: rp(spacing.xs),
  },
  siblingPickerLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.medium) as TextStyleWeight,
  },
  siblingEmpty: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    fontStyle: "italic",
  },
  siblingScroll: {
    flexDirection: "row",
  },
  siblingChip: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    marginRight: rp(spacing.xs),
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  siblingChipPressed: {
    backgroundColor: colors.primary.DEFAULT,
  },
  siblingChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.medium) as TextStyleWeight,
  },
  groupIdDisplay: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: "monospace",
  },
  // Notes
  notesInput: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    minHeight: rp(80),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    textAlignVertical: "top",
  },
  // Alternative
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
  },
  altLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    flex: 1,
  },
  altBtn: {
    minWidth: rw(100),
  },
  // PR
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  prText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
  },
  prEmpty: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    fontStyle: "italic",
  },
  // History
  historyWrap: {
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
  },
  historyEmpty: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    fontStyle: "italic",
    paddingVertical: rp(spacing.md),
  },
  // Tooltip
  tooltipWrap: {
    position: "relative",
  },
  tooltipBubble: {
    position: "absolute",
    top: rp(28),
    right: 0,
    width: rw(220),
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: rp(spacing.sm),
    zIndex: 50,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tooltipTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as TextStyleWeight,
    marginBottom: rp(spacing.xs),
  },
  tooltipBody: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    lineHeight: rp(16),
  },
  tooltipExample: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(spacing.xs),
    fontStyle: "italic",
  },
  // Confetti
  confettiOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  bottomSpacer: {
    height: rp(spacing.lg),
  },
});

// Cast helper for RN's `fontWeight` union.
type TextStyleWeight = "300" | "400" | "500" | "600" | "700" | "800" | "900" | "bold" | "normal";

export default ExerciseEditorSheet;
