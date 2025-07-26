// Local Data Types for Track B Infrastructure
// Comprehensive TypeScript interfaces for local storage schema

import { 
  UserProfile, 
  PersonalInfo, 
  FitnessGoals
} from './user';

import {
  Workout,
  Exercise,
  WorkoutPlan,
  CompletedExercise,
  CompletedSet,
  WorkoutSession
} from './workout';

import {
  Meal,
  Food,
  Macronutrients,
  NutritionPlan,
  DailyMealPlan
} from './diet';

import { Achievement } from './ai';

// ============================================================================
// ONBOARDING DATA
// ============================================================================

export interface OnboardingData {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  currentStep: number;
  isComplete: boolean;
  startedAt: string;
  completedAt?: string;
}

// ============================================================================
// SYNC STATUS
// ============================================================================

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

export interface SyncMetadata {
  lastSyncedAt?: string;
  lastModifiedAt: string;
  syncVersion: number;
  deviceId: string;
  conflictResolution?: 'local' | 'remote' | 'manual';
}

// ============================================================================
// USER DATA
// ============================================================================

export interface LocalUserProfile extends UserProfile {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  offlineData?: {
    cachedWorkouts: string[]; // Workout IDs
    cachedMeals: string[]; // Meal IDs
    cachedAchievements: string[]; // Achievement IDs
  };
}

export interface UserSettings {
  units: 'metric' | 'imperial';
  language: 'en' | 'es' | 'fr' | 'de' | 'pt';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    workoutReminders: boolean;
    mealReminders: boolean;
    waterReminders: boolean;
    progressUpdates: boolean;
    motivationalQuotes: boolean;
    reminderTimes: {
      workout: string; // HH:MM format
      breakfast: string;
      lunch: string;
      dinner: string;
      water: string[];
    };
  };
  privacy: {
    shareProgress: boolean;
    publicProfile: boolean;
    allowFriendRequests: boolean;
    dataCollection: boolean;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
  };
}

// ============================================================================
// WORKOUT DATA
// ============================================================================

export interface LocalWorkout extends Workout {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  isCustom: boolean;
  isFavorite: boolean;
  lastPerformed?: string;
  performanceHistory?: WorkoutPerformance[];
}

export interface WorkoutPerformance {
  sessionId: string;
  performedAt: string;
  duration: number; // actual duration in minutes
  caloriesBurned: number;
  completionRate: number; // 0-1
  notes?: string;
  modifications?: string[];
  difficulty: 'too_easy' | 'just_right' | 'too_hard';
  mood: 'energetic' | 'normal' | 'tired';
}

export interface LocalWorkoutPlan extends WorkoutPlan {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  progress: {
    startedAt: string;
    currentWeek: number;
    currentDay: number;
    completedWorkouts: string[]; // Workout IDs
    skippedWorkouts: string[];
    completionRate: number;
  };
}

export interface LocalWorkoutSession extends WorkoutSession {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  mediaFiles?: {
    photos: string[]; // Local file paths
    videos: string[]; // Local file paths
  };
}

// ============================================================================
// NUTRITION DATA
// ============================================================================

export interface LocalFood extends Food {
  localId: string;
  isCustom: boolean;
  isFavorite: boolean;
  lastUsed?: string;
  usageCount: number;
  userNotes?: string;
  verificationStatus: 'verified' | 'user_created' | 'ai_suggested';
}

export interface LoggedFood {
  id: string;
  foodId: string;
  food: LocalFood;
  quantity: number;
  unit: string;
  calories: number;
  macros: Macronutrients;
}

// Re-export types to avoid duplication
export type { Macronutrients } from './diet';

export interface LocalNutritionPlan extends NutritionPlan {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  isActive: boolean;
  progress: {
    startedAt: string;
    currentDay: number;
    adherenceRate: number;
    averageCalories: number;
    averageMacros: Macronutrients;
  };
}

export interface LocalDailyMealPlan extends DailyMealPlan {
  localId: string;
  actualIntake?: {
    calories: number;
    macros: Macronutrients;
    meals: MealLog[];
  };
  adherenceScore: number;
  notes?: string;
}

export interface MealLog {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: LoggedFood[];
  totalCalories: number;
  totalMacros: Macronutrients;
  loggedAt: string;
  photos?: string[]; // Local file paths
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  mood?: 'satisfied' | 'still_hungry' | 'too_full';
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

export interface WaterLog {
  id: string;
  date: string;
  amount: number; // ml
  loggedAt: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

// ============================================================================
// PROGRESS DATA
// ============================================================================

export interface ProgressEntry {
  id: string;
  date: string;
  type: 'weight' | 'body_fat' | 'measurements' | 'photos' | 'performance';
  data: {
    weight?: number; // kg
    bodyFat?: number; // percentage
    measurements?: {
      chest?: number; // cm
      waist?: number;
      hips?: number;
      biceps?: number;
      thighs?: number;
      calves?: number;
    };
    photos?: {
      front?: string;
      side?: string;
      back?: string;
    };
    performance?: {
      exercise: string;
      value: number;
      unit: string;
    };
  };
  notes?: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  streakHistory: {
    startDate: string;
    endDate: string;
    length: number;
    type: 'workout' | 'nutrition' | 'both';
  }[];
}

export interface LocalAchievement extends Achievement {
  localId: string;
  earnedAt?: string;
  progress: number;
  isNew: boolean;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

// ============================================================================
// CACHE DATA
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: string;
  expiresAt: string;
  size: number; // bytes
  accessCount: number;
  lastAccessedAt: string;
}

export interface OfflineQueue {
  id: string;
  action: 'create' | 'update' | 'delete' | 'sync';
  entity: 'workout' | 'meal' | 'progress' | 'user' | 'achievement';
  entityId: string;
  data: any;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
}

// ============================================================================
// APP STATE
// ============================================================================

export interface AppState {
  isFirstLaunch: boolean;
  lastOpenedAt: string;
  sessionCount: number;
  installDate: string;
  appVersion: string;
  deviceInfo: {
    model: string;
    os: string;
    osVersion: string;
    screenSize: string;
  };
  featureFlags: {
    [key: string]: boolean;
  };
  debugMode: boolean;
}

export interface NavigationState {
  currentScreen: string;
  previousScreen?: string;
  navigationStack: string[];
  tabHistory: {
    [tab: string]: string[];
  };
  timestamp: string;
}

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

export interface StorageStats {
  totalSize: number; // bytes
  usedSize: number;
  freeSize: number;
  breakdown: {
    userData: number;
    workouts: number;
    nutrition: number;
    progress: number;
    media: number;
    cache: number;
  };
  lastCalculatedAt: string;
}

export interface StorageQuota {
  maxTotalSize: number; // bytes
  maxMediaSize: number;
  maxCacheSize: number;
  maxOfflineDataSize: number;
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
}

// ============================================================================
// MIGRATION DATA
// ============================================================================

export interface MigrationRecord {
  id: string;
  fromVersion: string;
  toVersion: string;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  migratedEntities: {
    [entity: string]: {
      total: number;
      completed: number;
      failed: number;
      errors?: string[];
    };
  };
  rollbackData?: any;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isLocalWorkout = (workout: any): workout is LocalWorkout => {
  return workout && 'localId' in workout && 'syncStatus' in workout;
};

export const isLocalFood = (food: any): food is LocalFood => {
  return food && 'localId' in food && 'isCustom' in food;
};

export const isSyncable = (entity: any): entity is { syncStatus: SyncStatus; syncMetadata: SyncMetadata } => {
  return entity && 'syncStatus' in entity && 'syncMetadata' in entity;
};