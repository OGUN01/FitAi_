import { UserProfile, PersonalInfo, FitnessGoals } from "../user";
import { SyncStatus, SyncMetadata } from "./sync";

export interface OnboardingData {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  currentStep: number;
  isComplete: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface LocalUserProfile extends UserProfile {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  offlineData?: {
    cachedWorkouts: string[];
    cachedMeals: string[];
    cachedAchievements: string[];
  };
}

export interface UserSettings {
  units: "metric" | "imperial";
  language: "en" | "es" | "fr" | "de" | "pt";
  theme: "light" | "dark" | "system";
  notifications: {
    workoutReminders: boolean;
    mealReminders: boolean;
    waterReminders: boolean;
    progressUpdates: boolean;
    motivationalQuotes: boolean;
    reminderTimes: {
      workout: string;
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
    fontSize: "small" | "medium" | "large";
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
  };
}

export interface UserPreferences {
  units: "metric" | "imperial";
  notifications: boolean;
  darkMode: boolean;
  language: string;
  timezone: string;
  autoSync: boolean;
  dataRetention: number;
}

export interface LocalUserData {
  authState: {
    isAuthenticated: boolean;
    userId: string | null;
    email: string | null;
    lastLoginAt: string | null;
    sessionToken: string | null;
    migrationStatus: {
      isRequired: boolean;
      isInProgress: boolean;
      isCompleted: boolean;
      currentStep: string | null;
      totalSteps: number;
      completedSteps: number;
      startedAt: string | null;
      completedAt: string | null;
      errors: string[];
    };
  };
  onboardingData?: OnboardingData | null;
  profile?: UserProfile | null;
  preferences?: UserPreferences | null;
}
