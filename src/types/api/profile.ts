// User profile API types

import { PersonalInfo } from "../user";

export interface UpdateProfileRequest {
  name?: string;
  profilePicture?: string;
  personalInfo?: Partial<PersonalInfo>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateProfileResponse {
  user: import("./auth").AuthenticatedUser;
  message: string;
}

export interface PersonalInfoRequest {
  age: number;
  gender: "male" | "female" | "other";
  height: number; // cm
  weight: number; // kg
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "extreme";
  timezone: string;
}

export interface UserPreferences {
  units: "metric" | "imperial";
  language: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  theme: "light" | "dark" | "auto";
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  workoutReminders: boolean;
  mealReminders: boolean;
  progressUpdates: boolean;
  achievements: boolean;
  weeklyReports: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: "public" | "friends" | "private";
  shareWorkouts: boolean;
  shareMeals: boolean;
  shareProgress: boolean;
  allowDataCollection: boolean;
}
