// Workout-related TypeScript type definitions

// ============================================================================
// EXERCISE TYPES
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  muscleGroups: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  sets?: number;
  reps?: number | string; // Can be "8-12" or specific number
  duration?: number; // in seconds for time-based exercises
  restTime?: number; // in seconds
  calories?: number; // estimated calories burned
  videoUrl?: string;
  imageUrl?: string;
  tips?: string[];
  variations?: string[];
}

export interface WorkoutSet {
  exerciseId: string;
  sets: number;
  reps: number | string;
  weight?: number; // in kg
  duration?: number; // in seconds
  restTime: number; // in seconds
  notes?: string;
  intensity?: string; // e.g., "75% 1RM" or "moderate"
  tempo?: string; // e.g., "2-1-2-1" (eccentric-pause-concentric-pause)
  rpe?: number; // Rate of Perceived Exertion (1-10)
  // Additional properties used in WorkoutSessionScreen
  id?: string;
  exerciseName?: string;
  name?: string; // Alias for exerciseName
  // Exercise data from Workers API
  exerciseData?: {
    exerciseId: string;
    name: string;
    gifUrl: string;
    targetMuscles?: string[];
    instructions?: string[];
  };
  // ── Per-set fidelity passthrough (Workout Engine v2 Phase 4) ──────────────
  // The fields above collapse an exercise's sets to ONE flat target (reps
  // becomes a single value or, at best, a comma-joined string) — a drop
  // set's distinct drop weight/reps, or a pyramid scheme's per-set targets,
  // were silently lost the moment a PlannedExercise became a WorkoutSet.
  // plannedSets is the full-fidelity original, additive and optional so
  // every existing WorkoutSet consumer (AI-generated plans included, which
  // never populate this) is unaffected. Session code that wants the REAL
  // per-set target for set index i should read plannedSets?.[i] first and
  // fall back to the flat fields above.
  plannedSets?: PlannedSet[];
  /** Groups this exercise into a superset (matches SupersetGroup.id). */
  supersetId?: string;
  /** Groups this exercise into a circuit (matches CircuitGroup.id). */
  circuitId?: string;
  /** Ordering within the superset/circuit. */
  blockIndex?: number;
}

// ============================================================================
// CANONICAL PLANNED EXERCISE TYPES (workout builder SSOT)
// ============================================================================
// One canonical shape for all builder, template, and AI paths. Adapters below
// convert to/from the legacy WorkoutSet, TemplateExercise, and AI schemas.
// Supersedes the three divergent shapes — never import WorkoutSet for new
// builder code; use PlannedExercise + PlannedSet instead.

/**
 * Per-set definition in a planned exercise. Distinct from CompletedSet (which
 * tracks actual reps performed). PlannedSet is the *intent* — CompletedSet is
 * the *result*.
 */
export interface PlannedSet {
  setNumber: number;
  reps: number | string; // number or "8-12" range
  weightKg?: number;
  setType:
    | "normal"
    | "warmup"
    | "failure"
    | "drop"
    | "superset"
    | "circuit";
  /** Drop-set only: weight & reps for the drop portion. */
  dropWeightKg?: number;
  dropReps?: number;
  /** Time-based exercises (planks, holds) — overrides reps when present. */
  durationSeconds?: number;
}

/** Group of exercises performed back-to-back with minimal rest. */
export interface SupersetGroup {
  id: string;
  exerciseIds: string[]; // exerciseIds in this superset, in order
  restBetweenExercises?: number; // seconds
  restAfterGroup?: number; // seconds
}

/** Group of exercises performed as a circuit (repeated rounds). */
export interface CircuitGroup {
  id: string;
  exerciseIds: string[]; // exerciseIds in this circuit, in order
  rounds: number;
  restBetweenExercises?: number;
  restBetweenRounds?: number;
}

/**
 * Canonical planned exercise — the single source of truth for the builder.
 * Adapters convert to WorkoutSet (session execution), TemplateExercise
 * (template save), and AI WorkoutExercise (re-generation).
 */
export interface PlannedExercise {
  exerciseId: string;
  name: string;
  sets: PlannedSet[];
  /** Rest between sets, in seconds. Falls back to 60 if absent. */
  restSeconds: number;
  notes?: string;
  /** Tempo string, e.g. "3-1-2-0" (eccentric-pause-concentric-pause). */
  tempo?: string;
  /** Target RPE 1-10 (industry standard; session UI uses 1-3 simplification). */
  targetRpe?: number;
  /** Groups this exercise into a superset (matches SupersetGroup.id). */
  supersetId?: string;
  /** Groups this exercise into a circuit (matches CircuitGroup.id). */
  circuitId?: string;
  /** Ordering within the superset/circuit. */
  blockIndex?: number;
  /** Optional alternative exercise id (user-swappable). */
  alternativeExerciseId?: string;
}

// ----------------------------------------------------------------------------
// ADAPTERS — convert PlannedExercise to/from legacy shapes.
// Boundary: keep adapters pure (no side effects, no DB calls).
// ----------------------------------------------------------------------------

import type {
  TemplateExercise,
} from "../services/workoutTemplateService";

/** PlannedExercise → WorkoutSet (for session execution). */
export function toWorkoutSet(planned: PlannedExercise): WorkoutSet {
  const totalSets = planned.sets.length;
  const firstSet = planned.sets[0];
  const reps =
    planned.sets.length === 1
      ? firstSet.reps
      : planned.sets.every((s) => s.reps === firstSet.reps)
        ? firstSet.reps
        : planned.sets.map((s) => String(s.reps)).join(",");
  return {
    exerciseId: planned.exerciseId,
    sets: totalSets,
    reps,
    weight: firstSet?.weightKg,
    duration: firstSet?.durationSeconds,
    restTime: planned.restSeconds,
    notes: planned.notes,
    tempo: planned.tempo,
    rpe: planned.targetRpe,
    name: planned.name,
    exerciseName: planned.name,
    // Per-set fidelity passthrough — see the WorkoutSet field comments.
    plannedSets: planned.sets,
    supersetId: planned.supersetId,
    circuitId: planned.circuitId,
    blockIndex: planned.blockIndex,
  };
}

/** PlannedExercise → TemplateExercise (for template save). */
export function toTemplateExercise(
  planned: PlannedExercise,
): TemplateExercise {
  const firstReps = planned.sets[0]?.reps;
  const reps: [number, number] =
    typeof firstReps === "string"
      ? parseRepRange(firstReps)
      : [firstReps ?? 8, firstReps ?? 12];
  return {
    exerciseId: planned.exerciseId,
    name: planned.name,
    sets: planned.sets.length,
    repRange: reps,
    restSeconds: planned.restSeconds,
    targetWeightKg: planned.sets[0]?.weightKg,
  };
}

/** TemplateExercise → PlannedExercise (when loading a template into builder). */
export function fromTemplateExercise(
  template: TemplateExercise,
): PlannedExercise {
  const repValue =
    template.repRange[0] === template.repRange[1]
      ? template.repRange[0]
      : `${template.repRange[0]}-${template.repRange[1]}`;
  return {
    exerciseId: template.exerciseId,
    name: template.name,
    sets: Array.from({ length: template.sets }, (_, i) => ({
      setNumber: i + 1,
      reps: repValue,
      weightKg: template.targetWeightKg,
      setType: "normal" as const,
    })),
    restSeconds: template.restSeconds,
  };
}

/**
 * PlannedExercise → AI WorkoutExercise (for AI re-generation / NL edits).
 * Mirrors fitai-workers/src/utils/validation.ts WorkoutExerciseSchema.
 */
export function toAiExercise(planned: PlannedExercise): {
  exerciseId: string;
  sets: number;
  reps: number | string;
  restSeconds?: number;
  notes?: string;
  tempo?: string;
} {
  return {
    exerciseId: planned.exerciseId,
    sets: planned.sets.length,
    reps: planned.sets[0]?.reps ?? 8,
    restSeconds: planned.restSeconds,
    notes: planned.notes,
    tempo: planned.tempo,
  };
}

/** Parse a reps range string like "8-12" → [8, 12]. Single value → [n, n]. */
function parseRepRange(reps: string): [number, number] {
  const parts = reps.split("-").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !parts.some(isNaN)) {
    return [parts[0], parts[1]];
  }
  const n = parseInt(reps, 10);
  return isNaN(n) ? [8, 12] : [n, n];
}

// ============================================================================
// BUILDER VALIDATION + INSIGHTS TYPES
// ============================================================================

export type ValidationSeverity = "info" | "warning" | "error";

export interface ValidationWarning {
  id: string;
  type:
    | "excessive_volume"
    | "insufficient_pull"
    | "missing_legs"
    | "too_many_compounds"
    | "missing_warmup"
    | "recovery_conflict"
    | "safety_constraint"
    | "muscle_imbalance";
  severity: ValidationSeverity;
  message: string;
  exerciseId?: string;
  dayIndex?: number;
  fixAction?: {
    label: string;
    type: "add_exercise" | "remove_exercise" | "replace_exercise" | "adjust_volume";
    payload?: Record<string, unknown>;
  };
}

export interface WeeklyInsights {
  /** Push / Pull ratio — e.g. 1.0 = balanced, >1 = push-heavy, <1 = pull-heavy. */
  pushPullRatio: number;
  /** Sets per muscle group across the week. */
  muscleCoverage: Record<string, number>;
  /** 0-100 recovery score (inverse of consecutive-day same-muscle hits + volume load). */
  recoveryScore: number;
  /** Total tonnage (sets × reps × weight) across the week, in kg. */
  totalVolume: number;
  /** Estimated calories burned across the week (MET calc). */
  calorieEstimate: number;
  /** Total minutes committed across the week. */
  timeCommitment: number;
  /** Sum of estimated calories × days per week. */
  weeklyCalories: number;
  /** Soft warnings surfaced inline (not popups). */
  balanceWarnings: ValidationWarning[];
  /** 0-100 volume score (current volume vs max-recoverable-volume). */
  volumeScore: number;
}

export interface AiSuggestion {
  exerciseId: string;
  name: string;
  reason: string;
  confidence: number; // 0-1
  muscleGroup: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  category:
    | "strength"
    | "cardio"
    | "flexibility"
    | "hiit"
    | "yoga"
    | "pilates"
    | "hybrid";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: number; // in minutes
  /**
   * DISPLAY-ONLY — never used in calculations.
   *
   * Pre-generation calorie estimate shown on workout cards. The authoritative
   * calories burned for a completed session come from the MET calc at
   * completion (completionTrackingService.completeWorkout /
   * extraWorkoutService) and are stored on workout_sessions.calories_burned +
   * WorkoutProgress.caloriesBurned. Never seed caloriesBurned from this value
   * (see P1-11 in the workout tracking audit).
   */
  estimatedCalories: number;
  exercises: WorkoutSet[];
  warmup?: WorkoutSet[];
  cooldown?: WorkoutSet[];
  equipment: string[];
  targetMuscleGroups: string[];
  icon: string;
  tags: string[];
  isPersonalized: boolean;
  aiGenerated: boolean;
  createdAt: string;
  // Enhanced Gemini 2.5 Flash features
  progressionTips?: string[];
  modifications?: string[];
  nutritionalFocus?: string[];
  recoveryNotes?: string[];
  safetyConsiderations?: string[];
  expectedAdaptations?: string[];
  periodizationWeek?: number; // For progressive programs
  // Additional properties used in FitnessScreen
  dayOfWeek?: string; // 'monday', 'tuesday', etc.
  isRestDay?: boolean;
  completed?: boolean;
  // ── Energy model additions (Phase A.1) ────────────────────────────────────
  // First-class cardio activity — "30 min running" no longer faked as
  // sets×reps. Additive: existing JSONB plans without these fields parse fine.
  cardioBlocks?: CardioBlock[];
  /** Display / notifications ONLY — e.g. "06:00". Never an energy-math input;
   *  adherence is date-based, not time-based (see the goal-engine plan). */
  scheduledTime?: string; // "HH:MM"
}

// ============================================================================
// CARDIO BLOCK (Energy model — Phase A.1)
// ============================================================================

/** Intensity label for a cardio block. Maps to a MET modifier. */
export type CardioIntensity = "low" | "moderate" | "high";

/**
 * A first-class cardio activity block within a workout day — e.g.
 * "30 min running at moderate intensity". MET is resolved from
 * `EXERCISE_TYPE_MET_OVERRIDES` (running 9.8, cycling 7.5, rowing 7.0,
 * jump rope 12.3, walking 3.5) × an intensity modifier × duration.
 */
export interface CardioBlock {
  id: string;
  kind: "cardio";
  name: string;
  /** Optional exercise ID for a curated cardio exercise. */
  exerciseId?: string;
  /** Duration in minutes. */
  durationMinutes: number;
  intensity: CardioIntensity;
  /** Optional distance — for display only, not used in MET calc. */
  distanceKm?: number;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  workouts: Workout[];
  restDays: (number | string)[];
  progression: {
    week: number;
    adjustments: string[];
  }[];
  goals: string[];
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// WORKOUT SESSION TYPES
// ============================================================================

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null; // minutes (null if not yet completed or missing)
  caloriesBurned: number | null; // null if not yet completed or missing
  exercises: CompletedExercise[];
  notes: string;
  rating: number; // 1-5
  isCompleted: boolean;
}

export interface CompletedExercise {
  exerciseId: string;
  sets: CompletedSet[];
  notes: string;
  personalRecord: boolean;
}

export interface CompletedSet {
  reps: number;
  weight: number; // kg
  duration: number; // seconds
  restTime: number; // seconds
  rpe: number; // Rate of Perceived Exertion 1-10
  completed: boolean;
}

// ============================================================================
// WORKOUT PREFERENCES
// ============================================================================

// NOTE: Renamed to avoid conflict with WorkoutPreferences from user.ts (database type)
// This type is for internal workout generation logic only
export interface WorkoutGenerationPreferences {
  preferredTypes: WorkoutType[];
  equipment: EquipmentType[];
  duration: number; // minutes
  frequency: number; // times per week
  intensity: "low" | "moderate" | "high";
  goals: WorkoutGoal[];
  restrictions: string[];
  preferredTime: "morning" | "afternoon" | "evening" | "flexible";
}

export type WorkoutType =
  | "strength"
  | "cardio"
  | "hiit"
  | "yoga"
  | "pilates"
  | "flexibility"
  | "functional"
  | "sports"
  | "dance";

export type EquipmentType =
  | "none"
  | "dumbbells"
  | "barbell"
  | "resistance_bands"
  | "kettlebell"
  | "pull_up_bar"
  | "yoga_mat"
  | "cardio_machine"
  | "gym_access";

export type WorkoutGoal =
  | "weight_loss"
  | "muscle_gain"
  | "strength"
  | "endurance"
  | "flexibility"
  | "general_fitness"
  | "sport_specific";

// ============================================================================
// MUSCLE GROUP TYPES
// ============================================================================

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lower_back"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "full_body";

export interface MuscleGroupTarget {
  muscleGroup: MuscleGroup;
  priority: "primary" | "secondary";
  volume: number; // sets per week
}

// ============================================================================
// WORKOUT ANALYTICS
// ============================================================================

export interface WorkoutAnalytics {
  totalWorkouts: number;
  totalDuration: number; // minutes
  totalCaloriesBurned: number;
  averageRating: number;
  completionRate: number; // percentage
  streakCurrent: number;
  streakLongest: number;
  favoriteWorkoutTypes: WorkoutType[];
  progressMetrics: {
    strengthGains: Record<string, number>; // exercise -> weight increase
    enduranceGains: Record<string, number>; // exercise -> duration increase
    consistencyScore: number; // 0-100
  };
  weeklyStats: {
    week: string; // ISO week
    workouts: number;
    duration: number;
    calories: number;
  }[];
  monthlyStats: {
    month: string; // YYYY-MM
    workouts: number;
    duration: number;
    calories: number;
  }[];
}

// ============================================================================
// WORKOUT GENERATION
// ============================================================================

export interface WorkoutGenerationRequest {
  userId: string;
  type: WorkoutType;
  duration: number; // minutes
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: EquipmentType[];
  targetMuscleGroups: MuscleGroup[];
  goals: WorkoutGoal[];
  preferences: WorkoutGenerationPreferences;
  previousWorkouts?: string[]; // workout IDs to avoid repetition
}

export interface WorkoutGenerationResponse {
  workout: Workout;
  alternatives?: Workout[];
  reasoning: string;
  estimatedDifficulty: number; // 1-10
  expectedResults: string[];
  progressionSuggestions: string[];
}

// ============================================================================
// EXERCISE DATABASE
// ============================================================================

export interface ExerciseFilter {
  muscleGroups?: MuscleGroup[];
  equipment?: EquipmentType[];
  difficulty?: ("beginner" | "intermediate" | "advanced")[];
  type?: ("strength" | "cardio" | "flexibility" | "balance")[];
  searchTerm?: string;
}

export interface ExerciseSearchResult {
  exercises: Exercise[];
  totalCount: number;
  filters: {
    muscleGroups: { value: MuscleGroup; count: number }[];
    equipment: { value: EquipmentType; count: number }[];
    difficulty: { value: string; count: number }[];
  };
}

// ============================================================================
// WORKOUT TEMPLATES
// ============================================================================

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkoutType;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: number; // minutes
  exercises: WorkoutSet[];
  equipment: EquipmentType[];
  targetMuscleGroups: MuscleGroup[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rating: number; // average user rating
  usageCount: number;
  tags: string[];
}

export interface CustomWorkout extends WorkoutTemplate {
  isCustom: true;
  originalTemplateId?: string;
  modifications: string[];
}

// ============================================================================
// WORKOUT SCHEDULING
// ============================================================================

export interface WorkoutSchedule {
  id: string;
  userId: string;
  workoutId: string;
  scheduledDate: string; // ISO date
  scheduledTime: string; // HH:MM
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  status: "scheduled" | "completed" | "skipped" | "cancelled";
  reminder: boolean;
  reminderTime: number; // minutes before
  notes: string;
}

export interface RecurrencePattern {
  type: "daily" | "weekly" | "monthly";
  interval: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  endDate?: string; // ISO date
  maxOccurrences?: number;
}

// ============================================================================
// WORKOUT PROGRESS TRACKING
// ============================================================================

export interface WorkoutProgress {
  exerciseId: string;
  exerciseName: string;
  progressType: "weight" | "reps" | "duration" | "distance";
  history: ProgressEntry[];
  personalBest: ProgressEntry;
  trend: "improving" | "stable" | "declining";
  nextTarget: ProgressTarget;
}

export interface ProgressEntry {
  date: string; // ISO date
  value: number;
  unit: string;
  workoutSessionId: string;
  notes?: string;
}

export interface ProgressTarget {
  value: number;
  unit: string;
  targetDate: string; // ISO date
  isAchieved: boolean;
  achievedDate?: string; // ISO date
}

// ============================================================================
// WORKOUT ACHIEVEMENTS
// ============================================================================

export interface WorkoutAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "consistency" | "strength" | "endurance" | "milestone";
  difficulty: "bronze" | "silver" | "gold" | "platinum";
  criteria: AchievementCriteria;
  reward: {
    points: number;
    badge?: string;
    unlocks?: string[];
  };
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0-100 percentage
}

export interface AchievementCriteria {
  type:
    | "workout_count"
    | "streak"
    | "weight_lifted"
    | "calories_burned"
    | "duration";
  value: number;
  timeframe?: "day" | "week" | "month" | "year" | "all_time";
  conditions?: Record<string, any>;
}

// ============================================================================
// WORKOUT SHARING
// ============================================================================

export interface SharedWorkout {
  id: string;
  workoutId: string;
  sharedBy: string;
  sharedWith?: string[]; // user IDs, empty for public
  shareType: "public" | "friends" | "private";
  shareUrl: string;
  expiresAt?: string; // ISO date
  allowModifications: boolean;
  shareMessage?: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface WorkoutComment {
  id: string;
  workoutId: string;
  userId: string;
  userName: string;
  comment: string;
  rating?: number; // 1-5
  createdAt: string;
  updatedAt?: string;
  likes: number;
  replies?: WorkoutComment[];
}
