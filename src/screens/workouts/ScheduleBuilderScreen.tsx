import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { workoutTemplateService, WorkoutTemplate, TemplateExercise } from "../../services/workoutTemplateService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { getCurrentUserId } from "../../services/authUtils";
import { haptics } from "../../utils/haptics";
import { generateUUID } from "../../utils/uuid";
import { buildDayWorkoutFromTemplate, buildDayWorkoutFromExercises } from "../../utils/workoutBuilders";
import { CURATED_EXERCISES, CuratedExercise } from "../../data/curatedExercises";
import type { DayWorkout, WeeklyWorkoutPlan } from "../../types/ai";
import {
  AuroraBackground,
  BottomSheet,
  AuroraSpinner,
  EmptyState,
  AnimatedPressable,
} from "../../components/ui/aurora";
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

const MODE_OPTIONS: { id: BuilderMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "templates", label: "Templates", icon: "library-outline" },
  { id: "exercises", label: "Exercises", icon: "barbell-outline" },
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
  const [loadError, setLoadError] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
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

  // ── Load templates (extracted so the error-state retry can call it) ──
  const loadTemplates = useCallback(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      // Distinct from a fetch failure — the real problem is an expired/missing
      // session, so the user needs to sign in again rather than retry.
      setSignInRequired(true);
      setLoading(false);
      return;
    }
    setSignInRequired(false);
    setLoadError(false);
    workoutTemplateService.getTemplates(userId)
      .then(setTemplates)
      .catch((err) => {
        console.error("[ScheduleBuilder] Failed to load templates:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Load templates on mount ──
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <View style={styles.topRow}>
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
            </AnimatedPressable>
            <Text style={styles.stepEyebrow}>SCHEDULE BUILDER</Text>
            <View style={styles.topRowSpacer} />
          </View>
          <View style={styles.loader}>
            <AuroraSpinner size="lg" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (signInRequired) {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <View style={styles.topRow}>
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
            </AnimatedPressable>
            <Text style={styles.stepEyebrow}>SCHEDULE BUILDER</Text>
            <View style={styles.topRowSpacer} />
          </View>
          <View style={styles.emptyWrap} testID="schedule-sign-in-required">
            <EmptyState
              icon="lock-closed-outline"
              iconColor={colors.warning}
              title="Sign in required"
              subtitle="Your session has expired. Sign in again to build your schedule."
              ctaText="Go Back"
              onCta={() => navigation.goBack()}
            />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (loadError) {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <View style={styles.topRow}>
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
            </AnimatedPressable>
            <Text style={styles.stepEyebrow}>SCHEDULE BUILDER</Text>
            <View style={styles.topRowSpacer} />
          </View>
          <View style={styles.emptyWrap} testID="schedule-load-error">
            <EmptyState
              icon="cloud-offline-outline"
              iconColor={colors.error}
              title="Couldn't load your workouts"
              subtitle="Check your connection and try again."
              ctaText="Try Again"
              onCta={() => { setLoading(true); loadTemplates(); }}
            />
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
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={rf(24)} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.stepEyebrow}>SCHEDULE BUILDER</Text>
          <View style={styles.topRowSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInUp.delay(60).duration(450)}>
            <Text style={styles.title}>Build your schedule</Text>
            <Text style={styles.subtitle}>
              {mode === "templates"
                ? "Assign your saved workouts to days of the week"
                : "Pick exercises for each day of the week"}
            </Text>
          </Animated.View>

          {/* Mode toggle — flat 2-segment split */}
          <View style={styles.modeToggle}>
            {MODE_OPTIONS.map((opt) => {
              const active = mode === opt.id;
              return (
                <AnimatedPressable
                  key={opt.id}
                  style={[styles.modeSegment, active && styles.modeSegmentActive]}
                  onPress={() => {
                    haptics.selection();
                    setMode(opt.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: active }}
                  scaleValue={0.98}
                  springConfig="smooth"
                  hapticType="light"
                >
                  <Ionicons
                    name={opt.icon}
                    size={rf(16)}
                    color={active ? colors.white : colors.textSecondary}
                    style={styles.modeSegmentIcon}
                  />
                  <Text
                    style={[
                      styles.modeSegmentText,
                      active && styles.modeSegmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

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
                <View style={styles.dayList}>
                  {DAYS.map((day, idx) => {
                    const assigned = assignments[day.key];
                    const hasWorkout = assigned !== null;
                    return (
                      <Animated.View
                        key={day.key}
                        entering={FadeInUp.delay(120 + idx * 50).duration(400)}
                        style={[
                          styles.dayRow,
                          idx < DAYS.length - 1 && styles.dayRowSeparator,
                        ]}
                      >
                        {/* Day indicator disc — filled primary if assigned, hollow if rest */}
                        <View
                          style={[
                            styles.dayDisc,
                            hasWorkout ? styles.dayDiscFilled : styles.dayDiscHollow,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayDiscText,
                              hasWorkout
                                ? styles.dayDiscTextFilled
                                : styles.dayDiscTextHollow,
                            ]}
                          >
                            {day.short.slice(0, 1)}
                          </Text>
                          {hasWorkout && <View style={styles.dayDotIndicator} />}
                        </View>

                        <View style={styles.dayRowBody}>
                          <Text style={styles.dayLabel}>{day.label}</Text>
                          {assigned ? (
                            <View style={styles.assignedRow}>
                              <View style={styles.assignedInfo}>
                                <Text
                                  style={styles.assignedName}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.7}
                                >
                                  {assigned.name}
                                </Text>
                                <Text style={styles.assignedMeta} numberOfLines={1}>
                                  {assigned.exercises.length} exercises
                                  {assigned.estimatedDurationMinutes
                                    ? ` · ${assigned.estimatedDurationMinutes} min`
                                    : ""}
                                </Text>
                              </View>
                              <AnimatedPressable
                                onPress={() => setPickerDay(day.key)}
                                style={styles.ghostBtn}
                                accessibilityRole="button"
                                accessibilityLabel={`Change workout for ${day.label}`}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                scaleValue={0.97}
                                springConfig="smooth"
                                hapticType="light"
                              >
                                <Text style={styles.ghostBtnText}>Change</Text>
                              </AnimatedPressable>
                              <AnimatedPressable
                                onPress={() => clearDay(day.key)}
                                style={styles.iconBtn}
                                accessibilityRole="button"
                                accessibilityLabel={`Clear ${day.label}`}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                scaleValue={0.97}
                                springConfig="smooth"
                                hapticType="light"
                              >
                                <Ionicons name="close" size={rf(16)} color={colors.error} />
                              </AnimatedPressable>
                            </View>
                          ) : (
                            <AnimatedPressable
                              style={styles.restRow}
                              onPress={() => setPickerDay(day.key)}
                              accessibilityRole="button"
                              accessibilityLabel={`Add workout to ${day.label}`}
                              accessibilityState={{ selected: false }}
                              scaleValue={0.98}
                              springConfig="smooth"
                              hapticType="light"
                            >
                              <Text style={styles.restText}>Rest day</Text>
                              <Text style={styles.addText}>+ Add workout</Text>
                            </AnimatedPressable>
                          )}
                        </View>
                      </Animated.View>
                    );
                  })}

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>
                      {assignedCount} workout{assignedCount !== 1 ? "s" : ""} · {7 - assignedCount} rest day{7 - assignedCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ═══════════ EXERCISE MODE ═══════════ */}
          {mode === "exercises" && (
            <View style={styles.dayList}>
              {DAYS.map((day, idx) => {
                const dayExercises = exerciseAssignments[day.key] || [];
                const isExpanded = expandedDay === day.key;
                const hasWorkout = dayExercises.length > 0;
                return (
                  <Animated.View
                    key={day.key}
                    entering={FadeInUp.delay(120 + idx * 50).duration(400)}
                    style={[
                      styles.dayRow,
                      idx < DAYS.length - 1 && styles.dayRowSeparator,
                    ]}
                  >
                    <View
                      style={[
                        styles.dayDisc,
                        hasWorkout ? styles.dayDiscFilled : styles.dayDiscHollow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayDiscText,
                          hasWorkout
                            ? styles.dayDiscTextFilled
                            : styles.dayDiscTextHollow,
                        ]}
                      >
                        {day.short.slice(0, 1)}
                      </Text>
                      {hasWorkout && <View style={styles.dayDotIndicator} />}
                    </View>

                    <View style={styles.dayRowBody}>
                      {/* Day header — tap to expand */}
                      <AnimatedPressable
                        style={styles.exerciseDayHeader}
                        onPress={() => toggleExpandDay(day.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${day.label} — ${dayExercises.length} exercises`}
                        scaleValue={0.98}
                        springConfig="smooth"
                        hapticType="light"
                      >
                        <Text style={styles.dayLabel}>{day.label}</Text>
                        <View style={styles.exerciseDayHeaderRight}>
                          {hasWorkout ? (
                            <Text style={styles.exerciseDayCount}>
                              {dayExercises.length} exercise{dayExercises.length !== 1 ? "s" : ""}
                            </Text>
                          ) : (
                            <Text style={styles.exerciseDayRest}>Rest</Text>
                          )}
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={rf(14)}
                            color={colors.textSecondary}
                          />
                        </View>
                      </AnimatedPressable>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <Animated.View entering={FadeInDown.duration(200)} style={styles.exerciseDayDetail}>
                          {dayExercises.length === 0 && (
                            <Text style={styles.exerciseDayEmptyHint}>
                              No exercises yet. Tap "+ Add Exercise" below.
                            </Text>
                          )}

                          {dayExercises.map((ex, edx) => (
                            <View
                              key={`${ex.exerciseId}_${edx}`}
                              style={[
                                styles.exerciseItemRow,
                                edx < dayExercises.length - 1 &&
                                  styles.exerciseItemRowSeparator,
                              ]}
                            >
                              <View style={styles.exerciseItemInfo}>
                                <Text
                                  style={styles.exerciseItemName}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.7}
                                >
                                  {ex.name}
                                </Text>
                                <View style={styles.exerciseItemControls}>
                                  {/* Sets */}
                                  <View style={styles.controlGroup}>
                                    <Text style={styles.controlLabel}>Sets</Text>
                                    <View style={styles.stepperRow}>
                                      <AnimatedPressable
                                        style={styles.stepperBtn}
                                        onPress={() => ex.sets > 1 && updateExerciseInDay(day.key, edx, { sets: ex.sets - 1 })}
                                        accessibilityRole="button"
                                        accessibilityLabel="Decrease sets"
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        scaleValue={0.9}
                                        springConfig="snappy"
                                        hapticType="light"
                                      >
                                        <Text style={styles.stepperBtnText}>−</Text>
                                      </AnimatedPressable>
                                      <Text style={styles.stepperValue}>{ex.sets}</Text>
                                      <AnimatedPressable
                                        style={styles.stepperBtn}
                                        onPress={() => updateExerciseInDay(day.key, edx, { sets: ex.sets + 1 })}
                                        accessibilityRole="button"
                                        accessibilityLabel="Increase sets"
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        scaleValue={0.9}
                                        springConfig="snappy"
                                        hapticType="light"
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
                                          updateExerciseInDay(day.key, edx, {
                                            repRange: [ex.repRange[0] - 1, ex.repRange[1] - 1],
                                          });
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Decrease reps"
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        scaleValue={0.9}
                                        springConfig="snappy"
                                        hapticType="light"
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
                                          updateExerciseInDay(day.key, edx, {
                                            repRange: [ex.repRange[0] + 1, ex.repRange[1] + 1],
                                          });
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Increase reps"
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        scaleValue={0.9}
                                        springConfig="snappy"
                                        hapticType="light"
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
                                onPress={() => removeExerciseFromDay(day.key, edx)}
                                accessibilityRole="button"
                                accessibilityLabel="Remove exercise"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                scaleValue={0.9}
                                springConfig="snappy"
                                hapticType="light"
                              >
                                <Ionicons name="close" size={rf(14)} color={colors.error} />
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
                              hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                              scaleValue={0.97}
                              springConfig="smooth"
                              hapticType="light"
                            >
                              <Ionicons name="add" size={rf(16)} color={colors.primary} />
                              <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
                            </AnimatedPressable>
                            {dayExercises.length > 0 && (
                              <AnimatedPressable
                                style={styles.clearDayBtn}
                                onPress={() => clearDayExercises(day.key)}
                                accessibilityRole="button"
                                accessibilityLabel="Clear all exercises"
                                hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                                scaleValue={0.97}
                                springConfig="smooth"
                                hapticType="light"
                              >
                                <Text style={styles.clearDayBtnText}>Clear All</Text>
                              </AnimatedPressable>
                            )}
                          </View>
                        </Animated.View>
                      )}
                    </View>
                  </Animated.View>
                );
              })}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {assignedCount} workout{assignedCount !== 1 ? "s" : ""} · {7 - assignedCount} rest day{7 - assignedCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          )}

          {/* Bottom spacer so content isn't hidden behind sticky CTA */}
          <View style={styles.footerSpacer} />
        </ScrollView>

        {/* Sticky bottom gradient CTA — Save schedule */}
        <View style={styles.footer}>
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving || assignedCount === 0}
            accessibilityRole="button"
            accessibilityLabel="Save schedule"
            accessibilityState={{ disabled: saving || assignedCount === 0 }}
            scaleValue={0.97}
            hapticType="medium"
            style={[styles.cta, (saving || assignedCount === 0) && styles.ctaDisabled]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons
                name={saving ? "hourglass-outline" : "checkmark-circle-outline"}
                size={rf(18)}
                color={colors.white}
              />
              <Text style={styles.ctaText} numberOfLines={1}>
                {saving ? "Saving" : "Save Schedule"}
              </Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>

        {/* ═══════════ TEMPLATE PICKER MODAL ═══════════ */}
        <BottomSheet
          visible={pickerDay !== null}
          onClose={closeTemplatePicker}
          title={pickerDay ? `Pick workout for ${DAYS.find((d) => d.key === pickerDay)?.label ?? ""}` : "Pick workout"}
        >
          <FlatList
            data={templates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = pickerDay && assignments[pickerDay]?.id === item.id;
              return (
                <AnimatedPressable
                  style={[
                    styles.pickerItem,
                    selected && styles.pickerItemSelected,
                  ]}
                  onPress={() => pickerDay && assignTemplate(pickerDay, item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign ${item.name}`}
                  scaleValue={0.98}
                  springConfig="smooth"
                  hapticType="light"
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
                  <View
                    style={[
                      styles.pickerCircle,
                      selected
                        ? styles.pickerCircleSelected
                        : styles.pickerCircleUnselected,
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={rf(14)} color={colors.white} />
                    )}
                  </View>
                </AnimatedPressable>
              );
            }}
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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            style={styles.pickerKav}
          >
            {/* Search */}
            <View style={styles.exerciseSearchRow}>
              <TextInput
                style={styles.exerciseSearchInput}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textTertiary}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                autoCapitalize="none"
                returnKeyType="search"
                blurOnSubmit
              />
            </View>

            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabsRow}
            >
              {EXERCISE_CATEGORIES.map((cat) => {
                const active = exerciseCategory === cat.key;
                return (
                  <AnimatedPressable
                    key={cat.key}
                    style={[
                      styles.categoryTab,
                      active && styles.categoryTabActive,
                    ]}
                    onPress={() => setExerciseCategory(cat.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${cat.label}`}
                    hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
                    scaleValue={0.97}
                    springConfig="smooth"
                    hapticType="light"
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        active && styles.categoryTabTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* Exercise list */}
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const alreadyAdded = exercisePickerDay
                  ? (exerciseAssignments[exercisePickerDay] || []).some(
                      (ex) => ex.exerciseId === item.id
                    )
                  : false;
                return (
                  <AnimatedPressable
                    style={[
                      styles.pickerItem,
                      alreadyAdded && { opacity: 0.6 },
                    ]}
                    onPress={() => exercisePickerDay && !alreadyAdded && addExerciseToDay(exercisePickerDay, item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.name}`}
                    scaleValue={0.98}
                    springConfig="smooth"
                    hapticType="light"
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
                    <View
                      style={[
                        styles.pickerCircle,
                        alreadyAdded
                          ? styles.pickerCircleSelected
                          : styles.pickerCircleUnselected,
                      ]}
                    >
                      <Ionicons
                        name={alreadyAdded ? "checkmark" : "add"}
                        size={rf(14)}
                        color={alreadyAdded ? colors.white : colors.primary}
                      />
                    </View>
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
          </KeyboardAvoidingView>
        </BottomSheet>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    letterSpacing: 1.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.md),
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
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyWrap: { flex: 1, justifyContent: "center" },

  // ── Mode toggle ──
  modeToggle: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.md),
    backgroundColor: hexToRgba(colors.white, 0.06),
    borderRadius: borderRadius.xl,
    padding: rp(spacing.xs),
  },
  modeSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
    borderRadius: borderRadius.lg,
  },
  modeSegmentActive: {
    backgroundColor: colors.primary,
  },
  modeSegmentIcon: {},
  modeSegmentText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeSegmentTextActive: {
    color: colors.white,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },

  // ── Day list ──
  dayList: {
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    minHeight: 44,
  },
  dayRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },

  // ── Day disc indicator ──
  dayDisc: {
    width: rw(40),
    height: rw(40),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: rp(spacing.xs),
  },
  dayDiscFilled: {
    backgroundColor: colors.primary,
  },
  dayDiscHollow: {
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.25),
  },
  dayDiscText: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },
  dayDiscTextFilled: {
    color: colors.white,
  },
  dayDiscTextHollow: {
    color: colors.textTertiary,
  },
  dayDotIndicator: {
    position: "absolute",
    bottom: rp(-2),
    width: rw(6),
    height: rw(6),
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
  },

  dayRowBody: {
    flex: 1,
    minWidth: 0,
  },
  dayLabel: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rp(spacing.xs),
  },

  // ── Template mode assigned row ──
  assignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  assignedInfo: { flex: 1, minWidth: 0 },
  assignedName: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  assignedMeta: {
    fontSize: rf(12),
    color: colors.textTertiary,
    marginTop: rp(2),
  },
  ghostBtn: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
    backgroundColor: hexToRgba(colors.primary, 0.12),
  },
  ghostBtnText: {
    fontSize: rf(13),
    color: colors.primary,
    fontWeight: "600",
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: rw(36),
    height: rw(36),
  },

  // ── Rest row (template mode, unassigned) ──
  restRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
  },
  restText: {
    fontSize: rf(13),
    color: colors.textTertiary,
  },
  addText: {
    fontSize: rf(13),
    color: colors.primary,
    fontWeight: "600",
  },

  summaryRow: {
    marginTop: rp(spacing.md),
    alignItems: "center",
    paddingVertical: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
  },
  summaryText: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },

  // ── Exercise mode ──
  exerciseDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
  },
  exerciseDayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  exerciseDayCount: {
    fontSize: rf(12),
    color: colors.primary,
    fontWeight: "600",
  },
  exerciseDayRest: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },

  exerciseDayDetail: {
    paddingVertical: rp(spacing.xs),
  },
  exerciseDayEmptyHint: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: rp(spacing.sm),
  },

  exerciseItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: 44,
  },
  exerciseItemRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },
  exerciseItemInfo: { flex: 1, minWidth: 0 },
  exerciseItemName: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rp(spacing.xs),
  },
  exerciseItemControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: rp(spacing.xs),
    columnGap: rp(spacing.md),
    alignItems: "center",
  },
  controlGroup: { alignItems: "center" },
  controlLabel: {
    fontSize: rf(11),
    color: colors.textTertiary,
    marginBottom: rp(2),
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  controlValue: {
    fontSize: rf(13),
    color: colors.text,
    fontWeight: "600",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  stepperBtn: {
    width: Math.max(rw(32), 44),
    height: Math.max(rw(32), 44),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.white, 0.06),
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnText: {
    fontSize: rf(16),
    color: colors.text,
    fontWeight: "600",
  },
  stepperValue: {
    fontSize: rf(13),
    color: colors.text,
    fontWeight: "600",
    minWidth: rw(28),
    textAlign: "center",
  },

  removeExBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: rw(36),
    height: rw(36),
    minHeight: 44,
    minWidth: 44,
  },

  exerciseDayActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
  },
  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    minHeight: 44,
  },
  addExerciseBtnText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.primary,
  },
  clearDayBtn: {
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    minHeight: 44,
    justifyContent: "center",
  },
  clearDayBtnText: {
    fontSize: rf(12),
    color: colors.error,
    fontWeight: "600",
  },

  // ── Footer CTA ──
  footerSpacer: {
    height: rp(100),
  },
  footer: {
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.sm),
  },
  cta: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    minHeight: 52,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: 52,
  },
  ctaText: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.white,
  },

  // ── Picker sheets ──
  pickerList: { paddingBottom: rp(spacing.xxl) },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.md),
    gap: rp(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
    minHeight: 44,
  },
  pickerItemSelected: { backgroundColor: hexToRgba(colors.primary, 0.06) },
  pickerItemInfo: { flex: 1, minWidth: 0 },
  pickerItemName: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
  },
  pickerItemMeta: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  pickerItemMuscles: {
    fontSize: rf(12),
    color: colors.primary,
    marginTop: rp(2),
  },
  pickerCircle: {
    width: rw(26),
    height: rw(26),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: rp(spacing.xs),
  },
  pickerCircleSelected: {
    backgroundColor: colors.primary,
  },
  pickerCircleUnselected: {
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.25),
  },

  pickerEmpty: { padding: rp(spacing.xxl), alignItems: "center" },
  pickerEmptyText: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },

  // ── Exercise picker extras ──
  pickerKav: { flex: 1 },
  exerciseSearchRow: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  exerciseSearchInput: {
    backgroundColor: hexToRgba(colors.white, 0.06),
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
    fontSize: rf(14),
    color: colors.text,
  },
  categoryTabsRow: {
    paddingHorizontal: rp(spacing.md),
    paddingRight: rp(spacing.md),
    paddingBottom: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  categoryTab: {
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.white, 0.06),
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
  },
  categoryTabText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: "600",
  },
  categoryTabTextActive: {
    color: colors.white,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },
});
