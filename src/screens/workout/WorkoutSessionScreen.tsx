import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, BackHandler, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AuroraBackground, AnimatedPressable, GlassButton } from '../../components/ui/aurora';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { rp, rf, rw } from '../../utils/responsive';
import { DayWorkout } from '../../types/ai';
import { ExerciseGifPlayer } from '../../components/fitness/ExerciseGifPlayer';
import { ExerciseInstructionModal } from '../../components/fitness/ExerciseInstructionModal';
import { ExerciseSessionModal } from '../../components/fitness/ExerciseSessionModal';
import completionTrackingService from '../../services/completionTracking';
import { completeExtraWorkout } from '../../services/extraWorkoutService';
// NOTE: analyticsHelpers.trackWorkoutCompleted was REMOVED from this screen
// (P0 double-count fix). Workout calories are written ONCE — by
// completionTrackingService.completeWorkout → analyticsDataService.updateTodaysMetrics
// (Supabase analytics_metrics table, the canonical SSOT per architecture doc
// P1-8 / P0-1). The previous in-memory analyticsHelpers call duplicated that
// write and could double/triple-count on re-fired realtime events.
import { useFitnessStore } from '../../stores/fitnessStore';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { exerciseFilterService } from '../../services/exerciseFilterService';
import { getCurrentUserId } from '../../services/authUtils';
import { supabase } from '../../services/supabase';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { useWorkoutAchievements } from '../../hooks/useWorkoutAchievements';
import { useWorkoutAnimations } from '../../hooks/useWorkoutAnimations';
import { WorkoutHeader } from '../../components/workout/WorkoutHeader';
import { WorkoutProgressBar } from '../../components/workout/WorkoutProgressBar';
import { SetLogModal, SetLogData } from '../../components/workout/SetLogModal';
import { RestTimer } from '../../features/workouts/components/RestTimer';
import { DeloadModal } from '../../features/workouts/components/DeloadModal';
import { parseTimedExercise } from '../../utils/exerciseDuration';
import { startTimer } from '../../services/restTimerService';
import { titleCaseExerciseName } from '../../utils/textFormat';
import {
  checkReactiveDeload,
  RecentSessionForDeload,
  DeloadSuggestion,
} from '../../services/deloadService';
import { exerciseHistoryService } from '../../services/exerciseHistoryService';
import { AchievementNotifications } from '../../components/workout/AchievementNotifications';
import { WorkoutErrorState } from '../../components/workout/WorkoutErrorState';
import { NextExercisePreview } from '../../components/workout/NextExercisePreview';
import { useProfileStore } from '../../stores/profileStore';
import {
  showWorkoutCompleteErrorAlert,
  showWorkoutPartialSuccessAlert,
  showExitWorkoutAlert,
} from './workoutAlerts';
import { WorkoutCompleteDialog } from '../../components/ui/CustomDialog';
import { getCalibrationStatus, CalibrationStatus } from '../../services/calibrationService';
import { generateWarmupSets, classifyExercise, WarmupSet } from '../../services/warmupService';
import { totalVolume } from '../../utils/volumeCalculator';

// P1 type-hole fix: the navigation object handed to this screen is the custom
// plain-JS navigation defined in MainNavigation.tsx (NOT React Navigation's
// typed stack prop), so there is no generated RootStackParamList to import.
// To remove the `as never` cast on the ExerciseHistory navigate call we
// declare the real params shape here and tighten navigate's signature to
// accept a typed union of the screens this screen actually navigates to.
// Other screens navigate to are simple tab switches (no params) — those still
// pass through the `screen: string` overload.
interface ExerciseHistoryParams {
  exerciseId: string;
  exerciseName: string;
}

interface WorkoutSessionScreenProps {
  route: {
    params: {
      workout: DayWorkout;
      sessionId?: string;
      resumeExerciseIndex?: number;
      isExtra?: boolean;
    };
  };
  navigation: {
    // Accept either a bare screen name (tab switches like "Progress") or a
    // screen + params object. Keeping `screen: string` (rather than a literal
    // union) preserves the runtime contract with MainNavigation's switch.
    navigate: (screen: string, params?: Record<string, unknown> | ExerciseHistoryParams) => void;
    goBack: () => void;
  };
}

const safeString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { workout, sessionId, resumeExerciseIndex, isExtra } = route.params;
  const insets = useSafeAreaInsets();

  const parsedResumeIndex = safeNumber(resumeExerciseIndex, 0);
  const session = useWorkoutSession(
    (workout ?? { exercises: [] }) as DayWorkout,
    sessionId,
    parsedResumeIndex
  );
  const achievements = useWorkoutAchievements();
  const animations = useWorkoutAnimations();

  const [completeDialog, setCompleteDialog] = useState<{
    visible: boolean;
    durationMins: number;
    calories: number;
    exercisesCompleted: number;
    setsCompleted: number;
    onViewProgress: () => void;
    onDone: (rating?: number, notes?: string) => void;
  } | null>(null);

  // Guard against double-tap on "Finish Workout" creating two Supabase rows (Bug 1)
  const isCompletingRef = useRef(false);
  // Mirrors isCompletingRef in real state so the Finish Workout button can show
  // a visible loading/disabled state — mutating a ref alone doesn't re-render,
  // so the button previously gave zero feedback during the multi-step async
  // completion chain (Supabase write, achievements, deload history fetches).
  const [isCompleting, setIsCompleting] = useState(false);
  // Stores the Supabase-generated row ID returned by completeExtraWorkout (Bug 3)
  const supabaseSessionIdRef = useRef<string | null>(null);
  // P1 race fix: tracks whether the workout row was already persisted to
  // Supabase (workout_sessions insert/update) before a later step threw. If a
  // post-persist step (achievements, deload check, analytics) fails, we must
  // NOT re-enable the Finish button — a re-tap would re-insert the session
  // (completionTracking/extraWorkoutService only dedup by sessionId match,
  // which the insert-then-update fallback bypasses). Instead we surface a
  // partial-success alert telling the user the workout was saved.
  const workoutPersistedRef = useRef(false);

  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  // Total duration of the current rest period — for RestTimer progress bar
  const [restTotalDuration, setRestTotalDuration] = useState<number>(60);
  // When true, rest timer completion advances to next exercise (not next set)
  const [isInterExerciseRest, setIsInterExerciseRest] = useState(false);
  const [deloadSuggestion, setDeloadSuggestion] = useState<DeloadSuggestion | null>(null);

  // Calibration state: keyed by exerciseId
  const [calibrationMap, setCalibrationMap] = useState<Record<string, CalibrationStatus>>({});
  // Warm-up sets for current exercise
  const [warmupSets, setWarmupSets] = useState<WarmupSet[]>([]);
  // P2-15 fix: warmup-done is now tracked PER EXERCISE (keyed by exerciseId)
  // so navigating back/forward preserves each exercise's completed warmup
  // sets. Previously the whole map was wiped on every exercise change.
  const [warmupDoneByExercise, setWarmupDoneByExercise] = useState<
    Record<string, Record<number, boolean>>
  >({});
  const currentExerciseIdForWarmup = session.currentExercise?.exerciseId ?? '';
  // Per-current-exercise view used by the render (keeps the render simple).
  const warmupDoneMap = warmupDoneByExercise[currentExerciseIdForWarmup] ?? {};

  const userId = getCurrentUserId() || undefined;
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);
  const userUnits: 'kg' | 'lbs' = personalInfo?.units === 'imperial' ? 'lbs' : 'kg';
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  // Gate the weight-unavailable warning behind a one-shot ref so it fires at
  // most once per session. Moved out of the render body (was a console.warn in
  // a render body, which is disallowed by CLAUDE.md in production paths).
  const weightWarnedRef = useRef(false);
  useEffect(() => {
    if (!bodyAnalysis?.current_weight_kg && !weightWarnedRef.current) {
      weightWarnedRef.current = true;
      console.warn('[WorkoutSession] User weight unavailable — calorie calculation will return 0');
    }
  }, [bodyAnalysis?.current_weight_kg]);
  const userWeightKg = bodyAnalysis?.current_weight_kg || 0;
  const experienceLevel: 'beginner' | 'intermediate' | 'advanced' =
    workoutPreferences?.intensity ?? 'beginner';

  // ── Live session volume + mesocycle week (for the header) ─────────────────
  // SSOT: currentWorkoutSession.exercises[].sets[] (CompletedSet uses `weight`
  // in kg + `reps`). Derived here, not duplicated in the store.
  const mesocycleWeek = useFitnessStore((s) => s.getMesocycleWeek());
  // Subscribe reactively to the exercises array so the volume recomputes when
  // sets are added/updated. Previously this used getState() in the dependency
  // array — which is NOT reactive, so the memo never recomputed and VOL stayed
  // at 0 even after sets were logged.
  const storeExercises = useFitnessStore((s) => s.currentWorkoutSession?.exercises);
  const sessionVolume = useMemo(() => {
    const exercises = storeExercises ?? [];
    return exercises.reduce((sum, ex) => {
      const sets = (ex.sets ?? [])
        .filter((s) => s?.weight != null && s?.reps != null)
        .map((s) => ({ weightKg: s.weight!, reps: s.reps! }));
      return sum + totalVolume(sets);
    }, 0);
  }, [storeExercises]);

  const getExerciseName = useCallback((exerciseId: string): string => {
    if (!exerciseId) return 'Exercise';
    const exercise = exerciseFilterService.getExerciseById(exerciseId);
    if (exercise?.name) return titleCaseExerciseName(exercise.name);
    return titleCaseExerciseName(safeString(exerciseId, 'Exercise').replace(/_/g, ' '));
  }, []);

  // NOTE: the live elapsed-time display used to tick `session.setCurrentTime`
  // here every 1000ms. That state lives inside useWorkoutSession — the hook
  // backing this whole screen — so every tick re-rendered the entire screen
  // tree (WorkoutHeader, WorkoutProgressBar, ExerciseGifPlayer,
  // ExerciseSessionModal, SetLogModal, AchievementNotifications, none of
  // which were memoized). WorkoutHeader now owns its own ticking display
  // (WorkoutElapsedTime, mirroring RestTimer's self-contained countdown)
  // driven off the stable `session.workoutStartTime`, so no interval needs to
  // run at this level anymore.

  // Load calibration status for each exercise when the plan changes.
  // P2-14 fix: deps now include workout.exercises so a plan reload re-fetches
  // calibration for the new exercise set, and a cancelled flag prevents
  // setState after unmount (or after a stale plan replaces this one).
  useEffect(() => {
    if (!userId || !workout?.exercises) return;
    let cancelled = false;
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId) continue;
      getCalibrationStatus(exercise.exerciseId, userId, userWeightKg, experienceLevel)
        .then((status) => {
          if (cancelled) return;
          setCalibrationMap((prev) => ({
            ...prev,
            [exercise.exerciseId!]: status,
          }));
        })
        .catch(() => {
          /* non-blocking — defaults to no calibration */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [userId, workout?.exercises]);

  // Load warm-up sets whenever exercise changes.
  // P2-15: do NOT reset the warmup-done map here — it is now keyed by exerciseId
  // and persists across navigation. Each exercise retains its own done-state.
  useEffect(() => {
    if (!userId || !session.currentExercise?.exerciseId) {
      setWarmupSets([]);
      return;
    }
    const exId = session.currentExercise.exerciseId;
    const kind = classifyExercise(exId);
    if (kind === 'bodyweight' || kind === 'time_based') {
      setWarmupSets([]);
      return;
    }
    exerciseHistoryService
      .getBestEstimated1RM(exId, userId)
      .then((e1rm) => {
        setWarmupSets(generateWarmupSets(e1rm, kind));
      })
      .catch(() => setWarmupSets([]));
  }, [session.currentExerciseIndex, userId]);

  useEffect(() => {
    return () => {
      if (session.nextExercisePreviewTimeoutRef.current) {
        clearTimeout(session.nextExercisePreviewTimeoutRef.current);
      }
    };
  }, []);

  // Called after user submits weight/reps in SetLogModal
  const handleSaveSetData = useCallback(
    async (setIndex: number, _setData: SetLogData) => {
      let wasAllSetsCompleted = false;

      await session.handleSetComplete(
        setIndex,
        async (percentage) => {
          await achievements.trackMilestone(
            percentage,
            workout.category || 'General',
            session.workoutStats.exercisesCompleted,
            session.totalExercises,
            Math.round((new Date().getTime() - session.workoutStartTime.getTime()) / 60000)
          );
        },
        async () => {
          wasAllSetsCompleted = true;
          await achievements.trackExerciseCompletion(
            session.currentExercise.name || session.currentExercise.exerciseName || 'Exercise',
            workout.category || 'General',
            session.currentProgress.completedSets.length,
            session.currentExerciseIndex,
            session.totalExercises
          );
        }
      );

      // Per-set achievement tracking
      if (!wasAllSetsCompleted) {
        const totalSets = session.currentProgress.completedSets.length;
        await achievements.trackSetCompletion(
          session.currentExercise.name || session.currentExercise.exerciseName || 'Exercise',
          setIndex + 1,
          totalSets,
          workout.category || 'General'
        );
      }

      // Advance the phase state machine
      session.advanceAfterLog(wasAllSetsCompleted);

      if (wasAllSetsCompleted) {
        // Between exercises: longer rest (1.5x normal, min 60s)
        if (session.currentExerciseIndex < session.totalExercises - 1) {
          const restSecs = Math.max(
            60,
            Math.round(safeNumber(session.currentExercise.restTime, 60) * 1.5)
          );
          setIsInterExerciseRest(true);
          setRestTotalDuration(restSecs);
          setRestTimerEndTime(startTimer(restSecs));
        } else {
          // Last exercise — go straight to workout complete
          completeWorkout();
        }
      } else {
        // Between sets: normal rest timer
        const restSecs = safeNumber(session.currentExercise.restTime, 60);
        setIsInterExerciseRest(false);
        setRestTotalDuration(restSecs);
        if (restSecs > 0) {
          setRestTimerEndTime(startTimer(restSecs));
        } else {
          // No rest defined — go straight to next set
          session.onRestComplete();
        }
      }
    },
    [session, achievements, workout.category]
  );

  /**
   * Called when a time-based set completes (no logging UI shown).
   * Auto-logs a zero-data record so history still knows the exercise was done.
   */
  const handleTimeBasedSetComplete = useCallback(async () => {
    const autoData: SetLogData = {
      weightKg: 0,
      reps: 0,
      setType: 'normal',
      completed: true,
      rpe: 2, // neutral RPE for auto-logged time-based sets
      isCalibration: false,
    };
    await handleSaveSetData(session.currentSetIndex, autoData);
  }, [handleSaveSetData, session.currentSetIndex]);

  // Stable prop for ExerciseGifPlayer (React.memo'd) — session.setShowInstructionModal
  // is the raw useState setter returned by useWorkoutSession, itself always
  // stable, so this callback never changes identity.
  const handleShowInstructions = useCallback(() => {
    session.setShowInstructionModal(true);
  }, [session.setShowInstructionModal]);

  // Stable prop for ExerciseSessionModal (React.memo'd) when the current
  // exercise is time-based: auto-logs the set and advances the phase.
  const handleTimeBasedComplete = useCallback(() => {
    session.completeTimeBasedSet();
    handleTimeBasedSetComplete();
  }, [session.completeTimeBasedSet, handleTimeBasedSetComplete]);

  const handleRestTimerExpire = useCallback(() => {
    setRestTimerEndTime(null);
    setIsInterExerciseRest((prevIsInter) => {
      if (prevIsInter) {
        animations.animateTransition(() => {
          session.goToNextExercise();
        });
      } else {
        session.onRestComplete();
      }
      return false;
    });
  }, [session, animations]);

  const completeWorkout = useCallback(async () => {
    // Bug 1: prevent double-tap from creating two Supabase rows
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    setIsCompleting(true);
    // Declared outside the try block so the catch block below can also
    // surface an accurate elapsed duration in its alert (session.workoutStats
    // is a display-only projection recomputed on other state changes — it is
    // no longer ticked live every second, see the removed per-second effect
    // above — so it can lag the true elapsed time by the time an error path
    // reads it here).
    let elapsedSeconds = 0;
    try {
      elapsedSeconds = Math.floor(
        (new Date().getTime() - session.workoutStartTime.getTime()) / 1000
      );
      // Pull actual logged set data (weight, reps) from store.
      // currentWorkoutSession.exercises is updated by updateSetData() each time
      // the user submits a set in SetLogModal — this is the authoritative source.
      const loggedExercises = useFitnessStore.getState().currentWorkoutSession?.exercises ?? [];
      const finalStats = {
        ...session.workoutStats,
        totalDuration: elapsedSeconds,
        exercises: loggedExercises, // real weight/reps → _writeExerciseSets
      };
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

      let success: boolean;
      if (isExtra === true || String(isExtra) === 'true') {
        const extraResult = await completeExtraWorkout(
          workout,
          {
            sessionId: sessionId || 'unknown',
            duration: durationMinutes,
            startedAt: session.workoutStartTime.toISOString(),
            stats: finalStats,
          },
          getCurrentUserId() || undefined
        );
        // Bug 3: store server-generated row ID for rating/notes update
        supabaseSessionIdRef.current = extraResult;
        success = extraResult !== null;
      } else {
        success = await completionTrackingService.completeWorkout(
          workout.id || 'unknown',
          {
            sessionId: sessionId || 'unknown',
            duration: durationMinutes,
            exercisesCompleted: finalStats.exercisesCompleted,
            totalExercises: session.totalExercises,
            completedAt: new Date().toISOString(),
            stats: finalStats,
          },
          getCurrentUserId() || undefined
        );
      }

      // P1 race fix: record that the workout_sessions row was persisted so
      // that if a LATER step (achievements, deload check, rating dialog) throws,
      // the catch block can surface a partial-success message instead of
      // re-enabling Finish (which would risk a duplicate insert on re-tap).
      if (success) {
        workoutPersistedRef.current = true;
      }

      if (success) {
        await achievements.trackWorkoutCompletion(
          workout.category || 'General',
          durationMinutes,
          finalStats.caloriesBurned,
          finalStats.exercisesCompleted,
          finalStats.setsCompleted,
          session.totalExercises,
          workout.title
        );

        // P0 double-count fix: analytics for workout calories are written by
        // completionTrackingService.completeWorkout (the Supabase SSOT path via
        // analyticsDataService.updateTodaysMetrics). Do NOT also call
        // analyticsHelpers.trackWorkoutCompleted here — that re-accumulated
        // calories into the in-memory metricsHistory and double-counted.
        // For extra workouts, completeExtraWorkout runs the same Supabase write.

        if (userId) {
          for (const ex of workout.exercises) {
            if (!ex.exerciseId) continue;
            try {
              const history = await exerciseHistoryService.getHistory(ex.exerciseId, userId, 30);
              const recentSessions: RecentSessionForDeload[] = history.map((h) => ({
                sets: (h.sets || []).map((s) => ({
                  reps: s.reps ?? 0,
                  weight: s.weightKg ?? 0,
                  completed: true,
                })),
                repRange: [
                  typeof ex.reps === 'number' ? ex.reps : parseInt(String(ex.reps), 10) || 8,
                  typeof ex.reps === 'number' ? ex.reps : parseInt(String(ex.reps), 10) || 12,
                ] as [number, number],
              }));
              const mesocycleWeek = useFitnessStore.getState().getMesocycleWeek();
              const suggestion = checkReactiveDeload(
                ex.exerciseId,
                recentSessions,
                mesocycleWeek ?? undefined
              );
              if (suggestion) {
                setDeloadSuggestion(suggestion);
                break;
              }
            } catch (err) {
              console.error('[WorkoutSession] deload check failed:', err);
            }
          }
        }

        setCompleteDialog({
          visible: true,
          durationMins: durationMinutes,
          calories: finalStats.caloriesBurned,
          exercisesCompleted: finalStats.exercisesCompleted,
          setsCompleted: finalStats.setsCompleted,
          onViewProgress: () => {
            setCompleteDialog(null);
            navigation.navigate('Progress');
          },
          onDone: async (rating?: number, notes?: string) => {
            // H24: Save user-provided rating and notes to the workout session
            // Bug 3: for extra workouts use the server-generated row ID, not the local UUID
            const rowId =
              isExtra === true || String(isExtra) === 'true'
                ? supabaseSessionIdRef.current
                : sessionId;
            if ((rating || notes) && rowId) {
              try {
                const userId = getCurrentUserId();
                if (userId) {
                  const updatePayload: Record<string, unknown> = {};
                  if (rating) updatePayload.rating = rating;
                  if (notes) updatePayload.notes = notes;
                  await supabase
                    .from('workout_sessions')
                    .update(updatePayload)
                    .eq('id', rowId)
                    .eq('user_id', userId);
                }
              } catch (err) {
                console.error('[WorkoutSession] Failed to save rating/notes:', err);
              }
            }
            setCompleteDialog(null);
            isCompletingRef.current = false;
            setIsCompleting(false);
            navigation.goBack();
          },
        });
      } else {
        throw new Error('Failed to save workout completion');
      }
    } catch (error) {
      // CLAUDE.md: no emoji in console; keep error log (not a debug log).
      console.error('[WorkoutSession] Error completing workout:', error);
      // P1 race fix: do NOT reset isCompletingRef here. If the workout was
      // already persisted (workoutPersistedRef === true), re-enabling Finish
      // would let the user re-tap and re-insert into workout_sessions — the
      // completion services only dedup by sessionId match, and the
      // insert-then-update fallback bypasses that. Keep the button disabled
      // and surface the actual state via crossPlatformAlert:
      //   - persisted + later step failed → "Workout saved, but stats may not have updated"
      //   - not persisted → "Workout could not be saved", allow a retry by
      //     resetting the guard only in this not-yet-persisted case.
      const statsForAlert = { ...session.workoutStats, totalDuration: elapsedSeconds };
      if (workoutPersistedRef.current) {
        showWorkoutPartialSuccessAlert(workout, statsForAlert, () => navigation.goBack());
      } else {
        // Nothing was persisted yet — safe to let the user retry.
        isCompletingRef.current = false;
        setIsCompleting(false);
        showWorkoutCompleteErrorAlert(workout, statsForAlert, () => navigation.goBack());
      }
    }
  }, [workout, sessionId, isExtra, session, achievements, navigation]);

  const goToNextExercise = useCallback(() => {
    // Always clear the rest timer before navigating — prevents ghost onExpire
    setRestTimerEndTime(null);
    setIsInterExerciseRest(false);
    if (session.currentExerciseIndex < session.totalExercises - 1) {
      animations.animateTransition(() => {
        session.goToNextExercise();
      });
    } else {
      completeWorkout();
    }
  }, [session, animations, completeWorkout]);

  const goToPreviousExercise = useCallback(() => {
    // Clear any running rest timer before going back
    setRestTimerEndTime(null);
    setIsInterExerciseRest(false);
    if (session.currentExerciseIndex > 0) {
      animations.animateTransition(() => {
        session.goToPreviousExercise();
      });
    }
  }, [session, animations]);

  const exitWorkout = useCallback(async () => {
    const hasProgress =
      session.workoutStats.exercisesCompleted > 0 || session.workoutStats.setsCompleted > 0;

    const saveProgress = async () => {
      try {
        const totalSets = session.exerciseProgress.reduce(
          (sum, ep) => sum + (ep?.completedSets?.length || 0),
          0
        );
        const completedSets = session.workoutStats.setsCompleted;
        const progressPercentage =
          totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

        const savedPrior =
          useFitnessStore.getState().getWorkoutProgress(workout.id || 'unknown')?.progress ?? 0;
        const progressToSave = Math.max(progressPercentage, savedPrior);

        const loggedExercisesOnExit =
          useFitnessStore.getState().currentWorkoutSession?.exercises ?? [];

        const firstIncompleteIdx = session.exerciseProgress.findIndex((ep) => !ep.isCompleted);
        const resumeAt =
          firstIncompleteIdx !== -1 ? firstIncompleteIdx : session.currentExerciseIndex;

        // P0-1 + P3-19: persist logged sets to exercise_sets + record partial
        // exit state (exitedAt, partial flags) on the workout_sessions row.
        // currentWorkoutSession is intentionally LEFT INTACT in the store so
        // that on resume the hook's derived exerciseProgress restores the
        // actual logged weight/reps/rpe from the SSOT
        // (currentWorkoutSession.exercises[].sets[]).
        //
        // NOTE: session.workoutStats.totalDuration is included via the spread
        // below but savePartialExit's stats type only reads caloriesBurned +
        // exercises — totalDuration is intentionally never persisted on
        // partial exit (see completionTracking.ts: "total_duration_minutes is
        // intentionally NOT set here"). useWorkoutSession now computes
        // totalDuration from Date.now() each time it recomputes (on set /
        // exercise progress changes), so it's accurate as of the last workout
        // event rather than frozen — but since it isn't read here anyway,
        // this is belt-and-suspenders, not load-bearing.
        await completionTrackingService.savePartialExit(workout.id || 'unknown', {
          sessionId: sessionId || 'unknown',
          userId,
          progress: progressToSave,
          exerciseIndex: resumeAt,
          exitedAt: new Date().toISOString(),
          stats: {
            ...session.workoutStats,
            exercises: loggedExercisesOnExit,
          },
        });

        if (isExtra === true || String(isExtra) === 'true') {
          const storeState = useFitnessStore.getState() as {
            updateActiveExtraProgress?: (index: number) => void;
          };
          if (typeof storeState.updateActiveExtraProgress === 'function') {
            storeState.updateActiveExtraProgress(session.currentExerciseIndex);
          }
        }
        // NOTE: currentWorkoutSession is NOT nulled here. It is cleared only
        // when the workout fully completes (via completionTrackingService) or
        // when the user explicitly discards. Keeping it enables accurate resume
        // of actual logged set values.
      } catch (error) {
        console.error('[WorkoutSession] Failed to save progress:', error);
      }
      navigation.goBack();
    };

    showExitWorkoutAlert(
      hasProgress,
      session.workoutStats.exercisesCompleted,
      session.totalExercises,
      session.workoutStats.setsCompleted,
      saveProgress,
      saveProgress
    );
  }, [session, workout.id, sessionId, navigation]);

  // Android hardware back button — show exit dialog instead of default nav
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      exitWorkout();
      return true; // prevent default back
    });
    return () => backHandler.remove();
  }, [exitWorkout]);

  // Guard returns — after all hooks
  if (!workout) {
    return <WorkoutErrorState errorType="no-data" onGoBack={() => navigation.goBack()} />;
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    return <WorkoutErrorState errorType="no-exercises" onGoBack={() => navigation.goBack()} />;
  }

  const exerciseName = titleCaseExerciseName(
    session.currentExercise.name || getExerciseName(session.currentExercise.exerciseId)
  );

  const totalSets = safeNumber(session.currentExercise.sets, 3);
  const completedSetsCount = session.currentProgress.completedSets.filter(Boolean).length;
  // True while the Finish Workout CTA's async completion chain (Supabase
  // write, achievements, deload history fetches) is in flight — drives the
  // button's visible loading/disabled state so a tap always gives feedback.
  const isFinishingWorkout =
    session.currentProgress.isCompleted &&
    session.currentExerciseIndex >= session.totalExercises - 1 &&
    isCompleting;

  // Hero subline — target muscle · sets × reps · rest. Derived (not stored):
  // plan exerciseData first, then the exercise database, then workout category.
  const targetMuscle = (() => {
    const fromPlan = session.currentExercise.exerciseData?.targetMuscles?.[0];
    if (fromPlan) return titleCaseExerciseName(fromPlan);
    const info = session.currentExercise.exerciseId
      ? exerciseFilterService.getExerciseById(session.currentExercise.exerciseId)
      : undefined;
    const target = info?.targetMuscles?.[0] ?? info?.bodyParts?.[0];
    return target ? titleCaseExerciseName(target) : '';
  })();
  const repsDisplay = safeString(session.currentExercise.reps, '');
  const restSecs = safeNumber(session.currentExercise.restTime, 0);
  const exerciseSubline = [
    targetMuscle || safeString(workout.category, ''),
    `${totalSets} sets × ${repsDisplay}`,
    restSecs > 0 ? `${restSecs}s rest` : '',
  ]
    .filter(Boolean)
    .join('  •  ');

  // Is the current exercise time-based? Used to skip SetLogModal.
  const isTimeBased = parseTimedExercise(session.currentExercise.reps ?? '').isTimeBased;
  // Sets currently "in progress" index (0-based)
  const activeSetIndex =
    session.exercisePhase === 'logging' || session.exercisePhase === 'resting'
      ? session.currentSetIndex
      : session.currentSetIndex;

  // Reanimated animated style for the exercise container (migrated from legacy
  // Animated.Value — fadeAnim/scaleAnim are now SharedValue<number>).
  const exerciseContainerStyle = useAnimatedStyle(() => ({
    opacity: animations.fadeAnim.value,
    transform: [{ scale: animations.scaleAnim.value }],
  }));

  return (
    <AuroraBackground theme="space">
      {/* edges={['bottom']} — top inset is handled by WorkoutHeader's paddingTop
        (passing insets.top) so its glass surface extends under the status bar.
        Using edges={['top']} here would double-pad the top. */}
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <WorkoutHeader
          workoutTitle={workout.title}
          currentExercise={
            // During inter-exercise rest the CURRENT exercise is complete;
            // show the next exercise number so the header matches context.
            isInterExerciseRest
              ? session.currentExerciseIndex + 2
              : session.currentExerciseIndex + 1
          }
          totalExercises={session.totalExercises}
          workoutStartTime={session.workoutStartTime}
          calories={session.workoutStats.caloriesBurned}
          onExit={exitWorkout}
          paddingTop={Math.max(insets.top, 12)}
          sessionVolume={sessionVolume}
          userUnits={userUnits}
          mesocycleWeek={mesocycleWeek}
        />

        <WorkoutProgressBar progress={session.overallProgress} fadeAnim={animations.fadeAnim} />

        {/* Next exercise preview banner */}
        {session.showNextExercisePreview && session.nextExercise && (
          <NextExercisePreview
            exerciseName={safeString(
              session.nextExercise.name || getExerciseName(session.nextExercise.exerciseId),
              'Next Exercise'
            )}
          />
        )}

        {/* Main scroll content — hero exercise surface */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.exerciseContainer, exerciseContainerStyle]}>
            {/* HERO — big exercise name. GAP-05: tappable → ExerciseHistoryScreen */}
            <AnimatedPressable
              onPress={() =>
                navigation.navigate('ExerciseHistory', {
                  exerciseId: session.currentExercise.exerciseId ?? '',
                  exerciseName,
                })
              }
              style={styles.heroNameRow}
              testID="exercise-name-history-tap"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel={`${exerciseName}. View exercise history.`}
            >
              <Text
                style={styles.heroName}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {exerciseName}
              </Text>
              <View style={styles.heroHistoryRow}>
                <Text style={styles.heroHistoryHint} numberOfLines={1}>
                  History
                </Text>
                <Ionicons name="chevron-forward" size={rf(12)} color={colors.text.tertiary} />
              </View>
            </AnimatedPressable>

            {/* Muted subline — target muscle · sets × reps · rest */}
            <Text style={styles.heroSubline} numberOfLines={1}>
              {exerciseSubline}
            </Text>

            {/* P2-13: During the performing phase the ExerciseSessionModal overlay
              covers this area. Rendering the GIF player at opacity:0 still
              lays out its info chips (with inverted bounds) and pollutes the
              a11y tree with hidden, unmeasurable nodes. Conditionally render
              null during performing instead — cleaner than hiding, and the
              instructions entry point is available again in the next
              preview/resting phase. */}
            {session.exercisePhase !== 'performing' && (
              <ExerciseGifPlayer
                key={session.currentExerciseIndex}
                exerciseId={safeString(session.currentExercise.exerciseId, '')}
                exerciseName={safeString(session.currentExercise.name, '')}
                height={rp(240)}
                width={rp(300)}
                showTitle={false}
                showInstructions={true}
                onInstructionsPress={handleShowInstructions}
                style={styles.exerciseGifPlayer}
              />
            )}

            {/* Warm-up sets — flat typographic section (no card chrome) */}
            {session.exercisePhase === 'preview' && warmupSets.length > 0 && !restTimerEndTime && (
              <View style={styles.warmupContainer}>
                <Text style={styles.sectionEyebrow} numberOfLines={1}>
                  WARM-UP (AUTO-GENERATED)
                </Text>
                {warmupSets.map((ws, idx) => (
                  <View key={idx} style={styles.warmupRow}>
                    <View style={styles.warmupInfo}>
                      <Text
                        style={styles.warmupWeight}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {userUnits === 'lbs'
                          ? `${(ws.weightKg * 2.2046).toFixed(1)} lbs`
                          : `${ws.weightKg} kg`}{' '}
                        × {ws.targetReps} reps
                      </Text>
                      <Text style={styles.warmupPercent} numberOfLines={1}>
                        {ws.percentLabel}
                      </Text>
                    </View>
                    <AnimatedPressable
                      style={[
                        styles.warmupDoneBtn,
                        warmupDoneMap[idx] && styles.warmupDoneBtnActive,
                      ]}
                      onPress={() =>
                        setWarmupDoneByExercise((prev) => ({
                          ...prev,
                          [currentExerciseIdForWarmup]: {
                            ...(prev[currentExerciseIdForWarmup] ?? {}),
                            [idx]: !(prev[currentExerciseIdForWarmup]?.[idx] ?? false),
                          },
                        }))
                      }
                      scaleValue={0.94}
                      springConfig="snappy"
                      hapticType="selection"
                      accessibilityRole="button"
                      accessibilityLabel={`Mark warm-up set ${idx + 1} ${warmupDoneMap[idx] ? 'as not done' : 'as done'}`}
                    >
                      {warmupDoneMap[idx] ? (
                        <Ionicons name="checkmark" size={rf(14)} color={colors.success.light} />
                      ) : (
                        <Text style={styles.warmupDoneText} numberOfLines={1}>
                          Done
                        </Text>
                      )}
                    </AnimatedPressable>
                  </View>
                ))}
                <View style={styles.warmupDivider} />
                <Text style={styles.sectionEyebrow} numberOfLines={1}>
                  WORKING SETS
                </Text>
              </View>
            )}

            {/* Set indicator — huge numerals + dots. Hidden during rest.
              Dots represent SETS within this exercise (not exercises). */}
            {session.exercisePhase === 'preview' && totalSets > 1 && !restTimerEndTime && (
              <View style={styles.setIndicatorContainer}>
                <Text style={styles.sectionEyebrow} numberOfLines={1}>
                  SET
                </Text>
                <Text
                  style={styles.setIndicatorValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {session.currentProgress.isCompleted
                    ? totalSets
                    : Math.min(completedSetsCount + 1, totalSets)}
                  <Text style={styles.setIndicatorTotal}> / {totalSets}</Text>
                </Text>
                <View style={styles.setDotsRow}>
                  {Array.from({ length: totalSets }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.setDot, i < completedSetsCount && styles.setDotCompleted]}
                    />
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* ── Bottom thumb-zone: one dominant gradient CTA + secondary text action ── */}
        {session.exercisePhase === 'preview' && (
          <View style={styles.footer}>
            <GlassButton
              label={
                session.currentProgress.isCompleted
                  ? session.currentExerciseIndex < session.totalExercises - 1
                    ? 'Next Exercise'
                    : 'Finish Workout'
                  : completedSetsCount > 0
                    ? // Current-set info already shows in the giant numeral +
                      // set dots above — keep the CTA to a single action word.
                      'Continue'
                    : 'Start Exercise'
              }
              onPress={
                session.currentProgress.isCompleted ? goToNextExercise : session.startExercise
              }
              disabled={isFinishingWorkout}
              loading={isFinishingWorkout}
              variant={session.currentProgress.isCompleted ? 'success' : 'primary'}
              fullWidth
              icon={
                session.currentProgress.isCompleted
                  ? session.currentExerciseIndex < session.totalExercises - 1
                    ? 'arrow-forward'
                    : 'checkmark-circle'
                  : 'play'
              }
              style={styles.startButton}
            />
            {session.currentExerciseIndex > 0 && (
              <AnimatedPressable
                style={styles.prevExButton}
                onPress={goToPreviousExercise}
                hapticType="light"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Previous exercise"
              >
                <Ionicons name="chevron-back" size={rf(16)} color={colors.text.tertiary} />
                <Text style={styles.prevExText}>Previous</Text>
              </AnimatedPressable>
            )}
          </View>
        )}

        {/* ── Modals / Overlays ── */}

        {/* PERFORMING phase: Breathing card */}
        <ExerciseSessionModal
          isVisible={session.exercisePhase === 'performing'}
          onComplete={
            isTimeBased
              ? // Time-based: tap Complete Set → auto-log + skip SetLogModal
                handleTimeBasedComplete
              : session.completeCurrentSet
          }
          onCancel={session.cancelPerforming}
          exerciseId={safeString(session.currentExercise.exerciseId, '')}
          exerciseName={safeString(exerciseName, 'Current Exercise')}
          reps={safeString(session.currentExercise.reps, '')}
          currentSet={session.currentSetIndex + 1}
          totalSets={totalSets}
        />

        {/* LOGGING phase: Data input — hidden for time-based exercises */}
        {!isTimeBased &&
          (() => {
            const exId = safeString(session.currentExercise.exerciseId, '');
            const cali = calibrationMap[exId];
            return (
              <SetLogModal
                isVisible={session.exercisePhase === 'logging'}
                exerciseId={exId}
                exerciseName={safeString(exerciseName, 'Exercise')}
                reps={session.currentExercise.reps ?? 0}
                setIndex={activeSetIndex}
                totalSets={totalSets}
                userId={userId}
                userUnits={userUnits}
                calibrationMode={cali?.needsCalibration ?? false}
                calibrationStartKg={cali?.estimatedStartKg ?? 0}
                calibrationNote={cali?.referenceNote ?? ''}
                onSave={(data) => handleSaveSetData(activeSetIndex, data)}
                onCancel={session.cancelLogging}
                onPRDetected={(name) => achievements.showAchievementMiniToast(`New PR! ${name}`)}
              />
            );
          })()}

        {/* RESTING phase: Rest timer */}
        <RestTimer
          targetEndTime={restTimerEndTime}
          onExpire={handleRestTimerExpire}
          onSkip={handleRestTimerExpire}
          isInterExercise={isInterExerciseRest}
          exerciseName={exerciseName}
          nextExerciseName={
            session.nextExercise
              ? safeString(
                  session.nextExercise.name || getExerciseName(session.nextExercise.exerciseId),
                  'Next Exercise'
                )
              : undefined
          }
          currentSet={!isInterExerciseRest ? completedSetsCount : undefined}
          totalSets={!isInterExerciseRest ? totalSets : undefined}
          totalDuration={restTotalDuration}
          onSetPreset={(secs) => {
            // Restart the rest timer with the chosen preset duration.
            setRestTotalDuration(secs);
            setRestTimerEndTime(startTimer(secs));
          }}
        />

        {/* Instructions modal (accessible from preview via GIF player) */}
        <ExerciseInstructionModal
          isVisible={session.showInstructionModal}
          onClose={() => session.setShowInstructionModal(false)}
          exerciseId={safeString(session.currentExercise.exerciseId, '')}
          exerciseName={exerciseName}
        />

        <AchievementNotifications
          showCelebration={achievements.showCelebration}
          celebrationAchievement={achievements.celebrationAchievement}
          onCloseCelebration={achievements.hideCelebration}
          showAchievementToast={achievements.showAchievementToast}
          toastAchievement={achievements.toastAchievement}
          achievementToastAnim={achievements.achievementToastAnim}
          showMiniToast={achievements.showMiniToast}
          miniToastText={achievements.miniToastText}
          miniToastAnim={achievements.miniToastAnim}
        />

        {completeDialog && (
          <WorkoutCompleteDialog
            visible={completeDialog.visible}
            workoutTitle={safeString(workout.title, 'Workout')}
            duration={completeDialog.durationMins}
            calories={completeDialog.calories}
            exercisesCompleted={completeDialog.exercisesCompleted}
            totalExercises={session.totalExercises}
            onViewProgress={completeDialog.onViewProgress}
            onDone={completeDialog.onDone}
          />
        )}

        {deloadSuggestion && (
          <DeloadModal
            visible={!!deloadSuggestion}
            variant={deloadSuggestion.type}
            message={deloadSuggestion.reason}
            exerciseName={deloadSuggestion.exerciseId}
            onAccept={() => setDeloadSuggestion(null)}
            onDismiss={() => setDeloadSuggestion(null)}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  exerciseContainer: {
    marginTop: spacing.md,
    alignItems: 'stretch',
  },
  exerciseGifPlayer: {
    marginBottom: spacing.lg,
    alignSelf: 'center',
    elevation: 4,
  },
  // ── HERO: big exercise name + muted subline ──────────────────────────────
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    // Enforce 44px minimum touch target for the history tap affordance.
    minHeight: Math.max(rp(44), 44),
  },
  heroName: {
    flex: 1,
    fontSize: rf(30),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text.primary,
    letterSpacing: -0.3,
    lineHeight: rf(36),
  },
  heroHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(2),
    paddingTop: rp(10),
    paddingLeft: spacing.sm,
  },
  heroHistoryHint: {
    fontSize: rf(11),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroSubline: {
    fontSize: rf(13),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.medium) as any,
    letterSpacing: 0.2,
    marginTop: rp(spacing.xs),
    marginBottom: spacing.lg,
  },
  // ── Typographic section header (shared by warm-up + set indicator) ──────
  sectionEyebrow: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: rp(spacing.sm),
  },
  // ── Warm-up: flat rows with hairline separators ─────────────────────────
  warmupContainer: {
    alignSelf: 'stretch',
    marginBottom: spacing.md,
  },
  warmupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rp(spacing.xs),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: hexToRgba(colors.text.primary, 0.08),
  },
  warmupInfo: {
    flex: 1,
  },
  warmupWeight: {
    fontSize: rf(15),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  warmupPercent: {
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginTop: rp(2),
  },
  warmupDoneBtn: {
    backgroundColor: hexToRgba(colors.text.primary, 0.06),
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    // Clamp to 44px minimum touch target.
    minHeight: Math.max(rp(44), 44),
    justifyContent: 'center',
  },
  warmupDoneBtnActive: {
    backgroundColor: hexToRgba(colors.success.DEFAULT, 0.22),
  },
  warmupDoneText: {
    fontSize: rf(13),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  warmupDivider: {
    height: 1,
    backgroundColor: hexToRgba(colors.text.primary, 0.08),
    marginVertical: rp(spacing.sm),
  },
  // ── Set indicator: huge numerals + dots ─────────────────────────────────
  setIndicatorContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  setIndicatorValue: {
    fontSize: rf(44),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text.primary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  setIndicatorTotal: {
    fontSize: rf(22),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  setDotsRow: {
    flexDirection: 'row',
    gap: rp(spacing.sm),
    justifyContent: 'center',
    marginTop: rp(spacing.sm),
  },
  setDot: {
    width: rw(12),
    height: rw(12),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.text.primary, 0.28),
  },
  setDotCompleted: {
    backgroundColor: colors.primary.DEFAULT,
  },
  // ── Bottom thumb-zone ───────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.md),
  },
  startButton: {
    // Gradient CTA spec: minHeight 52 (GlassButton base is 48).
    minHeight: Math.max(rp(52), 52),
    marginBottom: rp(spacing.xs),
  },
  prevExButton: {
    // Clamp to 44px minimum touch target.
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xxs),
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    minHeight: Math.max(rp(44), 44),
    justifyContent: 'center',
    alignSelf: 'center',
  },
  prevExText: {
    color: colors.text.secondary,
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.medium) as any,
  },
});
