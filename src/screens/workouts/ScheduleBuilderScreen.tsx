import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { workoutTemplateService, WorkoutTemplate, TemplateExercise } from "../../services/workoutTemplateService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { generateUUID } from "../../utils/uuid";
import { buildDayWorkoutFromTemplate, buildDayWorkoutFromExercises } from "../../utils/workoutBuilders";
import { CURATED_EXERCISES, CuratedExercise } from "../../data/curatedExercises";
import { SegmentedControl, SegmentOption } from "../../components/ui/SegmentedControl";
import type { DayWorkout, WeeklyWorkoutPlan } from "../../types/ai";

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Build My Schedule</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || assignedCount === 0}
          style={[styles.saveBtn, (saving || assignedCount === 0) && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

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
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No saved workouts yet</Text>
              <Text style={styles.emptySubtitle}>
                Create workout templates first, then come back to build your schedule.
              </Text>
              <Pressable
                style={styles.createWorkoutBtn}
                onPress={() => navigation.navigate("CreateWorkout")}
              >
                <Text style={styles.createWorkoutBtnText}>Create Workout →</Text>
              </Pressable>
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
                        <Pressable
                          onPress={() => setPickerDay(day.key)}
                          style={styles.changeBtn}
                        >
                          <Text style={styles.changeBtnText}>Change</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => clearDay(day.key)}
                          style={styles.clearBtn}
                        >
                          <Text style={styles.clearBtnText}>✕</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.restBox}
                        onPress={() => setPickerDay(day.key)}
                      >
                        <Text style={styles.restText}>Rest Day</Text>
                        <Text style={styles.addText}>+ Add Workout</Text>
                      </Pressable>
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
                <Pressable
                  style={[styles.exerciseDayHeader, isExpanded && styles.exerciseDayHeaderExpanded]}
                  onPress={() => toggleExpandDay(day.key)}
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
                    <Text style={styles.expandArrow}>{isExpanded ? "▲" : "▼"}</Text>
                  </View>
                </Pressable>

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
                                <Pressable
                                  style={styles.stepperBtn}
                                  onPress={() => ex.sets > 1 && updateExerciseInDay(day.key, idx, { sets: ex.sets - 1 })}
                                >
                                  <Text style={styles.stepperBtnText}>−</Text>
                                </Pressable>
                                <Text style={styles.stepperValue}>{ex.sets}</Text>
                                <Pressable
                                  style={styles.stepperBtn}
                                  onPress={() => updateExerciseInDay(day.key, idx, { sets: ex.sets + 1 })}
                                >
                                  <Text style={styles.stepperBtnText}>+</Text>
                                </Pressable>
                              </View>
                            </View>

                            {/* Reps */}
                            <View style={styles.controlGroup}>
                              <Text style={styles.controlLabel}>Reps</Text>
                              <View style={styles.stepperRow}>
                                <Pressable
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    if (ex.repRange[0] <= 1) return;
                                    updateExerciseInDay(day.key, idx, {
                                      repRange: [ex.repRange[0] - 1, ex.repRange[1] - 1],
                                    });
                                  }}
                                >
                                  <Text style={styles.stepperBtnText}>−</Text>
                                </Pressable>
                                <Text style={styles.stepperValue}>
                                  {ex.repRange[0] === ex.repRange[1]
                                    ? `${ex.repRange[0]}`
                                    : `${ex.repRange[0]}-${ex.repRange[1]}`}
                                </Text>
                                <Pressable
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    updateExerciseInDay(day.key, idx, {
                                      repRange: [ex.repRange[0] + 1, ex.repRange[1] + 1],
                                    });
                                  }}
                                >
                                  <Text style={styles.stepperBtnText}>+</Text>
                                </Pressable>
                              </View>
                            </View>

                            {/* Rest */}
                            <View style={styles.controlGroup}>
                              <Text style={styles.controlLabel}>Rest</Text>
                              <Text style={styles.controlValue}>{ex.restSeconds}s</Text>
                            </View>
                          </View>
                        </View>
                        <Pressable
                          style={styles.removeExBtn}
                          onPress={() => removeExerciseFromDay(day.key, idx)}
                        >
                          <Text style={styles.removeExBtnText}>✕</Text>
                        </Pressable>
                      </View>
                    ))}

                    {/* Actions */}
                    <View style={styles.exerciseDayActions}>
                      <Pressable
                        style={styles.addExerciseBtn}
                        onPress={() => {
                          setExercisePickerDay(day.key);
                          setExerciseCategory("all");
                          setExerciseSearch("");
                        }}
                      >
                        <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
                      </Pressable>
                      {dayExercises.length > 0 && (
                        <Pressable
                          style={styles.clearDayBtn}
                          onPress={() => clearDayExercises(day.key)}
                        >
                          <Text style={styles.clearDayBtnText}>Clear All</Text>
                        </Pressable>
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
      <Modal
        visible={pickerDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerDay(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Pick workout for{" "}
                {pickerDay
                  ? DAYS.find((d) => d.key === pickerDay)?.label
                  : ""}
              </Text>
              <Pressable onPress={() => setPickerDay(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.pickerItem,
                    pickerDay && assignments[pickerDay]?.id === item.id &&
                      styles.pickerItemSelected,
                  ]}
                  onPress={() => pickerDay && assignTemplate(pickerDay, item)}
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
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
              contentContainerStyle={styles.pickerList}
            />
          </View>
        </View>
      </Modal>

      {/* ═══════════ EXERCISE PICKER MODAL ═══════════ */}
      <Modal
        visible={exercisePickerDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setExercisePickerDay(null);
          setExerciseSearch("");
          setExerciseCategory("all");
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add exercise to{" "}
                {exercisePickerDay
                  ? DAYS.find((d) => d.key === exercisePickerDay)?.label
                  : ""}
              </Text>
              <Pressable onPress={() => {
                setExercisePickerDay(null);
                setExerciseSearch("");
                setExerciseCategory("all");
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.exerciseSearchRow}>
              <TextInput
                style={styles.exerciseSearchInput}
                placeholder="Search exercises..."
                placeholderTextColor="#666"
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
                <Pressable
                  key={cat.key}
                  style={[
                    styles.categoryTab,
                    exerciseCategory === cat.key && styles.categoryTabActive,
                  ]}
                  onPress={() => setExerciseCategory(cat.key)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      exerciseCategory === cat.key && styles.categoryTabTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
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
                  <Pressable
                    style={[styles.pickerItem, alreadyAdded && styles.pickerItemSelected, alreadyAdded && { opacity: 0.6 }]}
                    onPress={() => exercisePickerDay && !alreadyAdded && addExerciseToDay(exercisePickerDay, item)}
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
                    {alreadyAdded && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.pickerList}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>No exercises found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  loader: { flex: 1, justifyContent: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A4E",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  backBtn: { paddingRight: 12, paddingVertical: 4 },
  backText: { fontSize: 16, color: "#4CAF50", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnDisabled: { backgroundColor: "#2A4A2E", opacity: 0.5 },
  saveText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  modeToggleContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: "#888",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 12 },
  emptySubtitle: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
  createWorkoutBtn: {
    marginTop: 16,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createWorkoutBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  dayList: { paddingHorizontal: 16, paddingBottom: 32 },

  // ── Template mode day rows ──
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  dayLabelBox: {
    width: 48,
    alignItems: "center",
  },
  dayShort: { fontSize: 12, fontWeight: "700", color: "#4CAF50" },
  dayFull: { fontSize: 11, color: "#666", marginTop: 2 },

  assignedBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A4E",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  assignedInfo: { flex: 1 },
  assignedName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  assignedMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  changeBtnText: { fontSize: 12, color: "#4CAF50" },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 16, color: "#FF5252" },

  restBox: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E3A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2A2A4E",
    borderStyle: "dashed",
  },
  restText: { fontSize: 14, color: "#555" },
  addText: { fontSize: 13, color: "#4CAF50", fontWeight: "600" },

  summaryRow: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A2A4E",
  },
  summaryText: { fontSize: 14, color: "#888" },

  // ── Exercise mode ──
  exerciseDayBlock: {
    marginBottom: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  exerciseDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E3A",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2A2A4E",
    borderRadius: 10,
  },
  exerciseDayHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    backgroundColor: "#252548",
  },
  exerciseDayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseDayLabel: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  exerciseDayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseDayCount: { fontSize: 12, color: "#4CAF50", fontWeight: "600" },
  exerciseDayRest: { fontSize: 12, color: "#555" },
  expandArrow: { fontSize: 10, color: "#888" },

  exerciseDayDetail: {
    backgroundColor: "#1E1E3A",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#2A2A4E",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exerciseDayEmptyHint: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    paddingVertical: 8,
  },

  exerciseItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#2A2A4E",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  exerciseItemInfo: { flex: 1 },
  exerciseItemName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", marginBottom: 6 },
  exerciseItemControls: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  controlGroup: { alignItems: "center" },
  controlLabel: { fontSize: 10, color: "#888", marginBottom: 3 },
  controlValue: { fontSize: 13, color: "#FFFFFF", fontWeight: "600" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3A3A5E",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600", lineHeight: 18 },
  stepperValue: { fontSize: 13, color: "#FFFFFF", fontWeight: "600", minWidth: 28, textAlign: "center" },

  removeExBtn: {
    padding: 6,
    marginLeft: 4,
  },
  removeExBtnText: { fontSize: 14, color: "#FF5252" },

  exerciseDayActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  addExerciseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addExerciseBtnText: { fontSize: 13, fontWeight: "600", color: "#4CAF50" },
  clearDayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearDayBtnText: { fontSize: 12, color: "#FF5252" },

  // ── Modals (shared) ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1A1A2E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A4E",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  modalClose: { fontSize: 18, color: "#888", padding: 4 },

  pickerList: { paddingBottom: 32 },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A4E",
  },
  pickerItemSelected: { backgroundColor: "#1E3A1E" },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  pickerItemMeta: { fontSize: 12, color: "#888", marginTop: 3 },
  pickerItemMuscles: { fontSize: 12, color: "#4CAF50", marginTop: 3 },
  checkmark: { fontSize: 18, color: "#4CAF50", marginLeft: 8 },

  pickerEmpty: { padding: 32, alignItems: "center" },
  pickerEmptyText: { fontSize: 14, color: "#555" },

  // ── Exercise picker extras ──
  exerciseSearchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  exerciseSearchInput: {
    backgroundColor: "#2A2A4E",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#FFFFFF",
  },
  categoryTabsRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2A2A4E",
  },
  categoryTabActive: {
    backgroundColor: "#4CAF50",
  },
  categoryTabText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
});
