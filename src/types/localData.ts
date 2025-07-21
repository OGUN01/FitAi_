// Local Data Types for Track B Infrastructure
// Comprehensive TypeScript interfaces for local storage schema

import { 
  OnboardingData, 
  UserProfile, 
  PersonalInfo, 
  FitnessGoals,
  Workout,
  Exercise,
  Meal,
  Food,
  Achievement
} from './index';

// ============================================================================
// LOCAL STORAGE SCHEMA
// ============================================================================

export interface LocalStorageSchema {
  version: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  user: LocalUserData;
  fitness: LocalFitnessData;
  nutrition: LocalNutritionData;
  progress: LocalProgressData;
  metadata: LocalMetadata;
}

// ============================================================================
// USER DATA
// ============================================================================

export interface LocalUserData {
  onboardingData: OnboardingData | null;
  preferences: UserPreferences;
  profile: UserProfile | null;
  authState: LocalAuthState;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
  notifications: boolean;
  darkMode: boolean;
  language: string;
  timezone: string;
  autoSync: boolean;
  dataRetention: number; // days
}

export interface LocalAuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  lastLoginAt: string | null;
  sessionToken: string | null;
  migrationStatus: MigrationStatus;
}

// ============================================================================
// FITNESS DATA
// ============================================================================

export interface LocalFitnessData {
  workouts: Workout[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  plans: WorkoutPlan[];
  customExercises: CustomExercise[];
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  duration: number; // minutes
  caloriesBurned: number;
  exercises: CompletedExercise[];
  notes: string;
  rating: number; // 1-5
  isCompleted: boolean;
  syncStatus: SyncStatus;
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

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // days
  workouts: string[]; // workout IDs
  restDays: number[];
  progression: PlanProgression[];
  goals: string[];
  isActive: boolean;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface PlanProgression {
  week: number;
  adjustments: string[];
  targetMetrics: Record<string, number>;
}

export interface CustomExercise extends Exercise {
  isCustom: true;
  createdBy: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

// ============================================================================
// NUTRITION DATA
// ============================================================================

export interface LocalNutritionData {
  meals: Meal[];
  foods: Food[];
  logs: MealLog[];
  plans: NutritionPlan[];
  customFoods: CustomFood[];
  waterLogs: WaterLog[];
}

export interface MealLog {
  id: string;
  userId: string;
  date: string; // ISO date
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: LoggedFood[];
  totalCalories: number;
  totalMacros: Macronutrients;
  notes: string;
  photos: string[]; // photo URLs
  syncStatus: SyncStatus;
}

export interface LoggedFood {
  foodId: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: Macronutrients;
}

export interface Macronutrients {
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  fiber: number; // grams
}

export interface NutritionPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // days
  dailyPlans: DailyMealPlan[];
  calorieTarget: number;
  macroTargets: Macronutrients;
  dietaryRestrictions: string[];
  goals: string[];
  isActive: boolean;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface DailyMealPlan {
  date: string; // ISO date
  meals: Meal[];
  totalCalories: number;
  totalMacros: Macronutrients;
  waterTarget: number; // ml
  adherence: number; // 0-100 percentage
}

export interface CustomFood extends Food {
  isCustom: true;
  createdBy: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface WaterLog {
  id: string;
  userId: string;
  date: string; // ISO date
  amount: number; // ml
  timestamp: string;
  syncStatus: SyncStatus;
}

// ============================================================================
// PROGRESS DATA
// ============================================================================

export interface LocalProgressData {
  measurements: BodyMeasurement[];
  photos: ProgressPhoto[];
  achievements: Achievement[];
  analytics: ProgressAnalysis[];
  goals: FitnessGoal[];
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string; // ISO date
  weight: number; // kg
  bodyFat: number | null; // percentage
  muscleMass: number | null; // kg
  measurements: BodyMeasurements;
  notes: string;
  syncStatus: SyncStatus;
}

export interface BodyMeasurements {
  chest: number | null; // cm
  waist: number | null; // cm
  hips: number | null; // cm
  bicep: number | null; // cm
  thigh: number | null; // cm
  neck: number | null; // cm
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  date: string; // ISO date
  type: 'front' | 'side' | 'back' | 'custom';
  photoUrl: string;
  thumbnailUrl: string;
  notes: string;
  isPrivate: boolean;
  syncStatus: SyncStatus;
}

export interface ProgressAnalysis {
  id: string;
  userId: string;
  date: string; // ISO date
  period: 'week' | 'month' | 'quarter' | 'year';
  metrics: ProgressMetrics;
  insights: string[];
  recommendations: string[];
  goalProgress: GoalProgress[];
  motivationalMessage: string;
  nextMilestones: string[];
  syncStatus: SyncStatus;
}

export interface ProgressMetrics {
  weight: MetricTrend;
  bodyFat: MetricTrend | null;
  muscleMass: MetricTrend | null;
  strength: StrengthMetrics;
  endurance: EnduranceMetrics;
  consistency: ConsistencyMetrics;
}

export interface MetricTrend {
  current: number;
  change: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

export interface StrengthMetrics {
  exercises: Record<string, {
    maxWeight: number;
    improvement: number;
    personalRecords: number;
  }>;
  overallImprovement: number;
}

export interface EnduranceMetrics {
  cardioMinutes: number;
  improvement: number;
  averageHeartRate: number | null;
  vo2Max: number | null;
}

export interface ConsistencyMetrics {
  workoutStreak: number;
  nutritionAdherence: number; // percentage
  weeklyWorkouts: number;
  missedWorkouts: number;
}

export interface GoalProgress {
  goalId: string;
  progress: number; // 0-100 percentage
  estimatedCompletion: string | null; // ISO date
  isOnTrack: boolean;
}

export interface FitnessGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'weight_loss' | 'muscle_gain' | 'strength' | 'endurance' | 'flexibility' | 'general_fitness';
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string; // ISO date
  isCompleted: boolean;
  completedAt: string | null;
  priority: 'low' | 'medium' | 'high';
  syncStatus: SyncStatus;
}

// ============================================================================
// METADATA
// ============================================================================

export interface LocalMetadata {
  lastSync: string | null; // ISO timestamp
  migrationStatus: MigrationStatus;
  conflicts: Conflict[];
  backups: BackupInfo[];
  syncQueue: SyncQueueItem[];
  storageInfo: StorageInfo;
}

export interface MigrationStatus {
  isRequired: boolean;
  isInProgress: boolean;
  isCompleted: boolean;
  currentStep: string | null;
  totalSteps: number;
  completedSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  errors: string[];
}

export interface Conflict {
  id: string;
  type: 'data_conflict' | 'schema_conflict' | 'sync_conflict';
  table: string;
  localData: any;
  remoteData: any;
  conflictFields: string[];
  resolution: ConflictResolution | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'user_choice';
  resolvedData: any;
  userChoice: boolean;
}

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'migration';
  createdAt: string;
  size: number; // bytes
  location: 'local' | 'cloud';
  path: string;
  checksum: string;
  isValid: boolean;
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface StorageInfo {
  totalSize: number; // bytes
  usedSize: number; // bytes
  availableSize: number; // bytes
  quotaExceeded: boolean;
  lastCleanup: string | null;
  compressionRatio: number;
}

// ============================================================================
// SYNC STATUS
// ============================================================================

export type SyncStatus = 'local' | 'synced' | 'pending' | 'conflict' | 'error';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// ENCRYPTION TYPES
// ============================================================================

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  iterations: number;
  saltLength: number;
  ivLength: number;
}

export interface EncryptedData {
  data: string; // base64 encoded encrypted data
  iv: string; // base64 encoded initialization vector
  salt: string; // base64 encoded salt
  tag: string; // base64 encoded authentication tag
}
