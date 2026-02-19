// Progress tracking API types

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
  type: "front" | "side" | "back" | "custom";
  imageUrl: string;
  notes?: string;
}

export interface ProgressAnalyticsRequest {
  startDate?: string;
  endDate?: string;
  metrics?: string[];
  period?: "week" | "month" | "quarter" | "year";
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
  trend: "increasing" | "decreasing" | "stable";
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
