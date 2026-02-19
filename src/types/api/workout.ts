// Workout API types

export interface CreateWorkoutRequest {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  exercises: WorkoutExerciseRequest[];
  tags?: string[];
}

export interface WorkoutExerciseRequest {
  exerciseId: string;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  restTime: number;
  notes?: string;
}

export interface UpdateWorkoutRequest extends Partial<CreateWorkoutRequest> {
  id: string;
}

export interface WorkoutListRequest {
  category?: string;
  difficulty?: string;
  duration?: { min?: number; max?: number };
  equipment?: string[];
  muscleGroups?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "created" | "popularity" | "rating" | "duration";
  sortOrder?: "asc" | "desc";
}

export interface StartWorkoutRequest {
  workoutId: string;
  scheduledDuration?: number;
  notes?: string;
}

export interface StartWorkoutResponse {
  sessionId: string;
  workout: WorkoutDetails;
  startedAt: string;
}

export interface CompleteWorkoutRequest {
  sessionId: string;
  completedExercises: CompletedExerciseRequest[];
  totalDuration: number;
  caloriesBurned: number;
  rating: number;
  notes?: string;
}

export interface CompletedExerciseRequest {
  exerciseId: string;
  sets: CompletedSetRequest[];
  notes?: string;
  personalRecord?: boolean;
}

export interface CompletedSetRequest {
  reps: number;
  weight?: number;
  duration?: number;
  restTime: number;
  rpe?: number;
  completed: boolean;
}

export interface WorkoutDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  estimatedCalories: number;
  exercises: WorkoutExerciseDetails[];
  equipment: string[];
  targetMuscleGroups: string[];
  tags: string[];
  rating: number;
  completionCount: number;
  createdBy: string;
  createdAt: string;
}

export interface WorkoutExerciseDetails {
  id: string;
  exerciseId: string;
  exercise: ExerciseDetails;
  sets: number;
  reps: string;
  weight?: number;
  duration?: number;
  restTime: number;
  notes?: string;
}

export interface ExerciseDetails {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  imageUrl?: string;
  videoUrl?: string;
}
