import { useState, useCallback, useMemo, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { DayWorkout } from '../types/ai';
import completionTrackingService from '../services/completionTracking';
import { calculateWorkoutCalories, ExerciseCalorieInput } from '../services/calorieCalculator';
import { useProfileStore } from '../stores/profileStore';
import { resolveCurrentWeightFromStores } from '../services/currentWeight';
import { useFitnessStore } from '../stores/fitnessStore';
import {
  computeExerciseGroups,
  getNextStep,
  type ExerciseGroupInfo,
  type RestMode,
  type NextStep,
} from '../utils/workoutGrouping';

export type ExercisePhase = 'preview' | 'performing' | 'logging' | 'resting';

interface ExerciseProgress {
  exerciseIndex: number;
  completedSets: boolean[];
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface WorkoutStats {
  totalDuration: number;
  exercisesCompleted: number;
  setsCompleted: number;
  caloriesBurned: number;
}

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

/**
 * Build an ExerciseProgress view derived from the store's
 * currentWorkoutSession.exercises[].sets[] (the SSOT for set data).
 *
 * The store is the single source of truth for set weight/reps/rpe/completed.
 * The hook's exerciseProgress is now a READ-ONLY projection of that state —
 * it no longer holds a parallel mutated copy.
 */
function deriveProgressFromStore(
  workout: DayWorkout,
  initialExerciseIndex: number,
  storeExercises: { sets: Array<{ completed: boolean }> }[] | undefined
): ExerciseProgress[] {
  return workout.exercises.map((exercise, index) => {
    const storeEx = storeExercises?.[index];
    const plannedSets = Math.max(1, safeNumber(exercise?.sets, 3));
    const storeSets = storeEx?.sets;
    const completedSets =
      storeSets && storeSets.length === plannedSets
        ? storeSets.map((s) => Boolean(s.completed))
        : new Array(plannedSets).fill(index < initialExerciseIndex);
    return {
      exerciseIndex: index,
      completedSets,
      isCompleted: completedSets.length > 0 && completedSets.every(Boolean),
    };
  });
}

export const useWorkoutSession = (
  workout: DayWorkout,
  sessionId?: string,
  initialExerciseIndex: number = 0
) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(initialExerciseIndex);

  // Subscribe to the store's currentWorkoutSession.exercises so set-completion
  // state stays in sync with the SSOT (set data is written there by SetLogModal
  // via updateSetData). We only read exercises[] here — never mutate.
  const storeExercises = useFitnessStore((s) => s.currentWorkoutSession?.exercises);

  // exerciseProgress is now a DERIVED view of the store sets. There is no
  // parallel mutated copy. When the user logs a set, SetLogModal.handleSave
  // writes weight/reps/rpe/completed into the store via updateSetData, and
  // this derivation recomputes automatically.
  const exerciseProgress = useMemo<ExerciseProgress[]>(
    () =>
      deriveProgressFromStore(
        workout,
        initialExerciseIndex,
        storeExercises as { sets: Array<{ completed: boolean }> }[] | undefined
      ),
    [workout, initialExerciseIndex, storeExercises]
  );

  // Phase state machine: preview → performing → logging → resting → performing…
  const [exercisePhase, setExercisePhase] = useState<ExercisePhase>('preview');
  // Which set (0-indexed) the user is currently on
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  const [workoutStartTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showNextExercisePreview, setShowNextExercisePreview] = useState(false);

  const nextExercisePreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Superset/circuit grouping (Workout Engine v2 Phase 4B.1) — contiguity-
  // based, same rule the builder itself uses (DayBlock.tsx). Recomputed only
  // when the exercise LIST changes, not on every set logged.
  const exerciseGroups = useMemo<ExerciseGroupInfo[]>(
    () => computeExerciseGroups(workout.exercises),
    [workout.exercises]
  );
  const currentGroup = exerciseGroups[currentExerciseIndex];

  // Set by advanceAfterLog, consumed by applyPendingStep on rest-timer
  // expiry — mirrors the existing split between "decide what happens next"
  // (at log time) and "actually move there" (at rest expiry) that
  // goToNextExercise/onRestComplete already established; group hops extend
  // that same split rather than replacing it.
  const pendingStepRef = useRef<NextStep | null>(null);

  const currentExercise = useMemo(() => {
    return workout.exercises[currentExerciseIndex] || {};
  }, [workout.exercises, currentExerciseIndex]);

  const currentProgress = useMemo(() => {
    return (
      exerciseProgress[currentExerciseIndex] || {
        completedSets: [],
        isCompleted: false,
      }
    );
  }, [exerciseProgress, currentExerciseIndex]);

  const totalExercises = useMemo(() => {
    return safeNumber(workout.exercises?.length, 0);
  }, [workout.exercises]);

  // Set-based progress: completed sets across ALL exercises / total sets
  // across ALL exercises. This makes the progress bar advance as each
  // individual set is logged, not only when an entire exercise is finished.
  const overallProgress = useMemo(() => {
    let completedSets = 0;
    let totalSets = 0;
    exerciseProgress.forEach((ep) => {
      const sets = ep?.completedSets?.length ?? 0;
      totalSets += sets;
      completedSets += ep?.completedSets?.filter(Boolean).length ?? 0;
    });
    return totalSets > 0 ? completedSets / totalSets : 0;
  }, [exerciseProgress]);

  // Subscribe reactively to user weight so calorie stats recompute when weight
  // changes mid-workout (P2-12 fix).
  const bodyAnalysisWeight = useProfileStore((s) => s.bodyAnalysis?.current_weight_kg);
  const resolvedWeight = useMemo(
    () =>
      resolveCurrentWeightFromStores({
        bodyAnalysisWeight,
      }).value,
    [bodyAnalysisWeight]
  );

  // Exercise-based stats — only recalculate when sets are completed, NOT every
  // timer tick. This prevents calories from jumping during rest periods.
  //
  // P0-4 fix: calorie calculation now reads ACTUAL logged reps/weight from the
  // store's currentWorkoutSession.exercises[].sets[] (the SSOT), not the plan.
  // When a set has been logged (completed=true, reps>0) we use those actuals;
  // otherwise the exercise contributes nothing until the user logs it.
  const exerciseStats = useMemo(() => {
    const exercisesCompleted = exerciseProgress.filter((ep) => ep?.isCompleted).length;
    const setsCompleted = exerciseProgress.reduce(
      (total, ep) => total + (ep?.completedSets?.filter(Boolean).length || 0),
      0
    );

    const completedInputs: ExerciseCalorieInput[] = [];
    exerciseProgress.forEach((ep, idx) => {
      const completedSetCount = ep?.completedSets?.filter(Boolean).length || 0;
      if (completedSetCount > 0) {
        const exercise = workout.exercises[idx];
        const storeEx = (
          storeExercises as
            | {
                exerciseId?: string;
                sets?: Array<{ reps?: number; weight?: number; completed?: boolean }>;
              }[]
            | undefined
        )?.[idx];
        if (exercise && storeEx) {
          // Read actual logged reps from the store's SSOT sets. Falls back to
          // plan reps only if a set is marked completed but has no logged reps
          // (e.g. time-based auto-logged with reps:0 — duration drives the calc
          // via exercise.duration which is passed through below).
          const actualSets = (storeEx.sets || [])
            .filter((s) => s?.completed)
            .slice(0, completedSetCount);
          const avgReps =
            actualSets.length > 0
              ? actualSets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / actualSets.length
              : 0;
          completedInputs.push({
            exerciseId: exercise.exerciseId,
            name:
              ((exercise as unknown as Record<string, unknown>).name as string) ||
              ((exercise as unknown as Record<string, unknown>).exerciseName as string),
            sets: completedSetCount,
            reps: avgReps > 0 ? avgReps : exercise.reps,
            duration: exercise.duration,
            restTime: exercise.restTime,
          });
        }
      }
    });

    let caloriesBurned = 0;
    if (completedInputs.length > 0 && resolvedWeight && resolvedWeight > 0) {
      // calculateWorkoutCalories honors per-exercise sets + reps; we pass the
      // ACTUAL completed set count and the average of actually-logged reps so
      // the MET calc reflects what the user did, not the plan.
      caloriesBurned = calculateWorkoutCalories(completedInputs, resolvedWeight).totalCalories;
    }

    return {
      exercisesCompleted: Math.max(0, exercisesCompleted),
      setsCompleted: Math.max(0, setsCompleted),
      caloriesBurned: Math.max(0, caloriesBurned),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseProgress, workout.exercises, storeExercises, resolvedWeight]);

  // Time-based stats — recalculate every second for the live duration display.
  const workoutStats = useMemo((): WorkoutStats => {
    const durationSeconds = Math.floor((currentTime.getTime() - workoutStartTime.getTime()) / 1000);
    return {
      totalDuration: Math.max(0, durationSeconds),
      ...exerciseStats,
    };
  }, [currentTime, workoutStartTime, exerciseStats]);

  // P2-13 fix: keep the ref in sync synchronously at render time (not via an
  // effect that runs after render). This guarantees handleSetComplete emits the
  // current stats, not the previous render's.
  const workoutStatsRef = useRef(workoutStats);
  workoutStatsRef.current = workoutStats;

  const nextExercise = useMemo(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      return workout.exercises[currentExerciseIndex + 1];
    }
    return null;
  }, [currentExerciseIndex, totalExercises, workout.exercises]);

  // BUG FIX: the rest-timer's "Next up" label previously always used
  // `nextExercise` above — the naive next ARRAY POSITION — even during an
  // intra_group/post_group rest (a hop WITHIN a superset/circuit, or a
  // round transition looping back to the group's first member). getNextStep
  // already computes the CORRECT target exercise index for every rest mode
  // (group.exerciseIndex + 1 for intra_group, group.groupStartIndex for
  // post_group, position+1 only for a true inter_exercise hop) — this is
  // that same target, resolved to the actual exercise, set by advanceAfterLog
  // alongside pendingStepRef so the screen's rest-timer preview always names
  // whichever exercise is truly about to start next, group-aware.
  const [restPreviewExercise, setRestPreviewExercise] = useState<
    DayWorkout['exercises'][number] | null
  >(null);

  // BUG FIX (found investigating the "Next up" issue above): WorkoutHeader's
  // "Exercise N of Total" used a SEPARATE ad-hoc `isInterExerciseRest ?
  // currentExerciseIndex + 2 : currentExerciseIndex + 1` in the screen —
  // `isInterExerciseRest` is `true` for ALL THREE resting rest modes
  // (inter_exercise, intra_group, post_group; see WorkoutSessionScreen's
  // handleSaveSetData), so that "+2" (meant only for "about to land on the
  // very next array position") also fired for intra_group (usually harmless,
  // group members ARE sequential) and post_group (WRONG — a round
  // transition can loop back to an EARLIER index, e.g. the group's first
  // member, not currentExerciseIndex+2). Exposing the resolved pending
  // index directly lets the header compute the correct 1-based number for
  // every rest mode the same way restPreviewExercise does for the name.
  const [pendingExerciseIndex, setPendingExerciseIndex] = useState<number | null>(null);

  // Internal: persists workout progress metadata (percent + calories) after a
  // set is logged. Set DATA itself (weight/reps/rpe) is written to the store
  // SSOT by SetLogModal.handleSave → updateSetData, NOT here. This function
  // only emits the progress event + writes workoutProgress metadata.
  const handleSetComplete = useCallback(
    async (
      setIndex: number,
      onMilestone?: (percentage: number) => void,
      onAllSetsCompleted?: () => Promise<void> | void
    ) => {
      try {
        if (Platform.OS !== 'web') {
          Vibration.vibrate(50);
        }

        // BUG FIX (found via live testing — "Set 4 of 3": every exercise
        // needed one extra phantom set to actually finish): `exerciseProgress`
        // is a `useMemo` derived from the store via a React-subscribed
        // selector, so it only reflects a write AFTER React re-renders this
        // hook with the new value. `updateSetData()` (SetLogModal.handleSave)
        // is a synchronous, IMPERATIVE `useFitnessStore.getState().updateSetData(...)`
        // call, and `handleSetComplete` runs synchronously right after it —
        // still inside the SAME event-handler tick, before React has re-run
        // this hook. So the closed-over `exerciseProgress` here was ALWAYS
        // one set stale: checking whether the set JUST written was already
        // complete BEFORE this call, which is never true for a fresh
        // completion. Read the store's CURRENT state directly via
        // `getState()` instead of the closure — imperative reads are never
        // stale, unlike a React-subscribed value read mid-tick.
        const freshStoreSets =
          useFitnessStore.getState().currentWorkoutSession?.exercises?.[currentExerciseIndex]?.sets;
        const ep = freshStoreSets
          ? {
              completedSets: freshStoreSets.map((s) => Boolean(s.completed)),
            }
          : exerciseProgress[currentExerciseIndex];
        if (!ep) return;

        const allSetsCompleted = ep.completedSets.every(Boolean);

        if (allSetsCompleted && onAllSetsCompleted) {
          await onAllSetsCompleted();
        }

        const completedExercises = exerciseProgress.filter((p) => p?.isCompleted).length;
        const progressPercentage =
          totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

        await completionTrackingService.updateWorkoutProgress(
          workout.id || 'unknown',
          progressPercentage,
          {
            sessionId: sessionId || 'unknown',
            exerciseIndex: currentExerciseIndex,
            setIndex,
            completedExercises,
            totalExercises,
            timestamp: new Date().toISOString(),
            stats: workoutStatsRef.current,
          }
        );

        if (onMilestone) {
          const completionPercentage = (completedExercises / totalExercises) * 100;
          if (completionPercentage === 50 || completionPercentage === 75) {
            onMilestone(completionPercentage);
          }
        }
      } catch (error) {
        console.error('Failed to update workout progress:', error);
      }
    },
    [exerciseProgress, currentExerciseIndex, sessionId, workout.id, totalExercises]
  );

  // Phase transition: preview → performing (user taps "Start Exercise")
  const startExercise = useCallback(() => {
    const progress = exerciseProgress[currentExerciseIndex];
    const firstIncomplete = progress ? progress.completedSets.findIndex((s) => !s) : 0;
    setCurrentSetIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
    setExercisePhase('performing');
  }, [exerciseProgress, currentExerciseIndex]);

  // Phase transition: performing → logging (user taps "Complete Set" in breathing card)
  const completeCurrentSet = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50); // Immediate tactile confirmation
    }
    setExercisePhase('logging');
  }, []);

  /**
   * Phase transition: performing → preview/resting (time-based exercises only).
   * Bypasses the "logging" phase entirely — screen auto-logs { reps:0, weight:0 }
   * and calls handleSaveSetData directly, skipping SetLogModal.
   */
  const completeTimeBasedSet = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 150, 50, 150]);
    }
    setExercisePhase('preview');
  }, []);

  // Phase transition: performing → preview (user cancels the breathing card)
  const cancelPerforming = useCallback(() => {
    setExercisePhase('preview');
  }, []);

  // Phase transition: logging → performing (user taps Back on SetLogModal to redo the set)
  const cancelLogging = useCallback(() => {
    setExercisePhase('performing');
  }, []);

  // Phase transition: logging → resting or exercise complete.
  // Called after user submits weight/reps. handleSetComplete is invoked here
  // so the screen's handleSetComplete wrapper (with achievement tracking) is used.
  //
  // Workout Engine v2 Phase 4B.1: this is now group-aware. It DECIDES the
  // rest mode and computes (but does not yet apply) where the session goes
  // next via getNextStep — the actual currentExerciseIndex/currentSetIndex
  // move happens in applyPendingStep, called by the screen once the rest
  // timer (of whatever duration THIS restMode implies) expires. This mirrors
  // the pre-4B.1 split between "decide" (here) and "move" (onRestComplete/
  // goToNextExercise) rather than collapsing it.
  //
  // `allSetsCompleted` here means "the exercise instance just logged has
  // exhausted its own sets for the CURRENT round" — for an ungrouped
  // exercise that's the same thing "all sets completed" always meant; inside
  // a group it's evaluated per-hop (one set of one member at a time).
  const advanceAfterLog = useCallback(
    (allSetsCompleted: boolean): RestMode => {
      const group: ExerciseGroupInfo =
        currentGroup ?? {
          exerciseIndex: currentExerciseIndex,
          groupType: 'none',
          groupId: null,
          groupStartIndex: currentExerciseIndex,
          groupEndIndex: currentExerciseIndex,
          isFirstInGroup: true,
          isLastInGroup: true,
          roundCount: 1,
        };
      const step = getNextStep(group, currentSetIndex, allSetsCompleted);
      pendingStepRef.current = step;
      // See restPreviewExercise's declaration for why this is resolved from
      // the group-aware step target rather than the naive next array index.
      setRestPreviewExercise(workout.exercises[step.nextExerciseIndex] ?? null);
      setPendingExerciseIndex(step.nextExerciseIndex);

      if (step.restMode === 'intra_set') {
        setExercisePhase('resting');
        return step.restMode;
      }

      // inter_exercise (normal exercise finish, or exiting a group entirely)
      // — same "preview + auto-dismissing banner" UX as before 4B.1.
      // intra_group / post_group don't show this banner — the point of a
      // superset/circuit is to keep moving without a "here's what's next"
      // interstitial on every hop.
      if (step.restMode === 'inter_exercise' && step.nextExerciseIndex < totalExercises) {
        // Clear any previously-scheduled dismiss before showing + scheduling
        // a new one, so back-to-back exercise completions don't leave a
        // stale timer racing to hide a banner for the WRONG exercise.
        if (nextExercisePreviewTimeoutRef.current) {
          clearTimeout(nextExercisePreviewTimeoutRef.current);
          nextExercisePreviewTimeoutRef.current = null;
        }
        setShowNextExercisePreview(true);
        // Auto-hide after 4s, which reads better than requiring a tap for a
        // purely informational banner.
        nextExercisePreviewTimeoutRef.current = setTimeout(() => {
          setShowNextExercisePreview(false);
          nextExercisePreviewTimeoutRef.current = null;
        }, 4000);
      }

      setExercisePhase(step.restMode === 'inter_exercise' ? 'preview' : 'resting');
      return step.restMode;
    },
    [currentGroup, currentExerciseIndex, currentSetIndex, totalExercises, workout.exercises]
  );

  /**
   * Applies the NextStep computed by the last advanceAfterLog call — called
   * once the rest timer for that step's restMode expires (or is skipped).
   * For inter_exercise this reproduces the exact pre-4B.1 goToNextExercise
   * semantics (land on 'preview' of the next exercise, tap to start).
   * For intra_group/post_group it goes straight to 'performing' on the
   * target exercise/round — no manual "Start Exercise" tap between group
   * members, which would defeat the point of grouping them.
   * Falls back to the plain onRestComplete (same-exercise, next set)
   * behavior if called with no pending step — defensive, should not happen
   * on the normal flow.
   */
  const applyPendingStep = useCallback(() => {
    const step = pendingStepRef.current;
    pendingStepRef.current = null;

    if (!step) {
      setCurrentSetIndex((prev) => prev + 1);
      setExercisePhase('performing');
      return;
    }

    if (step.restMode === 'inter_exercise') {
      if (step.nextExerciseIndex < totalExercises) {
        setCurrentExerciseIndex(step.nextExerciseIndex);
        setCurrentSetIndex(0);
        setShowNextExercisePreview(false);
        setExercisePhase('preview');
      }
      // else: workout is over — the screen's completeWorkout() handles this
      // path directly and never lets the rest timer fire for it.
      return;
    }

    // intra_group / post_group
    setCurrentExerciseIndex(step.nextExerciseIndex);
    setCurrentSetIndex(step.nextSetIndex);
    setExercisePhase('performing');
  }, [totalExercises]);

  // Phase transition: resting → performing (rest timer expired or skipped).
  // Kept for the plain "between sets of the SAME ungrouped exercise" path
  // and as applyPendingStep's own defensive fallback — NOT used for the
  // post-advanceAfterLog expiry path anymore, which now always goes through
  // applyPendingStep so group hops are handled correctly.
  const onRestComplete = useCallback(() => {
    setCurrentSetIndex((prev) => prev + 1);
    setExercisePhase('performing');
  }, []);

  const goToNextExercise = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      // User navigated manually before the auto-dismiss timer fired — clear
      // it so a stray setShowNextExercisePreview(false) doesn't fire later
      // for what is by then the NEXT exercise's own banner state.
      if (nextExercisePreviewTimeoutRef.current) {
        clearTimeout(nextExercisePreviewTimeoutRef.current);
        nextExercisePreviewTimeoutRef.current = null;
      }
      setCurrentExerciseIndex((prev) => prev + 1);
      setShowNextExercisePreview(false);
      setExercisePhase('preview');
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex, totalExercises]);

  const goToPreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setExercisePhase('preview');
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex]);

  return {
    currentExerciseIndex,
    exerciseProgress,
    exercisePhase,
    currentSetIndex,
    workoutStartTime,
    currentTime,
    showInstructionModal,
    showNextExercisePreview,
    currentExercise,
    currentProgress,
    totalExercises,
    overallProgress,
    workoutStats,
    nextExercise,
    restPreviewExercise,
    pendingExerciseIndex,
    setCurrentTime,
    setShowInstructionModal,
    handleSetComplete,
    startExercise,
    completeCurrentSet,
    completeTimeBasedSet,
    cancelPerforming,
    cancelLogging,
    advanceAfterLog,
    applyPendingStep,
    onRestComplete,
    goToNextExercise,
    goToPreviousExercise,
    nextExercisePreviewTimeoutRef,
    exerciseGroups,
    currentGroup,
  };
};

/**
 * Helper reserved for future per-exercise progress lookups. Currently the
 * calorie calc reads completed-set counts + avg reps directly from the store
 * SSOT, so no progress-map indexing is needed.
 */
// (intentionally empty — kept as a seam for future per-exercise breakdown)
