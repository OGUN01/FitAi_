export interface NotificationData {
  id: string;
  type:
    | "water"
    | "workout"
    | "breakfast"
    | "lunch"
    | "dinner"
    | "sleep"
    | "progress";
  title: string;
  body: string;
  data?: any;
}

export interface WaterReminderConfig {
  enabled: boolean;
  dailyGoalLiters: number;
  wakeUpTime: string; // HH:MM format
  sleepTime: string; // HH:MM format
  customIntervals?: number[]; // Custom hour intervals
}

export interface WorkoutReminderConfig {
  enabled: boolean;
  reminderMinutes: number; // Minutes before workout
  customTimes?: string[]; // Custom workout times HH:MM
}

export interface MealReminderConfig {
  enabled: boolean;
  breakfast: { enabled: boolean; time: string };
  lunch: { enabled: boolean; time: string };
  dinner: { enabled: boolean; time: string };
}

export interface SleepReminderConfig {
  enabled: boolean;
  bedtime: string; // HH:MM format
  reminderMinutes: number; // Minutes before bedtime
}

export interface NotificationPreferences {
  water: WaterReminderConfig;
  workout: WorkoutReminderConfig;
  meals: MealReminderConfig;
  sleep: SleepReminderConfig;
  progress: {
    enabled: boolean;
    frequency: "daily" | "weekly";
  };
}
