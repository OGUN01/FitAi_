/**
 * WorkoutDetailScreen — Phase 8.1.
 *
 * Full-screen premium workout detail view that REPLACES the legacy
 * `WorkoutDetailsDialog` modal (src/components/ui/CustomDialog.tsx). The modal
 * was a 4-stat popup; this is a real screen with collapsible sections, sticky
 * progress, muscle heatmap, and a "Start Workout" CTA.
 *
 * Layout:
 *  - AuroraBackground theme="space"
 *  - GlassHeader: back chevron + workout title + "Start Workout" action
 *  - Sticky progress indicator (ProgressRing) — shows completion % when a
 *    session is in-progress (workoutProgress[workout.id].progress)
 *  - Stats bar: volume, calories (MET calc), duration, difficulty
 *  - Muscle heatmap: GradientBarChart per major body part
 *  - Collapsible sections: Warm-up / Main / Supersets / Finisher / Cooldown
 *  - Each exercise row: thumbnail disc, name, sets×reps, RPE, rest — tap opens
 *    ExerciseEditorSheet when in builder context (driven by optional
 *    onOpenEditor prop), otherwise expands inline details.
 *
 * "Start Workout" → startWorkoutSession(workout) → navigate("WorkoutSession").
 *
 * Registered as overlay session `workoutDetailSession` in MainNavigation
 * (additive — mirrors scheduleBuilderSession pattern).
 *
 * Single Source of Truth:
 *  - Workout comes from props (passed by the FitnessScreen / overlay router).
 *  - Progress comes from fitnessStore.workoutProgress[workout.id].
 *  - Calories from calculateWorkoutCalories (MET × weight × hours) — same SSOT
 *    as workout completion (CLAUDE.md §9).
 *
 * All colors/sizes/radii from aurora-tokens. Spring animations from animations.ts.
 * Haptics on every interaction from src/utils/haptics.ts.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInUp,
  SlideInRight,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { GlassButton } from "../../components/ui/aurora/GlassButton";
import { ProgressRing } from "../../components/ui/aurora/ProgressRing";
import { SupersetConnector } from "../../components/ui/aurora/SupersetConnector";
import { GradientBarChart, type BarData } from "../../components/ui/GradientBarChart";
import { BuilderAnalyticsPanel } from "../../components/fitness/builder/BuilderAnalyticsPanel";
import { useFitnessStore } from "../../stores/fitnessStore";
import { useProfileStore } from "../../stores/profileStore";
import { calculateWorkoutCalories } from "../../services/calorieCalculator";
import { CURATED_EXERCISES } from "../../data/curatedExercises";
import { haptics } from "../../utils/haptics";
import { animations } from "../../theme/animations";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rp, rf, rw } from "../../utils/responsive";
import type { DayWorkout } from "../../types/ai";
import type { PlannedExercise } from "../../types/workout";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

/**
 * Cast a typography font-weight token to RN's TextStyle['fontWeight'] without
 * `any` (TS strict). Same pattern as InlineValidationBanner.
 */
const fw = (
  w: (typeof typography.fontWeight)[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

export interface WorkoutDetailScreenProps {
  /** The workout to render. Required. */
  workout: DayWorkout;
  /** Navigation handle (overlay-session router). */
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  /**
   * Optional: open the ExerciseEditorSheet (builder context). When absent, row
   * taps expand inline details instead (read-only viewing from FitnessScreen).
   */
  onOpenEditor?: (dayIndex: number, exerciseIndex: number) => void;
  /** The day index this workout belongs to in the weekly plan (for editor ctx). */
  dayIndex?: number;
  /** Test ID prefix. */
  testID?: string;
}

// Major muscle groups surfaced in the heatmap (top-N by weekly sets).
const HEATMAP_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "core",
] as const;

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const WorkoutDetailScreen: React.FC<WorkoutDetailScreenProps> = ({
  workout,
  navigation,
  onOpenEditor,
  dayIndex = 0,
  testID,
}) => {
  // ── Progress (sticky ring) — from fitnessStore.workoutProgress ──
  const progress = useFitnessStore(
    (s) => s.workoutProgress[workout.id]?.progress ?? 0,
  );
  const startWorkoutSession = useFitnessStore((s) => s.startWorkoutSession);

  // ── User weight for MET calorie calc ──
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const userWeightKg = bodyAnalysis?.current_weight_kg ?? null;

  // ── Planned exercises (canonical). Fall back to adapting legacy
  //    workout.exercises (WorkoutSet[]) when plannedExercises is absent — this
  //    covers AI-generated workouts that populate `exercises` but not the
  //    builder's canonical planned shape. ──
  const planned: PlannedExercise[] = useMemo(() => {
    if (workout.plannedExercises && workout.plannedExercises.length > 0) {
      return workout.plannedExercises;
    }
    // Adapt legacy WorkoutSet[] → PlannedExercise[] (minimal — no per-set
    // type/RPE/tempo, which legacy shape doesn't carry).
    return (workout.exercises ?? []).map((ex, idx) => ({
      exerciseId: ex.exerciseId,
      name: ex.exerciseName ?? ex.name ?? `Exercise ${idx + 1}`,
      sets: Array.from({ length: ex.sets || 1 }, (_, i) => ({
        setNumber: i + 1,
        reps: ex.reps,
        weightKg: ex.weight,
        durationSeconds: ex.duration,
        setType: "normal" as const,
      })),
      restSeconds: ex.restTime ?? 60,
      notes: ex.notes,
      tempo: ex.tempo,
      targetRpe: ex.rpe,
    }));
  }, [workout.plannedExercises, workout.exercises]);

  // ── Stats (memoized) ──
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    const muscleCounts: Record<string, number> = {};

    // Build ExerciseCalorieInput[] for the MET calc.
    const calorieInputs = planned.map((p) => {
      const curated = CURATED_EXERCISES.find((c) => c.id === p.exerciseId);
      const firstSet = p.sets[0];
      const reps = firstSet?.reps;
      const weight = firstSet?.weightKg ?? 0;
      // Volume = sum(sets × reps × weight)
      for (const set of p.sets) {
        const repCount =
          typeof set.reps === "string"
            ? parseInt(set.reps, 10) || 10
            : set.reps || 0;
        totalVolume += (set.weightKg ?? 0) * repCount;
        totalSets += 1;
      }
      // Muscle coverage
      for (const muscle of curated?.muscleGroups ?? []) {
        muscleCounts[muscle] = (muscleCounts[muscle] ?? 0) + p.sets.length;
      }
      return {
        exerciseId: p.exerciseId,
        name: p.name,
        sets: p.sets.length,
        reps: reps ?? 8,
        weight,
        restTime: p.restSeconds,
        bodyParts: curated?.muscleGroups ?? [],
      };
    });

    const calorieResult = calculateWorkoutCalories(calorieInputs, userWeightKg);
    const calories = calorieResult.totalCalories;
    const duration =
      workout.duration && workout.duration > 0
        ? workout.duration
        : calorieResult.totalDurationMinutes || 0;

    return {
      totalVolume,
      totalSets,
      calories,
      duration,
      muscleCounts,
    };
  }, [planned, workout.duration, userWeightKg]);

  // ── Muscle heatmap data (top groups by set count) ──
  const heatmapData: BarData[] = useMemo(() => {
    const maxSets = Math.max(
      1,
      ...HEATMAP_GROUPS.map((g) => stats.muscleCounts[g] ?? 0),
    );
    return HEATMAP_GROUPS.map((g) => {
      const value = stats.muscleCounts[g] ?? 0;
      return {
        label: g.charAt(0).toUpperCase() + g.slice(1),
        value,
        maxValue: maxSets,
        gradient:
          value === 0
            ? [colors.glass.background, colors.glass.backgroundLight]
            : value < maxSets * 0.4
              ? [colors.warning.DEFAULT, colors.warning.light]
              : [colors.primary.DEFAULT, colors.primary.light],
        unit: " sets",
      };
    });
  }, [stats.muscleCounts]);

  // ── Section partitioning ──
  // Warm-up: planned exercises whose sets are all `warmup` OR listed in
  // workout.warmUp. Main: everything else. Finisher: high-RPE (>=8). Cooldown:
  // workout.coolDown entries (stretching/mobility). Supersets: exercises with
  // supersetId, grouped.
  const sections = useMemo(() => {
    const warmup: PlannedExercise[] = [];
    const main: PlannedExercise[] = [];
    const finisher: PlannedExercise[] = [];
    const superset: PlannedExercise[] = [];
    for (const ex of planned) {
      const isWarmup = ex.sets.every((s) => s.setType === "warmup");
      const isFinisher = (ex.targetRpe ?? 0) >= 8;
      if (ex.supersetId) {
        superset.push(ex);
      } else if (isWarmup) {
        warmup.push(ex);
      } else if (isFinisher) {
        finisher.push(ex);
      } else {
        main.push(ex);
      }
    }
    return { warmup, main, finisher, superset, cooldown: workout.coolDown ?? [] };
  }, [planned, workout.coolDown]);

  const inProgress = progress > 0 && progress < 100;
  const isCompleted = progress >= 100;

  // Bottom inset so the sticky Start CTA clears the home indicator on devices
  // without gesture nav (SafeAreaView uses edges={['top']} only — see below).
  const insets = useSafeAreaInsets();

  // ── Start workout ──
  const [starting, setStarting] = useState(false);
  const handleStartWorkout = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    haptics.buttonPress();
    try {
      const sessionId = await startWorkoutSession(workout);
      navigation.navigate("WorkoutSession", {
        workout,
        sessionId,
      });
    } catch (err) {
      console.error("[WorkoutDetailScreen] startWorkoutSession failed:", err);
      haptics.error();
      setStarting(false);
    }
  }, [starting, startWorkoutSession, workout, navigation]);

  const handleBack = useCallback(() => {
    haptics.light();
    navigation.goBack();
  }, [navigation]);

  // ── Difficulty label ──
  const difficultyLabel = useMemo(() => {
    const diff = (workout.difficulty ?? "intermediate").toLowerCase();
    if (diff === "advanced") return "Advanced";
    if (diff === "beginner") return "Beginner";
    return "Intermediate";
  }, [workout.difficulty]);

  const intensityLevel = (workout.intensityLevel ?? "rest").toLowerCase();
  const intensityColor =
    intensityLevel === "intense" || intensityLevel === "high"
      ? colors.primary.DEFAULT
      : intensityLevel === "moderate" || intensityLevel === "medium"
        ? colors.warning.DEFAULT
        : colors.text.tertiary;

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <GlassHeader
          title={workout.title || "Workout"}
          titleIcon="barbell-outline"
          onBack={handleBack}
          backAccessibilityLabel="Go back to previous screen"
          rightAction={
            <GlassButton
              label={starting ? "Starting…" : "Start"}
              icon="play-circle-outline"
              onPress={handleStartWorkout}
              variant="primary"
              loading={starting}
              disabled={starting || planned.length === 0}
              hapticType="medium"
              style={styles.headerStartBtn}
              textStyle={styles.headerStartText}
              testID={`${testID ?? "workout-detail"}-start`}
            />
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID={`${testID ?? "workout-detail"}-scroll`}
        >
          {/* ── Sticky progress + title hero ── */}
          <Animated.View
            entering={FadeInUp.springify()}
            style={styles.heroCard}
          >
            <GlassCard
              blurIntensity="default"
              elevation={3}
              padding="md"
              borderRadius="xl"
              showBorder
            >
              <View style={styles.heroRow}>
                {/* Progress ring (sticky at top — shows % if in-progress) */}
                <ProgressRing
                  progress={progress}
                  size={rf(72)}
                  strokeWidth={6}
                  gradient
                  gradientColors={[
                    isCompleted
                      ? colors.success.DEFAULT
                      : colors.primary[400],
                    colors.secondary[500],
                  ]}
                  showText={inProgress || isCompleted}
                  text={
                    isCompleted
                      ? "✓"
                      : inProgress
                        ? `${Math.round(progress)}%`
                        : ""
                  }
                >
                  {!(inProgress || isCompleted) ? (
                    <Ionicons
                      name="barbell-outline"
                      size={rf(24)}
                      color={colors.primary.DEFAULT}
                    />
                  ) : null}
                </ProgressRing>

                <View style={styles.heroInfo}>
                  <Text
                    style={styles.heroTitle}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {workout.title || "Custom Workout"}
                  </Text>
                  {!!workout.description && (
                    <Text
                      style={styles.heroDesc}
                      numberOfLines={3}
                    >
                      {workout.description}
                    </Text>
                  )}
                  <View style={styles.heroMeta}>
                    <View
                      style={[
                        styles.intensityChip,
                        { backgroundColor: intensityColor },
                      ]}
                    >
                      <Text style={styles.intensityChipText}>
                        {intensityLevel === "rest"
                          ? "REST"
                          : intensityLevel.slice(0, 4).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.metaText}>
                      {planned.length} exercise
                      {planned.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ── Statistics bar ── */}
          <Animated.View
            entering={FadeInUp.springify().delay(40)}
            style={styles.statsCard}
          >
            <GlassCard
              blurIntensity="default"
              elevation={2}
              padding="sm"
              borderRadius="lg"
              showBorder
            >
              <View style={styles.statsRow}>
                <Stat
                  icon="barbell-outline"
                  label="Volume"
                  value={
                    stats.totalVolume > 0
                      ? `${Math.round(stats.totalVolume)}kg`
                      : "—"
                  }
                />
                <Divider />
                <Stat
                  icon="flame-outline"
                  label="Calories"
                  value={
                    stats.calories > 0
                      ? String(stats.calories)
                      : workout.estimatedCalories > 0
                        ? String(workout.estimatedCalories)
                        : "—"
                  }
                />
                <Divider />
                <Stat
                  icon="time-outline"
                  label="Duration"
                  value={
                    stats.duration > 0 ? `${Math.round(stats.duration)}m` : "—"
                  }
                />
                <Divider />
                <Stat
                  icon="trending-up-outline"
                  label="Difficulty"
                  value={difficultyLabel}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* ── Muscle heatmap ── */}
          {planned.length > 0 && (
            <Animated.View
              entering={FadeInUp.springify().delay(80)}
              style={styles.heatmapCard}
            >
              <GlassCard
                blurIntensity="default"
                elevation={2}
                padding="md"
                borderRadius="lg"
                showBorder
              >
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="body-outline"
                    size={rf(16)}
                    color={colors.primary.DEFAULT}
                  />
                  <Text style={styles.sectionTitle}>Muscle Heatmap</Text>
                </View>
                <GradientBarChart
                  data={heatmapData}
                  height={rp(220)}
                  animated
                  showValues
                />
              </GlassCard>
            </Animated.View>
          )}

          {/* ── Warm-up section ── */}
          {sections.warmup.length > 0 && (
            <CollapsibleSection
              title="Warm-up"
              icon="flame-outline"
              accentColor={colors.warning.DEFAULT}
              count={sections.warmup.length}
              testID={`${testID ?? "workout-detail"}-warmup`}
            >
              {sections.warmup.map((ex, idx) => (
                <DetailExerciseRow
                  key={`${ex.exerciseId}_w${idx}`}
                  exercise={ex}
                  index={idx}
                  onOpenEditor={onOpenEditor}
                  dayIndex={dayIndex}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* ── Main workout section ── */}
          {sections.main.length > 0 && (
            <CollapsibleSection
              title="Main Workout"
              icon="barbell-outline"
              accentColor={colors.primary.DEFAULT}
              count={sections.main.length}
              defaultExpanded
              testID={`${testID ?? "workout-detail"}-main`}
            >
              {sections.main.map((ex, idx) => (
                <DetailExerciseRow
                  key={`${ex.exerciseId}_m${idx}`}
                  exercise={ex}
                  index={idx}
                  onOpenEditor={onOpenEditor}
                  dayIndex={dayIndex}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* ── Supersets section ── */}
          {sections.superset.length > 0 && (
            <CollapsibleSection
              title="Supersets"
              icon="git-merge-outline"
              accentColor={colors.secondary.DEFAULT}
              count={sections.superset.length}
              testID={`${testID ?? "workout-detail"}-superset`}
            >
              <View style={styles.supersetWrap}>
                <SupersetConnector
                  startY={rp(8)}
                  endY={rp(8) + sections.superset.length * rp(78)}
                  width={rw(24)}
                  insetX={rw(8)}
                />
                {sections.superset.map((ex, idx) => (
                  <DetailExerciseRow
                    key={`${ex.exerciseId}_s${idx}`}
                    exercise={ex}
                    index={idx}
                    onOpenEditor={onOpenEditor}
                    dayIndex={dayIndex}
                    supersetActive
                  />
                ))}
              </View>
            </CollapsibleSection>
          )}

          {/* ── Finisher section ── */}
          {sections.finisher.length > 0 && (
            <CollapsibleSection
              title="Finisher"
              icon="flash-outline"
              accentColor={colors.error.DEFAULT}
              count={sections.finisher.length}
              testID={`${testID ?? "workout-detail"}-finisher`}
            >
              {sections.finisher.map((ex, idx) => (
                <DetailExerciseRow
                  key={`${ex.exerciseId}_f${idx}`}
                  exercise={ex}
                  index={idx}
                  onOpenEditor={onOpenEditor}
                  dayIndex={dayIndex}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* ── Cooldown section ── */}
          {sections.cooldown.length > 0 && (
            <CollapsibleSection
              title="Cooldown"
              icon="walk-outline"
              accentColor={colors.secondary.light}
              count={sections.cooldown.length}
              testID={`${testID ?? "workout-detail"}-cooldown`}
            >
              {sections.cooldown.map((cd, idx) => (
                <CooldownRow key={`cd_${idx}`} name={cd.name} duration={cd.duration} instructions={cd.instructions} />
              ))}
            </CollapsibleSection>
          )}

          {/* ── Empty state ── */}
          {planned.length === 0 && sections.cooldown.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="barbell-outline"
                size={rf(48)}
                color={colors.text.tertiary}
              />
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptyHint}>
                This workout has no planned exercises. Add some via the builder.
              </Text>
            </View>
          )}

          {/* ── Training analytics (Phase 11) ── */}
          {/* Historical trends (volume, heatmap, PRs, streak). Collapsible, with
              its own empty state when the user has no training history. */}
          <BuilderAnalyticsPanel
            testID={`${testID ?? "workout-detail"}-analytics`}
          />

          <View style={styles.footerSpacer} />
        </ScrollView>

        {/* ── Sticky bottom Start Workout CTA ── */}
        {planned.length > 0 && !isCompleted && (
          <BottomStartBar
            starting={starting}
            duration={stats.duration}
            calories={stats.calories}
            onStart={handleStartWorkout}
            bottomInset={insets.bottom}
            testID={`${testID ?? "workout-detail"}-bottom-start`}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

// ----------------------------------------------------------------------------
// COLLAPSIBLE SECTION
// ----------------------------------------------------------------------------

interface CollapsibleSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  count: number;
  defaultExpanded?: boolean;
  testID?: string;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  accentColor,
  count,
  defaultExpanded = false,
  testID,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const chevronRotation = useSharedValue(defaultExpanded ? 1 : 0);
  chevronRotation.value = withTiming(expanded ? 1 : 0, {
    duration: animations.duration.quick,
  });
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(chevronRotation.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const handleToggle = useCallback(() => {
    haptics.selection();
    setExpanded((e) => !e);
  }, []);

  return (
    <Animated.View
      entering={FadeInUp.springify().delay(60)}
      layout={Layout.springify()}
      style={styles.sectionWrap}
    >
      <GlassCard
        blurIntensity="default"
        elevation={2}
        padding="none"
        borderRadius="lg"
        showBorder
        contentStyle={styles.sectionContent}
      >
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${count} items. ${
            expanded ? "Collapse" : "Expand"
          }.`}
          accessibilityState={{ expanded }}
          style={styles.sectionHeader}
          testID={testID}
        >
          <View style={[styles.sectionIcon, { backgroundColor: accentColor }]}>
            <Ionicons name={icon} size={rf(14)} color={colors.text.primary} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{count}</Text>
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="chevron-down"
              size={rf(18)}
              color={colors.text.secondary}
            />
          </Animated.View>
        </Pressable>

        {expanded && (
          <Animated.View
            entering={SlideInRight.springify()}
            layout={Layout.springify()}
            style={styles.sectionBody}
          >
            {children}
          </Animated.View>
        )}
      </GlassCard>
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// DETAIL EXERCISE ROW (read-only card with tap-to-expand or tap-to-edit)
// ----------------------------------------------------------------------------

interface DetailExerciseRowProps {
  exercise: PlannedExercise;
  index: number;
  onOpenEditor?: (dayIndex: number, exerciseIndex: number) => void;
  dayIndex: number;
  supersetActive?: boolean;
}

const DetailExerciseRow: React.FC<DetailExerciseRowProps> = ({
  exercise,
  index,
  onOpenEditor,
  dayIndex,
  supersetActive = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const curated = CURATED_EXERCISES.find((c) => c.id === exercise.exerciseId);
  const muscleGroups = curated?.muscleGroups ?? [];
  const equipment = curated?.equipment ?? [];
  const difficulty = curated?.difficulty ?? "intermediate";

  const setCount = exercise.sets.length;
  const firstReps = exercise.sets[0]?.reps;
  const repsLabel =
    typeof firstReps === "string"
      ? firstReps
      : firstReps != null
        ? String(firstReps)
        : "—";

  const intensityColor =
    exercise.targetRpe != null
      ? exercise.targetRpe >= 8
        ? colors.error.DEFAULT
        : exercise.targetRpe >= 6
          ? colors.warning.DEFAULT
          : colors.success.DEFAULT
      : colors.primary.DEFAULT;

  const handleTap = useCallback(() => {
    haptics.cardTap();
    if (onOpenEditor) {
      onOpenEditor(dayIndex, index);
    } else {
      setExpanded((e) => !e);
    }
  }, [onOpenEditor, dayIndex, index]);

  return (
    <Pressable
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}. ${setCount} sets of ${repsLabel}. ${
        exercise.targetRpe != null ? `RPE ${exercise.targetRpe}.` : ""
      } ${expanded ? "Tap to collapse." : "Tap for details."}`}
      style={styles.detailRow}
    >
      {supersetActive && <View style={styles.supersetRail} />}
      <View style={styles.detailRowInner}>
        {/* Thumbnail disc */}
        <LinearGradient
          colors={[colors.primary.DEFAULT, colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailThumb}
        >
          <Ionicons
            name="barbell-outline"
            size={rf(18)}
            color={colors.text.primary}
          />
        </LinearGradient>

        {/* Name + meta */}
        <View style={styles.detailInfo}>
          <View style={styles.detailNameRow}>
            {supersetActive && (
              <View style={styles.supersetChip}>
                <Text style={styles.supersetChipText}>SS</Text>
              </View>
            )}
            <Text style={styles.detailName} numberOfLines={1}>
              {exercise.name}
            </Text>
          </View>
          <View style={styles.detailChipRow}>
            {muscleGroups.slice(0, 2).map((m) => (
              <View key={m} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>{m}</Text>
              </View>
            ))}
            {equipment.length > 0 && (
              <Text style={styles.detailMetaText} numberOfLines={1}>
                {equipment[0]} · {difficulty}
              </Text>
            )}
          </View>
        </View>

        {/* Sets × reps */}
        <View style={styles.detailSetsCell}>
          <Text style={styles.detailSetsValue}>{setCount}</Text>
          <Text style={styles.detailSetsLabel}>× {repsLabel}</Text>
        </View>

        {/* RPE target */}
        {exercise.targetRpe != null && (
          <View style={styles.rpeCell}>
            <View
              style={[styles.intensityDot, { backgroundColor: intensityColor }]}
            />
            <Text style={styles.rpeText}>RPE {exercise.targetRpe}</Text>
          </View>
        )}

        {/* Rest */}
        <View style={styles.restCell}>
          <Ionicons
            name="timer-outline"
            size={rf(12)}
            color={colors.text.tertiary}
          />
          <Text style={styles.restText}>{exercise.restSeconds}s</Text>
        </View>
      </View>

      {/* Expanded inline details (only when no editor wired) */}
      {expanded && !onOpenEditor && (
        <Animated.View
          entering={SlideInRight.springify()}
          layout={Layout.springify()}
          style={styles.detailExpanded}
        >
          {exercise.notes && (
            <Text style={styles.detailNotes}>{exercise.notes}</Text>
          )}
          {exercise.tempo && (
            <View style={styles.detailMetaRow}>
              <Text style={styles.detailMetaLabel}>Tempo:</Text>
              <Text style={styles.detailMetaValue}>{exercise.tempo}</Text>
            </View>
          )}
          <View style={styles.detailMetaRow}>
            <Text style={styles.detailMetaLabel}>Sets:</Text>
            <Text style={styles.detailMetaValue}>
              {exercise.sets
                .map(
                  (s, i) =>
                    `Set ${i + 1}: ${s.reps}${
                      s.weightKg ? ` @ ${s.weightKg}kg` : ""
                    }`,
                )
                .join("  ·  ")}
            </Text>
          </View>
          {muscleGroups.length > 2 && (
            <View style={styles.detailMetaRow}>
              <Text style={styles.detailMetaLabel}>Muscles:</Text>
              <Text style={styles.detailMetaValue}>
                {muscleGroups.join(", ")}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
};

// ----------------------------------------------------------------------------
// COOLDOWN ROW (stretching/mobility — ExerciseInstruction shape)
// ----------------------------------------------------------------------------

interface CooldownRowProps {
  name: string;
  duration?: number;
  instructions: string;
}

const CooldownRow: React.FC<CooldownRowProps> = ({ name, duration, instructions }) => (
  <View style={styles.cooldownRow}>
    <View style={styles.cooldownThumb}>
      <Ionicons name="walk-outline" size={rf(16)} color={colors.secondary.light} />
    </View>
    <View style={styles.cooldownInfo}>
      <Text style={styles.cooldownName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.cooldownInstr} numberOfLines={2}>
        {instructions}
      </Text>
    </View>
    {duration != null && duration > 0 && (
      <Text style={styles.cooldownDuration}>{duration}s</Text>
    )}
  </View>
);

// ----------------------------------------------------------------------------
// BOTTOM START BAR (sticky CTA)
// ----------------------------------------------------------------------------

interface BottomStartBarProps {
  starting: boolean;
  duration: number;
  calories: number;
  onStart: () => void;
  /** Bottom safe-area inset so the CTA clears the home indicator. */
  bottomInset?: number;
  testID?: string;
}

const BottomStartBar: React.FC<BottomStartBarProps> = ({
  starting,
  duration,
  calories,
  onStart,
  bottomInset = 0,
  testID,
}) => (
  <View
    style={[styles.bottomBar, { paddingBottom: bottomInset }]}
    pointerEvents="box-none"
  >
    <GlassCard
      blurIntensity="heavy"
      elevation={5}
      padding="md"
      borderRadius="xl"
      showBorder
      style={styles.bottomBarCard}
    >
      <View style={styles.bottomStatsRow}>
        <Text style={styles.bottomStatLabel}>Duration</Text>
        <Text style={styles.bottomStatValue}>
          {duration > 0 ? `${Math.round(duration)}m` : "—"}
        </Text>
        <View style={styles.bottomDivider} />
        <Text style={styles.bottomStatLabel}>Calories</Text>
        <Text style={styles.bottomStatValue}>
          {calories > 0 ? String(calories) : "—"}
        </Text>
      </View>
      <GlassButton
        label={starting ? "Starting…" : "Start Workout"}
        icon="play-circle-outline"
        onPress={onStart}
        variant="primary"
        loading={starting}
        disabled={starting}
        hapticType="heavy"
        fullWidth
        testID={`${testID}-btn`}
      />
    </GlassCard>
  </View>
);

// ----------------------------------------------------------------------------
// SMALL STAT SUB-COMPONENTS
// ----------------------------------------------------------------------------

const Stat: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.statCell}>
    <Ionicons name={icon} size={rf(16)} color={colors.text.secondary} />
    <Text style={styles.statValue} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Divider: React.FC = () => <View style={styles.statDivider} />;

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
  },
  headerStartBtn: {
    minHeight: 44,
    paddingVertical: rp(spacing.xs),
  },
  headerStartText: {
    fontSize: rf(typography.fontSize.caption),
  },
  // Hero card
  heroCard: {
    marginBottom: rp(spacing.sm),
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
  },
  heroDesc: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    marginTop: rp(spacing.xxs),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xs),
  },
  intensityChip: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(1),
  },
  intensityChipText: {
    color: colors.text.primary,
    fontSize: rf(9),
    fontWeight: fw(typography.fontWeight.bold),
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  // Stats bar
  statsCard: {
    marginBottom: rp(spacing.sm),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.xxs),
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: rp(2),
  },
  statValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  statDivider: {
    // Fixed 1px (was rw(1) — scales border with screen width).
    width: StyleSheet.hairlineWidth,
    height: rp(28),
    backgroundColor: colors.glass.border,
  },
  // Heatmap
  heatmapCard: {
    marginBottom: rp(spacing.sm),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    flex: 1,
  },
  // Collapsible sections
  sectionWrap: {
    marginBottom: rp(spacing.sm),
  },
  sectionContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  sectionIcon: {
    width: rw(22),
    height: rw(22),
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCount: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(1),
    minWidth: rw(20),
    alignItems: "center",
  },
  sectionCountText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.bold),
  },
  sectionBody: {
    paddingHorizontal: rp(spacing.md),
    paddingBottom: rp(spacing.md),
    paddingTop: rp(spacing.xs),
  },
  // Superset
  supersetWrap: {
    position: "relative",
    paddingLeft: rw(28),
  },
  // Detail exercise row
  detailRow: {
    marginBottom: rp(spacing.xs),
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  detailRowInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    gap: rp(spacing.xs),
    minHeight: rp(72),
  },
  supersetRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: rw(3),
    backgroundColor: colors.secondary.DEFAULT,
  },
  detailThumb: {
    width: rw(40),
    height: rw(40),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: {
    flex: 1,
    justifyContent: "center",
  },
  detailNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  detailName: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
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
    fontSize: rf(9),
    fontWeight: fw(typography.fontWeight.bold),
  },
  detailChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xxs),
  },
  muscleChip: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(1),
  },
  muscleChipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  detailMetaText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    flexShrink: 1,
  },
  detailSetsCell: {
    alignItems: "center",
    minWidth: rw(40),
  },
  detailSetsValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.bold),
  },
  detailSetsLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(1),
  },
  rpeCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  intensityDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: borderRadius.full,
  },
  rpeText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  restCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
  },
  restText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  detailExpanded: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    marginTop: rp(spacing.xs),
    gap: rp(spacing.xs),
  },
  detailNotes: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  detailMetaRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
  },
  detailMetaLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  detailMetaValue: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    flexShrink: 1,
  },
  // Cooldown row
  cooldownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    // Fixed 1px (was rw(1) — scales border with screen width).
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass.border,
  },
  cooldownThumb: {
    width: rw(32),
    height: rw(32),
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(0, 212, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cooldownInfo: {
    flex: 1,
  },
  cooldownName: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  cooldownInstr: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(2),
  },
  cooldownDuration: {
    color: colors.secondary.light,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.xxl),
    gap: rp(spacing.sm),
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    paddingHorizontal: rp(spacing.xl),
  },
  footerSpacer: {
    height: rp(120),
  },
  // Bottom start bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
    // Sticky footer z-index + elevation so it renders above scroll content.
    zIndex: 1100,
    elevation: 11,
  },
  bottomBarCard: {
    backgroundColor: colors.glass.backgroundDark,
  },
  bottomStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  bottomStatLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  bottomStatValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  bottomDivider: {
    // Fixed 1px (was rw(1) — scales border with screen width).
    width: StyleSheet.hairlineWidth,
    height: rp(16),
    backgroundColor: colors.glass.border,
  },
});

export default WorkoutDetailScreen;
