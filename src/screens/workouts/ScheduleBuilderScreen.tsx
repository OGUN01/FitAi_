import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { workoutTemplateService, WorkoutTemplate, TemplateExercise } from "../../services/workoutTemplateService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { generateUUID } from "../../utils/uuid";
import { buildDayWorkoutFromTemplate, buildDayWorkoutFromExercises } from "../../utils/workoutBuilders";
import { CURATED_EXERCISES, CuratedExercise } from "../../data/curatedExercises";
import { SegmentedControl, SegmentOption } from "../../components/ui/SegmentedControl";
import type { DayWorkout, WeeklyWorkoutPlan } from "../../types/ai";
import {
  AuroraBackground,
  GlassCard,
  GlassHeader,
  BottomSheet,
  AuroraSpinner,
  EmptyState,
  AnimatedPressable,
} from "../../components/ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rp, rf, rw } from "../../utils/responsive";

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
}

const DAYS: { key: string; label: string; short: string }[] = [
  { key: "monday",    label: "Monday",    short: "MON" },
  { key: "tuesday",   label: "Tuesday",   short: "TUE" },
  { key: "wednesday", label: "Wednesday", short: "WED" },
  { key: "thursday",  label: "Thursday",  short: "THU" },
  { key: "friday",    label: "Friday",    short: "FRI" },
  { key: "saturday",  label: "Saturday",  short: "SAT" },
  { key: "sunday",    label: "Sunday",    short: "SUN" },
];

type Assignments = Record<string, WorkoutTemplate | null>;

/** Exercise assignments for exercise-to-day mode */
type ExerciseAssignments = Record<string, TemplateExercise[]>;

type BuilderMode = "templates" | "exercises";

const MODE_OPTIONS: SegmentOption[] = [
  { id: "templates", label: "Assign Templates", value: "templates" },
  { id: "exercises", label: "Build from Exercises", value: "exercises" },
];

const EXERCISE_CATEGORIES = [
  { key: "all",       label: "All" },
  { key: "chest",     label: "Chest" },
  { key: "back",      label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms",      label: "Arms" },
  { key: "legs",      label: "Legs" },
  { key: "core",      label: "Core" },
  { key: "cardio",    label: "Cardio" },
  { key: "full_body", label: "Full Body" },
] as const;

export default function ScheduleBuilderScreen({ navigation }: Props) {
  // ── Shared state ──
  const [mode, setMode] = useState<BuilderMode>("templates");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Template mode state ──
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
  });
  const [pickerDay, setPickerDay] = useState<string | null>(null);

  // ── Exercise mode state ──
  const [exerciseAssignments, setExerciseAssignments] = useState<ExerciseAssignments>({
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: [],
  });
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [exercisePickerDay, setExercisePickerDay] = useState<string | null>(null);
  const [exerciseCategory, setExerciseCategory] = useState<string>("all");
  const [exerciseSearch, setExerciseSearch] = useState("");

  const { setCustomWeeklyPlan, saveCustomWeeklyPlan, setActivePlanSource, setMesocycleStartDate, mesocycleStartDate, getMesocycleWeek } = useFitnessStore();

  // ── Load templates on mount ──
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) { setLoading(false); return; }
    workoutTemplateService.getTemplates(userId)
      .then(setTemplates)
      .catch((err) => console.error("[ScheduleBuilder] Failed to load templates:", err))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtered curated exercises for picker ──
  const filteredExercises = useMemo(() => {
    let list = CURATED_EXERCISES;
    if (exerciseCategory !== "all") {
      list = list.filter((ex) => ex.category === exerciseCategory);
    }
    if (exerciseSearch.trim()) {
      const q = exerciseSearch.toLowerCase().trim();
      list = list.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return list;
  }, [exerciseCategory, exerciseSearch]);

  // ── Template mode callbacks ──
  const assignTemplate = useCallback((day: string, template: WorkoutTemplate) => {
    setAssignments((prev) => ({ ...prev, [day]: template }));
    setPickerDay(null);
  }, []);

  const clearDay = useCallback((day: string) => {
    setAssignments((prev) => ({ ...prev, [day]: null }));
  }, []);

  // ── Exercise mode callbacks ──
  const addExerciseToDay = useCallback((day: string, curated: CuratedExercise) => {
    const templateExercise: TemplateExercise = {
      exerciseId: curated.id,
      name: curated.name,
      sets: 3,
      repRange: curated.isTimeBased ? [30, 30] : [8, 12],
      restSeconds: 60,
      targetWeightKg: curated.isBodyweight ? undefined : 20,
    };
    setExerciseAssignments((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), templateExercise],
    }));
    setExercisePickerDay(null);
    setExerciseSearch("");
    setExerciseCategory("all");
  }, []);

  const removeExerciseFromDay = useCallback((day: string, index: number) => {
    setExerciseAssignments((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  }, []);

  const updateExerciseInDay = useCallback((day: string, index: number, updates: Partial<TemplateExercise>) => {
    setExerciseAssignments((prev) => ({
      ...prev,
      [day]: prev[day].map((ex, i) => (i === index ? { ...ex, ...updates } : ex)),
    }));
  }, []);

  const clearDayExercises = useCallback((day: string) => {
    setExerciseAssignments((prev) => ({ ...prev, [day]: [] }));
  }, []);

  const toggleExpandDay = useCallback((dayKey: string) => {
    setExpandedDay((prev) => (prev === dayKey ? null : dayKey));
  }, []);

  // ── Unified save (both modes) ──
  const handleSave = useCallback(async () => {
    let workouts: DayWorkout[];
    let assignedDayCount: number;

    if (mode === "templates") {
      const assignedDays = DAYS.filter((d) => assignments[d.key] !== null);
      if (assignedDays.length === 0) {
        crossPlatformAlert("No Workouts Assigned", "Assign at least one workout to a day before saving.");
        return;
      }
      workouts = assignedDays.map((d) =>
        buildDayWorkoutFromTemplate(assignments[d.key]!, { dayOfWeek: d.key, isExtra: false })
      );
      assignedDayCount = assignedDays.length;
    } else {
      const exerciseDays = DAYS.filter((d) => (exerciseAssignments[d.key] || []).length > 0);
      if (exerciseDays.length === 0) {
        crossPlatformAlert("No Exercises Added", "Add exercises to at least one day before saving.");
        return;
      }
      workouts = exerciseDays.map((d) => {
        const dayLabel = d.label;
        return buildDayWorkoutFromExercises(
          exerciseAssignments[d.key],
          d.key,
          `${dayLabel} Workout`,
        );
      });
      assignedDayCount = exerciseDays.length;
    }

    setSaving(true);
    try {
      const restDays: number[] = DAYS
        .map((d, i) => {
          if (mode === "templates") {
            return assignments[d.key] === null ? i : -1;
          }
          return (exerciseAssignments[d.key] || []).length === 0 ? i : -1;
        })
        .filter((i) => i !== -1);

      const mesocycleWeek = Math.max(1, Math.min(4, getMesocycleWeek() || 1));

      const plan: WeeklyWorkoutPlan = {
        id: generateUUID(),
        weekNumber: mesocycleWeek,
        workouts,
        planTitle: "My Custom Schedule",
        planDescription: `${assignedDayCount} workout days, ${restDays.length} rest days`,
        restDays,
        totalEstimatedCalories: 0,
      };

      setCustomWeeklyPlan(plan);
      await saveCustomWeeklyPlan(plan);
      setActivePlanSource('custom');

      if (!mesocycleStartDate) {
        setMesocycleStartDate(new Date().toISOString());
      }

      crossPlatformAlert(
        "Schedule Saved!",
        `Your custom schedule has ${assignedDayCount} workouts across the week.`,
        [{ text: "Let's Go!", onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      console.error("[ScheduleBuilder] Failed to save schedule:", err);
      crossPlatformAlert("Error", "Failed to save your schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [mode, assignments, exerciseAssignments, getMesocycleWeek, mesocycleStartDate, setCustomWeeklyPlan, saveCustomWeeklyPlan, setActivePlanSource, setMesocycleStartDate, navigation]);

  // ── Derived counts ──
  const templateAssignedCount = DAYS.filter((d) => assignments[d.key] !== null).length;
  const exerciseAssignedCount = DAYS.filter((d) => (exerciseAssignments[d.key] || []).length > 0).length;
  const assignedCount = mode === "templates" ? templateAssignedCount : exerciseAssignedCount;

  const closeTemplatePicker = useCallback(() => setPickerDay(null), []);
  const closeExercisePicker = useCallback(() => {
    setExercisePickerDay(null);
    setExerciseSearch("");
    setExerciseCategory("all");
  }, []);

  if (loading) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.flex}>
          <View style={styles.loader}>
            <AuroraSpinner size="lg" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <GlassHeader
          title="Build My Schedule"
          onBack={() => navigation.goBack()}
          rightAction={
            <AnimatedPressable
              onPress={handleSave}
              disabled={saving || assignedCount === 0}
              style={[styles.saveBtn, (saving || assignedCount === 0) && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save schedule"
            >
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
            </AnimatedPressable>
          }
        />

        {/* Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <SegmentedControl
            options={MODE_OPTIONS}
            selectedId={mode}
            onSelect={(id) => setMode(id as BuilderMode)}
          />
        </View>

        <Text style={styles.subtitle}>
          {mode === "templates"
            ? "Assign your saved workouts to days of the week"
            : "Pick exercises for each day of the week"}
        </Text>

        {/* ═══════════ TEMPLATE MODE ═══════════ */}
        {mode === "templates" && (
          <>
            {templates.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="calendar-outline"
                  title="No saved workouts yet"
                  subtitle="Create workout templates first, then come back to build your schedule."
                  ctaText="Create Workout"
                  onCta={() => navigation.navigate("CreateWorkout")}
                />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.dayList}>
                {DAYS.map((day) => {
                  const assigned = assignments[day.key];
                  return (
                    <View key={day.key} style={styles.dayRow}>
                      <View style={styles.dayLabelBox}>
                        <Text style={styles.dayShort}>{day.short}</Text>
                        <Text style={styles.dayFull}>{day.label}</Text>
                      </View>

                      {assigned ? (
                        <View style={styles.assignedBox}>
                          <View style={styles.assignedInfo}>
                            <Text style={styles.assignedName} numberOfLines={1}>
                              {assigned.name}
                            </Text>
                            <Text style={styles.assignedMeta}>
                              {assigned.exercises.length} exercises
                              {assigned.estimatedDurationMinutes
                                ? ` · ${assigned.estimatedDurationMinutes} min`
                                : ""}
                            </Text>
                          </View>
                          <AnimatedPressable
                            onPress={() => setPickerDay(day.key)}
                            style={styles.changeBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Change workout for ${day.label}`}
                          >
                            <Text style={styles.changeBtnText}>Change</Text>
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => clearDay(day.key)}
                            style={styles.clearBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Clear ${day.label}`}
                          >
                            <Ionicons name="close" size={rf(16)} color={colors.error.DEFAULT} />
                          </AnimatedPressable>
                        </View>
                      ) : (
                        <AnimatedPressable
                          style={styles.restBox}
                          onPress={() => setPickerDay(day.key)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add workout to ${day.label}`}
                        >
                          <Text style={styles.restText}>Rest Day</Text>
                          <Text style={styles.addText}>+ Add Workout</Text>
                        </AnimatedPressable>
                      )}
                    </View>
                  );
                })}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    {assignedCount} workout{assignedCount !== 1 ? "s" : ""} · {7 - assignedCount} rest day{7 - assignedCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              </ScrollView>
            )}
          </>
        )}

        {/* ═══════════ EXERCISE MODE ═══════════ */}
        {mode === "exercises" && (
          <ScrollView contentContainerStyle={styles.dayList}>
            {DAYS.map((day) => {
              const dayExercises = exerciseAssignments[day.key] || [];
              const isExpanded = expandedDay === day.key;
              return (
                <View key={day.key} style={styles.exerciseDayBlock}>
                  {/* Day header — tap to expand */}
                  <AnimatedPressable
                    style={[styles.exerciseDayHeader, isExpanded && styles.exerciseDayHeaderExpanded]}
                    onPress={() => toggleExpandDay(day.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.label} — ${dayExercises.length} exercises`}
                  >
                    <View style={styles.exerciseDayHeaderLeft}>
                      <Text style={styles.dayShort}>{day.short}</Text>
                      <Text style={styles.exerciseDayLabel}>{day.label}</Text>
                    </View>
                    <View style={styles.exerciseDayHeaderRight}>
                      {dayExercises.length > 0 ? (
                        <Text style={styles.exerciseDayCount}>
                          {dayExercises.length} exercise{dayExercises.length !== 1 ? "s" : ""}
                        </Text>
                      ) : (
                        <Text style={styles.exerciseDayRest}>Rest</Text>
                      )}
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={rf(12)}
                        color={colors.text.secondary}
                      />
                    </View>
                  </AnimatedPressable>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <View style={styles.exerciseDayDetail}>
                      {dayExercises.length === 0 && (
                        <Text style={styles.exerciseDayEmptyHint}>
                          No exercises yet. Tap "+ Add Exercise" below.
                        </Text>
                      )}

                      {dayExercises.map((ex, idx) => (
                        <View key={`${ex.exerciseId}_${idx}`} style={styles.exerciseItemRow}>
                          <View style={styles.exerciseItemInfo}>
                            <Text style={styles.exerciseItemName} numberOfLines={1}>{ex.name}</Text>
                            <View style={styles.exerciseItemControls}>
                              {/* Sets */}
                              <View style={styles.controlGroup}>
                                <Text style={styles.controlLabel}>Sets</Text>
                                <View style={styles.stepperRow}>
                                  <AnimatedPressable
                                    style={styles.stepperBtn}
                                    onPress={() => ex.sets > 1 && updateExerciseInDay(day.key, idx, { sets: ex.sets - 1 })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Decrease sets"
                                  >
                                    <Text style={styles.stepperBtnText}>−</Text>
                                  </AnimatedPressable>
                                  <Text style={styles.stepperValue}>{ex.sets}</Text>
                                  <AnimatedPressable
                                    style={styles.stepperBtn}
                                    onPress={() => updateExerciseInDay(day.key, idx, { sets: ex.sets + 1 })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Increase sets"
                                  >
                                    <Text style={styles.stepperBtnText}>+</Text>
                                  </AnimatedPressable>
                                </View>
                              </View>

                              {/* Reps */}
                              <View style={styles.controlGroup}>
                                <Text style={styles.controlLabel}>Reps</Text>
                                <View style={styles.stepperRow}>
                                  <AnimatedPressable
                                    style={styles.stepperBtn}
                                    onPress={() => {
                                      if (ex.repRange[0] <= 1) return;
                                      updateExerciseInDay(day.key, idx, {
                                        repRange: [ex.repRange[0] - 1, ex.repRange[1] - 1],
                                      });
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Decrease reps"
                                  >
                                    <Text style={styles.stepperBtnText}>−</Text>
                                  </AnimatedPressable>
                                  <Text style={styles.stepperValue}>
                                    {ex.repRange[0] === ex.repRange[1]
                                      ? `${ex.repRange[0]}`
                                      : `${ex.repRange[0]}-${ex.repRange[1]}`}
                                  </Text>
                                  <AnimatedPressable
                                    style={styles.stepperBtn}
                                    onPress={() => {
                                      updateExerciseInDay(day.key, idx, {
                                        repRange: [ex.repRange[0] + 1, ex.repRange[1] + 1],
                                      });
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Increase reps"
                                  >
                                    <Text style={styles.stepperBtnText}>+</Text>
                                  </AnimatedPressable>
                                </View>
                              </View>

                              {/* Rest */}
                              <View style={styles.controlGroup}>
                                <Text style={styles.controlLabel}>Rest</Text>
                                <Text style={styles.controlValue}>{ex.restSeconds}s</Text>
                              </View>
                            </View>
                          </View>
                          <AnimatedPressable
                            style={styles.removeExBtn}
                            onPress={() => removeExerciseFromDay(day.key, idx)}
                            accessibilityRole="button"
                            accessibilityLabel="Remove exercise"
                          >
                            <Ionicons name="close" size={rf(14)} color={colors.error.DEFAULT} />
                          </AnimatedPressable>
                        </View>
                      ))}

                      {/* Actions */}
                      <View style={styles.exerciseDayActions}>
                        <AnimatedPressable
                          style={styles.addExerciseBtn}
                          onPress={() => {
                            setExercisePickerDay(day.key);
                            setExerciseCategory("all");
                            setExerciseSearch("");
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Add exercise"
                        >
                          <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
                        </AnimatedPressable>
                        {dayExercises.length > 0 && (
                          <AnimatedPressable
                            style={styles.clearDayBtn}
                            onPress={() => clearDayExercises(day.key)}
                            accessibilityRole="button"
                            accessibilityLabel="Clear all exercises"
                          >
                            <Text style={styles.clearDayBtnText}>Clear All</Text>
                          </AnimatedPressable>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {assignedCount} workout{assignedCount !== 1 ? "s" : ""} · {7 - assignedCount} rest day{7 - assignedCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </ScrollView>
        )}

        {/* ═══════════ TEMPLATE PICKER MODAL ═══════════ */}
        <BottomSheet
          visible={pickerDay !== null}
          onClose={closeTemplatePicker}
          title={pickerDay ? `Pick workout for ${DAYS.find((d) => d.key === pickerDay)?.label ?? ""}` : "Pick workout"}
        >
          <FlatList
            data={templates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AnimatedPressable
                style={[
                  styles.pickerItem,
                  pickerDay && assignments[pickerDay]?.id === item.id &&
                    styles.pickerItemSelected,
                ]}
                onPress={() => pickerDay && assignTemplate(pickerDay, item)}
                accessibilityRole="button"
                accessibilityLabel={`Assign ${item.name}`}
              >
                <View style={styles.pickerItemInfo}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemMeta}>
                    {item.exercises.length} exercises
                    {item.estimatedDurationMinutes
                      ? ` · ${item.estimatedDurationMinutes} min`
                      : ""}
                  </Text>
                  {item.targetMuscleGroups.length > 0 && (
                    <Text style={styles.pickerItemMuscles} numberOfLines={1}>
                      {item.targetMuscleGroups.slice(0, 4).join(", ")}
                    </Text>
                  )}
                </View>
                {pickerDay && assignments[pickerDay]?.id === item.id && (
                  <Ionicons name="checkmark" size={rf(18)} color={colors.primary.DEFAULT} />
                )}
              </AnimatedPressable>
            )}
            contentContainerStyle={styles.pickerList}
          />
        </BottomSheet>

        {/* ═══════════ EXERCISE PICKER MODAL ═══════════ */}
        <BottomSheet
          visible={exercisePickerDay !== null}
          onClose={closeExercisePicker}
          title={exercisePickerDay ? `Add exercise to ${DAYS.find((d) => d.key === exercisePickerDay)?.label ?? ""}` : "Add exercise"}
          maxHeightFraction={0.85}
        >
          {/* Search */}
          <View style={styles.exerciseSearchRow}>
            <TextInput
              style={styles.exerciseSearchInput}
              placeholder="Search exercises..."
              placeholderTextColor={colors.text.tertiary}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
              autoCapitalize="none"
            />
          </View>

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabsRow}
          >
            {EXERCISE_CATEGORIES.map((cat) => (
              <AnimatedPressable
                key={cat.key}
                style={[
                  styles.categoryTab,
                  exerciseCategory === cat.key && styles.categoryTabActive,
                ]}
                onPress={() => setExerciseCategory(cat.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${cat.label}`}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    exerciseCategory === cat.key && styles.categoryTabTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>

          {/* Exercise list */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const alreadyAdded = exercisePickerDay
                ? (exerciseAssignments[exercisePickerDay] || []).some(
                    (ex) => ex.exerciseId === item.id
                  )
                : false;
              return (
                <AnimatedPressable
                  style={[styles.pickerItem, alreadyAdded && styles.pickerItemSelected, alreadyAdded && { opacity: 0.6 }]}
                  onPress={() => exercisePickerDay && !alreadyAdded && addExerciseToDay(exercisePickerDay, item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.name}`}
                >
                  <View style={styles.pickerItemInfo}>
                    <Text style={styles.pickerItemName}>{item.name}</Text>
                    <Text style={styles.pickerItemMeta}>
                      {item.muscleGroups.slice(0, 3).join(", ")}
                      {item.isBodyweight ? " · Bodyweight" : ""}
                    </Text>
                    <Text style={styles.pickerItemMuscles}>
                      {item.difficulty} · {item.category}
                    </Text>
                  </View>
                  {alreadyAdded && <Ionicons name="checkmark" size={rf(18)} color={colors.primary.DEFAULT} />}
                </AnimatedPressable>
              );
            }}
            contentContainerStyle={styles.pickerList}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No exercises found</Text>
              </View>
            }
          />
        </BottomSheet>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  saveBtn: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.md,
  },
  saveBtnDisabled: { backgroundColor: colors.background.tertiary, opacity: 0.5 },
  saveText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
  },

  modeToggleContainer: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.md),
    paddingBottom: rp(spacing.xs),
  },

  subtitle: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
  },

  emptyWrap: { flex: 1, justifyContent: "center" },

  dayList: { paddingHorizontal: rp(spacing.md), paddingBottom: rp(spacing.xxl) },

  // ── Template mode day rows ──
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.sm),
    gap: rp(spacing.sm),
  },
  dayLabelBox: {
    width: rw(48),
    alignItems: "center",
  },
  dayShort: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary.DEFAULT,
  },
  dayFull: { fontSize: rf(11), color: colors.text.tertiary, marginTop: rp(spacing.xxs) },

  assignedBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    gap: rp(spacing.sm),
  },
  assignedInfo: { flex: 1 },
  assignedName: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
  },
  assignedMeta: { fontSize: rf(typography.fontSize.micro), color: colors.text.secondary, marginTop: rp(spacing.xxs) },
  changeBtn: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  changeBtnText: { fontSize: rf(typography.fontSize.micro), color: colors.primary.DEFAULT },
  clearBtn: { padding: rp(spacing.sm) },

  restBox: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderStyle: "dashed",
  },
  restText: { fontSize: rf(typography.fontSize.caption), color: colors.text.tertiary },
  addText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  summaryRow: {
    marginTop: rp(spacing.md),
    alignItems: "center",
    paddingVertical: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  summaryText: { fontSize: rf(typography.fontSize.caption), color: colors.text.secondary },

  // ── Exercise mode ──
  exerciseDayBlock: {
    marginBottom: rp(spacing.xs),
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  exerciseDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
  },
  exerciseDayHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    backgroundColor: colors.background.tertiary,
  },
  exerciseDayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  exerciseDayLabel: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
  },
  exerciseDayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  exerciseDayCount: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  exerciseDayRest: { fontSize: rf(typography.fontSize.micro), color: colors.text.tertiary },

  exerciseDayDetail: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.glass.border,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  exerciseDayEmptyHint: {
    fontSize: rf(13),
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: rp(spacing.sm),
  },

  exerciseItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    marginBottom: rp(spacing.xs),
  },
  exerciseItemInfo: { flex: 1 },
  exerciseItemName: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.xs),
  },
  exerciseItemControls: {
    flexDirection: "row",
    gap: rp(spacing.md),
    alignItems: "center",
  },
  controlGroup: { alignItems: "center" },
  controlLabel: { fontSize: rf(10), color: colors.text.secondary, marginBottom: rp(spacing.xxs) },
  controlValue: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  stepperBtn: {
    width: rw(32),
    height: rw(32),
    borderRadius: 999,
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnText: {
    fontSize: rf(typography.fontSize.body),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
    lineHeight: rf(18),
  },
  stepperValue: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
    minWidth: rw(28),
    textAlign: "center",
  },

  removeExBtn: {
    padding: rp(spacing.sm),
    marginLeft: rp(spacing.xxs),
  },

  exerciseDayActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: rp(spacing.xxs),
  },
  addExerciseBtn: {
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
  },
  addExerciseBtnText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.primary.DEFAULT,
  },
  clearDayBtn: {
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
  },
  clearDayBtnText: { fontSize: rf(typography.fontSize.micro), color: colors.error.DEFAULT },

  // ── Picker sheets ──
  pickerList: { paddingBottom: rp(spacing.xxl) },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  pickerItemSelected: { backgroundColor: `${colors.primary.DEFAULT}1A` },
  pickerItemInfo: { flex: 1 },
  pickerItemName: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
  },
  pickerItemMeta: { fontSize: rf(typography.fontSize.micro), color: colors.text.secondary, marginTop: rp(spacing.xxs) },
  pickerItemMuscles: { fontSize: rf(typography.fontSize.micro), color: colors.primary.DEFAULT, marginTop: rp(spacing.xxs) },

  pickerEmpty: { padding: rp(spacing.xxl), alignItems: "center" },
  pickerEmptyText: { fontSize: rf(typography.fontSize.caption), color: colors.text.tertiary },

  // ── Exercise picker extras ──
  exerciseSearchRow: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  exerciseSearchInput: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.primary,
  },
  categoryTabsRow: {
    paddingHorizontal: rp(spacing.md),
    paddingBottom: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  categoryTab: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.xl,
    backgroundColor: colors.glass.background,
  },
  categoryTabActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  categoryTabText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  categoryTabTextActive: {
    color: colors.text.primary,
  },
});
