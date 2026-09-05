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
 *  - Flat header: transparent back circle + workout title + "Start" pill
 *  - Sticky progress indicator (ProgressRing) — shows completion % when a
 *    session is in-progress (workoutProgress[workout.id].progress)
 *  - Stats bar: volume, calories (MET calc), duration, difficulty
 *  - Muscle heatmap: compact horizontal chip dialer (HeatmapChips) — one chip
 *    per major body part, mini bar + set count, ~90px tall (was 220px bars).
 *  - Exercise carousel: horizontal paging dialer (ExerciseCarousel) — one
 *    full-width ExerciseCard per exercise, swipe left/right, section pills
 *    (Warm-up/Main/Supersets/Finisher/Cooldown) filter the dialer, dot
 *    indicator marks position. Replaces the old tall vertical list of
 *    CollapsibleSection + DetailExerciseRow stacks. Card tap opens
 *    ExerciseEditorSheet in builder context (onOpenEditor prop), else is
 *    read-only (detail already shown on card).
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
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import { ProgressRing } from '../../components/ui/aurora/ProgressRing';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { type BarData } from '../../components/ui/GradientBarChart';
import { BuilderAnalyticsPanel } from '../../components/fitness/builder/BuilderAnalyticsPanel';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useProfileStore } from '../../stores/profileStore';
import { calculateWorkoutCalories } from '../../services/calorieCalculator';
import { CURATED_EXERCISES } from '../../data/curatedExercises';
import { exerciseFilterService } from '../../services/exerciseFilterService';
import { haptics } from '../../utils/haptics';
import { colors, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../theme/fonts';
import { rp, rf, rw, rbr } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { titleCaseExerciseName } from '../../utils/textFormat';
import type { DayWorkout } from '../../types/ai';
import type { PlannedExercise } from '../../types/workout';

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

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
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'core',
] as const;

// ExerciseDB (exercisedb.dev API) target-muscle vocab → HEATMAP_GROUPS vocab.
// The live plan stores exerciseDatabase ids (e.g. "aXcUyKb"), not curated ids
// ("push_up"), so resolution must go through exerciseFilterService — the same
// source WorkoutSessionScreen uses — and its muscle names ("delts",
// "pectorals") mapped onto the heatmap's group names.
const DB_MUSCLE_TO_GROUP: Record<string, string> = {
  pectorals: 'chest',
  lats: 'back',
  'upper back': 'back',
  traps: 'back',
  rhomboids: 'back',
  spine: 'back',
  delts: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quadriceps',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  abs: 'core',
  'cardiovascular system': 'cardio',
};

interface ResolvedExerciseMeta {
  name: string | null;
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Section keys for the exercise carousel pills.
type SectionKey = 'warmup' | 'main' | 'superset' | 'finisher' | 'cooldown';

// Cooldown entries (ExerciseInstruction shape) — rendered in the carousel
// alongside PlannedExercise cards, so both share the dialer.
type CooldownItem = { name: string; duration?: number; instructions: string };

// Resolve display metadata for an exerciseId from the real exercise DB first
// (AI-plan ids), falling back to the curated list (legacy builder ids).
const resolveExerciseMeta = (exerciseId: string | undefined): ResolvedExerciseMeta => {
  const empty = { name: null, muscleGroups: [], equipment: [], difficulty: 'intermediate' as const };
  if (!exerciseId) return empty;

  const db = exerciseFilterService.getExerciseById(exerciseId);
  if (db) {
    const groups = new Set<string>();
    for (const muscle of [...db.targetMuscles, ...db.secondaryMuscles]) {
      const group = DB_MUSCLE_TO_GROUP[muscle.toLowerCase()];
      if (group && group !== 'cardio') groups.add(group);
    }
    return {
      name: titleCaseExerciseName(db.name),
      muscleGroups: [...groups],
      equipment: db.equipments,
      difficulty: db.difficulty,
    };
  }

  const curated = CURATED_EXERCISES.find((c) => c.id === exerciseId);
  if (curated) {
    return {
      name: curated.name,
      muscleGroups: curated.muscleGroups,
      equipment: curated.equipment,
      difficulty: curated.difficulty,
    };
  }

  return empty;
};

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
  const progress = useFitnessStore((s) => s.workoutProgress[workout.id]?.progress ?? 0);
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
      name: titleCaseExerciseName(
        ex.exerciseName ??
          ex.name ??
          resolveExerciseMeta(ex.exerciseId).name ??
          `Exercise ${idx + 1}`
      ),
      sets: Array.from({ length: ex.sets || 1 }, (_, i) => ({
        setNumber: i + 1,
        reps: ex.reps,
        weightKg: ex.weight,
        durationSeconds: ex.duration,
        setType: 'normal' as const,
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
      const meta = resolveExerciseMeta(p.exerciseId);
      const firstSet = p.sets[0];
      const reps = firstSet?.reps;
      const weight = firstSet?.weightKg ?? 0;
      // Volume = sum(sets × reps × weight)
      for (const set of p.sets) {
        const repCount =
          typeof set.reps === 'string' ? parseInt(set.reps, 10) || 10 : set.reps || 0;
        totalVolume += (set.weightKg ?? 0) * repCount;
        totalSets += 1;
      }
      // Muscle coverage
      for (const muscle of meta.muscleGroups) {
        muscleCounts[muscle] = (muscleCounts[muscle] ?? 0) + p.sets.length;
      }
      return {
        exerciseId: p.exerciseId,
        name: p.name,
        sets: p.sets.length,
        reps: reps ?? 8,
        weight,
        restTime: p.restSeconds,
        bodyParts: meta.muscleGroups,
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
    const maxSets = Math.max(1, ...HEATMAP_GROUPS.map((g) => stats.muscleCounts[g] ?? 0));
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
        unit: ' sets',
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
      const isWarmup = ex.sets.every((s) => s.setType === 'warmup');
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

  // ── Exercise carousel state ──
  // Sections surface as filter pills; the carousel dials through one section's
  // exercises one card at a time (horizontal paging). Collapses the old tall
  // vertical list of DetailExerciseRow + CollapsibleSection stacks into a
  // single dialer, killing the long-scroll problem.
  const sectionTabs = useMemo(() => {
    const tabs: {
      key: SectionKey;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      count: number;
      accent: string;
    }[] = [];
    if (sections.warmup.length)
      tabs.push({ key: 'warmup', label: 'Warm-up', icon: 'flame-outline', count: sections.warmup.length, accent: colors.warning.DEFAULT });
    if (sections.main.length)
      tabs.push({ key: 'main', label: 'Main', icon: 'barbell-outline', count: sections.main.length, accent: colors.primary.DEFAULT });
    if (sections.superset.length)
      tabs.push({ key: 'superset', label: 'Supersets', icon: 'git-merge-outline', count: sections.superset.length, accent: colors.secondary.DEFAULT });
    if (sections.finisher.length)
      tabs.push({ key: 'finisher', label: 'Finisher', icon: 'flash-outline', count: sections.finisher.length, accent: colors.error.DEFAULT });
    if (sections.cooldown.length)
      tabs.push({ key: 'cooldown', label: 'Cooldown', icon: 'walk-outline', count: sections.cooldown.length, accent: colors.secondary.light });
    return tabs;
  }, [sections]);

  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const effectiveSection: SectionKey = activeSection ?? sectionTabs[0]?.key ?? 'main';
  const activeExercises: PlannedExercise[] =
    effectiveSection === 'cooldown'
      ? []
      : sections[effectiveSection as Exclude<SectionKey, 'cooldown'>];
  const activeCount =
    effectiveSection === 'cooldown' ? sections.cooldown.length : activeExercises.length;

  const handleSelectSection = useCallback((k: SectionKey) => {
    haptics.selection();
    setActiveSection(k);
    setCarouselIndex(0);
  }, []);

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
      navigation.navigate('WorkoutSession', {
        workout,
        sessionId,
      });
    } catch (err) {
      console.error('[WorkoutDetailScreen] startWorkoutSession failed:', err);
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
    const diff = (workout.difficulty ?? 'intermediate').toLowerCase();
    if (diff === 'advanced') return 'Advanced';
    if (diff === 'beginner') return 'Beginner';
    return 'Intermediate';
  }, [workout.difficulty]);

  // AI plans rarely set intensityLevel; defaulting to 'rest' mislabels a real
  // Pull/Push/Legs day as a rest day. Derive: 0 exercises => rest, else moderate.
  const intensityLevel = (
    workout.intensityLevel ??
    (planned.length === 0 ? 'rest' : 'moderate')
  ).toLowerCase();
  const intensityColor =
    intensityLevel === 'intense' || intensityLevel === 'high'
      ? colors.primary.DEFAULT
      : intensityLevel === 'moderate' || intensityLevel === 'medium'
        ? colors.warning.DEFAULT
        : colors.text.tertiary;

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* ── Flat header — transparent back circle + plain title + gradient pill ── */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to previous screen"
            style={styles.backBtn}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
          >
            <Ionicons name="chevron-back" size={rf(26)} color={colors.text.primary} />
          </AnimatedPressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workout.title || 'Workout'}
          </Text>
          <AnimatedPressable
            onPress={handleStartWorkout}
            disabled={starting || planned.length === 0}
            accessibilityRole="button"
            accessibilityLabel={starting ? 'Starting workout' : 'Start workout'}
            testID={`${testID ?? 'workout-detail'}-start`}
            style={[styles.headerStartBtn, (starting || planned.length === 0) && styles.headerStartDisabled]}
            scaleValue={0.95}
            springConfig="snappy"
            hapticType="medium"
          >
            <LinearGradient
              colors={
                starting
                  ? [colors.primary.dark, colors.primary.dark]
                  : [colors.primary.DEFAULT, colors.primary.dark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerStartGradient}
            >
              <Ionicons name="play-circle-outline" size={rf(14)} color={colors.text.primary} />
              <Text style={styles.headerStartText} numberOfLines={1}>
                {starting ? 'Starting…' : 'Start'}
              </Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID={`${testID ?? 'workout-detail'}-scroll`}
        >
          {/* ── Sticky progress + title hero ── */}
          <Animated.View entering={FadeInUp.springify()} style={styles.heroCard}>
            <View style={styles.heroRow}>
                {/* Progress ring (sticky at top — shows % if in-progress) */}
                <ProgressRing
                  progress={progress}
                  size={rf(72)}
                  strokeWidth={6}
                  gradient
                  gradientColors={[
                    isCompleted ? colors.success.DEFAULT : colors.primary[400],
                    colors.secondary[500],
                  ]}
                  showText={inProgress || isCompleted}
                  text={isCompleted ? '✓' : inProgress ? `${Math.round(progress)}%` : ''}
                >
                  {!(inProgress || isCompleted) ? (
                    <Ionicons name="barbell-outline" size={rf(24)} color={colors.primary.DEFAULT} />
                  ) : null}
                </ProgressRing>

                <View style={styles.heroInfo}>
                  <Text
                    style={styles.heroTitle}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {workout.title || 'Custom Workout'}
                  </Text>
                  {!!workout.description && (
                    <Text style={styles.heroDesc} numberOfLines={3}>
                      {workout.description}
                    </Text>
                  )}
                  <View style={styles.heroMeta}>
                    <View style={[styles.intensityChip, { backgroundColor: intensityColor }]}>
                      <Text style={styles.intensityChipText}>
                        {intensityLevel === 'rest'
                          ? 'REST'
                          : intensityLevel === 'intense' || intensityLevel === 'high'
                            ? 'HIGH'
                            : intensityLevel === 'low'
                              ? 'LOW'
                              : 'MOD'}
                      </Text>
                    </View>
                    <Text style={styles.metaText}>
                      {planned.length} exercise
                      {planned.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
          </Animated.View>

          {/* ── Statistics bar ── */}
          <Animated.View entering={FadeInUp.springify().delay(80)} style={styles.statsCard}>
            <View style={styles.statsRow}>
                <Stat
                  icon="barbell-outline"
                  label="Volume"
                  value={stats.totalVolume > 0 ? `${Math.round(stats.totalVolume)}kg` : '—'}
                />
                <Divider />
                <Stat
                  icon="flame-outline"
                  // BUG FIX: this tile falls back to the plan's PRE-GENERATION
                  // estimate when the actual (MET-computed) calories aren't
                  // available yet, while the sticky bottom bar below only
                  // ever shows the actual value (never estimatedCalories —
                  // see BottomStartBar's `calories={stats.calories}`, no
                  // fallback). Both numbers are individually correct per
                  // CLAUDE.md #8/#9, but sitting side by side with the same
                  // generic "Calories" label they read as contradictory
                  // ("334" here vs "—" below). Label the estimate as an
                  // estimate so it's clear these are two different things.
                  label={stats.calories > 0 ? 'Calories' : 'Est. Calories'}
                  value={
                    stats.calories > 0
                      ? String(stats.calories)
                      : workout.estimatedCalories > 0
                        ? String(workout.estimatedCalories)
                        : '—'
                  }
                />
                <Divider />
                <Stat
                  icon="time-outline"
                  label="Duration"
                  value={stats.duration > 0 ? `${Math.round(stats.duration)}m` : '—'}
                />
                <Divider />
                <Stat
                  icon="trending-up-outline"
                  label="Difficulty"
                  value={difficultyLabel}
                  valueFontSize={11}
                />
              </View>
          </Animated.View>

          {/* ── Muscle heatmap (compact horizontal chips) ── */}
          {planned.length > 0 && (
            <Animated.View entering={FadeInUp.springify().delay(160)} style={styles.heatmapCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="body-outline" size={rf(16)} color={colors.primary.DEFAULT} />
                <Text style={styles.sectionTitle}>Muscle Heatmap</Text>
                <Text style={styles.heatmapTotal}>{stats.totalSets} sets</Text>
              </View>
              <HeatmapChips data={heatmapData} />
            </Animated.View>
          )}

          {/* ── Exercise carousel (horizontal dialer) ── */}
          {(planned.length > 0 || sections.cooldown.length > 0) && (
            <Animated.View entering={FadeInUp.springify().delay(240)} style={styles.carouselBlock}>
              <SectionPills
                tabs={sectionTabs}
                active={effectiveSection}
                onSelect={handleSelectSection}
              />
              <ExerciseCarousel
                key={effectiveSection}
                section={effectiveSection}
                exercises={activeExercises}
                cooldown={sections.cooldown}
                onOpenEditor={onOpenEditor}
                dayIndex={dayIndex}
                onIndexChange={setCarouselIndex}
              />
              <CarouselDots count={activeCount} index={carouselIndex} />
            </Animated.View>
          )}

          {/* ── Empty state ── */}
          {planned.length === 0 && sections.cooldown.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={rf(48)} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptyHint}>
                This workout has no planned exercises. Add some via the builder.
              </Text>
            </View>
          )}

          {/* ── Training analytics (Phase 11) ── */}
          {/* Historical trends (volume, heatmap, PRs, streak). Collapsible, with
              its own empty state when the user has no training history. */}
          <BuilderAnalyticsPanel testID={`${testID ?? 'workout-detail'}-analytics`} />

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
            testID={`${testID ?? 'workout-detail'}-bottom-start`}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

// ----------------------------------------------------------------------------
// SECTION PILLS (carousel filter tabs)
// ----------------------------------------------------------------------------

interface SectionTab {
  key: SectionKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  accent: string;
}

const SectionPills: React.FC<{
  tabs: SectionTab[];
  active: SectionKey;
  onSelect: (k: SectionKey) => void;
}> = ({ tabs, active, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.pillsContent}
    style={styles.pillsScroll}
  >
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <AnimatedPressable
          key={t.key}
          onPress={() => onSelect(t.key)}
          accessibilityRole="button"
          accessibilityLabel={`${t.label}. ${t.count} exercises. ${isActive ? 'Selected' : 'Select'}.`}
          style={[styles.pill, isActive && { backgroundColor: t.accent, borderColor: t.accent }]}
          scaleValue={0.95}
          springConfig="snappy"
          hapticType="selection"
        >
          <Ionicons name={t.icon} size={rf(13)} color={isActive ? colors.text.primary : t.accent} />
          <Text style={[styles.pillText, { color: isActive ? colors.text.primary : colors.text.secondary }]} numberOfLines={1}>
            {t.label}
          </Text>
          <View style={[styles.pillCount, isActive && styles.pillCountActive]}>
            <Text style={[styles.pillCountText, { color: isActive ? colors.text.primary : colors.text.tertiary }]}>
              {t.count}
            </Text>
          </View>
        </AnimatedPressable>
      );
    })}
  </ScrollView>
);

// ----------------------------------------------------------------------------
// EXERCISE CAROUSEL (horizontal paging dialer)
// ----------------------------------------------------------------------------

interface ExerciseCarouselProps {
  section: SectionKey;
  exercises: PlannedExercise[];
  cooldown: CooldownItem[];
  onOpenEditor?: (dayIndex: number, exerciseIndex: number) => void;
  dayIndex: number;
  onIndexChange: (i: number) => void;
}

const ExerciseCarousel: React.FC<ExerciseCarouselProps> = ({
  section,
  exercises,
  cooldown,
  onOpenEditor,
  dayIndex,
  onIndexChange,
}) => {
  const { width } = useWindowDimensions();
  const cardWidth = width;
  const isCooldown = section === 'cooldown';
  const data: (PlannedExercise | CooldownItem)[] = isCooldown ? cooldown : exercises;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
      onIndexChange(Math.max(0, Math.min(idx, data.length - 1)));
    },
    [cardWidth, data.length, onIndexChange],
  );

  return (
    <View style={styles.carouselWrap}>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item, i) =>
          isCooldown ? `cd_${i}` : `${(item as PlannedExercise).exerciseId}_${i}`
        }
        renderItem={({ item, index }) =>
          isCooldown ? (
            <CooldownCard item={item as CooldownItem} cardWidth={cardWidth} />
          ) : (
            <ExerciseCard
              exercise={item as PlannedExercise}
              index={index}
              cardWidth={cardWidth}
              onOpenEditor={onOpenEditor}
              dayIndex={dayIndex}
            />
          )
        }
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        style={styles.carousel}
      />
    </View>
  );
};

// ----------------------------------------------------------------------------
// EXERCISE CARD (one full-width dialer page)
// ----------------------------------------------------------------------------

const ExerciseCard: React.FC<{
  exercise: PlannedExercise;
  index: number;
  cardWidth: number;
  onOpenEditor?: (dayIndex: number, exerciseIndex: number) => void;
  dayIndex: number;
}> = ({ exercise, index, cardWidth, onOpenEditor, dayIndex }) => {
  const meta = resolveExerciseMeta(exercise.exerciseId);
  const muscleGroups = meta.muscleGroups;
  const equipment = meta.equipment;
  const difficulty = meta.difficulty;

  const setCount = exercise.sets.length;
  const firstReps = exercise.sets[0]?.reps;
  const repsLabel =
    typeof firstReps === 'string' ? firstReps : firstReps != null ? String(firstReps) : '—';

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
    if (onOpenEditor) onOpenEditor(dayIndex, index);
  }, [onOpenEditor, dayIndex, index]);

  return (
    <AnimatedPressable
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}. ${setCount} sets of ${repsLabel}. ${
        exercise.targetRpe != null ? `RPE ${exercise.targetRpe}.` : ''
      } Tap ${onOpenEditor ? 'to edit' : 'for details'}.`}
      style={[styles.exCard, { width: cardWidth }]}
      scaleValue={0.99}
      springConfig="snappy"
      hapticType="light"
    >
      {/* Header: thumb + name + meta line */}
      <View style={styles.exHeader}>
        <LinearGradient
          colors={[colors.primary.DEFAULT, colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.exThumb}
        >
          <Ionicons name="barbell-outline" size={rf(22)} color={colors.text.primary} />
        </LinearGradient>
        <View style={styles.exHeaderInfo}>
          <Text style={styles.exName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {exercise.name}
          </Text>
          <Text style={styles.exSub} numberOfLines={1}>
            {[...muscleGroups.slice(0, 3).map((m) => m.charAt(0).toUpperCase() + m.slice(1)), equipment[0], difficulty]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      {/* Big sets×reps + RPE + rest */}
      <View style={styles.exStatRow}>
        <View style={styles.exSetsBlock}>
          <Text style={styles.exSetsValue}>
            {setCount}
            <Text style={styles.exSetsX}> × </Text>
            {repsLabel}
          </Text>
          <Text style={styles.exSetsLabel}>sets × reps</Text>
        </View>
        {exercise.targetRpe != null && (
          <View style={styles.exPill}>
            <View style={[styles.exDot, { backgroundColor: intensityColor }]} />
            <Text style={styles.exPillText}>RPE {exercise.targetRpe}</Text>
          </View>
        )}
        <View style={styles.exPill}>
          <Ionicons name="timer-outline" size={rf(13)} color={colors.text.tertiary} />
          <Text style={styles.exPillText}>{exercise.restSeconds ?? 60}s rest</Text>
        </View>
      </View>

      {/* Per-set breakdown chips */}
      {setCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.exSetsChips}
          style={styles.exSetsChipsScroll}
        >
          {exercise.sets.map((s, i) => (
            <View key={i} style={styles.exSetChip}>
              <Text style={styles.exSetChipNum}>{i + 1}</Text>
              <Text style={styles.exSetChipText}>
                {s.reps}
                {s.weightKg ? ` @ ${s.weightKg}kg` : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Notes + tempo */}
      {!!exercise.notes && (
        <View style={styles.exNotes}>
          <Ionicons name="document-text-outline" size={rf(12)} color={colors.text.tertiary} />
          <Text style={styles.exNotesText} numberOfLines={3}>
            {exercise.notes}
          </Text>
        </View>
      )}
      {exercise.tempo && (
        <View style={styles.exNotes}>
          <Ionicons name="speedometer-outline" size={rf(12)} color={colors.text.tertiary} />
          <Text style={styles.exNotesText}>Tempo: {exercise.tempo}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

// ----------------------------------------------------------------------------
// COOLDOWN CARD (one dialer page)
// ----------------------------------------------------------------------------

const CooldownCard: React.FC<{ item: CooldownItem; cardWidth: number }> = ({ item, cardWidth }) => (
  <View style={[styles.exCard, { width: cardWidth }]}>
    <View style={styles.exHeader}>
      <View style={styles.exCooldownThumb}>
        <Ionicons name="walk-outline" size={rf(22)} color={colors.secondary.light} />
      </View>
      <View style={styles.exHeaderInfo}>
        <Text style={styles.exName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.exSub}>{item.duration ? `${item.duration}s` : 'Mobility'}</Text>
      </View>
    </View>
    <View style={styles.exNotes}>
      <Ionicons name="document-text-outline" size={rf(12)} color={colors.text.tertiary} />
      <Text style={styles.exNotesText}>{item.instructions}</Text>
    </View>
  </View>
);

// ----------------------------------------------------------------------------
// HEATMAP CHIPS (compact horizontal dialer of muscle groups)
// ----------------------------------------------------------------------------

const HeatmapChips: React.FC<{ data: BarData[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.heatScroll}
      style={styles.heatScrollWrap}
    >
      {data.map((d) => {
        const pct = d.value / max;
        const color =
          d.value === 0
            ? hexToRgba(colors.text.primary, 0.15)
            : pct < 0.4
              ? colors.warning.DEFAULT
              : colors.primary.DEFAULT;
        return (
          <View key={d.label} style={styles.heatChip}>
            <Text style={styles.heatLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.heatBar}>
              <LinearGradient
                colors={[color, hexToRgba(color, 0.3)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.heatBarFill, { width: `${Math.max(pct * 100, d.value > 0 ? 10 : 0)}%` }]}
              />
            </View>
            <Text style={styles.heatCount}>
              {d.value}
              <Text style={styles.heatUnit}> sets</Text>
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

// ----------------------------------------------------------------------------
// CAROUSEL DOTS (position indicator within active section)
// ----------------------------------------------------------------------------

const CarouselDots: React.FC<{ count: number; index: number }> = ({ count, index }) => {
  if (count <= 1) return null;
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      ))}
    </View>
  );
};

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
  <View style={[styles.bottomBar, { paddingBottom: bottomInset }]} pointerEvents="box-none">
    <View style={styles.bottomStatsRow}>
      <Text style={styles.bottomStatLabel}>Duration</Text>
      <Text style={styles.bottomStatValue}>
        {duration > 0 ? `${Math.round(duration)}m` : '—'}
      </Text>
      <View style={styles.bottomDivider} />
      <Text style={styles.bottomStatLabel}>Calories</Text>
      <Text style={styles.bottomStatValue}>{calories > 0 ? String(calories) : '—'}</Text>
    </View>
    <AnimatedPressable
      onPress={onStart}
      disabled={starting}
      accessibilityRole="button"
      accessibilityLabel={starting ? 'Starting workout' : 'Start workout'}
      testID={`${testID}-btn`}
      style={[styles.bottomCta, starting && styles.bottomCtaDisabled]}
      scaleValue={0.97}
      springConfig="snappy"
      hapticType="heavy"
    >
      <LinearGradient
        colors={
          starting
            ? [colors.primary.dark, colors.primary.dark]
            : [colors.primary.DEFAULT, colors.primary.dark]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomCtaGradient}
      >
        <Ionicons name="play-circle-outline" size={rf(20)} color={colors.text.primary} />
        <Text style={styles.bottomCtaText} numberOfLines={1}>
          {starting ? 'Starting…' : 'Start Workout'}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  </View>
);

// ----------------------------------------------------------------------------
// SMALL STAT SUB-COMPONENTS
// ----------------------------------------------------------------------------

const Stat: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Override the value's font size — for a tile whose value can be a long
   * word ("Intermediate") that a shared size would clip. Optional; the 3
   * numeric/short-string tiles (Volume/Calories/Duration) don't need it. */
  valueFontSize?: number;
}> = ({ icon, label, value, valueFontSize }) => (
  <View style={styles.statCell}>
    <Ionicons name={icon} size={rf(16)} color={colors.text.secondary} />
    {/* BUG FIX: "Intermediate" (the longest value the Difficulty tile can
        show) clipped to "Intermedi..." at normal viewport width — all 4
        tiles share equal flex width but this is the only one whose value is
        a long single word. Tried adjustsFontSizeToFit/minimumFontScale
        first, but React Native Web does not implement it (no visible
        effect, confirmed via a live before/after screenshot) — this is a
        web app, so an explicit smaller fontSize (passed only for the
        Difficulty tile, via `valueFontSize`) is the fix that actually
        works, cross-platform, rather than relying on a native-only prop. */}
    <Text
      style={[styles.statValue, valueFontSize ? { fontSize: rf(valueFontSize) } : null]}
      numberOfLines={1}
    >
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
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
  },
  // Flat header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    minHeight: rf(52),
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hexToRgba(colors.text.primary, 0.08),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontFamily: FONT_FAMILY.bold,    marginHorizontal: rp(spacing.xs),
  },
  headerStartBtn: {
    borderRadius: rbr(16),
    overflow: 'hidden',
    minHeight: 44,
  },
  headerStartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xxs),
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    minHeight: 44,
  },
  headerStartText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontFamily: FONT_FAMILY.bold,  },
  headerStartDisabled: {
    opacity: 0.6,
  },
  // Hero card
  heroCard: {
    marginBottom: rp(spacing.sm),
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontFamily: FONT_FAMILY.bold,  },
  heroDesc: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    marginTop: rp(spacing.xxs),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: rf(11),  },
  metaText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  // Stats bar
  statsCard: {
    marginBottom: rp(spacing.sm),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rp(spacing.xxs),
    paddingVertical: rp(spacing.sm),
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: rp(2),
  },
  statValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  statDivider: {
    // Fixed 1px (was rw(1) — scales border with screen width).
    width: StyleSheet.hairlineWidth,
    height: rp(28),
    backgroundColor: hexToRgba(colors.text.primary, 0.06),
  },
  // Heatmap
  heatmapCard: {
    marginBottom: rp(spacing.lg),
  },
  heatmapTotal: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.semibold,  },
  heatScrollWrap: {
    marginHorizontal: rp(-spacing.lg),
  },
  heatScroll: {
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.xs),
    gap: rp(spacing.sm),
  },
  heatChip: {
    width: rw(96),
    backgroundColor: hexToRgba(colors.text.primary, 0.04),
    borderRadius: rbr(14),
    padding: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  heatLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.semibold,    textTransform: 'capitalize',
  },
  heatBar: {
    height: rp(6),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.text.primary, 0.08),
    overflow: 'hidden',
  },
  heatBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  heatCount: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontFamily: FONT_FAMILY.bold,  },
  heatUnit: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.regular,  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  sectionTitle: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  // Carousel block
  carouselBlock: {
    marginBottom: rp(spacing.lg),
  },
  // Section pills
  pillsScroll: {
    marginHorizontal: rp(-spacing.lg),
    marginBottom: rp(spacing.sm),
  },
  pillsContent: {
    paddingHorizontal: rp(spacing.lg),
    gap: rp(spacing.xs),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    borderRadius: rbr(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hexToRgba(colors.text.primary, 0.1),
    backgroundColor: hexToRgba(colors.text.primary, 0.04),
    minHeight: 40,
  },
  pillText: {
    fontSize: rf(typography.fontSize.caption),
    fontFamily: FONT_FAMILY.semibold,  },
  pillCount: {
    minWidth: rw(20),
    alignItems: 'center',
    paddingHorizontal: rp(spacing.xxs),
    paddingVertical: rp(1),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.text.primary, 0.08),
  },
  pillCountActive: {
    backgroundColor: hexToRgba(colors.text.primary, 0.22),
  },
  pillCountText: {
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.bold,  },
  // Carousel
  carouselWrap: {
    marginHorizontal: rp(-spacing.lg),
  },
  carousel: {
    minHeight: rp(260),
  },
  // Exercise card
  exCard: {
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.md),
    gap: rp(spacing.md),
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.md),
  },
  exThumb: {
    width: rw(48),
    height: rw(48),
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exCooldownThumb: {
    width: rw(48),
    height: rw(48),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.secondary.DEFAULT, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  exHeaderInfo: {
    flex: 1,
    gap: rp(spacing.xxs),
  },
  exName: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontFamily: FONT_FAMILY.bold,    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.tight,
  },
  exSub: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    textTransform: 'capitalize',
  },
  exStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.sm),
    flexWrap: 'wrap',
  },
  exSetsBlock: {
    flexDirection: 'column',
    gap: rp(2),
    marginRight: 'auto',
  },
  exSetsValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontFamily: FONT_FAMILY.extrabold,  },
  exSetsX: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.body),
    fontFamily: FONT_FAMILY.bold,  },
  exSetsLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xxs),
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.sm),
    borderRadius: rbr(12),
    backgroundColor: hexToRgba(colors.text.primary, 0.06),
    minHeight: 32,
  },
  exDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: borderRadius.full,
  },
  exPillText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.semibold,  },
  // Per-set chips
  exSetsChipsScroll: {
    marginHorizontal: rp(-spacing.lg),
  },
  exSetsChips: {
    paddingHorizontal: rp(spacing.lg),
    gap: rp(spacing.xs),
  },
  exSetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    borderRadius: rbr(10),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.16),
  },
  exSetChipNum: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.bold,  },
  exSetChipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontFamily: FONT_FAMILY.semibold,  },
  // Notes + tempo rows
  exNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xs),
  },
  exNotesText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  // Carousel dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
    marginTop: rp(spacing.sm),
  },
  dot: {
    width: rw(6),
    height: rw(6),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.text.primary, 0.16),
  },
  dotActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: rw(18),
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rp(spacing.xxl),
    gap: rp(spacing.sm),
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),  },
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: 'center',
    paddingHorizontal: rp(spacing.xl),
  },
  footerSpacer: {
    height: rp(120),
  },
  // Bottom start bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.sm),
    backgroundColor: colors.background.DEFAULT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hexToRgba(colors.text.primary, 0.06),
    // Sticky footer z-index + elevation so it renders above scroll content.
    zIndex: 1100,
    elevation: 11,
  },
  bottomCta: {
    width: '100%',
    borderRadius: rbr(16),
    overflow: 'hidden',
    minHeight: 52,
  },
  bottomCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.md),
    minHeight: 52,
  },
  bottomCtaText: {
    color: colors.text.primary,
    fontSize: rf(15),  },
  bottomCtaDisabled: {
    opacity: 0.7,
  },
  bottomStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  bottomStatLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  bottomStatValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),  },
  bottomDivider: {
    // Fixed 1px (was rw(1) — scales border with screen width).
    width: StyleSheet.hairlineWidth,
    height: rp(16),
    backgroundColor: hexToRgba(colors.text.primary, 0.06),
  },
});

export default WorkoutDetailScreen;
