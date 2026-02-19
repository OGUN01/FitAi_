import { Achievement } from "../ai";
import { SyncStatus, SyncMetadata } from "./sync";

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thighs?: number;
  calves?: number;
  neck?: number;
  photos?: string[];
  notes?: string;
  syncStatus?: SyncStatus | "local" | "synced" | "pending";
}

export interface ProgressPhoto {
  id: string;
  url: string;
  date: string;
  type: "front" | "back" | "side";
  notes?: string;
}

export interface AnalyticsData {
  id: string;
  date: string;
  type: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface Goal {
  id: string;
  type: string;
  target: number;
  current: number;
  deadline?: string;
  achieved: boolean;
}

export interface ProgressEntry {
  id: string;
  date: string;
  type: "weight" | "body_fat" | "measurements" | "photos" | "performance";
  data: {
    weight?: number;
    bodyFat?: number;
    measurements?: {
      chest?: number;
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
    type: "workout" | "nutrition" | "both";
  }[];
}

export interface LocalAchievement extends Achievement {
  localId: string;
  earnedAt?: string;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  isNew: boolean;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

export interface LocalProgressData {
  measurements: BodyMeasurement[];
  photos?: ProgressPhoto[];
  achievements?: Achievement[];
  analytics?: AnalyticsData[];
  goals?: Goal[];
}
