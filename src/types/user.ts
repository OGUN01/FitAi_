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
  experience_level: string; // Added for backward compatibility
  // Optional extended fields used by exercise filtering
  preferred_equipment?: string[];
  target_areas?: ('full_body' | 'upper_body' | 'lower_body' | 'core')[];
}

// Diet and Workout Preferences (from onboarding)
export interface DietPreferences {
  dietType: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
  allergies: string[];
  cuisinePreferences: string[];
  restrictions: string[];
  cookingSkill?: 'beginner' | 'intermediate' | 'advanced';
  mealPrepTime?: 'quick' | 'moderate' | 'extended';
  dislikes?: string[];
}

export interface WorkoutPreferences {
  workoutType: string[];
  equipment: string[];
  location: 'home' | 'gym' | 'outdoor';
  timeSlots: string[];
  intensity: 'low' | 'moderate' | 'high';
  duration: string;
}

export interface User {
  id: string;
  email: string;
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  dietPreferences?: DietPreferences;
  workoutPreferences?: WorkoutPreferences;
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
  dietPreferences?: {
    dietType: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
    allergies: string[];
    cuisinePreferences: string[];
    restrictions: string[];
  };
  workoutPreferences?: {
    location: 'home' | 'gym' | 'both';
    equipment: string[];
    timePreference: number;
    intensity: 'beginner' | 'intermediate' | 'advanced';
    workoutTypes: string[];
  };
  bodyAnalysis?: {
    photos: {
      front?: string;
      back?: string;
      side?: string;
    };
    analysis?: {
      bodyType: string;
      muscleMass: string;
      bodyFat: string;
      fitnessLevel: string;
      recommendations: string[];
    };
  };
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


// API request types used by userProfile service/store
export interface CreateProfileRequest extends PersonalInfo {}
export interface UpdateProfileRequest extends Partial<PersonalInfo> {}
export interface CreateFitnessGoalsRequest extends FitnessGoals {}
export interface UpdateFitnessGoalsRequest extends Partial<FitnessGoals> {}
