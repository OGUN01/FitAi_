/**
 * Enhanced Profile Data Types with Versioning and Sync Support
 * Designed for 100% data accuracy and seamless local-remote synchronization
 */

// Base interface for all data with sync metadata
export interface SyncableData {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  source: 'local' | 'remote' | 'merged';
}

// Enhanced Personal Information with validation
export interface PersonalInfo extends SyncableData {
  name: string;
  email?: string;
  age: string;
  gender: 'male' | 'female' | 'other';
  height: string; // in cm
  weight: string; // in kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  profilePicture?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

// Enhanced Fitness Goals with detailed tracking
export interface FitnessGoals extends SyncableData {
  primaryGoals: string[];
  targetWeight?: string;
  timeframe?: string;
  experience: 'beginner' | 'intermediate' | 'advanced';
  timeCommitment: string;
  specificTargets?: {
    muscleGain?: boolean;
    weightLoss?: boolean;
    endurance?: boolean;
    strength?: boolean;
    flexibility?: boolean;
  };
  medicalConditions?: string[];
  limitations?: string[];
}

// Enhanced Diet Preferences with comprehensive options
export interface DietPreferences extends SyncableData {
  dietType: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian' | 'keto' | 'paleo' | 'mediterranean';
  allergies: string[];
  cuisinePreferences: string[];
  restrictions: string[];
  cookingSkill?: 'beginner' | 'intermediate' | 'advanced';
  mealPrepTime?: 'quick' | 'moderate' | 'extended'; // <30min, 30-60min, >60min
  dislikes?: string[];
  preferredMealTimes?: string[];
  budgetRange?: 'low' | 'medium' | 'high';
  organicPreference?: boolean;
  supplementsUsed?: string[];
}

// Enhanced Workout Preferences with detailed options
export interface WorkoutPreferences extends SyncableData {
  workoutType: string[];
  equipment: string[];
  location: 'home' | 'gym' | 'outdoor' | 'mixed';
  timeSlots: string[];
  intensity: 'low' | 'moderate' | 'high';
  duration: string;
  frequency: number; // days per week
  preferredDays?: string[];
  restDayPreferences?: string[];
  injuryHistory?: string[];
  fitnessTracking?: boolean;
}

// Body Analysis Data with progress tracking
export interface BodyAnalysis extends SyncableData {
  photos: {
    front?: string;
    side?: string;
    back?: string;
  };
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  bodyFatPercentage?: number;
  muscleMass?: number;
  bmi?: number;
  analysisDate: string;
  aiAnalysisResults?: {
    bodyType?: string;
    recommendations?: string[];
    progressNotes?: string;
  };
}

// Comprehensive User Profile with all data
export interface UserProfile extends SyncableData {
  userId: string;
  personalInfo?: PersonalInfo;
  fitnessGoals?: FitnessGoals;
  dietPreferences?: DietPreferences;
  workoutPreferences?: WorkoutPreferences;
  bodyAnalysis?: BodyAnalysis[];
  onboardingCompleted: boolean;
  profileCompleteness: number; // 0-100%
  lastActiveAt: string;
}

// Data validation schemas
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataValidationSchema {
  validatePersonalInfo(data: Partial<PersonalInfo>): ValidationResult;
  validateFitnessGoals(data: Partial<FitnessGoals>): ValidationResult;
  validateDietPreferences(data: Partial<DietPreferences>): ValidationResult;
  validateWorkoutPreferences(data: Partial<WorkoutPreferences>): ValidationResult;
  validateUserProfile(data: Partial<UserProfile>): ValidationResult;
}

// Sync and conflict resolution types
export interface SyncConflict {
  id: string;
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: string;
  remoteTimestamp: string;
  conflictType: 'value_mismatch' | 'version_conflict' | 'deletion_conflict';
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'use_local' | 'use_remote' | 'merge' | 'manual';
  mergedValue?: any;
  userChoice?: boolean;
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

// Storage operation types
export interface StorageOperation {
  type: 'create' | 'update' | 'delete' | 'sync';
  dataType:
    | 'personalInfo'
    | 'fitnessGoals'
    | 'dietPreferences'
    | 'workoutPreferences'
    | 'bodyAnalysis'
    | 'userProfile';
  data: any;
  timestamp: string;
  userId?: string;
}

export interface StorageQueue {
  operations: StorageOperation[];
  isProcessing: boolean;
  lastProcessedAt?: string;
}

// Migration types
export interface MigrationStatus {
  isInProgress: boolean;
  progress: number; // 0-100%
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface MigrationResult {
  success: boolean;
  migratedData: {
    personalInfo?: boolean;
    fitnessGoals?: boolean;
    dietPreferences?: boolean;
    workoutPreferences?: boolean;
    bodyAnalysis?: boolean;
  };
  conflicts: SyncConflict[];
  errors: string[];
  duration: number; // in milliseconds
}

// Edit context types
export interface EditContextData {
  isEditMode: boolean;
  editSection: 'personalInfo' | 'fitnessGoals' | 'dietPreferences' | 'workoutPreferences' | null;
  originalData: any;
  currentData: any;
  hasChanges: boolean;
  validationErrors: string[];
}

export interface EditActions {
  startEdit: (section: string, data: any) => void;
  updateData: (data: any) => void;
  saveChanges: () => Promise<boolean>;
  cancelEdit: () => void;
  validateData: () => ValidationResult;
}

// Storage configuration
export interface StorageConfig {
  enableLocalStorage: boolean;
  enableRemoteStorage: boolean;
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  enableConflictResolution: boolean;
  enableOfflineQueue: boolean;
}

// Note: Core types like PersonalInfo, FitnessGoals, etc. are exported from their respective modules
// This file focuses on profile data management specific types
