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
}

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  workouts: Workout[];
  restDays: number[];
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
