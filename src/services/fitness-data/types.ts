// Types for fitness data

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  equipment: string[];
  instructions: string[];
  difficulty_level: "beginner" | "intermediate" | "advanced";
  calories_per_minute: number;
  image_url?: string;
  video_url?: string;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  type: string;
  duration_minutes?: number;
  calories_burned?: number;
  notes?: string;
  completed_at?: string;
  created_at: string;
  exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  rest_seconds?: number;
  order_index: number;
  exercise?: Exercise;
}

export interface UserWorkoutPreferences {
  id: string;
  user_id: string;
  location: "home" | "gym" | "both";
  equipment: string[];
  time_preference: number;
  intensity: "beginner" | "intermediate" | "advanced";
  workout_types: string[];
  created_at: string;
  updated_at: string;
}

export interface FitnessGoals {
  id: string;
  user_id: string;
  primary_goals: string[];
  time_commitment: string;
  experience_level: "beginner" | "intermediate" | "advanced";
  created_at: string;
  updated_at: string;
}

export interface FitnessDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
