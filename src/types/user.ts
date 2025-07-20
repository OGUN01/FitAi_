// User-related TypeScript type definitions

export interface PersonalInfo {
  name: string;
  email?: string; // Optional for existing users, required for new signups
  age: string;
  gender: string;
  height: string; // in cm
  weight: string; // in kg
  activityLevel: string;
}

export interface FitnessGoals {
  primaryGoals: string[];
  timeCommitment: string;
  experience: string;
}

export interface User {
  id: string;
  email: string;
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  profilePicture?: string;
  preferences: {
    units: 'metric' | 'imperial';
    notifications: boolean;
    darkMode: boolean;
  };
  stats: {
    totalWorkouts: number;
    totalCaloriesBurned: number;
    currentStreak: number;
    longestStreak: number;
  };
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  lastLoginAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string;
}

// Onboarding types
export interface OnboardingData {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  isComplete: boolean;
}

// Activity levels
export type ActivityLevel = 
  | 'sedentary' 
  | 'light' 
  | 'moderate' 
  | 'active' 
  | 'extreme';

// Gender options
export type Gender = 'male' | 'female' | 'other';

// Experience levels
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

// Fitness goals
export type FitnessGoal = 
  | 'weight_loss'
  | 'muscle_gain'
  | 'strength'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness';

// Time commitment options
export type TimeCommitment = '15-30' | '30-45' | '45-60' | '60+';
