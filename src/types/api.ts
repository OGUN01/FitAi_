// API-related TypeScript type definitions

import { PersonalInfo } from './user';

// ============================================================================
// GENERIC API TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheTTL?: number; // seconds
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
}

export interface RegisterResponse {
  user: AuthenticatedUser;
  token: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  profilePicture?: string;
  createdAt: string;
  lastLoginAt: string;
  subscription?: UserSubscription;
}

export interface UserSubscription {
  plan: 'free' | 'premium' | 'pro';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  expiresAt?: string;
  features: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// ============================================================================
// USER PROFILE API
// ============================================================================

export interface UpdateProfileRequest {
  name?: string;
  profilePicture?: string;
  personalInfo?: Partial<PersonalInfo>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateProfileResponse {
  user: AuthenticatedUser;
  message: string;
}

export interface PersonalInfoRequest {
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
  timezone: string;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
  language: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  theme: 'light' | 'dark' | 'auto';
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
  profileVisibility: 'public' | 'friends' | 'private';
  shareWorkouts: boolean;
  shareMeals: boolean;
  shareProgress: boolean;
  allowDataCollection: boolean;
}

// ============================================================================
// WORKOUT API
// ============================================================================

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
  sortBy?: 'created' | 'popularity' | 'rating' | 'duration';
  sortOrder?: 'asc' | 'desc';
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

// ============================================================================
// NUTRITION API
// ============================================================================

export interface CreateMealRequest {
  name: string;
  type: string;
  items: MealItemRequest[];
  recipe?: RecipeRequest;
  tags?: string[];
}

export interface MealItemRequest {
  foodId: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface RecipeRequest {
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  servings?: number;
}

export interface LogMealRequest {
  mealId?: string;
  mealType: string;
  foods: LoggedFoodRequest[];
  timestamp?: string;
  notes?: string;
  photos?: string[];
}

export interface LoggedFoodRequest {
  foodId: string;
  quantity: number;
  unit: string;
}

export interface FoodSearchRequest {
  query: string;
  category?: string;
  barcode?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface FoodSearchResponse {
  foods: FoodDetails[];
  suggestions: string[];
  totalCount: number;
}

export interface FoodDetails {
  id: string;
  name: string;
  brand?: string;
  category: string;
  calories: number;
  macros: MacronutrientDetails;
  servingSize: number;
  servingUnit: string;
  allergens: string[];
  dietaryLabels: string[];
  imageUrl?: string;
  verified: boolean;
}

export interface MacronutrientDetails {
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

export interface CreateFoodRequest {
  name: string;
  brand?: string;
  category: string;
  calories: number;
  macros: MacronutrientDetails;
  servingSize: number;
  servingUnit: string;
  allergens?: string[];
  dietaryLabels?: string[];
  barcode?: string;
  imageUrl?: string;
}

// ============================================================================
// PROGRESS API
// ============================================================================

export interface LogProgressRequest {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  measurements?: BodyMeasurementRequest;
  photos?: ProgressPhotoRequest[];
  notes?: string;
}

export interface BodyMeasurementRequest {
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  neck?: number;
}

export interface ProgressPhotoRequest {
  type: 'front' | 'side' | 'back' | 'custom';
  imageUrl: string;
  notes?: string;
}

export interface ProgressAnalyticsRequest {
  startDate?: string;
  endDate?: string;
  metrics?: string[];
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export interface ProgressAnalyticsResponse {
  summary: ProgressSummary;
  trends: ProgressTrend[];
  achievements: AchievementProgress[];
  insights: string[];
  recommendations: string[];
}

export interface ProgressSummary {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  averageWorkoutDuration: number;
  currentStreak: number;
  longestStreak: number;
  weightChange: number;
  bodyFatChange?: number;
  muscleMassChange?: number;
}

export interface ProgressTrend {
  metric: string;
  period: string;
  values: { date: string; value: number }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

export interface AchievementProgress {
  id: string;
  title: string;
  description: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

// ============================================================================
// AI GENERATION API
// ============================================================================

export interface GenerateWorkoutRequest {
  userProfile: UserProfileSummary;
  preferences: WorkoutPreferences;
  goals: string[];
  equipment: string[];
  duration: number;
  difficulty: string;
  previousWorkouts?: string[];
}

export interface UserProfileSummary {
  age: number;
  gender: string;
  fitnessLevel: string;
  experience: string;
  goals: string[];
  restrictions: string[];
}

export interface WorkoutPreferences {
  types: string[];
  intensity: string;
  focusAreas: string[];
  avoidExercises: string[];
}

export interface GenerateWorkoutResponse {
  workout: WorkoutDetails;
  reasoning: string;
  alternatives: WorkoutDetails[];
  progressionTips: string[];
  safetyNotes: string[];
}

export interface GenerateMealRequest {
  userProfile: UserProfileSummary;
  nutritionGoals: NutritionGoals;
  preferences: MealPreferences;
  mealType: string;
  calorieTarget?: number;
  previousMeals?: string[];
}

export interface NutritionGoals {
  calorieTarget: number;
  macroTargets: MacronutrientDetails;
  dietaryRestrictions: string[];
  allergens: string[];
}

export interface MealPreferences {
  cuisines: string[];
  cookingSkill: string;
  prepTimeLimit: number;
  budgetLevel: string;
  ingredients: string[];
  avoidIngredients: string[];
}

export interface GenerateMealResponse {
  meal: MealDetails;
  reasoning: string;
  alternatives: MealDetails[];
  nutritionAnalysis: string;
  cookingTips: string[];
  shoppingList: ShoppingListItem[];
}

export interface MealDetails {
  id: string;
  name: string;
  type: string;
  items: MealItemDetails[];
  totalCalories: number;
  totalMacros: MacronutrientDetails;
  recipe?: RecipeDetails;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  tags: string[];
}

export interface MealItemDetails {
  food: FoodDetails;
  quantity: number;
  unit: string;
  calories: number;
  macros: MacronutrientDetails;
}

export interface RecipeDetails {
  instructions: string[];
  ingredients: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  tips: string[];
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedCost?: number;
  notes?: string;
}

// ============================================================================
// SYNC API
// ============================================================================

export interface SyncRequest {
  lastSyncTimestamp?: string;
  data: SyncData;
}

export interface SyncData {
  workouts?: SyncWorkoutData[];
  meals?: SyncMealData[];
  progress?: SyncProgressData[];
  preferences?: UserPreferences;
}

export interface SyncWorkoutData {
  id: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: string;
}

export interface SyncMealData {
  id: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: string;
}

export interface SyncProgressData {
  id: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  conflicts?: SyncConflict[];
  serverData?: SyncData;
  lastSyncTimestamp: string;
}

export interface SyncConflict {
  id: string;
  type: 'workout' | 'meal' | 'progress';
  localData: any;
  serverData: any;
  conflictFields: string[];
  resolution?: 'local' | 'server' | 'merge' | 'manual';
}

// ============================================================================
// FILE UPLOAD API
// ============================================================================

export interface FileUploadRequest {
  file: File | Blob;
  type: 'profile_picture' | 'progress_photo' | 'meal_photo' | 'exercise_video';
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  url: string;
  thumbnailUrl?: string;
  fileId: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// ============================================================================
// HEALTH CHECK API
// ============================================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: ServiceStatus[];
  uptime: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
}
