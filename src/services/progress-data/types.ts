// Types for progress data

export interface ProgressEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    bicep?: number;
    thigh?: number;
    neck?: number;
  };
  progress_photos?: string[];
  notes?: string;
  recorded_at?: string; // column does not exist in DB — optional for legacy compat
  created_at: string;
}

export interface BodyAnalysis {
  id: string;
  user_id: string;
  photos: {
    front?: string;
    side?: string;
    back?: string;
  };
  analysis: {
    body_type?: string;
    estimated_body_fat?: number;
    muscle_definition?: string;
    posture_notes?: string;
    recommendations?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ProgressStats {
  totalEntries: number;
  weightChange: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  };
  bodyFatChange: {
    current: number;
    previous: number;
    change: number;
  };
  muscleChange: {
    current: number;
    previous: number;
    change: number;
  };
  measurementChanges: {
    [key: string]: {
      current: number;
      previous: number;
      change: number;
    };
  };
  timeRange: number; // days
  // Additional properties used in ProgressScreen
  totalWorkouts?: number;
  totalDuration?: number; // in minutes
  totalCalories?: number;
  currentStreak?: number;
}

export interface ProgressGoals {
  id: string;
  user_id: string;
  target_weight_kg?: number;
  target_body_fat_percentage?: number;
  target_muscle_mass_kg?: number;
  target_measurements?: {
    [key: string]: number;
  };
  target_date?: string;
  weekly_workout_goal?: number;
  daily_calorie_goal?: number;
  daily_protein_goal?: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateProgressEntryData {
  weight_kg: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    bicep?: number;
    thigh?: number;
    neck?: number;
  };
  progress_photos?: string[];
  notes?: string;
}

export interface UpdateProgressGoalsData {
  target_weight_kg?: number;
  target_body_fat_percentage?: number;
  target_muscle_mass_kg?: number;
  target_measurements?: { [key: string]: number };
  target_date?: string;
  weekly_workout_goal?: number;
  daily_calorie_goal?: number;
  daily_protein_goal?: number;
}
