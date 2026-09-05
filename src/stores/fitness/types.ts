import { WeeklyWorkoutPlan, DayWorkout } from "../../ai";
import type { CardioIntensity } from "../../types/workout";
// NOTE: RealtimeChannel was previously imported here to type a module-level
// `workoutSessionsChannel` export, but that export was dead code —
// fitnessStore declares its OWN local `let workoutSessionsChannel` and uses
// that exclusively. The duplicated declaration violated the single-source-of-
// truth rule (two declarations of the same concept, only one ever wired up).
// Removed along with the unused export. If a future caller needs to observe
// the channel, expose a getter on useFitnessStore instead of a second var.
import type { WorkoutTemplate } from "../../services/workoutTemplateService";

export interface WorkoutProgress {
  workoutId: string;
  progress: number; // 0-100
  completedAt?: string;
  sessionId?: string;
  // Persisted on partial exit to enable accurate resume
  exerciseIndex?: number; // last active exercise index when user exited
  caloriesBurned?: number; // actual calories burned up to exit point
  // Set on every partial (<100%) progress write (see
  // fitnessStore.updateWorkoutProgress). completedAt only exists once a
  // workout hits 100%, so a leftover partial entry from a prior week had no
  // timestamp to detect staleness against — this closes that gap for the
  // same "was this started this week or is it stale leftover" check that
  // completedAt already enables for the 100% case.
  updatedAt?: string;
}

// Computed workout stats — SSOT returned by getCompletedWorkoutStats selectors
export interface CompletedWorkoutStats {
  count: number;
  totalCalories: number;
  totalDuration: number;
}

export interface CurrentWorkoutSession {
  workoutId: string;
  sessionId: string;
  startedAt: string;
  exercises: Array<{
    exerciseId: string;
    completed: boolean;
    sets: Array<{
      reps: number;
      weight: number;
      completed: boolean;
      setType?: string;
      rpe?: 1 | 2 | 3 | null;
      /** Full 1-10 RPE (see src/utils/effortScale.ts) — synthesized from
       * `rpe` via EFFORT_BUCKET_TO_RPE10 for fast 3-tap logging, or entered
       * precisely via SetLogModal's advanced RPE slider. */
      rpe10?: number | null;
      isCalibration?: boolean;
    }>;
  }>;
  /**
   * Cardio blocks (Workout Engine v2 Phase 4B.2) — a PARALLEL list to
   * exercises[], not force-fit into that shape since a cardio block has no
   * sets/reps. Seeded from workout.cardioBlocks at session start
   * (fitnessStore.startWorkoutSession); each tracks its own completion +
   * optional actual-duration override (actual over estimated — CLAUDE.md #9,
   * same rule strength exercises already follow via WorkoutProgress.
   * caloriesBurned). Optional so a session started before this field existed
   * (or a plan with no cardio blocks) still round-trips cleanly.
   */
  cardioBlocks?: Array<{
    /** CardioBlock.id from the plan. */
    blockId: string;
    name: string;
    exerciseId?: string;
    plannedDurationMinutes: number;
    intensity: CardioIntensity;
    distanceKm?: number;
    completed: boolean;
    /** User-adjusted actual duration, if different from planned — preferred
     * over plannedDurationMinutes for calorie calc when present. */
    actualDurationMinutes?: number;
  }>;
}

export type PlanSource = 'ai' | 'custom';

export interface FitnessState {
  // Weekly workout plan state (AI-generated — single source of truth for AI plans)
  weeklyWorkoutPlan: WeeklyWorkoutPlan | null;
  isGeneratingPlan: boolean;
  planError: string | null;

  // Custom workout plan (user-built via ScheduleBuilder — independent of AI plan)
  customWeeklyPlan: WeeklyWorkoutPlan | null;

  // Which plan is active on the Workout tab ('ai' or 'custom')
  activePlanSource: PlanSource;

  // Workout progress tracking
  workoutProgress: Record<string, WorkoutProgress>;
  lastProgressDate: string; // YYYY-MM-DD — guards day-boundary reset

  // Current workout session
  currentWorkoutSession: CurrentWorkoutSession | null;

  // Mesocycle tracking
  mesocycleStartDate: string | null;
  setMesocycleStartDate: (date: string) => void;
  getMesocycleWeek: () => number;

  // Actions
  setWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan | null) => void;
  saveWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan) => Promise<void>;
  loadWeeklyWorkoutPlan: () => Promise<WeeklyWorkoutPlan | null>;
  setGeneratingPlan: (isGenerating: boolean) => void;
  setPlanError: (error: string | null) => void;

  // Custom plan actions
  setCustomWeeklyPlan: (plan: WeeklyWorkoutPlan | null) => void;
  saveCustomWeeklyPlan: (plan: WeeklyWorkoutPlan) => Promise<void>;
  loadCustomWeeklyPlan: () => Promise<WeeklyWorkoutPlan | null>;
  setActivePlanSource: (source: PlanSource) => void;
  getActivePlan: () => WeeklyWorkoutPlan | null;

  // Workout progress actions
  updateWorkoutProgress: (
    workoutId: string,
    progress: number,
    metadata?: { exerciseIndex?: number; caloriesBurned?: number },
  ) => void;
  completeWorkout: (
    workoutId: string,
    sessionId?: string,
    caloriesBurned?: number,
  ) => Promise<void>;
  getWorkoutProgress: (workoutId: string) => WorkoutProgress | null;

  // Computed selectors - SINGLE SOURCE OF TRUTH
  getCompletedWorkoutStats: () => CompletedWorkoutStats;
  getTodaysCompletedWorkoutStats: () => CompletedWorkoutStats;

  // Workout session actions
  startWorkoutSession: (workout: DayWorkout) => Promise<string>;
  startTemplateSession: (
    template: WorkoutTemplate,
    userId?: string,
  ) => Promise<string>;
  endWorkoutSession: (sessionId: string) => Promise<void>;
  updateSetData: (
    exerciseId: string,
    setIndex: number,
    data: {
      weightKg: number;
      reps: number;
      setType: string;
      completed: boolean;
      rpe?: 1 | 2 | 3;
      /** Full 1-10 RPE — see src/utils/effortScale.ts. */
      rpe10?: number | null;
      isCalibration?: boolean;
    },
    /**
     * BUG FIX: exercises[] in currentWorkoutSession was previously matched by
     * exerciseId alone (a .map() over every entry whose exerciseId equals the
     * given one) — if the SAME exerciseId appears twice in one day's plan (a
     * circuit round, or two different rep-schemes of the same lift), every
     * matching entry silently received the SAME set data on every write.
     * Callers that know the exercise's position in workout.exercises (every
     * current caller does — SetLogModal/ExerciseCard/WorkoutSessionScreen all
     * track a current exercise index) should pass it here so the store
     * targets that ONE array position exactly. Optional and additive: a
     * caller that omits it gets the previous exerciseId-match behavior
     * (correct for the common no-duplicates case, still susceptible to the
     * bug above for a genuine duplicate — pass the index to fully fix it).
     */
    exerciseIndex?: number,
  ) => void;
  /**
   * Mark a cardio block (Workout Engine v2 Phase 4B.2) complete, optionally
   * recording an actual duration different from the plan's. Matched by
   * blockId — cardio blocks don't have the exerciseId-duplication problem
   * updateSetData works around, since CardioBlock.id is already unique per
   * block (stamped by workoutBuilderStore's addCardioBlock).
   */
  updateCardioBlock: (
    blockId: string,
    data: { completed: boolean; actualDurationMinutes?: number },
  ) => void;

  /**
   * Runtime (mid-session) exercise substitution — Workout Engine v2 Phase
   * 6C-iii. SESSION-ONLY: swaps exercises[exerciseIndex].exerciseId and
   * reseeds its sets (fresh, unlogged, one per newSetCount) — never touches
   * weeklyWorkoutPlan/customWeeklyPlan. The caller (WorkoutSessionScreen) is
   * responsible for updating its own local `workout` copy in parallel so
   * displayed name/reps/video and grouping stay in sync — this store only
   * owns the SESSION's logged-set data, not exercise display metadata (that
   * still comes from the plan object the screen holds, same as every other
   * exercise in the session).
   *
   * Refuses (no-op, returns false) once any set on this exercise instance is
   * already logged (`completed: true`) — those sets belong to the exercise
   * being replaced and must never be silently discarded or reattributed to
   * the swapped-in exercise. Callers should also hide/disable the swap
   * affordance once a set is logged (better UX than a silent no-op), but
   * this guard exists so a stale UI can never corrupt data.
   */
  swapSessionExercise: (
    exerciseIndex: number,
    newExerciseId: string,
    newSetCount: number,
  ) => boolean;

  // Day-boundary reset (clears stale partial progress on new day)
  checkAndResetProgressIfNewDay: () => void;

  // Data persistence
  persistData: () => Promise<void>;
  loadData: () => Promise<void>;
  clearData: () => void;
  clearOldWorkoutData: () => Promise<void>;
  forceWorkoutRegeneration: () => void;

  // Realtime subscriptions
  setupRealtimeSubscription: (userId: string) => void;
  cleanupRealtimeSubscription: () => void;
  // Incremental realtime refresh — fetches ONE session row and merges it into
  // completedSessions + workoutProgress without a full loadData() reload (and
  // without the planned-reps calorie re-derivation that previously clobbered
  // server-stored actuals). Used by the workout_sessions realtime handler.
  refreshSingleSession: (sessionId: string, userId: string) => Promise<void>;

  // Reset store (for logout)
  reset: () => void;

  // Completed sessions — single source of truth for all stats
  completedSessions: CompletedSession[];
  completedSessionsHydrated: boolean; // NOT persisted — guards one-time backfill
  _hasHydrated: boolean; // NOT persisted — set true by onRehydrateStorage

  // Active extra (quick) workout session — null when idle or completed
  activeExtraSession: ActiveExtraSession | null;
  setActiveExtraSession: (session: ActiveExtraSession) => void;
  updateActiveExtraProgress: (exerciseIndex: number) => void;
  clearActiveExtraSession: () => void;

  restTimerEnabled: boolean;
  setRestTimerEnabled: (enabled: boolean) => void;

  // New actions
  addCompletedSession: (session: CompletedSession) => void;
  markCompletedSessionsHydrated: () => void;
  setHasHydrated: () => void;
  getPlannedSessionStats: (weekStart: string) => {
    count: number;
    totalCalories: number;
    totalDuration: number;
  };
  getExtraSessionStats: (weekStart: string) => {
    count: number;
    totalCalories: number;
    totalDuration: number;
  };
  getAllSessionCalories: (dateStr: string) => number;
}

// Realtime subscription channel reference lives in fitnessStore.ts (local
// module-level `let`). It is NOT exported from here — the previous
// `export let workoutSessionsChannel` + `setWorkoutSessionsChannel` were dead
// code (never imported anywhere) and a duplicated declaration of the same
// concept the store manages locally.

export interface CompletedSession {
  sessionId: string; // UUID, unique per completion
  type: "planned" | "extra"; // enum — extensible (e.g. 'recovery' later)
  workoutId: string; // plan workout ID ('planned') or generated UUID ('extra')
  plannedDayKey?: string; // canonical planned day owner for planned workouts
  planSlotKey?: string; // canonical slot key within the weekly plan (e.g. monday:0)
  workoutSnapshot: {
    title: string;
    category: string;
    duration: number; // planned/estimated minutes
    exercises: Array<{
      name: string;
      sets: number;
      reps: number | string; // planned range ("8-12") preserved via normalizeSnapshotReps
      exerciseId?: string;
      duration?: number; // seconds, for time-based exercises
      restTime?: number; // seconds between sets
    }>;
  };
  caloriesBurned: number; // MET-calculated at completion; 0 if weight unavailable
  durationMinutes: number; // actual elapsed time
  completedAt: string; // ISO timestamp
  weekStart: string; // ISO date of Monday of that week (YYYY-MM-DD)
}

// Persisted when a quick workout is started but not yet completed.
// Enables RESUME: navigate back to the exact exercise with the same workout.
export interface ActiveExtraSession {
  templateId: string; // matches ExtraWorkoutTemplate.id — links card to session
  workout: DayWorkout; // full generated workout (needed to reconstruct navigation)
  sessionId: string; // UUID for this session
  exerciseIndex: number; // last saved exercise position (updated on exit)
  startedAt: string; // ISO timestamp
}

export interface ExtraWorkoutTemplate {
  id: string;
  title: string;
  category: string; // 'hiit' | 'cardio' | 'strength' | 'flexibility'
  duration: number; // minutes
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedCalories: number; // display-only — never used in calculations
}
